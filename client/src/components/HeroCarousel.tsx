import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Camera, Clock } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ArticleWithDetails } from "@shared/schema";
import { formatDateOnly } from "@/lib/formatTime";
import { getObjectPosition } from "@/lib/imageUtils";

/**
 * HeroCarousel — اتجاه «Editorial Magazine»
 *
 * إعادة تصميم منطقة الأخبار البارزة لتمنح الواجهة هوية افتتاحية أقرب لمجلة:
 * - الديسكتوب: خبر رئيسي بنسبة 60% بمعالجة سينمائية (Ken Burns ناعم + شريط
 *   ميتاداتا علوي بزجاج مضبّب وعنوان كبير في الأسفل) إلى جانب شبكة 2×2 من
 *   الكروت الجانبية بدل العمود الواحد، لكسر تكرار الشكل وإبراز التسلسل البصري.
 * - الموبايل: الخبر الرئيسي يبقى 16:9 لكن بمعالجة جديدة (شارة عاجل/جديد كنقطة
 *   نابضة، شريط تصنيف+تاريخ بزجاج مضبّب، عنوان أكبر وأكثر هيبة)، والخبران
 *   الجانبيان يتحولان إلى كروت عمودية مصغّرة بصورة في الأعلى وعنوان أسفلها
 *   بدل الشكل الأفقي البسيط الحالي.
 * - شارة «عاجل» تتحول إلى مؤشر نقطي نابض بدل البادج الأحمر الصلب، وشارة «جديد»
 *   تستخدم نقطة بلون النجاح بنفس الأسلوب الأنيق.
 * - النظام اللوني مأخوذ بالكامل من index.css و tailwind config
 *   (primary/accent/destructive/success)، ولا توجد ألوان hardcoded خاصة بالكاروسيل.
 * - الصورة الرئيسية تبقى priority، ولا توجد مكتبات جديدة، ولا تغيير في توقيع
 *   المكوّن (`articles: ArticleWithDetails[]`).
 */

// Detect iOS Safari to use simplified carousel (prevents zoom + animation jank).
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
};

const isNewArticle = (publishedAt: Date | string | null | undefined) => {
  if (!publishedAt) return false;
  const published = typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  const now = new Date();
  const diffInMinutes = (now.getTime() - published.getTime()) / (1000 * 60);
  return diffInMinutes <= 30;
};

const formatPublishedDate = (date: Date | string | null) => {
  if (!date) return "";
  return formatDateOnly(date, 'ar');
};

interface ProcessedHeroArticle extends ArticleWithDetails {
  isNew: boolean;
  formattedDate: string;
  objectPosition: string;
  displayImage: string | null;
}

interface HeroCarouselProps {
  articles: ArticleWithDetails[];
}

const useProcessedArticles = (articles: ArticleWithDetails[]): ProcessedHeroArticle[] =>
  useMemo(() => {
    const processed: ProcessedHeroArticle[] = articles.map((article) => ({
      ...article,
      isNew: isNewArticle(article.publishedAt),
      formattedDate: formatPublishedDate(article.publishedAt),
      objectPosition: getObjectPosition(article),
      displayImage: article.imageUrl || article.thumbnailUrl || null,
    }));

    // Bias breaking news to the hero slot.
    return processed.sort((a, b) => {
      if (a.newsType === 'breaking' && b.newsType !== 'breaking') return -1;
      if (a.newsType !== 'breaking' && b.newsType === 'breaking') return 1;
      return 0;
    });
  }, [articles]);

// ============= Shared sub-components =============

/**
 * Pulse-dot status indicator. Used for «عاجل» (with ping animation) and
 * «جديد» (static dot). Designed to live elegantly on top of any image
 * without competing with the title or category color.
 */
