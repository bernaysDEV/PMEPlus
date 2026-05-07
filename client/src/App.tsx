import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LiveRegionProvider } from "@/contexts/LiveRegionContext";
import { VoiceAssistantProvider } from "@/contexts/VoiceAssistantContext";
import { SkipLinks } from "@/components/SkipLinks";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useAnalytics } from "@/hooks/use-analytics";
import { canCacheBust, markCacheBust, cacheBustReload, hardReset, getCacheBustCount, canHardReset, resetAllRecoveryCounters, resetSessionCacheBustCounters, isCacheBustQuotaExhausted } from "@/lib/cacheBust";
import { useAuth } from "@/hooks/useAuth";
import { setReadingHistoryAuth } from "@/lib/readingHistory";
import { useWebMCP } from "@/hooks/useWebMCP";
import { UpdateAvailableBanner } from "@/components/UpdateAvailableBanner";

function WebMCPProvider() {
  useWebMCP();
  return null;
}

function ReadingHistorySync() {
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    setReadingHistoryAuth(isAuthenticated, (user as any)?.id);
  }, [isAuthenticated, (user as any)?.id]);
  return null;
}

const CHUNK_RECOVERY_ERROR = 'CHUNK_LOAD_RECOVERY_PENDING';

interface LastChunkLoadError {
  message: string;
  url: string | null;
  stackFirstLine: string;
  at: number;
}

declare global {
  interface Window {
    __lastChunkLoadError?: LastChunkLoadError | null;
    __lazyChunkSucceededOnce?: boolean;
  }
}

function isChunkErrorMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  // Must NOT match our own recovery-pending error or its Arabic user-facing
  // message, otherwise we'd create a self-triggering loop where the error we
  // reject with re-triggers chunk-error handling in ErrorBoundary / main.tsx.
  if (m.includes(CHUNK_RECOVERY_ERROR.toLowerCase())) return false;
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('importing a module script failed') ||
    m.includes('loading chunk') ||
    m.includes('loading css chunk') ||
    m.includes('chunkloaderror') ||
    m.includes('unable to preload css')
  );
}

function extractFailedChunkUrl(error: Error | null | undefined): string | null {
  if (!error) return null;
  const haystack = `${error.message || ''}\n${error.stack || ''}`;
  // Vite dynamic-import errors usually embed the chunk URL inside the message
  // or stack. Match the first occurrence of an http(s)://… or /assets/… URL.
  const m = haystack.match(/https?:\/\/[^\s'")]+|\/assets\/[^\s'")]+\.[a-z0-9]+/i);
  return m ? m[0] : null;
}

function recordChunkLoadError(error: Error): void {
  try {
    const url = extractFailedChunkUrl(error);
    const stackFirstLine = (error.stack || '').split('\n').find((l) => l.trim().length > 0) || '';
    window.__lastChunkLoadError = {
      message: error.message || String(error),
      url,
      stackFirstLine: stackFirstLine.trim(),
      at: Date.now(),
    };
  } catch {}
}

function retryImport<T>(importFn: () => Promise<T>, retries = 3, delay = 400): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number, currentDelay: number) => {
      importFn()
        .then((mod) => {
          // First successful chunk load in this session — clear any
          // session-only recovery counters that may have accumulated from a
          // previous transient failure.
          //
          // CRITICAL: do NOT reset counters when this very page load was
          // itself triggered by a cache-bust reload (URL contains `_cb=`).
          // Otherwise the eager chunks succeed first → counter resets → the
          // still-broken lazy chunk fails on the next user scroll → another
          // cache-bust reload → infinite loop. We only want the per-session
          // counter to clear after the user has had a stable session.
          try {
            const isRecoveryLoad =
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).has("_cb");
            if (!window.__lazyChunkSucceededOnce) {
              // Mark "first success seen" exactly once per page load,
              // regardless of recovery state, so subsequent successful chunks
              // never fall back into the reset branch (which would happen if
              // we later strip `_cb=` from the URL for cosmetic cleanup).
              window.__lazyChunkSucceededOnce = true;
              if (!isRecoveryLoad) {
                // Only clear the per-session cache-bust counter on a clean
                // page load. On recovery loads we deliberately preserve the
                // counter so a still-broken lazy chunk can trip the
                // 3-attempt circuit breaker instead of looping forever.
                resetSessionCacheBustCounters();
              }
            }
            // Clear any stale failure record so future unrelated recovery
            // states don't surface yesterday's reason text.
            window.__lastChunkLoadError = null;
          } catch {}
          resolve(mod);
        })
        .catch((error: Error) => {
          const isModuleError = isChunkErrorMessage(error?.message);

          if (!isModuleError) {
            // Non-chunk runtime error from inside the module — surface it.
            reject(error);
            return;
          }

          // Always remember the most recent chunk load failure so the
          // recovery UI can surface a useful diagnostic to the user.
          recordChunkLoadError(error);

          const failedUrl = extractFailedChunkUrl(error);
          const firstStackLine =
            (error.stack || '').split('\n').find((l) => l.trim().length > 0)?.trim() || '';

          if (remaining > 0) {
            console.warn(
              `[LazyLoad] Module load failure — retrying (${remaining} left)`,
              {
                message: error?.message,
                url: failedUrl,
                stack: firstStackLine,
              }
            );
            setTimeout(() => attempt(remaining - 1, currentDelay * 2), currentDelay);
            return;
          }

          // All retries exhausted. A cache-bust reload forces a fresh
          // HTML+chunks fetch — useful in production after a deploy renamed
          // chunks AND in dev when stale module URLs from a previous HMR
          // cycle are no longer served. The cacheBust helper already caps
          // attempts (3/session + 30s cooldown) so this can't loop forever.
          if (canCacheBust()) {
            console.warn(
              `[LazyLoad] All retries failed — cache-bust reloading (attempt ${getCacheBustCount() + 1})`,
              {
                message: error?.message,
                url: failedUrl,
                stack: firstStackLine,
              }
            );
            markCacheBust();
            cacheBustReload();
            // Intentionally never resolve/reject — the page is reloading.
            return;
          }

          console.warn(
            '[LazyLoad] Module load failed and reload quota exhausted — showing recovery UI.',
            {
              message: error?.message,
              url: failedUrl,
              stack: firstStackLine,
            }
          );
          // Use a sentinel error message that ErrorBoundary recognises but
          // that does NOT match isChunkErrorMessage (avoids reload loops).
          reject(new Error(CHUNK_RECOVERY_ERROR));
        });
    };
    attempt(retries, delay);
  });
}

// Lazy load non-critical components
const VoiceCommandsHelp = lazy(() => retryImport(() => import("@/components/VoiceCommandsHelp").then(m => ({ default: m.VoiceCommandsHelp }))));

// === LAZY IMPORTS (Critical Path - Code split for faster initial load) ===
const Home = lazy(() => retryImport(() => import("@/pages/Home")));
const ArticleDetail = lazy(() => retryImport(() => import("@/pages/ArticleDetail")));
const CategoryPage = lazy(() => retryImport(() => import("@/pages/CategoryPage")));
const Login = lazy(() => retryImport(() => import("@/pages/Login")));
const Register = lazy(() => retryImport(() => import("@/pages/Register")));
// Static pages - lazy loaded
const AboutPage = lazy(() => retryImport(() => import("@/pages/AboutPage")));
const PrivacyPage = lazy(() => retryImport(() => import("@/pages/PrivacyPage")));
const TermsPage = lazy(() => retryImport(() => import("@/pages/TermsPage")));
const ContactPage = lazy(() => retryImport(() => import("@/pages/ContactPage")));
const AccessibilityStatement = lazy(() => retryImport(() => import("@/pages/AccessibilityStatement")));
const DevelopersPage = lazy(() => retryImport(() => import("@/pages/DevelopersPage")));
const AIPolicy = lazy(() => retryImport(() => import("@/pages/AIPolicy")));
const RssPage = lazy(() => retryImport(() => import("@/pages/RssPage")));

