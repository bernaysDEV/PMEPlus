import { Eye, Clock, MessageSquare, Heart, Bookmark, Share2 } from "lucide-react";

interface EngagementStat {
  key: string;
  icon: React.ReactNode;
  value: number | string;
  label: string;
  testId?: string;
}

interface EngagementStatsProps {
  stats: EngagementStat[];
  dir?: "rtl" | "ltr";
}

export function EngagementStats({ stats, dir = "rtl" }: EngagementStatsProps) {
  if (!stats.length) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-2 sm:gap-3"
      dir={dir}
      data-testid="engagement-stats"
    >
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-border bg-card text-xs sm:text-sm text-foreground"
          data-testid={stat.testId || `pill-${stat.key}`}
        >
          <span className="text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{stat.icon}</span>
          <span className="font-semibold">{stat.value}</span>
          <span className="text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export { Eye, Clock, MessageSquare, Heart, Bookmark, Share2 };
