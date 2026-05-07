import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { Button } from "@/components/ui/button";
import { LivePulseBar } from "@/components/news/LivePulseBar";
import { LeadStoryCard } from "@/components/news/LeadStoryCard";
import { SecondaryStoryCard } from "@/components/news/SecondaryStoryCard";
import { CategoryStreamRow } from "@/components/news/CategoryStreamRow";
import { AIDailyDigest } from "@/components/news/AIDailyDigest";
import {
  NewsPulseFilters,
  type NewsTimeRange,
  type NewsViewMode,
} from "@/components/news/NewsPulseFilters";
import { NewsTimelineView } from "@/components/news/NewsTimelineView";
import {
  LeadStorySkeleton,
  SecondaryRowSkeleton,
  StreamRowSkeleton,
} from "@/components/news/NewsSkeletons";
import { Newspaper, AlertCircle } from "lucide-react";
import type { ArticleWithDetails, Category } from "@shared/schema";
import { filterAICategories } from "@/utils/filterAICategories";

const VIEW_MODE_KEY = "news:view-mode";

export default function NewsPage() {
  const { data: user } = useQuery<{
    id: string;
    name?: string;
    email?: string;
    role?: string;
  }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<NewsTimeRange>("all");
  const [viewMode, setViewMode] = useState<NewsViewMode>(() => {
    if (typeof window === "undefined") return "rooms";
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    return stored === "timeline" ? "timeline" : "rooms";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/news/analytics"],
  });

  const { data: allCategoriesRaw } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const categories = useMemo(
    () => filterAICategories(Array.isArray(allCategoriesRaw) ? allCategoriesRaw : []),
    [allCategoriesRaw],
  );

  const {
    data: articlesRaw,
    isLoading: articlesLoading,
    isError: articlesError,
    refetch: refetchArticles,
  } = useQuery<ArticleWithDetails[]>({
    queryKey: [
      "/api/articles",
      {
        search: debouncedSearch || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      },
    ],
  });
  const articles = useMemo(
    () => (Array.isArray(articlesRaw) ? articlesRaw : []),
    [articlesRaw],
  );

  const newsArticles = useMemo(
    () => articles.filter((a) => a.articleType !== "opinion"),
    [articles],
  );

  const timeFilteredArticles = useMemo(() => {
    if (timeRange === "all") return newsArticles;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoff =
      timeRange === "today"
        ? now - dayMs
        : timeRange === "week"
          ? now - 7 * dayMs
          : now - 30 * dayMs;
    return newsArticles.filter((a) => {
      if (!a.publishedAt) return false;
      return new Date(a.publishedAt).getTime() >= cutoff;
    });
  }, [newsArticles, timeRange]);

  const sortedByTime = useMemo(() => {
    return [...timeFilteredArticles].sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });
  }, [timeFilteredArticles]);

  const lead = sortedByTime[0];
  const secondary = sortedByTime.slice(1, 4);

  const articlesByCategory = useMemo(() => {
    const map = new Map<string, ArticleWithDetails[]>();
    for (const a of sortedByTime.slice(4)) {
      const id = a.category?.id;
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(a);
    }
    return map;
  }, [sortedByTime]);

  const orderedStreams = useMemo(() => {
    const result: Array<{ category: Category; items: ArticleWithDetails[] }> =
      [];
    for (const cat of categories) {
      const items = articlesByCategory.get(cat.id);
      if (items && items.length > 0) {
        result.push({ category: cat, items: items.slice(0, 12) });
      }
    }
    return result;
  }, [categories, articlesByCategory]);

  const hasActiveFilters =
    !!debouncedSearch ||
    timeRange !== "all" ||
    selectedCategory !== "all" ||
    !!searchQuery;

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setTimeRange("all");
  };

  const isInitialLoading = articlesLoading && !articlesRaw;

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Header user={user} />

      <main
        id="main-content"
        className="container mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"
              data-testid="heading-news"
            >
              <Newspaper className="h-6 w-6 text-primary" aria-hidden />
              غرفة الأخبار
            </h1>
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-news-subtitle"
            >
              قصص بروبرتي ME تنبض بالحياة — من القصة الكبرى إلى تيارات التصنيفات.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <LivePulseBar
            articles={newsArticles}
            isLoading={isInitialLoading}
          />
        </div>

        <NewsPulseFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0 space-y-8">
            {articlesError ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
                data-testid="block-news-error"
              >
                <AlertCircle
                  className="h-10 w-10 text-destructive"
                  aria-hidden
                />
                <p className="text-sm font-semibold">
                  تعذّر تحميل الأخبار. تحقّق من اتصالك ثم حاول مجدداً.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchArticles()}
                  data-testid="button-news-retry"
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : isInitialLoading ? (
              <>
                <LeadStorySkeleton />
                <SecondaryRowSkeleton />
                <StreamRowSkeleton />
                <StreamRowSkeleton />
              </>
            ) : sortedByTime.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-md border bg-card p-12 text-center"
                data-testid="block-news-empty"
              >
                <Newspaper
                  className="h-10 w-10 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-sm font-semibold">
                  لا توجد أخبار تطابق الفلاتر الحالية.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-news-empty-clear"
                  >
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            ) : viewMode === "timeline" ? (
              <>
                <div className="lg:hidden" data-testid="block-mobile-digest-timeline">
                  <AIDailyDigest
                    analytics={analytics}
                    isLoading={analyticsLoading}
                  />
                </div>
                <NewsTimelineView articles={sortedByTime} />
              </>
            ) : (
              <>
                {lead && <LeadStoryCard article={lead} />}

                {secondary.length > 0 && (
                  <section
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    data-testid="section-secondary-trio"
                    aria-label="قصص ثانوية"
                  >
                    {secondary.map((a) => (
                      <SecondaryStoryCard key={a.id} article={a} />
                    ))}
                  </section>
                )}

                <div className="lg:hidden" data-testid="block-mobile-digest">
                  <AIDailyDigest
                    analytics={analytics}
                    isLoading={analyticsLoading}
                  />
                </div>

                {orderedStreams.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-no-streams"
                  >
                    لا توجد تيارات إضافية ضمن المدى الحالي.
                  </p>
                ) : (
                  orderedStreams.map(({ category, items }) => (
                    <CategoryStreamRow
                      key={category.id}
                      category={category}
                      articles={items}
                    />
                  ))
                )}
              </>
            )}
          </div>

          <aside
            className="hidden space-y-4 lg:block lg:sticky lg:top-40 lg:h-fit"
            aria-label="موجز الذكاء الاصطناعي"
            data-testid="aside-ai-digest"
          >
            <AIDailyDigest
              analytics={analytics}
              isLoading={analyticsLoading}
            />
          </aside>
        </div>
      </main>

      <ScrollToTopButton />
      <Footer />
    </div>
  );
}
