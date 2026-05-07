import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo, useCallback, useEffect, type CSSProperties } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsArticleCard } from "@/components/NewsArticleCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  Sparkles,
  Brain,
  Calendar,
  Zap,
  TrendingUp,
  Eye,
  RefreshCw,
  ArrowLeft,
  Home,
  CheckCircle,
  BookOpen,
  LayoutGrid,
  List as ListIcon,
  Activity,
  Compass,
  ChevronLeft,
  FolderX,
  Loader2,
  UserCircle2,
  Pin,
  Layers,
  Radio,
  Hash,
  BarChart3,
  Building2,
  Globe,
  Newspaper,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Category, ArticleWithDetails, User } from "@shared/schema";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
} from "date-fns";
import { arSA } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";

const isNewArticle = (publishedAt: Date | string | null | undefined) => {
  if (!publishedAt) return false;
  const published =
    typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  const now = new Date();
  const diffInHours = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 3;
};

function getArticleHref(article: { slug: string; englishSlug?: string | null }) {
  return `/article/${article.englishSlug || article.slug}`;
}

// Blend any CSS color with transparency. For hex inputs (the common case from
// `category.color`) we compute an `rgba(...)` value directly so it works in
// every browser. For hsl/named/other inputs we fall back to `color-mix(...)`.
function withAlpha(color: string, percent: number) {
  const safe = Math.max(0, Math.min(100, percent));
  const hex = color.trim().replace(/^#/, "");
  const isHex3 = /^[0-9a-fA-F]{3}$/.test(hex);
  const isHex6 = /^[0-9a-fA-F]{6}$/.test(hex);
  if (isHex3 || isHex6) {
    const full = isHex3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${safe / 100})`;
  }
  return `color-mix(in srgb, ${color} ${safe}%, transparent)`;
}

// Small Lucide name → component map. If `category.icon` happens to store a
// known Lucide identifier (e.g. "Home", "Building2"), render the real icon;
// otherwise fall back to rendering the value as text/emoji.
const LUCIDE_ICON_BY_NAME: Record<string, LucideIcon> = {
  Home,
  Building2,
  Globe,
  Newspaper,
  TrendingUp,
  Activity,
  BarChart3,
  Hash,
  Layers,
  Radio,
  Calendar,
  BookOpen,
  Compass,
};

function CategoryIcon({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) {
  if (!icon) return null;
  const LucideComp = LUCIDE_ICON_BY_NAME[icon];
  if (LucideComp) return <LucideComp className={className} aria-hidden="true" />;
  return <span className={className}>{icon}</span>;
}

function getCategoryTypeBadge(type?: string) {
  switch (type) {
    case "dynamic":
      return { label: "ديناميكي", icon: <Zap className="h-3 w-3" /> };
    case "smart":
      return { label: "ذكي", icon: <Brain className="h-3 w-3" /> };
    case "seasonal":
      return { label: "موسمي", icon: <Calendar className="h-3 w-3" /> };
    default:
      return null;
  }
}

type SortMode = "newest" | "views" | "engagement";
type TimeRange = "today" | "3days" | "7days" | "30days" | "all";
type ArticleTypeFilter = "all" | "breaking" | "new" | "opinion" | "analysis";
type ViewLayout = "bento" | "timeline";

const VIEW_LAYOUT_STORAGE_KEY_BASE = "category-page:view-layout";
const getViewLayoutStorageKey = (slug: string) =>
  `${VIEW_LAYOUT_STORAGE_KEY_BASE}:${slug}`;

// Identity accent — prefers `iconColor` (when present in data) and falls back
// to the persisted `color` field. Both are treated as a CSS color string.
function getCategoryAccent(
  category: Category | null | undefined,
): string | undefined {
  if (!category) return undefined;
  const iconColor = (category as { iconColor?: string | null }).iconColor;
  return iconColor || category.color || undefined;
}

// ── CinematicCover ────────────────────────────────────────────────────────
interface CinematicCoverProps {
  category: Category;
  coverArticle?: ArticleWithDetails;
  reducedMotion: boolean;
}

function CinematicCover({
  category,
  coverArticle,
  reducedMotion,
}: CinematicCoverProps) {
  const accent = getCategoryAccent(category);
  const heroImage =
    coverArticle?.imageUrl || category.heroImageUrl || undefined;
  const isSmart =
    category.type === "smart" ||
    category.type === "dynamic" ||
    category.type === "seasonal";

  const fadeIn = reducedMotion
    ? { initial: false, animate: false }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      };

  return (
    <section
      className="relative w-full overflow-hidden"
      data-testid="cinematic-cover"
    >
      <div className="relative min-h-[460px] sm:min-h-[520px] lg:min-h-[600px]">
        {heroImage ? (
          <img
            src={heroImage}
            alt={coverArticle?.title || category.nameAr}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: accent
                ? `linear-gradient(135deg, ${accent} 0%, hsl(var(--primary)) 100%)`
                : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
            }}
          />
        )}

        {/* Dark wash so light text remains readable in any theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/40" />

        {/* Accent edge */}
        {accent && (
          <div
            className="absolute bottom-0 right-0 left-0 h-1.5"
            style={{ background: accent }}
          />
        )}

        <div className="relative z-10 container mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <motion.nav
            {...fadeIn}
            className="flex items-center gap-2 text-sm text-white/80 mb-6"
            data-testid="cover-breadcrumb"
          >
            <Link href="/">
              <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                <Home className="h-3.5 w-3.5" />
                الرئيسية
              </span>
            </Link>
            <ChevronLeft className="h-3.5 w-3.5" />
            <Link href="/categories">
              <span className="hover:text-white cursor-pointer">
                التصنيفات
              </span>
            </Link>
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="text-white font-semibold">{category.nameAr}</span>
          </motion.nav>

          <motion.div
            {...fadeIn}
            transition={{
              ...(fadeIn.transition || {}),
              delay: reducedMotion ? 0 : 0.05,
            }}
            className="max-w-4xl"
          >
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <Badge
                className="border-0 text-white backdrop-blur-md bg-white/15 hover:bg-white/15"
                style={accent ? { background: withAlpha(accent, 90) } : undefined}
                data-testid="cover-category-pill"
              >
                {category.icon && (
                  <CategoryIcon
                    icon={category.icon}
                    className="ml-1 inline-block h-4 w-4 text-base leading-none"
                  />
                )}
                {category.nameAr}
              </Badge>

              {coverArticle?.newsType === "breaking" && (
                <Badge className="bg-red-600 hover:bg-red-600 text-white border-0">
                  <Zap className="h-3 w-3 ml-1" />
                  عاجل
                </Badge>
              )}
              {coverArticle?.newsType === "analysis" && (
                <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white border-0">
                  <BarChart3 className="h-3 w-3 ml-1" />
                  تحليل
                </Badge>
              )}
              {coverArticle && isNewArticle(coverArticle.publishedAt) && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0">
                  جديد
                </Badge>
              )}
              {isSmart && (
                <Badge className="border-0 text-white bg-white/10 backdrop-blur-md hover:bg-white/10">
                  <Sparkles className="h-3 w-3 ml-1" />
                  اختيار ذكي
                </Badge>
              )}
            </div>

            {coverArticle ? (
              <>
                <Link href={getArticleHref(coverArticle)}>
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 cursor-pointer hover:underline decoration-white/40 underline-offset-8"
                    data-testid="cover-title"
                  >
                    {coverArticle.title}
                  </h1>
                </Link>
                {coverArticle.excerpt && (
                  <p
                    className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl leading-relaxed mb-6 line-clamp-3"
                    data-testid="cover-excerpt"
                  >
                    {coverArticle.excerpt}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-white/85">
                  {coverArticle.author && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 ring-2 ring-white/30">
                        <AvatarImage
                          src={
                            coverArticle.author.profileImageUrl || undefined
                          }
                        />
                        <AvatarFallback className="text-xs bg-white/15 text-white">
                          {coverArticle.author.firstName?.[0] || "م"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {coverArticle.author.firstName}{" "}
                        {coverArticle.author.lastName}
                      </span>
                    </div>
                  )}
                  {coverArticle.publishedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(coverArticle.publishedAt), {
                        addSuffix: true,
                        locale: arSA,
                      })}
                    </span>
                  )}
                  {typeof coverArticle.views === "number" && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {coverArticle.views.toLocaleString("en-US")} مشاهدة
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href={getArticleHref(coverArticle)}>
                    <Button
                      size="lg"
                      className="gap-2"
                      style={
                        accent
                          ? {
                              background: accent,
                              borderColor: accent,
                              color: "white",
                            }
                          : undefined
                      }
                      data-testid="button-cover-read"
                    >
                      <BookOpen className="h-5 w-5" />
                      اقرأ القصة
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => {
                      document
                        .getElementById("category-articles")
                        ?.scrollIntoView({
                          behavior: reducedMotion ? "auto" : "smooth",
                          block: "start",
                        });
                    }}
                    data-testid="button-cover-all"
                  >
                    <Compass className="h-5 w-5" />
                    كل أخبار التصنيف
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4"
                  data-testid="cover-title"
                >
                  {category.nameAr}
                </h1>
                {category.description && (
                  <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl leading-relaxed">
                    {category.description}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── CategoryIdentityStrip ─────────────────────────────────────────────────
interface CategoryIdentityStripProps {
  category: Category;
  totalArticles: number;
}

function CategoryIdentityStrip({
  category,
  totalArticles,
}: CategoryIdentityStripProps) {
  const accent = getCategoryAccent(category);
  const typeBadge = getCategoryTypeBadge(category.type);
  const isSmart =
    category.type === "smart" ||
    category.type === "dynamic" ||
    category.type === "seasonal";

  return (
    <section
      className="border-b bg-card"
      data-testid="category-identity-strip"
    >
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-md text-2xl sm:text-3xl"
              style={{
                background: accent ? withAlpha(accent, 10) : "hsl(var(--muted))",
                color: accent || "hsl(var(--foreground))",
              }}
              data-testid="category-icon-block"
            >
              {category.icon ? (
                <CategoryIcon icon={category.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
              ) : (
                <Hash className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2
                  className="text-xl sm:text-2xl font-bold text-foreground truncate"
                  data-testid="identity-title"
                >
                  {category.nameAr}
                </h2>
                {isSmart ? (
                  <Badge
                    className="border-0 text-white"
                    style={
                      accent
                        ? { background: accent }
                        : { background: "hsl(var(--primary))" }
                    }
                    data-testid="identity-type-badge"
                  >
                    <Sparkles className="h-3 w-3 ml-1" />
                    {typeBadge?.label || "ذكي"}
                  </Badge>
                ) : typeBadge ? (
                  <Badge
                    variant="secondary"
                    data-testid="identity-type-badge"
                  >
                    {typeBadge.icon}
                    <span className="mr-1">{typeBadge.label}</span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" data-testid="identity-type-badge">
                    قسم
                  </Badge>
                )}
              </div>
              {category.description ? (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2">
                  {category.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  أحدث الأخبار والتقارير في {category.nameAr}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 md:border-r md:pr-6 md:border-border">
            <div className="text-right">
              <div
                className="text-2xl sm:text-3xl font-extrabold tabular-nums"
                style={accent ? { color: accent } : undefined}
                data-testid="identity-total-count"
              >
                {totalArticles.toLocaleString("en-US")}
              </div>
              <div className="text-xs text-muted-foreground">
                مقالة منشورة
              </div>
            </div>
            <Layers className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── EditorBrief — week summary, top 3 highlights, last update ─────────────
interface EditorBriefProps {
  articles: ArticleWithDetails[];
  accentColor?: string | null;
  latestArticle?: ArticleWithDetails | null;
  categorySlug?: string;
}

interface CategoryBriefResponse {
  brief: string;
  generatedAt: string;
  articleCount: number;
  fromCache: boolean;
  provider: "anthropic" | "openai" | null;
}

function EditorBrief({
  articles,
  accentColor,
  latestArticle,
  categorySlug,
}: EditorBriefProps) {
  const accent = accentColor || undefined;

  const sevenDayCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return articles.filter(
      (a) => a.publishedAt && new Date(a.publishedAt).getTime() >= cutoff,
    ).length;
  }, [articles]);

  const highlights = useMemo(() => {
    return [...articles]
      .sort(
        (a, b) =>
          (b.views || 0) +
          (b.reactionsCount || 0) * 4 -
          ((a.views || 0) + (a.reactionsCount || 0) * 4),
      )
      .slice(0, 3);
  }, [articles]);

  const briefQuery = useQuery<CategoryBriefResponse>({
    queryKey: ["/api/categories", categorySlug, "brief"],
    queryFn: () =>
      apiRequest<CategoryBriefResponse>(
        `/api/categories/${encodeURIComponent(categorySlug || "")}/brief`,
        { method: "POST" },
      ),
    enabled: !!categorySlug && articles.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const aiBrief = briefQuery.data?.brief?.trim() || null;
  const aiBriefLoading = briefQuery.isLoading;

  return (
    <section className="border-b bg-background" data-testid="editor-brief">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Stat — week */}
          <div className="lg:col-span-3">
            <div
              className="h-full rounded-md border bg-card p-5 flex flex-col justify-between"
              data-testid="brief-week-stat"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                هذا الأسبوع
              </div>
              <div>
                <div
                  className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-3"
                  style={accent ? { color: accent } : undefined}
                >
                  {sevenDayCount.toLocaleString("en-US")}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  مقالة جديدة خلال آخر 7 أيام
                </div>
              </div>
              {latestArticle?.publishedAt && (
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" />
                  آخر تحديث{" "}
                  {formatDistanceToNow(new Date(latestArticle.publishedAt), {
                    addSuffix: true,
                    locale: arSA,
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Highlights */}
          <div className="lg:col-span-9">
            {/* AI Editor Brief — narrative summary of category */}
            {(aiBriefLoading || aiBrief) && (
              <div
                className="mb-4 rounded-md border bg-card p-4 sm:p-5"
                data-testid="brief-ai-narrative"
              >
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={accent ? { color: accent } : undefined}
                  />
                  موجز المحرر
                </div>
                {aiBriefLoading ? (
                  <div className="space-y-2" data-testid="brief-ai-loading">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-9/12" />
                  </div>
                ) : (
                  <p
                    className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line"
                    data-testid="text-brief-ai"
                  >
                    {aiBrief}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Pin className="h-4 w-4 text-muted-foreground" />
              <h3
                className="text-base sm:text-lg font-bold"
                data-testid="text-brief-highlights-title"
              >
                أبرز ما يقرأه الناس الآن
              </h3>
            </div>
            {highlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أبرز قصص حتى الآن.
              </p>
            ) : (
              <ol className="space-y-3">
                {highlights.map((article, idx) => (
                  <li key={article.id}>
                    <Link href={getArticleHref(article)}>
                      <div
                        className="group flex items-start gap-4 rounded-md border bg-card p-4 hover-elevate cursor-pointer"
                        data-testid={`brief-highlight-${idx + 1}`}
                      >
                        <div
                          className="text-3xl sm:text-4xl font-black tabular-nums leading-none w-10 sm:w-12 shrink-0 text-center"
                          style={
                            accent
                              ? { color: accent }
                              : { color: "hsl(var(--primary))" }
                          }
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 group-hover:text-foreground">
                            {article.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {article.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(
                                  new Date(article.publishedAt),
                                  {
                                    addSuffix: true,
                                    locale: arSA,
                                  },
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {(article.views || 0).toLocaleString("en-US")}
                            </span>
                            {article.author && (
                              <span className="truncate max-w-[160px]">
                                {article.author.firstName}{" "}
                                {article.author.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FilterChipsBar — pill-shaped filters with toggle elevation ────────────
interface FilterChipsBarProps {
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  articleType: ArticleTypeFilter;
  setArticleType: (t: ArticleTypeFilter) => void;
  onReset: () => void;
  filteredCount: number;
  totalCount: number;
  layout: ViewLayout;
  setLayout: (l: ViewLayout) => void;
  accentColor?: string;
}

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "newest", label: "الأحدث" },
  { value: "views", label: "الأكثر مشاهدة" },
  { value: "engagement", label: "الأكثر تفاعلاً" },
];
const TIME_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "today", label: "اليوم" },
  { value: "3days", label: "آخر 3 أيام" },
  { value: "7days", label: "آخر 7 أيام" },
  { value: "30days", label: "آخر 30 يوم" },
  { value: "all", label: "الكل" },
];
const TYPE_OPTIONS: Array<{ value: ArticleTypeFilter; label: string }> = [
  { value: "all", label: "كل الأنواع" },
  { value: "breaking", label: "عاجل" },
  { value: "new", label: "جديد" },
  { value: "opinion", label: "رأي" },
  { value: "analysis", label: "تحليل" },
];

function FilterChip<T extends string>({
  active,
  label,
  onClick,
  testId,
  accentColor,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  testId: string;
  accentColor?: string;
}) {
  const accentStyle: CSSProperties | undefined =
    active && accentColor
      ? {
          background: withAlpha(accentColor, 10),
          borderColor: accentColor,
          color: accentColor,
        }
      : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`toggle-elevate ${active ? "toggle-elevated" : ""} inline-flex items-center min-h-9 px-4 rounded-md text-sm font-medium border bg-background text-foreground whitespace-nowrap`}
      style={accentStyle}
      data-testid={testId}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function FilterChipsBar({
  sortMode,
  setSortMode,
  timeRange,
  setTimeRange,
  articleType,
  setArticleType,
  onReset,
  filteredCount,
  totalCount,
  layout,
  setLayout,
  accentColor,
}: FilterChipsBarProps) {
  const filtersActive =
    sortMode !== "newest" ||
    timeRange !== "30days" ||
    articleType !== "all";

  return (
    <section
      className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur-md"
      data-testid="filter-chips-bar"
    >
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              ترتيب
            </span>
            {SORT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={sortMode === opt.value}
                label={opt.label}
                onClick={() => setSortMode(opt.value)}
                testId={`chip-sort-${opt.value}`}
                accentColor={accentColor}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle layout={layout} setLayout={setLayout} />
            {filtersActive && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover-elevate active-elevate-2"
                data-testid="button-reset-filters"
              >
                <X className="h-3.5 w-3.5" />
                إعادة تعيين
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            الفترة
          </span>
          {TIME_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={timeRange === opt.value}
              label={opt.label}
              onClick={() => setTimeRange(opt.value)}
              testId={`chip-time-${opt.value}`}
              accentColor={accentColor}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            النوع
          </span>
          {TYPE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={articleType === opt.value}
              label={opt.label}
              onClick={() => setArticleType(opt.value)}
              testId={`chip-type-${opt.value}`}
              accentColor={accentColor}
            />
          ))}
          <span
            className="text-xs text-muted-foreground mr-auto pr-2"
            data-testid="chips-count-summary"
          >
            عرض {filteredCount.toLocaleString("en-US")} من{" "}
            {totalCount.toLocaleString("en-US")} مقالة
          </span>
        </div>
      </div>
    </section>
  );
}

function ViewToggle({
  layout,
  setLayout,
}: {
  layout: ViewLayout;
  setLayout: (l: ViewLayout) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border bg-background p-1"
      data-testid="view-toggle"
    >
      <button
        type="button"
        onClick={() => setLayout("bento")}
        aria-pressed={layout === "bento"}
        className={`toggle-elevate ${layout === "bento" ? "toggle-elevated" : ""} inline-flex items-center gap-1.5 min-h-8 px-3 rounded-sm text-xs font-medium`}
        data-testid="button-view-bento"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        موزاييك
      </button>
      <button
        type="button"
        onClick={() => setLayout("timeline")}
        aria-pressed={layout === "timeline"}
        className={`toggle-elevate ${layout === "timeline" ? "toggle-elevated" : ""} inline-flex items-center gap-1.5 min-h-8 px-3 rounded-sm text-xs font-medium`}
        data-testid="button-view-timeline"
      >
        <ListIcon className="h-3.5 w-3.5" />
        خط زمني
      </button>
    </div>
  );
}

// ── BentoMosaic ───────────────────────────────────────────────────────────
function BentoMosaic({ articles }: { articles: ArticleWithDetails[] }) {
  // Editorial bento with a true hero tile. The first article becomes a large
  // row-spanning hero (col-span-4 row-span-2). Remaining items follow an
  // asymmetric rhythm that repeats every 5 items: [2|2|2] · [3|3].
  const tailPatternClasses = [
    "lg:col-span-2",
    "lg:col-span-2",
    "lg:col-span-2",
    "lg:col-span-3",
    "lg:col-span-3",
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 lg:auto-rows-fr gap-4 lg:gap-5"
      data-testid="bento-mosaic"
    >
      {articles.map((article, idx) => {
        let finalCls: string;
        if (idx === 0) {
          // Hero tile: large emphasis with row + column span.
          finalCls = "lg:col-span-4 lg:row-span-2";
        } else {
          finalCls = tailPatternClasses[(idx - 1) % tailPatternClasses.length];
        }
        return (
          <div
            key={article.id}
            className={`col-span-1 sm:col-span-1 ${finalCls} h-full`}
            data-testid={`bento-cell-${article.id}`}
          >
            <NewsArticleCard
              article={article}
              viewMode="grid"
              hideCategory={true}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── TimelineView ──────────────────────────────────────────────────────────
function TimelineView({ articles }: { articles: ArticleWithDetails[] }) {
  const groups = useMemo(() => {
    const buckets: Record<
      "today" | "yesterday" | "week" | "older",
      ArticleWithDetails[]
    > = { today: [], yesterday: [], week: [], older: [] };
    for (const a of articles) {
      const d = a.publishedAt ? new Date(a.publishedAt) : null;
      if (!d) {
        buckets.older.push(a);
      } else if (isToday(d)) {
        buckets.today.push(a);
      } else if (isYesterday(d)) {
        buckets.yesterday.push(a);
      } else if (isThisWeek(d, { locale: arSA })) {
        buckets.week.push(a);
      } else {
        buckets.older.push(a);
      }
    }
    return buckets;
  }, [articles]);

  const sections: Array<{
    key: keyof typeof groups;
    label: string;
    items: ArticleWithDetails[];
  }> = [
    { key: "today", label: "اليوم", items: groups.today },
    { key: "yesterday", label: "الأمس", items: groups.yesterday },
    { key: "week", label: "هذا الأسبوع", items: groups.week },
    { key: "older", label: "أقدم", items: groups.older },
  ];

  return (
    <div
      className="max-w-3xl mx-auto space-y-10"
      data-testid="timeline-view"
    >
      {sections
        .filter((s) => s.items.length > 0)
        .map((section) => (
          <div key={section.key} data-testid={`timeline-group-${section.key}`}>
            <div
              className="sticky top-48 z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-3 mb-5 bg-background/95 backdrop-blur-md border-b"
              data-testid={`timeline-header-${section.key}`}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-foreground">
                  {section.label}
                </h3>
                <Badge
                  variant="secondary"
                  data-testid={`timeline-count-${section.key}`}
                >
                  {section.items.length.toLocaleString("en-US")}
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
            <div className="space-y-4 lg:space-y-5">
              {section.items.map((article) => (
                <div key={article.id} className="relative">
                  <span
                    className="hidden lg:block absolute right-0 top-4 bottom-0 w-px bg-border"
                    aria-hidden="true"
                  />
                  <NewsArticleCard
                    article={article}
                    viewMode="grid"
                    hideCategory={true}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ── PulseSidebar ──────────────────────────────────────────────────────────
interface PulseSidebarProps {
  articles: ArticleWithDetails[];
  recentArticlesCount: number;
  totalViews: number;
  mostActiveReporter: { author: User; count: number } | null;
  reporterViews: number;
  accentColor?: string | null;
  direction?: "vertical" | "horizontal";
}

function PulseSidebar({
  articles,
  recentArticlesCount,
  totalViews,
  mostActiveReporter,
  reporterViews,
  accentColor,
  direction = "vertical",
}: PulseSidebarProps) {
  const accent = accentColor || undefined;

  const mostRead = useMemo(
    () =>
      [...articles]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5),
    [articles],
  );

  const containerClass =
    direction === "horizontal"
      ? "flex flex-row gap-4 overflow-x-auto pb-3 -mx-3 px-3 [&>*]:min-w-[280px] [&>*]:shrink-0"
      : "lg:sticky lg:top-52 lg:self-start space-y-5";

  return (
    <aside
      className={containerClass}
      data-testid={
        direction === "horizontal" ? "pulse-sidebar-mobile" : "pulse-sidebar"
      }
    >
      {/* 24h activity */}
      <Card data-testid="pulse-now-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Radio
                className="h-4 w-4"
                style={accent ? { color: accent } : undefined}
              />
              نبض الآن
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              آخر 24 ساعة
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div
                className="text-3xl font-extrabold tabular-nums"
                style={accent ? { color: accent } : undefined}
                data-testid="pulse-recent-count"
              >
                {recentArticlesCount.toLocaleString("en-US")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                مقالات جديدة
              </div>
            </div>
            <div>
              <div
                className="text-3xl font-extrabold tabular-nums"
                data-testid="pulse-total-views"
              >
                {totalViews.toLocaleString("en-US")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                مشاهدات إجمالية
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most active reporter */}
      {mostActiveReporter && (
        <Card data-testid="pulse-reporter-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">المراسل الأكثر نشاطاً</h3>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={
                    mostActiveReporter.author.profileImageUrl || undefined
                  }
                />
                <AvatarFallback>
                  {mostActiveReporter.author.firstName?.[0] || "م"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="font-semibold truncate"
                    data-testid="pulse-reporter-name"
                  >
                    {mostActiveReporter.author.firstName}{" "}
                    {mostActiveReporter.author.lastName}
                  </span>
                  {mostActiveReporter.author.verificationBadge !== "none" && (
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {mostActiveReporter.count.toLocaleString("en-US")} مقالة ·{" "}
                  {reporterViews.toLocaleString("en-US")} مشاهدة
                </div>
              </div>
            </div>
            <Link href={`/reporter/${mostActiveReporter.author.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                data-testid="button-pulse-reporter-profile"
              >
                الملف الشخصي
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Most read top 5 */}
      {mostRead.length > 0 && (
        <Card data-testid="pulse-top-read-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">الأكثر قراءة</h3>
            </div>
            <ol className="space-y-3">
              {mostRead.map((article, idx) => (
                <li key={article.id}>
                  <Link href={getArticleHref(article)}>
                    <div
                      className="flex items-start gap-3 group hover-elevate -mx-2 px-2 py-1.5 rounded-sm cursor-pointer"
                      data-testid={`pulse-top-read-${idx + 1}`}
                    >
                      <span
                        className="text-2xl font-extrabold tabular-nums leading-none w-6 shrink-0 text-center"
                        style={
                          accent
                            ? { color: accent }
                            : { color: "hsl(var(--primary))" }
                        }
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {article.title}
                        </p>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                          <Eye className="h-3 w-3" />
                          {(article.views || 0).toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────
type EmptyStateMode =
  | "no-content"
  | "no-filter-match"
  | "filter-matches-cover-only"
  | "cover-only";

interface EmptyStateProps {
  mode: EmptyStateMode;
  onResetFilters: () => void;
  neighbors: Category[];
  category: Category;
}

function EmptyState({
  mode,
  onResetFilters,
  neighbors,
  category,
}: EmptyStateProps) {
  const heading =
    mode === "no-filter-match"
      ? "لا توجد مقالات تطابق هذه الفلاتر"
      : mode === "filter-matches-cover-only"
        ? "القصة الرئيسية أعلاه هي المطابق الوحيد"
        : mode === "cover-only"
          ? "اكتفينا بالقصة الرئيسية أعلاه"
          : "لا توجد أخبار حاليًا في هذا التصنيف";
  const body =
    mode === "no-filter-match"
      ? "جرّب توسيع نطاق الفلاتر أو إعادة تعيينها لرؤية المزيد من المحتوى."
      : mode === "filter-matches-cover-only"
        ? "وسّع الفلاتر لاستكشاف المزيد من القصص في هذا التصنيف."
        : mode === "cover-only"
          ? "هذه هي القصة الوحيدة المنشورة في هذا التصنيف حتى الآن. تابعنا لمزيد من المحتوى قريباً."
          : "نعمل على نشر محتوى جديد في هذا التصنيف. تابعنا قريباً.";

  return (
    <div className="space-y-6" data-testid="empty-state" data-empty-mode={mode}>
      <Card className="overflow-hidden">
        <CardContent className="p-8 sm:p-12 text-center">
          {(() => {
            const accent = getCategoryAccent(category);
            return (
              <div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md"
                style={{
                  background: accent ? withAlpha(accent, 10) : "hsl(var(--muted))",
                }}
              >
                <FolderX
                  className="h-10 w-10"
                  style={
                    accent
                      ? { color: accent }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                />
              </div>
            );
          })()}
          <h3 className="text-xl sm:text-2xl font-bold mb-2">{heading}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{body}</p>
          {mode === "no-filter-match" && (
            <Button
              onClick={onResetFilters}
              size="lg"
              className="gap-2"
              data-testid="button-empty-reset"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة تعيين الفلاتر
            </Button>
          )}
        </CardContent>
      </Card>

      {neighbors.length > 0 && (
        <div data-testid="empty-suggestions">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-bold">جرّب تصنيفات قريبة</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {neighbors.map((cat) => (
              <Link key={cat.id} href={`/category/${cat.slug}`}>
                <Card
                  className="h-full hover-elevate active-elevate-2 cursor-pointer"
                  data-testid={`suggestion-${cat.slug}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl"
                      style={{
                        background: cat.color
                          ? withAlpha(cat.color, 10)
                          : "hsl(var(--muted))",
                        color: cat.color || "hsl(var(--foreground))",
                      }}
                    >
                      {cat.icon ? (
                        <CategoryIcon icon={cat.icon} className="h-5 w-5" />
                      ) : (
                        <Hash className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-sm">
                        {cat.nameAr}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {cat.description || "اكتشف المزيد"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton matching the new layout ──────────────────────────────────────
function CategoryPageSkeleton({
  user,
}: {
  user: { id: string; name?: string; email?: string } | undefined;
}) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header user={user} />
      <Skeleton className="h-[460px] sm:h-[520px] lg:h-[600px] w-full rounded-none" />
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-5 flex gap-4 items-center">
          <Skeleton className="h-14 w-14 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="h-40 lg:col-span-3" />
        <div className="lg:col-span-9 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className={`h-72 rounded-md ${
                  i === 1 ? "lg:col-span-4" : i === 2 ? "lg:col-span-2" : "lg:col-span-2"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const reducedMotion = useReducedMotion() ?? false;

  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [articleType, setArticleType] = useState<ArticleTypeFilter>("all");
  const [displayCount, setDisplayCount] = useState(12);
  const [layout, setLayout] = useState<ViewLayout>("bento");

  // Persisted layout — keyed per-slug so each category remembers its own
  // preferred view (Bento vs Timeline).
  useEffect(() => {
    if (!slug) return;
    try {
      const stored = window.localStorage.getItem(getViewLayoutStorageKey(slug));
      if (stored === "bento" || stored === "timeline") {
        setLayout(stored);
      }
    } catch {
      /* ignore */
    }
  }, [slug]);
  useEffect(() => {
    if (!slug) return;
    try {
      window.localStorage.setItem(getViewLayoutStorageKey(slug), layout);
    } catch {
      /* ignore */
    }
  }, [layout, slug]);

  const { data: user } = useQuery<{
    id: string;
    name?: string;
    email?: string;
  }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: ["/api/categories/slug", slug],
  });

  const { data: allArticlesRaw, isLoading: articlesLoading } = useQuery<
    ArticleWithDetails[]
  >({
    queryKey: ["/api/categories", slug, "articles"],
    enabled: !!category,
  });
  const allArticles = Array.isArray(allArticlesRaw) ? allArticlesRaw : [];

  const { data: allCategoriesRaw } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const allCategories = Array.isArray(allCategoriesRaw) ? allCategoriesRaw : [];

  // Sorted by newest — used for pulse / "latest" calculations.
  const articlesByNewest = useMemo(
    () =>
      [...allArticles].sort(
        (a, b) =>
          new Date(b.publishedAt || 0).getTime() -
          new Date(a.publishedAt || 0).getTime(),
      ),
    [allArticles],
  );

  // Cover story = first article after applying the active sort mode (no
  // time/type filter, the cover is always present at the top of the page).
  const coverArticle = useMemo(() => {
    if (allArticles.length === 0) return undefined;
    const list = [...allArticles];
    switch (sortMode) {
      case "views":
        list.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "engagement":
        list.sort(
          (a, b) =>
            (b.reactionsCount || 0) +
            (b.commentsCount || 0) -
            ((a.reactionsCount || 0) + (a.commentsCount || 0)),
        );
        break;
      case "newest":
      default:
        list.sort(
          (a, b) =>
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime(),
        );
    }
    return list[0];
  }, [allArticles, sortMode]);

  // Statistics
  const statistics = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentArticles = allArticles.filter(
      (a) => a.publishedAt && new Date(a.publishedAt).getTime() >= oneDayAgo,
    );
    const totalViews = allArticles.reduce(
      (sum, a) => sum + (a.views || 0),
      0,
    );
    return {
      totalArticles: allArticles.length,
      recentArticlesCount: recentArticles.length,
      totalViews,
      latestArticle: articlesByNewest[0] ?? null,
    };
  }, [allArticles, articlesByNewest]);

  // Most active reporter
  const mostActiveReporter = useMemo(():
    | { author: User; count: number }
    | null => {
    if (allArticles.length === 0) return null;
    const counts = new Map<string, { author: User; count: number }>();
    for (const article of allArticles) {
      const author = article.author;
      if (!author) continue;
      const cur = counts.get(author.id);
      if (cur) cur.count += 1;
      else counts.set(author.id, { author, count: 1 });
    }
    const list = Array.from(counts.values());
    if (list.length === 0) return null;
    return list.reduce((max, cur) => (cur.count > max.count ? cur : max), list[0]);
  }, [allArticles]);

  const reporterViews = useMemo(() => {
    if (!mostActiveReporter) return 0;
    return allArticles
      .filter((a) => a.author?.id === mostActiveReporter.author.id)
      .reduce((sum, a) => sum + (a.views || 0), 0);
  }, [allArticles, mostActiveReporter]);

  // Predicate that mirrors the active time/type filters. Used both for the
  // main feed and for checking whether the cover article would match — so the
  // empty state can tell the user "the only match is the cover above".
  const matchesActiveFilters = useCallback(
    (a: ArticleWithDetails) => {
      if (timeRange !== "all") {
        const now = Date.now();
        let cutoff: number;
        switch (timeRange) {
          case "today":
            cutoff = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
            break;
          case "3days":
            cutoff = now - 3 * 24 * 60 * 60 * 1000;
            break;
          case "7days":
            cutoff = now - 7 * 24 * 60 * 60 * 1000;
            break;
          case "30days":
            cutoff = now - 30 * 24 * 60 * 60 * 1000;
            break;
          default:
            cutoff = 0;
        }
        if (!a.publishedAt || new Date(a.publishedAt).getTime() < cutoff) {
          return false;
        }
      }

      if (articleType !== "all") {
        switch (articleType) {
          case "breaking":
            if (a.newsType !== "breaking") return false;
            break;
          case "new":
            if (!isNewArticle(a.publishedAt)) return false;
            break;
          case "opinion":
            if (a.newsType !== "opinion") return false;
            break;
          case "analysis":
            if (a.newsType !== "analysis") return false;
            break;
          default:
            break;
        }
      }

      return true;
    },
    [timeRange, articleType],
  );

  // Filtered + sorted (excludes the cover article so it isn't shown twice)
  const filteredArticles = useMemo(() => {
    let filtered = allArticles
      .filter((a) => !coverArticle || a.id !== coverArticle.id)
      .filter(matchesActiveFilters);

    switch (sortMode) {
      case "views":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "engagement":
        filtered.sort(
          (a, b) =>
            (b.reactionsCount || 0) +
            (b.commentsCount || 0) -
            ((a.reactionsCount || 0) + (a.commentsCount || 0)),
        );
        break;
      case "newest":
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime(),
        );
    }
    return filtered;
  }, [allArticles, coverArticle, matchesActiveFilters, sortMode]);

  const displayedArticles = useMemo(
    () => filteredArticles.slice(0, displayCount),
    [filteredArticles, displayCount],
  );

  useEffect(() => {
    setDisplayCount(12);
  }, [sortMode, timeRange, articleType]);

  const handleResetFilters = useCallback(() => {
    setSortMode("newest");
    setTimeRange("30days");
    setArticleType("all");
    setDisplayCount(12);
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + 12);
  }, []);

  // SEO — title + meta description
  useEffect(() => {
    if (!category?.nameAr) return;
    const previousTitle = document.title;
    document.title = `${category.nameAr} · أخبار وتحليلات | بروبرتي ME`;

    const baseDesc =
      category.description ||
      `أحدث الأخبار والتقارير والتحليلات في تصنيف ${category.nameAr} على بروبرتي ME`;
    const count = allArticles.length;
    const desc =
      count > 0
        ? `${baseDesc} — ${count.toLocaleString("en-US")} مقالة منشورة.`
        : `${baseDesc}.`;
    const existing = document.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    const previousDesc = existing?.getAttribute("content") || "";
    let createdTag: HTMLMetaElement | null = null;
    if (existing) {
      existing.setAttribute("content", desc);
    } else {
      createdTag = document.createElement("meta");
      createdTag.name = "description";
      createdTag.content = desc;
      document.head.appendChild(createdTag);
    }

    return () => {
      document.title = previousTitle;
      if (createdTag && createdTag.parentNode) {
        createdTag.parentNode.removeChild(createdTag);
      } else if (existing) {
        existing.setAttribute("content", previousDesc);
      }
    };
  }, [category?.nameAr, category?.description, allArticles.length]);

  if (categoryLoading) {
    return <CategoryPageSkeleton user={user} />;
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header user={user} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">التصنيف غير موجود</h1>
          <p className="text-muted-foreground">
            لم نتمكن من العثور على هذا التصنيف
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const filtersActive =
    sortMode !== "newest" ||
    timeRange !== "30days" ||
    articleType !== "all";

  const neighborCategories = allCategories
    .filter(
      (c) =>
        c.slug !== category.slug &&
        c.status === "active" &&
        !c.isIfoxCategory,
    )
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header user={user} />

      <CinematicCover
        category={category}
        coverArticle={coverArticle}
        reducedMotion={reducedMotion}
      />

      <CategoryIdentityStrip
        category={category}
        totalArticles={statistics.totalArticles}
      />

      {!articlesLoading && allArticles.length > 0 && (
        <EditorBrief
          articles={allArticles}
          accentColor={getCategoryAccent(category)}
          latestArticle={statistics.latestArticle}
          categorySlug={category.slug}
        />
      )}

      {!articlesLoading && allArticles.length > 0 && (
        <div className="lg:hidden container mx-auto px-3 sm:px-6 pb-2">
          <PulseSidebar
            direction="horizontal"
            articles={allArticles}
            recentArticlesCount={statistics.recentArticlesCount}
            totalViews={statistics.totalViews}
            mostActiveReporter={mostActiveReporter}
            reporterViews={reporterViews}
            accentColor={getCategoryAccent(category)}
          />
        </div>
      )}

      <FilterChipsBar
        sortMode={sortMode}
        setSortMode={setSortMode}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        articleType={articleType}
        setArticleType={setArticleType}
        onReset={handleResetFilters}
        filteredCount={filteredArticles.length}
        totalCount={Math.max(0, allArticles.length - (coverArticle ? 1 : 0))}
        layout={layout}
        setLayout={setLayout}
        accentColor={getCategoryAccent(category)}
      />

      <div
        id="category-articles"
        className="container mx-auto px-3 sm:px-6 lg:px-8 py-8 lg:py-10 scroll-mt-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-9 min-w-0">
            {articlesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton
                    key={i}
                    className={`h-72 rounded-md ${
                      i === 1
                        ? "lg:col-span-4"
                        : i === 4 || i === 5
                          ? "lg:col-span-3"
                          : "lg:col-span-2"
                    }`}
                  />
                ))}
              </div>
            ) : displayedArticles.length === 0 ? (
              <EmptyState
                mode={
                  filtersActive
                    ? coverArticle && matchesActiveFilters(coverArticle)
                      ? "filter-matches-cover-only"
                      : "no-filter-match"
                    : coverArticle && allArticles.length > 0
                      ? "cover-only"
                      : "no-content"
                }
                onResetFilters={handleResetFilters}
                neighbors={neighborCategories}
                category={category}
              />
            ) : (
              <>
                {layout === "bento" ? (
                  <BentoMosaic articles={displayedArticles} />
                ) : (
                  <TimelineView articles={displayedArticles} />
                )}

                {displayedArticles.length < filteredArticles.length && (
                  <div
                    className="mt-10 flex flex-col items-center gap-3"
                    data-testid="load-more-section"
                  >
                    <p className="text-sm text-muted-foreground">
                      عرض {displayedArticles.length.toLocaleString("en-US")} من{" "}
                      {filteredArticles.length.toLocaleString("en-US")} مقالة
                    </p>
                    <Button
                      onClick={handleLoadMore}
                      size="lg"
                      className="gap-2"
                      data-testid="button-load-more"
                      disabled={articlesLoading}
                      style={(() => {
                        const accent = getCategoryAccent(category);
                        return accent
                          ? {
                              background: accent,
                              borderColor: accent,
                              color: "white",
                            }
                          : undefined;
                      })()}
                    >
                      {articlesLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري التحميل...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          تحميل المزيد (
                          {Math.min(
                            12,
                            filteredArticles.length - displayedArticles.length,
                          ).toLocaleString("en-US")}
                          )
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="hidden lg:block lg:col-span-3">
            {articlesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-48" />
                <Skeleton className="h-64" />
              </div>
            ) : (
              <PulseSidebar
                articles={allArticles}
                recentArticlesCount={statistics.recentArticlesCount}
                totalViews={statistics.totalViews}
                mostActiveReporter={mostActiveReporter}
                reporterViews={reporterViews}
                accentColor={getCategoryAccent(category)}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
