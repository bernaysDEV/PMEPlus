import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isStaff, type User } from "@/hooks/useAuth";
import {
  Shield,
  Loader2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Activity,
  KeySquare,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthShell from "@/components/AuthShell";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // Check if 2FA is required
      if (response.requires2FA) {
        setRequires2FA(true);
        toast({
          title: "التحقق بخطوتين مطلوب",
          description: "يرجى إدخال رمز التحقق من تطبيق المصادقة",
        });
        return;
      }

      // Fetch user data to verify staff access and determine redirect
      const userData = await queryClient.fetchQuery<User>({
        queryKey: ["/api/auth/user"],
      });

      // Verify user is staff
      if (!isStaff(userData)) {
        toast({
          variant: "destructive",
          title: "خطأ في الصلاحيات",
          description: "هذه البوابة مخصصة للإدارة والصحفيين فقط",
        });
        window.location.href = "/";
        return;
      }

      toast({
        title: "مرحباً بك!",
        description: "تم تسجيل الدخول بنجاح",
      });

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description:
          error.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (useBackupCode ? twoFactorCode.length < 6 : twoFactorCode.length !== 6)
      return;

    try {
      setIsVerifying2FA(true);
      await apiRequest("/api/2fa/verify", {
        method: "POST",
        body: JSON.stringify(
          useBackupCode
            ? { backupCode: twoFactorCode }
            : { token: twoFactorCode },
        ),
      });

      // Fetch user data to verify staff access
      const userData = await queryClient.fetchQuery<User>({
        queryKey: ["/api/auth/user"],
      });

      // Verify user is staff
      if (!isStaff(userData)) {
        toast({
          variant: "destructive",
          title: "خطأ في الصلاحيات",
          description: "هذه البوابة مخصصة للإدارة والصحفيين فقط",
        });
        window.location.href = "/";
        return;
      }

      toast({
        title: "مرحباً بك!",
        description: "تم التحقق بنجاح",
      });

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "خطأ في التحقق",
        description:
          error.message ||
          (useBackupCode ? "الرمز الاحتياطي غير صحيح" : "رمز التحقق غير صحيح"),
        variant: "destructive",
      });
      setTwoFactorCode("");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const adminSidePanel = (
    <ul className="space-y-3 text-sm text-white/85">
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span>بوابة آمنة مخصصة للإدارة والصحفيين</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Activity className="h-4 w-4" />
        </span>
        <span>تسجيل ومراقبة جميع محاولات الدخول</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Lock className="h-4 w-4" />
        </span>
        <span>دعم التحقق بخطوتين والرموز الاحتياطية</span>
      </li>
    </ul>
  );

  // 2FA Verification Screen
  if (requires2FA) {
    const twoFAFooter = (
      <div className="space-y-3 text-center">
        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setTwoFactorCode("");
          }}
          className="text-sm font-medium hover:underline"
          style={{ color: "hsl(var(--accent))" }}
          data-testid="button-toggle-backup-code"
        >
          {useBackupCode
            ? "استخدام رمز التحقق من التطبيق"
            : "استخدام رمز احتياطي"}
        </button>
        <div className="text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTwoFactorCode("");
              setUseBackupCode(false);
            }}
            className="font-medium hover:underline"
            data-testid="link-back-to-admin-login"
          >
            رجوع إلى تسجيل الدخول
          </button>
        </div>
      </div>
    );

    return (
      <AuthShell
        title="التحقق بخطوتين"
        subtitle={
          useBackupCode
            ? "أدخل أحد رموزك الاحتياطية للمتابعة"
            : "أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة"
        }
        badge="بوابة الإدارة"
        backHref="/admin/login"
        backLabel="العودة لدخول الإدارة"
        side={adminSidePanel}
        footer={twoFAFooter}
      >
        <div className="space-y-5">
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              {useBackupCode ? (
                <KeySquare className="h-8 w-8" />
              ) : (
                <Shield className="h-8 w-8" />
              )}
            </div>
          </div>

          <Alert className="text-right">
            <AlertDescription className="text-sm">
              هذا إجراء أمني إضافي لحماية حسابك الإداري
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label
              htmlFor="twoFactorCode"
              className="text-sm font-medium text-foreground"
            >
              {useBackupCode ? "الرمز الاحتياطي" : "رمز التحقق"}
            </label>
            <Input
              id="twoFactorCode"
              type="text"
              inputMode={useBackupCode ? "text" : "numeric"}
              maxLength={useBackupCode ? 16 : 6}
              placeholder={useBackupCode ? "XXXX-XXXX-XXXX-XXXX" : "000000"}
              value={twoFactorCode}
              onChange={(e) => {
                if (useBackupCode) {
                  setTwoFactorCode(e.target.value);
                } else {
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && twoFactorCode.length >= 6) {
                  handleVerify2FA();
                }
              }}
              className="text-center text-2xl tracking-[0.5em]"
              dir="ltr"
              data-testid="input-2fa-code"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify2FA}
            disabled={
              (useBackupCode
                ? twoFactorCode.length < 6
                : twoFactorCode.length !== 6) || isVerifying2FA
            }
            size="lg"
            className="w-full text-base font-semibold"
            data-testid="button-verify-2fa"
          >
            {isVerifying2FA && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            تحقق
          </Button>
        </div>
      </AuthShell>
    );
  }

  // Main Admin Login Screen
  const adminFooter = (
    <div className="space-y-2 text-center">
      <p className="text-xs text-muted-foreground">
        هذه البوابة مخصصة للإدارة والصحفيين. جميع محاولات الدخول يتم تسجيلها
        ومراقبتها.
      </p>
      <p className="text-sm text-foreground/80">
        مستخدم عادي؟{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-semibold hover:underline"
          style={{ color: "hsl(var(--accent))" }}
          data-testid="link-public-login"
        >
          تسجيل الدخول العادي
        </button>
      </p>
    </div>
  );

  return (
    <AuthShell
      title="لوحة تحكم بروبرتي ME"
      subtitle="بوابة دخول الإدارة والصحفيين — تسجيل دخول آمن مع مراقبة كاملة."
      badge="بوابة الإدارة"
      side={adminSidePanel}
      footer={adminFooter}
    >
      <div className="space-y-5">
        <div className="flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          >
            <Shield className="h-8 w-8" />
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
                        placeholder="admin@example.com"
                        disabled={isLoading}
                        data-testid="input-admin-email"
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
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>كلمة المرور</FormLabel>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/forgot-password")}
                      className="text-xs font-medium hover:underline"
                      style={{ color: "hsl(var(--accent))" }}
                      data-testid="link-admin-forgot-password"
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
                        data-testid="input-admin-password"
                        className="px-9"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-admin-password"
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

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold"
              disabled={isLoading}
              data-testid="button-admin-login"
            >
              {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>
        </Form>
      </div>
    </AuthShell>
  );
}
