import "dotenv/config";

// Map Replit AI Integrations env vars to legacy provider names so existing
// code that reads OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_* continues to work.
if (!process.env.OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
}
if (!process.env.OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  process.env.OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
}
if (!process.env.GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
}
if (!process.env.ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
}
if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY) {
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
}
if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL) {
  process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL;
}
if (!process.env.ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  process.env.ANTHROPIC_BASE_URL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
}

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { publicObjectsHandler } from "./storageHandlers";

process.on('uncaughtException', (error) => {
  console.error('[CRITICAL] Uncaught Exception:', error.message);
  console.error('[CRITICAL] Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise);
  console.error('[CRITICAL] Reason:', reason);
});

const app = express();
app.set("trust proxy", 1);

// NOTE: Express attachment to the bootstrap server is deferred until after
// all routes and static-file serving are registered (see the async IIFE below).
// Attaching here would replace the bootstrap loading page with Express before
// Express has any route for GET /, causing the deploy health-check to see 404.

// Lightweight version endpoint used by the client to detect new deploys
// without breaking the user's session. Hashes the built index.html so the
// version naturally changes whenever Vite emits new asset filenames.
let cachedAppVersion: string | null = null;
function computeAppVersion(): string {
  if (cachedAppVersion) return cachedAppVersion;
  try {
    const indexPath = path.resolve(import.meta.dirname, "public", "index.html");
    if (fs.existsSync(indexPath)) {
      const buf = fs.readFileSync(indexPath);
      cachedAppVersion = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
      return cachedAppVersion;
    }
  } catch {}
  // Dev fallback: stable for the lifetime of the process.
  cachedAppVersion = `dev-${process.pid}-${Date.now()}`;
  return cachedAppVersion;
}

app.get("/version.json", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({ version: computeAppVersion() });
});

app.get("/health", async (_req, res) => {
  let dbReady = false;
  try {
    const { isDatabaseAvailable } = await import("./db");
    dbReady = isDatabaseAvailable();
  } catch {}
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbReady ? "connected" : "warming-up",
  });
});

// Track server readiness state
let isServerReady = false;

app.get("/ready", async (_req, res) => {
  try {
    // Only mark ready if server has finished basic initialization
    if (!isServerReady) {
      res.status(503).json({ 
        status: "starting",
        server: "initializing",
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Verify database connectivity with a quick ping
    const { pool } = await import("./db");
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({ 
      status: "ready",
      server: "running",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Ready Check] Database ping failed:", error);
    res.status(503).json({ 
      status: "unavailable",
      server: "running",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(',') || [])
  .concat(
    (process.env.REPLIT_DOMAINS?.split(',') || []).map(domain => 
      domain.trim().startsWith('http') ? domain.trim() : `https://${domain.trim()}`
    )
  )
  .concat(['http://localhost:5000', 'http://localhost:5001', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001'])
  .concat(['https://appleid.apple.com']) // Allow Apple OAuth callback
  .filter(origin => origin && origin.trim().length > 0) // Remove empty strings
  .map(origin => origin.trim());

const allowedOriginsSet = new Set(allowedOrigins);
const normalizedOriginsSet = new Set(allowedOrigins.map(o => o.replace(/:5000$/, '').replace(/:5001$/, '')));

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/:5000$/, '').replace(/:5001$/, '');
    if (allowedOriginsSet.has(origin) || normalizedOriginsSet.has(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('غير مسموح بالوصول من هذا المصدر'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token'],
}));

// CSP nonce generation. Sets `res.locals.cspNonce` so helmet's per-request
// directive function (below) can emit `'nonce-…'` in script-src. The
// matching res.end rewriter is installed AFTER compression so it sees raw
// HTML, not gzip output.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64url");
  next();
});

// Security headers with Helmet.js
//
// CSP rollout plan (task-74):
//
//   Phase 1 (CURRENT): ship a tightened, explicit-allow-list policy in
//   `Content-Security-Policy-Report-Only` mode. The legacy permissive policy
//   (`'unsafe-inline'` for scripts + open `https:` source list) stays in
//   the enforcing header so nothing breaks for users while we collect
//   violation reports at `/api/csp-report`.
//
//   Phase 2: after a documented bake period (~1 week of clean reports), set
//   `CSP_ENFORCE=1` to flip the tightened policy into the enforcing header
//   and demote the legacy policy to report-only. Once that has been clean
//   for another bake period, remove the legacy policy entirely.
//
// The strict policy uses a per-request nonce + `'strict-dynamic'` for
// scripts (no `'unsafe-inline'`). The nonce is generated by the middleware
// installed above; inline `<script>` tags in `client/index.html` get the
// nonce stamped onto them by the same middleware, so the strict policy is
// safe to enforce as soon as Phase 2 starts.
const isDevelopment = process.env.NODE_ENV !== "production";
const cspEnforceStrict = process.env.CSP_ENFORCE === "1";

// Explicit allow-list of third-party origins this app actually talks to.
// Anything else gets blocked (or reported in phase 1).
const ANALYTICS_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
];
const FONT_HOSTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
const IMAGE_HOSTS = [
  "https://storage.googleapis.com",
  "https://imagedelivery.net",
  "https://*.r2.cloudflarestorage.com",
  "https://*.googleusercontent.com",
  "https://pbs.twimg.com",
  "https://abs.twimg.com",
];
const EMBED_HOSTS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://platform.twitter.com",
  "https://syndication.twitter.com",
];
const CONNECT_HOSTS = [
  ...ANALYTICS_HOSTS,
  "https://storage.googleapis.com",
  "https://api.openai.com",
  "https://generativelanguage.googleapis.com",
];

// helmet supports per-request directive functions, used here to embed each
// response's nonce into scriptSrc.
const nonceFn = (_req: Request, res: Response) =>
  `'nonce-${(res.locals as { cspNonce?: string }).cspNonce ?? ""}'`;

const strictDirectives: Record<string, any> = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    // Per-request nonce (set by the nonce middleware above) — replaces the
    // old `'unsafe-inline'` allowance so a script-injection vulnerability
    // can't execute attacker-controlled inline JS.
    nonceFn,
    // 'strict-dynamic' lets the GTM/GA bootstrap (which adds further
    // <script> tags via document.createElement) keep working without
    // needing to enumerate every transitively-loaded script host.
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "blob:",
    // No broad `https:` here — modern browsers ignore it when a nonce +
    // 'strict-dynamic' is present, and removing it makes the policy match
    // the explicit-allow-list intent for older browsers as well. External
    // scripts are reachable via the explicit hosts below.
    ...ANALYTICS_HOSTS,
    ...EMBED_HOSTS,
  ],
  connectSrc: ["'self'", "ws:", "wss:", ...CONNECT_HOSTS],
  frameSrc: ["'self'", ...EMBED_HOSTS],
  frameAncestors: ["'self'"],
  imgSrc: ["'self'", "data:", "blob:", ...IMAGE_HOSTS, ...ANALYTICS_HOSTS],
  styleSrc: ["'self'", "'unsafe-inline'", ...FONT_HOSTS],
  fontSrc: ["'self'", "data:", ...FONT_HOSTS],
  mediaSrc: ["'self'", "data:", "blob:", ...IMAGE_HOSTS],
  objectSrc: ["'none'"],
  workerSrc: ["'self'", "blob:"],
  baseUri: ["'self'"],
  formAction: ["'self'", "https://appleid.apple.com"],
  reportUri: ["/api/csp-report"],
  ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }),
};

const legacyDirectives: Record<string, any> = {
  defaultSrc: ["'self'"],
  scriptSrc: isDevelopment
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:"]
    : ["'self'", "'unsafe-inline'", "https:", "blob:"],
  connectSrc: ["'self'", "https:", "ws:", "wss:"],
  frameSrc: ["'self'", "https:"],
  frameAncestors: ["'self'"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  styleSrc: ["'self'", "'unsafe-inline'", "https:"],
  fontSrc: ["'self'", "data:", "https:"],
  mediaSrc: ["'self'", "data:", "https:", "blob:"],
  objectSrc: ["'none'"],
  workerSrc: ["'self'", "blob:"],
  baseUri: ["'self'"],
  formAction: ["'self'", "https://appleid.apple.com"],
  ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }),
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspEnforceStrict ? strictDirectives : legacyDirectives,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    xssFilter: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// Phase 1: also publish the strict policy as report-only so we collect
// violation reports without breaking traffic. In phase 2 (CSP_ENFORCE=1)
// we instead publish the legacy policy as report-only and enforce strict.
app.use(
  helmet.contentSecurityPolicy({
    directives: cspEnforceStrict ? legacyDirectives : strictDirectives,
    reportOnly: true,
  })
);

// CSP violation report sink. We accept both the legacy `application/csp-report`
// body shape and the modern Reporting API JSON. Logged at low volume —
// dedupe/aggregation is intentionally NOT done in-process to keep this
// trivial; downstream log shippers can group as needed.
// Dedicated limiter so a misbehaving / hostile client can't spam the
// report sink and inflate log volume. Keyed on IP, never returns 429 to
// the browser (still 204) — we just drop the body.
const cspReportLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => res.status(204).end(),
});

