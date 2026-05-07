import { useParams } from "wouter";
import { getObjectPosition } from "@/lib/imageUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CommentSection } from "@/components/CommentSection";
import { ArticlePoll } from "@/components/ArticlePoll";
import { RecommendationsWidget } from "@/components/RecommendationsWidget";
import { AIRecommendationsBlock } from "@/components/AIRecommendationsBlock";
import { RelatedOpinionsSection } from "@/components/RelatedOpinionsSection";
import { Paywall } from "@/components/Paywall";
import StoryTimeline from "@/components/StoryTimeline";
import FollowStoryButton from "@/components/FollowStoryButton";
import { SocialShareBar } from "@/components/SocialShareBar";
import { ImageWithCaption } from "@/components/ImageWithCaption";
import { VideoPlayer } from "@/components/VideoPlayer";
import { InfographicDetail } from "@/components/InfographicDetail";
import { DataInfographicPage } from "@/components/data-infographic/DataInfographicPage";
import { SmartInsights } from "@/components/SmartInsights";
import { WeeklyPhotosDisplay } from "@/components/WeeklyPhotosDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBehaviorTracking } from "@/hooks/useBehaviorTracking";
import { useArticleReadTracking } from "@/hooks/useArticleReadTracking";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Heart,
  Bookmark,
  Share2,
  Lightbulb,
  Loader2,
  Eye,
  MessageSquare,
  Printer,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatArticleTimestamp } from "@/lib/formatTime";
import type { ArticleWithDetails, CommentWithUser } from "@shared/schema";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { LazyChunk } from "@/components/LazyChunk";
import DOMPurify from "isomorphic-dompurify";
import { ReadingProgressBar } from "@/components/article-detail/ReadingProgressBar";
import { ArticleHero } from "@/components/article-detail/ArticleHero";
import { SmartSummaryCard } from "@/components/article-detail/SmartSummaryCard";
import { FloatingActionRail, type RailAction } from "@/components/article-detail/FloatingActionRail";
import {
  TableOfContents,
  TableOfContentsMobile,
  extractTocHeadings,
  type TocHeading,
} from "@/components/article-detail/TableOfContents";
import { AuthorCard } from "@/components/article-detail/AuthorCard";
import { EngagementStats } from "@/components/article-detail/EngagementStats";

// Stable, module-scope loader so the inline-retry version counter inside
// LazyChunk controls when the dynamic import is re-attempted.
const aiArticleStatsLoader = () =>
  import("@/components/AiArticleStats").then((m) => m.AiArticleStats);

