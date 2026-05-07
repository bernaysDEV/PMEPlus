import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SecondaryStoryCard } from "./SecondaryStoryCard";
import type { ArticleWithDetails, Category } from "@shared/schema";

interface CategoryStreamRowProps {
  category: Category;
  articles: ArticleWithDetails[];
}

export function CategoryStreamRow({
  category,
  articles,
}: CategoryStreamRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    const el = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (!el) return;
    // RTL: positive delta should scroll toward start visually
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (articles.length === 0) return null;

  return (
    <section
      className="space-y-3"
      data-testid={`section-stream-${category.id}`}
      aria-label={`تيار ${category.nameAr}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Link href={`/category/${category.slug}`}>
          <h3
            className="flex items-center gap-2 text-lg font-bold hover:text-primary"
            data-testid={`heading-stream-${category.id}`}
          >
            <span
              className="inline-block h-5 w-1 rounded-sm"
              style={{ backgroundColor: category.color || "hsl(var(--primary))" }}
              aria-hidden
            />
            {category.nameAr}
            <span className="text-xs font-normal text-muted-foreground">
              ({articles.length})
            </span>
          </h3>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollBy(300)}
            aria-label="تمرير إلى اليمين"
            data-testid={`button-stream-prev-${category.id}`}
            className="hidden sm:inline-flex"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollBy(-300)}
            aria-label="تمرير إلى اليسار"
            data-testid={`button-stream-next-${category.id}`}
            className="hidden sm:inline-flex"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1"
            data-testid={`link-stream-all-${category.id}`}
          >
            <Link href={`/category/${category.slug}`}>
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="w-full" dir="rtl">
        <div className="flex gap-4 pb-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="w-[260px] shrink-0 sm:w-[280px]"
              data-testid={`stream-item-${category.id}-${article.id}`}
            >
              <SecondaryStoryCard article={article} size="sm" />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