// === LAZY IMPORTS (Auth) ===
const VerifyEmail = lazy(() => retryImport(() => import("@/pages/VerifyEmail")));
const ForgotPassword = lazy(() => retryImport(() => import("@/pages/ForgotPassword")));
const ResetPassword = lazy(() => retryImport(() => import("@/pages/ResetPassword")));
const SetPassword = lazy(() => retryImport(() => import("@/pages/SetPassword")));
const TwoFactorVerify = lazy(() => retryImport(() => import("@/pages/TwoFactorVerify")));
const AdminLogin = lazy(() => retryImport(() => import("@/pages/AdminLogin")));

// === LAZY IMPORTS (Public Pages) ===
const KeywordPage = lazy(() => retryImport(() => import("@/pages/KeywordPage")));
const NewsPage = lazy(() => retryImport(() => import("@/pages/NewsPage")));
const CategoriesListPage = lazy(() => retryImport(() => import("@/pages/CategoriesListPage")));
const OpinionPage = lazy(() => retryImport(() => import("@/pages/OpinionPage")));
const OpinionDetailPage = lazy(() => retryImport(() => import("@/pages/OpinionDetailPage")));
// AboutPage, TermsPage, PrivacyPage, AccessibilityStatement, DevelopersPage, AIPolicy - moved to eager imports
const AIPublisher = lazy(() => retryImport(() => import("@/pages/AIPublisher")));
// ContactPage - moved to eager imports above
const NewsletterPage = lazy(() => retryImport(() => import("@/pages/NewsletterPage")));
const ShortsPage = lazy(() => retryImport(() => import("@/pages/ShortsPage")));
const ReporterProfile = lazy(() => retryImport(() => import("@/pages/ReporterProfile")));
const DailyBrief = lazy(() => retryImport(() => import("@/pages/DailyBrief")));
const MomentByMoment = lazy(() => retryImport(() => import("@/pages/MomentByMoment")));
const MarketsPage = lazy(() => retryImport(() => import("@/pages/MarketsPage")));
const MarketCompanyPage = lazy(() => retryImport(() => import("@/pages/MarketCompanyPage")));
// RssPage - moved to eager imports above
const NotFound = lazy(() => retryImport(() => import("@/pages/not-found")));
const ArchivePage = lazy(() => retryImport(() => import("@/pages/ArchivePage")));

// === LAZY IMPORTS (Dashboard Core) ===
const Dashboard = lazy(() => retryImport(() => import("@/pages/Dashboard")));
const AnalyticsDashboard = lazy(() => retryImport(() => import("@/pages/AnalyticsDashboard")));
const ArticleEditor = lazy(() => retryImport(() => import("@/pages/ArticleEditor")));
const ArticlePreview = lazy(() => retryImport(() => import("@/pages/ArticlePreview")));
const ArticlesManagement = lazy(() => retryImport(() => import("@/pages/ArticlesManagement")));
const CategoriesManagement = lazy(() => retryImport(() => import("@/pages/CategoriesManagement")));
const UsersManagement = lazy(() => retryImport(() => import("@/pages/UsersManagement")));
const RolesManagement = lazy(() => retryImport(() => import("@/pages/RolesManagement")));
const TagsManagement = lazy(() => retryImport(() => import("@/pages/TagsManagement")));
const RealEstateDevelopersAdmin = lazy(() => retryImport(() => import("@/pages/dashboard/RealEstateDevelopersAdmin")));

// === LAZY IMPORTS (Profile & User) ===
const Profile = lazy(() => retryImport(() => import("@/pages/Profile")));
const PreferencesCenter = lazy(() => retryImport(() => import("@/pages/PreferencesCenter")));
const PublicProfile = lazy(() => retryImport(() => import("@/pages/PublicProfile")));
const DiscoverUsers = lazy(() => retryImport(() => import("@/pages/DiscoverUsers")));
const CompleteProfile = lazy(() => retryImport(() => import("@/pages/CompleteProfile")));
const SelectInterests = lazy(() => retryImport(() => import("@/pages/SelectInterests")));
const EditInterests = lazy(() => retryImport(() => import("@/pages/EditInterests")));
const NotificationSettings = lazy(() => retryImport(() => import("@/pages/NotificationSettings")));
const MyFollows = lazy(() => retryImport(() => import("@/pages/MyFollows")));
const MyKeywords = lazy(() => retryImport(() => import("@/pages/MyKeywords")));

// === LAZY IMPORTS (Themes) ===
const ThemeManager = lazy(() => retryImport(() => import("@/pages/ThemeManager")));
const ThemeEditor = lazy(() => retryImport(() => import("@/pages/ThemeEditor")));
const ThemeSwitcher = lazy(() => retryImport(() => import("@/pages/dashboard/ThemeSwitcher")));

// === LAZY IMPORTS (Onboarding) ===
const Welcome = lazy(() => retryImport(() => import("@/pages/onboarding/Welcome")));
const OnboardingInterests = lazy(() => retryImport(() => import("@/pages/onboarding/SelectInterests")));
const Personalize = lazy(() => retryImport(() => import("@/pages/onboarding/Personalize")));

// === LAZY IMPORTS (Smart Features) ===
const SmartLinksManagement = lazy(() => retryImport(() => import("@/pages/dashboard/SmartLinksManagement")));
const SmartJournalist = lazy(() => retryImport(() => import("@/pages/dashboard/SmartJournalist")));
const TermDetail = lazy(() => retryImport(() => import("@/pages/TermDetail")));
const EntityDetail = lazy(() => retryImport(() => import("@/pages/EntityDetail")));
const SmartBlocksPage = lazy(() => retryImport(() => import("@/pages/dashboard/SmartBlocksPage")));
const QuadCategoriesBlockSettings = lazy(() => retryImport(() => import("@/pages/QuadCategoriesBlockSettings")));
const SmartCategoriesManagement = lazy(() => retryImport(() => import("@/pages/SmartCategoriesManagement")));

// === LAZY IMPORTS (Analytics) ===
const ComingSoon = lazy(() => retryImport(() => import("@/pages/ComingSoon")));
const UserBehavior = lazy(() => retryImport(() => import("@/pages/UserBehavior")));
const AdvancedAnalytics = lazy(() => retryImport(() => import("@/pages/AdvancedAnalytics")));
const RecommendationAnalytics = lazy(() => retryImport(() => import("@/pages/RecommendationAnalytics")));
const SentimentAnalytics = lazy(() => retryImport(() => import("@/pages/dashboard/SentimentAnalytics")));
const PersonalizationAnalytics = lazy(() => retryImport(() => import("@/pages/dashboard/PersonalizationAnalytics")));
const NewsletterAnalytics = lazy(() => retryImport(() => import("@/pages/dashboard/NewsletterAnalytics")));
const ArticleAnalyticsDashboard = lazy(() => retryImport(() => import("@/pages/dashboard/ArticleAnalyticsDashboard")));
const ABTestsManagement = lazy(() => retryImport(() => import("@/pages/ABTestsManagement")));
const ABTestDetail = lazy(() => retryImport(() => import("@/pages/ABTestDetail")));

// === LAZY IMPORTS (Notifications) ===
const Notifications = lazy(() => retryImport(() => import("@/pages/Notifications")));
const NotificationAdmin = lazy(() => retryImport(() => import("@/pages/NotificationAdmin")));
const RecommendationSettings = lazy(() => retryImport(() => import("@/pages/recommendation-settings")));
const UserNotifications = lazy(() => retryImport(() => import("@/pages/UserNotifications")));
const UserRecommendationSettings = lazy(() => retryImport(() => import("@/pages/UserRecommendationSettings")));

