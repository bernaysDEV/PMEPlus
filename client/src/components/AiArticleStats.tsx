import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, TrendingUp, Eye, Flame } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { ElementType } from "react";

interface AiInsights {
  avgReadTime: number;
  totalReads: number;
  totalReactions: number;
  totalComments: number;
  totalViews: number;
  engagementRate: number;
  completionRate: number;
  totalInteractions: number;
}

interface AiArticleStatsProps {
  slug: string;
}

function formatReadTime(seconds: number): string {
  if (seconds === 0) return "لا توجد بيانات";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${secs} ثانية`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')} دقيقة`;
}

function StatItem({
  icon: Icon,
  label,
  value,
  showFlame = false,
  flameThreshold = 10000,
  rawValue,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  showFlame?: boolean;
  flameThreshold?: number;
  rawValue?: number;
}) {
  const isTrending = showFlame && rawValue !== undefined && rawValue >= flameThreshold;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
      data-testid={`stat-${label}`}
    >
      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
        <div className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
          <span className="truncate">{value}</span>
          {isTrending && (
            <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" data-testid="icon-flame-trending" />
          )}
        </div>
      </div>
    </div>
  );
}

export function AiArticleStats({ slug }: AiArticleStatsProps) {
  const { data: insights, isLoading } = useQuery<AiInsights>({
    queryKey: ["/api/articles", slug, "ai-insights"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        dir="rtl"
        data-testid="ai-stats-loading"
      >
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-24 w-full mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights) return null;

  // Generate engagement trend data for visualization (with views)
  const engagementData = [
    {
      الاسم: 'المشاهدات',
      القيمة: insights.totalViews,
      النسبة: 100,
    },
    {
      الاسم: 'القراءات',
      القيمة: insights.totalReads,
      النسبة: insights.totalViews > 0 ? Math.round((insights.totalReads / insights.totalViews) * 100) : 0,
    },
    {
      الاسم: 'الإكمال',
      القيمة: Math.round((insights.totalReads * insights.completionRate) / 100),
      النسبة: insights.completionRate,
    },
    {
      الاسم: 'التفاعل',
      القيمة: insights.totalInteractions,
      النسبة: insights.totalViews > 0 ? Math.round((insights.totalInteractions / insights.totalViews) * 100) : 0,
    },
  ];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      dir="rtl"
      data-testid="ai-stats-panel"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border flex-wrap">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent"
            data-testid="ai-stats-ai-label"
          >
            ذكاء اصطناعي · Property ME
          </span>
          <h3
            className="text-base sm:text-lg font-bold text-foreground mt-1"
            data-testid="ai-stats-title"
          >
            إحصائيات الذكاء الاصطناعي
          </h3>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0"
          data-testid="ai-stats-live-indicator"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span>لحظي</span>
        </div>
      </div>

      {/* Engagement Funnel Chart */}
      <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          قمع التفاعل
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart
            data={engagementData}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="الاسم"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
                direction: 'rtl',
                padding: '4px 8px',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number, الاسم: string) => {
                const item = engagementData.find((d) => d.الاسم === الاسم);
                return [`${value} (${item?.النسبة}%)`, الاسم];
              }}
            />
            <Area
              type="monotone"
              dataKey="القيمة"
              stroke="hsl(var(--accent))"
              strokeWidth={1.5}
              fill="url(#colorEngagement)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          icon={Eye}
          label="المشاهدات"
          value={insights.totalViews?.toLocaleString('en-US') || 0}
          showFlame={true}
          flameThreshold={10000}
          rawValue={insights.totalViews}
        />

        <StatItem
          icon={Clock}
          label="متوسط زمن القراءة"
          value={formatReadTime(insights.avgReadTime)}
        />

        <StatItem
          icon={TrendingUp}
          label="نسبة الإكمال"
          value={`${insights.completionRate}%`}
        />
      </div>
    </div>
  );
}
