import {
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Bell,
  Newspaper,
  Users,
  MessageSquare,
  Home,
  Clock,
  BookOpen,
  Bookmark,
  ChevronRight,
  FolderOpen,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VariantSwitcher } from "@/components/VariantSwitcher";
import { AccessibilitySettings } from "@/components/AccessibilitySettings";
// import { EnglishNotificationBell } from "@/components/en/EnglishNotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { EnglishBreakingNewsTicker } from "./EnglishBreakingNewsTicker";
import { EnglishSearchDialog } from "./EnglishSearchDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import logoImage from "@assets/3500x1080-Logo-White_1776604119190.png";
import type { EnCategory } from "@shared/schema";

interface EnglishHeaderProps {
  user?: {
    name?: string | null;
    email?: string;
    role?: string;
    profileImageUrl?: string | null;
    permissions?: string[];
  } | null;
  onMenuClick?: () => void;
}

export function EnglishHeader({ user }: EnglishHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { theme, appTheme } = useTheme();

  const currentLogo =
    appTheme?.assets?.logoLight && theme === "light"
      ? appTheme.assets.logoLight
      : appTheme?.assets?.logoDark && theme === "dark"
      ? appTheme.assets.logoDark
      : logoImage;

  const { data: categoriesRaw } = useQuery<EnCategory[]>({
    queryKey: ["/api/en/categories"],
  });
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
      toast({
        title: "Logged out",
        description: "See you soon",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "P";
  };

  const mainSections: Array<{ name: string; href: string }> = [
    { name: "News", href: "/en/news" },
    { name: "Categories", href: "/en/categories" },
    { name: "Articles", href: "/en/opinion" },
    { name: "Moment by Moment", href: "/en/moment-by-moment" },
    { name: "Markets", href: "/en/markets" },
  ];

  return (
    <header
      role="banner"
      aria-label="Main page header"
      className="sticky top-0 z-50 w-full border-b border-sidebar-border bg-sidebar text-sidebar-foreground"
      dir="ltr"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left side: hamburger (mobile only) + logo */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button — first in LTR order so it sits leftmost on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover-elevate active-elevate-2"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-menu"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            {/* Desktop logo */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/en"
                onClick={(e) => {
                  if (window.location.pathname === "/en") {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
              >
                <span
                  className="flex items-center gap-3 hover-elevate active-elevate-2 rounded-md px-2 py-2 cursor-pointer"
                  data-testid="link-home"
                  aria-label="Home page"
                >
                  <img
                    src={currentLogo}
                    alt="Property ME"
                    className="h-12 w-auto object-contain"
                  />
                </span>
              </Link>
            </div>

            {/* Mobile logo — sits right after the hamburger */}
            <div className="md:hidden flex items-center">
              <Link
                href="/en"
                onClick={(e) => {
                  if (window.location.pathname === "/en") {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
              >
                <span
                  className="flex items-center gap-3 hover-elevate active-elevate-2 rounded-md px-2 py-2 cursor-pointer"
                  data-testid="link-home-mobile"
                  aria-label="Home page"
                >
                  <img
                    src={currentLogo}
                    alt="Property ME"
                    className="h-11 w-auto object-contain"
                  />
                </span>
              </Link>
            </div>
          </div>

          {/* Main Navigation - Center (Desktop) */}
          <nav
            id="main-nav"
            role="navigation"
            aria-label="Main menu"
            tabIndex={-1}
            className="hidden md:flex items-center gap-6 flex-1 justify-center"
          >
            {mainSections.map((section) => (
              <Link key={section.name} href={section.href}>
                <span
                  className="text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
                  data-testid={`link-section-${section.name}`}
                  aria-current={location === section.href ? "page" : undefined}
                >
                  {section.name}
                </span>
              </Link>
            ))}
            {user && (
              <Link href="/en/discover-users">
                <span
                  className="text-sm font-medium text-sidebar-foreground hover:text-sidebar-primary transition-colors whitespace-nowrap cursor-pointer"
                  data-testid="link-discover-users"
                  aria-current={location === "/en/discover-users" ? "page" : undefined}
                >
                  Discover
                </span>
              </Link>
            )}
          </nav>

          {/* Right side: actions cluster */}
          <div className="flex items-center gap-2">
            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-1">
              <EnglishSearchDialog />
              <Link href="/en/lite">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover-elevate active-elevate-2"
                  data-testid="button-quick-browse-mobile"
                  aria-label="Quick browse"
                >
                  <Zap className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <LanguageSwitcher />
              <VariantSwitcher />
              <ThemeToggle />

              {/* Notification Bell - Mobile - TEMPORARILY HIDDEN */}
              {/* {user && <EnglishNotificationBell />} */}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover-elevate active-elevate-2"
                      data-testid="button-user-menu-mobile"
                      aria-label="User menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.profileImageUrl || ""}
                          alt={user.name || user.email || ""}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(user.name || undefined, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {user.permissions?.includes("dashboard.view") && (
                      <>
                        <DropdownMenuItem asChild>
                          <a
                            href="/en/dashboard"
                            className="flex w-full items-center cursor-pointer"
                            data-testid="link-dashboard-mobile"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                            Dashboard
                          </a>
                        </DropdownMenuItem>
                        {user.permissions?.includes("dashboard.view_messages") && (
                          <DropdownMenuItem asChild>
                            <a
                              href="/en/dashboard/communications"
                              className="flex w-full items-center cursor-pointer"
                              data-testid="link-communications-mobile"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                              Communications
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/daily-brief"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-daily-brief-mobile"
                      >
                        <Newspaper className="mr-2 h-4 w-4" aria-hidden="true" />
                        Daily Brief
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/profile"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-profile-mobile"
                      >
                        <User className="mr-2 h-4 w-4" aria-hidden="true" />
                        Profile
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/notification-settings"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-notification-settings-mobile"
                      >
                        <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                        Notification Settings
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex w-full items-center cursor-pointer"
                      data-testid="link-logout-mobile"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  data-testid="button-login-mobile"
                  aria-label="Login"
                >
                  <a href="/login">
                    <User className="h-5 w-5" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <EnglishSearchDialog />
              <AccessibilitySettings variant="desktop" />
              <LanguageSwitcher />
              <VariantSwitcher />
              <ThemeToggle />

              {/* Notification Bell - Desktop - TEMPORARILY HIDDEN */}
              {/* {user && <EnglishNotificationBell />} */}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover-elevate active-elevate-2"
                      data-testid="button-user-menu"
                      aria-label="User menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.profileImageUrl || ""}
                          alt={user.name || user.email || ""}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(user.name || undefined, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {user.permissions?.includes("dashboard.view") && (
                      <>
                        <DropdownMenuItem asChild>
                          <a
                            href="/en/dashboard"
                            className="flex w-full items-center cursor-pointer"
                            data-testid="link-dashboard"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                            Dashboard
                          </a>
                        </DropdownMenuItem>
                        {user.permissions?.includes("dashboard.view_messages") && (
                          <DropdownMenuItem asChild>
                            <a
                              href="/en/dashboard/communications"
                              className="flex w-full items-center cursor-pointer"
                              data-testid="link-communications"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                              Communications
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/daily-brief"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-daily-brief"
                      >
                        <Newspaper className="mr-2 h-4 w-4" aria-hidden="true" />
                        Daily Brief
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/profile"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-profile"
                      >
                        <User className="mr-2 h-4 w-4" aria-hidden="true" />
                        Profile
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href="/en/notification-settings"
                        className="flex w-full items-center cursor-pointer"
                        data-testid="link-notification-settings"
                      >
                        <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                        Notification Settings
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex w-full items-center cursor-pointer"
                      data-testid="link-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-sidebar-border text-sidebar-foreground"
                  data-testid="button-login"
                >
                  <a href="/login">Login</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu sheet (LTR: opens from the left) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] flex flex-col p-0">
          <SheetHeader className="flex-shrink-0 p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left text-lg font-bold">Menu</SheetTitle>
              <Link
                href="/en"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (window.location.pathname === "/en") {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
              >
                <img
                  src={currentLogo}
                  alt="Property ME"
                  className="h-10 w-auto object-contain"
                  data-testid="img-mobile-menu-logo"
                />
              </Link>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Main browsing */}
            <div className="p-3">
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Main browsing
              </h3>
              <div className="space-y-1">
                <Link
                  href="/en"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (window.location.pathname === "/en") {
                      e.preventDefault();
                      window.location.reload();
                    }
                  }}
                >
                  <span
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                    data-testid="link-mobile-home"
                  >
                    <Home className="h-5 w-5 text-primary" aria-hidden="true" />
                    Home
                  </span>
                </Link>
                <Link href="/en/news">
                  <span
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-news"
                  >
                    <Newspaper className="h-5 w-5 text-primary" aria-hidden="true" />
                    News
                  </span>
                </Link>
                <Link href="/en/moment-by-moment">
                  <span
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-moment"
                  >
                    <Clock className="h-5 w-5 text-red-500" aria-hidden="true" />
                    Moment by Moment
                  </span>
                </Link>
                <Link href="/en/opinion">
                  <span
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-opinion"
                  >
                    <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                    Articles
                  </span>
                </Link>
                <Link href="/en/lite">
                  <span
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer bg-primary/5 border border-primary/20"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-lite"
                  >
                    <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                    Quick Browse
                  </span>
                </Link>
              </div>
            </div>

            {/* Discover more */}
            <div className="p-3 border-t">
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Discover more
              </h3>
              <div className="space-y-1">
                {user && (
                  <Link href="/en/discover-users">
                    <span
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="link-mobile-discover-users"
                    >
                      <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                      Discover users
                    </span>
                  </Link>
                )}
                <Link href="/en/categories">
                  <span
                    className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-all-categories"
                  >
                    <span className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                      All categories
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </div>

              {/* Categories Quick Links */}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {categories
                  .filter((cat) => cat.status === "active" && cat.type === "core")
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .slice(0, 6)
                  .map((category) => (
                    <Link key={category.id} href={`/en/category/${category.slug}`}>
                      <span
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium bg-muted/50 hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`link-mobile-category-${category.slug}`}
                      >
                        {category.icon && <span className="text-base">{category.icon}</span>}
                        <span className="truncate">{category.name}</span>
                      </span>
                    </Link>
                  ))}
              </div>
            </div>

            {/* My tools (logged-in) */}
            {user && (
              <div className="p-3 border-t">
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  My tools
                </h3>
                <div className="space-y-1">
                  {user.permissions?.includes("dashboard.view") && (
                    <Link href="/en/dashboard">
                      <span
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="link-mobile-dashboard"
                      >
                        <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden="true" />
                        Dashboard
                      </span>
                    </Link>
                  )}
                  <Link href="/en/daily-brief">
                    <span
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="link-mobile-daily-brief"
                    >
                      <Newspaper className="h-5 w-5 text-primary" aria-hidden="true" />
                      Daily Brief
                    </span>
                  </Link>
                  <Link href="/en/profile">
                    <span
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="link-mobile-profile"
                    >
                      <User className="h-5 w-5 text-primary" aria-hidden="true" />
                      Profile
                    </span>
                  </Link>
                  <Link href="/en/profile?tab=bookmarks">
                    <span
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="link-mobile-bookmarks"
                    >
                      <Bookmark className="h-5 w-5 text-primary" aria-hidden="true" />
                      Bookmarks
                    </span>
                  </Link>
                  <Link href="/en/notification-settings">
                    <span
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="link-mobile-notification-settings"
                    >
                      <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
                      Notification Settings
                    </span>
                  </Link>
                </div>
              </div>
            )}

            {/* Accessibility */}
            <div className="p-3 border-t">
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accessibility
              </h3>
              <div className="px-3">
                <AccessibilitySettings variant="mobile" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {user && (
            <div className="flex-shrink-0 p-3 border-t bg-muted/30">
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover-elevate active-elevate-2 cursor-pointer"
                data-testid="button-mobile-logout"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Logout
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <EnglishBreakingNewsTicker />
    </header>
  );
}
