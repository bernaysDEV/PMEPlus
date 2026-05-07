import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import {
  ListChecks,
  BookOpen,
  Percent,
  Heart,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TodayInsightsData {
  greeting: string;
  metrics: {
    readingTime: number;
    completionRate: number;
    likes: number;
    comments: number;
    articlesRead: number;
  };
  topInterests: string[];
  aiPhrase: string;
  quickSummary: string;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  testId?: string;
}

function MetricCard({ icon, label, value, testId }: MetricCardProps) {
  return (
    <div
      className="rounded-md border border-border bg-background p-3 space-y-1.5"
      data-testid={testId ?? `metric-${label}`}
    >
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function EnglishSmartSummaryBlock() {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: insights, isLoading } = useQuery<TodayInsightsData>({
    queryKey: ["/api/en/ai/insights/today"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className="rounded-2xl border border-border bg-card p-5"
        data-testid="card-smart-summary"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3 cursor-pointer group">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                AI · Property ME
              </span>
              <h2
                className="text-base font-bold text-foreground mt-0.5"
                data-testid="text-greeting"
              >
                {insights.greeting}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your knowledge journey in Property ME today in brief
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200 text-muted-foreground shrink-0 mt-2",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-4">
            <MetricCard
              icon={<BookOpen className="h-4 w-4" />}
              label="Reading Time"
              value={`${insights.metrics.readingTime} min`}
              testId="metric-reading-time"
            />
            <MetricCard
              icon={<Percent className="h-4 w-4" />}
              label="Completion Rate"
              value={`${insights.metrics.completionRate}%`}
              testId="metric-completion-rate"
            />
            <MetricCard
              icon={<Heart className="h-4 w-4" />}
              label="Likes"
              value={insights.metrics.likes}
              testId="metric-likes"
            />
            <MetricCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="Comments"
              value={insights.metrics.comments}
              testId="metric-comments"
            />
          </div>

          {insights?.topInterests?.length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="font-medium text-sm mb-2">Your interests today:</p>
              <div className="flex flex-wrap gap-2">
                {insights?.topInterests?.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    data-testid={`interest-${index}`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4 pt-4 border-t border-border">
            <p
              className="text-sm text-foreground/85 leading-relaxed"
              data-testid="text-ai-phrase"
            >
              {insights.aiPhrase}
            </p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p
                className="text-xs text-muted-foreground"
                data-testid="text-quick-summary"
              >
                {insights.quickSummary}
              </p>
              <Link
                href="/en/dashboard/daily-summary"
                className="text-sm text-accent font-semibold hover:underline whitespace-nowrap"
                data-testid="link-daily-summary"
              >
                View Daily Summary
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
