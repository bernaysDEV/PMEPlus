import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LazyChunk } from "@/components/LazyChunk";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Heart,
  Bookmark,
  Share2,
  Eye,
  Clock,
  MessageSquare,
  Printer,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { EnArticleWithDetails } from "@shared/schema";
import DOMPurify from "isomorphic-dompurify";
// Stable, module-scope loader so the inline-retry version counter inside
// LazyChunk controls when the dynamic import is re-attempted.
const enAiArticleStatsLoader = () =>
  import("@/components/en/EnAiArticleStats").then((m) => m.EnAiArticleStats);
import { EnglishRecommendationsWidget } from "@/components/EnglishRecommendationsWidget";
import { EnglishFooter } from "@/components/en/EnglishFooter";
import { ImageWithCaption } from "@/components/ImageWithCaption";
import { ReadingProgressBar } from "@/components/article-detail/ReadingProgressBar";
import { ArticleHero } from "@/components/article-detail/ArticleHero";
import { SmartSummaryCard } from "@/components/article-detail/SmartSummaryCard";
import { FloatingActionRail, type RailAction } from "@/components/article-detail/FloatingActionRail";
import {
  TableOfContents,
  TableOfContentsMobile,
  type TocHeading,
} from "@/components/article-detail/TableOfContents";
import { AuthorCard } from "@/components/article-detail/AuthorCard";
import { EngagementStats } from "@/components/article-detail/EngagementStats";

function slugifyHeadingEn(text: string): string {
  return (
    "h-" +
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60)
  );
}

function injectHeadingIds(html: string): { html: string; headings: TocHeading[] } {
  if (!html || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { html, headings: [] };
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings: TocHeading[] = [];
    const used = new Set<string>();
    doc.querySelectorAll("h2, h3").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const level = tag === "h2" ? 2 : 3;
      const text = (el.textContent || "").trim();
      if (!text) return;
      let baseId = el.getAttribute("id") || slugifyHeadingEn(text);
      let id = baseId;
      let n = 1;
      while (used.has(id)) {
        id = `${baseId}-${n++}`;
      }
      used.add(id);
      el.setAttribute("id", id);
      headings.push({ id, text, level });
    });
    return { html: doc.body.innerHTML, headings };
  } catch (_e) {
    return { html, headings: [] };
  }
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "U";
}

