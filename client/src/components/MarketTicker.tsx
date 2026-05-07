import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "ar" | "en";

interface TickerQuote {
  symbol: string;
  name?: string;
  name_en?: string;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
}

interface TickerSummary {
  index?: string | null;
  value?: number | null;
  change_percent?: number | null;
}

interface TickerPayload {
  summary: TickerSummary | TickerSummary[] | null;
  quotes: TickerQuote[];
  isDelayed?: boolean;
}

interface TickerResponse {
  ok: boolean;
  data?: TickerPayload;
  message?: string;
}

const LABELS: Record<Lang, Record<string, string>> = {
  ar: {
    delayed: "بيانات مؤجلة",
    tasi: "تاسي",
    label: "أسواق سعودية",
    sar: "ر.س",
    viewAll: "عرض جميع الأسواق",
  },
  en: {
    delayed: "Delayed data",
    tasi: "TASI",
    label: "Saudi Markets",
    sar: "SAR",
    viewAll: "View all markets",
  },
};

function getLocale(lang: Lang): string {
  // Use Latin-digit Arabic locale for AR so financial figures stay readable.
  return lang === "en" ? "en-US" : "ar-SA-u-nu-latn";
}

function fmt(n: number | null | undefined, locale: string, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(n: number | null | undefined, locale: string): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function pickSummary(s: TickerPayload["summary"]): TickerSummary | null {
  if (!s) return null;
  if (Array.isArray(s)) return s[0] ?? null;
  return s;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

interface Props {
  lang?: Lang;
  className?: string;
}

export function MarketTicker({ lang = "ar", className }: Props) {
  const labels = LABELS[lang];
  const isRtl = lang === "ar";
  const locale = getLocale(lang);
  const marketsHref = lang === "en" ? "/en/markets" : "/markets";
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);

  const { data, isError } = useQuery<TickerResponse>({
    queryKey: ["/api/markets/ticker"],
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });

  if (isError || !data || data.ok === false || !data.data) return null;
  const payload = data.data;
  const summary = pickSummary(payload.summary);
  const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
  if (!summary && quotes.length === 0) return null;

  const items: Array<{ key: string; node: React.ReactNode }> = [];
  if (summary) {
    items.push({
      key: `__summary`,
      node: (
        <SummaryPill
          label={summary.index || labels.tasi}
          value={summary.value ?? null}
          changePct={summary.change_percent ?? null}
          locale={locale}
        />
      ),
    });
  }
  quotes.forEach((q) => {
    items.push({
      key: q.symbol,
      node: <QuoteChip q={q} lang={lang} marketsHref={marketsHref} locale={locale} sarLabel={labels.sar} />,
    });
  });

  // Reduced-motion: render a static, scrollable strip instead of a marquee.
  const shouldAnimate = !reduced && items.length >= 3;

  return (
    <div
      role="region"
      aria-label={labels.label}
      aria-live="off"
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "w-full bg-muted/40 border-y border-border text-sm overflow-hidden",
        className,
      )}
      data-testid="market-ticker"
      onMouseEnter={() => shouldAnimate && setPaused(true)}
      onMouseLeave={() => shouldAnimate && setPaused(false)}
      onFocusCapture={() => shouldAnimate && setPaused(true)}
      onBlurCapture={() => shouldAnimate && setPaused(false)}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3 h-9">
        <Link href={marketsHref}>
          <span
            className="inline-flex items-center gap-1.5 font-semibold text-foreground hover-elevate active-elevate-2 rounded-md px-2 py-0.5 cursor-pointer shrink-0"
            data-testid="link-markets-from-ticker"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.label}
          </span>
        </Link>
        <div className="h-4 w-px bg-border shrink-0" aria-hidden="true" />

        {shouldAnimate ? (
          <div className="relative flex-1 overflow-hidden" aria-hidden={false}>
            <div
              className={cn(
                "flex items-center gap-6 whitespace-nowrap will-change-transform",
                isRtl ? "marquee-track-rtl" : "marquee-track-ltr",
              )}
              style={{
                animationPlayState: paused ? "paused" : "running",
                animationDuration: `${Math.max(20, items.length * 4)}s`,
              }}
            >
              {/* Render twice for seamless loop */}
              {[0, 1].map((cycle) => (
                <div key={cycle} className="flex items-center gap-6 shrink-0" aria-hidden={cycle === 1}>
                  {items.map((it) => (
                    <span key={`${cycle}-${it.key}`} className="shrink-0">
                      {it.node}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
            {items.map((it) => (
              <span key={it.key} className="shrink-0">
                {it.node}
              </span>
            ))}
          </div>
        )}

        {payload.isDelayed && (
          <span
            className="text-[11px] text-muted-foreground italic shrink-0 ms-2"
            data-testid="text-ticker-delayed"
          >
            {labels.delayed}
          </span>
        )}
        <Link href={marketsHref}>
          <span
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0 ms-2"
            data-testid="link-ticker-view-all"
          >
            {labels.viewAll}
          </span>
        </Link>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  changePct,
  locale,
}: {
  label: string;
  value: number | null;
  changePct: number | null;
  locale: string;
}) {
  const tone = changePct == null ? "flat" : changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  return (
    <span
      className="inline-flex items-center gap-1.5"
      data-testid={`summary-${label}`}
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{fmt(value, locale)}</span>
      <ChangeBadge tone={tone}>{fmtPct(changePct, locale)}</ChangeBadge>
    </span>
  );
}

function QuoteChip({
  q,
  lang,
  marketsHref,
  locale,
  sarLabel,
}: {
  q: TickerQuote;
  lang: Lang;
  marketsHref: string;
  locale: string;
  sarLabel: string;
}) {
  const tone =
    q.change_percent == null
      ? "flat"
      : q.change_percent > 0
        ? "up"
        : q.change_percent < 0
          ? "down"
          : "flat";
  const display = lang === "en" ? q.name_en || q.name || q.symbol : q.name || q.symbol;
  return (
    <Link href={`${marketsHref}/company/${q.symbol}`}>
      <span
        className="inline-flex items-center gap-1.5 hover-elevate active-elevate-2 rounded-md px-2 py-0.5 cursor-pointer"
        data-testid={`ticker-quote-${q.symbol}`}
      >
        <span className="font-mono text-xs text-muted-foreground">{q.symbol}</span>
        <span className="text-foreground max-w-[8rem] truncate">{display}</span>
        <span className="tabular-nums text-foreground">
          {fmt(q.price, locale)}
          <span className="ms-1 text-[10px] text-muted-foreground">{sarLabel}</span>
        </span>
        <ChangeBadge tone={tone}>{fmtPct(q.change_percent, locale)}</ChangeBadge>
      </span>
    </Link>
  );
}

function ChangeBadge({
  tone,
  children,
}: {
  tone: "up" | "down" | "flat";
  children: React.ReactNode;
}) {
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums text-xs font-medium",
        tone === "up" && "text-emerald-600 dark:text-emerald-400",
        tone === "down" && "text-rose-600 dark:text-rose-400",
        tone === "flat" && "text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {children}
    </span>
  );
}

export default MarketTicker;
