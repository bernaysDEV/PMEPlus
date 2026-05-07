import { Link } from "wouter";
import { Clock, Zap, BookOpen, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getCacheBustedImageUrl, getObjectPosition } from "@/lib/imageUtils";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import type { ArticleWithDetails } from "@shared/schema";

interface SecondaryStoryCardProps {
  article: ArticleWithDetails;
  size?: "md" | "sm";
}

const isNew = (publishedAt: Date | string | null | undefined) => {
  if (!publishedAt) return false;
  const t = new Date(publishedAt).getTime();
  return (Date.now() - t) / (1000 * 60) <= 30;
};

export function SecondaryStoryCard({
  article,
  size = "md",
}: SecondaryStoryCardProps) {
  const href = `/article/${article.englishSlug || article.slug}`;
  const imageUrl = getCacheBustedImageUrl(
    article.imageUrl || article.thumbnailUrl,
    article.updatedAt,
  );
  const timeAgo = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), {
        addSuffix: true,
        locale: arSA,
      })
    : null;

  const isCompact = size === "sm";
  const aspectClass = isCompact ? "aspect-[4/3]" : "aspect-[16/10]";
  const titleClass = isCompact
    ? "text-sm font-bold line-clamp-2 leading-snug"
    : "text-base font-bold line-clamp-2 leading-snug sm:text-lg";

  return (
    <Card
      className="group h-full cursor-pointer overflow-hidden hover-elevate active-elevate-2 transition-all"
      data-testid={`card-secondary-story-${article.id}`}
    >
      <Link href={href}>
        <div className="flex h-full flex-col">
          <div
            className={`relative w-full overflow-hidden bg-muted ${aspectClass}`}
          >
            {imageUrl ? (
              <OptimizedImage
                src={imageUrl}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                objectPosition={getObjectPosition(article)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
                <BookOpen className="h-10 w-10 text-primary/40" aria-hidden />
              </div>
            )}
            {article.newsType === "breaking" && (
              <div className="absolute right-2 top-2">
                <Badge variant="destructive" className="gap-1">
                  <Zap className="h-3 w-3" aria-hidden />
                  عاجل
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {article.category && (
                <Badge
                  variant="secondary"
                  className="text-[10px]"
                  style={{
                    borderRight: `3px solid ${article.category.color || "hsl(var(--primary))"}`,
                  }}
                  data-testid={`badge-secondary-category-${article.id}`}
                >
                  {article.category.nameAr}
                </Badge>
              )}
              {isNew(article.publishedAt) && (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px] text-success"
                >
                  <Flame className="h-2.5 w-2.5" aria-hidden />
                  جديد
                </Badge>
              )}
            </div>

            <h3
              className={`${titleClass} ${article.newsType === "breaking" ? "text-destructive" : "group-hover:text-primary"} transition-colors`}
              data-testid={`text-secondary-title-${article.id}`}
            >
              {article.title}
            </h3>

            {!isCompact && article.excerpt && (
              <p
                className="line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                data-testid={`text-secondary-excerpt-${article.id}`}
              >
                {article.excerpt}
              </p>
            )}

            {timeAgo && (
              <div
                className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-foreground"
                data-testid={`text-secondary-time-${article.id}`}
              >
                <Clock className="h-3 w-3" aria-hidden />
                <span>{timeAgo}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}
