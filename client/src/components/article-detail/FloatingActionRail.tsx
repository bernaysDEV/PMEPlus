import { ReactNode } from "react";
import { Heart, Bookmark, Share2, MessageSquare, Volume2, VolumeX, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface RailAction {
  key: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  loading?: boolean;
  onClick?: () => void;
  hideOnMobile?: boolean;
  testId?: string;
}

interface FloatingActionRailProps {
  actions: RailAction[];
  dir?: "rtl" | "ltr";
}

export function FloatingActionRail({ actions, dir = "rtl" }: FloatingActionRailProps) {
  const sideClass = dir === "rtl" ? "right-4" : "left-4";

  return (
    <TooltipProvider delayDuration={300}>
      {/* Desktop / tablet vertical rail */}
      <div
        className={`hidden md:flex fixed top-1/2 -translate-y-1/2 ${sideClass} z-40 flex-col gap-2 p-2 rounded-2xl border border-border bg-background/85 backdrop-blur-md shadow-lg`}
        data-testid="rail-floating-actions"
      >
        {actions.map((action) => (
          <Tooltip key={action.key}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={action.active ? "default" : "ghost"}
                onClick={action.onClick}
                disabled={action.loading}
                aria-label={action.label}
                data-testid={action.testId || `rail-${action.key}`}
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={dir === "rtl" ? "left" : "right"} className="text-xs">
              {action.label}
              {typeof action.count === "number" && action.count > 0 && (
                <span className="ms-2 opacity-80">({action.count})</span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Mobile bottom bar */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
        data-testid="bar-mobile-actions"
      >
        <div className="flex items-center justify-around gap-1 px-2 py-2">
          {actions.filter((a) => !a.hideOnMobile).map((action) => (
            <Button
              key={action.key}
              size="sm"
              variant={action.active ? "default" : "ghost"}
              onClick={action.onClick}
              disabled={action.loading}
              aria-label={action.label}
              data-testid={(action.testId || `rail-${action.key}`) + "-mobile"}
              className="flex-col gap-0.5 h-auto py-2 px-2 text-[10px] flex-1 min-w-0"
            >
              {action.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="[&>svg]:h-4 [&>svg]:w-4">{action.icon}</span>
              )}
              <span className="truncate">{action.label}</span>
              {typeof action.count === "number" && action.count > 0 && (
                <span className="text-[9px] opacity-70">{action.count}</span>
              )}
            </Button>
          ))}
        </div>
        {/* Safe-area padding for iPhone home indicator */}
        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </div>
    </TooltipProvider>
  );
}

// Re-export common icons used by callers
export { Heart, Bookmark, Share2, MessageSquare, Volume2, VolumeX, Printer };
