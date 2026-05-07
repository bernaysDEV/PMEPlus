import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, MailCheck, ShieldQuestion } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthShell from "@/components/AuthShell";

const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.resetLink) setResetLink(response.resetLink);
      setSubmittedEmail(data.email);

      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: response.message,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في معالجة طلبك",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sidePanel = (
    <div className="space-y-3 text-sm text-white/85">
      <p className="leading-relaxed">
        لا تقلق، يحدث ذلك للجميع. أرسل بريدك الإلكتروني وسنساعدك على
        استعادة الوصول إلى حسابك خلال دقائق.
      </p>
      <ul className="space-y-2 text-xs text-white/70">
        <li>• تحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.</li>
        <li>• الرابط صالح لفترة محدودة لأسباب أمنية.</li>
        <li>• إذا لم تتلقَّ الرسالة، يمكنك إعادة المحاولة.</li>
      </ul>
    </div>
  );

  const footer = (
    <p className="text-center text-sm text-foreground/80">
      تذكّرت كلمة المرور؟{" "}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="font-semibold hover:underline"
        data-testid="link-back-to-login"
        style={{ color: "hsl(var(--accent))" }}
      >
        العودة لتسجيل الدخول
      </button>
    </p>
  );

  // Success state
  if (submittedEmail) {
    return (
      <AuthShell
        title="تحقّق من بريدك الإلكتروني"
        subtitle="إذا كان البريد مسجّلاً لدينا، فستصلك رسالة تحوي رابط إعادة التعيين."
        badge="استعادة كلمة المرور"
        backHref="/login"
        backLabel="العودة لتسجيل الدخول"
        footer={footer}
        side={sidePanel}
      >
        <div className="space-y-5">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center"
            style={{
              borderColor: "hsl(var(--success) / 0.3)",
              background: "hsl(var(--success) / 0.06)",
            }}
            data-testid="status-email-sent"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: "hsl(var(--success))" }}
            >
              <MailCheck className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-foreground">
              تم الإرسال بنجاح
            </p>
            <p className="text-sm text-muted-foreground">
              أرسلنا التعليمات إلى{" "}
              <span
                className="font-semibold text-foreground"
                dir="ltr"
                data-testid="text-target-email"
              >
                {submittedEmail}
              </span>
            </p>
          </div>

          {resetLink ? (
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="text-sm font-semibold">
                  رابط إعادة التعيين (للتطوير فقط):
                </p>
                <a
                  href={resetLink}
                  className="block break-all text-xs font-medium hover:underline"
                  data-testid="link-reset-dev"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {resetLink}
                </a>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSubmittedEmail(null);
                setResetLink(null);
                form.reset();
              }}
              data-testid="button-resend"
            >
              إعادة الإرسال
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => navigate("/login")}
              data-testid="button-go-login"
            >
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="نسيت كلمة المرور؟"
      subtitle="أدخل بريدك الإلكتروني المرتبط بحسابك وسنرسل لك رابطاً لإعادة التعيين."
      badge="استعادة كلمة المرور"
      backHref="/login"
      backLabel="العودة لتسجيل الدخول"
      footer={footer}
      side={sidePanel}
    >
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
          }}
        >
          <ShieldQuestion className="h-4 w-4" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          سنرسل لك رسالة تحتوي على رابط آمن لإعادة تعيين كلمة المرور.
          الرابط سيكون صالحاً لفترة محدودة.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  البريد الإلكتروني
                  <span className="ms-1 text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="email"
                      placeholder="name@example.com"
                      disabled={isLoading}
                      data-testid="input-forgot-email"
                      className="pr-9 text-right"
                      dir="ltr"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={isLoading}
            data-testid="button-send-reset"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              "إرسال رابط إعادة التعيين"
            )}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
