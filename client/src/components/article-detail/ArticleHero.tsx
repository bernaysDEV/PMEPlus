import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Eye, Zap, Sparkles, Archive, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export interface HeroAuthorInfo {
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  initials: string;
  profileLink?: string;
  isVerified?: boolean;
}

interface ArticleHeroProps {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  objectPosition?: string;
  category?: {
    name: string;
    color?: string | null;
    icon?: string | null;
    href?: string;
  };
  isBreaking?: boolean;
  isArchived?: boolean;
  isAiGenerated?: boolean;
  author?: HeroAuthorInfo;
  publishedLabel?: string;
  readingTimeLabel?: string;
  viewsLabel?: string;
  dir?: "rtl" | "ltr";
  publisherLine?: ReactNode;
  badges?: ReactNode;
  testIdPrefix?: string;
}

export function ArticleHero({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  objectPosition,
  category,
  isBreaking,
  isArchived,
  isAiGenerated,
  author,
  publishedLabel,
  readingTimeLabel,
  viewsLabel,
  dir = "rtl",
  publisherLine,
  badges,
  testIdPrefix = "hero",
}: ArticleHeroProps) {
  const breakingLabel = dir === "rtl" ? "عاجل" : "Breaking";
  const archivedLabel = dir === "rtl" ? "مؤرشف" : "Archived";
  const aiLabel = dir === "rtl" ? "محتوى ذكاء اصطناعي" : "AI Generated";

  const normalizedImage = imageUrl?.startsWith("/public-objects/")
    ? "/api/public-media/public/" + imageUrl.replace("/public-objects/", "")
    : imageUrl;

  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-b from-muted/40 to-background"
      dir={dir}
      data-testid={`${testIdPrefix}-section`}
    >
      {/* Background image layer */}
      {normalizedImage && (
        <div className="absolute inset-0 -z-0">
          <img
            src={normalizedImage}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
            style={objectPosition ? { objectPosition } : undefined}
            loading="eager"
            decoding="sync"
            data-testid={`${testIdPrefix}-image`}
          />
          {/* Cinematic gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>
      )}

      {!normalizedImage && (
        <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/30 via-accent/20 to-background" />
      )}

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pt-24 pb-8 sm:pt-28 sm:pb-12 md:pt-40 md:pb-16 lg:pt-48 lg:pb-16">
        {/* Top badges */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-8 sm:mb-6">
          {category && (
            category.href ? (
              <Link href={category.href}>
                <Badge
                  className="bg-white/15 text-white border border-white/25 backdrop-blur-md cursor-pointer gap-1"
                  data-testid={`${testIdPrefix}-badge-category`}
                >
                  {category.icon && <span aria-hidden="true">{category.icon}</span>}
                  {category.name}
                </Badge>
              </Link>
            ) : (
              <Badge
                className="bg-white/15 text-white border border-white/25 backdrop-blur-md gap-1"
                data-testid={`${testIdPrefix}-badge-category`}
              >
                {category.icon && <span aria-hidden="true">{category.icon}</span>}
                {category.name}
              </Badge>
            )
          )}
          {isBreaking && (
            <Badge
              className="bg-red-600/90 text-white border border-red-300/40 backdrop-blur-md gap-1"
              data-testid={`${testIdPrefix}-badge-breaking`}
            >
              <Zap className="h-3 w-3" />
              {breakingLabel}
            </Badge>
          )}
          {isArchived && (
            <Badge
              className="bg-yellow-500/90 text-yellow-50 border border-yellow-200/40 backdrop-blur-md gap-1"
              data-testid={`${testIdPrefix}-badge-archived`}
            >
              <Archive className="h-3 w-3" />
              {archivedLabel}
            </Badge>
          )}
          {isAiGenerated && (
            <Badge
              className="bg-white/15 text-white border border-white/25 backdrop-blur-md gap-1"
              data-testid={`${testIdPrefix}-badge-ai`}
            >
              <Sparkles className="h-3 w-3" />
              {aiLabel}
            </Badge>
          )}
          {badges}
        </div>

        {/* Title */}
        <h1
          className="text-white font-bold leading-[1.1] tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4rem] mb-7 sm:mb-5 max-w-5xl drop-shadow-sm"
          data-testid={`${testIdPrefix}-title`}
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-white/85 text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mb-10 sm:mb-8 drop-shadow-sm"
            data-testid={`${testIdPrefix}-subtitle`}
          >
            {subtitle}
          </p>
        )}

        {/* Author / meta strip */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-4 sm:gap-x-5 sm:gap-y-5 text-white/85 mt-2 sm:mt-0">
          {author && (
            <div className="flex items-center gap-3" data-testid={`${testIdPrefix}-author`}>
              <Avatar className="h-11 w-11 border border-white/30 shrink-0">
                <AvatarImage
                  src={author.avatarUrl || ""}
                  alt={author.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/15 text-white text-sm font-bold backdrop-blur">
                  {author.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {author.profileLink ? (
                  <Link href={author.profileLink}>
                    <span
                      className="text-sm sm:text-base font-bold text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
                      data-testid={`${testIdPrefix}-author-name`}
                    >
                      {author.name}
                      {author.isVerified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                      )}
                    </span>
                  </Link>
                ) : (
                  <span
                    className="text-sm sm:text-base font-bold text-white inline-flex items-center gap-1"
                    data-testid={`${testIdPrefix}-author-name`}
                  >
                    {author.name}
                    {author.isVerified && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                    )}
                  </span>
                )}
                {author.title && (
                  <span className="block text-xs text-white/70" data-testid={`${testIdPrefix}-author-title`}>
                    {author.title}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="hidden sm:block w-px h-8 bg-white/25" />

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
            {publishedLabel && (
              <span className="inline-flex items-center gap-1.5" data-testid={`${testIdPrefix}-published`}>
                <Clock className="h-3.5 w-3.5 opacity-80" />
                {publishedLabel}
              </span>
            )}
            {readingTimeLabel && (
              <span className="inline-flex items-center gap-1.5" data-testid={`${testIdPrefix}-reading-time`}>
                <Clock className="h-3.5 w-3.5 opacity-80" />
                {readingTimeLabel}
              </span>
            )}
            {viewsLabel && (
              <span className="inline-flex items-center gap-1.5" data-testid={`${testIdPrefix}-views`}>
                <Eye className="h-3.5 w-3.5 opacity-80" />
                {viewsLabel}
              </span>
            )}
          </div>

          {publisherLine && (
            <>
              <div className="w-full sm:hidden" />
              <div className="text-xs sm:text-sm text-white/85" data-testid={`${testIdPrefix}-publisher`}>
                {publisherLine}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
