/**
 * SAHMK (Saudi stock market data) API client.
 *
 * Wraps https://app.sahmk.sa/api/v1, injects X-API-Key from env, applies a
 * short timeout + retry-once on transient errors, and returns a normalised
 * shape so callers never receive raw upstream JSON.
 *
 * Designed to work with both the Free / Test key (per-symbol quotes only,
 * 100 req/day) and any Starter+ key (bulk /quotes/?symbols=... + larger
 * quotas). Server-side caching lives in the routes layer.
 */

const DEFAULT_BASE_URL = "https://app.sahmk.sa/api/v1";
const REQUEST_TIMEOUT_MS = 8000;

export type SahmkErrorCode =
  | "missing_key"
  | "invalid_key"
  | "upstream_error"
  | "timeout"
  | "rate_limited"
  | "not_found"
  | "not_supported";

export interface SahmkError {
  ok: false;
  status: number;
  message: string;
  code: SahmkErrorCode;
}

export interface SahmkOk<T> {
  ok: true;
  data: T;
  isDelayed?: boolean;
}

export type SahmkResult<T> = SahmkOk<T> | SahmkError;

/** Upstream payloads carry varying extra fields per plan; surface them as `unknown`. */
export type SahmkExtras = Record<string, unknown>;

export interface SahmkQuote extends SahmkExtras {
  symbol: string;
  name?: string;
  name_en?: string;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previous_close?: number | null;
  volume?: number | null;
  value?: number | null;
  trades?: number | null;
  last_updated?: string | null;
  is_delayed?: boolean;
  sector?: string | null;
}

export interface SahmkMarketSummary extends SahmkExtras {
  index: string;
  value?: number | null;
  change?: number | null;
  change_percent?: number | null;
  advancing?: number | null;
  declining?: number | null;
  unchanged?: number | null;
  mood?: string | null;
  is_delayed?: boolean;
  last_updated?: string | null;
}

export interface SahmkCompany extends SahmkExtras {
  symbol: string;
  name?: string;
  name_en?: string;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  description_en?: string | null;
  website?: string | null;
}

function getApiKey(): string | null {
  const key = process.env.SAHMK_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

function getBaseUrl(): string {
  const url = process.env.SAHMK_BASE_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

export function isSahmkConfigured(): boolean {
  return getApiKey() !== null;
}

async function fetchOnce(url: string, apiKey: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    signal,
  });
}

/**
 * Tracks runtime capability detection: once the bulk /quotes/ endpoint
 * returns 404/501/missing-from-plan we stop trying it on this process.
 */
let bulkQuotesSupported: boolean | null = null;

async function callSahmk<T>(path: string, query?: Record<string, string>): Promise<SahmkResult<T>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      code: "missing_key",
      message: "SAHMK API key is not configured",
    };
  }

  const base = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(query).filter(([, v]) => v != null && v !== ""),
        ) as Record<string, string>,
      ).toString()
    : "";
  const url = `${base}${cleanPath}${qs}`;

  const attempt = async (isRetry: boolean): Promise<SahmkResult<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetchOnce(url, apiKey, controller.signal);
      clearTimeout(timer);

      if (res.status === 404) {
        return { ok: false, status: 404, code: "not_found", message: "السجل غير موجود" };
      }
      if (res.status === 429) {
        return {
          ok: false,
          status: 429,
          code: "rate_limited",
          message: "تم تجاوز حد طلبات SAHMK",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: res.status,
          code: "invalid_key",
          message: "مفتاح SAHMK غير صالح أو غير مصرّح به",
        };
      }
      if (res.status === 501) {
        return {
          ok: false,
          status: res.status,
          code: "not_supported",
          message: "هذه الخدمة غير متاحة في خطة SAHMK الحالية",
        };
      }
      if (!res.ok) {
        // Retry once on 5xx
        if (res.status >= 500 && !isRetry) {
          return attempt(true);
        }
        return {
          ok: false,
          status: res.status,
          code: "upstream_error",
          message: `SAHMK upstream error (${res.status})`,
        };
      }

      const text = await res.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        return {
          ok: false,
          status: 502,
          code: "upstream_error",
          message: "SAHMK returned invalid JSON",
        };
      }

      const isDelayed = detectDelayed(json);
      return { ok: true, data: json as T, isDelayed };
    } catch (err: unknown) {
      clearTimeout(timer);
      const e = err as { name?: string; message?: string } | undefined;
      if (e?.name === "AbortError") {
        if (!isRetry) return attempt(true);
        return {
          ok: false,
          status: 504,
          code: "timeout",
          message: "SAHMK request timed out",
        };
      }
      if (!isRetry) return attempt(true);
      return {
        ok: false,
        status: 502,
        code: "upstream_error",
        message: `SAHMK fetch failed: ${e?.message || "unknown error"}`,
      };
    }
  };

  return attempt(false);
}