function slugifyHeading(text: string): string {
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

/**
 * Inject stable IDs onto h2/h3 headings inside the sanitized HTML so the TOC
 * can scroll to them. Returns the same HTML string with id attributes added.
 */
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
      let baseId = el.getAttribute("id") || slugifyHeading(text);
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

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { logBehavior } = useBehaviorTracking();
  const [, setLocation] = useLocation();

  const articleBodyRef = useRef<HTMLElement | null>(null);
  const shareSectionRef = useRef<HTMLDivElement | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  // Audio player state
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Smart summary collapsible state (persisted in localStorage)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("article:isSummaryExpanded") === "true";
    } catch {
      return false;
    }
  });
  // Smart insights toggle state (persisted in localStorage)
  const [isInsightsOpen, setIsInsightsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("article:isInsightsOpen") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("article:isSummaryExpanded", String(isSummaryExpanded));
    } catch {}
  }, [isSummaryExpanded]);

  useEffect(() => {
    try {
      window.localStorage.setItem("article:isInsightsOpen", String(isInsightsOpen));
    } catch {}
  }, [isInsightsOpen]);

  const { data: user } = useQuery<{ id: string; name?: string; email?: string; role?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: article, isLoading } = useQuery<ArticleWithDetails>({
    queryKey: ["/api/articles", slug],
    staleTime: 1000 * 60 * 5,
  });

  // Parse stored aiSummary text into up to 3 bullets (no extra request needed)
  const storedBullets = useMemo<string[]>(() => {
    const raw = article?.aiSummary;
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
      .split(/(?<=[\.!\?؟])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4);
    if (bySentence.length >= 1) return bySentence.slice(0, 3);
    return [cleaned];
  }, [article?.aiSummary]);

  // If no stored summary, generate bullets in the background via API
  const shouldFetchBullets = !!article?.id && storedBullets.length === 0;
  const { data: bulletsData, isLoading: isLoadingBullets } = useQuery<{ bullets: string[] }>({
    queryKey: ["/api/articles", slug, "ai-bullets"],
    enabled: shouldFetchBullets,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
  const aiBullets = storedBullets.length > 0 ? storedBullets : (bulletsData?.bullets || []);

  // Track local reading history (for personal "match score" computation)
  useEffect(() => {
    if (!article?.id) return;
    const articleId = article.id;
    const startedAt = Date.now();
    let cancelled = false;
    let updateOnUnload: (() => void) | null = null;

    import("@/lib/readingHistory").then(({ recordArticleRead, updateTimeSpent }) => {
      if (cancelled) return;
      recordArticleRead(article, 0);
      updateOnUnload = () => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        updateTimeSpent(articleId, seconds);
      };
      window.addEventListener("beforeunload", updateOnUnload);
    });

    return () => {
      cancelled = true;
      if (updateOnUnload) {
        updateOnUnload();
        window.removeEventListener("beforeunload", updateOnUnload);
        updateOnUnload = null;
      }
    };
  }, [article?.id, article]);

  // Redirect opinion articles to their dedicated page
  useEffect(() => {
    if (article?.articleType === "opinion" && slug) {
      setLocation(`/opinion/${slug}`);
    }
  }, [article?.articleType, slug, setLocation]);

  // Silently update URL to use short englishSlug for better social sharing
  useEffect(() => {
    if (article?.englishSlug && slug !== article.englishSlug) {
      const newPath = `/article/${article.englishSlug}`;
      window.history.replaceState(null, "", newPath);
    }
  }, [article?.englishSlug, slug]);

  const { data: commentsRaw } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/articles", slug, "comments"],
    staleTime: 1000 * 60 * 2,
  });
  const comments = Array.isArray(commentsRaw) ? commentsRaw : [];

  // Combined sidebar data for faster loading
  const { data: sidebarData } = useQuery<{
    related: ArticleWithDetails[];
    tags: Array<{ id: string; nameAr: string; nameEn: string; slug: string }>;
    mediaAssets: any[];
  }>({
    queryKey: ["/api/articles", slug, "sidebar"],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  const relatedArticles = sidebarData?.related || [];
  const articleTags = sidebarData?.tags || [];
  const mediaAssets = sidebarData?.mediaAssets;

  const searchParams = new URLSearchParams(window.location.search);
  const guestToken = searchParams.get("token");

  const { data: purchaseStatus, isLoading: isLoadingPurchaseStatus } = useQuery<{ hasPurchased: boolean }>({
    queryKey: ["/api/payments/check-purchase", article?.id],
    queryFn: async () => {
      const url = `/api/payments/check-purchase/${article?.id}${guestToken ? `?token=${guestToken}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to check purchase status");
      return response.json();
    },
    enabled: !!article?.isPaid && !!article?.id,
  });

  const resolvedAuthor = useMemo(
    () =>
      article?.articleType === "opinion"
        ? article?.opinionAuthor
        : article?.author,
    [article?.articleType, article?.opinionAuthor, article?.author]
  );

  // Fetch existing short link for article (idempotent GET first)
  const { data: existingShortLink, isLoading: isLoadingShortLink } = useQuery<{ shortCode: string; originalUrl: string } | null>({
    queryKey: ["/api/shortlinks/article", article?.id],
    queryFn: async () => {
      if (!article?.id) return null;
      try {
        const response = await fetch(`/api/shortlinks/article/${article.id}`, {
          credentials: "include",
        });
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new Error(`${response.status}: ${await response.text()}`);
        }
        return await response.json();
      } catch (error) {
        console.error("[ShortLink] Error fetching:", error);
        return null;
      }
    },
    enabled: !!article?.id,
    staleTime: Infinity,
    retry: false,
  });

  const createShortLinkMutation = useMutation({
    mutationFn: async () => {
      if (!article) throw new Error("Article not loaded");
      const response = await apiRequest("/api/shortlinks", {
        method: "POST",
        body: JSON.stringify({
          originalUrl: `https://sabq.org/article/${slug}`,
          articleId: article.id,
          utmMedium: "social",
          utmCampaign: "article_share",
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/shortlinks/article", article?.id], data);
    },
    onError: (error) => {
      console.error("[ShortLink] Error creating short link:", error);
    },
  });

  useEffect(() => {
    if (
      article?.id &&
      !isLoadingShortLink &&
      !existingShortLink &&
      !createShortLinkMutation.isPending &&
      !createShortLinkMutation.isSuccess &&
      !createShortLinkMutation.data &&
      !createShortLinkMutation.isError
    ) {
      createShortLinkMutation.mutate();
    }
  }, [article?.id, isLoadingShortLink, existingShortLink]);

  const shortLink = existingShortLink || createShortLinkMutation.data;

  const { logArticleView } = useArticleReadTracking({
    articleId: article?.id || "",
    enabled: !!article && !!user,
  });

  // Ensure RTL direction is applied for Arabic content
  useEffect(() => {
    const previousDir = document.documentElement.dir;
    const previousLang = document.documentElement.lang;
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    return () => {
      document.documentElement.dir = previousDir || "ltr";
      document.documentElement.lang = previousLang || "en";
    };
  }, []);

  useEffect(() => {
    if (article && user) {
      logArticleView();
    }
  }, [article?.id, user?.id]);

  // Update document.title for SEO
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | بروبرتي ME`;
    }
    return () => {
      document.title = "بروبرتي ME";
    };
  }, [article?.title]);

  // Track article view via POST request on every page load
  useEffect(() => {
    if (!article?.id) return;
    fetch(`/api/articles/${article.id}/view`, { method: "POST" })
      .then(r => r.json())
      .then(data => console.log("[View] Tracked:", data))
      .catch(err => console.error("[View] Error:", err));
  }, [article?.id]);

  // Load Twitter widgets script and render embedded tweets with theme support
  useEffect(() => {
    if (!article?.content) return;

    const applyThemeToTweets = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const theme = isDark ? "dark" : "light";
      const tweetBlocks = document.querySelectorAll("blockquote.twitter-tweet");
      tweetBlocks.forEach((block) => {
        block.setAttribute("data-theme", theme);
      });
    };

    applyThemeToTweets();

    const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');

    if (existingScript && (window as any).twttr?.widgets) {
      console.log("[ArticleDetail] Twitter widgets already loaded, rendering tweets");
      (window as any).twttr.widgets.load();
    } else if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.onload = () => {
        console.log("[ArticleDetail] Twitter widgets script loaded successfully");
        applyThemeToTweets();
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load();
        }
      };
      script.onerror = () => {
        console.error("[ArticleDetail] Failed to load Twitter widgets script");
      };
      document.body.appendChild(script);
    }

    let previousTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      if (currentTheme !== previousTheme) {
        previousTheme = currentTheme;
        console.log("[ArticleDetail] Theme changed to", currentTheme);
        applyThemeToTweets();
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [article?.content]);

  useEffect(() => {
    if (!article) return;

    let tag = document.querySelector('meta[name="googlebot-news"]') as HTMLMetaElement;
    let created = false;

    if (article.publishedAt) {
      const pubDate = new Date(article.publishedAt);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (pubDate < thirtyDaysAgo) {
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute("name", "googlebot-news");
          document.head.appendChild(tag);
          created = true;
        }
        tag.content = "noindex";
      } else {
        if (tag) {
          tag.parentNode?.removeChild(tag);
          tag = null as any;
        }
      }
    }

    return () => {
      if (created && tag?.parentNode) {
        tag.parentNode.removeChild(tag);
      }
    };
  }, [article?.id, article?.publishedAt]);

  // Add ImageObject JSON-LD for image SEO
  useEffect(() => {
    if (!article?.imageUrl) return;

    const heroAsset = mediaAssets?.find((asset: any) => asset.displayOrder === 0);
    const absoluteImageUrl = article.imageUrl.startsWith("http")
      ? article.imageUrl
      : `${window.location.origin}${article.imageUrl}`;

    const imageObject: any = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "contentUrl": absoluteImageUrl,
      "url": absoluteImageUrl,
      "caption": heroAsset?.captionPlain || article.title,
      "description": heroAsset?.altText || article.title,
    };

    if (heroAsset?.keywordTags && heroAsset.keywordTags.length > 0) {
      imageObject["keywords"] = heroAsset.keywordTags.join(", ");
    } else if (article.seo?.keywords && article.seo.keywords.length > 0) {
      imageObject["keywords"] = article.seo.keywords.join(", ");
    }

    if (heroAsset?.sourceName) {
      imageObject["author"] = {
        "@type": "Organization",
        "name": heroAsset.sourceName,
      };
      if (heroAsset.sourceUrl) {
        imageObject["author"]["url"] = heroAsset.sourceUrl;
      }
    }

    if (heroAsset?.rightsStatement) {
      imageObject["copyrightNotice"] = heroAsset.rightsStatement;
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(imageObject);
    script.id = "image-structured-data";
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("image-structured-data");
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [article?.id, article?.imageUrl, mediaAssets]);

  // Add Open Graph and Twitter Cards meta tags
  useEffect(() => {
    if (!article) return;

    const seoTitle = article.seo?.metaTitle || article.title;
    const seoDescription = article.seo?.metaDescription || article.excerpt || article.aiSummary || "";

    let seoImage = article.imageUrl || `${window.location.origin}/og-image.png`;
    if (article.imageUrl && !article.imageUrl.startsWith("http")) {
      seoImage = `${window.location.origin}${article.imageUrl}`;
    }

    const seoUrl = window.location.href;
    const heroAsset = mediaAssets?.find((asset: any) => asset.displayOrder === 0);
    const imageAlt = heroAsset?.altText || article.title;

    const originalValues = new Map<HTMLMetaElement, string>();
    const createdTags: HTMLMetaElement[] = [];

    const updateMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
        createdTags.push(tag);
      } else {
        originalValues.set(tag, tag.content);
      }
      tag.content = content;
      return tag;
    };

    updateMetaTag("og:type", "article");
    updateMetaTag("og:title", seoTitle);
    updateMetaTag("og:description", seoDescription);
    updateMetaTag("og:image", seoImage);
    updateMetaTag("og:url", seoUrl);
    updateMetaTag("og:site_name", "بروبرتي ME");
    updateMetaTag("og:locale", "ar_SA");

    if (article.imageUrl) {
      updateMetaTag("og:image:alt", imageAlt);
      updateMetaTag("og:image:type", "image/jpeg");
      updateMetaTag("og:image:width", "1200");
      updateMetaTag("og:image:height", "630");
    }

    if (article.publishedAt) {
      updateMetaTag("article:published_time", new Date(article.publishedAt).toISOString());
    }
    if (article.updatedAt && article.publishedAt) {
      const pubMs = new Date(article.publishedAt).getTime();
      const updMs = new Date(article.updatedAt).getTime();
      const articleAgeMs = Date.now() - pubMs;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const safeModified =
        articleAgeMs > thirtyDaysMs && updMs - pubMs > 7 * 24 * 60 * 60 * 1000
          ? new Date(article.publishedAt).toISOString()
          : new Date(article.updatedAt).toISOString();
      updateMetaTag("article:modified_time", safeModified);
    } else if (article.updatedAt) {
      updateMetaTag("article:modified_time", new Date(article.updatedAt).toISOString());
    }
    if (article.category?.nameAr) {
      updateMetaTag("article:section", article.category.nameAr);
    }

    updateMetaTag("twitter:card", "summary_large_image", true);
    updateMetaTag("twitter:title", seoTitle, true);
    updateMetaTag("twitter:description", seoDescription, true);
    updateMetaTag("twitter:image", seoImage, true);
    if (article.imageUrl) {
      updateMetaTag("twitter:image:alt", imageAlt, true);
    }

    updateMetaTag("description", seoDescription, true);
    if (article.seo?.keywords && article.seo.keywords.length > 0) {
      updateMetaTag("keywords", article.seo.keywords.join(", "), true);
    }

    return () => {
      createdTags.forEach((tag) => {
        if (tag.parentNode) tag.parentNode.removeChild(tag);
      });
      originalValues.forEach((originalContent, tag) => {
        if (tag.parentNode) tag.content = originalContent;
      });
    };
  }, [article?.id, article?.seo, article?.imageUrl, mediaAssets]);

  const reactMutation = useMutation({
    mutationFn: async () => {
      if (!article) return;
      return await apiRequest(`/api/articles/${article.id}/react`, { method: "POST" });
    },
    onSuccess: () => {
      if (article) logBehavior("reaction_add", { articleId: article.id });
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "تسجيل دخول مطلوب",
          description: "يجب تسجيل الدخول للتفاعل مع المقالات",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message || "فشل في التفاعل",
          variant: "destructive",
        });
      }
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!article) return;
      return await apiRequest(`/api/articles/${article.id}/bookmark`, { method: "POST" });
    },
    onSuccess: (result: any) => {
      if (article) {
        logBehavior(
          result?.isBookmarked ? "bookmark_add" : "bookmark_remove",
          { articleId: article.id }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
      toast({
        title: "تم الحفظ",
        description: "تم تحديث المقالات المحفوظة",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "تسجيل دخول مطلوب",
          description: "يجب تسجيل الدخول لحفظ المقالات",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message || "فشل في الحفظ",
          variant: "destructive",
        });
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      return await apiRequest(`/api/articles/${slug}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      if (article) logBehavior("comment_create", { articleId: article.id });
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug, "comments"] });
      toast({
        title: "شكراً لمشاركتك",
        description:
          "يتم تحليل تعليقك الآن بواسطة الذكاء الاصطناعي للتأكد من التزامه بمعايير المجتمع. سيُنشر تلقائياً إذا كان آمناً.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "تسجيل دخول مطلوب",
          description: "يجب تسجيل الدخول لإضافة تعليق",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message || "فشل في إضافة التعليق",
          variant: "destructive",
        });
      }
    },
  });

  const handleReact = useCallback(() => {
    reactMutation.mutate();
  }, [reactMutation]);

  const handleBookmark = useCallback(() => {
    bookmarkMutation.mutate();
  }, [bookmarkMutation]);

  const handleComment = useCallback(
    (content: string, parentId?: string) => {
      commentMutation.mutate({ content, parentId });
    },
    [commentMutation]
  );

  const handlePlayAudio = useCallback(async () => {
    if (!article?.aiSummary && !article?.excerpt) {
      toast({
        title: "لا يوجد محتوى",
        description: "الموجز الذكي غير متوفر لهذا المقال",
        variant: "destructive",
      });
      return;
    }

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error resuming audio:", error);
        toast({
          title: "خطأ",
          description: "فشل تشغيل الموجز الصوتي",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      setIsLoadingAudio(true);
      const timestamp = article?.updatedAt
        ? new Date(article.updatedAt).toISOString()
        : new Date().toISOString();
      const audioUrl = `/api/articles/${slug}/summary-audio?v=${encodeURIComponent(timestamp)}&tts=google-v1`;
      audioRef.current = new Audio(audioUrl);

      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        toast({
          title: "خطأ",
          description: "فشل تشغيل الموجز الصوتي",
          variant: "destructive",
        });
        setIsPlaying(false);
        setIsLoadingAudio(false);
      });
      audioRef.current.addEventListener(
        "canplaythrough",
        async () => {
          if (audioRef.current) {
            try {
              await audioRef.current.play();
              setIsPlaying(true);
              setIsLoadingAudio(false);
            } catch (playError) {
              console.error("Error playing audio:", playError);
              toast({
                title: "خطأ",
                description: "فشل تشغيل الموجز الصوتي",
                variant: "destructive",
              });
              setIsLoadingAudio(false);
            }
          }
        },
        { once: true }
      );
      audioRef.current.load();
    } catch (error) {
      console.error("Error loading audio:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل الموجز الصوتي",
        variant: "destructive",
      });
      setIsLoadingAudio(false);
    }
  }, [article?.aiSummary, article?.excerpt, article?.updatedAt, slug, toast]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [slug]);

  const timeAgo = article?.publishedAt
    ? formatArticleTimestamp(article.publishedAt, { format: "relative", locale: "ar" })
    : null;

  const getInitials = useCallback(
    (firstName?: string | null, lastName?: string | null, email?: string) => {
      if (firstName && lastName) {
        return `${firstName?.[0]}${lastName?.[0]}`.toUpperCase();
      }
      if (firstName) return firstName?.[0].toUpperCase();
      if (email) return email[0].toUpperCase();
      return "م";
    },
    []
  );

  const readingTime = (() => {
    if (!article?.content) return 1;
    const wordsPerMinute = 200;
    const words = article.content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute) || 1;
  })();

  // Sanitize content + inject heading IDs for TOC
  const sanitizedHtml = useMemo(() => {
    if (!article?.content) return "";
    return DOMPurify.sanitize(article.content, {
      ADD_TAGS: ["iframe", "blockquote", "img"],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "scrolling",
        "src",
        "data-lang",
        "data-theme",
        "data-video-embed",
        "data-url",
        "data-embed-url",
        "class",
        "alt",
        "loading",
        "width",
        "height",
        "id",
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [article?.content]);

  const isPaywalled = !!article?.isPaid && !purchaseStatus?.hasPurchased;

  const { html: contentHtml, headings: tocHeadings } = useMemo(() => {
    // When the article is locked behind the paywall, do not generate or expose
    // the TOC outline derived from the full article body — that would leak the
    // structure of paid content. Headings are recomputed once the user has
    // purchased access.
    if (isPaywalled) return { html: sanitizedHtml, headings: [] as TocHeading[] };
    return injectHeadingIds(sanitizedHtml);
  }, [sanitizedHtml, isPaywalled]);

  // Reading progress bar — hide once user scrolls past the article body
  const handleScrollToShare = useCallback(() => {
    shareSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleScrollToComments = useCallback(() => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted relative z-10">
        <Header user={user} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="w-full aspect-[16/9] mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-muted relative z-10">
        <Header user={user} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">المقال غير موجود</h1>
            <p className="text-muted-foreground mb-8">
              عذراً، لم نتمكن من العثور على المقال المطلوب
            </p>
            <Button asChild>
              <Link href="/">
                <a>العودة للرئيسية</a>
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Infographic article: render the existing custom components unchanged
  if (article.articleType === "infographic") {
    if (article.infographicType === "data" && article.infographicData) {
      return (
        <div className="min-h-screen bg-muted relative z-10" dir="rtl">
          <Header user={user} />
          <DataInfographicPage
            article={article}
            onReact={handleReact}
            onBookmark={handleBookmark}
            hasReacted={article.hasReacted}
            isBookmarked={article.isBookmarked}
            shortLink={shortLink}
          />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <ArticlePoll articleId={article.id} />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <Separator className="mb-8" />
            <CommentSection
              articleId={article.id}
              comments={comments}
              currentUser={user}
              onSubmitComment={handleComment}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-muted relative z-10" dir="rtl">
        <Header user={user} />
        <InfographicDetail
          article={article}
          onReact={handleReact}
          onBookmark={handleBookmark}
          hasReacted={article.hasReacted}
          isBookmarked={article.isBookmarked}
          shortLink={shortLink}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <ArticlePoll articleId={article.id} />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Separator className="mb-8" />
          <CommentSection
            articleId={article.id}
            comments={comments}
            currentUser={user}
            onSubmitComment={handleComment}
          />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Editorial / Cinematic article layout
  // ─────────────────────────────────────────────────────────────────────

  const authorFirstName = resolvedAuthor?.firstName || "";
  const authorLastName = resolvedAuthor?.lastName || "";
  const authorEmail = resolvedAuthor?.email || "";
  const authorName =
    authorFirstName && authorLastName
      ? `${authorFirstName} ${authorLastName}`
      : authorFirstName || authorEmail || "";
  const authorInitials = getInitials(authorFirstName, authorLastName, authorEmail);
  const profileLink = article.staff ? `/reporter/${article.staff.slug}` : undefined;
  const heroImageAsset = mediaAssets?.find((asset: any) => asset.displayOrder === 0);

  const railActions: RailAction[] = [
    {
      key: "like",
      icon: <Heart className={`h-4 w-4 ${article.hasReacted ? "fill-current" : ""}`} />,
      label: article.hasReacted ? "أعجبني" : "إعجاب",
      active: !!article.hasReacted,
      count: article.reactionsCount || undefined,
      loading: reactMutation.isPending,
      onClick: handleReact,
      testId: "rail-button-like",
    },
    {
      key: "save",
      icon: <Bookmark className={`h-4 w-4 ${article.isBookmarked ? "fill-current" : ""}`} />,
      label: article.isBookmarked ? "محفوظ" : "حفظ",
      active: !!article.isBookmarked,
      loading: bookmarkMutation.isPending,
      onClick: handleBookmark,
      testId: "rail-button-save",
    },
    {
      key: "comments",
      icon: <MessageSquare className="h-4 w-4" />,
      label: "التعليقات",
      count: article.commentsCount || comments.length || undefined,
      onClick: handleScrollToComments,
      testId: "rail-button-comments",
    },
    {
      key: "share",
      icon: <Share2 className="h-4 w-4" />,
      label: "مشاركة",
      onClick: handleScrollToShare,
      testId: "rail-button-share",
    },
    {
      key: "listen",
      icon: isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />,
      label: isPlaying ? "إيقاف" : "استماع",
      active: isPlaying,
      loading: isLoadingAudio,
      onClick: handlePlayAudio,
      testId: "rail-button-listen",
    },
    {
      key: "print",
      icon: <Printer className="h-4 w-4" />,
      label: "طباعة",
      onClick: handlePrint,
      hideOnMobile: true,
      testId: "rail-button-print",
    },
  ];

  const engagementStats = [
    {
      key: "views",
      icon: <Eye />,
      value: (article as any).views?.toLocaleString("ar") ?? "0",
      label: "مشاهدة",
      testId: "stat-views",
    },
    {
      key: "comments",
      icon: <MessageSquare />,
      value: article.commentsCount ?? comments.length ?? 0,
      label: "تعليق",
      testId: "stat-comments",
    },
    {
      key: "likes",
      icon: <Heart />,
      value: article.reactionsCount ?? 0,
      label: "إعجاب",
      testId: "stat-likes",
    },
    {
      key: "reading-time",
      icon: <Clock />,
      value: readingTime,
      label: "د قراءة",
      testId: "stat-reading-time",
    },
  ];

  const isArchivedVisible =
    article.status === "archived" &&
    (user?.role === "system_admin" || user?.role === "admin" || user?.role === "editor");

  const publisherLine =
    (article as any).publisher?.agencyName ? (
      <span data-testid="text-publisher-name">
        أُرسل بواسطة:&nbsp;
        <span className="font-semibold text-white">
          {(article as any).publisher.agencyName}
        </span>
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-muted relative z-10" dir="rtl">
      <ReadingProgressBar targetRef={articleBodyRef} />
      <Header user={user} />

      {/* Cinematic full-bleed hero */}
      <ArticleHero
        title={article.title}
        subtitle={article.subtitle || undefined}
        imageUrl={article.imageUrl || undefined}
        imageAlt={heroImageAsset?.altText || article.title}
        objectPosition={getObjectPosition(article)}
        category={
          article.category
            ? {
                name: article.category.nameAr,
                color: article.category.color || undefined,
                icon: article.category.icon || undefined,
                href: article.category.slug ? `/category/${article.category.slug}` : undefined,
              }
            : undefined
        }
        isBreaking={article.newsType === "breaking"}
        isArchived={isArchivedVisible}
        isAiGenerated={!!article.aiGenerated}
        author={
          resolvedAuthor
            ? {
                name: authorName,
                title: (article.staff as any)?.title || undefined,
                avatarUrl: resolvedAuthor.profileImageUrl || undefined,
                initials: authorInitials,
                profileLink,
                isVerified: !!article.staff?.isVerified,
              }
            : undefined
        }
        publishedLabel={timeAgo || undefined}
        readingTimeLabel={`${readingTime} د قراءة`}
        viewsLabel={
          typeof (article as any).views === "number"
            ? `${(article as any).views.toLocaleString("ar")} مشاهدة`
            : undefined
        }
        publisherLine={publisherLine}
        dir="rtl"
        testIdPrefix="article-hero"
      />

      <main
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl article-mobile-pad"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12">
          {/* Main column */}
          <article ref={articleBodyRef} className="min-w-0 space-y-8">
            {/* Mobile TOC + AI insights toggle row */}
            <div className="flex items-center gap-2 flex-wrap lg:hidden">
              <TableOfContentsMobile
                headings={tocHeadings}
                containerRef={articleBodyRef}
                dir="rtl"
              />
              {article.status === "published" && user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInsightsOpen((v) => !v)}
                  className="gap-2"
                  data-testid="button-toggle-insights-mobile"
                  aria-expanded={isInsightsOpen}
                >
                  <Lightbulb className="h-4 w-4" />
                  {isInsightsOpen ? "إخفاء التحليل" : "حلّل هذا الخبر"}
                </Button>
              )}
            </div>

            {/* Engagement stats pills */}
            <EngagementStats stats={engagementStats} dir="rtl" />

            {/* Smart Summary card */}
            <SmartSummaryCard
              bullets={aiBullets}
              isLoadingBullets={shouldFetchBullets && isLoadingBullets}
              fullSummary={article.aiSummary || article.excerpt || null}
              isExpanded={isSummaryExpanded}
              onExpandedChange={setIsSummaryExpanded}
              onPlayAudio={handlePlayAudio}
              isPlaying={isPlaying}
              isLoadingAudio={isLoadingAudio}
              dir="rtl"
              labels={{
                title: "الموجز الذكي",
                readMore: "اقرأ المزيد",
                showLess: "إخفاء",
                listen: "استماع للموجز",
                stopListen: "إيقاف الاستماع",
              }}
              testIdPrefix="ai-summary"
            />

            {/* Smart Insights — desktop trigger */}
            {article.status === "published" && user && (
              <div className="hidden lg:flex flex-col items-start gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInsightsOpen((v) => !v)}
                  className="gap-2"
                  data-testid="button-toggle-insights"
                  aria-expanded={isInsightsOpen}
                  aria-label={isInsightsOpen ? "إخفاء التحليل الذكي" : "حلّل هذا الخبر بالذكاء الاصطناعي"}
                >
                  <Lightbulb className="h-4 w-4" />
                  {isInsightsOpen ? "إخفاء التحليل" : "حلّل هذا الخبر"}
                </Button>
              </div>
            )}
            {isInsightsOpen && (
              <div className="w-full">
                <SmartInsights articleId={article.id} articleTitle={article.title} autoStart />
              </div>
            )}

            {/* Optional video at top of body */}
            {(article as any).isVideoTemplate && (article as any).videoUrl && (
              <VideoPlayer
                videoUrl={(article as any).videoUrl}
                thumbnailUrl={(article as any).videoThumbnailUrl || article.imageUrl}
                title={article.title}
                className="rounded-xl overflow-hidden"
              />
            )}

            {/* Article body / paywall */}
            <div className="rounded-2xl bg-card border border-border p-5 sm:p-7 lg:p-9">
              {isLoadingPurchaseStatus ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">جاري التحقق من حالة الشراء...</p>
                </div>
              ) : article.isPaid && !purchaseStatus?.hasPurchased ? (
                <Paywall
                  article={{
                    id: article.id,
                    title: article.title,
                    content: article.content,
                    priceHalalas: article.priceHalalas || 0,
                    previewLength: article.previewLength ?? undefined,
                    imageUrl: article.imageUrl,
                    slug: article.slug,
                  }}
                  onPurchaseComplete={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/payments/check-purchase", article.id],
                    });
                  }}
                />
              ) : (
                <div
                  className="article-prose with-drop-cap max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                  data-testid="content-article-body"
                />
              )}
            </div>

            {/* Weekly photos (if applicable) */}
            {article.articleType === "weekly_photos" &&
              (article as any).weeklyPhotosData?.photos && (
                <div className="bg-card border border-border rounded-2xl p-5 sm:p-7">
                  <WeeklyPhotosDisplay
                    photos={(article as any).weeklyPhotosData.photos}
                    title="صور الأسبوع"
                  />
                </div>
              )}

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
                    <h3 className="text-lg font-bold">الصور المرفقة</h3>
                    <Badge variant="secondary" data-testid="badge-gallery-count">
                      {mediaAdditionalImages.length + albumImages.length}
                    </Badge>
                  </div>
                  <div className="space-y-8">
                    {mediaAdditionalImages.map((asset: any, index: number) => (
                      <ImageWithCaption
                        key={asset.id || `media-${index}`}
                        imageUrl={asset.mediaFile?.url || asset.url}
                        altText={asset.altText || asset.mediaFile?.altText || `صورة ${index + 1}`}
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
                        altText={`صورة ${mediaAdditionalImages.length + index + 1}`}
                        className="w-full"
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Keywords */}
            {((article.seo?.keywords && article.seo.keywords.length > 0) ||
              articleTags.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  الكلمات المفتاحية
                </h3>
                <div className="flex flex-wrap gap-2">
                  {articleTags.map((tag, index) => (
                    <Badge
                      key={`tag-${tag.id}`}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setLocation(`/keyword/${encodeURIComponent(tag.nameAr)}`)}
                      data-testid={`badge-tag-${index}`}
                    >
                      {tag.nameAr}
                    </Badge>
                  ))}
                  {articleTags.length === 0 &&
                    article.seo?.keywords?.map((keyword, index) => (
                      <Badge
                        key={`seo-${index}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setLocation(`/keyword/${encodeURIComponent(keyword)}`)
                        }
                        data-testid={`badge-keyword-${index}`}
                      >
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Author bio card */}
            {resolvedAuthor && (
              <AuthorCard
                name={authorName}
                initials={authorInitials}
                title={(article.staff as any)?.title || undefined}
                bio={(article.staff as any)?.bio || (resolvedAuthor as any)?.bio || undefined}
                avatarUrl={resolvedAuthor.profileImageUrl || undefined}
                isVerified={!!article.staff?.isVerified}
                profileLink={profileLink}
                dir="rtl"
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
                  {isLoadingShortLink ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Share2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h3 className="text-lg font-bold">شارك المقال</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={article.hasReacted ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={handleReact}
                  data-testid="button-article-react"
                >
                  <Heart className={`h-4 w-4 ${article.hasReacted ? "fill-current" : ""}`} />
                  <span>إعجاب ({article.reactionsCount || 0})</span>
                </Button>
                <Button
                  variant={article.isBookmarked ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={handleBookmark}
                  data-testid="button-article-bookmark"
                >
                  <Bookmark className={`h-4 w-4 ${article.isBookmarked ? "fill-current" : ""}`} />
                  <span>حفظ</span>
                </Button>
              </div>

              {isLoadingShortLink ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري إنشاء رابط المشاركة...
                </div>
              ) : (
                <SocialShareBar
                  title={article.title}
                  url={
                    shortLink?.shortCode
                      ? `https://sabq.org/s/${shortLink.shortCode}`
                      : `https://sabq.org/article/${slug}`
                  }
                  description={article.excerpt || ""}
                  articleId={article.id}
                />
              )}
            </div>

            {/* Story Timeline */}
            {article.storyId && (
              <>
                <div className="space-y-4 rounded-2xl bg-gradient-to-br from-primary/[0.04] via-card to-accent/[0.04] border border-border p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold">تطوّر القصة</h2>
                    </div>
                    <FollowStoryButton
                      storyId={article.storyId}
                      storyTitle={article.storyTitle || article.title}
                    />
                  </div>
                  <StoryTimeline storyId={article.storyId} />
                </div>
              </>
            )}

            {/* Article Poll */}
            <div>
              <ArticlePoll articleId={article.id} />
            </div>

            {/* Comments */}
            <div ref={commentsSectionRef}>
              <CommentSection
                articleId={article.id}
                comments={comments}
                currentUser={user}
                onSubmitComment={handleComment}
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Sticky desktop TOC */}
            <div className="hidden lg:block">
              <TableOfContents
                headings={tocHeadings}
                containerRef={articleBodyRef}
                dir="rtl"
              />
            </div>

            <LazyChunk
              loader={aiArticleStatsLoader}
              fallback={<Skeleton className="h-48 w-full" />}
              testId="lazy-ai-article-stats"
              render={(AiArticleStats) => <AiArticleStats slug={slug} />}
            />

            <AIRecommendationsBlock articleSlug={slug} />

            {article?.category && (
              <RelatedOpinionsSection
                categoryId={article.category.id}
                categoryName={article.category.nameAr}
                categoryColor={article.category.color || undefined}
                excludeArticleId={article.id}
                limit={5}
              />
            )}

            {relatedArticles.length > 0 && (
              <RecommendationsWidget
                articles={relatedArticles}
                title="أخبار مشابهة"
                reason="قد تعجبك أيضاً"
              />
            )}
          </aside>
        </div>
      </main>

      {/* Floating action rail (desktop) + sticky bottom bar (mobile) */}
      <FloatingActionRail actions={railActions} dir="rtl" />

      <Footer />
    </div>
  );
}
