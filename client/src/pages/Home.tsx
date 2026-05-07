import { useState, useEffect, useMemo, useRef, ComponentType } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { LazySection } from "@/components/LazySection";
import type { ArticleWithDetails, CategoryWithStats } from "@shared/schema";
import type { User } from "@/hooks/useAuth";

// === CRITICAL PATH (Eager) - Above the fold content ===
import { Header } from "@/components/Header";
import { NavigationBar } from "@/components/NavigationBar";
import { CategoryPills } from "@/components/CategoryPills";
import { Footer } from "@/components/Footer";
import { HeroCarousel } from "@/components/HeroCarousel";
import { lazy, Suspense } from "react";
const MarketTicker = lazy(() =>
  import("@/components/MarketTicker").then((m) => ({ default: m.MarketTicker })),
);
const SHOW_MARKET_TICKER =
  (import.meta.env.VITE_SHOW_MARKET_TICKER ?? "true").toString().toLowerCase() !== "false";

// === LAZY LOADED - Below the fold content (code-split chunks) ===
// NOTE: We define stable loader functions (not React.lazy components) at
// module scope so each LazySection can wrap them with `softRetryImport` and
// re-create its internal `lazy()` instance on user-initiated retry. This
// keeps a chunk-load failure scoped to a single section instead of
// triggering a full-page cache-bust reload via the global ErrorBoundary.
type AnyLoader = () => Promise<ComponentType<any>>;

const SECTION_LOADERS = {
  realEstatePulse: () =>
    import("@/components/RealEstatePulseBlock").then((m) => m.RealEstatePulseBlock),
  smartSummary: () =>
    import("@/components/SmartSummaryBlock").then((m) => m.SmartSummaryBlock),
  personalizedFeed: () =>
    import("@/components/PersonalizedFeed").then((m) => m.PersonalizedFeed),
  continueReading: () =>
    import("@/components/ContinueReadingWidget").then((m) => m.ContinueReadingWidget),
  deepDive: () =>
    import("@/components/DeepDiveSection").then((m) => m.DeepDiveSection),
  opinion: () =>
    import("@/components/OpinionArticlesBlock").then((m) => m.OpinionArticlesBlock),
  trendingWeek: () =>
    import("@/components/TrendingWeekSection").then((m) => m.TrendingWeekSection),
  quadCategories: () =>
    import("@/components/QuadCategoriesBlock").then((m) => m.QuadCategoriesBlock),
  newsMap: () => import("@/components/NewsMap").then((m) => m.default),
  liteModeHint: () =>
    import("@/components/LiteModeHint").then((m) => m.LiteModeHint),
} satisfies Record<string, AnyLoader>;

