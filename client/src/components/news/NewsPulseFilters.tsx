import { Search, LayoutGrid, ListOrdered, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Category } from "@shared/schema";

export type NewsTimeRange = "today" | "week" | "month" | "all";
export type NewsViewMode = "rooms" | "timeline";

interface NewsPulseFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  timeRange: NewsTimeRange;
  onTimeRangeChange: (r: NewsTimeRange) => void;
  viewMode: NewsViewMode;
  onViewModeChange: (m: NewsViewMode) => void;
  categories: Category[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const TIME_OPTIONS: { value: NewsTimeRange; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "today", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
];

export function NewsPulseFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  timeRange,
  onTimeRangeChange,
  viewMode,
  onViewModeChange,
  categories,
  hasActiveFilters,
  onClearFilters,
}: NewsPulseFiltersProps) {
  return (
    <div
      className="sticky top-16 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      data-testid="bar-news-filters"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في غرفة الأخبار..."
              className="pr-10"
              data-testid="input-news-search"
              aria-label="البحث في الأخبار"
            />
          </div>

          <div className="flex flex-1 items-center gap-2">
            <div
              className="flex items-center gap-1 rounded-md border bg-card p-1"
              role="group"
              aria-label="المدى الزمني"
            >
              {TIME_OPTIONS.map((opt) => {
                const active = timeRange === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onTimeRangeChange(opt.value)}
                    data-testid={`button-time-${opt.value}`}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>

            <div
              className="ms-auto flex items-center gap-1 rounded-md border bg-card p-1"
              role="group"
              aria-label="نمط العرض"
            >
              <Button
                type="button"
                variant={viewMode === "rooms" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("rooms")}
                aria-pressed={viewMode === "rooms"}
                data-testid="button-view-rooms"
                className="gap-1.5"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">غرف الأخبار</span>
              </Button>
              <Button
                type="button"
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("timeline")}
                aria-pressed={viewMode === "timeline"}
                data-testid="button-view-timeline"
                className="gap-1.5"
              >
                <ListOrdered className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">جدول زمني</span>
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                data-testid="button-clear-filters"
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                مسح
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <ScrollArea className="w-full" dir="rtl">
            <div className="flex gap-2 pb-2">
              <button
                type="button"
                onClick={() => onCategoryChange("all")}
                data-testid="chip-category-all"
                aria-pressed={selectedCategory === "all"}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover-elevate active-elevate-2 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                كل التصنيفات
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onCategoryChange(cat.id)}
                    data-testid={`chip-category-${cat.id}`}
                    aria-pressed={active}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover-elevate active-elevate-2 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground"
                    }`}
                    style={
                      !active && cat.color
                        ? { borderInlineEndWidth: 3, borderInlineEndColor: cat.color }
                        : undefined
                    }
                  >
                    <span>{cat.nameAr}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
