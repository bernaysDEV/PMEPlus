import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";

interface SmartInsightsProps {
  articleId: string;
  articleTitle: string;
  /** When true, hides the built-in primary trigger button and auto-starts analysis on mount. */
  autoStart?: boolean;
}

interface InsightsData {
  insights: string[];
  contextToken: string;
  model: string;
  generatedAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function SmartInsights({ articleId, articleTitle, autoStart = false }: SmartInsightsProps) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const insightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/articles/${articleId}/smart-insights`, {
        method: "POST",
      });
      return response as { success: boolean; data: InsightsData };
    },
    onSuccess: (data) => {
      if (data.success) {
        setInsights(data.data);
      }
    },
    onError: (error: any) => {
      toast({
        title: "فشل التحليل",
        description: error.message || "حدث خطأ أثناء توليد التحليل الذكي",
        variant: "destructive",
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(`/api/articles/${articleId}/smart-insights/chat`, {
        method: "POST",
        body: JSON.stringify({
          message,
          chatHistory: chatHistory.slice(-10),
        }),
      });
      return response as { success: boolean; data: { response: string; model: string } };
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        setChatHistory((prev) => [
          ...prev,
          { role: "user", content: variables },
          { role: "assistant", content: data.data.response },
        ]);
        setChatInput("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "فشل الإجابة",
        description: error.message || "حدث خطأ أثناء الحصول على الإجابة",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!chatInput.trim() || chatMutation.isPending) return;
    chatMutation.mutate(chatInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current && !insights && !insightsMutation.isPending) {
      hasAutoStartedRef.current = true;
      insightsMutation.mutate();
    }
  }, [autoStart, insights, insightsMutation]);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {!autoStart && (
        <Button
          onClick={() => insightsMutation.mutate()}
          disabled={insightsMutation.isPending}
          variant="default"
          className="w-full gap-2"
          data-testid="button-smart-insights"
        >
          {insightsMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <Lightbulb className="h-5 w-5" />
              تحليل ذكي للخبر
            </>
          )}
        </Button>
      )}

      {autoStart && insightsMutation.isPending && !insights && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="status-insights-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحليل...
        </div>
      )}

      <AnimatePresence>
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
              data-testid="card-smart-insights"
            >
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border flex-wrap">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-[10px] font-bold uppercase tracking-[0.14em] text-accent"
                    data-testid="text-insights-ai-label"
                  >
                    ذكاء اصطناعي · Property ME
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                    تحليل الخبر
                  </h3>
                </div>
              </div>

              <ol className="space-y-4 list-none m-0 p-0">
                {insights?.insights?.map((insight, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-3"
                    data-testid={`text-insight-${index}`}
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center text-xs font-bold tabular-nums">
                      {index + 1}
                    </span>
                    <p
                      className="text-sm sm:text-base leading-relaxed text-foreground/90"
                      data-testid={`text-insight-content-${index}`}
                    >
                      {insight}
                    </p>
                  </motion.li>
                ))}
              </ol>

              {/* Temporarily disabled: Ask AI feature */}
              {false && (
                <div className="mt-6 pt-4 border-t border-border">
                  <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        data-testid="button-ask-ai"
                      >
                        <MessageSquare className="h-4 w-4" />
                        اسأل الذكاء الاصطناعي
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full sm:max-w-lg" dir="rtl">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" />
                          محادثة ذكية حول الخبر
                        </SheetTitle>
                      </SheetHeader>

                      <div className="flex flex-col h-[calc(100vh-8rem)] mt-4">
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4">
                          <strong>الخبر:</strong> {articleTitle}
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                          <div className="space-y-4">
                            {chatHistory.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>اطرح سؤالك حول الخبر وسأساعدك في فهمه بشكل أعمق</p>
                              </div>
                            )}

                            {chatHistory.map((msg, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                              >
                                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                                  {msg.role === "user" ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Bot className="h-4 w-4" />
                                  )}
                                </div>
                                <div
                                  className={`flex-1 rounded-2xl px-4 py-3 ${
                                    msg.role === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                </div>
                              </motion.div>
                            ))}

                            {chatMutation.isPending && (
                              <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                                  <Bot className="h-4 w-4" />
                                </div>
                                <div className="bg-muted rounded-2xl px-4 py-3">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>

                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="اكتب سؤالك هنا..."
                            disabled={chatMutation.isPending}
                            className="flex-1"
                            data-testid="input-chat-message"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || chatMutation.isPending}
                            size="icon"
                            data-testid="button-send-chat"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {insightsMutation.isError && !insights && (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
          data-testid="card-insights-error"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">فشل توليد التحليل. يرجى المحاولة مرة أخرى.</p>
            </div>
            {autoStart && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => insightsMutation.mutate()}
                disabled={insightsMutation.isPending}
                data-testid="button-retry-insights"
                className="gap-2"
              >
                {insightsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                إعادة المحاولة
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
