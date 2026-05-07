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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getDefaultRedirectPath, type User } from "@/hooks/useAuth";
import { SiApple } from "react-icons/si";
import { Eye, EyeOff, Loader2, Mail, KeyRound, ShieldCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { GoogleIcon } from "@/components/GoogleIcon";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.mustChangePassword) {
        setIsLoading(false);
        toast({
          title: "تغيير كلمة المرور مطلوب",
          description: "يجب عليك تعيين كلمة مرور جديدة للمتابعة",
        });
        navigate("/set-password");
        return;
      }

      if (response.requires2FA) {
        setIsLoading(false);
        toast({
          title: "التحقق بخطوتين مطلوب",
          description: "يرجى استخدام صفحة تسجيل دخول الإدارة",
        });
        navigate("/admin/login");
        return;
      }

      const userData = await queryClient.fetchQuery<User>({
        queryKey: ["/api/auth/user"],
      });

      toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });

      const redirectPath = getDefaultRedirectPath(userData);
      navigate(redirectPath);
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "فشل تسجيل الدخول",
        description:
          error.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    }
  };

  const sidePanel = (
    <ul className="space-y-3 text-sm text-white/85">
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span>تسجيل دخول آمن مع حماية متعددة الطبقات</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Mail className="h-4 w-4" />
        </span>
        <span>وصول سريع عبر بريدك أو حساب Google / Apple</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <KeyRound className="h-4 w-4" />
        </span>
        <span>توجيه ذكي إلى لوحتك حسب صلاحياتك</span>
      </li>
    </ul>
  );

  const footer = (
    <div className="space-y-3 text-center">
      <p className="text-sm text-foreground/80">
        ليس لديك حساب؟{" "}
        <button
          type="button"
          onClick={() => navigate("/register")}
          className="font-semibold text-accent hover:underline"
          data-testid="link-register"
          style={{ color: "hsl(var(--accent))" }}
        >
          إنشاء حساب جديد
        </button>
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>هل أنت من الإدارة أو الصحفيين؟</span>
        <button
          type="button"
          onClick={() => navigate("/admin/login")}
          className="font-medium underline-offset-2 hover:underline"
          data-testid="link-admin-login"
          style={{ color: "hsl(var(--primary))" }}
        >
          تسجيل دخول الإدارة
        </button>
      </div>
    </div>
  );

  return (
    <AuthShell
      title="مرحباً بعودتك"
      subtitle="سجّل دخولك لمتابعة قراءاتك ومتابعة سوق العقار من مكان واحد."
      badge="تسجيل الدخول"
      footer={footer}
      side={sidePanel}
    >
      <div className="space-y-5">
        {/* Social */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (window.location.href = "/api/auth/google")}
            className="w-full gap-2"
            data-testid="button-google-login"
          >
            <GoogleIcon />
            <span>متابعة عبر Google</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => (window.location.href = "/api/auth/apple")}
            className="w-full gap-2"
            data-testid="button-apple-login"
          >
            <SiApple className="h-4 w-4" />
            <span>متابعة عبر Apple</span>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              أو بالبريد الإلكتروني
            </span>
          </div>
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>كلمة المرور</FormLabel>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs font-medium hover:underline"
                      data-testid="link-forgot-password"
                      style={{ color: "hsl(var(--accent))" }}
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
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
                          showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
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

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </AuthShell>
  );
}
