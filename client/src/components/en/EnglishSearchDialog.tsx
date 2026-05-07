import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface EnglishSearchResult {
  id: string;
  title: string;
  slug: string;
  englishSlug?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  excerpt?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  views?: number | null;
  matchType: "title" | "content";
}

interface EnglishSearchResponse {
  results: EnglishSearchResult[];
  query: string;
  titleMatches: number;
  contentMatches: number;
}

interface EnglishSearchDialogProps {
  buttonClassName?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  iconClassName?: string;
}

export function EnglishSearchDialog({
  buttonClassName,
  buttonVariant = "ghost",
  iconClassName,
}: EnglishSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data, isLoading, isFetching } = useQuery<EnglishSearchResponse>({
    queryKey: ["/api/en/search", { q: debouncedQuery }],
    enabled: debouncedQuery.length >= 2,
  });

  const handleResultClick = useCallback(() => setOpen(false), []);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size="icon"
        onClick={() => setOpen(true)}
        className={buttonClassName || "shrink-0"}
        data-testid="button-search"
        aria-label="Search"
      >
        <Search className={iconClassName || "h-5 w-5"} aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden top-[20%] translate-y-0" dir="ltr">
          <VisuallyHidden>
            <DialogTitle>Search news</DialogTitle>
          </VisuallyHidden>

          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base px-0"
              data-testid="input-search"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                className="shrink-0"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {(isLoading || isFetching) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {!debouncedQuery && (
                <div className="p-6 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Type a word to search titles and articles</p>
                </div>
              )}

              {debouncedQuery && !isLoading && data?.results.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium mb-1">No results</p>
                  <p className="text-sm">Try different keywords</p>
                </div>
              )}

              {data?.results && data.results.length > 0 && (
                <div className="space-y-1">
                  {data.titleMatches > 0 && data.contentMatches > 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-1">
                      {data.titleMatches} in titles • {data.contentMatches} in content
                    </p>
                  )}

                  {data.results.map((result) => (
                    <Link
                      key={result.id}
                      href={`/en/article/${result.englishSlug || result.slug}`}
                      onClick={handleResultClick}
                    >
                      <div
                        className="flex flex-row gap-3 p-3 rounded-lg hover-elevate cursor-pointer"
                        data-testid={`search-result-${result.id}`}
                      >
                        {result.imageUrl && (
                          <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
                            <img
                              src={result.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-2 mb-1">
                            {result.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {result.categoryName && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {result.categoryName}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(result.publishedAt)}
                            </span>
                            {result.views != null && result.views >= 10000 && (
                              <span className="flex items-center gap-1 text-orange-500">
                                <TrendingUp className="h-3 w-3" />
                                {(result.views / 1000).toFixed(1)}k
                              </span>
                            )}
                            {result.matchType === "content" && (
                              <span className="text-primary/60">in content</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Press Enter to search • ESC to close
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
