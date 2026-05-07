// Centralised rate limiters used across the API. Lives in `server/middleware`
// (not `server/index.ts`) so route modules can import them without creating a
// route → entrypoint coupling/circular dependency.
//
// All keys are `req.user?.id || cf-real-ip`. The legacy `connect.sid`-cookie
// short-circuit was removed in task-73 — sending a forged cookie no longer
// bypasses rate limits.

import rateLimit from "express-rate-limit";
import type { Request } from "express";

export function getRealClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"] as string | undefined;
  const xff = req.headers["x-forwarded-for"] as string | undefined;
  return cfIp || xff?.split(",")[0]?.trim() || req.ip || "unknown";
}

export function rateLimitKey(req: Request): string {
  const userId = (req as any).user?.id;
  if (userId) return `u:${userId}`;
  return `ip:${getRealClientIp(req)}`;
}

function rateLimitKeyByRoute(routeTag: string) {
  return (req: Request) => `${routeTag}:${rateLimitKey(req)}`;
}

const safeMethodSkip = (req: Request) =>
  req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "تم تجاوز حد طلبات الذكاء الاصطناعي. يرجى المحاولة بعد دقيقة" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: rateLimitKeyByRoute("ai"),
  skip: safeMethodSkip,
});

export const ttsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "تم تجاوز حد طلبات تحويل النص إلى صوت. يرجى المحاولة لاحقاً" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: rateLimitKeyByRoute("tts"),
  skip: safeMethodSkip,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "تم تجاوز حد طلبات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => `pwreset:${getRealClientIp(req)}`,
});

export const analyticsTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: false,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => `track:${getRealClientIp(req)}`,
  skip: safeMethodSkip,
  handler: (_req, res) => res.status(429).end(),
});