function detectDelayed(json: unknown): boolean | undefined {
  if (!json || typeof json !== "object") return undefined;
  const obj = json as Record<string, unknown>;
  if (typeof obj.is_delayed === "boolean") return obj.is_delayed;
  if (Array.isArray(json) && json.length > 0) {
    return json.some((row) => row && typeof row === "object" && (row as { is_delayed?: boolean }).is_delayed === true);
  }
  return undefined;
}

export const sahmkClient = {
  isConfigured: isSahmkConfigured,
  getQuote(symbol: string): Promise<SahmkResult<SahmkQuote>> {
    const safe = encodeURIComponent(symbol.trim());
    return callSahmk<SahmkQuote>(`/quote/${safe}/`);
  },
  /** Bulk quotes endpoint. May 404 / 501 on Free tier — caller should fall back. */
  getQuotesBulk(symbols: string[]): Promise<SahmkResult<SahmkQuote[]>> {
    const cleaned = symbols.map((s) => s.trim()).filter(Boolean).join(",");
    return callSahmk<SahmkQuote[]>(`/quotes/`, { symbols: cleaned });
  },
  /**
   * Resilient bulk fetch: tries /quotes/?symbols= first; on `not_found` /
   * `not_supported` (Free tier) falls back to parallel per-symbol calls.
   * Returns the list with one quote per requested symbol that succeeded.
   */
  async getQuotes(symbols: string[]): Promise<SahmkResult<SahmkQuote[]>> {
    const list = symbols.map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return { ok: true, data: [], isDelayed: false };

    if (bulkQuotesSupported !== false) {
      const bulk = await this.getQuotesBulk(list);
      if (bulk.ok) {
        bulkQuotesSupported = true;
        return bulk;
      }
      if (bulk.code === "not_found" || bulk.code === "not_supported") {
        bulkQuotesSupported = false;
      } else if (bulk.code !== "rate_limited" && bulk.code !== "timeout") {
        // Persistent upstream issue — return the error so caller can decide.
        return bulk;
      }
    }

    // Per-symbol fallback.
    const settled = await Promise.all(list.map((s) => this.getQuote(s)));
    const quotes: SahmkQuote[] = [];
    let anyDelayed = false;
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.ok) {
        const data = r.data;
        const symbol = (data && typeof data === "object" && data.symbol) || list[i];
        quotes.push({ ...data, symbol });
        if (r.isDelayed) anyDelayed = true;
      }
    }
    if (quotes.length === 0) {
      return {
        ok: false,
        status: 502,
        code: "upstream_error",
        message: "تعذّر تحميل بيانات الأسهم",
      };
    }
    return { ok: true, data: quotes, isDelayed: anyDelayed };
  },
  getMarketSummary(index: "TASI" | "NOMU" = "TASI"): Promise<SahmkResult<SahmkMarketSummary | SahmkMarketSummary[]>> {
    return callSahmk<SahmkMarketSummary | SahmkMarketSummary[]>(`/market/summary/`, { index });
  },
  getGainers(index: "TASI" | "NOMU" = "TASI", limit = 10): Promise<SahmkResult<SahmkQuote[]>> {
    return callSahmk<SahmkQuote[]>(`/market/gainers/`, { index, limit: String(limit) });
  },
  getLosers(index: "TASI" | "NOMU" = "TASI", limit = 10): Promise<SahmkResult<SahmkQuote[]>> {
    return callSahmk<SahmkQuote[]>(`/market/losers/`, { index, limit: String(limit) });
  },
  getMostActive(index: "TASI" | "NOMU" = "TASI", limit = 10): Promise<SahmkResult<SahmkQuote[]>> {
    return callSahmk<SahmkQuote[]>(`/market/volume/`, { index, limit: String(limit) });
  },
  getCompany(symbol: string): Promise<SahmkResult<SahmkCompany>> {
    const safe = encodeURIComponent(symbol.trim());
    return callSahmk<SahmkCompany>(`/company/${safe}/`);
  },
};

/** Hard-coded ticker symbol list (Aramco, Al Rajhi, SABIC, STC, Alinma). */
export const TICKER_SYMBOLS = ["2222", "1120", "2010", "7010", "1180"] as const;

/** Curated featured-companies directory exposed via /api/markets/companies. */
export const FEATURED_COMPANIES: ReadonlyArray<{
  symbol: string;
  name_ar: string;
  name_en: string;
  sector?: string;
}> = [
  { symbol: "2222", name_ar: "أرامكو السعودية", name_en: "Saudi Aramco", sector: "Energy" },
  { symbol: "1120", name_ar: "مصرف الراجحي", name_en: "Al Rajhi Bank", sector: "Banks" },
  { symbol: "2010", name_ar: "سابك", name_en: "SABIC", sector: "Materials" },
  { symbol: "7010", name_ar: "الاتصالات السعودية", name_en: "STC", sector: "Telecom" },
  { symbol: "1180", name_ar: "مصرف الإنماء", name_en: "Alinma Bank", sector: "Banks" },
];
