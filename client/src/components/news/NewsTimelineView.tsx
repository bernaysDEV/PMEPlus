import { useMemo } from "react";
import { Link } from "wouter";
import { Clock, Zap, MessageSquare, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import type { ArticleWithDetails } from "@shared/schema";

interface NewsTimelineViewProps {
  articles: ArticleWithDetails[];
}

interface DayBucket {
  key: string;
  label: string;
  items: ArticleWithDetails[];
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDayLabel = (d: Date) => {
  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const yesterdayKey = dayKey(yesterday);
  const k = dayKey(d);
  if (k === todayKey) return "اليوم";
  if (k === yesterdayKey) return "أمس";
  return format(d, "EEEE d MMMM yyyy", { locale: arSA });
};

export function NewsTimelineView({ articles }: NewsTimelineViewProps) {
  const buckets = useMemo<DayBucket[]>(() => {
    const map = new Map<string, DayBucket>();
    for (const a of articles) {
      const date = a.publishedAt ? new Date(a.publishedAt) : new Date();
      const k = dayKey(date);
      if (!map.has(k)) {
        map.set(k, { key: k, label: formatDayLabel(date), items: [] });
      }
      map.get(k)!.items.push(a);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [articles]);

  if (articles.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid="text-timeline-empty"
      >
        لا توجد أخبار في هذا المدى.
      </p>
    );
  }

  return (
    <div className="space-y-8" data-testid="block-timeline-view">
      {buckets.map((bucket) => (
        <section
          key={bucket.key}
          className="space-y-3"
          data-testid={`timeline-day-${bucket.key}`}
        >
          <div className="sticky top-[10rem] z-20 -mx-1 flex items-center gap-2 bg-background/95 px-1 py-1.5 backdrop-blur">
            <h3
              className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
              data-testid={`heading-timeline-${bucket.key}`}
            >
              {bucket.label}
            </h3>
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {bucket.items.length} خبر
            </span>
          </div>

          <ol className="relative space-y-3 border-r border-border pe-0 ps-5">
            {bucket.items.map((a) => {
              const dt = a.publishedAt ? new Date(a.publishedAt) : null;
              const timeLabel = dt
                ? format(dt, "HH:mm", { locale: arSA })
                : "—:—";
              return (
                <li
                  key={a.id}
                  className="relative"
                  data-testid={`timeline-item-${a.id}`}
                >
                  <span
                    className={`absolute -right-[0.4375rem] top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${
                      a.newsType === "breaking"
                        ? "bg-destructive"
                        : "bg-primary"
                    }`}
                    aria-hidden
                  />
                  <Link href={`/article/${a.englishSlug || a.slug}`}>
                    <div className="group flex flex-col gap-1.5 rounded-md border bg-card p-3 hover-elevate active-elevate-2 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex w-20 shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        <Clock className="h-3 w-3" aria-hidden />
                        {timeLabel}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {a.newsType === "breaking" && (
                            <Badge variant="destructive" className="gap-1">
                              <Zap className="h-3 w-3" aria-hidden />
                              عاجل
                            </Badge>
                          )}
                          {a.category && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                              style={{
                                borderRight: `3px solid ${a.category.color || "hsl(var(--primary))"}`,
                              }}
                            >
                              {a.category.nameAr}
                            </Badge>
                          )}
                        </div>
                        <h4
                          className={`text-sm font-bold leading-snug transition-colors ${a.newsType === "breaking" ? "text-destructive" : "group-hover:text-primary"}`}
                          data-testid={`text-timeline-title-${a.id}`}
                        >
                          {a.title}
                        </h4>
                        {a.excerpt && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {a.excerpt}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {(a.views ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" aria-hidden />
                              {(a.views ?? 0).toLocaleString("en-US")}
                            </span>
                          )}
                          {(a.commentsCount ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" aria-hidden />
                              {(a.commentsCount ?? 0).toLocaleString("en-US")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
