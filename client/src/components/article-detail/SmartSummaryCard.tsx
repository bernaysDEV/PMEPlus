import { ReactNode } from "react";
import { ListChecks, Volume2, VolumeX, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SmartSummaryCardProps {
  bullets: string[];
  isLoadingBullets?: boolean;
  fullSummary?: string | null;
  isExpanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  isLoadingAudio?: boolean;
  dir?: "rtl" | "ltr";
  labels?: {
    title?: string;
    readMore?: string;
    showLess?: string;
    listen?: string;
    stopListen?: string;
    aiBadge?: string;
  };
  testIdPrefix?: string;
  extraAction?: ReactNode;
}

export function SmartSummaryCard({
  bullets,
  isLoadingBullets,
  fullSummary,
  isExpanded,
  onExpandedChange,
  onPlayAudio,
  isPlaying,
  isLoadingAudio,
  dir = "rtl",
  labels,
  testIdPrefix = "summary",
  extraAction,
}: SmartSummaryCardProps) {
  const t = {
    title: labels?.title ?? (dir === "rtl" ? "الموجز الذكي" : "Smart Summary"),
    readMore: labels?.readMore ?? (dir === "rtl" ? "اقرأ المزيد" : "Read more"),
    showLess: labels?.showLess ?? (dir === "rtl" ? "إخفاء" : "Show less"),
    listen: labels?.listen ?? (dir === "rtl" ? "استماع للموجز" : "Listen to summary"),
    stopListen: labels?.stopListen ?? (dir === "rtl" ? "إيقاف الاستماع" : "Stop listening"),
    aiBadge:
      labels?.aiBadge ??
      (dir === "rtl" ? "ذكاء اصطناعي · Property ME" : "AI · Property ME"),
  };

  const hasContent = bullets.length > 0 || isLoadingBullets || !!fullSummary;
  if (!hasContent) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
      <div
        dir={dir}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        data-testid={`${testIdPrefix}-card`}
      >
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border flex-wrap">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ListChecks className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <span
              className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent"
              data-testid={`${testIdPrefix}-ai-label`}
            >
              {t.aiBadge}
            </span>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <h3
                className="text-base sm:text-lg font-bold text-foreground"
                data-testid={`${testIdPrefix}-title`}
              >
                {t.title}
              </h3>
              {isPlaying && (
                <span
                  className="inline-flex items-end gap-0.5 h-3"
                  aria-hidden="true"
                >
                  <span className="w-0.5 bg-accent animate-pulse" style={{ height: "60%" }} />
                  <span className="w-0.5 bg-accent animate-pulse" style={{ height: "100%", animationDelay: "120ms" }} />
                  <span className="w-0.5 bg-accent animate-pulse" style={{ height: "70%", animationDelay: "240ms" }} />
                  <span className="w-0.5 bg-accent animate-pulse" style={{ height: "90%", animationDelay: "360ms" }} />
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {extraAction}
            {!!fullSummary && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  data-testid={`${testIdPrefix}-button-toggle`}
                  aria-label={isExpanded ? t.showLess : t.readMore}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? t.showLess : t.readMore}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            )}
            {onPlayAudio && (
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onPlayAudio}
                disabled={isLoadingAudio}
                data-testid={`${testIdPrefix}-button-listen`}
                aria-label={isPlaying ? t.stopListen : t.listen}
              >
                {isLoadingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {(bullets.length > 0 || isLoadingBullets) && (
          <ul
            className="space-y-2.5 list-none m-0 p-0"
            data-testid={`${testIdPrefix}-bullets`}
          >
            {isLoadingBullets && bullets.length === 0 ? (
              <>
                <li><Skeleton className="h-3.5 w-11/12" /></li>
                <li><Skeleton className="h-3.5 w-10/12" /></li>
                <li><Skeleton className="h-3.5 w-9/12" /></li>
              </>
            ) : (
              bullets.slice(0, 3).map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm sm:text-base leading-relaxed text-foreground/90"
                  data-testid={`${testIdPrefix}-bullet-${i}`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                  />
                  <span>{bullet}</span>
                </li>
              ))
            )}
          </ul>
        )}

        {!!fullSummary && (
          <CollapsibleContent>
            <p
              className="mt-4 pt-4 border-t border-border text-sm sm:text-base text-muted-foreground leading-relaxed"
              data-testid={`${testIdPrefix}-full-text`}
            >
              {fullSummary}
            </p>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
