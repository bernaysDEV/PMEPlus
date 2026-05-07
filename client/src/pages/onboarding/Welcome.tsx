import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, Newspaper, Brain } from "lucide-react";
import { motion } from "framer-motion";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth({ redirectToLogin: true });

  // Redirect if profile is already complete
  useEffect(() => {
    if (!isLoading && user?.isProfileComplete) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  const handleStart = () => {
    setLocation("/onboarding/interests");
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Brain className="w-12 h-12 text-primary" />
            </div>
            <Sparkles className="w-8 h-8 text-primary absolute -top-2 -right-2" />
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            👋 أهلاً بك في عالمك الذكي الجديد
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-foreground">
            أكمل رحلتك الذكية مع بروبرتي ME
          </p>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-lg text-muted-foreground">
            لنبدأ تجربة مصمّمة خصيصًا لك.
          </p>
          <p className="text-lg text-muted-foreground">
            اختر اهتماماتك لتصلك أخبار تلهمك وتهمّك فعلاً.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8"
        >
          <div className="space-y-2">
            <Newspaper className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-medium">أخبار مخصصة</p>
            <p className="text-xs text-muted-foreground">محتوى يناسب اهتماماتك</p>
          </div>
          <div className="space-y-2">
            <Brain className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-medium">ذكاء اصطناعي</p>
            <p className="text-xs text-muted-foreground">تحليل وملخصات ذكية</p>
          </div>
          <div className="space-y-2">
            <Sparkles className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-medium">تجربة فريدة</p>
            <p className="text-xs text-muted-foreground">مصممة خصيصاً لك</p>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <Button
            onClick={handleStart}
            size="lg"
            className="text-lg px-12 py-6 rounded-full"
            data-testid="button-start-journey"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            ابدأ الرحلة
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
