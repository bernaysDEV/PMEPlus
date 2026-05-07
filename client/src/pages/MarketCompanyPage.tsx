import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SocialShareBar } from "@/components/SocialShareBar";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "ar" | "en";

interface Quote {
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
  sector?: string | null;
  is_delayed?: boolean;
  last_updated?: string | null;
}

interface Company {
  symbol: string;
  name?: string;
  name_en?: string;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  description_en?: string | null;
  website?: string | null;
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
    home: "الرئيسية",
    markets: "الأسواق",
    notFound: "لم يتم العثور على بيانات لهذا السهم",
    error: "تعذّر تحميل بيانات الشركة حالياً.",
    delayed: "البيانات مؤجلة (15-20 دقيقة)",
    poweredBy: "البيانات بدعم من Sahmk",
    sar: "ر.س",
    price: "السعر",
    change: "التغيّر",
    changePct: "النسبة %",
    open: "الافتتاح",
    high: "الأعلى",
    low: "الأدنى",
    prevClose: "إغلاق سابق",
    volume: "الكمية",
    value: "القيمة (ر.س)",
    trades: "الصفقات",
    sector: "القطاع",
    industry: "النشاط",
    about: "نبذة عن الشركة",
    website: "الموقع الإلكتروني",
    quoteTitle: "بيانات السهم",
    lastUpdated: "آخر تحديث",
    share: "مشاركة",
  },
  en: {
    home: "Home",
    markets: "Markets",
    notFound: "No data found for this symbol",
    error: "Couldn't load company data right now.",
    delayed: "Data delayed by 15-20 minutes",
    poweredBy: "Data powered by Sahmk",
    sar: "SAR",
    price: "Price",
    change: "Change",
    changePct: "% Change",
    open: "Open",
    high: "High",
    low: "Low",
    prevClose: "Prev close",
    volume: "Volume",
    value: "Value (SAR)",
    trades: "Trades",
    sector: "Sector",
    industry: "Industry",
    about: "About the company",
    website: "Website",
    quoteTitle: "Quote",
    lastUpdated: "Last updated",
    share: "Share",
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
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
function changeClass(n: number | null | undefined): string {
  if (n == null) return "text-muted-foreground";
  if (n > 0) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

function useCompanySeo({
  lang,
  symbol,
  display,
  description,
}: {
  lang: Lang;
  symbol: string;
  display: string;
  description?: string | null;
}) {
  useEffect(() => {
    if (typeof document === "undefined" || !symbol) return;
    document.title = `${display} (${symbol}) | ${lang === "en" ? "Sabq Smart" : "سبق الذكية"}`;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    ensureMeta(
      "description",
      (description?.slice(0, 200) ||
        (lang === "en"
          ? `${display} (${symbol}) live quote and company profile on Sabq Smart Markets, powered by Sahmk.`
          : `بيانات السهم ${display} (${symbol}) ولمحة عن الشركة على أسواق سبق الذكية، بدعم من Sahmk.`)),
    );

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const arUrl = `${origin}/markets/company/${symbol}`;
    const enUrl = `${origin}/en/markets/company/${symbol}`;
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
  }, [lang, symbol, display, description]);
}

export default function MarketCompanyPage() {
  const [location] = useLocation();
  const lang: Lang = location.startsWith("/en") ? "en" : "ar";
  const labels = LABELS[lang];
  const isRtl = lang === "ar";
  const locale = getLocale(lang);
  const marketsBase = lang === "en" ? "/en/markets" : "/markets";
  const homeHref = lang === "en" ? "/en" : "/";

  const [, paramsAr] = useRoute("/markets/company/:symbol");
  const [, paramsEn] = useRoute("/en/markets/company/:symbol");
  const symbol = (paramsAr?.symbol || paramsEn?.symbol || "").trim();

  const quoteQuery = useQuery<ApiResponse<Quote>>({
    queryKey: ["/api/markets/quote", symbol],
    enabled: symbol.length > 0,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const companyQuery = useQuery<ApiResponse<Company>>({
    queryKey: ["/api/markets/company", symbol],
    enabled: symbol.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: user } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/user"] });

  const quote = quoteQuery.data?.ok ? quoteQuery.data.data : undefined;
  const company = companyQuery.data?.ok ? companyQuery.data.data : undefined;
  const display =
    (lang === "en" ? company?.name_en || quote?.name_en : company?.name || quote?.name) ||
    quote?.name ||
    company?.name ||
    symbol;
  const description = lang === "en" ? company?.description_en : company?.description;

  useCompanySeo({ lang, symbol, display, description });

  const isDelayed = quote?.is_delayed === true || quoteQuery.data?.isDelayed === true;
  const failed =
    !quoteQuery.isLoading &&
    !quoteQuery.data?.ok &&
    !companyQuery.isLoading &&
    !companyQuery.data?.ok;

  const lastUpdated = fmtDateTime(quote?.last_updated, locale);

  const shareUrl = `${marketsBase}/company/${symbol}`;
  const shareTitle = lang === "en" ? `${display} (${symbol}) — Saudi Markets` : `${display} (${symbol}) — الأسواق السعودية`;

  const inner = (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumb data-testid="breadcrumbs-company">
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
            <BreadcrumbLink asChild>
              <Link href={marketsBase} data-testid="link-breadcrumb-markets">
                {labels.markets}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {display} <span className="font-mono text-xs text-muted-foreground">({symbol})</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground" data-testid="text-company-symbol">
          {symbol}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-company-name">
          {display}
        </h1>
        {(quote?.sector || company?.sector) && (
          <p className="text-sm text-muted-foreground">
            {labels.sector}: {quote?.sector || company?.sector}
          </p>
        )}
        {isDelayed && (
          <p className="text-xs text-amber-700 dark:text-amber-400">{labels.delayed}</p>
        )}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground" data-testid="text-company-updated">
            {labels.lastUpdated}:{" "}
            <time dateTime={quote?.last_updated ?? undefined} className="tabular-nums">
              {lastUpdated}
            </time>
          </p>
        )}
        <p className="text-xs text-muted-foreground italic">{labels.poweredBy}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3" data-testid="company-share-row">
        <span className="text-xs text-muted-foreground">{labels.share}:</span>
        <SocialShareBar
          title={shareTitle}
          url={shareUrl}
          layout="horizontal"
          showLabels={false}
        />
      </div>

      {failed && (
        <Alert variant="destructive" data-testid="alert-company-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{labels.notFound}</AlertTitle>
          <AlertDescription>{labels.error}</AlertDescription>
        </Alert>
      )}

      <Card data-testid="card-company-quote">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-3">
            <span>{labels.quoteTitle}</span>
            <span className="text-xs text-muted-foreground">{labels.sar}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quoteQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !quote ? (
            <p className="text-sm text-muted-foreground">{labels.notFound}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field
                label={labels.price}
                value={fmt(quote.price, locale)}
                suffix={labels.sar}
                testId="field-price"
                big
              />
              <Field
                label={labels.change}
                value={fmt(quote.change, locale)}
                suffix={labels.sar}
                valueClassName={changeClass(quote.change)}
                testId="field-change"
                big
              />
              <Field
                label={labels.changePct}
                value={fmtPct(quote.change_percent, locale)}
                valueClassName={changeClass(quote.change_percent)}
                testId="field-change-pct"
                big
              />
              <Field
                label={labels.prevClose}
                value={fmt(quote.previous_close, locale)}
                suffix={labels.sar}
                testId="field-prev"
              />
              <Field label={labels.open} value={fmt(quote.open, locale)} suffix={labels.sar} testId="field-open" />
              <Field label={labels.high} value={fmt(quote.high, locale)} suffix={labels.sar} testId="field-high" />
              <Field label={labels.low} value={fmt(quote.low, locale)} suffix={labels.sar} testId="field-low" />
              <Field label={labels.volume} value={fmtInt(quote.volume, locale)} testId="field-volume" />
              {quote.value != null && (
                <Field label={labels.value} value={fmtInt(quote.value, locale)} testId="field-value" />
              )}
              {quote.trades != null && (
                <Field label={labels.trades} value={fmtInt(quote.trades, locale)} testId="field-trades" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(company?.description || company?.description_en || company?.industry || company?.website) && (
        <Card data-testid="card-company-about">
          <CardHeader>
            <CardTitle className="text-base">{labels.about}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company?.industry && (
              <p className="text-sm">
                <span className="text-muted-foreground">{labels.industry}: </span>
                {company.industry}
              </p>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {description}
              </p>
            )}
            {(() => {
              const safeWebsite = (() => {
                if (!company?.website) return null;
                try {
                  const u = new URL(company.website);
                  return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
                } catch {
                  return null;
                }
              })();
              return safeWebsite ? (
                <p className="text-sm">
                  <a
                    href={safeWebsite}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-primary underline hover:no-underline"
                    data-testid="link-company-website"
                  >
                    {labels.website}
                  </a>
                </p>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (lang === "en") {
    return <EnglishLayout>{inner}</EnglishLayout>;
  }
  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <Header user={user || undefined} />
      <main className="flex-1">{inner}</main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  value,
  suffix,
  valueClassName,
  testId,
  big,
}: {
  label: string;
  value: string;
  suffix?: string;
  valueClassName?: string;
  testId?: string;
  big?: boolean;
}) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("tabular-nums font-semibold", big ? "text-xl" : "text-base", valueClassName)}>
        {value}
        {suffix && value !== "—" && (
          <span className="ms-1 text-xs font-normal text-muted-foreground">{suffix}</span>
        )}
      </p>
    </div>
  );
}