export default function EnglishArticleDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const articleBodyRef = useRef<HTMLElement | null>(null);
  const shareSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: user } = useQuery<{ id: string; name?: string; email?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: article, isLoading } = useQuery<EnArticleWithDetails>({
    queryKey: ["/api/en/articles", slug],
    enabled: !!slug,
  });

  const { data: relatedArticlesRaw } = useQuery<any[]>({
    queryKey: [`/api/en/articles/${slug}/related`],
    enabled: !!slug,
  });
  const relatedArticles = Array.isArray(relatedArticlesRaw) ? relatedArticlesRaw : [];

  const { data: mediaAssets } = useQuery<any[]>({
    queryKey: ["/api/en/articles", article?.id, "media-assets"],
    enabled: !!article?.id,
  });

  const { data: articleTagsRaw } = useQuery<Array<{ id: string; nameAr: string; nameEn: string; slug: string }>>({
    queryKey: ["/api/articles", article?.id, "tags"],
    enabled: !!article?.id,
  });
  const articleTags = Array.isArray(articleTagsRaw) ? articleTagsRaw : [];

  const reactMutation = useMutation({
    mutationFn: async () => {
      if (!article) return;
      return await apiRequest<{ hasReacted: boolean }>(`/api/en/articles/${article.id}/react`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/en/articles", slug] });
      toast({
        title: data?.hasReacted ? "Article liked!" : "Reaction removed",
        description: data?.hasReacted ? "Thank you for your feedback" : "Your reaction has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to react to article",
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!article) return;
      return await apiRequest<{ isBookmarked: boolean }>(`/api/en/articles/${article.id}/bookmark`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/en/articles", slug] });
      toast({
        title: data?.isBookmarked ? "Article saved!" : "Bookmark removed",
        description: data?.isBookmarked ? "Added to your bookmarks" : "Removed from your bookmarks",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to bookmark article",
      });
    },
  });

  const handleReact = useCallback(() => reactMutation.mutate(), [reactMutation]);
  const handleBookmark = useCallback(() => bookmarkMutation.mutate(), [bookmarkMutation]);

  const handleShare = useCallback(async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.aiSummary || "",
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.log("Share cancelled");
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Article link copied to clipboard",
      });
    } catch {
      shareSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [article, toast]);

  const handleScrollToShare = useCallback(() => {
    shareSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePrint = useCallback(() => window.print(), []);

  // Ensure LTR direction is applied for English content
  useEffect(() => {
    const previousDir = document.documentElement.dir;
    const previousLang = document.documentElement.lang;
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.dir = previousDir || "ltr";
      document.documentElement.lang = previousLang || "en";
    };
  }, []);

  // Track article view
  useEffect(() => {
    if (article?.id) {
      fetch(`/api/en/articles/${article.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [article?.id]);

  // Update document.title for SEO
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | Property ME`;
    }
    return () => {
      document.title = "Property ME";
    };
  }, [article?.title]);

  // Derive a few summary bullets from aiSummary / excerpt for the smart card
  const aiBullets = useMemo<string[]>(() => {
    const raw = article?.aiSummary || article?.excerpt;
    if (!raw || typeof raw !== "string") return [];
    const text = raw.trim();
    if (!text) return [];
    const byLine = text
      .split(/\r?\n+/)
      .map((l) => l.replace(/^\s*[-•*–·\d.)\s]+/, "").trim())
      .filter((l) => l.length > 4);
    if (byLine.length >= 2) return byLine.slice(0, 3);
    const cleaned = text.replace(/\s+/g, " ").trim();
    const bySentence = cleaned
      .split(/(?<=[\.!\?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4);
    if (bySentence.length >= 1) return bySentence.slice(0, 3);
    return [cleaned];
  }, [article?.aiSummary, article?.excerpt]);

  const sanitizedHtml = useMemo(() => {
    if (!article?.content) return "";
    return DOMPurify.sanitize(article.content, {
      ADD_TAGS: ["iframe", "blockquote", "img"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "src", "id"],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [article?.content]);

  const { html: contentHtml, headings: tocHeadings } = useMemo(
    () => injectHeadingIds(sanitizedHtml),
    [sanitizedHtml]
  );

  const readingTime = useMemo(() => {
    if (!article?.content) return 1;
    const wordsPerMinute = 220;
    const words = article.content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute) || 1;
  }, [article?.content]);

  if (isLoading) {
    return (
      <EnglishLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-3/4 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </EnglishLayout>
    );
  }

  if (!article) {
    return (
      <EnglishLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/en">
            <Button data-testid="button-back-home">Back to Home</Button>
          </Link>
        </div>
      </EnglishLayout>
    );
  }

  // ─── Editorial / Cinematic English layout ───
  const heroImageAsset = mediaAssets?.find((asset: any) => asset.displayOrder === 0);
  const authorFirstName =
    article.author?.firstNameEn || article.author?.firstName || "";
  const authorLastName =
    article.author?.lastNameEn || article.author?.lastName || "";
  const authorEmail = article.author?.email || "";
  const authorName =
    authorFirstName && authorLastName
      ? `${authorFirstName} ${authorLastName}`
      : authorFirstName || authorEmail || "";
  const authorInitials = getInitials(authorFirstName, authorLastName, authorEmail);

  const publishedLabel = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : undefined;

  // NOTE on AR ↔ EN parity:
  // The Arabic floating action rail also exposes "Comments" (jump-to-comments)
  // and "Listen" (audio TTS) actions. The English article surface intentionally
  // omits both because the EN backend never shipped those features:
  //   - No EN comments table / endpoint exists, so a comments-jump action would
  //     point to a section that does not render.
  //   - No EN audio TTS pipeline (ElevenLabs) is wired up for EN articles.
  // Backend/scope expansion was explicitly listed as out of scope for this task,
  // so the EN rail keeps the actions whose data/handlers actually exist today
  // (like, save, share, print) and matches the AR visual treatment 1:1 for
  // every shared action.
  const railActions: RailAction[] = [
    {
      key: "like",
      icon: <Heart className={`h-4 w-4 ${article.hasReacted ? "fill-current" : ""}`} />,
      label: article.hasReacted ? "Liked" : "Like",
      active: !!article.hasReacted,
      count: article.reactionsCount || undefined,
      loading: reactMutation.isPending,
      onClick: handleReact,
      testId: "rail-button-like",
    },
    {
      key: "save",
      icon: <Bookmark className={`h-4 w-4 ${article.isBookmarked ? "fill-current" : ""}`} />,
      label: article.isBookmarked ? "Saved" : "Save",
      active: !!article.isBookmarked,
      loading: bookmarkMutation.isPending,
      onClick: handleBookmark,
      testId: "rail-button-save",
    },
    {
      key: "share",
      icon: <Share2 className="h-4 w-4" />,
      label: "Share",
      onClick: handleShare,
      testId: "rail-button-share",
    },
    {
      key: "print",
      icon: <Printer className="h-4 w-4" />,
      label: "Print",
      onClick: handlePrint,
      hideOnMobile: true,
      testId: "rail-button-print",
    },
  ];

  const engagementStats = [
    {
      key: "views",
      icon: <Eye />,
      value: (article.views ?? 0).toLocaleString("en"),
      label: "views",
      testId: "stat-views",
    },
    {
      key: "likes",
      icon: <Heart />,
      value: article.reactionsCount ?? 0,
      label: "likes",
      testId: "stat-likes",
    },
    {
      key: "reading-time",
      icon: <Clock />,
      value: readingTime,
      label: "min read",
      testId: "stat-reading-time",
    },
  ];

  return (
    <EnglishLayout>
      <ReadingProgressBar targetRef={articleBodyRef} dir="ltr" />

      <ArticleHero
        title={article.title}
        subtitle={article.subtitle || undefined}
        imageUrl={article.imageUrl || undefined}
        imageAlt={heroImageAsset?.altText || article.title}
        category={
          article.category
            ? {
                name: article.category.name,
                color: (article.category as any).color || undefined,
                icon: (article.category as any).icon || undefined,
                href: (article.category as any).slug
                  ? `/en/category/${(article.category as any).slug}`
                  : undefined,
              }
            : undefined
        }
        author={
          article.author
            ? {
                name: authorName,
                title: "Reporter",
                avatarUrl: article.author.profileImageUrl || undefined,
                initials: authorInitials,
              }
            : undefined
        }
        publishedLabel={publishedLabel}
        readingTimeLabel={`${readingTime} min read`}
        viewsLabel={
          typeof article.views === "number"
            ? `${article.views.toLocaleString("en")} views`
            : undefined
        }
        dir="ltr"
        testIdPrefix="article-hero"
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl article-mobile-pad">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12">
          {/* Main column */}
          <article ref={articleBodyRef} className="min-w-0 space-y-8">
            {/* Mobile TOC */}
            <div className="flex items-center gap-2 flex-wrap lg:hidden">
              <TableOfContentsMobile
                headings={tocHeadings}
                containerRef={articleBodyRef}
                dir="ltr"
                title="In this article"
                triggerLabel="Contents"
              />
            </div>

            {/* Engagement pills */}
            <EngagementStats stats={engagementStats} dir="ltr" />

            {/* Smart Summary card (no audio in English) */}
            <SmartSummaryCard
              bullets={aiBullets}
              fullSummary={article.aiSummary || article.excerpt || null}
              isExpanded={isSummaryExpanded}
              onExpandedChange={setIsSummaryExpanded}
              dir="ltr"
              labels={{
                title: "Smart Summary",
                readMore: "Read more",
                showLess: "Show less",
              }}
              testIdPrefix="ai-summary"
            />

            {/* Article body */}
            <div className="rounded-2xl bg-card border border-border p-5 sm:p-7 lg:p-9">
              <div
                className="article-prose with-drop-cap max-w-none"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
                data-testid="text-article-content"
              />
            </div>

            {/* Additional images */}
            {(() => {
              const mediaAdditionalImages =
                mediaAssets
                  ?.filter((asset: any) => asset.displayOrder !== 0)
                  .sort((a: any, b: any) => a.displayOrder - b.displayOrder) || [];
              const albumImages = (article as any).albumImages || [];
              if (mediaAdditionalImages.length === 0 && albumImages.length === 0) return null;

              return (
                <div className="rounded-2xl bg-card border border-border p-5 sm:p-7 space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">Gallery</h3>
                    <Badge variant="secondary" data-testid="badge-gallery-count">
                      {mediaAdditionalImages.length + albumImages.length}
                    </Badge>
                  </div>
                  <div className="space-y-8">
                    {mediaAdditionalImages.map((asset: any, index: number) => (
                      <ImageWithCaption
                        key={asset.id || `media-${index}`}
                        imageUrl={asset.url}
                        altText={asset.altText || `Image ${index + 1}`}
                        captionHtml={asset.captionHtml}
                        captionPlain={asset.captionPlain}
                        sourceName={asset.sourceName}
                        sourceUrl={asset.sourceUrl}
                        relatedArticleSlugs={asset.relatedArticleSlugs}
                        keywordTags={asset.keywordTags}
                        className="w-full"
                      />
                    ))}
                    {albumImages.map((url: string, index: number) => (
                      <ImageWithCaption
                        key={`album-${index}`}
                        imageUrl={url}
                        altText={`Image ${mediaAdditionalImages.length + index + 1}`}
                        className="w-full"
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Keywords */}
            {((article.seo?.keywords && article.seo.keywords.length > 0) || articleTags.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Related Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {articleTags.map((tag, index) => (
                    <Badge
                      key={`tag-${tag.id}`}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setLocation(`/en/keyword/${encodeURIComponent(tag.nameEn || tag.nameAr)}`)}
                      data-testid={`badge-tag-${index}`}
                    >
                      {tag.nameEn || tag.nameAr}
                    </Badge>
                  ))}
                  {articleTags.length === 0 &&
                    article.seo?.keywords?.map((keyword, index) => (
                      <Badge
                        key={`seo-${index}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setLocation(`/en/keyword/${encodeURIComponent(keyword)}`)}
                        data-testid={`badge-keyword-${index}`}
                      >
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Author bio card */}
            {article.author && (
              <AuthorCard
                name={authorName}
                initials={authorInitials}
                title="Reporter"
                bio={(article.author as any)?.bio || undefined}
                avatarUrl={article.author.profileImageUrl || undefined}
                dir="ltr"
                testIdPrefix="author-card"
              />
            )}

            {/* Engagement & Share */}
            <div
              ref={shareSectionRef}
              className="rounded-2xl bg-card border border-border p-5 sm:p-7 space-y-5"
              data-testid="section-share"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Share this article</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={article.hasReacted ? "default" : "outline"}
                  size="sm"
                  onClick={handleReact}
                  disabled={!user || reactMutation.isPending}
                  className="gap-2"
                  data-testid="button-like"
                >
                  <Heart className={`w-4 h-4 ${article.hasReacted ? "fill-current" : ""}`} />
                  {article.hasReacted ? "Liked" : "Like"}
                  {article.reactionsCount && article.reactionsCount > 0
                    ? ` (${article.reactionsCount})`
                    : ""}
                </Button>

                <Button
                  variant={article.isBookmarked ? "default" : "outline"}
                  size="sm"
                  onClick={handleBookmark}
                  disabled={!user || bookmarkMutation.isPending}
                  className="gap-2"
                  data-testid="button-bookmark"
                >
                  <Bookmark className={`w-4 h-4 ${article.isBookmarked ? "fill-current" : ""}`} />
                  {article.isBookmarked ? "Saved" : "Save"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="hidden lg:block">
              <TableOfContents
                headings={tocHeadings}
                containerRef={articleBodyRef}
                dir="ltr"
                title="In this article"
              />
            </div>

            <LazyChunk
              loader={enAiArticleStatsLoader}
              fallback={<Skeleton className="h-48 w-full" />}
              testId="lazy-en-ai-article-stats"
              errorLabel="Couldn't load this section"
              retryLabel="Retry"
              render={(EnAiArticleStats) => (
                <EnAiArticleStats slug={slug || ""} />
              )}
            />

            {relatedArticles.length > 0 && (
              <EnglishRecommendationsWidget
                articles={relatedArticles}
                title="Related Articles"
                reason="You might also like"
              />
            )}
          </aside>
        </div>
      </main>

      {/* Floating action rail (desktop) + sticky bottom bar (mobile) */}
      <FloatingActionRail actions={railActions} dir="ltr" />

      <EnglishFooter />
    </EnglishLayout>
  );
}
