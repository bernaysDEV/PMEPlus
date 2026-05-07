import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useToast } from "@/hooks/use-toast";
import { useResolvedLanguage } from "@/hooks/useResolvedLanguage";

interface VoiceCommandConfig {
  id: string;
  arabic: string[];
  english: string[];
  getRoute: (lang: 'ar' | 'en') => string | null;
  getDescription: () => { ar: string; en: string };
  priority?: number;
}

/**
 * useVoiceCommands - Global voice commands hook
 *
 * Registers global bilingual voice commands for navigation, search, and help.
 * Automatically provides speech and toast feedback for executed commands.
 *
 * IMPORTANT: All feedback uses current UI language, not command phrase language.
 */
export function useVoiceCommands() {
  const { registerCommand, unregisterCommand, speak } = useVoiceAssistant();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const currentLang = useResolvedLanguage();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const globalCommands: VoiceCommandConfig[] = [
      // Navigation - Home
      {
        id: 'home',
        arabic: ['الرئيسية', 'اذهب إلى الرئيسية', 'اذهب للرئيسية', 'الصفحة الرئيسية'],
        english: ['home', 'go to home', 'go home', 'homepage'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en';
          return '/';  // Arabic default
        },
        getDescription: () => ({
          ar: 'الانتقال إلى الصفحة الرئيسية',
          en: 'Go to homepage',
        }),
      },

      // Navigation - News
      {
        id: 'news',
        arabic: ['الأخبار', 'اذهب إلى الأخبار', 'صفحة الأخبار'],
        english: ['news', 'go to news', 'news page'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/news';
          return '/news';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى صفحة الأخبار',
          en: 'Go to news page',
        }),
      },

      // Navigation - Opinion
      {
        id: 'opinion',
        arabic: ['الرأي', 'اذهب إلى الرأي', 'مقالات الرأي'],
        english: ['opinion', 'go to opinion', 'opinion articles'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/opinion';
          return '/opinion';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى صفحة الرأي',
          en: 'Go to opinion page',
        }),
      },

      // Navigation - Categories
      {
        id: 'categories',
        arabic: ['التصنيفات', 'اذهب إلى التصنيفات', 'الأقسام'],
        english: ['categories', 'go to categories', 'sections'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/categories';
          return '/categories';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى صفحة التصنيفات',
          en: 'Go to categories page',
        }),
      },

      // Navigation - Dashboard
      {
        id: 'dashboard',
        arabic: ['لوحة التحكم', 'اذهب إلى لوحة التحكم'],
        english: ['dashboard', 'go to dashboard', 'control panel'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/dashboard';
          return '/dashboard';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى لوحة التحكم',
          en: 'Go to dashboard',
        }),
      },

      // Navigation - Profile
      {
        id: 'profile',
        arabic: ['الملف الشخصي', 'اذهب إلى الملف الشخصي', 'حسابي'],
        english: ['profile', 'go to profile', 'my account'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/profile';
          return '/profile';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى الملف الشخصي',
          en: 'Go to profile',
        }),
      },

      // Navigation - Daily Brief
      {
        id: 'daily-brief',
        arabic: ['الموجز اليومي', 'اذهب إلى الموجز اليومي'],
        english: ['daily brief', 'go to daily brief'],
        getRoute: (lang) => {
          if (lang === 'en') return '/en/daily-brief';
          return '/daily-brief';  // Arabic
        },
        getDescription: () => ({
          ar: 'الانتقال إلى الموجز اليومي',
          en: 'Go to daily brief',
        }),
      },

      // Navigation - Back
      {
        id: 'back',
        arabic: ['رجوع', 'ارجع', 'عودة'],
        english: ['back', 'go back'],
        getRoute: () => '', // Special case - uses browser history
        getDescription: () => ({
          ar: 'العودة للصفحة السابقة',
          en: 'Go back to previous page',
        }),
      },

      // Help
      {
        id: 'help',
        arabic: ['مساعدة', 'ما الأوامر', 'أوامر الصوت', 'ساعدني'],
        english: ['help', 'what can i do', 'voice commands', 'show commands'],
        getRoute: () => '', // Special case - shows help dialog
        getDescription: () => ({
          ar: 'عرض الأوامر الصوتية المتاحة',
          en: 'Show available voice commands',
        }),
      },
    ];

    // Helper for command action
    const handleCommandAction = (cmd: VoiceCommandConfig, route: string | null, descriptions: { ar: string; en: string }) => {
      try {
        // Execute navigation action
        if (cmd.id === 'back') {
          window.history.back();
        } else if (cmd.id === 'help') {
          setShowHelp(true);
        } else if (route) {
          navigate(route);
        }

        // CRITICAL: Use current UI language for feedback
        const feedbackText = currentLang === 'ar' ? descriptions.ar : descriptions.en;
        const speechLang = currentLang === 'ar' ? 'ar-SA' : 'en-US';

        speak(feedbackText, speechLang);
        toast({
          title: feedbackText,
        });
      } catch (error) {
        console.error('Voice command error:', error);
        const errorTitle = currentLang === 'ar' ? 'خطأ في تنفيذ الأمر' : 'Command Error';
        const errorDesc = currentLang === 'ar'
          ? 'حدث خطأ أثناء تنفيذ الأمر الصوتي'
          : 'An error occurred while executing the voice command';

        toast({
          title: errorTitle,
          description: errorDesc,
          variant: 'destructive',
        });
      }
    };

    // Register all command variants
    globalCommands.forEach(cmd => {
      const route = cmd.getRoute(currentLang);
      const descriptions = cmd.getDescription();

      // Skip if route doesn't exist for current language
      if (route === null && cmd.id !== 'back' && cmd.id !== 'help') {
        return;
      }

      // Register Arabic variants
      cmd.arabic.forEach(phrase => {
        registerCommand({
          command: phrase.toLowerCase(),
          description: descriptions.ar,
          action: async () => handleCommandAction(cmd, route, descriptions),
        });
      });

      // Register English variants
      cmd.english.forEach(phrase => {
        registerCommand({
          command: phrase.toLowerCase(),
          description: descriptions.en,
          action: async () => handleCommandAction(cmd, route, descriptions),
        });
      });
    });

    // Cleanup function
    return () => {
      globalCommands.forEach(cmd => {
        cmd.arabic.forEach(phrase => unregisterCommand(phrase.toLowerCase()));
        cmd.english.forEach(phrase => unregisterCommand(phrase.toLowerCase()));
      });
    };
  }, [registerCommand, unregisterCommand, navigate, speak, toast, currentLang]);

  return {
    showHelp,
    setShowHelp,
  };
}
