import { useState } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  Clock,
  Eye,
  MessageSquare,
  Zap,
  ArrowLeft,
  X,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getCacheBustedImageUrl, getObjectPosition } from "@/lib/imageUtils";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import type { ArticleWithDetails } from "@shared/schema";

interface LeadStoryCardProps {
  article: ArticleWithDetails;
}

export function LeadStoryCard({ article }: LeadStoryCardProps) {
  const [showSummary, setShowSummary] = useState(false);

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

  const aiBullets = article.aiBullets;
  const aiSummaryText = article.aiSummary;
  const hasSummary =
    (Array.isArray(aiBullets) && aiBullets.length > 0) || !!aiSummaryText;

  return (
    <article
      className="relative overflow-hidden rounded-md border bg-card text-card-foreground"
      data-testid={`card-lead-story-${article.id}`}
      aria-label={`القصة الرئيسية: ${article.title}`}
    >
      <Link href={href}>
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-[21/9]">
          {imageUrl ? (
            <OptimizedImage
              src={imageUrl}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              objectPosition={getObjectPosition(article)}
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
              <BookOpen className="h-16 w-16 text-primary/40" aria-hidden />
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            aria-hidden
          />

          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 md:p-9">
            <div className="flex flex-wrap items-center gap-2">
              {article.newsType === "breaking" ? (
                <Badge
                  variant="destructive"
                  className="gap-1"
                  data-testid={`badge-lead-breaking-${article.id}`}
                >
                  <Zap className="h-3 w-3" aria-hidden />
                  عاجل
                </Badge>
              ) : null}
              {article.category && (
                <Badge
                  variant="secondary"
                  className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/20"
                  data-testid={`badge-lead-category-${article.id}`}
                  style={{
                    borderRight: `3px solid ${article.category.color || "hsl(var(--primary))"}`,
                  }}
                >
                  {article.category.nameAr}
                </Badge>
              )}
              {timeAgo && (
                <Badge
                  variant="outline"
                  className="gap-1 border-white/30 bg-white/10 text-white backdrop-blur-sm"
                  data-testid={`badge-lead-time-${article.id}`}
                >
                  <Clock className="h-3 w-3" aria-hidden />
                  {timeAgo}
                </Badge>
              )}
            </div>

            <h2
              className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl md:text-4xl lg:text-5xl"
              data-testid={`text-lead-title-${article.id}`}
            >
              {article.title}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/80 sm:text-sm">
              {(article.views ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1"
                  data-testid={`text-lead-views-${article.id}`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {(article.views ?? 0).toLocaleString("en-US")}
                </span>
              )}
              {(article.commentsCount ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1"
                  data-testid={`text-lead-comments-${article.id}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  {(article.commentsCount ?? 0).toLocaleString("en-US")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-3 border-t bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        {hasSummary ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowSummary((s) => !s)}
            data-testid={`button-lead-ai-summary-${article.id}`}
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            {showSummary ? "إخفاء الملخّص" : "ملخّص AI في 30 ثانية"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            لا يوجد ملخّص ذكي بعد لهذه القصة
          </span>
        )}

        <Button
          asChild
          variant="default"
          size="sm"
          className="gap-2"
          data-testid={`button-lead-read-${article.id}`}
        >
          <Link href={href}>
            قراءة القصة كاملة
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {showSummary && hasSummary && (
        <div
          className="border-t bg-muted/40 p-4"
          data-testid={`block-lead-summary-${article.id}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              ملخّص ذكي
            </span>
            <button
              type="button"
              onClick={() => setShowSummary(false)}
              aria-label="إغلاق الملخّص"
              data-testid={`button-lead-summary-close-${article.id}`}
              className="rounded-sm p-1 hover-elevate active-elevate-2"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {Array.isArray(aiBullets) && aiBullets.length > 0 ? (
            <ul className="space-y-1.5 text-sm text-foreground">
              {aiBullets.slice(0, 3).map((b, i) => (
                <li
                  key={i}
                  className="flex gap-2"
                  data-testid={`text-lead-bullet-${article.id}-${i}`}
                >
                  <span
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="text-sm leading-relaxed text-foreground"
              data-testid={`text-lead-summary-${article.id}`}
            >
              {aiSummaryText}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
