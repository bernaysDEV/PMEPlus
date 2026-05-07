import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Activity,
  Eye,
  MessageCircle,
  Heart,
  Trophy,
  Medal,
  Award,
  MapPin,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";

type DeveloperStatus = "active" | "launching" | "quiet";

interface PulseDeveloperLatest {
  articleId: string;
  title: string;
  slug: string;
  publishedAt: string | null;
}

interface PulseDeveloper {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  logoUrl: string | null;
  countryNameAr: string | null;
  cityNameAr: string | null;
  brandColor: string | null;
  articlesCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  engagementScore: number;
  lastArticleAt: string | null;
  sparkline: number[];
  status: DeveloperStatus;
  latestArticle: PulseDeveloperLatest | null;
}

interface PulseTickerItem {
  articleId: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  views: number;
  developer: {
    id: string;
    nameAr: string;
    slug: string;
    brandColor: string | null;
    logoUrl: string | null;
  } | null;
}

interface RealEstatePulseResponse {
  generatedAt: string;
  kpis: {
    totalArticles: number;
    totalViews: number;
    trackedCompanies: number;
    activeCompanies: number;
    launchingCompanies: number;
    projectsLaunched: number;
    trendDeltaPct: number;
    topCompany: { nameAr: string; slug: string; score: number } | null;
    risingCity: { nameAr: string; articles: number } | null;
  };
  leaderboard: PulseDeveloper[];
  ticker: PulseTickerItem[];
}

