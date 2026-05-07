import { useState, useEffect, useCallback } from "react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useResolvedLanguage } from "@/hooks/useResolvedLanguage";
import { useToast } from "@/hooks/use-toast";

/**
 * useArticleVoiceCommands - Article reading voice commands
 *
 * Provides voice commands for reading articles aloud with start/stop controls.
 * Automatically strips HTML tags and provides reading status.
 *
 * IMPORTANT: All feedback uses current UI language, not command phrase language.
 *
 * @param articleContent - HTML content of the article
 * @param articleTitle - Title of the article
 * @returns Reading state and control functions
 */
export function useArticleVoiceCommands(
  articleContent?: string,
  articleTitle?: string
) {
  const { registerCommand, unregisterCommand, speak, stopSpeaking } = useVoiceAssistant();
  const currentLang = useResolvedLanguage();
  const { toast } = useToast();
  const [isReading, setIsReading] = useState(false);

  const stripHTML = useCallback((html: string): string => {
    // Create a temporary div element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script and style elements
    const scripts = temp.getElementsByTagName('script');
    const styles = temp.getElementsByTagName('style');

    Array.from(scripts).forEach(script => script.remove());
    Array.from(styles).forEach(style => style.remove());

    // Get text content and clean up whitespace
    return temp.textContent || temp.innerText || '';
  }, []);

  const startReading = useCallback(async () => {
    if (!articleContent || !articleTitle) {
      toast({
        title: currentLang === 'ar' ? 'لا يوجد محتوى' : 'No content',
        description: currentLang === 'ar'
          ? 'لا يوجد محتوى متاح للقراءة'
          : 'No content available to read',
        variant: 'destructive',
      });
      return;
    }

    try {
      const plainText = stripHTML(articleContent);
      const readingText = `${articleTitle}. ${plainText}`;

      const lang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
      await speak(readingText, lang);

      setIsReading(true);

      toast({
        title: currentLang === 'ar' ? 'بدء القراءة' : 'Reading started',
        description: currentLang === 'ar'
          ? 'جاري قراءة المقالة'
          : 'Reading article aloud',
      });
    } catch (error) {
      console.error('Failed to start reading:', error);

      toast({
        title: currentLang === 'ar' ? 'خطأ في القراءة' : 'Reading error',
        description: currentLang === 'ar'
          ? 'فشل بدء قراءة المقالة'
          : 'Failed to start reading article',
        variant: 'destructive',
      });
      setIsReading(false);
    }
  }, [articleContent, articleTitle, speak, toast, currentLang, stripHTML]);

  const stopReading = useCallback(() => {
    stopSpeaking();
    setIsReading(false);

    toast({
      title: currentLang === 'ar' ? 'إيقاف القراءة' : 'Reading stopped',
      description: currentLang === 'ar'
        ? 'تم إيقاف قراءة المقالة'
        : 'Article reading stopped',
    });
  }, [stopSpeaking, toast, currentLang]);

  useEffect(() => {
    if (!articleContent || !articleTitle) {
      return;
    }

    const commands = [
      // Arabic commands
      { phrase: 'اقرأ المقالة', description: 'قراءة المقالة بصوت عالٍ', action: startReading },
      { phrase: 'اقرأ', description: 'قراءة المقالة', action: startReading },
      { phrase: 'توقف عن القراءة', description: 'إيقاف قراءة المقالة', action: stopReading },
      { phrase: 'توقف', description: 'إيقاف القراءة', action: stopReading },
      { phrase: 'أوقف القراءة', description: 'إيقاف القراءة', action: stopReading },

      // English commands
      { phrase: 'read article', description: 'Read article aloud', action: startReading },
      { phrase: 'read this', description: 'Read this article', action: startReading },
      { phrase: 'start reading', description: 'Start reading', action: startReading },
      { phrase: 'stop reading', description: 'Stop reading article', action: stopReading },
      { phrase: 'stop', description: 'Stop reading', action: stopReading },
    ];

    commands.forEach(cmd => {
      registerCommand({
        command: cmd.phrase.toLowerCase(),
        description: cmd.description,
        action: cmd.action,
      });
    });

    return () => {
      commands.forEach(cmd => unregisterCommand(cmd.phrase.toLowerCase()));
      stopReading();
    };
  }, [articleContent, registerCommand, unregisterCommand, startReading, stopReading]);

  // Listen for speaking end event
  useEffect(() => {
    const handleSpeakingEnd = () => {
      setIsReading(false);
    };

    window.addEventListener('voice:speaking-end', handleSpeakingEnd);
    return () => window.removeEventListener('voice:speaking-end', handleSpeakingEnd);
  }, []);

  return {
    isReading,
    startReading,
    stopReading,
  };
}
