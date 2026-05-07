import { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

export const getCsrfToken: RequestHandler = (req, res) => {
  const token = ensureCsrfToken(req);

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ csrfToken: token });
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Method+path allow-list of routes that genuinely need to be CSRF-exempt.
// IMPORTANT: do NOT add a broad prefix here. Each entry must be the narrowest
// pattern that lets the legitimate caller through. Anything not on this list
// hits the standard CSRF check.
type ExemptRoute = { method: string; path: RegExp; reason: string };

const EXEMPT_ROUTES: ExemptRoute[] = [
  // ---- Auth flows that have no session yet (brute-force-protected by authLimiter) ----
  { method: "POST", path: /^\/api\/login$/, reason: "login (no session yet)" },
  { method: "POST", path: /^\/api\/register$/, reason: "register (no session yet)" },
  // OAuth provider redirects + callbacks (provider-initiated, no CSRF token possible)
  { method: "GET", path: /^\/api\/auth\/google(\/callback)?$/, reason: "Google OAuth" },
  { method: "GET", path: /^\/api\/auth\/apple(\/callback)?$/, reason: "Apple OAuth" },
  { method: "POST", path: /^\/api\/auth\/apple\/callback$/, reason: "Apple form_post callback" },
  // Forgot/reset/verify-email (no session, token-bearing links)
  { method: "POST", path: /^\/api\/forgot-password$/, reason: "forgot password (no session)" },
  { method: "POST", path: /^\/api\/reset-password$/, reason: "reset password (token in body)" },
  { method: "POST", path: /^\/api\/auth\/forgot-password$/, reason: "forgot password (no session)" },
  { method: "POST", path: /^\/api\/auth\/reset-password$/, reason: "reset password (token in body)" },
  { method: "GET", path: /^\/api\/(auth\/)?verify-email/, reason: "verify-email link click" },
  { method: "POST", path: /^\/api\/(auth\/)?verify-email/, reason: "verify-email link click" },

  // ---- RFC 6749 OAuth token endpoint (uses client credentials, not CSRF) ----
  { method: "POST", path: /^\/api\/oauth\/token$/, reason: "RFC 6749 §5.2 token endpoint" },

  // ---- External webhooks (signed by provider, not browser-issued) ----
  { method: "POST", path: /^\/api\/webhooks\//, reason: "external provider webhook" },
  { method: "POST", path: /^\/api\/whatsapp\/webhook/, reason: "Twilio/Meta WhatsApp webhook" },
  { method: "POST", path: /^\/api\/twilio\//, reason: "Twilio webhook" },
  { method: "POST", path: /^\/api\/email-agent\/webhook/, reason: "SendGrid inbound parse webhook" },

  // ---- Public registration forms (anonymous, before user has a session) ----
  { method: "POST", path: /^\/api\/correspondent-applications(\/|$)/, reason: "public reporter registration" },
  { method: "POST", path: /^\/api\/opinion-author-applications(\/|$)/, reason: "public opinion-author registration" },

  // ---- Anonymous tracking (no session, fire-and-forget POST/sendBeacon) ----
  { method: "POST", path: /^\/api\/accessibility\/track$/, reason: "anonymous accessibility tracking" },
  { method: "POST", path: /^\/api\/articles\/[^/]+\/view$/, reason: "anonymous AR article view counter" },
  { method: "POST", path: /^\/api\/en\/articles\/[^/]+\/view$/, reason: "anonymous EN article view counter" },
  { method: "POST", path: /^\/api\/native-ads\/[^/]+\/(impression|click)/, reason: "ad impression/click pixel" },
  { method: "POST", path: /^\/api\/analytics\/visitors\/ping$/, reason: "anonymous visitor heartbeat" },

  // ---- Public AI chatbot (anonymous users) ----
  { method: "POST", path: /^\/api\/ai\/chat$/, reason: "public AI chatbot" },
  { method: "POST", path: /^\/api\/en\/chat$/, reason: "public English AI chatbot" },

  // ---- Audio newsletter listener tracking (anonymous public players) ----
  { method: "POST", path: /^\/api\/audio-newsletters\/newsletters\/[^/]+\/listen$/, reason: "anonymous listen tracking" },
  { method: "POST", path: /^\/api\/audio-newsletters\/newsletters\/[^/]+\/track$/, reason: "anonymous play tracking" },

  // ---- sendBeacon-on-unload (Beacon API can't attach custom headers) ----
  { method: "POST", path: /^\/api\/admin\/moderator\/disconnect$/, reason: "sendBeacon on tab close" },
  { method: "POST", path: /^\/api\/editor-presence\/leave$/, reason: "sendBeacon on tab close" },
  { method: "DELETE", path: /^\/api\/editor-presence\/leave$/, reason: "sendBeacon on tab close" },

  // ---- Mobile API (iOS/Android apps) ----
  // The /api/v1 surface is consumed by the native iOS/Android apps. Auth is
  // either anonymous (article view counters, device registration, menu) or
  // a Bearer token from the `app_member_sessions` table (verified by
  // `verifyMemberSession` in `server/routes/mobileApiRoutes.ts`). Browser
  // session cookies are never honored on this surface, so CSRF tokens are
  // not applicable. We enumerate every mutating route explicitly — DO NOT
  // re-add a `/api/v1/.*` wildcard. Any new mutating mobile route MUST add
  // its own entry here AND continue to authenticate via Bearer token (not
  // cookie session). If a future endpoint accepts cookie-based sessions,
  // move it out of /api/v1 instead of broadening this list.
  // -- anonymous tracking --
  { method: "POST", path: /^\/api\/v1\/articles\/[^/]+\/view$/, reason: "mobile anon view counter" },
  { method: "POST", path: /^\/api\/v1\/articles\/batch-view$/, reason: "mobile anon batch view" },
  { method: "POST", path: /^\/api\/v1\/devices\/register$/, reason: "mobile anon device register" },
  { method: "DELETE", path: /^\/api\/v1\/devices\/unregister$/, reason: "mobile anon device unregister" },
  { method: "POST", path: /^\/api\/v1\/notifications\/event$/, reason: "mobile anon notif event" },
  { method: "PUT", path: /^\/api\/v1\/devices\/[^/]+\/preferences$/, reason: "mobile anon device prefs" },
  // -- auth (no session yet) --
  { method: "POST", path: /^\/api\/v1\/auth\/(register|activate|resend-activation|login|logout|logout-all|forgot-password|reset-password)$/, reason: "mobile auth — Bearer token" },
  // -- members (Bearer token via verifyMemberSession) --
  { method: "PUT", path: /^\/api\/v1\/members\/profile$/, reason: "mobile member — Bearer token" },
  { method: "POST", path: /^\/api\/v1\/members\/profile\/image$/, reason: "mobile member — Bearer token" },
  { method: "DELETE", path: /^\/api\/v1\/members\/profile\/image$/, reason: "mobile member — Bearer token" },
  { method: "POST", path: /^\/api\/v1\/members\/change-password$/, reason: "mobile member — Bearer token" },
  { method: "PUT", path: /^\/api\/v1\/members\/interests$/, reason: "mobile member — Bearer token" },
  { method: "POST", path: /^\/api\/v1\/members\/interests(\/add)?$/, reason: "mobile member — Bearer token" },
  { method: "DELETE", path: /^\/api\/v1\/members\/interests\/[^/]+$/, reason: "mobile member — Bearer token" },
  { method: "POST", path: /^\/api\/v1\/members\/fcm-token$/, reason: "mobile member — Bearer token" },
  { method: "DELETE", path: /^\/api\/v1\/members\/account$/, reason: "mobile member — Bearer token" },

  // ---- Storefront API (uses storeAuthMiddleware Bearer tokens, not session) ----
  { method: "POST", path: /^\/api\/store\/auth\//, reason: "store login/register (no session yet)" },
  { method: "POST", path: /^\/api\/store\/cart(\/|$)/, reason: "store cart — Bearer token auth" },
  { method: "PATCH", path: /^\/api\/store\/cart\//, reason: "store cart — Bearer token auth" },
  { method: "DELETE", path: /^\/api\/store\/cart(\/|$)/, reason: "store cart — Bearer token auth" },
];

function isExemptRoute(method: string, path: string, originalUrl: string): boolean {
  for (const entry of EXEMPT_ROUTES) {
    if (entry.method !== method) continue;
    if (entry.path.test(path) || entry.path.test(originalUrl)) {
      return true;
    }
  }
  return false;
}

export const validateCsrfToken: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (isExemptRoute(req.method, req.path, req.originalUrl)) {
    return next();
  }

  if (!req.session) {
    console.warn("[CSRF] No session found for request:", req.path);
    return res.status(403).json({
      message: "الجلسة غير متوفرة. يرجى تحديث الصفحة والمحاولة مرة أخرى",
    });
  }

  const sessionToken = req.session.csrfToken;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;

  if (!headerToken) {
    console.warn("[CSRF] No X-CSRF-Token header for:", req.path);
    return res.status(403).json({
      message: "رمز الحماية مطلوب للعمليات الحساسة. يرجى تحديث الصفحة",
    });
  }

  let compareToken = sessionToken;

  if (!compareToken && cookieToken && headerToken) {
    try {
      if (
        cookieToken.length === headerToken.length &&
        crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
      ) {
        req.session.csrfToken = cookieToken;
        compareToken = cookieToken;
      }
    } catch {}
  }

  if (!compareToken) {
    console.warn("[CSRF] No session token for:", req.path);
    return res.status(403).json({
      message: "رمز الحماية غير متوفر. يرجى تحديث الصفحة والمحاولة مرة أخرى",
    });
  }

  try {
    if (
      !crypto.timingSafeEqual(Buffer.from(compareToken), Buffer.from(headerToken))
    ) {
      console.warn("[CSRF] Token mismatch for:", req.path);
      return res.status(403).json({
        message: "رمز الحماية غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى",
      });
    }
  } catch (error) {
    console.warn("[CSRF] Token comparison error for:", req.path, error);
    return res.status(403).json({
      message: "رمز الحماية غير صالح",
    });
  }

  next();
};

export function regenerateCsrfToken(req: Request): string {
  req.session.csrfToken = generateCsrfToken();
  return req.session.csrfToken;
}
