import { useEffect, useMemo, useState } from "react";
import { List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function extractTocHeadings(html: string): TocHeading[] {
  if (!html) return [];
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return [];
  }

  const headings: TocHeading[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const used = new Set<string>();
    doc.querySelectorAll("h2, h3").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const level = tag === "h2" ? 2 : 3;
      const text = (el.textContent || "").trim();
      if (!text) return;
      let baseId = el.getAttribute("id") || slugify(text);
      let id = baseId;
      let n = 1;
      while (used.has(id)) {
        id = `${baseId}-${n++}`;
      }
      used.add(id);
      headings.push({ id, text, level });
    });
  } catch (_e) {
    // ignore parsing errors
  }
  return headings;
}

function slugify(text: string): string {
  return (
    "h-" +
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60)
  );
}

interface TableOfContentsProps {
  headings: TocHeading[];
  containerRef: React.RefObject<HTMLElement>;
  dir?: "rtl" | "ltr";
  title?: string;
  testIdPrefix?: string;
}

function useActiveHeading(headings: TocHeading[], containerRef: React.RefObject<HTMLElement>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!headings.length) return;
    const container = containerRef.current;
    if (!container) return;

    const calc = () => {
      const offset = 120;
      let current: string | null = null;
      for (const h of headings) {
        const el = container.querySelector(`#${CSS.escape(h.id)}`) as HTMLElement | null;
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) {
          current = h.id;
        } else {
          break;
        }
      }
      if (!current && headings.length) current = headings[0].id;
      setActiveId(current);
    };

    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [headings, containerRef]);

  return activeId;
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: "smooth" });
}

export function TableOfContents({
  headings,
  containerRef,
  dir = "rtl",
  title,
  testIdPrefix = "toc",
}: TableOfContentsProps) {
  const activeId = useActiveHeading(headings, containerRef);
  const t = title ?? (dir === "rtl" ? "محتوى المقال" : "In this article");

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label={t}
      dir={dir}
      className="rounded-xl border border-border bg-card p-4 sticky top-24"
      data-testid={`${testIdPrefix}-desktop`}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <List className="h-3.5 w-3.5" />
        {t}
      </h3>
      <ol className="space-y-1.5 list-none m-0 p-0 text-sm">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? (dir === "rtl" ? "pr-3" : "pl-3") : ""}
          >
            <button
              type="button"
              onClick={() => scrollToHeading(h.id)}
              className={`group block w-full text-start py-1 leading-snug rounded-sm transition-colors ${
                activeId === h.id
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`${testIdPrefix}-link-${h.id}`}
            >
              <span className="line-clamp-2">{h.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface TableOfContentsMobileProps extends TableOfContentsProps {
  triggerLabel?: string;
}

export function TableOfContentsMobile({
  headings,
  containerRef,
  dir = "rtl",
  title,
  triggerLabel,
  testIdPrefix = "toc-mobile",
}: TableOfContentsMobileProps) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveHeading(headings, containerRef);
  const t = title ?? (dir === "rtl" ? "محتوى المقال" : "In this article");
  const trigger = triggerLabel ?? (dir === "rtl" ? "محتوى المقال" : "Contents");
  if (headings.length < 2) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid={`${testIdPrefix}-trigger`}
        >
          <List className="h-4 w-4" />
          {trigger}
        </Button>
      </SheetTrigger>
      <SheetContent side={dir === "rtl" ? "right" : "left"} dir={dir} className="w-[85%] sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{t}</SheetTitle>
        </SheetHeader>
        <ol className="mt-4 space-y-1 list-none m-0 p-0 text-sm overflow-y-auto max-h-[calc(100vh-6rem)]">
          {headings.map((h) => (
            <li
              key={h.id}
              className={h.level === 3 ? (dir === "rtl" ? "pr-3" : "pl-3") : ""}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => scrollToHeading(h.id), 80);
                }}
                className={`block w-full text-start py-2 leading-snug rounded-md px-2 transition-colors ${
                  activeId === h.id
                    ? "text-primary font-semibold bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`${testIdPrefix}-link-${h.id}`}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
