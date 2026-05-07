import { Sparkles, TrendingUp, ArrowLeft, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface AIInsights {
  dailySummary?: string;
  topTopics?: Array<{ name: string; score: number }>;
  activityTrend?: string;
  keyHighlights?: string[];
}

interface DigestAnalytics {
  period?: { today?: number; week?: number; month?: number };
  growth?: { percentage?: number; trend?: "up" | "down" | "stable" };
  topCategory?: { name: string; count: number; color?: string } | null;
  aiInsights?: AIInsights;
}

interface AIDailyDigestProps {
  analytics?: DigestAnalytics | null;
  isLoading?: boolean;
}

export function AIDailyDigest({ analytics, isLoading }: AIDailyDigestProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-ai-digest-loading">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const insights = analytics?.aiInsights;
  const highlights = (insights?.keyHighlights || []).slice(0, 3);
  const todayCount = analytics?.period?.today ?? 0;
  const growth = analytics?.growth?.percentage ?? 0;
  const topCategory = analytics?.topCategory;

  return (
    <Card
      className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
      data-testid="card-ai-digest"
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-success" />
            </div>
            <h3 className="text-sm font-bold" data-testid="heading-ai-digest">
              موجز AI اليومي
            </h3>
          </div>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Activity className="h-2.5 w-2.5" aria-hidden />
            مباشر
          </Badge>
        </div>

        {insights?.dailySummary && (
          <p
            className="text-xs leading-relaxed text-muted-foreground"
            data-testid="text-ai-daily-summary"
          >
            {insights.dailySummary}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-md border bg-card p-2"
            data-testid="block-ai-today-count"
          >
            <div className="text-[10px] text-muted-foreground">اليوم</div>
            <div className="text-lg font-bold tabular-nums">
              {todayCount.toLocaleString("en-US")}
            </div>
            <div className="text-[10px] text-muted-foreground">خبراً</div>
          </div>
          <div
            className="rounded-md border bg-card p-2"
            data-testid="block-ai-growth"
          >
            <div className="text-[10px] text-muted-foreground">نمو شهري</div>
            <div
              className={`flex items-center gap-1 text-lg font-bold tabular-nums ${growth > 0 ? "text-success" : growth < 0 ? "text-destructive" : "text-foreground"}`}
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              {growth > 0 ? "+" : ""}
              {growth.toLocaleString("en-US")}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              مقارنة بالشهر السابق
            </div>
          </div>
        </div>

        {topCategory && (
          <div
            className="flex items-center justify-between rounded-md border bg-card p-2"
            data-testid="block-ai-top-category"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: topCategory.color || "hsl(var(--primary))" }}
                aria-hidden
              />
              <div>
                <div className="text-[10px] text-muted-foreground">
                  التصنيف الأنشط
                </div>
                <div className="text-sm font-semibold">{topCategory.name}</div>
              </div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {(topCategory.count ?? 0).toLocaleString("en-US")} خبر
            </span>
          </div>
        )}

        {highlights.length > 0 && (
          <ul className="space-y-1.5">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-foreground"
                data-testid={`text-ai-highlight-${i}`}
              >
                <span
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          data-testid="button-ai-daily-brief"
        >
          <Link href="/daily-brief">
            <span>افتح الموجز اليومي كاملاً</span>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
