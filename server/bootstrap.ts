import { createServer, type IncomingMessage, type ServerResponse } from "http";

const BOOTSTRAP_VERSION = "2.2.0";
const port = parseInt(process.env.PORT || "5000", 10);
let expressHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

(function patchErrorEvent() {
  try {
    const EE = (globalThis as any).ErrorEvent;
    if (!EE) return;
    const desc = Object.getOwnPropertyDescriptor(EE.prototype, "message");
    if (desc && desc.get && !desc.set && desc.configurable !== false) {
      const origGet = desc.get;
      Object.defineProperty(EE.prototype, "message", {
        get: origGet,
        set(val: string) {
          Object.defineProperty(this, "message", {
            value: val,
            writable: true,
            configurable: true,
          });
        },
        configurable: true,
        enumerable: desc.enumerable ?? true,
      });
      console.log("[Bootstrap] Patched ErrorEvent.message to be writable");
    }
  } catch (err) {
    console.warn("[Bootstrap] ErrorEvent patch skipped:", (err as Error).message);
  }
})();

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (expressHandler) {
    expressHandler(req, res);
    return;
  }
  const url = req.url || "/";
  if (url.startsWith("/assets/") || url.endsWith(".js") || url.endsWith(".css") || url.endsWith(".png") || url.endsWith(".ico") || url.endsWith(".svg") || url.endsWith(".woff2") || url.endsWith(".webp") || url.endsWith(".jpg")) {
    res.writeHead(503, { "Retry-After": "3" });
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache, no-store",
  });
  res.end(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بروبرتي ME - جاري التحميل</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;direction:rtl}.loader{text-align:center}.spinner{width:40px;height:40px;border:3px solid #333;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}p{opacity:.7;font-size:14px}</style></head><body><div class="loader"><div class="spinner"></div><p>جاري تحميل بروبرتي ME...</p></div><script>setTimeout(()=>location.reload(),3000)</script></body></html>`);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[Bootstrap] v${BOOTSTRAP_VERSION} listening on port ${port}`);
  (globalThis as any).__sabqServer = server;
  (globalThis as any).__sabqPort = port;

  (globalThis as any).__sabqAttachExpress = (app: any) => {
    expressHandler = app;
    console.log("[Bootstrap] ✅ Express attached — now handling all requests");
  };

  (globalThis as any).__sabqMarkReady = () => {
    console.log("[Bootstrap] ✅ Server fully ready (DB warmed up)");
  };

  import("./index.js").catch((err) => {
    console.error("[Bootstrap] FATAL:", err);
    process.exit(1);
  });
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

let _uncaughtCount = 0;
const _uncaughtWindow = 60_000;
let _uncaughtWindowStart = Date.now();

process.on("uncaughtException", (e) => {
  const now = Date.now();
  if (now - _uncaughtWindowStart > _uncaughtWindow) {
    _uncaughtCount = 0;
    _uncaughtWindowStart = now;
  }
  _uncaughtCount++;
  console.error(`[CRITICAL] Uncaught Exception (#${_uncaughtCount}):`, e.message || e);
  if (_uncaughtCount <= 3 && e.stack) console.error("[CRITICAL] Stack:", e.stack);
  if (_uncaughtCount >= 20) {
    console.error("[CRITICAL] Too many uncaught exceptions in 60s — exiting for clean restart");
    process.exit(1);
  }
});

process.on("unhandledRejection", (r) => {
  console.error("[CRITICAL] Unhandled Rejection:", r instanceof Error ? r.message : r);
});
