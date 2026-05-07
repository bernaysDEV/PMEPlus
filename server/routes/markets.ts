import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  sahmkClient,
  isSahmkConfigured,
  TICKER_SYMBOLS,
  FEATURED_COMPANIES,
  type SahmkResult,
  type SahmkQuote,
  type SahmkMarketSummary,
} from "../services/sahmk";
import { withSWR } from "../memoryCache";
import { cacheControl } from "../cacheMiddleware";

const router: Router = Router();

const TTL_QUOTE = 30 * 1000; // 30 seconds for live data
const TTL_QUOTE_SWR = 60 * 1000;
const TTL_MARKET = 60 * 1000; // 1 minute for summary/movers
const TTL_MARKET_SWR = 5 * 60 * 1000;
const TTL_COMPANY = 10 * 60 * 1000; // 10 minutes for company profile
const TTL_COMPANY_SWR = 24 * 60 * 60 * 1000;
const TTL_DIRECTORY = 24 * 60 * 60 * 1000; // ~1 day for the curated directory
const TTL_DIRECTORY_SWR = 7 * 24 * 60 * 60 * 1000;

interface RateLimitReq {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

const realIp = (req: RateLimitReq): string => {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || "unknown";
};

const marketsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false, keyGeneratorIpFallback: false },
  keyGenerator: realIp as (req: unknown) => string,
  message: { ok: false, message: "تم تجاوز حد طلبات بيانات السوق. يرجى المحاولة بعد قليل" },
});

router.use(marketsLimiter);

interface NormalisedSummary {
  index: string | null;
  value: number | null;
  change: number | null;
  change_percent: number | null;
  advancing: number | null;
  declining: number | null;
  unchanged: number | null;
  volume: number | null;
  mood: string | null;
  is_delayed: boolean;
  last_updated: string | null;
}

function asNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Normalise an upstream summary object so the client always sees `value`,
 * `change`, `change_percent`, `mood`. */
function normalizeSummary(raw: unknown): NormalisedSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const objRaw = Array.isArray(raw) ? raw[0] : raw;
  if (!objRaw || typeof objRaw !== "object") return null;
  const obj = objRaw as Record<string, unknown>;
  return {
    index: asStringOrNull(obj.index ?? obj.symbol),
    value: asNumberOrNull(obj.value ?? obj.index_value ?? obj.last),
    change: asNumberOrNull(obj.change ?? obj.index_change),
    change_percent: asNumberOrNull(
      obj.change_percent ?? obj.index_change_percent ?? obj.percent_change,
    ),
    advancing: asNumberOrNull(obj.advancing ?? obj.advancers),
    declining: asNumberOrNull(obj.declining ?? obj.decliners),
    unchanged: asNumberOrNull(obj.unchanged),
    volume: asNumberOrNull(obj.volume ?? obj.total_volume),
    mood: asStringOrNull(obj.mood ?? obj.market_mood),
    is_delayed: obj.is_delayed === true,
    last_updated: asStringOrNull(obj.last_updated ?? obj.timestamp ?? obj.updated_at),
  };
}