// === LAZY IMPORTS (Admin) ===
const AIModerationDashboard = lazy(() => retryImport(() => import("@/pages/admin/AIModerationDashboard")));
const PaymentsDashboard = lazy(() => retryImport(() => import("@/pages/admin/PaymentsDashboard")));
const MediaStoreOrders = lazy(() => retryImport(() => import("@/pages/admin/MediaStoreOrders")));
const StaffMembers = lazy(() => retryImport(() => import("@/pages/admin/StaffMembers")));
const AccessibilityInsights = lazy(() => retryImport(() => import("@/pages/admin/AccessibilityInsights")));
const CorrespondentApplications = lazy(() => retryImport(() => import("@/pages/admin/CorrespondentApplications")));
const OpinionAuthorApplications = lazy(() => retryImport(() => import("@/pages/admin/OpinionAuthorApplications")));
const EmailTemplatesPage = lazy(() => retryImport(() => import("@/pages/admin/EmailTemplatesPage")));
const SuspiciousWordsManagement = lazy(() => retryImport(() => import("@/pages/admin/SuspiciousWordsManagement")));

// === LAZY IMPORTS (System Settings) ===
const StoryAdmin = lazy(() => retryImport(() => import("@/pages/StoryAdmin")));
const SystemSettings = lazy(() => retryImport(() => import("@/pages/SystemSettings")));
const AutoImageSettings = lazy(() => retryImport(() => import("@/pages/AutoImageSettings")));
const FocalPointDashboard = lazy(() => retryImport(() => import("@/pages/dashboard/FocalPointDashboard")));
const EditorAlertsSettings = lazy(() => retryImport(() => import("@/pages/dashboard/EditorAlertsSettings")));
const ActivityLogsPage = lazy(() => retryImport(() => import("@/pages/dashboard/ActivityLogsPage")));
const ContactMessagesManagement = lazy(() => retryImport(() => import("@/pages/dashboard/ContactMessagesManagement")));
const SystemAnnouncementsManagement = lazy(() => retryImport(() => import("@/pages/dashboard/AnnouncementsManagement")));
const ContactMessageDetail = lazy(() => retryImport(() => import("@/pages/ContactMessageDetail")));

// === LAZY IMPORTS (Audio) ===
const AudioNewslettersDashboard = lazy(() => retryImport(() => import("@/pages/AudioNewslettersDashboard")));
const AudioNewsletterEditor = lazy(() => retryImport(() => import("@/pages/AudioNewsletterEditor")));
const AudioNewslettersArchive = lazy(() => retryImport(() => import("@/pages/AudioNewslettersArchive")));
const AudioNewsletterDetail = lazy(() => retryImport(() => import("@/pages/AudioNewsletterDetail")));
const AudioNewslettersPublic = lazy(() => retryImport(() => import("@/pages/AudioNewslettersPublic")));
const AudioNewsletterAnalytics = lazy(() => retryImport(() => import("@/pages/AudioNewsletterAnalytics")));
const AudioBriefsDashboard = lazy(() => retryImport(() => import("@/pages/AudioBriefsDashboard")));
const AudioBriefEditor = lazy(() => retryImport(() => import("@/pages/AudioBriefEditor")));

// === LAZY IMPORTS (Announcements) ===
const AnnouncementsList = lazy(() => retryImport(() => import("@/pages/AnnouncementsList")));
const AnnouncementDetail = lazy(() => retryImport(() => import("@/pages/AnnouncementDetail")));
const AnnouncementEditor = lazy(() => retryImport(() => import("@/pages/AnnouncementEditor")));
const AnnouncementsArchive = lazy(() => retryImport(() => import("@/pages/AnnouncementsArchive")));
const AnnouncementVersions = lazy(() => retryImport(() => import("@/pages/AnnouncementVersions")));
const AnnouncementAnalytics = lazy(() => retryImport(() => import("@/pages/AnnouncementAnalytics")));

// === LAZY IMPORTS (Shorts) ===
const ShortsManagement = lazy(() => retryImport(() => import("@/pages/ShortsManagement")));
const ShortsEditor = lazy(() => retryImport(() => import("@/pages/ShortsEditor")));

// === LAZY IMPORTS (Opinion) ===
const OpinionManagement = lazy(() => retryImport(() => import("@/pages/dashboard/OpinionManagement")));
const QuizManagement = lazy(() => retryImport(() => import("@/pages/dashboard/QuizManagement")));

// === LAZY IMPORTS (Dashboard Tools) ===
const BreakingTickerManager = lazy(() => retryImport(() => import("@/pages/dashboard/BreakingTickerManager")));
const WorldDaysManagement = lazy(() => retryImport(() => import("@/pages/dashboard/WorldDaysManagement")));
const MediaLibrary = lazy(() => retryImport(() => import("@/pages/dashboard/MediaLibrary")));
const AITools = lazy(() => retryImport(() => import("@/pages/dashboard/AITools")));
const DataStoryGenerator = lazy(() => retryImport(() => import("@/pages/DataStoryGenerator")));
const DeepAnalysis = lazy(() => retryImport(() => import("@/pages/dashboard/DeepAnalysis")));
const DeepAnalysisList = lazy(() => retryImport(() => import("@/pages/dashboard/DeepAnalysisList")));
const DashboardProfile = lazy(() => retryImport(() => import("@/pages/dashboard/DashboardProfile")));
const VoiceManagement = lazy(() => retryImport(() => import("@/pages/dashboard/VoiceManagement")));
const TranscriptionTool = lazy(() => retryImport(() => import("@/pages/dashboard/TranscriptionTool")));

// === LAZY IMPORTS (Omq) ===
const Omq = lazy(() => retryImport(() => import("@/pages/Omq")));
const OmqDetail = lazy(() => retryImport(() => import("@/pages/OmqDetail")));
const OmqStats = lazy(() => retryImport(() => import("@/pages/OmqStats")));

// === LAZY IMPORTS (Calendar) ===
const CalendarPage = lazy(() => retryImport(() => import("@/pages/CalendarPage")));
const CalendarEventDetail = lazy(() => retryImport(() => import("@/pages/CalendarEventDetail")));
const CalendarEventForm = lazy(() => retryImport(() => import("@/pages/CalendarEventForm")));

// === LAZY IMPORTS (English Version) ===
const EnglishHome = lazy(() => retryImport(() => import("@/pages/en/EnglishHome")));
const EnglishArticleDetail = lazy(() => retryImport(() => import("@/pages/en/EnglishArticleDetail")));
const EnglishKeywordPage = lazy(() => retryImport(() => import("@/pages/en/EnglishKeywordPage")));
const EnglishArticleEditor = lazy(() => retryImport(() => import("@/pages/en/EnglishArticleEditor")));
const EnglishDashboard = lazy(() => retryImport(() => import("@/pages/en/EnglishDashboard")));
const EnglishNewsPage = lazy(() => retryImport(() => import("@/pages/en/EnglishNewsPage")));
const EnglishCategoriesPage = lazy(() => retryImport(() => import("@/pages/en/EnglishCategoriesPage")));
const EnglishCategoriesListPage = lazy(() => retryImport(() => import("@/pages/en/EnglishCategoriesListPage")));
const EnglishCategoryPage = lazy(() => retryImport(() => import("@/pages/en/EnglishCategoryPage")));
const EnglishUsersPage = lazy(() => retryImport(() => import("@/pages/en/EnglishUsersPage")));
const EnglishArticlesPage = lazy(() => retryImport(() => import("@/pages/en/EnglishArticlesPage")));
const EnglishProfile = lazy(() => retryImport(() => import("@/pages/en/EnglishProfile")));
const EnglishDailyBrief = lazy(() => retryImport(() => import("@/pages/en/EnglishDailyBrief")));
const EnglishNotificationSettings = lazy(() => retryImport(() => import("@/pages/en/EnglishNotificationSettings")));
const EnglishSmartBlocksPage = lazy(() => retryImport(() => import("@/pages/en/EnglishSmartBlocksPage")));
const EnglishQuadCategoriesBlockSettings = lazy(() => retryImport(() => import("@/pages/en/EnglishQuadCategoriesBlockSettings")));
const EnglishReporterProfile = lazy(() => retryImport(() => import("@/pages/en/EnglishReporterProfile")));
const EnglishMomentByMoment = lazy(() => retryImport(() => import("@/pages/en/EnglishMomentByMoment")));
const EnglishPrivacyPage = lazy(() => retryImport(() => import("@/pages/en/EnglishPrivacyPage")));
const EnglishTermsPage = lazy(() => retryImport(() => import("@/pages/en/EnglishTermsPage")));
const EnglishAboutPage = lazy(() => retryImport(() => import("@/pages/en/EnglishAboutPage")));
const EnglishContactPage = lazy(() => retryImport(() => import("@/pages/en/EnglishContactPage")));

