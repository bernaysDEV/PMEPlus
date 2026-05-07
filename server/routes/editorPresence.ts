import { Router, type Request, type Response } from "express";
import { z } from "zod";
import Redis from "ioredis";
import { requireAuth } from "../rbac";
import { namespacedKey, INSTANCE_NAMESPACE } from "@shared/branding";

const router: Router = Router();

interface PresenceEntry {
  userId: string;
  userName: string;
  userAvatar: string | null;
  articleId: string | null;
  articleTitle: string;
  articleSummary: string;
  updatedAt: number;
}

const PRESENCE_TTL_MS = 35_000;
const presence = new Map<string, PresenceEntry>();

interface PublishedEvent {
  articleId: string;
  articleTitle: string;
  articleSlug: string | null;
  publisherName: string;
  publishedAt: string;
}

type SseClient = {
  id: number;
  res: Response;
};

let nextClientId = 1;
const clients = new Set<SseClient>();

// ---- Redis Pub/Sub for multi-instance sync ----
// Channels are namespaced (e.g. `property-me:editor-presence:heartbeat`) so a
// shared Redis instance — which is the case in our deployment, where the same
// Upstash database is also used by the legacy "sabq" platform — does not leak
// presence/published events between brands. See `shared/branding.ts`.
const CH_PRESENCE = namespacedKey("editor-presence:heartbeat");
const CH_LEAVE = namespacedKey("editor-presence:leave");
const CH_PUBLISHED = namespacedKey("editor-presence:published");

const POD_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let pubsubReady = false;

function initPubSub() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[EditorPresence] REDIS_URL not set — running in single-pod mode (no cross-instance sync)");
    return;
  }
  try {
    const opts = {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      enableReadyCheck: false,
      connectTimeout: 5000,
      lazyConnect: false,
    };
    pubClient = new Redis(url, opts);
    subClient = new Redis(url, opts);

    pubClient.on("error", (err) => {
      console.error("[EditorPresence] pub redis error:", err.message);
    });
    subClient.on("error", (err) => {
      console.error("[EditorPresence] sub redis error:", err.message);
    });

    subClient.on("ready", () => {
      subClient?.subscribe(CH_PRESENCE, CH_LEAVE, CH_PUBLISHED, (err) => {
        if (err) {
          console.error("[EditorPresence] subscribe failed:", err.message);
          return;
        }
        pubsubReady = true;
        console.log(
          `[EditorPresence] ✅ Redis pub/sub ready (pod: ${POD_ID}, namespace: ${INSTANCE_NAMESPACE})`,
        );
      });
    });

    subClient.on("message", (channel, raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.podId === POD_ID) return; // ignore our own echoes

        if (channel === CH_PRESENCE && msg.entry) {
          presence.set(msg.entry.userId, msg.entry as PresenceEntry);
          broadcastLocalPresence();
        } else if (channel === CH_LEAVE && msg.userId) {
          if (presence.delete(msg.userId)) broadcastLocalPresence();
        } else if (channel === CH_PUBLISHED && msg.event) {
          broadcastLocal("article_published", msg.event);
        }
      } catch (e: any) {
        console.error("[EditorPresence] pubsub msg parse error:", e?.message);
      }
    });
  } catch (e: any) {
    console.error("[EditorPresence] pub/sub init failed:", e?.message);
    pubClient = null;
    subClient = null;
  }
}
initPubSub();

function publishRedis(channel: string, payload: Record<string, unknown>) {
  if (!pubClient || !pubsubReady) return;
  try {
    pubClient.publish(channel, JSON.stringify({ podId: POD_ID, ...payload })).catch(() => {});
  } catch {
    // ignore
  }
}

// ---- Local (per-pod) helpers ----
function cleanupStale() {
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of presence) {
    if (now - entry.updatedAt > PRESENCE_TTL_MS) {
      presence.delete(key);
      changed = true;
    }
  }
  return changed;
}

function presenceList(): PresenceEntry[] {
  return Array.from(presence.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function broadcastLocal(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      // ignore broken pipes; cleanup happens on close
    }
  }
}

function broadcastLocalPresence() {
  broadcastLocal("presence_update", { editors: presenceList() });
}

export function broadcastArticlePublished(event: PublishedEvent) {
  // Local pod clients
  broadcastLocal("article_published", event);
  // Other pods
  publishRedis(CH_PUBLISHED, { event });
}

setInterval(() => {
  if (cleanupStale()) {
    broadcastLocalPresence();
  }
}, 10_000).unref?.();

const heartbeatSchema = z.object({
  articleId: z.string().nullable().optional(),
  articleTitle: z.string().max(300).optional().default(""),
  articleSummary: z.string().max(400).optional().default(""),
});

router.post("/api/editor-presence/heartbeat", requireAuth, (req: Request, res: Response) => {
  const parsed = heartbeatSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid presence payload" });
  }

  const user: any = (req as any).user;
  if (!user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    (user.displayName as string | undefined)?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : "") ||
    "محرر";

  const entry: PresenceEntry = {
    userId: user.id,
    userName,
    userAvatar: user.profileImageUrl || null,
    articleId: parsed.data.articleId ?? null,
    articleTitle: (parsed.data.articleTitle || "").trim(),
    articleSummary: (parsed.data.articleSummary || "").trim(),
    updatedAt: Date.now(),
  };

  presence.set(user.id, entry);
  cleanupStale();
  broadcastLocalPresence();
  publishRedis(CH_PRESENCE, { entry });
  res.json({ ok: true });
});

const leaveHandler = (req: Request, res: Response) => {
  const user: any = (req as any).user;
  if (!user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (presence.delete(user.id)) {
    broadcastLocalPresence();
  }
  publishRedis(CH_LEAVE, { userId: user.id });
  res.json({ ok: true });
};

router.delete("/api/editor-presence/leave", requireAuth, leaveHandler);
// sendBeacon on page unload can only POST, so accept both.
router.post("/api/editor-presence/leave", requireAuth, leaveHandler);

router.get("/api/editor-presence/stream", requireAuth, (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const client: SseClient = { id: nextClientId++, res };
  clients.add(client);

  cleanupStale();
  res.write(`event: presence_update\ndata: ${JSON.stringify({ editors: presenceList() })}\n\n`);

  const ping = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      // will be cleaned up by close handler
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(ping);
    clients.delete(client);
  });
});

export default router;