function formatNumber(n: number | null | undefined): string {
  const v = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  if (v >= 1_000_000) {
    return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "م";
  }
  if (v >= 1_000) {
    return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "ك";
  }
  return v.toString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

function RankBadge({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500 dark:bg-yellow-500/20">
        <Trophy className="h-4 w-4" />
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-400/15 text-slate-500 dark:text-slate-300 dark:bg-slate-400/20">
        <Medal className="h-4 w-4" />
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 dark:bg-amber-700/20">
        <Award className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
      {index + 1}
    </div>
  );
}

function StatusBadge({ status }: { status: DeveloperStatus }) {
  if (status === "launching") {
    return (
      <Badge
        className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
        data-testid="badge-status-launching"
      >
        <Sparkles className="ml-1 h-3 w-3" />
        تطلق مشروع
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge
        className="border-primary/40 bg-primary/10 text-[10px] font-semibold text-primary"
        data-testid="badge-status-active"
      >
        نشطة
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] text-muted-foreground"
      data-testid="badge-status-quiet"
    >
      هادئة
    </Badge>
  );
}

function Sparkline({ data, color }: { data: number[]; color?: string | null }) {
  const width = 64;
  const height = 22;
  if (!data || data.length === 0) {
    return <div className="h-[22px] w-16" />;
  }
  const max = Math.max(...data, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = color || "currentColor";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  labelAr: string;
  value: string;
  hint?: React.ReactNode;
  testId: string;
}

function KpiTile({ icon, labelAr, value, hint, testId }: KpiTileProps) {
  return (
    <Card data-testid={testId} className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{labelAr}</p>
          <p className="truncate text-lg font-bold leading-tight" data-testid={`${testId}-value`}>
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

interface RealEstatePulseBlockProps {
  enabled?: boolean;
}

export function RealEstatePulseBlock({ enabled = true }: RealEstatePulseBlockProps) {
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<RealEstatePulseResponse>({
      queryKey: ["/api/real-estate-pulse"],
      enabled,
      staleTime: 60_000,
    });

  const tickerItems = useMemo(() => data?.ticker ?? [], [data]);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <section dir="rtl" className="space-y-4" data-testid="block-real-estate-pulse-loading">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        dir="rtl"
        data-testid="block-real-estate-pulse-error"
        aria-labelledby="real-estate-pulse-error-heading"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3
                id="real-estate-pulse-error-heading"
                className="text-base font-semibold"
              >
                تعذّر تحميل نبض الشركات العقارية
              </h3>
              <p className="text-sm text-muted-foreground">
                حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-retry-real-estate-pulse"
            >
              {isFetching ? (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="ml-1 h-4 w-4" />
              )}
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const { kpis, leaderboard } = data;
  const trendDelta = kpis.trendDeltaPct ?? 0;
  const trendIsUp = trendDelta >= 0;

  return (
    <section
      dir="rtl"
      className="space-y-4"
      data-testid="block-real-estate-pulse"
      aria-labelledby="real-estate-pulse-heading"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="real-estate-pulse-heading"
              className="text-xl font-bold leading-tight md:text-2xl"
              data-testid="text-real-estate-pulse-title"
            >
              نبض الشركات العقارية
            </h2>
            <p className="text-xs text-muted-foreground">
              نشاط أبرز المطورين العقاريين خلال آخر 7 أيام
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" />
          آخر تحديث الآن
        </Badge>
      </div>

      {/* Layer 1 — KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          testId="kpi-active-developers"
          icon={<Building2 className="h-5 w-5" />}
          labelAr="شركات نشطة"
          value={`${formatNumber(kpis.activeCompanies)} / ${formatNumber(kpis.trackedCompanies)}`}
          hint={
            kpis.launchingCompanies > 0
              ? `${formatNumber(kpis.launchingCompanies)} تطلق مشروع`
              : undefined
          }
        />
        <KpiTile
          testId="kpi-projects-launched"
          icon={<Sparkles className="h-5 w-5" />}
          labelAr="مشاريع تم إطلاقها"
          value={formatNumber(kpis.projectsLaunched)}
          hint={`${formatNumber(kpis.totalArticles)} خبر هذا الأسبوع`}
        />
        <KpiTile
          testId="kpi-market-trend"
          icon={
            trendIsUp ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          labelAr="اتجاه السوق (مقابل الأسبوع السابق)"
          value={`${trendIsUp ? "+" : ""}${trendDelta}%`}
          hint={
            <span className={trendIsUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
              {trendIsUp ? "صعود" : "تراجع"}
            </span>
          }
        />
        <KpiTile
          testId="kpi-rising-city"
          icon={<MapPin className="h-5 w-5" />}
          labelAr="المدينة الصاعدة"
          value={kpis.risingCity?.nameAr ?? "—"}
          hint={
            kpis.risingCity
              ? `${formatNumber(kpis.risingCity.articles)} خبر`
              : undefined
          }
        />
      </div>

      {/* Layer 2 — Leaderboard.
          Mobile: horizontal-scroll cards (snap). Desktop: vertical list. */}
      {leaderboard.length === 0 ? (
        <Card data-testid="card-leaderboard-empty">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              لا توجد بيانات متاحة لهذا الأسبوع
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile horizontal-scroll */}
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden"
            data-testid="leaderboard-scroll-mobile"
          >
            {leaderboard.map((dev, index) => (
              <DeveloperCard key={dev.id} dev={dev} index={index} variant="card" />
            ))}
          </div>

          {/* Desktop vertical list */}
          <Card data-testid="card-leaderboard" className="hidden md:block">
            <CardContent className="p-0">
              <ul className="divide-y">
                {leaderboard.map((dev, index) => (
                  <DeveloperCard key={dev.id} dev={dev} index={index} variant="row" />
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Layer 3 — Marquee Ticker */}
      {tickerItems.length > 0 && (
        <Card
          className="overflow-hidden border-primary/20 bg-primary/5"
          data-testid="card-ticker"
        >
          <CardContent className="flex items-center gap-3 p-0">
            <div className="hidden shrink-0 items-center gap-2 bg-primary px-4 py-3 text-primary-foreground sm:flex">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-bold whitespace-nowrap">آخر التحديثات</span>
            </div>
            <div className="relative flex-1 overflow-hidden py-3">
              <div className="flex w-max animate-marquee gap-8 whitespace-nowrap pe-8">
                {[...tickerItems, ...tickerItems].map((item, idx) => (
                  <Link
                    key={`${item.articleId}-${idx}`}
                    href={`/article/${item.slug}`}
                    className="inline-flex items-center gap-2 text-sm hover:text-primary"
                    data-testid={`ticker-item-${item.articleId}-${idx}`}
                  >
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                    {item.developer ? (
                      <span className="font-semibold text-primary">
                        {item.developer.nameAr}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">—</span>
                    <span className="truncate text-foreground">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

interface DeveloperCardProps {
  dev: PulseDeveloper;
  index: number;
  variant: "row" | "card";
}

function DeveloperCard({ dev, index, variant }: DeveloperCardProps) {
  const sparkColor = dev.brandColor ?? undefined;
  const baseTestId = `row-developer-${dev.id}`;

  if (variant === "card") {
    return (
      <Card
        className="w-[280px] shrink-0 snap-start"
        data-testid={baseTestId}
      >
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <RankBadge index={index} />
            <Avatar className="h-10 w-10 shrink-0">
              {dev.logoUrl ? <AvatarImage src={dev.logoUrl} alt={dev.nameAr} /> : null}
              <AvatarFallback className="text-xs font-bold">
                {getInitials(dev.nameAr)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold"
                data-testid={`text-developer-name-${dev.id}`}
              >
                {dev.nameAr}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {dev.cityNameAr ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {dev.cityNameAr}
                  </span>
                ) : null}
                <StatusBadge status={dev.status} />
              </div>
            </div>
            <Sparkline data={dev.sparkline} color={sparkColor} />
          </div>
          <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1" data-testid={`stat-articles-${dev.id}`}>
              <Newspaper className="h-3 w-3" />
              {formatNumber(dev.articlesCount)}
            </span>
            <span className="inline-flex items-center gap-1" data-testid={`stat-views-${dev.id}`}>
              <Eye className="h-3 w-3" />
              {formatNumber(dev.totalViews)}
            </span>
            <span className="inline-flex items-center gap-1" data-testid={`stat-likes-${dev.id}`}>
              <Heart className="h-3 w-3" />
              {formatNumber(dev.totalLikes)}
            </span>
            <span className="inline-flex items-center gap-1" data-testid={`stat-comments-${dev.id}`}>
              <MessageCircle className="h-3 w-3" />
              {formatNumber(dev.totalComments)}
            </span>
          </div>
          {dev.latestArticle ? (
            <Link
              href={`/article/${dev.latestArticle.slug}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              data-testid={`link-latest-${dev.id}`}
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="truncate">{dev.latestArticle.title}</span>
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">لا توجد أخبار حديثة</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <li
      className="flex items-center gap-4 p-4 hover-elevate"
      data-testid={baseTestId}
    >
      <RankBadge index={index} />
      <Avatar className="h-12 w-12 shrink-0">
        {dev.logoUrl ? <AvatarImage src={dev.logoUrl} alt={dev.nameAr} /> : null}
        <AvatarFallback className="text-xs font-bold">
          {getInitials(dev.nameAr)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className="truncate text-sm font-semibold md:text-base"
            data-testid={`text-developer-name-${dev.id}`}
          >
            {dev.nameAr}
          </p>
          {dev.countryNameAr ? (
            <Badge variant="secondary" className="text-[10px]">
              {dev.countryNameAr}
            </Badge>
          ) : null}
          {dev.cityNameAr ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {dev.cityNameAr}
            </span>
          ) : null}
          <StatusBadge status={dev.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" data-testid={`stat-articles-${dev.id}`}>
            <Newspaper className="h-3 w-3" />
            {formatNumber(dev.articlesCount)} خبر
          </span>
          <span className="inline-flex items-center gap-1" data-testid={`stat-views-${dev.id}`}>
            <Eye className="h-3 w-3" />
            {formatNumber(dev.totalViews)}
          </span>
          <span className="inline-flex items-center gap-1" data-testid={`stat-likes-${dev.id}`}>
            <Heart className="h-3 w-3" />
            {formatNumber(dev.totalLikes)}
          </span>
          <span className="inline-flex items-center gap-1" data-testid={`stat-comments-${dev.id}`}>
            <MessageCircle className="h-3 w-3" />
            {formatNumber(dev.totalComments)}
          </span>
        </div>
        {dev.latestArticle ? (
          <Link
            href={`/article/${dev.latestArticle.slug}`}
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            data-testid={`link-latest-${dev.id}`}
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            <span className="truncate">{dev.latestArticle.title}</span>
          </Link>
        ) : null}
      </div>
      <div className="hidden flex-col items-end gap-1 sm:flex">
        <Sparkline data={dev.sparkline} color={sparkColor} />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          مؤشر التفاعل
        </p>
        <p
          className="text-sm font-bold text-primary"
          data-testid={`score-engagement-${dev.id}`}
        >
          {formatNumber(dev.engagementScore)}
        </p>
      </div>
    </li>
  );
}

export default RealEstatePulseBlock;