// === LAZY IMPORTS (Communications) ===
const CommunicationsManagement = lazy(() => retryImport(() => import("@/pages/dashboard/CommunicationsManagement")));
const StaffCommunicationsPage = lazy(() => retryImport(() => import("@/pages/dashboard/StaffCommunicationsPage")));
const StaffProductivity = lazy(() => retryImport(() => import("@/pages/dashboard/StaffProductivity")));

const PaymentCallback = lazy(() => retryImport(() => import("@/pages/PaymentCallback")));
const MediaStore = lazy(() => retryImport(() => import("@/pages/MediaStore")));

// === LAZY IMPORTS (Publisher) ===
const PublisherDashboard = lazy(() => retryImport(() => import("@/pages/publisher/PublisherDashboard")));
const PublisherArticles = lazy(() => retryImport(() => import("@/pages/publisher/PublisherArticles")));
const PublisherArticleEditor = lazy(() => retryImport(() => import("@/pages/publisher/PublisherArticleEditor")));
const PublisherCredits = lazy(() => retryImport(() => import("@/pages/publisher/PublisherCredits")));
const AdminPublishers = lazy(() => retryImport(() => import("@/pages/admin/publishers/AdminPublishers")));
const AdminPublisherDetails = lazy(() => retryImport(() => import("@/pages/admin/publishers/AdminPublisherDetails")));
const AdminPublisherArticles = lazy(() => retryImport(() => import("@/pages/admin/publishers/AdminPublisherArticles")));
const AdminPublisherAnalytics = lazy(() => retryImport(() => import("@/pages/admin/publishers/AdminPublisherAnalytics")));

// === LAZY IMPORTS (Correspondent & Opinion Author) ===
const CorrespondentRegister = lazy(() => retryImport(() => import("@/pages/correspondent/CorrespondentRegister")));
const OpinionAuthorRegister = lazy(() => retryImport(() => import("@/pages/opinion-author/OpinionAuthorRegister")));
const OpinionAuthorDashboard = lazy(() => retryImport(() => import("@/pages/opinion-author/OpinionAuthorDashboard")));

