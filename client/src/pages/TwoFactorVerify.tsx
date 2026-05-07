import { useState, useEffect } from "react";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ShieldCheck,
  Loader2,
  Key,
  AlertTriangle,
  Smartphone,
  MessageSquare,
  Lock,
  Activity,
  KeySquare,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";

const verifySchema = z.object({
  token: z.string().min(1, "الرمز مطلوب"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function TwoFactorVerify() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<
    "authenticator" | "sms"
  >("authenticator");
  const [smsSent, setSmsSent] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [, setUserMethod] = useState<string | null>(null);

  const sendSMSOTP = async () => {
    try {
      setSendingSMS(true);
      await apiRequest("/api/2fa/send-sms", {
        method: "POST",
        body: JSON.stringify({}),
      });

      setSmsSent(true);
      toast({
        title: "تم الإرسال",
        description: "تم إرسال رمز التحقق إلى رقم جوالك",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال رمز التحقق",
        variant: "destructive",
      });
    } finally {
      setSendingSMS(false);
    }
  };

  useEffect(() => {
    const fetchUserMethod = async () => {
      try {
        const response = await fetch("/api/2fa/pending-method");
        if (!response.ok) {
          throw new Error("فشل في الحصول على طريقة التحقق");
        }

        const data = await response.json();
        setUserMethod(data.method);

        if (data.method === "sms" || data.method === "both") {
          setVerificationMethod("sms");
          if (data.method === "sms") {
            // Auto-send SMS for SMS-only method using shared function
            sendSMSOTP();
          }
        } else {
          setVerificationMethod("authenticator");
        }
      } catch (error) {
        console.error("Failed to fetch user 2FA method:", error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل بيانات التحقق. يرجى المحاولة مرة أخرى",
          variant: "destructive",
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    };

    fetchUserMethod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: "",
    },
  });

  const onSubmit = async (data: VerifyFormData) => {
    try {
      setIsLoading(true);

      let endpoint = "/api/2fa/verify";
      let requestBody: any = {};

      if (useBackupCode) {
        requestBody = { backupCode: data.token };
      } else if (verificationMethod === "sms") {
        endpoint = "/api/2fa/verify-sms";
        requestBody = { code: data.token };
      } else {
        requestBody = { token: data.token };
      }

      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      toast({
        title: "تم التحقق بنجاح",
        description: "مرحباً بك في بروبرتي ME",
      });

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "فشل التحقق",
        description:
          error.message ||
          (useBackupCode
            ? "الرمز الاحتياطي غير صحيح أو مستخدم مسبقاً"
            : "الرمز غير صحيح"),
        variant: "destructive",
      });

      // Reset the form on error
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    form.reset();
  };

  const handleMethodChange = (value: string) => {
    const method = value as "authenticator" | "sms";
    setVerificationMethod(method);
    setUseBackupCode(false);
    form.reset();

    // Auto-send SMS when switching to SMS method
    if (method === "sms" && !smsSent) {
      sendSMSOTP();
    }
  };

  const sidePanel = (
    <ul className="space-y-3 text-sm text-white/85">
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span>طبقة حماية إضافية لحسابك</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Smartphone className="h-4 w-4" />
        </span>
        <span>تحقق عبر تطبيق المصادقة أو رسالة SMS</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Lock className="h-4 w-4" />
        </span>
        <span>دعم الرموز الاحتياطية في حالات الطوارئ</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/15">
          <Activity className="h-4 w-4" />
        </span>
        <span>محاولات الدخول مسجّلة لحماية حسابك</span>
      </li>
    </ul>
  );

  const footer = (
    <div className="text-center text-sm text-foreground/80">
      <button
        type="button"
        onClick={() => {
          // Logout and return to login page
          window.location.href = "/login";
        }}
        className="font-semibold hover:underline"
        style={{ color: "hsl(var(--accent))" }}
        data-testid="link-back-to-login"
      >
        العودة إلى تسجيل الدخول
      </button>
    </div>
  );

  return (
    <AuthShell
      title="التحقق بخطوتين"
      subtitle={
        useBackupCode
          ? "أدخل أحد رموزك الاحتياطية للمتابعة"
          : "اختر طريقة التحقق المناسبة لك للمتابعة بأمان"
      }
      badge="خطوة أمان إضافية"
      backHref="/login"
      backLabel="العودة لتسجيل الدخول"
      side={sidePanel}
      footer={footer}
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
              <Key className="h-8 w-8" />
            ) : (
              <ShieldCheck className="h-8 w-8" />
            )}
          </div>
        </div>

        {!useBackupCode ? (
          <Tabs
            value={verificationMethod}
            onValueChange={handleMethodChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="authenticator"
                data-testid="tab-authenticator"
              >
                <Smartphone className="ml-2 h-4 w-4" />
                تطبيق المصادقة
              </TabsTrigger>
              <TabsTrigger value="sms" data-testid="tab-sms">
                <MessageSquare className="ml-2 h-4 w-4" />
                رسالة SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="authenticator" className="mt-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز التحقق من التطبيق</FormLabel>
                        <FormControl>
                          <div className="flex justify-center" dir="ltr">
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isLoading}
                              data-testid="input-authenticator-token"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      الرمز صالح لمدة 30 ثانية فقط
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base font-semibold"
                    disabled={isLoading}
                    data-testid="button-verify-authenticator"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="ml-2 h-4 w-4" />
                        تحقق
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleToggleBackupCode}
                      className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      style={{ color: "hsl(var(--accent))" }}
                      disabled={isLoading}
                      data-testid="link-use-backup-code"
                    >
                      <KeySquare className="h-4 w-4" />
                      استخدام رمز احتياطي بدلاً من ذلك
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="sms" className="mt-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {!smsSent ? (
                    <>
                      <Alert>
                        <MessageSquare className="h-4 w-4" />
                        <AlertDescription>
                          سيتم إرسال رمز التحقق إلى رقم جوالك المسجل
                        </AlertDescription>
                      </Alert>
                      <Button
                        type="button"
                        onClick={sendSMSOTP}
                        size="lg"
                        className="w-full text-base font-semibold"
                        disabled={sendingSMS}
                        data-testid="button-send-sms"
                      >
                        {sendingSMS ? (
                          <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="ml-2 h-4 w-4" />
                            إرسال رمز التحقق
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رمز التحقق من الرسالة</FormLabel>
                            <FormControl>
                              <div className="flex justify-center" dir="ltr">
                                <InputOTP
                                  maxLength={6}
                                  value={field.value}
                                  onChange={field.onChange}
                                  disabled={isLoading}
                                  data-testid="input-sms-token"
                                >
                                  <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                  </InputOTPGroup>
                                </InputOTP>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          الرمز صالح لمدة 10 دقائق
                        </AlertDescription>
                      </Alert>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full text-base font-semibold"
                        disabled={isLoading}
                        data-testid="button-verify-sms"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري التحقق...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="ml-2 h-4 w-4" />
                            تحقق
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={sendSMSOTP}
                          className="text-sm font-medium hover:underline"
                          style={{ color: "hsl(var(--accent))" }}
                          disabled={sendingSMS}
                          data-testid="link-resend-sms"
                        >
                          {sendingSMS ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleToggleBackupCode}
                      className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      style={{ color: "hsl(var(--accent))" }}
                      disabled={isLoading}
                      data-testid="link-use-backup-code-sms"
                    >
                      <KeySquare className="h-4 w-4" />
                      استخدام رمز احتياطي بدلاً من ذلك
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرمز الاحتياطي</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="أدخل الرمز الاحتياطي"
                        disabled={isLoading}
                        data-testid="input-backup-code"
                        dir="ltr"
                        className="text-center font-mono tracking-widest"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  كل رمز احتياطي يمكن استخدامه مرة واحدة فقط
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                size="lg"
                className="w-full text-base font-semibold"
                disabled={isLoading}
                data-testid="button-verify-backup"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="ml-2 h-4 w-4" />
                    تحقق
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleToggleBackupCode}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "hsl(var(--accent))" }}
                  disabled={isLoading}
                  data-testid="link-back-to-methods"
                >
                  العودة إلى طرق التحقق
                </button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </AuthShell>
  );
}
