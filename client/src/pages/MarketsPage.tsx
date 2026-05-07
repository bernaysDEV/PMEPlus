import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "ar" | "en";
type IndexCode = "TASI" | "NOMU";

interface Quote {
  symbol: string;
  name?: string;
  name_en?: string;
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
}

interface Summary {
  index?: string | null;
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

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
  isDelayed?: boolean;
}

interface AuthUser {
  name?: string | null;
  email?: string;
  role?: string;
  profileImageUrl?: string | null;
  permissions?: string[];
}

const LABELS = {
  ar: {
    title: "الأسواق السعودية",
    subtitle: "متابعة لحظية لمؤشر تاسي وأبرز الشركات في السوق المالية السعودية",
    poweredBy: "البيانات بدعم من Sahmk",
    summary: "ملخص السوق",
    gainers: "الأكثر ارتفاعاً",
    losers: "الأكثر انخفاضاً",
    active: "الأكثر نشاطاً",
    advancing: "ارتفعت",
    declining: "انخفضت",
    unchanged: "بدون تغيير",
    mood: "حالة السوق",
    lastUpdated: "آخر تحديث",
    sar: "ر.س",
    delayed: "البيانات مؤجلة (15-20 دقيقة)",
    error: "تعذّر تحميل بيانات السوق حالياً، حاول لاحقاً.",
    empty: "لا توجد بيانات للعرض حالياً",
    pageTitle: "الأسواق السعودية | سبق الذكية",
    metaDescription:
      "متابعة لحظية لمؤشر تاسي والأكثر ارتفاعاً وانخفاضاً ونشاطاً في السوق المالية السعودية، بدعم من Sahmk.",
    home: "الرئيسية",
    markets: "الأسواق",
    indexLabel: "المؤشر",
    tasi: "تاسي",
    nomu: "نمو",
  },
  en: {
    title: "Saudi Markets",
    subtitle: "Live coverage of TASI and the most active companies on the Saudi exchange",
    poweredBy: "Data powered by Sahmk",
    summary: "Market summary",
    gainers: "Top gainers",
    losers: "Top losers",
    active: "Most active",
    advancing: "Advancing",
    declining: "Declining",
    unchanged: "Unchanged",
    mood: "Market mood",
    lastUpdated: "Last updated",
    sar: "SAR",
    delayed: "Data delayed by 15-20 minutes",
    error: "Couldn't load market data right now. Please try again later.",
    empty: "No data available",
    pageTitle: "Saudi Markets | Sabq Smart",
    metaDescription:
      "Live coverage of the TASI index and Saudi market top gainers, losers, and most-active stocks, powered by Sahmk.",
    home: "Home",
    markets: "Markets",
    indexLabel: "Index",
    tasi: "TASI",
    nomu: "NOMU",
  },
} as const;

function getLocale(lang: Lang): string {
  return lang === "en" ? "en-US" : "ar-SA-u-nu-latn";
}

function fmt(n: number | null | undefined, locale: string, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function fmtInt(n: number | null | undefined, locale: string): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString(locale);
}
function fmtPct(n: number | null | undefined, locale: string): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
function fmtDateTime(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function changeTone(n: number | null | undefined): "up" | "down" | "flat" {
  if (n == null) return "flat";
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}
function changeClass(n: number | null | undefined): string {
  const t = changeTone(n);
  if (t === "up") return "text-emerald-600 dark:text-emerald-400";
  if (t === "down") return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}
function pickSummary(payload: Summary | Summary[] | undefined | null): Summary | null {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  return payload;
}

/**
 * Inject canonical + hreflang alternate link tags so AR / EN versions of the
 * Markets page are correctly cross-referenced for SEO. Cleans up on unmount.
 */
function useMarketsSeo(lang: Lang, labels: typeof LABELS.ar | typeof LABELS.en) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = labels.pageTitle;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    ensureMeta("description", labels.metaDescription);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const arUrl = `${origin}/markets`;
    const enUrl = `${origin}/en/markets`;
    const canonicalHref = lang === "en" ? enUrl : arUrl;

    const upsertLink = (rel: string, hreflang: string | null, href: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let el = document.head.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        if (hreflang) el.setAttribute("hreflang", hreflang);
        document.head.appendChild(el);
      }
      el.href = href;
    };

    upsertLink("canonical", null, canonicalHref);
    upsertLink("alternate", "ar", arUrl);
    upsertLink("alternate", "en", enUrl);
    upsertLink("alternate", "x-default", arUrl);
    // Tags are intentionally left in place; the next page using this pattern
    // overwrites them via the same upsert helper.
  }, [lang, labels]);
}

