import { Badge } from "@/components/ui/badge";
import { Compass, Clock, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { getObjectPosition } from "@/lib/imageUtils";

interface EnglishRecommendationsWidgetProps {
  articles: any[];
  title?: string;
  reason?: string;
}

export function EnglishRecommendationsWidget({
  articles,
  title = "Recommended for You",
  reason = "Based on your interests",
}: EnglishRecommendationsWidgetProps) {
  if (articles.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      data-testid="card-en-recommendations"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border flex-wrap">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            AI · Property ME
          </span>
          <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{reason}</p>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-3 list-none m-0 p-0">
        {articles.map((article, index) => {
          const timeAgo = article.publishedAt
            ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
            : null;

          return (
            <li key={article.id}>
              <Link
                href={`/en/article/${article.slug}`}
                className="block group rounded-lg p-2 -mx-1 hover-elevate active-elevate-2"
                data-testid={`link-recommendation-${article.id}`}
              >
                <div className="flex gap-3">
                  <div className="relative flex-shrink-0 w-24 h-20 rounded-md overflow-hidden bg-muted">
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        style={{ objectPosition: getObjectPosition(article) }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                    <div className="absolute bottom-1 left-1">
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-bold tabular-nums bg-background/90 backdrop-blur-sm"
                      >
                        {index + 1}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {article.category && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5"
                        data-testid={`badge-rec-category-${article.id}`}
                      >
                        {article.category.nameEn || article.category.nameAr}
                      </Badge>
                    )}

                    <h4
                      className="font-semibold text-sm line-clamp-2 leading-snug text-foreground"
                      data-testid={`text-rec-title-${article.id}`}
                    >
                      {article.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {timeAgo && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </span>
                      )}
                      {(article.commentsCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {article.commentsCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