// === LAZY IMPORTS (AI/iFox) ===
const AIHomePage = lazy(() => retryImport(() => import("@/pages/ai/AIHomePage")));
const AICategoryPage = lazy(() => retryImport(() => import("@/pages/ai/AICategoryPage")));
const AIArticleDetail = lazy(() => retryImport(() => import("@/pages/ai/AIArticleDetail")));
const IFoxArticlesPage = lazy(() => retryImport(() => import("@/pages/IFoxArticles")));
const IFoxDashboard = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxDashboard")));
const IFoxContentGenerator = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxContentGenerator")));
const IFoxArticles = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxArticles")));
const IFoxArticleEditor = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxArticleEditor")));
const IFoxMedia = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxMedia")));
const IFoxSchedule = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxSchedule")));
const IFoxCategory = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxCategory")));
const IFoxAnalytics = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxAnalytics")));
const IFoxSettings = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxSettings")));
const IFoxAITasks = lazy(() => retryImport(() => import("@/pages/admin/ifox/IFoxAITasks")));
const AIManagementDashboard = lazy(() => retryImport(() => import("@/pages/admin/ifox/ai-management")));
const ImageStudio = lazy(() => retryImport(() => import("@/pages/ifox/ImageStudio")));
const InfographicStudio = lazy(() => retryImport(() => import("@/pages/InfographicStudio")));
const DataInfographicDemo = lazy(() => retryImport(() => import("@/pages/DataInfographicDemo")));
const LiteFeedPage = lazy(() => retryImport(() => import("@/pages/lite/LiteFeedPage")));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || '';
    const isModuleIssue =
      isChunkErrorMessage(msg) || msg.includes('CHUNK_LOAD_RECOVERY_PENDING');

    if (isModuleIssue) {
      // Don't spam console.error for recoverable module load failures.
      console.warn("[ErrorBoundary] Module load failure caught:", msg);
      // Recovery ladder:
      //   1. canCacheBust() → simple cache-bust reload.
      //   2. The per-session cache-bust quota is fully exhausted (3 attempts)
      //      AND the persistent hard-reset circuit breaker still allows it →
      //      escalate to hardReset() (clears caches + service worker, then
      //      reloads). We deliberately wait for true quota exhaustion (not
      //      merely the 30s cooldown) so the user is never silently
      //      reload-bombed before the calm recovery UI gets a chance to
      //      surface. canHardReset() caps total hard resets at 2/24h.
      //   3. otherwise → render the calm recovery UI with a manual button.
      if (canCacheBust()) {
        console.warn("[ErrorBoundary] Attempting cache-bust reload");
        markCacheBust();
        cacheBustReload();
      } else if (isCacheBustQuotaExhausted() && canHardReset()) {
        console.warn("[ErrorBoundary] Cache-bust quota exhausted — escalating to hardReset");
        hardReset();
      } else {
        console.warn("[ErrorBoundary] Recovery options exhausted — showing manual recovery UI");
      }
      return;
    }
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isModuleIssue =
        isChunkErrorMessage(msg) || msg.includes('CHUNK_LOAD_RECOVERY_PENDING');

      // For module/chunk loading issues we never show the harsh error screen.
      // Instead show a calm loader; recovery (cache-bust reload or user retry)
      // is already in progress.
      if (isModuleIssue) {
        const lastChunkError =
          typeof window !== 'undefined' ? window.__lastChunkLoadError : null;
        const errorMessageLine =
          (lastChunkError?.message || '').split('\n')[0]?.trim() || '';
        const errorUrl = lastChunkError?.url || '';
        const hasErrorInfo = !!(errorMessageLine || errorUrl);

        return this.props.fallback || (
          <div
            className="flex flex-col items-center justify-center min-h-screen gap-4 px-4"
            dir="rtl"
            data-testid="lazy-recovery-loader"
          >
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">جارٍ تحميل الصفحة…</p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  // Explicit user intent — clear every recovery counter
                  // (including the persistent hard-reset circuit breaker)
                  // before triggering a full hardReset so the user is never
                  // trapped on this screen.
                  resetAllRecoveryCounters();
                  hardReset();
                }}
                className="text-xs text-muted-foreground underline"
                data-testid="button-lazy-recovery-reload"
              >
                إعادة المحاولة
              </button>
              <span className="text-xs text-muted-foreground" aria-hidden="true">·</span>
              <button
                onClick={() => {
                  resetAllRecoveryCounters();
                  try {
                    window.location.assign('/');
                  } catch {
                    window.location.href = '/';
                  }
                }}
                className="text-xs text-muted-foreground underline"
                data-testid="button-lazy-recovery-home"
              >
                العودة إلى الرئيسية
              </button>
            </div>
            {hasErrorInfo && (
              <div
                className="max-w-md text-center text-[11px] leading-relaxed text-muted-foreground/80 break-all select-text"
                data-testid="text-lazy-recovery-error"
              >
                {errorUrl && (
                  <div data-testid="text-lazy-recovery-url">
                    <span className="opacity-70">الملف:</span> {errorUrl}
                  </div>
                )}
                {errorMessageLine && (
                  <div data-testid="text-lazy-recovery-message">
                    <span className="opacity-70">السبب:</span> {errorMessageLine}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center" dir="rtl">
          <h1 className="text-2xl font-bold mb-4">حدث خطأ</h1>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || "خطأ غير معروف"}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
              data-testid="button-error-retry"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => cacheBustReload()}
              className="px-4 py-2 bg-muted text-muted-foreground rounded"
              data-testid="button-error-reload"
            >
              إعادة تحميل الصفحة
            </button>
            <button
              onClick={() => hardReset()}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded"
              data-testid="button-error-hard-reset"
            >
              تحديث كامل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyRoute({ component: Component }: { component: React.LazyExoticComponent<any> }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

function ScrollRestoration() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function VoiceCommandsManager() {
  const { showHelp, setShowHelp } = useVoiceCommands();
  
  return (
    <Suspense fallback={null}>
      <VoiceCommandsHelp 
        open={showHelp} 
        onOpenChange={setShowHelp} 
      />
    </Suspense>
  );
}

function Router() {
  useAnalytics();
  
  return (
    <>
      <ScrollRestoration />
      <Switch>
        {/* English Version Routes */}
        <Route path="/en">{() => <LazyRoute component={EnglishHome} />}</Route>
        <Route path="/en/news">{() => <LazyRoute component={EnglishNewsPage} />}</Route>
        <Route path="/en/moment-by-moment">{() => <LazyRoute component={EnglishMomentByMoment} />}</Route>
        <Route path="/en/categories">{() => <LazyRoute component={EnglishCategoriesListPage} />}</Route>
        <Route path="/en/category/:slug">{() => <LazyRoute component={EnglishCategoryPage} />}</Route>
        <Route path="/en/keyword/:keyword">{() => <LazyRoute component={EnglishKeywordPage} />}</Route>
        <Route path="/en/article/:slug">{() => <LazyRoute component={EnglishArticleDetail} />}</Route>
        <Route path="/en/dashboard/articles/new">{() => <LazyRoute component={EnglishArticleEditor} />}</Route>
        <Route path="/en/dashboard/articles/:id/edit">{() => <LazyRoute component={EnglishArticleEditor} />}</Route>
        <Route path="/en/dashboard/articles">{() => <LazyRoute component={EnglishArticlesPage} />}</Route>
        <Route path="/en/dashboard/categories">{() => <LazyRoute component={EnglishCategoriesPage} />}</Route>
        <Route path="/en/dashboard/smart-blocks">{() => <LazyRoute component={EnglishSmartBlocksPage} />}</Route>
        <Route path="/en/dashboard/quad-categories">{() => <LazyRoute component={EnglishQuadCategoriesBlockSettings} />}</Route>
        <Route path="/en/dashboard/users">{() => <LazyRoute component={EnglishUsersPage} />}</Route>
        <Route path="/en/dashboard">{() => <LazyRoute component={EnglishDashboard} />}</Route>
        <Route path="/en/profile">{() => <LazyRoute component={EnglishProfile} />}</Route>
        <Route path="/en/daily-brief">{() => <LazyRoute component={EnglishDailyBrief} />}</Route>
        <Route path="/en/notification-settings">{() => <LazyRoute component={EnglishNotificationSettings} />}</Route>
        <Route path="/en/reporter/:slug">{() => <LazyRoute component={EnglishReporterProfile} />}</Route>
        
        {/* Legacy /ur/* routes — redirect to the equivalent Arabic page */}
        <Route path="/ur/article/:slug">{(params) => <Redirect to={`/article/${params.slug}`} />}</Route>
        <Route path="/ur/category/:slug">{(params) => <Redirect to={`/category/${params.slug}`} />}</Route>
        <Route path="/ur/news">{() => <Redirect to="/news" />}</Route>
        <Route path="/ur/categories">{() => <Redirect to="/categories" />}</Route>
        <Route path="/ur/dashboard/articles/new">{() => <Redirect to="/dashboard/articles/new" />}</Route>
        <Route path="/ur/dashboard/articles/:id/edit">{(params) => <Redirect to={`/dashboard/articles/${params.id}/edit`} />}</Route>
        <Route path="/ur/dashboard/articles">{() => <Redirect to="/dashboard/articles" />}</Route>
        <Route path="/ur/dashboard/categories">{() => <Redirect to="/dashboard/categories" />}</Route>
        <Route path="/ur/dashboard/smart-blocks">{() => <Redirect to="/dashboard/smart-blocks" />}</Route>
        <Route path="/ur/dashboard/quad-categories">{() => <Redirect to="/dashboard/quad-categories" />}</Route>
        <Route path="/ur/dashboard">{() => <Redirect to="/dashboard" />}</Route>
        <Route path="/ur/:rest*">{() => <Redirect to="/" />}</Route>
        <Route path="/ur">{() => <Redirect to="/" />}</Route>
        
        {/* Arabic Version Routes - Core Pages (Lazy - Code Split) */}
        <Route path="/">{() => <LazyRoute component={Home} />}</Route>
        <Route path="/ar">{() => <LazyRoute component={Home} />}</Route>
        <Route path="/category/:slug">{() => <LazyRoute component={CategoryPage} />}</Route>
        <Route path="/article/:slug">{() => <LazyRoute component={ArticleDetail} />}</Route>
        <Route path="/login">{() => <LazyRoute component={Login} />}</Route>
        <Route path="/register">{() => <LazyRoute component={Register} />}</Route>
        
        {/* Static Pages - Lazy loaded */}
        <Route path="/about">{() => <LazyRoute component={AboutPage} />}</Route>
        <Route path="/contact">{() => <LazyRoute component={ContactPage} />}</Route>
        <Route path="/en/contact">{() => <LazyRoute component={EnglishContactPage} />}</Route>
        <Route path="/terms">{() => <LazyRoute component={TermsPage} />}</Route>
        <Route path="/ar/terms">{() => <LazyRoute component={TermsPage} />}</Route>
        <Route path="/en/terms">{() => <LazyRoute component={EnglishTermsPage} />}</Route>
        <Route path="/en/about">{() => <LazyRoute component={EnglishAboutPage} />}</Route>
        <Route path="/privacy">{() => <LazyRoute component={PrivacyPage} />}</Route>
        <Route path="/ar/privacy">{() => <LazyRoute component={PrivacyPage} />}</Route>
        <Route path="/en/privacy">{() => <LazyRoute component={EnglishPrivacyPage} />}</Route>
        
        <Route path="/accessibility-statement">{() => <LazyRoute component={AccessibilityStatement} />}</Route>
        <Route path="/ar/accessibility-statement">{() => <LazyRoute component={AccessibilityStatement} />}</Route>
        <Route path="/en/accessibility-statement">{() => <LazyRoute component={AccessibilityStatement} />}</Route>
        <Route path="/developers">{() => <LazyRoute component={DevelopersPage} />}</Route>
        <Route path="/ai-policy">{() => <LazyRoute component={AIPolicy} />}</Route>
        <Route path="/rss">{() => <LazyRoute component={RssPage} />}</Route>
        
        {/* Arabic Version Routes - LAZY */}
        <Route path="/ai-publisher">{() => <LazyRoute component={AIPublisher} />}</Route>
        <Route path="/newsletter">{() => <LazyRoute component={NewsletterPage} />}</Route>
        <Route path="/news">{() => <LazyRoute component={NewsPage} />}</Route>
        <Route path="/markets">{() => <LazyRoute component={MarketsPage} />}</Route>
        <Route path="/markets/company/:symbol">{() => <LazyRoute component={MarketCompanyPage} />}</Route>
        <Route path="/en/markets">{() => <LazyRoute component={MarketsPage} />}</Route>
        <Route path="/en/markets/company/:symbol">{() => <LazyRoute component={MarketCompanyPage} />}</Route>
        <Route path="/opinion">{() => <LazyRoute component={OpinionPage} />}</Route>
        <Route path="/opinion/:slug">{() => <LazyRoute component={OpinionDetailPage} />}</Route>
        <Route path="/categories">{() => <LazyRoute component={CategoriesListPage} />}</Route>
        <Route path="/shorts">{() => <LazyRoute component={ShortsPage} />}</Route>
        <Route path="/lite">{() => <LazyRoute component={LiteFeedPage} />}</Route>
        <Route path="/admin/login">{() => <LazyRoute component={AdminLogin} />}</Route>
        <Route path="/dashboard/payment-analytics">{() => <LazyRoute component={PaymentsDashboard} />}</Route>
        <Route path="/dashboard/media-store-orders">{() => <LazyRoute component={MediaStoreOrders} />}</Route>
        <Route path="/verify-email">{() => <LazyRoute component={VerifyEmail} />}</Route>
        <Route path="/forgot-password">{() => <LazyRoute component={ForgotPassword} />}</Route>
        <Route path="/reset-password">{() => <LazyRoute component={ResetPassword} />}</Route>
        <Route path="/set-password">{() => <LazyRoute component={SetPassword} />}</Route>
        <Route path="/2fa-verify">{() => <LazyRoute component={TwoFactorVerify} />}</Route>
        <Route path="/keyword/:keyword">{() => <LazyRoute component={KeywordPage} />}</Route>

        {/* Omq (Deep Analysis) public pages */}
        <Route path="/omq/stats">{() => <LazyRoute component={OmqStats} />}</Route>
        <Route path="/omq/:id">{() => <LazyRoute component={OmqDetail} />}</Route>
        <Route path="/omq">{() => <LazyRoute component={Omq} />}</Route>
        
        <Route path="/payment/callback">{() => <LazyRoute component={PaymentCallback} />}</Route>
        
        
        {/* Media Store */}
        <Route path="/media-store">{() => <LazyRoute component={MediaStore} />}</Route>
        
        {/* AI/iFox Routes */}
        <Route path="/ai">{() => <LazyRoute component={AIHomePage} />}</Route>
        <Route path="/ai/category/:category">{() => <LazyRoute component={AICategoryPage} />}</Route>
        <Route path="/ai/article/:slug">{() => <LazyRoute component={AIArticleDetail} />}</Route>
        <Route path="/ifox">{() => <LazyRoute component={IFoxArticlesPage} />}</Route>
        
        {/* Data Infographic Demo */}
        <Route path="/infographic-demo">{() => <LazyRoute component={DataInfographicDemo} />}</Route>
        
        {/* iFox Admin Dashboard Routes */}
        <Route path="/admin">{() => <LazyRoute component={IFoxDashboard} />}</Route>
        <Route path="/admin/ai/infographic/studio">{() => <LazyRoute component={InfographicStudio} />}</Route>
        <Route path="/admin/ifox/dashboard">{() => <LazyRoute component={IFoxDashboard} />}</Route>
        <Route path="/admin/ifox/articles">{() => <LazyRoute component={IFoxArticles} />}</Route>
        <Route path="/admin/ifox/articles/new">{() => <LazyRoute component={IFoxArticleEditor} />}</Route>
        <Route path="/admin/ifox/articles/:id/edit">{() => <LazyRoute component={IFoxArticleEditor} />}</Route>
        <Route path="/admin/ifox/media">{() => <LazyRoute component={IFoxMedia} />}</Route>
        <Route path="/admin/ifox/schedule">{() => <LazyRoute component={IFoxSchedule} />}</Route>
        <Route path="/admin/ifox/categories">{() => <LazyRoute component={IFoxCategory} />}</Route>
        <Route path="/admin/ifox/analytics">{() => <LazyRoute component={IFoxAnalytics} />}</Route>
        <Route path="/admin/ifox/settings">{() => <LazyRoute component={IFoxSettings} />}</Route>
        <Route path="/admin/ifox/image-studio">{() => <LazyRoute component={ImageStudio} />}</Route>
        <Route path="/admin/ifox/ai-tasks">{() => <LazyRoute component={IFoxAITasks} />}</Route>
        <Route path="/admin/ifox/ai-management">{() => <LazyRoute component={AIManagementDashboard} />}</Route>
        
        <Route path="/reporter/:slug">{() => <LazyRoute component={ReporterProfile} />}</Route>
        
        {/* Smart Links pages */}
        <Route path="/term/:identifier">{() => <LazyRoute component={TermDetail} />}</Route>
        <Route path="/entity/:slug">{() => <LazyRoute component={EntityDetail} />}</Route>
        
        {/* Audio Newsletters public pages */}
        <Route path="/audio-newsletters">{() => <LazyRoute component={AudioNewslettersPublic} />}</Route>
        <Route path="/audio-newsletters/:id">{() => <LazyRoute component={AudioNewsletterDetail} />}</Route>
        
        <Route path="/dashboard/smart-blocks">{() => <LazyRoute component={SmartBlocksPage} />}</Route>
        
        {/* Audio Newsletters dashboard */}
        <Route path="/dashboard/audio-newsletters">{() => <LazyRoute component={AudioNewslettersDashboard} />}</Route>
        <Route path="/dashboard/audio-newsletters/analytics">{() => <LazyRoute component={AudioNewsletterAnalytics} />}</Route>
        <Route path="/dashboard/audio-newsletters/create">{() => <LazyRoute component={AudioNewsletterEditor} />}</Route>
        <Route path="/dashboard/audio-newsletters/:id/edit">{() => <LazyRoute component={AudioNewsletterEditor} />}</Route>
        
        {/* Audio Briefs dashboard */}
        <Route path="/dashboard/audio-briefs">{() => <LazyRoute component={AudioBriefsDashboard} />}</Route>
        <Route path="/dashboard/audio-briefs/create">{() => <LazyRoute component={AudioBriefEditor} />}</Route>
        <Route path="/dashboard/audio-briefs/:id">{() => <LazyRoute component={AudioBriefEditor} />}</Route>
        
        {/* Internal Announcements dashboard */}
        <Route path="/dashboard/announcements">{() => <LazyRoute component={AnnouncementsList} />}</Route>
        <Route path="/dashboard/announcements/new">{() => <LazyRoute component={AnnouncementEditor} />}</Route>
        <Route path="/dashboard/announcements/archive">{() => <LazyRoute component={AnnouncementsArchive} />}</Route>
        <Route path="/dashboard/announcements/:id/edit">{() => <LazyRoute component={AnnouncementEditor} />}</Route>
        <Route path="/dashboard/announcements/:id/versions">{() => <LazyRoute component={AnnouncementVersions} />}</Route>
        <Route path="/dashboard/announcements/:id/analytics">{() => <LazyRoute component={AnnouncementAnalytics} />}</Route>
        <Route path="/dashboard/announcements/:id">{() => <LazyRoute component={AnnouncementDetail} />}</Route>
        
        {/* Shorts dashboard - restricted from reporters */}
        <Route path="/dashboard/shorts">
          {() => (
            <ProtectedRoute requireStaff={true} excludeRoles={["reporter"]}>
              <Suspense fallback={<PageLoader />}>
                <ShortsManagement />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/shorts/new">
          {() => (
            <ProtectedRoute requireStaff={true} excludeRoles={["reporter"]}>
              <Suspense fallback={<PageLoader />}>
                <ShortsEditor />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/shorts/:id">
          {() => (
            <ProtectedRoute requireStaff={true} excludeRoles={["reporter"]}>
              <Suspense fallback={<PageLoader />}>
                <ShortsEditor />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        
        {/* Quad Categories Block Settings */}
        <Route path="/dashboard/blocks/quad-categories">{() => <LazyRoute component={QuadCategoriesBlockSettings} />}</Route>
        
        {/* Smart Categories Management */}
        <Route path="/dashboard/smart-categories">{() => <LazyRoute component={SmartCategoriesManagement} />}</Route>
        
        {/* Calendar */}
        <Route path="/dashboard/calendar">{() => <LazyRoute component={CalendarPage} />}</Route>
        <Route path="/dashboard/calendar/:action">{() => <LazyRoute component={CalendarEventForm} />}</Route>
        <Route path="/dashboard/calendar/events/:id">{() => <LazyRoute component={CalendarEventDetail} />}</Route>
        <Route path="/dashboard/calendar/events/:id/edit">{() => <LazyRoute component={CalendarEventForm} />}</Route>
        
        {/* World Days Management */}
        <Route path="/dashboard/world-days">{() => <LazyRoute component={WorldDaysManagement} />}</Route>
        
        <Route path="/dashboard">{() => <LazyRoute component={Dashboard} />}</Route>
        <Route path="/dashboard/analytics">{() => <LazyRoute component={AnalyticsDashboard} />}</Route>
        {/* Article Analytics - requires analytics.view permission */}
        <Route path="/dashboard/article-analytics">
          {() => (
            <ProtectedRoute requireStaff={true} requireAnyPermission={["analytics.view"]}>
              <Suspense fallback={<PageLoader />}>
                <ArticleAnalyticsDashboard />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/articles/new">{() => <LazyRoute component={ArticleEditor} />}</Route>
        <Route path="/dashboard/article/new">{() => <LazyRoute component={ArticleEditor} />}</Route>
        <Route path="/dashboard/article/:id/preview">{() => <LazyRoute component={ArticlePreview} />}</Route>
        <Route path="/dashboard/articles/:id/preview">{() => <LazyRoute component={ArticlePreview} />}</Route>
        <Route path="/dashboard/articles/:id/edit">{() => <LazyRoute component={ArticleEditor} />}</Route>
        <Route path="/dashboard/articles/:id">{() => <LazyRoute component={ArticleEditor} />}</Route>
        <Route path="/dashboard/articles">{() => <LazyRoute component={ArticlesManagement} />}</Route>
        <Route path="/dashboard/quizzes">{() => <LazyRoute component={QuizManagement} />}</Route>
        <Route path="/dashboard/opinion">{() => <LazyRoute component={OpinionManagement} />}</Route>
        <Route path="/dashboard/categories">{() => <LazyRoute component={CategoriesManagement} />}</Route>
        <Route path="/dashboard/media-library">{() => <LazyRoute component={MediaLibrary} />}</Route>
        <Route path="/dashboard/ai-tools">{() => <LazyRoute component={AITools} />}</Route>
        {/* Infographic Studio - restricted from reporters */}
        <Route path="/dashboard/infographic-studio">
          {() => (
            <ProtectedRoute requireStaff={true} excludeRoles={["reporter"]}>
              <Suspense fallback={<PageLoader />}>
                <InfographicStudio />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/users">{() => <LazyRoute component={UsersManagement} />}</Route>
        <Route path="/dashboard/staff">{() => <LazyRoute component={StaffMembers} />}</Route>
        <Route path="/dashboard/roles">{() => <LazyRoute component={RolesManagement} />}</Route>
        <Route path="/dashboard/themes/switcher">{() => <LazyRoute component={ThemeSwitcher} />}</Route>
        <Route path="/dashboard/themes/:id">{() => <LazyRoute component={ThemeEditor} />}</Route>
        <Route path="/dashboard/themes">{() => <LazyRoute component={ThemeManager} />}</Route>
        <Route path="/profile/:userId">{() => <LazyRoute component={PublicProfile} />}</Route>
        <Route path="/profile">{() => <LazyRoute component={Profile} />}</Route>
        <Route path="/preferences">{() => <LazyRoute component={PreferencesCenter} />}</Route>
        <Route path="/discover-users">{() => <LazyRoute component={DiscoverUsers} />}</Route>
        <Route path="/complete-profile">{() => <LazyRoute component={CompleteProfile} />}</Route>
        <Route path="/select-interests">{() => <LazyRoute component={SelectInterests} />}</Route>
        <Route path="/interests/edit">{() => <LazyRoute component={EditInterests} />}</Route>
        <Route path="/notification-settings">{() => <LazyRoute component={NotificationSettings} />}</Route>
        
        {/* Publisher Dashboard Routes */}
        <Route path="/dashboard/publisher">{() => <LazyRoute component={PublisherDashboard} />}</Route>
        <Route path="/dashboard/publisher/articles">{() => <LazyRoute component={PublisherArticles} />}</Route>
        <Route path="/dashboard/publisher/article/new">{() => <LazyRoute component={PublisherArticleEditor} />}</Route>
        <Route path="/dashboard/publisher/article/:id/edit">{() => <LazyRoute component={PublisherArticleEditor} />}</Route>
        <Route path="/dashboard/publisher/credits">{() => <LazyRoute component={PublisherCredits} />}</Route>
        
        {/* Admin Publisher Management Routes */}
        <Route path="/dashboard/admin/publishers">{() => <LazyRoute component={AdminPublishers} />}</Route>
        <Route path="/dashboard/admin/publishers/:id">{() => <LazyRoute component={AdminPublisherDetails} />}</Route>
        <Route path="/dashboard/admin/publisher-articles">{() => <LazyRoute component={AdminPublisherArticles} />}</Route>
        <Route path="/dashboard/admin/publisher-analytics">{() => <LazyRoute component={AdminPublisherAnalytics} />}</Route>
        
        {/* Correspondent Registration Routes */}
        <Route path="/correspondent/register">{() => <LazyRoute component={CorrespondentRegister} />}</Route>
        <Route path="/dashboard/correspondents">{() => <LazyRoute component={CorrespondentApplications} />}</Route>
        
        {/* Opinion Author Routes */}
        <Route path="/opinion-author/register">{() => <LazyRoute component={OpinionAuthorRegister} />}</Route>
        <Route path="/dashboard/opinion-author-applications">{() => <LazyRoute component={OpinionAuthorApplications} />}</Route>
        <Route path="/dashboard/opinion-author">{() => <LazyRoute component={OpinionAuthorDashboard} />}</Route>
        
        {/* iFox Admin Dashboard Routes */}
        <Route path="/dashboard/admin/ifox">{() => <LazyRoute component={IFoxDashboard} />}</Route>
        <Route path="/dashboard/admin/ifox/content-generator">{() => <LazyRoute component={IFoxContentGenerator} />}</Route>
        <Route path="/dashboard/admin/ifox/articles">{() => <LazyRoute component={IFoxArticles} />}</Route>
        <Route path="/dashboard/admin/ifox/articles/new">{() => <LazyRoute component={IFoxArticleEditor} />}</Route>
        <Route path="/dashboard/admin/ifox/articles/edit/:id">{() => <LazyRoute component={IFoxArticleEditor} />}</Route>
        <Route path="/dashboard/admin/ifox/categories/:slug">{() => <LazyRoute component={IFoxCategory} />}</Route>
        <Route path="/dashboard/admin/ifox/media">{() => <LazyRoute component={IFoxMedia} />}</Route>
        <Route path="/dashboard/admin/ifox/image-studio">{() => <LazyRoute component={ImageStudio} />}</Route>
        <Route path="/dashboard/admin/ifox/schedule">{() => <LazyRoute component={IFoxSchedule} />}</Route>
        <Route path="/dashboard/admin/ifox/analytics">{() => <LazyRoute component={IFoxAnalytics} />}</Route>
        <Route path="/dashboard/admin/ifox/settings">{() => <LazyRoute component={IFoxSettings} />}</Route>
        <Route path="/dashboard/admin/ifox/ai-management">{() => <LazyRoute component={AIManagementDashboard} />}</Route>
        <Route path="/dashboard/admin/ifox/ai-tasks">{() => <LazyRoute component={IFoxAITasks} />}</Route>
        
        {/* Onboarding routes - Arabic */}
        <Route path="/ar/onboarding/welcome">{() => <LazyRoute component={Welcome} />}</Route>
        <Route path="/ar/onboarding/interests">{() => <LazyRoute component={OnboardingInterests} />}</Route>
        <Route path="/ar/onboarding/personalize">{() => <LazyRoute component={Personalize} />}</Route>
        
        {/* Onboarding routes - Legacy (without /ar/) */}
        <Route path="/onboarding/welcome">{() => <LazyRoute component={Welcome} />}</Route>
        <Route path="/onboarding/interests">{() => <LazyRoute component={OnboardingInterests} />}</Route>
        <Route path="/onboarding/personalize">{() => <LazyRoute component={Personalize} />}</Route>
        
        <Route path="/daily-brief">{() => <LazyRoute component={DailyBrief} />}</Route>
        <Route path="/moment-by-moment">{() => <LazyRoute component={MomentByMoment} />}</Route>
        <Route path="/live">{() => <LazyRoute component={MomentByMoment} />}</Route>
        
        {/* Coming Soon Pages - Routes defined in nav.config.ts but not implemented yet */}
        <Route path="/dashboard/tags">{() => <LazyRoute component={TagsManagement} />}</Route>
        <Route path="/dashboard/real-estate-developers">{() => <LazyRoute component={RealEstateDevelopersAdmin} />}</Route>
        <Route path="/dashboard/smart-links">{() => <LazyRoute component={SmartLinksManagement} />}</Route>
        <Route path="/dashboard/ai-moderation">{() => <LazyRoute component={AIModerationDashboard} />}</Route>
        <Route path="/admin/comments/suspicious-words">{() => <LazyRoute component={SuspiciousWordsManagement} />}</Route>
        <Route path="/dashboard/data-stories">{() => <LazyRoute component={DataStoryGenerator} />}</Route>
        <Route path="/dashboard/smart-journalist">{() => <LazyRoute component={SmartJournalist} />}</Route>
        <Route path="/dashboard/ai/summaries">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/ai/deep-analysis-list">{() => <LazyRoute component={DeepAnalysisList} />}</Route>
        <Route path="/dashboard/ai/deep">{() => <LazyRoute component={DeepAnalysis} />}</Route>
        <Route path="/dashboard/ai/headlines">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/permissions">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/templates">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/analytics/trending">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/analytics/behavior">{() => <LazyRoute component={UserBehavior} />}</Route>
        <Route path="/dashboard/analytics/advanced">{() => <LazyRoute component={AdvancedAnalytics} />}</Route>
        <Route path="/dashboard/analytics/ab-tests/:id">{() => <LazyRoute component={ABTestDetail} />}</Route>
        <Route path="/dashboard/analytics/ab-tests">{() => <LazyRoute component={ABTestsManagement} />}</Route>
        <Route path="/dashboard/analytics/recommendations">{() => <LazyRoute component={RecommendationAnalytics} />}</Route>
        <Route path="/dashboard/sentiment-analytics">{() => <LazyRoute component={SentimentAnalytics} />}</Route>
        <Route path="/dashboard/personalization-analytics">{() => <LazyRoute component={PersonalizationAnalytics} />}</Route>
        <Route path="/dashboard/newsletter-analytics">{() => <LazyRoute component={NewsletterAnalytics} />}</Route>
        <Route path="/dashboard/rss-feeds">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/integrations">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/storage">{() => <LazyRoute component={ComingSoon} />}</Route>
        <Route path="/dashboard/audit-logs">{() => <LazyRoute component={ActivityLogsPage} />}</Route>
        <Route path="/dashboard/contact-messages/:id">
          {() => (
            <ProtectedRoute requireStaff={true} requireRoles={["admin", "editor"]}>
              <Suspense fallback={<PageLoader />}>
                <ContactMessageDetail />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/contact-messages">
          {() => (
            <ProtectedRoute requireStaff={true} requireRoles={["admin", "editor"]}>
              <Suspense fallback={<PageLoader />}>
                <ContactMessagesManagement />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/system-announcements">
          {() => (
            <ProtectedRoute requireStaff={true} requireRoles={["admin"]}>
              <Suspense fallback={<PageLoader />}>
                <SystemAnnouncementsManagement />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/dashboard/profile">{() => <LazyRoute component={DashboardProfile} />}</Route>
        <Route path="/dashboard/notifications">{() => <LazyRoute component={Notifications} />}</Route>
        <Route path="/dashboard/notification-admin">{() => <LazyRoute component={NotificationAdmin} />}</Route>
        <Route path="/dashboard/email-templates">{() => <LazyRoute component={EmailTemplatesPage} />}</Route>
        <Route path="/notifications">{() => <LazyRoute component={UserNotifications} />}</Route>
        <Route path="/recommendation-settings">{() => <LazyRoute component={UserRecommendationSettings} />}</Route>
        <Route path="/my-follows">{() => <LazyRoute component={MyFollows} />}</Route>
        <Route path="/my-keywords">{() => <LazyRoute component={MyKeywords} />}</Route>
        <Route path="/dashboard/story-admin">{() => <LazyRoute component={StoryAdmin} />}</Route>
        <Route path="/dashboard/system-settings">{() => <LazyRoute component={SystemSettings} />}</Route>
        <Route path="/dashboard/auto-image-settings">{() => <LazyRoute component={AutoImageSettings} />}</Route>
        <Route path="/dashboard/focal-points">{() => <LazyRoute component={FocalPointDashboard} />}</Route>
        <Route path="/dashboard/editor-alerts">{() => <LazyRoute component={EditorAlertsSettings} />}</Route>
        <Route path="/dashboard/communications">{() => <LazyRoute component={CommunicationsManagement} />}</Route>
        <Route path="/dashboard/staff-communications">{() => <LazyRoute component={StaffCommunicationsPage} />}</Route>
        <Route path="/dashboard/productivity">
          {() => (
            <ProtectedRoute requireStaff={true} requireAnyPermission={["staff.view_productivity"]}>
              <Suspense fallback={<PageLoader />}>
                <StaffProductivity />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        {/* Breaking Ticker - requires breaking_ticker.manage permission */}
        <Route path="/dashboard/breaking-ticker">
          {() => (
            <ProtectedRoute requireStaff={true} requireAnyPermission={["breaking_ticker.manage"]}>
              <Suspense fallback={<PageLoader />}>
                <BreakingTickerManager />
              </Suspense>
            </ProtectedRoute>
          )}
        </Route>
        
        {/* Legacy redirects */}
        <Route path="/dashboard/email-agent">{() => <LazyRoute component={CommunicationsManagement} />}</Route>
        <Route path="/dashboard/voice-management">{() => <LazyRoute component={VoiceManagement} />}</Route>
        <Route path="/dashboard/transcription-tool">{() => <LazyRoute component={TranscriptionTool} />}</Route>
        <Route path="/admin/whatsapp">{() => <LazyRoute component={CommunicationsManagement} />}</Route>
        
        {/* Admin Routes */}
        <Route path="/admin/accessibility-insights">{() => <LazyRoute component={AccessibilityInsights} />}</Route>
        
        {/* Legacy Archive Routes - Old URL patterns from previous platform */}
        <Route path="/saudia/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/world/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/mylife/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/stations/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/sports/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/tourism/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/business/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/technology/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/cars/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/media/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/articles/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        {/* Additional legacy patterns */}
        <Route path="/local/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/sport/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/economy/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/tech/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/health/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/culture/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/entertainment/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/politics/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/saudi/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/gulf/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/arab/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/society/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/accidents/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        <Route path="/breaking/:id">{() => <LazyRoute component={ArchivePage} />}</Route>
        
        <Route>{() => <LazyRoute component={NotFound} />}</Route>
      </Switch>
    </>
  );
}

function App() {
  // After a recovery reload (URL contains `_cb=<timestamp>`), strip the
  // parameter from the address bar once the app is stable. This is purely
  // cosmetic — keeps shared/copied URLs clean and prevents users from seeing
  // a mysterious cache-bust timestamp in their browser. We deliberately wait
  // 30 seconds so that if a still-broken lazy chunk is going to fail again
  // (the very thing that caused the recovery in the first place), the
  // 3-attempt session circuit breaker can still trip while `_cb` is present.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("_cb")) return;
    const timer = window.setTimeout(() => {
      try {
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete("_cb");
        const qs = cleanParams.toString();
        const newUrl =
          window.location.pathname +
          (qs ? `?${qs}` : "") +
          window.location.hash;
        window.history.replaceState(window.history.state, "", newUrl);
      } catch {}
    }, 30000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <AccessibilityProvider>
            <LiveRegionProvider>
              <VoiceAssistantProvider>
                <TooltipProvider>
                  <SkipLinks />
                  <Toaster />
                  <VoiceCommandsManager />
                  <ReadingHistorySync />
                  <WebMCPProvider />
                  <UpdateAvailableBanner />
                  <ErrorBoundary>
                    <div id="main-content" tabIndex={-1}>
                      <Router />
                    </div>
                  </ErrorBoundary>
                </TooltipProvider>
              </VoiceAssistantProvider>
            </LiveRegionProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