app.post(
  "/api/csp-report",
  cspReportLimiter,
  express.json({ type: ["application/csp-report", "application/reports+json", "application/json"], limit: "32kb" }),
  (req, res) => {
    try {
      const body: any = req.body || {};
      const report = body["csp-report"] || body;
      const blocked = report?.["blocked-uri"] || report?.blockedURL || "?";
      const directive = report?.["violated-directive"] || report?.effectiveDirective || "?";
      const docUri = report?.["document-uri"] || report?.documentURL || "?";
      console.warn(`[CSP-Report] directive=${directive} blocked=${blocked} doc=${docUri}`);
    } catch {
      // Reports are best-effort; never throw from this endpoint.
    }
    res.status(204).end();
  }
);

// Enable Gzip compression for all responses. Registered BEFORE the CSP
// nonce HTML rewriter so the rewriter wraps res.end last (outer-most) and
// therefore sees the raw HTML body before compression encodes it.
app.use(compression({
  filter: (req, res) => {
    if (req.headers['cache-control']?.includes('no-transform')) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 1,
  threshold: 1024,
}));

// CSP nonce HTML rewriter. Installed AFTER compression so this wrapper is
// outer-most: routes hit it first, it rewrites raw HTML, then delegates to
// compression's wrapper. Stamps `nonce="…"` onto every <script> tag (inline
// and external) so they're permitted under `'strict-dynamic'`.
const SCRIPT_TAG_RE = /<script(\s[^>]*)?>/gi;
app.use((_req: Request, res: Response, next: NextFunction) => {
  const nonce: string = res.locals.cspNonce;
  const origEnd = res.end.bind(res) as (chunk?: unknown, ...rest: unknown[]) => Response;
  (res as unknown as { end: typeof origEnd }).end = function (
    chunk?: unknown,
    ...rest: unknown[]
  ): Response {
    const ct = res.getHeader("content-type");
    if (chunk && nonce && typeof ct === "string" && ct.includes("text/html")) {
      const body =
        typeof chunk === "string"
          ? chunk
          : Buffer.isBuffer(chunk)
          ? chunk.toString("utf8")
          : null;
      if (body && /<script\b/i.test(body)) {
        const rewritten = body.replace(SCRIPT_TAG_RE, (match, attrs) => {
          if (match.toLowerCase().includes(" nonce=")) return match;
          return `<script nonce="${nonce}"${attrs ?? ""}>`;
        });
        if (rewritten !== body) {
          if (res.getHeader("content-length")) {
            res.setHeader("content-length", Buffer.byteLength(rewritten, "utf8"));
          }
          return origEnd(rewritten, ...rest);
        }
      }
    }
    return origEnd(chunk, ...rest);
  };
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased for base64 image uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Direct proxy for /public-objects/ — uses searchPublicObject for dual-bucket fallback.
// In production, /public-objects/ returns HTML (SPA fallback) instead of actual images.
// This handler intercepts before the SPA fallback and streams from Object Storage.
//
// SECURITY: searchPublicObject is responsible for ensuring that any file
// returned here is genuinely public — it must never return a file from a
// `.private/` prefix unless that file has an explicit public ACL. With that
// invariant, it is safe to serve the file with public/CDN cache headers via
// `forcePublic: true`.
app.get('/public-objects/*', publicObjectsHandler);
console.log(`[Server] ✅ /public-objects/ direct proxy configured`);

// NOTE: /objects/* is intentionally NOT registered here. The authenticated,
// ACL-checked handler is registered later in `registerRoutes` (see
// `server/routes.ts`, search for `app.get("/objects/:objectPath(*)"`). That
// handler treats every file as private by default and only serves it after
// either confirming a public ACL or running `canAccessObjectEntity` against
// the logged-in user. Registering a permissive `forcePublic: true` shim here
// (as previous versions did) would shadow that handler and let anyone read
// arbitrary `.private/` blobs.

// Serve static files from uploads directory (for thumbnails)
const uploadsDir = '/home/runner/workspace/uploads';
app.use('/uploads', express.static(uploadsDir));
console.log(`[Server] ✅ Static uploads directory configured: ${uploadsDir}`);

// Serve static files from public directory (for branding, logos, etc.)
const publicDir = path.join(process.cwd(), 'public');
app.use('/branding', express.static(path.join(publicDir, 'branding')));
console.log(`[Server] ✅ Static branding directory configured: ${publicDir}/branding`);

function get429Page(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>بروبرتي ME - يرجى الانتظار</title>
  <meta http-equiv="refresh" content="10">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; color: #1e293b; }
    .container { text-align: center; padding: 2rem; max-width: 480px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #0f172a; }
    p { font-size: 1rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
    .retry-btn { display: inline-block; padding: 0.75rem 2rem; background: #2563eb; color: #fff; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; text-decoration: none; }
    .retry-btn:hover { background: #1d4ed8; }
    .note { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9203;</div>
    <h1>عدد الطلبات كبير</h1>
    <p>الموقع يستقبل عدداً كبيراً من الزيارات حالياً. يرجى الانتظار لحظات ثم المحاولة مرة أخرى.</p>
    <a href="/" class="retry-btn">إعادة المحاولة</a>
    <p class="note">ستتم إعادة المحاولة تلقائياً خلال 10 ثوانٍ</p>
  </div>
</body>
</html>`;
}

// Rate limiting configurations - use Cloudflare's real IP header
function rateLimitHandler(req: Request, res: Response) {
  if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
    res.status(429).json({ message: "تم تجاوز حد الطلبات. يرجى المحاولة مرة أخرى بعد قليل" });
  } else {
    res.status(429).type('text/html').send(get429Page());
  }
}

// Rate-limit keying. Per-endpoint limiters live in
// `server/middleware/rateLimiters.ts`; this module only owns the global
// /api limiters that are wired up at boot. The composite key prefers the
// authenticated user id (so a single hostile session can't spend an entire
// IP's budget) and falls back to the real client IP. NOTE: the previous
// `connect.sid`-cookie short-circuit was removed in task-73 — sending a
// forged cookie no longer bypasses rate limits.
import {
  getRealClientIp,
  rateLimitKey,
  aiLimiter,
  ttsLimiter,
  passwordResetLimiter,
  analyticsTrackLimiter,
} from "./middleware/rateLimiters";

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per key per window (high-traffic site behind CDN)
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: rateLimitKey,
  skip: (req) => {
    if (req.path.startsWith("/health") || req.path.startsWith("/ready")) return true;
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
    return false;
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per IP per window
  message: { message: "تم تجاوز حد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => `auth:${getRealClientIp(req)}`,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window for sensitive operations
  message: { message: "تم تجاوز حد الطلبات للعمليات الحساسة. يرجى المحاولة بعد قليل" },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: rateLimitKey,
  skip: (req) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
    return false;
  },
});

// (Per-endpoint limiters now live in `server/middleware/rateLimiters.ts`.)

// Smart caching middleware - must come before routes
app.use((req, res, next) => {
  const path = req.path;
  
  // Hashed assets (Vite generates files like main-abc123.js)
  // Cache aggressively with immutable flag - s-maxage for Cloudflare CDN
  if (/\/assets\/.*\.(js|css)$/.test(path) && /[-_][a-f0-9]{8,}/.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
  }
  // Images and fonts - cache for 1 year (CDN and browser)
  else if (/\.(jpg|jpeg|png|gif|svg|webp|avif|ico|woff|woff2|ttf|eot)$/i.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400');
  }
  // HTML pages (SPA routes) - browser never caches, but Cloudflare CDN caches for fast TTFB
  // s-maxage lets Cloudflare serve cached HTML (avoiding cold start delays)
  // stale-while-revalidate lets Cloudflare serve stale content while refreshing in background
  // Browser still gets no-cache so it always checks with CDN (which responds fast from edge)
  // Matches: /, /categories, /category/sports, /article/xyz, /en/*, etc.
  else if (path.endsWith('.html') || (!path.startsWith('/api/') && !path.includes('.'))) {
    res.setHeader('Cache-Control', 'no-cache, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // API routes - cache is now controlled per-endpoint in routes.ts via cacheControl middleware
  // No default cache headers set here to allow individual routes to opt-in
  
  next();
});

// NOTE: `app.use("/api", generalApiLimiter)` and `writeLimiter` used to be
// mounted here, but at that point the request hasn't been through
// session/passport yet, so `req.user?.id` is always undefined and the
// user-aware key collapses to IP-only. Both limiters are now mounted INSIDE
// the async IIFE (just after `setupAuth(app)` and the CSRF middleware) so
// the user-id branch of `rateLimitKey` actually fires for authenticated
// traffic.

// ============================================
// APM (Application Performance Monitoring) Middleware
// ============================================
const APM_BUFFER_SIZE = 1000;
const apmResponseBuffer = new Float64Array(APM_BUFFER_SIZE);
let apmBufferIndex = 0;
let apmBufferCount = 0;

const apmStats = {
  requests: { total: 0, success: 0, errors: 0 },
  slowRequests: [] as { path: string; method: string; duration: number; timestamp: Date }[],
  errorPaths: new Map<string, number>(),
};

// SECURITY: APM endpoints expose internal operational data (uptime, memory
// usage, error paths, p95 latency) and the reset endpoint mutates server
// state. They must never be reachable anonymously. We require both an
// authenticated session and the `system.manage_settings` permission in all
// environments. Anonymous callers get 401, authenticated-but-unprivileged
// callers get 403 — never the JSON payload.
async function requireApmAccess(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { userHasPermission } = await import("./rbac");
    const ok = await userHasPermission(userId, "system.manage_settings");
    if (!ok) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  } catch (err) {
    console.error("[APM] Access check failed:", err);
    return res.status(500).json({ message: "Internal error" });
  }
}

// APM stats endpoint
app.get("/api/apm/stats", requireApmAccess, (req, res) => {
  const samplesCount = apmBufferCount;
  let avgResponseTime = 0;
  if (samplesCount > 0) {
    let sum = 0;
    for (let i = 0; i < samplesCount; i++) sum += apmResponseBuffer[i];
    avgResponseTime = sum / samplesCount;
  }

  const sortedTimes = Array.from(apmResponseBuffer.subarray(0, samplesCount)).sort((a, b) => a - b);
  const p95Index = Math.floor(samplesCount * 0.95);
  const p95ResponseTime = sortedTimes[p95Index] || 0;
  
  res.json({
    requests: apmStats.requests,
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      samplesCount,
    },
    slowRequests: apmStats.slowRequests.slice(-10), // Last 10 slow requests
    topErrorPaths: Array.from(apmStats.errorPaths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Reset APM stats (for testing)
app.post("/api/apm/reset", requireApmAccess, (req, res) => {
  apmStats.requests = { total: 0, success: 0, errors: 0 };
  apmResponseBuffer.fill(0);
  apmBufferIndex = 0;
  apmBufferCount = 0;
  apmStats.slowRequests = [];
  apmStats.errorPaths.clear();
  res.json({ message: "APM stats reset successfully" });
});

const isDevEnv = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  if (!reqPath.startsWith("/api") || reqPath.includes("/apm/")) {
    return next();
  }

  res.on("finish", () => {
    const duration = Date.now() - start;

    apmStats.requests.total++;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      apmStats.requests.success++;
    } else if (res.statusCode >= 400) {
      apmStats.requests.errors++;
      const normalizedPath = reqPath.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
      const errorCount = apmStats.errorPaths.get(normalizedPath) || 0;
      apmStats.errorPaths.set(normalizedPath, errorCount + 1);
      if (apmStats.errorPaths.size > 100) {
        const oldestKey = apmStats.errorPaths.keys().next().value;
        if (oldestKey) apmStats.errorPaths.delete(oldestKey);
      }
    }

    apmResponseBuffer[apmBufferIndex % APM_BUFFER_SIZE] = duration;
    apmBufferIndex++;
    if (apmBufferCount < APM_BUFFER_SIZE) apmBufferCount++;

    if (duration > 1000) {
      apmStats.slowRequests.push({
        path: reqPath,
        method: req.method,
        duration,
        timestamp: new Date(),
      });
      if (apmStats.slowRequests.length > 50) {
        apmStats.slowRequests = apmStats.slowRequests.slice(-50);
      }
      console.warn(`[APM] ⚠️ Slow request: ${req.method} ${reqPath} took ${duration}ms`);
    }

    if (isDevEnv) {
      console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

const isProduction = process.env.NODE_ENV === "production";
const port = (globalThis as any).__sabqPort || parseInt(process.env.PORT || '5000', 10);
const server = (globalThis as any).__sabqServer || createServer(app);

if (!(globalThis as any).__sabqServer) {
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    console.log(`[Server] ✅ Listening on port ${port}`);
  });
}

(async () => {
  try {
    console.log("[Server] Starting full initialization...");
    console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`[Server] Port: ${port}`);
    
    if (isProduction) {
      const requiredEnvVars = ["DATABASE_URL"];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.error(`[Server] ⚠️  WARNING: Missing required environment variables: ${missingVars.join(", ")}`);
        console.error("[Server] Server will start but database features will not work");
      } else {
        console.log("[Server] ✅ All required environment variables are present");
      }
    }

    // ---- AUTH + CSRF MUST BE INSTALLED BEFORE ANY /api MOUNT ----
    // Previously `setupAuth` and `app.use("/api", validateCsrfToken)` lived
    // inside `registerRoutes`, which meant audio-newsletters and the mobile
    // /api/v1 surface were mounted BEFORE CSRF and silently bypassed it.
    // Now session/passport and CSRF run first; per-route exemptions are
    // enumerated in `server/csrf.ts` (see EXEMPT_ROUTES).
    const { setupAuth } = await import("./auth");
    await setupAuth(app);
    console.log("[Server] ✅ Auth (session + passport) installed");

    const { getCsrfToken, validateCsrfToken } = await import("./csrf");
    app.get("/api/csrf-token", getCsrfToken);
    app.use("/api", validateCsrfToken);
    console.log("[Server] ✅ CSRF middleware installed (per-route allow-list)");

    // Global /api rate limiters live HERE (post-auth, post-CSRF). The
    // user-aware `rateLimitKey` requires `req.user?.id`, which is only set
    // after passport's deserializeUser runs inside `setupAuth`.
    app.use("/api", generalApiLimiter);
    app.use("/api", writeLimiter);
    console.log("[Server] ✅ Global /api rate limiters mounted (user-aware)");

    const { registerRoutes } = await import("./routes");
    const { edgeExistsHandler } = await import("./routes/edgeExistsRoute");
    app.get("/api/edge-exists", edgeExistsHandler);

    const audioNewsletterRoutes = await import("./routes/audioNewsletterRoutes");
    app.use("/api/audio-newsletters", audioNewsletterRoutes.default);
    console.log("[Server] ✅ Audio Newsletter routes registered (priority)");

    const mobileApiRoutes = (await import("./routes/mobileApiRoutes")).default;
    app.use("/api/v1", mobileApiRoutes);
    console.log("[Server] ✅ Mobile API routes registered (v1)");

    // Targeted hardening: tracking endpoints get a tight per-IP limiter so
    // anonymous beacons can't be used to flood the DB or invalidate caches.
    app.use("/api/analytics/visitors/ping", analyticsTrackLimiter);
    app.use("/api/articles/:id/view", analyticsTrackLimiter);
    app.use("/api/en/articles/:id/view", analyticsTrackLimiter);
    app.use("/api/accessibility/track", analyticsTrackLimiter);

    // Password reset / forgot password — slow per-IP limiter to make
    // enumeration + flooding mailers infeasible.
    app.use("/api/auth/forgot-password", passwordResetLimiter);
    app.use("/api/auth/reset-password", passwordResetLimiter);
    app.use("/api/forgot-password", passwordResetLimiter);
    app.use("/api/reset-password", passwordResetLimiter);

    await registerRoutes(app, server);
    console.log("[Server] ✅ Routes registered successfully");

    const { setupAgentReady } = await import("./agentReady");
    setupAgentReady(app);

    const { setupSwagger } = await import("./swagger");
    setupSwagger(app);
    console.log("[Server] ✅ Swagger documentation available at /api-docs");

    const nanoBananaRoutes = (await import("./routes/nanoBananaRoutes")).default;
    app.use("/api/nano-banana", aiLimiter, nanoBananaRoutes);
    console.log("[Server] ✅ Nano Banana Pro routes registered (aiLimiter)");
    
    const notebookLmRoutes = (await import("./routes/notebookLmRoutes")).default;
    app.use("/api/notebooklm", aiLimiter, notebookLmRoutes);
    console.log("[Server] ✅ NotebookLM routes registered (aiLimiter)");
    
    const visualAiRoutes = (await import("./routes/visualAiRoutes")).default;
    app.use("/api/visual-ai", aiLimiter, visualAiRoutes);
    console.log("[Server] ✅ Visual AI routes registered (aiLimiter)");
    
    const autoImageRoutes = (await import("./routes/autoImageRoutes")).default;
    app.use("/api/auto-image", aiLimiter, autoImageRoutes);
    console.log("[Server] ✅ Auto Image Generation routes registered (aiLimiter)");
    
    // Register Thumbnail routes
    const thumbnailRoutes = await import("./routes/thumbnailRoutes");
    app.use("/api/thumbnails", thumbnailRoutes.default);
    console.log("[Server] ✅ Thumbnail routes registered");
    
    // Register Story Cards routes
    const { storyCardsRouter } = await import("./routes/storyCardsRoutes");
    app.post("/api/story-cards/generate", storyCardsRouter.post["/generate"]);
    app.post("/api/story-cards/instagram-carousel", storyCardsRouter.post["/instagram-carousel"]);
    app.post("/api/story-cards/linkedin-document", storyCardsRouter.post["/linkedin-document"]);
    app.get("/api/story-cards/article/:articleId", storyCardsRouter.get["/article/:articleId"]);
    app.patch("/api/story-cards/:cardId", storyCardsRouter.patch["/:cardId"]);
    app.delete("/api/story-cards/:cardId", storyCardsRouter.delete["/:cardId"]);
    console.log("[Server] ✅ Story Cards routes registered");

    const rssFeedRoutes = (await import("./routes/rssFeedRoutes")).default;
    app.use("/api/rss", rssFeedRoutes);
    console.log("[Server] ✅ RSS Feed routes registered");
    
    const aiTasksRoutes = (await import("./routes/aiTasksRoutes")).default;
    app.use("/api/ai-tasks", aiTasksRoutes);
    console.log("[Server] ✅ AI Tasks routes registered");
    
    const advancedAnalyticsRoutes = (await import("./routes/advancedAnalytics")).default;
    app.use("/api/advanced-analytics", advancedAnalyticsRoutes);
    console.log("[Server] ✅ Advanced Analytics routes registered");
    
    const mediaStoreRoutes = (await import("./routes/mediaStoreRoutes")).default;
    app.use("/api/media-store", mediaStoreRoutes);
    console.log("[Server] ✅ Media Store routes registered");
    
    const quizRoutes = (await import("./quiz-routes")).default;
    app.use(quizRoutes);
    console.log("[Server] ✅ Quiz routes registered");

    const smartClassificationRoutes = (await import("./routes/smartClassificationRoutes")).default;
    app.use("/api/smart-classification", aiLimiter, smartClassificationRoutes);
    console.log("[Server] ✅ Smart Classification routes registered");

    const sharp = (await import('sharp')).default;
    const fsPromises = (await import('fs/promises'));
    const socialImgDir = path.join(process.cwd(), 'dist', 'public', 'social-images');
    await fsPromises.mkdir(socialImgDir, { recursive: true });
    app.use('/social-images', express.static(socialImgDir, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=86400, immutable');
      }
    }));

    app.get("/social-image/*", async (req: any, res) => {
      try {
        const rawPath = req.params[0] as string;
        if (!rawPath) return res.status(400).end();

        const cleanPath = rawPath.replace(/\.jpg$/, '');
        const safeFilename = cleanPath.replace(/[^a-zA-Z0-9\-_\/]/g, '') + '.jpg';
        const cachedPath = path.join(socialImgDir, safeFilename.replace(/\//g, '_'));

        try {
          await fsPromises.access(cachedPath);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=86400, stale-while-revalidate=86400, immutable');
          const cached = await fsPromises.readFile(cachedPath);
          return res.send(cached);
        } catch {}

        const { objectStorageClient, getBucketConfig } = await import('./objectStorage');
        const { bucketName } = getBucketConfig();
        const storagePath = cleanPath.includes('/') ? `public/${cleanPath}` : `public/uploads/${cleanPath}`;
        const bucketsToTry = [bucketName, 'replit-objstore-3dc2325c-bbbe-4e54-9a00-e6f10b243138'];

        let chunks: Buffer[] = [];
        let found = false;
        for (const bName of bucketsToTry) {
          try {
            const bucket = objectStorageClient.bucket(bName);
            const file = bucket.file(storagePath);
            const [exists] = await file.exists();
            if (!exists) continue;
            chunks = [];
            await new Promise<void>((resolve, reject) => {
              file.createReadStream()
                .on('data', (chunk: Buffer) => chunks.push(chunk))
                .on('end', () => resolve())
                .on('error', reject);
            });
            found = true;
            break;
          } catch {}
        }
        if (!found) return res.status(404).end();

        const jpegBuffer = await sharp(Buffer.concat(chunks))
          .resize(1200, 630, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();

        await fsPromises.writeFile(cachedPath, jpegBuffer).catch(() => {});

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=86400, stale-while-revalidate=86400, immutable');
        res.send(jpegBuffer);
      } catch (error) {
        console.error('[Social Image] Error:', error);
        if (!res.headersSent) res.status(500).end();
      }
    });
    console.log("[Server] ✅ Social image endpoint registered (/social-image/)");

    // Social media crawler middleware - MUST come before Vite/static setup
    // This intercepts crawler requests and serves static HTML with proper meta tags
    const { socialCrawlerMiddleware } = await import("./socialCrawler");
    app.use(socialCrawlerMiddleware);
    console.log("[Server] ✅ Social crawler middleware registered");

    // SEO meta tag injection middleware - Injects dynamic title, OG, Twitter, canonical, JSON-LD
    // into the SPA HTML for all browsers (not just crawlers) to fix SEO indexing
    const { seoInjectorMiddleware } = await import("./seoInjector");
    app.use(seoInjectorMiddleware);
    console.log("[Server] ✅ SEO injector middleware registered (dynamic meta tags)");

    // Legacy URL redirects middleware - Redirects old URLs to new URLs
    // Uses legacy_redirects table for 301/302 redirects
    const { legacyRedirectMiddleware } = await import("./legacyRedirectMiddleware");
    app.use(legacyRedirectMiddleware);
    console.log("[Server] ✅ Legacy redirect middleware registered");

    // Content existence middleware - Returns HTTP 404 for non-existent articles/categories
    // This checks the database for content and sets 404 status for SEO (Googlebot, etc.)
    // The SPA HTML is still served, but with proper 404 status code
    const { contentExistenceMiddleware } = await import("./contentExistenceMiddleware");
    app.use(contentExistenceMiddleware);
    console.log("[Server] ✅ Content existence middleware registered (SEO 404)");

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`[Server] Error: ${status} - ${message}`, err);
      
      const urlPath = req.path;
      if (urlPath.startsWith('/assets/') || urlPath.endsWith('.js') || urlPath.endsWith('.css') || urlPath.endsWith('.map')) {
        return res.status(status).type('text/plain').send('Server error');
      }
      
      if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
        if (process.env.NODE_ENV === 'production' && status >= 500) {
          res.status(status).json({ message: 'خطأ داخلي في الخادم', code: 'INTERNAL_SERVER_ERROR' });
        } else {
          res.status(status).json({ message });
        }
      } else if (status === 429) {
        res.status(429).type('text/html').send(get429Page());
      } else {
        res.status(status).type('text/html').send(`<h1>Error ${status}</h1>`);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    
    const isProductionMode = process.env.NODE_ENV === "production" || 
                        process.env.REPLIT_DEPLOYMENT === "1" ||
                        fs.existsSync(path.resolve(import.meta.dirname, "public"));
    
    // Strip Set-Cookie from HTML responses for unauthenticated visitors
    // This allows Cloudflare to cache public HTML pages at edge (fast TTFB)
    // Authenticated users still get their session cookies normally
    app.use((req: Request, res: Response, next: NextFunction) => {
      const isHtmlRequest = !req.path.startsWith('/api/') && !req.path.includes('.');
      const isAuthenticated = (req as any).isAuthenticated?.();

      if (isHtmlRequest && !isAuthenticated) {
        const originalSetHeader = res.setHeader.bind(res);
        (res as any).setHeader = function(name: string, value: any) {
          if (name.toLowerCase() === 'set-cookie') return res;
          return originalSetHeader(name, value);
        };
      }
      next();
    });
    console.log("[Server] ✅ Public HTML cache headers middleware registered");

    const { isValidSpaRoute } = await import("./utils/spaRouteMatcher");
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      const urlPath = req.path;
      
      if (urlPath.startsWith('/api/') || 
          urlPath.startsWith('/@') || 
          urlPath.startsWith('/node_modules/') ||
          urlPath.startsWith('/src/') ||
          urlPath.includes('.')) {
        return next();
      }
      
      if (!isValidSpaRoute(urlPath)) {
        // In production, serve index.html with proper 404 status
        const distPath = path.resolve(import.meta.dirname, "public");
        const indexPath = path.resolve(distPath, "index.html");
        
        if (fs.existsSync(indexPath)) {
          // Production mode: serve index.html with 404 status (no browser cache!)
          const { sendIndexHtml } = await import("./utils/sendIndexHtml");
          sendIndexHtml(res, indexPath, 404);
          return;
        }
        // Development mode: just set status (Vite will override but GA will track it)
        res.status(404);
      }
      
      next();
    });
    console.log("[Server] ✅ SEO-friendly 404 middleware registered");
    
    // Production-only: Intercept missing static asset requests before SPA fallback
    // This prevents returning index.html for missing JS/CSS chunks (MIME type errors)
    if (isProductionMode || app.get("env") !== "development") {
      const distPath = path.resolve(import.meta.dirname, "public");
      const staticExtensions = ['.js', '.css', '.map', '.mjs', '.cjs', '.woff', '.woff2', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.json', '.xml', '.txt'];
      
      app.use((req: Request, res: Response, next: NextFunction) => {
        const urlPath = req.path;
        
        if (!urlPath.startsWith('/assets/') && !urlPath.startsWith('/branding/') && !urlPath.startsWith('/fixtures/')) {
          const isStaticAsset = staticExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
          if (!isStaticAsset) {
            return next();
          }
        }
        
        const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = path.join(distPath, safePath);
        
        if (!fs.existsSync(filePath)) {
          if (urlPath !== '/service-worker.js') {
            console.warn(`[Static 404] Missing asset: ${urlPath}`);
          }
          return res.status(404).type('text/plain').send('Not found');
        }
        
        next();
      });
      console.log("[Server] ✅ Static asset 404 guard registered");
    }
    
    // HTML caching is now handled directly in rocketLoaderFix.ts (production)
    // and vite.ts (development) — no writeHead interception needed.
    console.log("[Server] ✅ HTML cache headers handled by serve layer");
    
    if (!isProductionMode && app.get("env") === "development") {
      console.log("[Server] Starting in DEVELOPMENT mode with Vite");
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
      console.log("[Server] ✅ Vite setup completed");
    } else {
      console.log("[Server] Starting in PRODUCTION mode with static files");
      const { serveStaticWithRocketLoaderFix } = await import("./rocketLoaderFix");
      serveStaticWithRocketLoaderFix(app);
      console.log("[Server] ✅ Static files setup with Cloudflare Rocket Loader fix");
    }

    console.log("[Server] ✅ Full initialization complete — all routes registered");

    if ((globalThis as any).__sabqAttachExpress) {
      (globalThis as any).__sabqAttachExpress(app);
    }

    // Surface any remaining configuration that still ties this deployment to
    // the legacy sabq platform (shared Redis, S3 bucket, CORS origins, etc.).
    // Runs once after init so the warnings are easy to spot in startup logs.
    try {
      const { logInstanceIsolationAudit } = await import("./services/instanceIsolationCheck");
      logInstanceIsolationAudit();
    } catch (e: any) {
      console.warn("[Isolation] audit failed:", e?.message);
    }
    
      // Warm up database connection before marking ready
      try {
        const { pool } = await import("./db");
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        isServerReady = true;
        if ((globalThis as any).__sabqMarkReady) {
          (globalThis as any).__sabqMarkReady();
        }
        console.log(`[Server] ✅ Database warmed up, server is now READY`);

        // One-shot admin password reset using a deployment secret (ADMIN_RESET_PASSWORD).
        // Lets the project owner regain access without direct DB write capability.
        // Remove the secret and redeploy after a successful login to disable the hook.
        if (process.env.ADMIN_RESET_PASSWORD) {
          setImmediate(async () => {
            try {
              const newPassword = (process.env.ADMIN_RESET_PASSWORD || "").trim();
              if (newPassword.length < 12) {
                console.warn(
                  "[admin-reset] ⚠️ Skipped: ADMIN_RESET_PASSWORD must be at least 12 characters.",
                );
                return;
              }
              const targetEmail = (
                process.env.ADMIN_RESET_EMAIL || "admin@propertymiddleeast.com"
              )
                .trim()
                .toLowerCase();
              const bcrypt = (await import("bcrypt")).default;
              const hash = await bcrypt.hash(newPassword, 12);
              const { rowCount } = await pool.query(
                `UPDATE users
                   SET password_hash = $1,
                       account_locked = false,
                       failed_login_attempts = 0,
                       must_change_password = false,
                       status = 'active'
                 WHERE lower(email) = $2`,
                [hash, targetEmail],
              );
              if (rowCount && rowCount > 0) {
                console.log(
                  "[admin-reset] ✅ Admin password reset applied. Remove ADMIN_RESET_PASSWORD secret and redeploy to disable this hook.",
                );
              } else {
                console.warn(
                  "[admin-reset] ⚠️ Target admin account not found; password not changed.",
                );
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "unknown error";
              console.error("[admin-reset] Failed to reset admin password:", msg);
            }
          });
        }

        // Legacy advertising cleanup and user-roles backfill are DISABLED.
        // Both scripts reference the dropped `users.role` column. The backfill
        // has already run successfully and the ad-cleanup tables are gone.
        // Re-enable only if the `users.role` column is restored.

        // Warm up dashboard stats cache in background (non-blocking)
        setImmediate(async () => {
          try {
            const { storage } = await import("./storage");
            const { memoryCache, CACHE_TTL } = await import("./memoryCache");
            console.log(`[Cache Warmup] 🔄 Pre-loading dashboard stats cache...`);
            const stats = await storage.getAdminDashboardStats();
            const trimmedStats = {
              ...stats,
              recentArticles: stats.recentArticles.map((article: any) => ({
                id: article.id,
                title: article.title,
                slug: article.slug,
                englishSlug: article.englishSlug || undefined,
                status: article.status,
                publishedAt: article.publishedAt,
                views: article.views,
                author: article.author ? {
                  firstName: article.author.firstName,
                  lastName: article.author.lastName,
                  email: article.author.email,
                } : undefined,
              })),
              topArticles: stats.topArticles.map((article: any) => ({
                id: article.id,
                title: article.title,
                slug: article.slug,
                englishSlug: article.englishSlug || undefined,
                status: article.status,
                publishedAt: article.publishedAt,
                views: article.views,
                category: article.category ? {
                  nameAr: article.category.nameAr,
                } : undefined,
              })),
              recentComments: stats.recentComments.map((comment: any) => ({
                id: comment.id,
                content: comment.content ? comment.content.substring(0, 100) : '',
                status: comment.status,
                createdAt: comment.createdAt,
                user: comment.user ? {
                  firstName: comment.user.firstName,
                  lastName: comment.user.lastName,
                } : undefined,
              })),
            };
            memoryCache.set('admin:dashboard:stats', trimmedStats, CACHE_TTL.MEDIUM);
            console.log(`[Cache Warmup] ✅ Dashboard stats cache loaded successfully`);
          } catch (error) {
            console.error("[Cache Warmup] ⚠️  Dashboard stats cache warmup failed:", error);
          }
        });
        
        // Warm up critical caches in background (non-blocking)
        setImmediate(async () => {
          try {
            const port = parseInt(process.env.PORT || '5000', 10);
            console.log(`[Cache Warmup] 🔄 Pre-loading homepage cache...`);
            const [homepageRes, categoriesRes] = await Promise.all([
              fetch(`http://localhost:${port}/api/homepage-lite`),
              fetch(`http://localhost:${port}/api/categories`),
            ]);
            if (homepageRes.ok) {
              console.log(`[Cache Warmup] ✅ Homepage cache loaded successfully`);
            } else {
              console.error(`[Cache Warmup] ⚠️  Homepage cache warmup failed: HTTP ${homepageRes.status}`);
            }
            if (categoriesRes.ok) {
              console.log(`[Cache Warmup] ✅ Categories cache loaded successfully`);
            } else {
              console.error(`[Cache Warmup] ⚠️  Categories cache warmup failed: HTTP ${categoriesRes.status}`);
            }
          } catch (error) {
            console.error("[Cache Warmup] ⚠️  Cache warmup failed:", error);
          }
        });
      } catch (error) {
        console.error("[Server] ⚠️  Database warmup failed, but marking ready anyway:", error);
        isServerReady = true;
      }
      
      // Image migration — PAUSED (disabled temporarily)
      // setTimeout(async () => {
      //   try {
      //     const { startMigration } = await import("./scripts/migrateImages");
      //     const migResult = await startMigration();
      //     console.log(`[Server] 🖼️ Image migration: ${migResult.message}`);
      //   } catch (err) {
      //     console.error("[Server] ⚠️ Image migration failed to start:", err);
      //   }
      // }, 15000);
      console.log("[Server] 🖼️ Image migration is PAUSED (disabled temporarily)");

      const enableBackgroundWorkers = process.env.ENABLE_BACKGROUND_WORKERS === "true";
      
      const { tryBecomeLeader, isLeader, getPodId, startLeaderElectionLoop, onBecomeLeader } = await import("./leaderElection");
      await tryBecomeLeader();
      startLeaderElectionLoop(60000);
      
      if (enableBackgroundWorkers) {
        onBecomeLeader(async () => {
          console.log("[Server] Starting background workers after leader failover...");
          try {
            const { startNotificationWorker } = await import("./notificationWorker");
            startNotificationWorker();
          } catch (error) {
            console.error("[Server] Error starting notification worker after failover:", error);
          }
          try {
            const { startPushWorker } = await import("./jobs/pushWorker");
            startPushWorker();
          } catch (error) {
            console.error("[Server] Error starting push worker after failover:", error);
          }
        });
      }
      
      const shouldRunBackgroundJobs = enableBackgroundWorkers && isLeader();
      
      if (!enableBackgroundWorkers) {
        console.log("[Server] Background workers disabled (ENABLE_BACKGROUND_WORKERS not set)");
      } else if (!isLeader()) {
        console.log(`[Server] Pod ${getPodId()} is NOT the leader — background jobs on leader only`);
      } else {
        console.log(`[Server] Pod ${getPodId()} is the LEADER — background jobs enabled`);
      }
      
      if (shouldRunBackgroundJobs) {
        setImmediate(async () => {
          try {
            const { startNotificationWorker } = await import("./notificationWorker");
            startNotificationWorker();
          } catch (error) {
            console.error("[Server] Error starting notification worker:", error);
          }
        });

        setImmediate(async () => {
          try {
            const { startPushWorker } = await import("./jobs/pushWorker");
            startPushWorker();
          } catch (error) {
            console.error("[Server] Error starting push worker:", error);
          }
        });
      }

      // Register job queue handlers for TTS generation
      if (shouldRunBackgroundJobs) {
        setImmediate(async () => {
          try {
            const { jobQueue } = await import("./services/job-queue");
            const { getElevenLabsService } = await import("./services/elevenlabs");
            const { ObjectStorageService } = await import("./objectStorage");
            const { storage } = await import("./storage");

          jobQueue.onExecute(async (job) => {
            if (job.type === 'generate-tts') {
              console.log(`[JobQueue] Executing TTS generation job ${job.id}`);
              
              const { newsletterId } = job.data;
              const newsletter = await storage.getAudioNewsletterById(newsletterId);

              if (!newsletter) {
                throw new Error('النشرة الصوتية غير موجودة');
              }

              // Update status to processing
              await storage.updateAudioNewsletter(newsletter.id, {
                generationStatus: 'processing',
                generationError: null,
              });

              const elevenLabs = getElevenLabsService();
              const objectStorage = new ObjectStorageService();

              if (!elevenLabs) {
                await storage.updateAudioNewsletter(newsletter.id, {
                  generationStatus: 'failed',
                  generationError: 'ElevenLabs service is not available - missing API key',
                });
                throw new Error('ElevenLabs service is not configured');
              }

              // Build script from articles
              const articlesData = newsletter.articles?.map(na => ({
                title: na.article?.title || '',
                excerpt: na.article?.excerpt || undefined,
                aiSummary: na.article?.aiSummary || undefined,
              })) || [];

              const script = elevenLabs.buildNewsletterScript({
                title: newsletter.title,
                description: newsletter.description || undefined,
                articles: articlesData,
              });

              console.log(`[JobQueue] Generating TTS for newsletter ${newsletter.id}`);
              console.log(`[JobQueue] Script length: ${script.length} characters`);

              // Generate audio
              const audioBuffer = await elevenLabs.textToSpeech({
                text: script,
                voiceId: newsletter.voiceId || undefined,
                model: newsletter.voiceModel || undefined,
                voiceSettings: newsletter.voiceSettings || undefined,
              });

              // Upload to object storage
              const audioPath = `audio-newsletters/${newsletter.id}.mp3`;
              const uploadedFile = await objectStorage.uploadFile(
                audioPath,
                audioBuffer,
                'audio/mpeg'
              );

              // Update newsletter with audio details
              await storage.updateAudioNewsletter(newsletter.id, {
                audioUrl: uploadedFile.url,
                fileSize: audioBuffer.length,
                duration: Math.floor(audioBuffer.length / 16000), // Rough estimate
                generationStatus: 'completed',
                generationError: null,
              });

              console.log(`[JobQueue] Successfully generated audio for newsletter ${newsletter.id}`);
            } else if (job.type === 'generate-audio-brief') {
              console.log(`[JobQueue] Executing audio brief generation job ${job.id}`);
              
              const { briefId } = job.data;
              const brief = await storage.getAudioNewsBriefById(briefId);

              if (!brief) {
                throw new Error('الخبر الصوتي غير موجود');
              }

              // Update status to processing
              await storage.updateAudioNewsBrief(briefId, {
                generationStatus: 'processing',
              });

              const elevenLabs = getElevenLabsService();
              const objectStorage = new ObjectStorageService();

              if (!elevenLabs) {
                await storage.updateAudioNewsBrief(briefId, {
                  generationStatus: 'failed',
                });
                throw new Error('ElevenLabs service is not configured');
              }

              console.log(`[JobQueue] Generating TTS for audio brief ${briefId}`);
              console.log(`[JobQueue] Content length: ${brief.content.length} characters`);

              // Generate audio
              const audioBuffer = await elevenLabs.textToSpeech({
                text: brief.content,
                voiceId: brief.voiceId || undefined,
                voiceSettings: brief.voiceSettings || undefined,
              });

              // Upload to object storage
              const audioPath = `audio-briefs/brief_${briefId}_${Date.now()}.mp3`;
              const uploadedFile = await objectStorage.uploadFile(
                audioPath,
                audioBuffer,
                'audio/mpeg'
              );

              // Get audio duration (rough estimate: ~150 words per minute for Arabic)
              const wordCount = brief.content.split(/\s+/).length;
              const estimatedDuration = Math.ceil((wordCount / 150) * 60);

              // Update brief with audio details
              await storage.updateAudioNewsBrief(briefId, {
                audioUrl: uploadedFile.url,
                duration: estimatedDuration,
                generationStatus: 'completed',
              });

              console.log(`[JobQueue] Successfully generated audio for brief ${briefId}`);
            }
          });

            console.log("[Server] ✅ Job queue handlers registered successfully");
          } catch (error) {
            console.error("[Server] ⚠️  Error registering job queue handlers:", error);
            console.error("[Server] Server will continue running without job queue");
          }
        });
      }

      // ============================================
      // DELAYED BACKGROUND JOBS - تأخير الوظائف الخلفية
      // Wait 45 seconds before starting heavy jobs to allow traffic to be served first
      // This reduces deployment downtime significantly
      // ============================================
      const BACKGROUND_JOB_DELAY = 45000; // 45 seconds delay after server starts
      
      console.log(`[Server] 📅 Background jobs will start in ${BACKGROUND_JOB_DELAY / 1000} seconds...`);
      
      if (shouldRunBackgroundJobs) {
        setTimeout(async () => {
          try {
            const { startSeasonalCategoriesJob } = await import("./jobs/seasonalCategoriesJob");
            startSeasonalCategoriesJob();
          } catch (error) {
            console.error("[Server] Error starting seasonal categories job:", error);
          }
        }, BACKGROUND_JOB_DELAY);
      }

      if (shouldRunBackgroundJobs) {
        setTimeout(async () => {
          try {
            const { startDynamicCategoriesJob } = await import("./jobs/dynamicCategoriesJob");
            startDynamicCategoriesJob();
          } catch (error) {
            console.error("[Server] Error starting dynamic categories job:", error);
          }
        }, BACKGROUND_JOB_DELAY + 5000);
      }

      
      // Start Audio Newsletter Jobs (scheduled generation and retries) - delayed
      if (shouldRunBackgroundJobs) {
        setTimeout(async () => {
          try {
            const { initializeAudioNewsletterJobs } = await import("./jobs/audioNewsletterJob");
            initializeAudioNewsletterJobs();
            console.log("[Server] ✅ Audio newsletter jobs started successfully");
          } catch (error) {
            console.error("[Server] ⚠️  Error starting audio newsletter jobs:", error);
            console.error("[Server] Server will continue running without audio newsletter automation");
          }
        }, BACKGROUND_JOB_DELAY + 20000); // +20s stagger
      }

      const enableNewsletterScheduler = process.env.ENABLE_NEWSLETTER_SCHEDULER !== 'false';
      
      if (shouldRunBackgroundJobs && enableNewsletterScheduler) {
        setTimeout(async () => {
          try {
            const { newsletterScheduler } = await import("./services/newsletterScheduler");
            newsletterScheduler.start();
            console.log("[Server] Newsletter scheduler started");
          } catch (error) {
            console.error("[Server] Error starting newsletter scheduler:", error);
          }
        }, BACKGROUND_JOB_DELAY + 25000);
      }
      
      const enableAITasksScheduler = process.env.ENABLE_AI_TASKS_SCHEDULER !== 'false';
      
      if (shouldRunBackgroundJobs && enableAITasksScheduler) {
        setTimeout(async () => {
          try {
            const { startAITasksScheduler } = await import("./jobs/aiTasksJob");
            startAITasksScheduler();
          } catch (error) {
            console.error("[Server] Error starting AI tasks scheduler:", error);
          }
        }, BACKGROUND_JOB_DELAY + 30000);
        
        setTimeout(async () => {
          try {
            const { startAiTasksCleanupJob } = await import("./jobs/aiTasksCleanup");
            startAiTasksCleanupJob();
          } catch (error) {
            console.error("[Server] Error starting AI tasks cleanup:", error);
          }
        }, BACKGROUND_JOB_DELAY + 40000);
        
        setTimeout(async () => {
          try {
            const { startArticleEditLocksCleanupJob } = await import("./jobs/articleEditLocksCleanup");
            startArticleEditLocksCleanupJob();
            const { startDatabaseCleanupJob } = await import("./jobs/databaseCleanupJob");
            startDatabaseCleanupJob();
          } catch (error) {
            console.error("[Server] Error starting cleanup jobs:", error);
          }
        }, BACKGROUND_JOB_DELAY + 50000);
        
        setTimeout(async () => {
          try {
            const { startIfoxContentGeneratorJob } = await import("./jobs/ifoxContentGeneratorJob");
            startIfoxContentGeneratorJob();
          } catch (error) {
            console.error("[Server] Error starting iFox generator:", error);
          }
        }, BACKGROUND_JOB_DELAY + 60000);
        
        setTimeout(async () => {
          try {
            const { startWorldDaysReminderJob } = await import("./jobs/worldDaysReminder");
            startWorldDaysReminderJob();
          } catch (error) {
            console.error("[Server] Error starting world days reminder:", error);
          }
        }, BACKGROUND_JOB_DELAY + 70000);
        
        setTimeout(async () => {
          try {
            const { startStaffCommunicationsScheduler } = await import("./jobs/staffCommunicationsJob");
            startStaffCommunicationsScheduler();
          } catch (error) {
            console.error("[Server] Error starting staff comms scheduler:", error);
          }
        }, BACKGROUND_JOB_DELAY + 80000);
        
        
        // Missing Thumbnails Regeneration - DISABLED for performance
        // TODO: Re-enable when missing images are fixed
        // setTimeout(async () => {
        //   try {
        //     const thumbnailService = await import('./services/thumbnailService');
        //     console.log("[Thumbnail Job] 🖼️ Starting missing thumbnails regeneration...");
        //     thumbnailService.generateMissingThumbnails(10).then(() => {
        //       console.log("[Thumbnail Job] ✅ Initial thumbnail regeneration completed");
        //     }).catch((err: any) => {
        //       console.error("[Thumbnail Job] ⚠️ Thumbnail regeneration error:", err);
        //     });
        //   } catch (error) {
        //     console.error("[Server] ⚠️ Error starting thumbnail job:", error);
        //   }
        // }, BACKGROUND_JOB_DELAY + 90000);
        console.log("[Thumbnail Job] ⏸️ Disabled for performance optimization");
        
        // Dashboard Stats Cache Refresh - runs every 4 minutes to keep cache warm
        setTimeout(async () => {
          try {
            const { storage } = await import("./storage");
            const { memoryCache, CACHE_TTL } = await import("./memoryCache");
            
            const refreshDashboardCache = async () => {
              try {
                const stats = await storage.getAdminDashboardStats();
                const trimmedStats = {
                  ...stats,
                  recentArticles: stats.recentArticles.map((article: any) => ({
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    englishSlug: article.englishSlug || undefined,
                    status: article.status,
                    publishedAt: article.publishedAt,
                    views: article.views,
                    author: article.author ? {
                      firstName: article.author.firstName,
                      lastName: article.author.lastName,
                      email: article.author.email,
                    } : undefined,
                  })),
                  topArticles: stats.topArticles.map((article: any) => ({
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    englishSlug: article.englishSlug || undefined,
                    status: article.status,
                    publishedAt: article.publishedAt,
                    views: article.views,
                    category: article.category ? {
                      nameAr: article.category.nameAr,
                    } : undefined,
                  })),
                  recentComments: stats.recentComments.map((comment: any) => ({
                    id: comment.id,
                    content: comment.content ? comment.content.substring(0, 100) : '',
                    status: comment.status,
                    createdAt: comment.createdAt,
                    user: comment.user ? {
                      firstName: comment.user.firstName,
                      lastName: comment.user.lastName,
                    } : undefined,
                  })),
                };
                memoryCache.set('admin:dashboard:stats', trimmedStats, CACHE_TTL.MEDIUM);
                console.log("[Dashboard Cache] ✅ Cache refreshed successfully");
              } catch (error) {
                console.error("[Dashboard Cache] ⚠️ Refresh failed:", error);
              }
            };
            
            setInterval(refreshDashboardCache, 30 * 60 * 1000);
            console.log("[Server] ✅ Dashboard Cache Refresh job started (every 30 minutes)");
          } catch (error) {
            console.error("[Server] ⚠️ Error starting dashboard cache refresh:", error);
          }
        }, BACKGROUND_JOB_DELAY + 100000);
        
      } else if (!shouldRunBackgroundJobs) {
        console.log("[Server] AI Tasks Scheduler skipped (background workers disabled or not leader)");
      } else {
        console.log("[Server] AI Tasks Scheduler disabled (set ENABLE_AI_TASKS_SCHEDULER=true to enable)");
      }

    // Handle server errors
    server.on("error", (error: any) => {
      console.error("[Server] ❌ Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`[Server] Port ${port} is already in use`);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("[Server] Fatal error during route initialization:", error);
    console.error("[Server] Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
    console.error("[Server] Server is still listening — health check will work but routes may be incomplete");
  }
})();


if (!(globalThis as any).__sabqServer) {
  process.on("SIGTERM", () => {
    console.log("[Server] SIGTERM signal received: closing HTTP server");
    process.exit(0);
  });
  process.on("SIGINT", () => {
    console.log("[Server] SIGINT signal received: closing HTTP server");
    process.exit(0);
  });
}