function StatusDot({
  variant,
  label,
  testId,
  animate,
}: {
  variant: 'breaking' | 'new';
  label: string;
  testId?: string;
  animate: boolean;
}) {
  const isBreaking = variant === 'breaking';
  const dotClass = isBreaking ? 'bg-destructive' : 'bg-success';
  return (
    <Badge
      variant="outline"
      data-testid={testId}
      className="no-default-hover-elevate gap-1.5 rounded-full border-white/15 bg-black/55 px-2.5 py-1 text-[11px] tracking-wide text-white shadow-none backdrop-blur-md"
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isBreaking && animate && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotClass} opacity-80`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>
      {label}
    </Badge>
  );
}

/**
 * Frosted-glass meta pill that floats over the hero image. Holds category
 * (with its own color dot) and the publication date.
 */
function HeroMetaPill({ article }: { article: ProcessedHeroArticle }) {
  if (!article.category && !article.formattedDate) return null;
  return (
    <Badge
      variant="outline"
      className="no-default-hover-elevate gap-2 rounded-full border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-normal text-white shadow-none backdrop-blur-md"
      data-testid={`text-hero-meta-${article.id}`}
    >
      {article.category && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: article.category.color || 'hsl(var(--accent))' }}
            aria-hidden
          />
          <span className="font-semibold">{article.category.nameAr}</span>
        </span>
      )}
      {article.category && article.formattedDate && (
        <span className="h-1 w-1 rounded-full bg-white/40" aria-hidden />
      )}
      {article.formattedDate && (
        <span className="inline-flex items-center gap-1 text-white/85">
          <Clock className="h-3 w-3" />
          {article.formattedDate}
        </span>
      )}
    </Badge>
  );
}

/**
 * Hero card — the dominant featured article. Same component for mobile and
 * desktop, with size-aware sizing/typography. On mobile the image is locked
 * to 16:9; on desktop it fills the parent's height (which the layout owns).
 */
function HeroCard({
  article,
  size,
  enableAnimations,
}: {
  article: ProcessedHeroArticle;
  size: 'mobile' | 'desktop';
  enableAnimations: boolean;
}) {
  const isBreaking = article.newsType === 'breaking';
  const heightClasses = size === 'mobile' ? 'aspect-[16/9]' : 'h-full';
  const titleClasses =
    size === 'mobile'
      ? 'text-xl font-extrabold leading-tight line-clamp-2'
      : 'text-2xl lg:text-4xl font-extrabold leading-[1.15] line-clamp-3';
  const padding = size === 'mobile' ? 'p-4' : 'p-6 lg:p-8';
  const cornerPadding = size === 'mobile' ? 'top-3 right-3' : 'top-5 right-5';

  return (
    <Link
      href={`/article/${article.englishSlug || article.slug}`}
      className={size === 'desktop' ? 'block h-full w-full' : 'block'}
      data-testid={`link-hero-article-${article.id}`}
    >
      <article
        className="group relative cursor-pointer overflow-hidden rounded-md h-full"
        role="article"
        aria-label={article.title}
      >
        <div className={`relative ${heightClasses} overflow-hidden rounded-md bg-muted`}>
          {/* Image with optional Ken Burns autoplay (skipped on iOS Safari) */}
          {article.displayImage ? (
            <div className={`absolute inset-0 ${enableAnimations ? 'hero-ken-burns' : ''}`}>
              <OptimizedImage
                src={article.displayImage}
                alt={article.title}
                className="h-full w-full object-cover"
                objectPosition={article.objectPosition}
                priority={true}
                preferSize={size === 'desktop' ? 'large' : 'medium'}
                aspectRatio={size === 'mobile' ? '16/9' : undefined}
              />
            </div>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/20" />
          )}

          {/* Editorial dark wash — bottom for title legibility, subtle top wash for the floating dot */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 via-40% to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />

          {/* Corner status indicator (breaking pulse / new dot / weekly photos) */}
          <div className={`absolute ${cornerPadding} flex items-center gap-2`}>
            {isBreaking ? (
              <StatusDot
                variant="breaking"
                label="عاجل"
                testId={`badge-breaking-${article.id}`}
                animate={enableAnimations}
              />
            ) : article.isNew ? (
              <StatusDot
                variant="new"
                label="جديد"
                testId={`badge-new-${article.id}`}
                animate={false}
              />
            ) : null}
            {article.articleType === 'weekly_photos' && (
              <Badge
                variant="outline"
                className="no-default-hover-elevate gap-1 rounded-full border-white/15 bg-black/55 px-2.5 py-1 text-[11px] tracking-wide text-white shadow-none backdrop-blur-md"
              >
                <Camera className="h-3 w-3" />
                صور
              </Badge>
            )}
          </div>

          {/* Bottom: meta pill + title */}
          <div className={`absolute inset-x-0 bottom-0 ${padding}`}>
            <div className="mb-2.5">
              <HeroMetaPill article={article} />
            </div>
            <h1
              className={`${titleClasses} text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]`}
              data-testid={`text-hero-title-${article.id}`}
            >
              {article.title}
            </h1>
          </div>
        </div>
      </article>
    </Link>
  );
}

/**
 * Secondary card — vertical mini-card with image on top and title beneath.
 * Used in both the mobile 2-column row and the desktop 2×2 grid.
 */
function SecondaryCard({ article }: { article: ProcessedHeroArticle }) {
  const isBreaking = article.newsType === 'breaking';
  return (
    <Link
      href={`/article/${article.englishSlug || article.slug}`}
      className="block h-full"
      data-testid={`link-secondary-article-${article.id}`}
      aria-label={article.title}
    >
      <Card className="group relative h-full rounded-md shadow-none hover-elevate active-elevate-2 flex flex-col">
        {/* Image area */}
        <div className="relative h-[55%] w-full overflow-hidden rounded-t-md">
          {article.displayImage ? (
            <OptimizedImage
              src={article.displayImage}
              alt={article.title}
              className="h-full w-full object-cover"
              objectPosition={article.objectPosition || 'center top'}
              priority={true}
              preferSize="small"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10" />
          )}

          {/* Subtle bottom wash so any overlay text reads cleanly */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />

          {/* Status indicator */}
          {(isBreaking || article.isNew) && (
            <div className="absolute right-2 top-2">
              {isBreaking ? (
                <StatusDot variant="breaking" label="عاجل" animate={true} />
              ) : (
                <StatusDot variant="new" label="جديد" animate={false} />
              )}
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex flex-1 flex-col justify-between gap-2 p-3">
          <h2
            className="line-clamp-2 text-sm font-bold leading-snug text-foreground"
            data-testid={`text-secondary-title-${article.id}`}
          >
            {article.title}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {article.category && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: article.category.color || 'hsl(var(--accent))' }}
                  aria-hidden
                />
                <span className="font-semibold text-foreground/85">{article.category.nameAr}</span>
              </span>
            )}
            {article.category && article.formattedDate && (
              <span className="opacity-50" aria-hidden>·</span>
            )}
            {article.formattedDate && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.formattedDate}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Layout shell. Renders the asymmetric grid:
 *  - Mobile: hero (16:9) + 2-column row of vertical cards
 *  - Desktop: 60/40 split with 2×2 grid for the secondary articles
 */
function HeroCarouselLayout({
  articles,
  enableAnimations,
}: {
  articles: ProcessedHeroArticle[];
  enableAnimations: boolean;
}) {
  if (!articles || articles.length === 0) return null;

  const heroArticle = articles[0];
  const mobileSecondary = articles.slice(1, 3);
  const desktopSecondary = articles.slice(1, 5);

  return (
    <>
      {/* Mobile: hero + 2-column secondary grid */}
      <div className="md:hidden space-y-3" dir="rtl">
        <HeroCard article={heroArticle} size="mobile" enableAnimations={enableAnimations} />
        {mobileSecondary.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {mobileSecondary.map((article) => (
              <SecondaryCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: 60/40 split with 2×2 secondary grid */}
      <div
        className="hidden md:grid md:grid-cols-5 md:gap-4 lg:gap-5 md:h-[460px] lg:h-[500px]"
        dir="rtl"
      >
        <div className="md:col-span-3 h-full">
          <HeroCard article={heroArticle} size="desktop" enableAnimations={enableAnimations} />
        </div>

        {desktopSecondary.length > 0 && (
          <div className="md:col-span-2 grid grid-cols-2 grid-rows-2 gap-3 lg:gap-4">
            {desktopSecondary.map((article) => (
              <SecondaryCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function HeroCarousel({ articles }: HeroCarouselProps) {
  // Detect iOS Safari once so animation features can be disabled there to
  // avoid the well-known transform/zoom jank on iOS — visual layout stays
  // identical so users on iOS don't get a downgraded experience.
  const [isSafariIOS] = useState(() => isIOSSafari());
  const processed = useProcessedArticles(articles);
  return <HeroCarouselLayout articles={processed} enableAnimations={!isSafariIOS} />;
}
