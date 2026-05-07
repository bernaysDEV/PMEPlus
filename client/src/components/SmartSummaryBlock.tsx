import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import {
  ListChecks,
  BookOpen,
  Percent,
  Heart,
  MessageSquare,
  ChevronDown,
  UserPlus,
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

export function SmartSummaryBlock() {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });

  const { data: user, isLoading: isLoadingUser } = useQuery<{ id: string; name?: string; email?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: insights, isLoading: isLoadingInsights } = useQuery<TodayInsightsData>({
    queryKey: ["/api/ai/insights/today"],
    retry: false,
    enabled: !!user,
  });

  if (isLoadingUser) {
    return (
      <div className="rounded-2xl border border-smart-summary-tint bg-smart-summary-tint p-5">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    );
  }

  // Compact promotional banner for guests
  if (!user) {
    return (
      <div
        className="rounded-2xl border border-smart-summary-tint bg-smart-summary-tint p-4"
        data-testid="card-guest-welcome"
        dir="rtl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ListChecks className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              ذكاء اصطناعي · Property ME
            </span>
            <h2 className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              ملخصات وتوصيات مخصصة لك
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              سجّل مجاناً واحصل على إشعارات فورية وأخبار تناسب اهتماماتك
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm" className="gap-1.5" data-testid="button-register">
              <Link href="/register">
                <UserPlus className="h-3.5 w-3.5" />
                سجّل مجاناً
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              data-testid="button-login-summary"
            >
              <Link href="/login">دخول</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingInsights) {
    return (
      <div className="rounded-2xl border border-smart-summary-tint bg-smart-summary-tint p-5">
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
        className="rounded-2xl border border-smart-summary-tint bg-smart-summary-tint p-5"
        data-testid="card-smart-summary"
        dir="rtl"
      >
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3 cursor-pointer group">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                ذكاء اصطناعي · Property ME
              </span>
              <h2
                className="text-base font-bold text-foreground mt-0.5"
                data-testid="text-greeting"
              >
                {insights.greeting}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                رحلتك المعرفية في Property ME اليوم باختصار
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
              label="وقت القراءة"
              value={`${insights.metrics.readingTime} د`}
              testId="metric-وقت القراءة"
            />
            <MetricCard
              icon={<Percent className="h-4 w-4" />}
              label="معدل الإكمال"
              value={`${insights.metrics.completionRate}%`}
              testId="metric-معدل الإكمال"
            />
            <MetricCard
              icon={<Heart className="h-4 w-4" />}
              label="الإعجابات"
              value={insights.metrics.likes}
              testId="metric-الإعجابات"
            />
            <MetricCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="التعليقات"
              value={insights.metrics.comments}
              testId="metric-التعليقات"
            />
          </div>

          {insights?.topInterests?.length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="font-medium text-sm mb-2">اهتماماتك اليوم:</p>
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
                href="/daily-brief"
                className="text-sm text-accent font-semibold hover:underline whitespace-nowrap"
                data-testid="link-daily-summary"
              >
                عرض الملخص اليومي
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
