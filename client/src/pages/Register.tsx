import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SiApple } from "react-icons/si";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Bookmark,
  Bell,
  Sparkles,
  History,
  Crown,
  Zap,
  User as UserIcon,
  Mail,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { GoogleIcon } from "@/components/GoogleIcon";
import AuthShell from "@/components/AuthShell";

const registerSchema = z
  .object({
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string(),
    firstName: z.string().min(2, "الاسم الأول مطلوب"),
    lastName: z.string().min(2, "الاسم الأخير مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور غير متطابقة",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const membershipBenefits = [
  { icon: Sparkles, title: "توصيات ذكية", description: "محتوى مخصص يناسبك" },
  { icon: Bookmark, title: "حفظ المقالات", description: "اقرأها لاحقاً" },
  { icon: History, title: "أكمل قراءتك", description: "استمر من حيث توقفت" },
  { icon: Bell, title: "تنبيهات فورية", description: "أخبار العاجلة أولاً" },
  { icon: Crown, title: "بلا إعلانات", description: "تصفح نظيف وسريع" },
  { icon: Zap, title: "ملخصات ذكية", description: "خلاصة في ثوانٍ" },
];

const STEPS = [
  { id: 1, label: "بياناتك" },
  { id: 2, label: "كلمة المرور" },
  { id: 3, label: "الموافقة" },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "يمكنك الآن تسجيل الدخول",
      });
      navigate("/onboarding/welcome");
    } catch (error: any) {
      setIsLoading(false);
      console.error("[Register] Error:", error);
      toast({
        title: "فشل إنشاء الحساب",
        description: error.message || "حدث خطأ ما. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const goNext = async () => {
    if (step === 1) {
      const ok = await form.trigger(["firstName", "lastName", "email"]);
      if (ok) setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await form.trigger(["password", "confirmPassword"]);
      if (ok) setStep(3);
      return;
    }
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const sidePanel = (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/60">
        مزايا العضوية
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {membershipBenefits.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
              <b.icon className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold leading-tight">{b.title}</p>
              <p className="mt-0.5 text-[11px] text-white/65">
                {b.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const footer = (
    <p className="text-center text-sm text-foreground/80">
      لديك حساب بالفعل؟{" "}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="font-semibold hover:underline"
        data-testid="link-login"
        style={{ color: "hsl(var(--accent))" }}
      >
        تسجيل الدخول
      </button>
    </p>
  );

  return (
    <AuthShell
      title="انضم إلى بروبرتي ME"
      subtitle="ثلاث خطوات صغيرة وأنت معنا. نوفّر لك تجربة قراءة وذكاء عقاري بلا منافس."
      badge="حساب جديد"
      footer={footer}
      side={sidePanel}
    >
      {/* Progress indicator */}
      <ol
        className="mb-6 flex items-center gap-2"
        aria-label="مراحل إنشاء الحساب"
      >
        {STEPS.map((s, idx) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2"
                data-testid={`step-${s.id}`}
              >
                <div
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    done
                      ? "text-white"
                      : active
                        ? "text-white"
                        : "border border-border bg-muted text-muted-foreground"
                  }`}
                  style={
                    done || active
                      ? {
                          background: active
                            ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))"
                            : "hsl(var(--primary))",
                        }
                      : undefined
                  }
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:inline ${
                    active
                      ? "text-foreground"
                      : done
                        ? "text-foreground/80"
                        : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 ? (
                <div className="h-px flex-1 bg-border" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Social shortcut visible only on step 1 */}
      {step === 1 ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = "/api/auth/google")}
              className="w-full gap-2"
              data-testid="button-google-register"
            >
              <GoogleIcon />
              <span>عبر Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = "/api/auth/apple")}
              className="w-full gap-2"
              data-testid="button-apple-register"
            >
              <SiApple className="h-4 w-4" />
              <span>عبر Apple</span>
            </Button>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                أو املأ النموذج
              </span>
            </div>
          </div>
        </>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* STEP 1: Name + Email */}
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="محمد"
                            disabled={isLoading}
                            data-testid="input-firstName"
                            className="pr-9 text-right"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأخير</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="أحمد"
                          disabled={isLoading}
                          data-testid="input-lastName"
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="name@example.com"
                          disabled={isLoading}
                          data-testid="input-email"
                          className="pr-9 text-right"
                          dir="ltr"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {/* STEP 2: Password */}
          {step === 2 ? (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={isLoading}
                          data-testid="input-password"
                          className="px-9"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password"
                          aria-label={
                            showPassword
                              ? "إخفاء كلمة المرور"
                              : "إظهار كلمة المرور"
                          }
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
                          data-testid="input-confirmPassword"
                          className="px-9"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-confirmPassword"
                          aria-label={
                            showConfirmPassword
                              ? "إخفاء تأكيد كلمة المرور"
                              : "إظهار تأكيد كلمة المرور"
                          }
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

              <p className="text-xs text-muted-foreground">
                نوصي باستخدام 8 أحرف على الأقل تتضمّن أرقاماً ورموزاً.
              </p>
            </div>
          ) : null}

          {/* STEP 3: Terms */}
          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                <p className="mb-3 text-xs font-semibold text-foreground/80">
                  ملخّص حسابك
                </p>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">الاسم</dt>
                    <dd
                      className="truncate font-medium"
                      data-testid="summary-name"
                    >
                      {form.getValues("firstName")}{" "}
                      {form.getValues("lastName")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">البريد</dt>
                    <dd
                      className="truncate font-medium"
                      dir="ltr"
                      data-testid="summary-email"
                    >
                      {form.getValues("email")}
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                className="flex items-start gap-3 rounded-xl border p-3"
                style={{
                  borderColor: "hsl(var(--accent) / 0.3)",
                  background: "hsl(var(--accent) / 0.06)",
                }}
              >
                <Checkbox
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                  data-testid="checkbox-terms"
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms-checkbox"
                  className="cursor-pointer text-sm leading-relaxed text-foreground"
                >
                  بإنشاء حساب، أنت توافق على{" "}
                  <Link
                    to="/terms"
                    className="font-medium hover:underline"
                    data-testid="link-terms"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    الشروط والأحكام
                  </Link>{" "}
                  و{" "}
                  <Link
                    to="/privacy"
                    className="font-medium hover:underline"
                    data-testid="link-privacy"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    سياسة الخصوصية
                  </Link>
                  .
                </label>
              </div>

              {!termsAccepted ? (
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <p>الموافقة على الشروط مطلوبة لإنشاء الحساب</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Step navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={isLoading}
                data-testid="button-step-back"
                className="gap-1"
              >
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={isLoading}
                data-testid="button-step-next"
                className="gap-1"
                size="lg"
              >
                التالي
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="gap-2 font-semibold"
                disabled={isLoading || !termsAccepted}
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </AuthShell>
  );
}
