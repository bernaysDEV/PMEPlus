import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Compass,
  Newspaper,
  TrendingUp,
  Eye,
} from "lucide-react";

interface AIRecommendation {
  id: string;
  title: string;
  slug: string;
  englishSlug?: string | null;
  excerpt?: string;
  imageUrl?: string;
  views?: number;
  publishedAt?: string;
  category?: {
    nameAr: string;
    icon?: string;
  };
  aiMetadata: {
    reason: string;
    icon: string;
    aiLabel: string;
    relevanceScore: number;
  };
}

interface AIRecommendationsBlockProps {
  articleSlug: string;
}

const iconMap: Record<string, any> = {
  Compass,
  Newspaper,
  TrendingUp,
};

export function AIRecommendationsBlock({ articleSlug }: AIRecommendationsBlockProps) {
  const { data: recommendationsRaw, isLoading, error } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/articles", articleSlug, "ai-recommendations"],
  });
  const recommendations = Array.isArray(recommendationsRaw) ? recommendationsRaw : [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" dir="rtl">
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      data-testid="card-ai-recommendations"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border flex-wrap">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent"
            data-testid="text-ai-recommendations-label"
          >
            ذكاء اصطناعي · Property ME
          </span>
          <h3
            className="text-base sm:text-lg font-bold text-foreground mt-1"
            data-testid="text-ai-recommendations-title"
          >
            توصيات مختارة لك
          </h3>
        </div>
      </div>

      {/* Recommendations List */}
      <ul className="space-y-3 list-none m-0 p-0">
        {recommendations.map((rec, index) => {
          const IconComponent = iconMap[rec.aiMetadata.icon] || Newspaper;
          const score = Math.max(0, Math.min(100, rec.aiMetadata.relevanceScore));

          return (
            <li key={rec.id}>
              <Link href={`/article/${rec.englishSlug || rec.slug}`}>
                <a
                  className="block rounded-lg p-3 -mx-1 hover-elevate active-elevate-2"
                  data-testid={`ai-recommendation-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4
                        className="font-semibold text-sm leading-snug text-foreground line-clamp-2"
                        data-testid={`ai-recommendation-title-${index}`}
                      >
                        {rec.title}
                      </h4>

                      {rec.excerpt && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {rec.excerpt}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {rec.category && (
                          <span data-testid={`ai-recommendation-category-${index}`}>
                            {rec.category.nameAr}
                          </span>
                        )}
                        {rec.views !== undefined && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {rec.views}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1.5 flex-wrap">
                        <span
                          className="text-[11px] text-foreground/80"
                          data-testid={`ai-recommendation-reason-${index}`}
                        >
                          {rec.aiMetadata.reason}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="h-1 w-14 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className="text-[10px] text-muted-foreground font-semibold tabular-nums"
                            data-testid={`ai-recommendation-score-${index}`}
                          >
                            {score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border">
        مقترحات مبنية على تفاعلك الأخير ضمن Property ME
      </p>
    </div>
  );
}