/** Normalise list endpoints — upstream wraps under various keys. */
function normalizeList(raw: unknown): SahmkQuote[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SahmkQuote[];
  if (typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const candidates = ["data", "gainers", "losers", "stocks", "results", "quotes"] as const;
  for (const key of candidates) {
    const v = obj[key];
    if (Array.isArray(v)) return v as SahmkQuote[];
  }
  return [];
}

function rawIsDelayed(raw: unknown): boolean {
  if (!raw) return false;
  if (Array.isArray(raw)) {
    return raw.some(
      (r) => r && typeof r === "object" && (r as { is_delayed?: boolean }).is_delayed === true,
    );
  }
  if (typeof raw === "object" && (raw as { is_delayed?: boolean }).is_delayed === true) {
    return true;
  }
  return false;
}

function sendSahmkResult<T>(res: Response, result: SahmkResult<T>) {
  if (result.ok) {
    return res.json({ ok: true, data: result.data, isDelayed: result.isDelayed === true });
  }
  const status =
    result.code === "missing_key"
      ? 503
      : result.code === "invalid_key"
        ? 401
        : result.code === "rate_limited"
          ? 429
          : result.code === "not_found"
            ? 404
            : result.code === "timeout"
              ? 504
              : result.code === "not_supported"
                ? 501
                : 502;
  return res.status(status).json({
    ok: false,
    code: result.code,
    message: result.message,
  });
}

function validIndex(input: unknown): "TASI" | "NOMU" {
  return String(input || "").toUpperCase() === "NOMU" ? "NOMU" : "TASI";
}

function safeSymbol(input: string): string | null {
  const cleaned = String(input || "").trim();
  if (!/^[A-Za-z0-9._-]{1,16}$/.test(cleaned)) return null;
  return cleaned;
}

router.get("/status", (_req, res) => {
  res.json({ ok: true, configured: isSahmkConfigured() });
});

router.get(
  "/summary",
  cacheControl({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 300 }),
  async (req, res) => {
    const index = validIndex(req.query.index);
    const key = `sahmk:summary:${index}`;
    try {
      const result = await withSWR(key, TTL_MARKET, TTL_MARKET_SWR, () =>
        sahmkClient.getMarketSummary(index),
      );
      if (result.ok) {
        return res.json({
          ok: true,
          data: normalizeSummary(result.data),
          isDelayed: rawIsDelayed(result.data),
        });
      }
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/summary]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات السوق" });
    }
  },
);

router.get(
  "/gainers",
  cacheControl({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 300 }),
  async (req, res) => {
    const index = validIndex(req.query.index);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? 10), 10) || 10, 1), 25);
    const key = `sahmk:gainers:${index}:${limit}`;
    try {
      const result = await withSWR(key, TTL_MARKET, TTL_MARKET_SWR, () =>
        sahmkClient.getGainers(index, limit),
      );
      if (result.ok) {
        return res.json({
          ok: true,
          data: normalizeList(result.data),
          isDelayed: rawIsDelayed(result.data),
        });
      }
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/gainers]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات السوق" });
    }
  },
);

router.get(
  "/losers",
  cacheControl({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 300 }),
  async (req, res) => {
    const index = validIndex(req.query.index);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? 10), 10) || 10, 1), 25);
    const key = `sahmk:losers:${index}:${limit}`;
    try {
      const result = await withSWR(key, TTL_MARKET, TTL_MARKET_SWR, () =>
        sahmkClient.getLosers(index, limit),
      );
      if (result.ok) {
        return res.json({
          ok: true,
          data: normalizeList(result.data),
          isDelayed: rawIsDelayed(result.data),
        });
      }
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/losers]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات السوق" });
    }
  },
);

router.get(
  "/most-active",
  cacheControl({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 300 }),
  async (req, res) => {
    const index = validIndex(req.query.index);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? 10), 10) || 10, 1), 25);
    const key = `sahmk:active:${index}:${limit}`;
    try {
      const result = await withSWR(key, TTL_MARKET, TTL_MARKET_SWR, () =>
        sahmkClient.getMostActive(index, limit),
      );
      if (result.ok) {
        return res.json({
          ok: true,
          data: normalizeList(result.data),
          isDelayed: rawIsDelayed(result.data),
        });
      }
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/most-active]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات السوق" });
    }
  },
);

router.get(
  "/quote/:symbol",
  cacheControl({ maxAge: 15, sMaxAge: 30, staleWhileRevalidate: 120 }),
  async (req, res) => {
    const symbol = safeSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ ok: false, message: "رمز غير صالح" });
    const key = `sahmk:quote:${symbol}`;
    try {
      const result = await withSWR(key, TTL_QUOTE, TTL_QUOTE_SWR, () =>
        sahmkClient.getQuote(symbol),
      );
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/quote]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات السهم" });
    }
  },
);

