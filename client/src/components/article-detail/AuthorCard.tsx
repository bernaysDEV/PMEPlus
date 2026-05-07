import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, BookOpen } from "lucide-react";

interface AuthorCardProps {
  name: string;
  initials: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  profileLink?: string;
  articlesCount?: number;
  dir?: "rtl" | "ltr";
  testIdPrefix?: string;
  labels?: {
    moreFromAuthor?: string;
    viewProfile?: string;
    articles?: string;
  };
}

export function AuthorCard({
  name,
  initials,
  title,
  bio,
  avatarUrl,
  isVerified,
  profileLink,
  articlesCount,
  dir = "rtl",
  testIdPrefix = "author-card",
  labels,
}: AuthorCardProps) {
  const t = {
    moreFromAuthor: labels?.moreFromAuthor ?? (dir === "rtl" ? "المزيد من المقالات" : "More from this author"),
    viewProfile: labels?.viewProfile ?? (dir === "rtl" ? "الملف الشخصي" : "View profile"),
    articles: labels?.articles ?? (dir === "rtl" ? "مقالة" : "articles"),
  };

  return (
    <div
      dir={dir}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      data-testid={`${testIdPrefix}-container`}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border shrink-0">
          <AvatarImage src={avatarUrl || ""} alt={name} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {profileLink ? (
              <Link href={profileLink}>
                <h3
                  className="text-base sm:text-lg font-bold text-foreground hover:text-primary cursor-pointer inline-flex items-center gap-1.5"
                  data-testid={`${testIdPrefix}-name`}
                >
                  {name}
                  {isVerified && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </h3>
              </Link>
            ) : (
              <h3
                className="text-base sm:text-lg font-bold text-foreground inline-flex items-center gap-1.5"
                data-testid={`${testIdPrefix}-name`}
              >
                {name}
                {isVerified && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </h3>
            )}
            {typeof articlesCount === "number" && articlesCount > 0 && (
              <Badge variant="secondary" className="gap-1" data-testid={`${testIdPrefix}-articles-count`}>
                <BookOpen className="h-3 w-3" />
                {articlesCount} {t.articles}
              </Badge>
            )}
          </div>

          {title && (
            <p className="text-sm text-muted-foreground mb-2" data-testid={`${testIdPrefix}-title`}>
              {title}
            </p>
          )}

          {bio && (
            <p className="text-sm text-foreground/85 leading-relaxed line-clamp-3 mb-4" data-testid={`${testIdPrefix}-bio`}>
              {bio}
            </p>
          )}

          {profileLink && (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={profileLink}>
                <Button size="sm" variant="default" className="gap-1.5" data-testid={`${testIdPrefix}-button-profile`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t.viewProfile}
                </Button>
              </Link>
              <Link href={profileLink}>
                <Button size="sm" variant="outline" className="gap-1.5" data-testid={`${testIdPrefix}-button-more`}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {t.moreFromAuthor}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