export default function MarketsPage() {
  const [location] = useLocation();
  const lang: Lang = location.startsWith("/en") ? "en" : "ar";
  const labels = LABELS[lang];
  const isRtl = lang === "ar";
  const locale = getLocale(lang);
  const marketsBase = lang === "en" ? "/en/markets" : "/markets";
  const homeHref = lang === "en" ? "/en" : "/";

  useMarketsSeo(lang, labels);

  const [indexCode, setIndexCode] = useState<IndexCode>("TASI");

  const { data: user } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/user"] });

  const summaryQuery = useQuery<ApiResponse<Summary | Summary[]>>({
    queryKey: ["/api/markets/summary", { index: indexCode }],
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const gainersQuery = useQuery<ApiResponse<Quote[]>>({
    queryKey: ["/api/markets/gainers", { index: indexCode }],
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const losersQuery = useQuery<ApiResponse<Quote[]>>({
    queryKey: ["/api/markets/losers", { index: indexCode }],
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const activeQuery = useQuery<ApiResponse<Quote[]>>({
    queryKey: ["/api/markets/most-active", { index: indexCode }],
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const summary = pickSummary(summaryQuery.data?.ok ? summaryQuery.data.data : null);
  const isDelayed =
    summary?.is_delayed === true ||
    summaryQuery.data?.isDelayed === true ||
    gainersQuery.data?.isDelayed === true ||
    losersQuery.data?.isDelayed === true ||
    activeQuery.data?.isDelayed === true;

  const allFailed =
    !summaryQuery.isLoading &&
    !gainersQuery.isLoading &&
    !losersQuery.isLoading &&
    !activeQuery.isLoading &&
    !summaryQuery.data?.ok &&
    !gainersQuery.data?.ok &&
    !losersQuery.data?.ok &&
    !activeQuery.data?.ok;

  const lastUpdatedDisplay = fmtDateTime(summary?.last_updated, locale);

  const content = (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumb data-testid="breadcrumbs-markets">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={homeHref} data-testid="link-breadcrumb-home">
                {labels.home}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{labels.markets}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-markets-title">
              {labels.title}
            </h1>
            <p className="text-muted-foreground" data-testid="text-markets-subtitle">
              {labels.subtitle}
            </p>
          </div>
          <IndexSwitcher
            value={indexCode}
            onChange={setIndexCode}
            labels={labels}
          />
        </div>
        <p className="text-xs text-muted-foreground italic">{labels.poweredBy}</p>
        {isDelayed && (
          <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="text-markets-delayed">
            {labels.delayed}
          </p>
        )}
      </header>

      {allFailed ? (
        <Alert variant="destructive" data-testid="alert-markets-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{labels.error}</AlertTitle>
          <AlertDescription>{labels.poweredBy}</AlertDescription>
        </Alert>
      ) : (
        <>
          <SummaryCard
            summary={summary}
            loading={summaryQuery.isLoading}
            labels={labels}
            locale={locale}
            indexCode={indexCode}
            lastUpdatedDisplay={lastUpdatedDisplay}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MoversCard
              title={labels.gainers}
              icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              quotes={gainersQuery.data?.ok ? (gainersQuery.data.data ?? []) : []}
              loading={gainersQuery.isLoading}
              error={!gainersQuery.isLoading && !gainersQuery.data?.ok}
              labels={labels}
              lang={lang}
              locale={locale}
              marketsBase={marketsBase}
              testId="card-gainers"
            />
            <MoversCard
              title={labels.losers}
              icon={<TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
              quotes={losersQuery.data?.ok ? (losersQuery.data.data ?? []) : []}
              loading={losersQuery.isLoading}
              error={!losersQuery.isLoading && !losersQuery.data?.ok}
              labels={labels}
              lang={lang}
              locale={locale}
              marketsBase={marketsBase}
              testId="card-losers"
            />
            <MoversCard
              title={labels.active}
              icon={<Activity className="h-4 w-4 text-primary" />}
              quotes={activeQuery.data?.ok ? (activeQuery.data.data ?? []) : []}
              loading={activeQuery.isLoading}
              error={!activeQuery.isLoading && !activeQuery.data?.ok}
              labels={labels}
              lang={lang}
              locale={locale}
              marketsBase={marketsBase}
              testId="card-active"
              showVolume
            />
          </div>
        </>
      )}
    </div>
  );

  if (lang === "en") {
    return <EnglishLayout>{content}</EnglishLayout>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <Header user={user || undefined} />
      <main className="flex-1">{content}</main>
      <Footer />
    </div>
  );
}

function IndexSwitcher({
  value,
  onChange,
  labels,
}: {
  value: IndexCode;
  onChange: (v: IndexCode) => void;
  labels: typeof LABELS.ar | typeof LABELS.en;
}) {
  const options: Array<{ code: IndexCode; label: string }> = [
    { code: "TASI", label: labels.tasi },
    { code: "NOMU", label: labels.nomu },
  ];
  return (
    <div
      className="inline-flex rounded-md border border-border bg-background overflow-hidden"
      role="tablist"
      aria-label={labels.indexLabel}
      data-testid="switcher-index"
    >
      {options.map((opt) => {
        const active = value === opt.code;
        return (
          <Button
            key={opt.code}
            type="button"
            variant={active ? "default" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.code)}
            className="rounded-none h-9 px-4"
            data-testid={`button-index-${opt.code.toLowerCase()}`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

function SummaryCard({
  summary,
  loading,
  labels,
  locale,
  indexCode,
  lastUpdatedDisplay,
}: {
  summary: Summary | null;
  loading: boolean;
  labels: typeof LABELS.ar | typeof LABELS.en;
  locale: string;
  indexCode: IndexCode;
  lastUpdatedDisplay: string | null;
}) {
  return (
    <Card data-testid="card-market-summary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
          <span>{labels.summary}</span>
          <span className="text-sm font-mono text-muted-foreground" data-testid="text-summary-index">
            {summary?.index || indexCode}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !summary ? (
          <p className="text-muted-foreground text-sm">{labels.empty}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label={labels.summary}
                value={fmt(summary.value, locale)}
                hint={
                  <span
                    className={cn(
                      "text-sm tabular-nums inline-flex items-center gap-2",
                      changeClass(summary.change_percent),
                    )}
                    data-testid="text-summary-change"
                  >
                    <span>{fmt(summary.change, locale)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{fmtPct(summary.change_percent, locale)}</span>
                  </span>
                }
                testId="stat-index"
              />
              <Stat
                label={labels.advancing}
                value={fmtInt(summary.advancing, locale)}
                testId="stat-advancing"
                valueClassName="text-emerald-600 dark:text-emerald-400"
              />
              <Stat
                label={labels.declining}
                value={fmtInt(summary.declining, locale)}
                testId="stat-declining"
                valueClassName="text-rose-600 dark:text-rose-400"
              />
              <Stat
                label={labels.unchanged}
                value={fmtInt(summary.unchanged, locale)}
                testId="stat-unchanged"
                valueClassName="text-muted-foreground"
              />
            </div>
            {(summary.mood || lastUpdatedDisplay) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm pt-2 border-t border-border">
                {summary.mood && (
                  <span data-testid="text-summary-mood">
                    <span className="text-muted-foreground">{labels.mood}: </span>
                    <span className="font-medium">{summary.mood}</span>
                  </span>
                )}
                {lastUpdatedDisplay && (
                  <span data-testid="text-summary-updated">
                    <span className="text-muted-foreground">{labels.lastUpdated}: </span>
                    <time dateTime={summary.last_updated ?? undefined} className="tabular-nums">
                      {lastUpdatedDisplay}
                    </time>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClassName,
  testId,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  valueClassName?: string;
  testId?: string;
}) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", valueClassName)}>{value}</p>
      {hint}
    </div>
  );
}

function MoversCard({
  title,
  icon,
  quotes,
  loading,
  error,
  labels,
  lang,
  locale,
  marketsBase,
  testId,
  showVolume = false,
}: {
  title: string;
  icon: React.ReactNode;
  quotes: Quote[];
  loading: boolean;
  error: boolean;
  labels: typeof LABELS.ar | typeof LABELS.en;
  lang: Lang;
  locale: string;
  marketsBase: string;
  testId: string;
  showVolume?: boolean;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{labels.error}</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {quotes.slice(0, 10).map((q) => (
              <li key={q.symbol} className="py-2">
                <Link href={`${marketsBase}/company/${q.symbol}`}>
                  <span
                    className="flex items-center justify-between gap-3 hover-elevate active-elevate-2 rounded-md px-2 py-1 -mx-2 cursor-pointer"
                    data-testid={`row-mover-${q.symbol}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">
                        {q.symbol}
                      </span>
                      <span className="truncate text-sm">
                        {lang === "en" ? q.name_en || q.name || q.symbol : q.name || q.symbol}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      {showVolume && (
                        <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                          {fmtInt(q.volume, locale)}
                        </span>
                      )}
                      <span className="tabular-nums text-sm">
                        {fmt(q.price, locale)}
                        <span className="ms-1 text-[10px] text-muted-foreground">{labels.sar}</span>
                      </span>
                      <span
                        className={cn(
                          "tabular-nums text-sm font-medium w-20 text-end",
                          changeClass(q.change_percent),
                        )}
                      >
                        {fmtPct(q.change_percent, locale)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