router.get(
  "/company/:symbol",
  cacheControl({ maxAge: 600, sMaxAge: 3600, staleWhileRevalidate: 86400 }),
  async (req, res) => {
    const symbol = safeSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ ok: false, message: "رمز غير صالح" });
    const key = `sahmk:company:${symbol}`;
    try {
      const result = await withSWR(key, TTL_COMPANY, TTL_COMPANY_SWR, () =>
        sahmkClient.getCompany(symbol),
      );
      sendSahmkResult(res, result);
    } catch (err) {
      console.error("[markets/company]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل بيانات الشركة" });
    }
  },
);

/**
 * Curated featured-companies directory + their latest quotes.
 * Uses the resilient bulk-quote strategy (single /quotes/?symbols= call when
 * supported by the SAHMK plan, falling back to per-symbol calls otherwise).
 */
router.get(
  "/companies",
  cacheControl({ maxAge: 3600, sMaxAge: 86400, staleWhileRevalidate: 7 * 86400 }),
  async (_req, res) => {
    const key = `sahmk:companies:featured`;
    try {
      const payload = await withSWR(key, TTL_DIRECTORY, TTL_DIRECTORY_SWR, async () => {
        const symbols = FEATURED_COMPANIES.map((c) => c.symbol);
        const quotes = await sahmkClient.getQuotes(symbols);
        const quoteMap = new Map<string, SahmkQuote>();
        if (quotes.ok) {
          for (const q of quotes.data) {
            if (q && typeof q === "object" && q.symbol) {
              quoteMap.set(String(q.symbol), q);
            }
          }
        }
        return {
          companies: FEATURED_COMPANIES.map((c) => ({
            ...c,
            quote: quoteMap.get(c.symbol) ?? null,
          })),
          isDelayed: quotes.ok ? quotes.isDelayed === true : false,
        };
      });
      res.json({ ok: true, data: payload });
    } catch (err) {
      console.error("[markets/companies]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل قائمة الشركات" });
    }
  },
);

interface TickerPayload {
  summary: NormalisedSummary | null;
  summaryError: string | null;
  quotes: SahmkQuote[];
  isDelayed: boolean;
}

/**
 * Ticker payload: market summary + quotes for the hard-coded ticker symbols.
 * Implemented as one route so the homepage marquee makes a single request.
 * Quotes are fetched via the resilient bulk-quote strategy that uses /quotes/
 * when supported by the SAHMK plan and falls back to per-symbol calls
 * otherwise — preserving daily-quota where possible.
 */
router.get(
  "/ticker",
  cacheControl({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 300 }),
  async (_req, res) => {
    const key = `sahmk:ticker:tasi:default`;
    try {
      const payload = await withSWR<TickerPayload>(key, TTL_MARKET, TTL_MARKET_SWR, async () => {
        const [summary, quotes] = await Promise.all([
          sahmkClient.getMarketSummary("TASI"),
          sahmkClient.getQuotes([...TICKER_SYMBOLS]),
        ]);
        const normalisedSummary = summary.ok ? normalizeSummary(summary.data) : null;
        const quoteList = quotes.ok ? quotes.data : [];
        return {
          summary: normalisedSummary,
          summaryError: summary.ok ? null : summary.code,
          quotes: quoteList,
          isDelayed:
            (summary.ok && rawIsDelayed(summary.data)) ||
            (quotes.ok && quotes.isDelayed === true),
        };
      });
      res.json({ ok: true, data: payload });
    } catch (err) {
      console.error("[markets/ticker]", err);
      res.status(500).json({ ok: false, message: "تعذّر تحميل شريط الأسواق" });
    }
  },
);

// Re-export type so server/routes.ts module composition stays type-safe if used.
export type { SahmkMarketSummary };
export default router;
