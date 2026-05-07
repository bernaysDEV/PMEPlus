import { useEffect, useRef, useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow, parseISO, startOfDay, subDays, subHours, differenceInMinutes } from "date-fns";
import {
  Radio,
  Zap,
  Eye,
  MessageSquare,
  Loader2,
  Clock,
  RefreshCw,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { EnglishFooter } from "@/components/en/EnglishFooter";
import { OptimizedImage } from "@/components/OptimizedImage";

interface LiveUpdate {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  imageFocalPoint?: { x: number; y: number } | null;
  publishedAt: string;
  updatedAt: string;
  isBreaking: boolean;
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  viewsCount: number;
  commentsCount: number;
  summary: string;
}

interface LiveUpdatesResponse {
  items: LiveUpdate[];
  nextCursor: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
  status: string;
}

type TimeRange = "1h" | "3h" | "today" | "yesterday" | "7d";

function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function isNewUpdate(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    return differenceInMinutes(now, date) <= 5;
  } catch {
    return false;
  }
}

function getObjectPositionForItem(item: LiveUpdate, defaultPosition = "center 20%"): string {
  const fp = item.imageFocalPoint;
  if (!fp || typeof fp.x !== "number" || typeof fp.y !== "number") {
    return defaultPosition;
  }
  const x = Math.max(0, Math.min(100, fp.x));
  const y = Math.max(0, Math.min(100, fp.y));
  return `${x}% ${y}%`;
}

interface HeroUpdateProps {
  item: LiveUpdate;
}

