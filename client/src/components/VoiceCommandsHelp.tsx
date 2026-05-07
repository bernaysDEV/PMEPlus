import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResolvedLanguage } from "@/hooks/useResolvedLanguage";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { Mic, MicOff, Volume2 } from "lucide-react";

type VoiceCommandsHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * VoiceCommandsHelp - Dialog displaying available voice commands
 *
 * Shows a comprehensive list of all available voice commands organized by category.
 * Displays both Arabic and English command variants with descriptions and routes.
 */
export function VoiceCommandsHelp({ open, onOpenChange }: VoiceCommandsHelpProps) {
  const currentLang = useResolvedLanguage();
  const { isListening, isSpeaking, isSupported, startListening, stopListening } = useVoiceAssistant();

  // Localized messages for the listening button
  const listeningMessages = {
    ar: {
      startListening: 'ابدأ الاستماع',
      stopListening: 'أوقف الاستماع',
      listening: 'جاري الاستماع...',
      speaking: 'جاري القراءة...',
      notSupported: 'المتصفح لا يدعم الأوامر الصوتية',
      instructions: 'اضغط على الزر ثم قل أحد الأوامر أدناه',
    },
    en: {
      startListening: 'Start Listening',
      stopListening: 'Stop Listening',
      listening: 'Listening...',
      speaking: 'Speaking...',
      notSupported: 'Browser does not support voice commands',
      instructions: 'Click the button then say one of the commands below',
    },
  };
  const t = listeningMessages[currentLang];

  // Centralized route generation - matches useVoiceCommands.ts logic
  const getNavigationRoute = (id: string, lang: string): string | null => {
    const routes: Record<string, (lang: string) => string | null> = {
      'home': (lang) => lang === 'en' ? '/en' : '/',
      'news': (lang) => lang === 'en' ? '/en/news' : '/news',
      'opinion': (lang) => lang === 'en' ? '/en/opinion' : '/opinion',
      'categories': (lang) => lang === 'en' ? '/en/categories' : '/categories',
      'dashboard': (lang) => lang === 'en' ? '/en/dashboard' : '/dashboard',
      'profile': (lang) => lang === 'en' ? '/en/profile' : '/profile',
      'daily-brief': (lang) => lang === 'en' ? '/en/daily-brief' : '/daily-brief',
    };

    return routes[id]?.(lang) || null;
  };

  // Define navigation items
  const navigationItems = [
    {
      id: 'home',
      ar: ['الرئيسية', 'اذهب إلى الرئيسية'],
      en: ['home', 'go to home'],
      description: { ar: 'الانتقال إلى الصفحة الرئيسية', en: 'Go to homepage' },
    },
    {
      id: 'news',
      ar: ['الأخبار', 'اذهب إلى الأخبار'],
      en: ['news', 'go to news'],
      description: { ar: 'الانتقال إلى صفحة الأخبار', en: 'Go to news page' },
    },
    {
      id: 'opinion',
      ar: ['الرأي', 'اذهب إلى الرأي'],
      en: ['opinion', 'go to opinion'],
      description: { ar: 'الانتقال إلى صفحة الرأي', en: 'Go to opinion page' },
    },
    {
      id: 'categories',
      ar: ['التصنيفات', 'اذهب إلى التصنيفات'],
      en: ['categories', 'go to categories'],
      description: { ar: 'الانتقال إلى صفحة التصنيفات', en: 'Go to categories page' },
    },
    {
      id: 'dashboard',
      ar: ['لوحة التحكم'],
      en: ['dashboard'],
      description: { ar: 'الانتقال إلى لوحة التحكم', en: 'Go to dashboard' },
    },
    {
      id: 'profile',
      ar: ['الملف الشخصي', 'حسابي'],
      en: ['profile', 'my account'],
      description: { ar: 'الانتقال إلى الملف الشخصي', en: 'Go to profile' },
    },
    {
      id: 'daily-brief',
      ar: ['الموجز اليومي'],
      en: ['daily brief'],
      description: { ar: 'الانتقال إلى الموجز اليومي', en: 'Go to daily brief' },
    },
    {
      id: 'back',
      ar: ['رجوع', 'ارجع'],
      en: ['back', 'go back'],
      description: { ar: 'العودة للصفحة السابقة', en: 'Go back to previous page' },
    },
  ].map(item => {
    const route = item.id === 'back'
      ? (currentLang === 'ar' ? '(تاريخ المتصفح)' : '(browser history)')
      : getNavigationRoute(item.id, currentLang);
    const phrases = currentLang === 'ar' ? item.ar : item.en;
    const description = item.description[currentLang] || item.description.en;

    if (!route || !phrases || !description) return null;

    return {
      ar: item.ar,
      en: item.en,
      description,
      route,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const commands = [
    {
      category: currentLang === 'ar' ? 'التنقل' : 'Navigation',
      items: navigationItems,
    },
    {
      category: currentLang === 'ar' ? 'قراءة المقالات' : 'Article Reading',
      items: [
        {
          ar: ['اقرأ المقالة', 'اقرأ'],
          en: ['read article', 'read this'],
          description: currentLang === 'ar' ? 'قراءة المقالة الحالية بصوت عالٍ' : 'Read current article aloud',
          route: currentLang === 'ar' ? '(الصفحة الحالية)' : '(current page)',
        },
        {
          ar: ['توقف عن القراءة', 'توقف', 'أوقف القراءة'],
          en: ['stop reading', 'stop'],
          description: currentLang === 'ar' ? 'إيقاف قراءة المقالة' : 'Stop reading article',
          route: currentLang === 'ar' ? '(الصفحة الحالية)' : '(current page)',
        },
      ],
    },
    {
      category: currentLang === 'ar' ? 'المساعدة' : 'Help',
      items: [
        {
          ar: ['مساعدة', 'ما الأوامر', 'أوامر الصوت'],
          en: ['help', 'what can i do', 'voice commands'],
          description: currentLang === 'ar' ? 'عرض قائمة الأوامر الصوتية' : 'Show voice commands list',
          route: currentLang === 'ar' ? '(مربع حوار)' : '(dialog)',
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-voice-commands-help">
        <DialogHeader>
          <DialogTitle>
            {currentLang === 'ar' ? 'الأوامر الصوتية' : 'Voice Commands'}
          </DialogTitle>
          <DialogDescription>
            {currentLang === 'ar'
              ? 'قائمة الأوامر الصوتية المتاحة للتحكم في الموقع'
              : 'Available voice commands to control the website'}
          </DialogDescription>
        </DialogHeader>

        {/* Voice Listening Control Section */}
        <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg border mb-4" data-testid="voice-control-section">
          {isSupported ? (
            <>
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                onClick={() => isListening ? stopListening() : startListening()}
                disabled={isSpeaking}
                className="gap-2 min-w-[200px]"
                data-testid="button-voice-listen"
              >
                {isSpeaking ? (
                  <>
                    <Volume2 className="h-5 w-5 animate-pulse" />
                    {t.speaking}
                  </>
                ) : isListening ? (
                  <>
                    <Mic className="h-5 w-5 animate-pulse" />
                    {t.listening}
                  </>
                ) : (
                  <>
                    <MicOff className="h-5 w-5" />
                    {t.startListening}
                  </>
                )}
              </Button>

              {isListening && (
                <div className="flex items-center gap-2 text-sm text-primary animate-pulse" data-testid="text-listening-indicator">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  {t.listening}
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center" data-testid="text-voice-instructions">
                {t.instructions}
              </p>
            </>
          ) : (
            <p className="text-sm text-destructive text-center" data-testid="text-voice-not-supported">
              {t.notSupported}
            </p>
          )}
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6 pr-4">
            {commands.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-3">
                <h3 className="font-bold text-lg mb-3" data-testid={`text-category-${categoryIndex}`}>
                  {category.category}
                </h3>

                <div className="space-y-2">
                  {category.items.map((cmd, cmdIndex) => (
                    <div
                      key={cmdIndex}
                      className="flex flex-col gap-2 p-3 border rounded-md bg-card hover-elevate"
                      data-testid={`card-command-${categoryIndex}-${cmdIndex}`}
                    >
                      <div className="flex flex-wrap gap-2">
                        {currentLang === 'ar' ? (
                          <>
                            {cmd.ar.map((phrase, i) => (
                              <Badge
                                key={`ar-${i}`}
                                variant="outline"
                                className="text-xs"
                                data-testid={`badge-ar-${categoryIndex}-${cmdIndex}-${i}`}
                              >
                                {phrase}
                              </Badge>
                            ))}
                            {cmd.en.map((phrase, i) => (
                              <Badge
                                key={`en-${i}`}
                                variant="secondary"
                                className="text-xs opacity-60"
                                data-testid={`badge-en-${categoryIndex}-${cmdIndex}-${i}`}
                              >
                                {phrase}
                              </Badge>
                            ))}
                          </>
                        ) : (
                          <>
                            {cmd.en.map((phrase, i) => (
                              <Badge
                                key={`en-${i}`}
                                variant="outline"
                                className="text-xs"
                                data-testid={`badge-en-${categoryIndex}-${cmdIndex}-${i}`}
                              >
                                {phrase}
                              </Badge>
                            ))}
                            {cmd.ar.map((phrase, i) => (
                              <Badge
                                key={`ar-${i}`}
                                variant="secondary"
                                className="text-xs opacity-60"
                                data-testid={`badge-ar-${categoryIndex}-${cmdIndex}-${i}`}
                              >
                                {phrase}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`text-description-${categoryIndex}-${cmdIndex}`}
                      >
                        {cmd.description}
                      </p>
                      <p
                        className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded"
                        data-testid={`text-route-${categoryIndex}-${cmdIndex}`}
                      >
                        {currentLang === 'ar' ? 'المسار: ' : 'Route: '}{cmd.route}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
