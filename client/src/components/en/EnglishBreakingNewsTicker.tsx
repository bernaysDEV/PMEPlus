import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BreakingTickerTopic, BreakingTickerHeadline } from "@shared/schema";

interface BreakingTickerData {
  topic: BreakingTickerTopic;
  headlines: BreakingTickerHeadline[];
}

interface EnglishBreakingNewsTickerProps {
  className?: string;
}

export function EnglishBreakingNewsTicker({ className }: EnglishBreakingNewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, navigate] = useLocation();

  const { data: tickerData } = useQuery<BreakingTickerData | null>({
    queryKey: ["/api/breaking-ticker/active"],
    refetchInterval: 60000,
  });

  const headlines = tickerData?.headlines || [];
  const totalHeadlines = headlines.length;

  const goToNext = useCallback(() => {
    if (totalHeadlines > 0) {
      setCurrentIndex((prev) => (prev + 1) % totalHeadlines);
    }
  }, [totalHeadlines]);

  const goToPrev = useCallback(() => {
    if (totalHeadlines > 0) {
      setCurrentIndex((prev) => (prev - 1 + totalHeadlines) % totalHeadlines);
    }
  }, [totalHeadlines]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleHeadlineClick = useCallback(() => {
    const currentHeadline = headlines[currentIndex];
    if (!currentHeadline) return;

    if (currentHeadline.linkedArticleSlug) {
      navigate(`/en/article/${currentHeadline.linkedArticleSlug}`);
    } else if (currentHeadline.linkedArticleId) {
      navigate(`/en/article/${currentHeadline.linkedArticleId}`);
    } else if (currentHeadline.externalUrl) {
      window.open(currentHeadline.externalUrl, "_blank", "noopener,noreferrer");
    }
  }, [headlines, currentIndex, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleHeadlineClick();
      }
    },
    [goToNext, goToPrev, handleHeadlineClick]
  );

  useEffect(() => {
    setCurrentIndex(0);
  }, [tickerData?.topic?.id]);

  useEffect(() => {
    if (totalHeadlines <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalHeadlines);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalHeadlines]);

  if (!tickerData || headlines.length === 0) {
    return <div style={{ minHeight: 0, height: 0, overflow: "hidden" }} aria-hidden="true" />;
  }

  const currentHeadline = headlines[currentIndex];
  const isClickable = !!(currentHeadline?.linkedArticleId || currentHeadline?.linkedArticleSlug || currentHeadline?.externalUrl);

  return (
    <div
      className={cn("w-full bg-destructive text-destructive-foreground", className)}
      dir="ltr"
      role="region"
      aria-label="Breaking news"
      aria-live="polite"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="breaking-news-ticker"
    >
      <div className="container max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Mobile */}
        <div className="sm:hidden py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span className="font-bold text-sm" data-testid="ticker-label-mobile">BREAKING</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive-foreground hover:bg-destructive-foreground/10"
                onClick={goToPrev}
                disabled={totalHeadlines <= 1}
                aria-label="Previous headline"
                data-testid="ticker-prev-mobile"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive-foreground hover:bg-destructive-foreground/10"
                onClick={goToNext}
                disabled={totalHeadlines <= 1}
                aria-label="Next headline"
                data-testid="ticker-next-mobile"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={handleHeadlineClick}
                disabled={!isClickable}
                className={cn(
                  "block w-full text-start font-medium text-sm leading-relaxed",
                  isClickable && "cursor-pointer hover:underline"
                )}
                data-testid={`ticker-headline-mobile-${currentIndex}`}
                aria-current="true"
              >
                {currentHeadline?.headline}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3 py-3">
          <div className="flex items-center gap-2 shrink-0">
            <Zap className="h-4 w-4" aria-hidden="true" />
            <span className="font-bold text-sm" data-testid="ticker-label">BREAKING</span>
          </div>

          <div className="h-4 w-px bg-destructive-foreground/30 shrink-0" aria-hidden="true" />

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={goToPrev}
            disabled={totalHeadlines <= 1}
            aria-label="Previous headline"
            data-testid="ticker-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleHeadlineClick}
                  disabled={!isClickable}
                  className={cn(
                    "block w-full text-start font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis",
                    isClickable && "cursor-pointer hover:underline"
                  )}
                  data-testid={`ticker-headline-${currentIndex}`}
                  aria-current="true"
                >
                  {currentHeadline?.headline}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={goToNext}
            disabled={totalHeadlines <= 1}
            aria-label="Next headline"
            data-testid="ticker-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {totalHeadlines > 1 && (
            <>
              <div className="h-4 w-px bg-destructive-foreground/30 shrink-0" aria-hidden="true" />

              <div
                className="flex items-center gap-1.5 shrink-0"
                role="tablist"
                aria-label="Headline indicators"
              >
                {headlines.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToIndex(index)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      index === currentIndex
                        ? "bg-destructive-foreground"
                        : "bg-destructive-foreground/40 hover:bg-destructive-foreground/60"
                    )}
                    role="tab"
                    aria-selected={index === currentIndex}
                    aria-label={`Go to headline ${index + 1} of ${totalHeadlines}`}
                    data-testid={`ticker-dot-${index}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