function HeroUpdate({ item }: HeroUpdateProps) {
  const categoryColor = item.categoryColor || "hsl(var(--primary))";
  const isNew = isNewUpdate(item.publishedAt);

  return (
    <Link href={`/en/article/${item.slug}`} data-testid={`link-hero-${item.id}`}>
      <article
        className="group relative block overflow-hidden rounded-md bg-card border hover-elevate active-elevate-2"
        data-testid={`card-hero-${item.id}`}
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full overflow-hidden bg-muted">
          {item.imageUrl ? (
            <OptimizedImage
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              wrapperClassName="h-full w-full"
              priority
              objectPosition={getObjectPositionForItem(item)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230_52%_10%/0.95)] via-[hsl(230_52%_15%/0.55)] to-[hsl(230_52%_15%/0.05)]" />

          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex items-center gap-2">
            {item.isBreaking && (
              <Badge
                variant="destructive"
                className="gap-1 shadow-lg text-[11px] sm:text-xs"
                data-testid={`badge-hero-breaking-${item.id}`}
              >
                <Zap className="h-3 w-3" />
                Breaking
              </Badge>
            )}
            {isNew && !item.isBreaking && (
              <Badge
                className="bg-emerald-500 text-white border-transparent shadow-lg text-[11px] sm:text-xs"
                data-testid={`badge-hero-new-${item.id}`}
              >
                New
              </Badge>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 text-white">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: categoryColor }}
                data-testid={`badge-hero-category-${item.id}`}
              >
                {item.categoryName}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] sm:text-sm text-white/85"
                data-testid={`text-hero-time-${item.id}`}
              >
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {formatRelativeTime(item.publishedAt)}
              </span>
            </div>

            <h2
              className="font-extrabold leading-tight tracking-tight text-xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-4 text-white drop-shadow-sm line-clamp-3"
              data-testid={`text-hero-title-${item.id}`}
            >
              {item.title}
            </h2>

            {item.summary && (
              <p
                className="hidden sm:block text-sm sm:text-base text-white/85 leading-relaxed max-w-3xl line-clamp-2 mb-4"
                data-testid={`text-hero-summary-${item.id}`}
              >
                {item.summary}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-sm text-white/80">
                <span className="flex items-center gap-1.5" data-testid={`text-hero-views-${item.id}`}>
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {item.viewsCount.toLocaleString("en-US")}
                </span>
                <span className="flex items-center gap-1.5" data-testid={`text-hero-comments-${item.id}`}>
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {item.commentsCount.toLocaleString("en-US")}
                </span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:text-white/90">
                Read story
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

interface MagazineCardProps {
  item: LiveUpdate;
}

function MagazineCard({ item }: MagazineCardProps) {
  const isNew = isNewUpdate(item.publishedAt);
  const categoryColor = item.categoryColor || "hsl(var(--primary))";

  return (
    <Link href={`/en/article/${item.slug}`} data-testid={`link-article-${item.id}`}>
      <article
        className="group h-full flex flex-col rounded-md border bg-card overflow-hidden hover-elevate active-elevate-2"
        data-testid={`card-news-${item.id}`}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {item.imageUrl ? (
            <OptimizedImage
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              wrapperClassName="h-full w-full"
              priority={false}
              objectPosition={getObjectPositionForItem(item)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15" />
          )}
          {item.isBreaking && (
            <div className="absolute top-3 left-3">
              <Badge
                variant="destructive"
                className="gap-1 shadow-lg text-[10px] sm:text-xs"
                data-testid={`badge-breaking-${item.id}`}
              >
                <Zap className="h-3 w-3" />
                Breaking
              </Badge>
            </div>
          )}
          {isNew && !item.isBreaking && (
            <div className="absolute top-3 left-3">
              <Badge
                className="bg-emerald-500 text-white border-transparent shadow-lg text-[10px] sm:text-xs"
                data-testid={`badge-new-${item.id}`}
              >
                New
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
            <span
              className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: categoryColor }}
              data-testid={`badge-category-${item.id}`}
            >
              {item.categoryName}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground"
              data-testid={`text-time-${item.id}`}
            >
              <Clock className="h-3 w-3" />
              {formatRelativeTime(item.publishedAt)}
            </span>
          </div>

          <h3
            className="font-extrabold leading-snug text-base sm:text-xl mb-2 line-clamp-3 tracking-tight"
            data-testid={`text-title-${item.id}`}
          >
            {item.title}
          </h3>

          {item.summary && (
            <p
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4"
              data-testid={`text-summary-${item.id}`}
            >
              {item.summary}
            </p>
          )}

          <div className="mt-auto flex items-center gap-4 text-[11px] sm:text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1.5" data-testid={`text-views-${item.id}`}>
              <Eye className="h-3.5 w-3.5" />
              {item.viewsCount.toLocaleString("en-US")}
            </span>
            <span className="flex items-center gap-1.5" data-testid={`text-comments-${item.id}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              {item.commentsCount.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function HeroSkeleton() {
  return (
    <div className="rounded-md border bg-card overflow-hidden" data-testid="skeleton-hero">
      <Skeleton className="aspect-[16/10] sm:aspect-[21/9] w-full rounded-none" />
    </div>
  );
}

function MagazineGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" data-testid="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border bg-card overflow-hidden">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-3 pt-2 border-t">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center py-16 sm:py-24 rounded-md border bg-card"
      data-testid="empty-state"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <Radio className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl sm:text-2xl font-extrabold mb-2 tracking-tight">
        No updates yet
      </h3>
      <p className="text-muted-foreground text-sm sm:text-base">
        We'll let you know as soon as new stories arrive.
      </p>
    </div>
  );
}

export default function EnglishMomentByMoment() {
  const [filter, setFilter] = useState<"all" | "breaking">("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: categoriesDataRaw } = useQuery<Category[]>({
    queryKey: ["/api/en/categories"],
  });
  const categoriesData = Array.isArray(categoriesDataRaw) ? categoriesDataRaw : [];

  const activeCategories = categoriesData.filter((cat) => cat.status === "visible");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<LiveUpdatesResponse>({
    queryKey: ["/api/en/live/updates", filter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (filter !== "all") {
        params.set("filter", filter);
      }
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }

      const res = await fetch(`/api/en/live/updates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    refetchInterval: 60000,
  });

  const allItems = data?.pages.flatMap((page) => page.items) || [];

  const filteredItems = useMemo(() => {
    let filtered = allItems;
    const now = new Date();

    switch (timeRange) {
      case "1h": {
        const hourAgo = subHours(now, 1);
        filtered = filtered.filter((item) => {
          try {
            const publishedDate = parseISO(item.publishedAt);
            return publishedDate >= hourAgo && publishedDate <= now;
          } catch {
            return false;
          }
        });
        break;
      }
      case "3h": {
        const threeHoursAgo = subHours(now, 3);
        filtered = filtered.filter((item) => {
          try {
            const publishedDate = parseISO(item.publishedAt);
            return publishedDate >= threeHoursAgo && publishedDate <= now;
          } catch {
            return false;
          }
        });
        break;
      }
      case "today": {
        const todayStart = startOfDay(now);
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowStartOfDay = startOfDay(tomorrowStart);

        filtered = filtered.filter((item) => {
          try {
            const publishedDate = parseISO(item.publishedAt);
            return publishedDate >= todayStart && publishedDate < tomorrowStartOfDay;
          } catch {
            return false;
          }
        });
        break;
      }
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = startOfDay(yesterday);
        const todayStartForYesterday = startOfDay(now);

        filtered = filtered.filter((item) => {
          try {
            const publishedDate = parseISO(item.publishedAt);
            return publishedDate >= yesterdayStart && publishedDate < todayStartForYesterday;
          } catch {
            return false;
          }
        });
        break;
      }
      case "7d": {
        const weekAgo = subDays(now, 7);
        filtered = filtered.filter((item) => {
          try {
            const publishedDate = parseISO(item.publishedAt);
            return publishedDate >= weekAgo && publishedDate <= now;
          } catch {
            return false;
          }
        });
        break;
      }
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.categoryId === categoryFilter);
    }

    return filtered;
  }, [allItems, timeRange, categoryFilter]);

  const heroItem = useMemo(() => {
    if (filteredItems.length === 0) return null;
    const breakingInFiltered = filteredItems.find((item) => item.isBreaking);
    return breakingInFiltered || filteredItems[0];
  }, [filteredItems]);

  const restItems = useMemo(() => {
    if (!heroItem) return filteredItems;
    return filteredItems.filter((item) => item.id !== heroItem.id);
  }, [filteredItems, heroItem]);

  const todayBreakingCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return allItems.filter((item) => {
      if (!item.isBreaking) return false;
      try {
        return parseISO(item.publishedAt) >= todayStart;
      } catch {
        return false;
      }
    }).length;
  }, [allItems]);

  const todayCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return allItems.filter((item) => {
      try {
        return parseISO(item.publishedAt) >= todayStart;
      } catch {
        return false;
      }
    }).length;
  }, [allItems]);

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/en/live/updates"] });
    refetch();
  };

  useEffect(() => {
    const updateTime = () => {
      setLastUpdate(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateTime();

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/en/live/updates"] });
      updateTime();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <EnglishLayout>
      <div className="min-h-screen bg-background" data-testid="page-moment-by-moment-en">
        {/* Magazine Masthead */}
        <header className="border-b bg-background" data-testid="header-masthead">
          <div className="container max-w-7xl px-4 sm:px-6 py-5 sm:py-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-destructive live-pulse-ring" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <Badge
                variant="destructive"
                className="text-[10px] sm:text-xs font-bold tracking-wider uppercase"
                data-testid="badge-live"
              >
                LIVE
              </Badge>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                Live coverage
              </span>
            </div>

            <h1
              className="font-extrabold tracking-tight text-3xl sm:text-5xl md:text-6xl text-foreground leading-none mb-2 sm:mb-3"
              data-testid="text-page-title"
            >
              Moment by Moment
            </h1>
            <p
              className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed"
              data-testid="text-page-subtitle"
            >
              Real-time updates and breaking stories from the Property ME newsroom.
            </p>

            {(todayCount > 0 || todayBreakingCount > 0) && (
              <div className="flex items-center gap-3 mt-4 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1.5" data-testid="text-today-count">
                  <span className="font-bold text-foreground">{todayCount.toLocaleString("en-US")}</span>
                  updates today
                </span>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1.5" data-testid="text-today-breaking">
                  <Zap className="h-3 w-3 text-destructive" />
                  <span className="font-bold text-foreground">{todayBreakingCount.toLocaleString("en-US")}</span>
                  breaking
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Sticky filter bar */}
        <div
          className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b"
          data-testid="header-filter-bar"
        >
          <div className="container max-w-7xl px-4 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 bg-destructive/10 px-2 py-1 rounded-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-destructive live-pulse-ring" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-destructive" data-testid="text-live">
                    Live
                  </span>
                </div>
                {lastUpdate && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground"
                    data-testid="badge-last-update"
                  >
                    <Clock className="h-3 w-3" />
                    Last update {lastUpdate}
                  </span>
                )}
                <Badge variant="secondary" className="text-[10px] sm:text-xs" data-testid="badge-items-count">
                  {filteredItems.length.toLocaleString("en-US")} {filteredItems.length === 1 ? "update" : "updates"}
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="gap-1.5"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-2.5 flex-wrap">
              <div className="inline-flex rounded-sm border p-0.5">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-sm text-[11px] sm:text-xs font-bold transition-colors ${
                    filter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid="button-filter-all"
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("breaking")}
                  className={`px-3 py-1 rounded-sm text-[11px] sm:text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                    filter === "breaking"
                      ? "bg-destructive text-destructive-foreground"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid="button-filter-breaking"
                >
                  <Zap className="h-3 w-3" />
                  Breaking
                </button>
              </div>

              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger
                  className="h-8 w-auto min-w-[120px] sm:min-w-[150px] text-[11px] sm:text-xs gap-1.5"
                  data-testid="select-time-range"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h" data-testid="option-1h">Last hour</SelectItem>
                  <SelectItem value="3h" data-testid="option-3h">Last 3 hours</SelectItem>
                  <SelectItem value="today" data-testid="option-today">Today</SelectItem>
                  <SelectItem value="yesterday" data-testid="option-yesterday">Yesterday</SelectItem>
                  <SelectItem value="7d" data-testid="option-7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  className="h-8 w-auto min-w-[130px] sm:min-w-[170px] text-[11px] sm:text-xs gap-1.5"
                  data-testid="select-category"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all-categories">All categories</SelectItem>
                  {activeCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      data-testid={`option-category-${category.id}`}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main editorial body */}
        <main className="container max-w-7xl px-4 sm:px-6 py-6 sm:py-10" data-testid="main-content">
          {isLoading ? (
            <div className="space-y-6 sm:space-y-10">
              <HeroSkeleton />
              <MagazineGridSkeleton count={4} />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6 sm:space-y-10">
              {heroItem && <HeroUpdate item={heroItem} />}

              {restItems.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight" data-testid="text-section-title">
                      Latest Updates
                    </h2>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" data-testid="grid-news">
                    {restItems.map((item) => (
                      <MagazineCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <div ref={loadMoreRef} className="py-8 text-center" data-testid="div-load-more">
            {isFetchingNextPage && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" data-testid="loader-fetching" />
                <span className="text-xs text-muted-foreground">Loading more…</span>
              </div>
            )}
            {!hasNextPage && filteredItems.length > 0 && !isFetchingNextPage && (
              <p className="text-xs text-muted-foreground" data-testid="text-no-more">
                No older updates
              </p>
            )}
          </div>
        </main>

        <EnglishFooter />
      </div>
    </EnglishLayout>
  );
}
