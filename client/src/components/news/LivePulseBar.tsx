import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ArticleWithDetails, BreakingTickerHeadline, BreakingTickerTopic } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";

interface LivePulseBarProps {
  articles: ArticleWithDetails[];
  isLoading?: boolean;
}

interface TickerData {
  topic: BreakingTickerTopic;
  headlines: BreakingTickerHeadline[];
}

const LAST_VISIT_KEY = "news:last-visit-at";

export function LivePulseBar({ articles, isLoading }: LivePulseBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const [lastVisitAt, setLastVisitAt] = useState<number | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  const { data: tickerData } = useQuery<TickerData | null>({
    queryKey: ["/api/breaking-ticker/active"],
    refetchInterval: 60000,
  });

  useEffect(() => {
    const stored = localStorage.getItem(LAST_VISIT_KEY);
    setLastVisitAt(stored ? parseInt(stored, 10) : null);
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lastUpdate = useMemo(() => {
    const dates = articles
      .map((a) => (a.publishedAt ? new Date(a.publishedAt).getTime() : 0))
      .filter((t) => t > 0);
    return dates.length ? Math.max(...dates) : null;
  }, [articles]);

  const newSinceVisit = useMemo(() => {
    if (!lastVisitAt) return 0;
    return articles.filter((a) => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      return t > lastVisitAt;
    }).length;
  }, [articles, lastVisitAt]);

  const headlines = tickerData?.headlines || [];
  const tickerHeadlines = headlines.length
    ? headlines
    : articles
        .filter((a) => a.newsType === "breaking")
        .slice(0, 6)
        .map((a) => ({
          headline: a.title,
          linkedArticleSlug: a.englishSlug || a.slug,
          linkedArticleId: a.id,
          externalUrl: null,
        }));

  useEffect(() => {
    if (tickerHeadlines.length <= 1) return;
    const t = setInterval(
      () => setTickerIndex((i) => (i + 1) % tickerHeadlines.length),
      4500,
    );
    return () => clearInterval(t);
  }, [tickerHeadlines.length]);

  const current = tickerHeadlines[tickerIndex];
  const lastUpdateLabel = lastUpdate
    ? formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: arSA })
    : "—";

  const goToPrev = () =>
    setTickerIndex((i) =>
      tickerHeadlines.length === 0
        ? 0
        : (i - 1 + tickerHeadlines.length) % tickerHeadlines.length,
    );
  const goToNext = () =>
    setTickerIndex((i) =>
      tickerHeadlines.length === 0 ? 0 : (i + 1) % tickerHeadlines.length,
    );

  return (
    <div
      className="rounded-md border bg-card text-card-foreground"
      data-testid="bar-live-pulse"
    >
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
          </span>
          <span
            className="text-xs font-bold uppercase tracking-wide text-destructive"
            data-testid="text-live-label"
          >
            مباشر
          </span>
          <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-testid="text-last-update"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span>آخر تحديث {isLoading ? "..." : lastUpdateLabel}</span>
          </div>
          {newSinceVisit > 0 && (
            <Badge
              variant="secondary"
              className="gap-1"
              data-testid="badge-new-since-visit"
            >
              <Activity className="h-3 w-3" aria-hidden />
              {newSinceVisit} جديد منذ زيارتك
            </Badge>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {tickerHeadlines.length > 0 ? (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                {current?.linkedArticleSlug || current?.linkedArticleId ? (
                  <Link
                    href={`/article/${current.linkedArticleSlug || current.linkedArticleId}`}
                  >
                    <span
                      className="block truncate text-sm font-medium hover:text-primary"
                      data-testid={`text-ticker-headline-${tickerIndex}`}
                    >
                      {current?.headline}
                    </span>
                  </Link>
                ) : (
                  <span
                    className="block truncate text-sm font-medium"
                    data-testid={`text-ticker-headline-${tickerIndex}`}
                  >
                    {current?.headline}
                  </span>
                )}
              </div>
              {tickerHeadlines.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={goToPrev}
                    aria-label="العنوان السابق"
                    data-testid="button-ticker-prev"
                    className="rounded-sm p-1 hover-elevate active-elevate-2"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span
                    className="tabular-nums text-[11px] text-muted-foreground"
                    data-testid="text-ticker-index"
                  >
                    {tickerIndex + 1}/{tickerHeadlines.length}
                  </span>
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="العنوان التالي"
                    data-testid="button-ticker-next"
                    className="rounded-sm p-1 hover-elevate active-elevate-2"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
            </>
          ) : (
            <span
              className="text-sm text-muted-foreground"
              data-testid="text-ticker-empty"
            >
              لا توجد عناوين عاجلة الآن
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