function ArticleCardSkeleton() {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <Skeleton className="w-full aspect-[16/9]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

interface HomepageData {
  hero: ArticleWithDetails[];
  forYou: ArticleWithDetails[];
  breaking: ArticleWithDetails[];
  editorPicks: ArticleWithDetails[];
  deepDive: ArticleWithDetails[];
}

export default function Home() {
  // Track when initial load is complete to defer non-critical queries
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [, navigate] = useLocation();

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: categoriesWithStats } = useQuery<CategoryWithStats[]>({
    queryKey: ["/api/categories", "withStats"],
    queryFn: async () => {
      const res = await fetch("/api/categories?withStats=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const visibleCategories = useMemo(() => {
    const list = Array.isArray(categoriesWithStats) ? categoriesWithStats : [];
    return list
      .filter(
        (cat) =>
          (cat.status === "visible" || cat.status === "active") &&
          cat.type === "core",
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categoriesWithStats]);

  // Track whether the user is actively scrolling. If a push update arrives
  // mid-gesture we defer the refetch until scrolling stops so the user
  // never sees a skeleton flash or layout shift under their finger. The
  // flag clears 800ms after the last scroll event.
  const isScrollingRef = useRef(false);

  const { data: homepage, isLoading, error, refetch: refetchHomepage, dataUpdatedAt: homepageFetchedAt } = useQuery<HomepageData>({
    queryKey: ["/api/homepage-lite"],
    staleTime: 60 * 1000, // Data becomes stale after 1 minute (so focus refetch works)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // No refetchInterval: idle tabs make zero requests until the server
    // pushes an invalidation event over `/api/cache-invalidation/stream`
    // (see the effect below) or the user refocuses the tab.
    refetchOnWindowFocus: true,
  });

  // Stable ref so the SSE effect can read the latest homepage fetch
  // timestamp without re-subscribing every time TanStack Query updates
  // it (re-subscribing would tear down and re-open the EventSource on
  // every refetch, which would lose the in-flight reconnect baseline).
  const homepageFetchedAtRef = useRef(homepageFetchedAt);
  useEffect(() => {
    homepageFetchedAtRef.current = homepageFetchedAt;
  }, [homepageFetchedAt]);

  // Set document.title for SEO (GA4 auto-tracks page views)
  useEffect(() => {
    document.title = 'بروبرتي ME';
  }, []);

  // Mark initial load complete when homepage data loads
  useEffect(() => {
    if (homepage && !initialLoadComplete) {
      // Small delay to ensure hero content renders first
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [homepage, initialLoadComplete]);

  const feedTitle = useMemo(() => user ? "أخبارك العقارية الذكية" : "جميع الأخبار", [user]);
  const feedSubtitle = useMemo(() => user ? "محتوى عقاري مُختار بذكاء بناءً على اهتماماتك" : undefined, [user]);

  useEffect(() => {
    if (!initialLoadComplete) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let active = true;
    let lastSeenUpdate = 0;
    let helloReceived = false;
    let pendingRefetch = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;

    const triggerRefetch = () => {
      if (!active) return;
      // Defer if the user is mid-gesture; we'll fire as soon as scrolling
      // settles. TanStack Query keeps the existing data on screen during
      // a silent refetch (only `isFetching` flips, not `isLoading`).
      if (isScrollingRef.current || document.hidden) {
        pendingRefetch = true;
        return;
      }
      pendingRefetch = false;
      refetchHomepage();
    };

    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrollingRef.current = false;
        if (pendingRefetch) triggerRefetch();
      }, 800);
    };

    const onVisible = () => {
      if (!document.hidden && pendingRefetch) triggerRefetch();
    };

    const handleEvent = (ev: MessageEvent) => {
      let nextUpdate = Date.now();
      try {
        const parsed = JSON.parse(ev.data);
        if (typeof parsed?.lastUpdate === 'number') nextUpdate = parsed.lastUpdate;
      } catch {}
      if (ev.type === 'hello') {
        // First hello after mount: reconcile against the homepage data
        // we already have on screen. If the server invalidated the cache
        // *after* our /api/homepage-lite response landed but *before*
        // this EventSource attached, the server's lastUpdate will be
        // newer than the timestamp TanStack Query recorded for our
        // current data — refetch in that narrow race window so the
        // first paint can never be silently stale.
        //
        // Subsequent hello events fire on EventSource auto-reconnect
        // (network blip, server restart, proxy idle-close). Treat them
        // the same way: refetch when the server has news we missed.
        const baseline = helloReceived
          ? lastSeenUpdate
          : homepageFetchedAtRef.current || nextUpdate;
        helloReceived = true;
        if (nextUpdate > baseline) {
          lastSeenUpdate = nextUpdate;
          triggerRefetch();
        } else {
          lastSeenUpdate = nextUpdate;
        }
        return;
      }
      if (lastSeenUpdate && nextUpdate <= lastSeenUpdate) return;
      lastSeenUpdate = nextUpdate;
      triggerRefetch();
    };

    try {
      source = new EventSource('/api/cache-invalidation/stream');
      source.addEventListener('hello', handleEvent as EventListener);
      source.addEventListener('invalidate', handleEvent as EventListener);
    } catch {
      // EventSource construction is essentially synchronous and rarely
      // throws, but if it does we just degrade to focus-based refetches.
      source = null;
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      active = false;
      if (scrollTimer) clearTimeout(scrollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('scroll', onScroll);
      if (source) {
        source.removeEventListener('hello', handleEvent as EventListener);
        source.removeEventListener('invalidate', handleEvent as EventListener);
        source.close();
      }
    };
  }, [initialLoadComplete, refetchHomepage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <Header user={user || undefined} />
        <NavigationBar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 flex-1">
          <Skeleton className="w-full h-[400px] md:h-[500px] rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <Header user={user || undefined} />
        <NavigationBar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="text-center py-20">
            <p className="text-destructive text-lg mb-4">
              حدث خطأ في تحميل الصفحة الرئيسية
            </p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : "خطأ غير معروف"}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!homepage) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <Header user={user || undefined} />
        <NavigationBar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              لا توجد بيانات متاحة حالياً
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Header user={user || undefined} />
      {SHOW_MARKET_TICKER && (
        <Suspense fallback={<div className="h-9 border-y border-border bg-muted/40" aria-hidden="true" />}>
          <MarketTicker lang="ar" />
        </Suspense>
      )}
      {visibleCategories.length > 0 && (
        <div className="hidden md:block">
        <CategoryPills
          categories={visibleCategories}
          onSelectCategory={(categoryId) => {
            if (!categoryId) {
              navigate("/categories");
              return;
            }
            const target = visibleCategories.find((c) => c.id === categoryId);
            if (target?.slug) navigate(`/category/${target.slug}`);
          }}
        />
        </div>
      )}

      <main className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {/* Hero Section */}
          {homepage.hero && homepage.hero.length > 0 && (
            <div className="mb-8">
              <HeroCarousel articles={homepage.hero} />
            </div>
          )}

        </div>

        {/* AI Section with soft gradient background - Lazy loaded */}
        <LazySection
          loader={SECTION_LOADERS.smartSummary}
          render={(SmartSummaryBlock) => (
            <div className="bg-ai-gradient-soft py-8">
              <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="scroll-fade-in">
                  <SmartSummaryBlock />
                </div>
              </div>
            </div>
          )}
        />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          {/* All News Section */}
          {homepage.forYou && homepage.forYou.length > 0 && (
            <div className="scroll-fade-in">
              <LazySection
                eager
                minHeight={400}
                loader={SECTION_LOADERS.personalizedFeed}
                render={(PersonalizedFeed) => (
                  <PersonalizedFeed
                    articles={homepage.forYou}
                    title={feedTitle}
                    subtitle={feedSubtitle}
                    showReason={false}
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* Quad Categories Block - 4 category columns - Below Smart News */}
        <LazySection
          loader={SECTION_LOADERS.quadCategories}
          render={(QuadCategoriesBlock) => <QuadCategoriesBlock enabled={true} />}
        />

        {/* Trending Week Section - Top viewed articles - Below All News */}
        <LazySection
          loader={SECTION_LOADERS.trendingWeek}
          render={(TrendingWeekSection) => <TrendingWeekSection />}
        />

        {/* Real Estate Pulse Block - نبض الشركات العقارية - Below Trending Week */}
        <LazySection
          loader={SECTION_LOADERS.realEstatePulse}
          render={(RealEstatePulseBlock) => (
            <div className="py-8">
              <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="scroll-fade-in">
                  <RealEstatePulseBlock enabled={true} />
                </div>
              </div>
            </div>
          )}
        />

        <LazySection
          loader={SECTION_LOADERS.opinion}
          render={(OpinionArticlesBlock) => (
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
              <div className="scroll-fade-in">
                <OpinionArticlesBlock enabled={true} />
              </div>
              <LazySection
                loader={SECTION_LOADERS.continueReading}
                render={(ContinueReadingWidget) => <ContinueReadingWidget />}
              />
            </div>
          )}
        />

        <LazySection
          loader={SECTION_LOADERS.deepDive}
          render={(DeepDiveSection) => (
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
              <div className="space-y-8">
                {homepage.deepDive && homepage.deepDive.length > 0 && (
                  <div className="scroll-fade-in">
                    <DeepDiveSection articles={homepage.deepDive} />
                  </div>
                )}
              </div>
            </div>
          )}
        />

        <LazySection
          loader={SECTION_LOADERS.newsMap}
          render={(NewsMap) => (
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <NewsMap />
            </div>
          )}
        />
      </main>

      <Footer />

      {/* Floating Widgets */}
      <LazySection
        eager
        minHeight={0}
        loader={SECTION_LOADERS.liteModeHint}
        render={(LiteModeHint) => <LiteModeHint />}
      />
    </div>
  );
}
