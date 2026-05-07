import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface PasswordChecks {
  length: boolean;
  number: boolean;
  letter: boolean;
  symbol: boolean;
}

function evaluatePassword(pw: string): { score: number; checks: PasswordChecks } {
  const checks: PasswordChecks = {
    length: pw.length >= 8,
    number: /\d/.test(pw),
    letter: /[a-zA-Z]/.test(pw),
    symbol: /[^a-zA-Z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
}

const STRENGTH_LABELS = ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية"];

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (!tokenParam) {
      toast({
        title: "رابط غير صالح",
        description: "الرجاء استخدام الرابط المرسل إلى بريدك الإلكتروني",
        variant: "destructive",
      });
      navigate("/login");
    } else {
      setToken(tokenParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const passwordValue = form.watch("password");
  const { score, checks } = useMemo(
    () => evaluatePassword(passwordValue || ""),
    [passwordValue],
  );

  const strengthLabel = STRENGTH_LABELS[score] ?? STRENGTH_LABELS[0];
  const strengthColor =
    score >= 4
      ? "hsl(var(--success))"
      : score >= 3
        ? "hsl(var(--accent))"
        : score >= 2
          ? "hsl(var(--warning))"
          : "hsl(var(--destructive))";

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      setIsLoading(true);
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: data.password }),
      });
      setSuccess(true);
      toast({
        title: "تم إعادة تعيين كلمة المرور",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
      });
      setTimeout(() => navigate("/login"), 3000);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إعادة تعيين كلمة المرور",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sidePanel = (
    <div className="space-y-3 text-sm text-white/85">
      <p className="leading-relaxed">
        كلمة مرور قوية تحمي حسابك من المحاولات غير المرغوبة. خذ لحظة لاختيار
        كلمة يصعب تخمينها.
      </p>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75">
        <div className="mb-2 flex items-center gap-2 font-semibold text-white">
          <ShieldCheck className="h-4 w-4" />
          نصائح سريعة
        </div>
        <ul className="space-y-1.5">
          <li>• 8 أحرف على الأقل.</li>
          <li>• امزج بين الأحرف والأرقام.</li>
          <li>• أضف رمزاً خاصاً مثل @ أو #.</li>
          <li>• تجنّب المعلومات الشخصية الواضحة.</li>
        </ul>
      </div>
    </div>
  );

  if (success) {
    return (
      <AuthShell
        title="تم بنجاح!"
        subtitle="جرى تحديث كلمة المرور الخاصة بك. سننقلك إلى تسجيل الدخول خلال لحظات."
        badge="اكتمل"
        backHref="/login"
        backLabel="تسجيل الدخول"
        side={sidePanel}
      >
        <div className="space-y-5">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center"
            style={{
              borderColor: "hsl(var(--success) / 0.3)",
              background: "hsl(var(--success) / 0.06)",
            }}
            data-testid="status-reset-success"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: "hsl(var(--success))" }}
            >
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-foreground">
              تم تحديث كلمة المرور
            </p>
            <p className="text-sm text-muted-foreground">
              يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            onClick={() => navigate("/login")}
            data-testid="button-go-to-login"
          >
            الذهاب لتسجيل الدخول الآن
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="إعادة تعيين كلمة المرور"
      subtitle="اختر كلمة مرور جديدة قوية لحماية حسابك."
      badge="كلمة مرور جديدة"
      backHref="/login"
      backLabel="العودة لتسجيل الدخول"
      side={sidePanel}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>كلمة المرور الجديدة</FormLabel>
                <FormControl>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      disabled={isLoading}
                      data-testid="input-new-password"
                      className="px-9"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                      data-testid="button-toggle-new-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Animated strength meter */}
          {passwordValue ? (
            <div
              className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-3"
              data-testid="password-strength"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/80">
                  قوة كلمة المرور
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: strengthColor }}
                  data-testid="text-strength-label"
                >
                  {strengthLabel}
                </span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-border transition-colors duration-300"
                    style={{
                      background:
                        i < score ? strengthColor : "hsl(var(--border))",
                    }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px]">
                <RuleItem ok={checks.length} label="8 أحرف على الأقل" />
                <RuleItem ok={checks.letter} label="حرف واحد على الأقل" />
                <RuleItem ok={checks.number} label="رقم واحد على الأقل" />
                <RuleItem ok={checks.symbol} label="رمز خاص (مفضّل)" />
              </ul>
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تأكيد كلمة المرور</FormLabel>
                <FormControl>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      disabled={isLoading}
                      data-testid="input-confirm-password"
                      className="px-9"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showConfirmPassword
                          ? "إخفاء تأكيد كلمة المرور"
                          : "إظهار تأكيد كلمة المرور"
                      }
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
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
            disabled={isLoading || !token}
            data-testid="button-reset-password"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري إعادة التعيين...
              </>
            ) : (
              "تأكيد كلمة المرور الجديدة"
            )}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}

function RuleItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 ${
        ok ? "text-foreground/80" : "text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full text-white transition-colors`}
        style={{
          background: ok ? "hsl(var(--success))" : "hsl(var(--muted))",
          color: ok ? "white" : "hsl(var(--muted-foreground))",
        }}
        aria-hidden
      >
        {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      <span>{label}</span>
    </li>
  );
}
