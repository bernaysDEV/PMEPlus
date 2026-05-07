import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";

/**
 * Resolves the current language from both route and LanguageContext
 * Supports bilingual detection: ar, en
 *
 * Detection logic:
 * - /en/* routes → 'en' (English)
 * - Default → LanguageContext language (ar/en)
 *
 * This hook provides a single source of truth for language detection
 * across all voice command components, ensuring consistent behavior
 * between speech recognition, command routing, and user feedback.
 *
 * @returns Resolved language: 'ar' | 'en'
 */
export function useResolvedLanguage() {
  const [location] = useLocation();
  const { language } = useLanguage();

  const resolvedLanguage = useMemo(() => {
    if (location.startsWith('/en')) return 'en';
    return language; // ar or en from LanguageContext
  }, [location, language]);

  return resolvedLanguage as 'ar' | 'en';
}
