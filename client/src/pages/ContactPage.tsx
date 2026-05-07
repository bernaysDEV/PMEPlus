import { useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { EnglishFooter } from "@/components/en/EnglishFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Clock,
  MapPin,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { EditorialHero } from "@/components/footer-pages/SharedSections";

interface Attachment {
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  return FileText;
}

const SUBJECT_VALUES = [
  "استفسار عام",
  "شراكات إعلامية",
  "شكوى",
  "اقتراح",
  "أخرى",
] as const;

const COPY = {
  ar: {
    eyebrow: "تواصل معنا",
    title: "تحدّث إلى غرفة التحرير مباشرة.",
    lead:
      "ملاحظة، تصحيح، فكرة قصة، أو شراكة إعلامية؟ فريقنا يقرأ كل رسالة بنفسه. اختر القناة الأنسب لك أدناه، ونعدك بأن نعود إليك في خلال يوم عمل واحد.",
    meta: [
      { label: "ساعات الاستجابة", value: "خلال 24 ساعة" },
      { label: "الموقع", value: "الرياض، السعودية" },
      { label: "أيام العمل", value: "الأحد – الخميس" },
      { label: "اللغات", value: "العربية والإنجليزية" },
    ],
    panel: {
      eyebrow: "قنوات مباشرة",
      title: "هل ترغب في الحوار قبل أن تكتب؟",
      lead:
        "اختر القناة الأنسب لك. كل القنوات يديرها فريقنا التحريري مباشرة، لا روبوتات.",
      whatsappLabel: "واتساب — الأسرع",
      whatsappValue: "+966 500 226 622",
      whatsappCaption: "للأخبار العاجلة وطلبات الإعلام",
      emailLabel: "البريد الإلكتروني",
      emailValue: "info@sabq.org",
      emailCaption: "للشراكات والاستفسارات الرسمية",
      hoursLabel: "الاستجابة المتوقعة",
      hoursValue: "خلال 24 ساعة عمل",
      hoursCaption: "بداية من تاريخ استلام الرسالة",
      regionLabel: "المنطقة",
      regionValue: "الشرق الأوسط",
      regionCaption: "تغطية تحريرية لدول الخليج وما حولها",
    },
    form: {
      eyebrow: "نموذج التواصل",
      title: "اكتب لنا.",
      lead: "كل الحقول مطلوبة. نعد بأن لا نشارك بياناتك مع أي طرف ثالث.",
      nameLabel: "الاسم الكامل",
      namePh: "أدخل اسمك الكامل",
      phoneLabel: "رقم الهاتف",
      phonePh: "+966500000000",
      emailLabel: "البريد الإلكتروني",
      emailPh: "example@email.com",
      subjectLabel: "موضوع الرسالة",
      subjectPh: "اختر موضوع الرسالة",
      messageLabel: "رسالتك",
      messagePh: "اكتب رسالتك هنا...",
      attachLabel: "المرفقات (اختياري)",
      attachBtn: "إضافة مرفق",
      uploading: "جاري رفع الملف...",
      attachHint: "الحد الأقصى: 10 ميجابايت | الأنواع المسموحة: صور، PDF، Word، Excel",
      captchaLabel: (a: number, b: number) => `سؤال التحقق: ما نتيجة ${a} + ${b}؟`,
      captchaPh: "أدخل الإجابة",
      submit: "إرسال الرسالة",
      sending: "جاري الإرسال...",
    },
    subjects: SUBJECT_VALUES.map((v) => ({ value: v, label: v })),
    errors: {
      nameMin: "الاسم يجب أن يكون حرفين على الأقل",
      phoneInvalid: "رقم الهاتف يجب أن يبدأ بـ +966 متبوعاً بـ 9 أرقام",
      emailInvalid: "البريد الإلكتروني غير صالح",
      subjectRequired: "يرجى اختيار موضوع الرسالة",
      messageMin: "الرسالة يجب أن تكون 10 أحرف على الأقل",
      captchaRequired: "يرجى الإجابة على سؤال التحقق",
      captchaWrong: "إجابة سؤال التحقق غير صحيحة",
    },
    toast: {
      successTitle: "تم الإرسال بنجاح",
      successDesc: "شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.",
      errorTitle: "خطأ في الإرسال",
      errorDesc: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
      uploadedTitle: "تم رفع الملف",
      uploadedDesc: (n: string) => `تم رفع ${n} بنجاح`,
      uploadErrorTitle: "خطأ في رفع الملف",
      uploadErrorDesc: "حدث خطأ أثناء رفع الملف",
      typeNotAllowedTitle: "نوع الملف غير مدعوم",
      typeNotAllowedDesc: "الأنواع المسموحة: صور، PDF، Word، Excel، ملفات نصية",
      sizeBigTitle: "حجم الملف كبير جداً",
      sizeBigDesc: "الحد الأقصى لحجم الملف هو 10 ميجابايت",
    },
    success: {
      title: "تم استلام رسالتك بنجاح",
      desc: "شكراً لتواصلك معنا. فريقنا سيقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.",
      sendAnother: "إرسال رسالة أخرى",
    },
  },
  en: {
    eyebrow: "Contact",
    title: "Talk to the newsroom directly.",
    lead:
      "A note, a correction, a story idea, or a partnership? Our team reads every message in person. Pick the channel that suits you best below, and we'll get back to you within one business day.",
    meta: [
      { label: "Response time", value: "Within 24 hours" },
      { label: "Location", value: "Riyadh, KSA" },
      { label: "Working days", value: "Sunday – Thursday" },
      { label: "Languages", value: "Arabic & English" },
    ],
    panel: {
      eyebrow: "Direct channels",
      title: "Prefer to talk before you write?",
      lead:
        "Pick the channel that fits you. Every channel is staffed by our editorial team — no bots.",
      whatsappLabel: "WhatsApp — fastest",
      whatsappValue: "+966 500 226 622",
      whatsappCaption: "For breaking news and media requests",
      emailLabel: "Email",
      emailValue: "info@sabq.org",
      emailCaption: "For partnerships and formal inquiries",
      hoursLabel: "Expected response",
      hoursValue: "Within 24 working hours",
      hoursCaption: "Counting from when we receive your message",
      regionLabel: "Region",
      regionValue: "Middle East",
      regionCaption: "Editorial coverage of the Gulf and beyond",
    },
    form: {
      eyebrow: "Contact form",
      title: "Write to us.",
      lead: "All fields are required. We promise not to share your details with any third party.",
      nameLabel: "Full name",
      namePh: "Enter your full name",
      phoneLabel: "Phone number",
      phonePh: "+966500000000",
      emailLabel: "Email",
      emailPh: "example@email.com",
      subjectLabel: "Subject",
      subjectPh: "Pick a subject",
      messageLabel: "Your message",
      messagePh: "Write your message here...",
      attachLabel: "Attachments (optional)",
      attachBtn: "Add attachment",
      uploading: "Uploading file...",
      attachHint: "Max: 10 MB | Allowed: images, PDF, Word, Excel",
      captchaLabel: (a: number, b: number) => `Verification: what is ${a} + ${b}?`,
      captchaPh: "Enter the answer",
      submit: "Send message",
      sending: "Sending...",
    },
    subjects: [
      { value: "استفسار عام", label: "General inquiry" },
      { value: "شراكات إعلامية", label: "Media partnerships" },
      { value: "شكوى", label: "Complaint" },
      { value: "اقتراح", label: "Suggestion" },
      { value: "أخرى", label: "Other" },
    ],
    errors: {
      nameMin: "Name must be at least 2 characters",
      phoneInvalid: "Phone must start with +966 followed by 9 digits",
      emailInvalid: "Invalid email address",
      subjectRequired: "Please pick a subject",
      messageMin: "Message must be at least 10 characters",
      captchaRequired: "Please answer the verification question",
      captchaWrong: "The verification answer is incorrect",
    },
    toast: {
      successTitle: "Message sent",
      successDesc: "Thanks for reaching out. We'll get back to you shortly.",
      errorTitle: "Send error",
      errorDesc: "An error occurred while sending. Please try again.",
      uploadedTitle: "File uploaded",
      uploadedDesc: (n: string) => `${n} uploaded successfully`,
      uploadErrorTitle: "Upload error",
      uploadErrorDesc: "An error occurred while uploading the file",
      typeNotAllowedTitle: "File type not supported",
      typeNotAllowedDesc: "Allowed types: images, PDF, Word, Excel, text files",
      sizeBigTitle: "File too large",
      sizeBigDesc: "Maximum file size is 10 MB",
    },
    success: {
      title: "Your message has been received",
      desc: "Thanks for reaching out. Our team will review your message and respond as soon as possible.",
      sendAnother: "Send another message",
    },
  },
};

interface ContactPageProps {
  lang?: "ar" | "en";
}

export default function ContactPage({ lang = "ar" }: ContactPageProps) {
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
  const copy = COPY[lang];
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery<{
    name?: string | null;
    email?: string;
    role?: string;
    profileImageUrl?: string | null;
  }>({
    queryKey: ["/api/auth/user"],
  });

  const contactFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, copy.errors.nameMin),
        phone: z
          .string()
          .regex(/^\+966[0-9]{9}$/, copy.errors.phoneInvalid),
        email: z.string().email(copy.errors.emailInvalid),
        subject: z.enum(SUBJECT_VALUES, {
          required_error: copy.errors.subjectRequired,
        }),
        message: z.string().min(10, copy.errors.messageMin),
        captchaAnswer: z.string().min(1, copy.errors.captchaRequired),
      }),
    [copy]
  );
  type ContactFormData = z.infer<typeof contactFormSchema>;

  const captcha = useMemo(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, answer: num1 + num2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitted]);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "+966",
      email: "",
      subject: undefined,
      message: "",
      captchaAnswer: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {};
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      const response = await fetch("/api/contact/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || copy.toast.uploadErrorDesc);
      }
      return response.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (parseInt(data.captchaAnswer) !== captcha.answer) {
        throw new Error(copy.errors.captchaWrong);
      }
      const { captchaAnswer, ...submitData } = data;
      return apiRequest("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          ...submitData,
          attachments: attachments.map((a) => ({
            name: a.name,
            size: a.size,
            type: a.type,
            url: a.url,
          })),
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: copy.toast.successTitle,
        description: copy.toast.successDesc,
      });
      form.reset();
      setAttachments([]);
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: copy.toast.errorTitle,
        description: error.message || copy.toast.errorDesc,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: copy.toast.typeNotAllowedTitle,
        description: copy.toast.typeNotAllowedDesc,
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: copy.toast.sizeBigTitle,
        description: copy.toast.sizeBigDesc,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setAttachments([
        ...attachments,
        { name: file.name, size: file.size, type: file.type, url: result.url },
      ]);
      toast({
        title: copy.toast.uploadedTitle,
        description: copy.toast.uploadedDesc(file.name),
      });
    } catch (error: any) {
      toast({
        title: copy.toast.uploadErrorTitle,
        description: error.message || copy.toast.uploadErrorDesc,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ContactFormData) => {
    submitMutation.mutate(data);
  };

  const ChromeWrapper = ({ children }: { children: React.ReactNode }) =>
    lang === "en" ? (
      <EnglishLayout>
        <div dir={dir} className="bg-background flex flex-col">
          <main className="flex-1">{children}</main>
          <EnglishFooter />
        </div>
      </EnglishLayout>
    ) : (
      <div dir={dir} className="min-h-screen bg-background flex flex-col">
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );

  if (isSubmitted) {
    return (
      <ChromeWrapper>
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight"
              data-testid="text-success-title"
            >
              {copy.success.title}
            </h2>
            <p
              className="text-muted-foreground text-lg mb-8 leading-relaxed"
              data-testid="text-success-message"
            >
              {copy.success.desc}
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              data-testid="button-send-another"
            >
              {copy.success.sendAnother}
            </Button>
          </div>
        </section>
      </ChromeWrapper>
    );
  }

  return (
    <ChromeWrapper>
      <EditorialHero
        dir={dir}
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        meta={copy.meta}
      />

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Talk-to-us panel */}
            <aside
              className="lg:col-span-5"
              data-testid="contact-panel"
            >
              <div className="lg:sticky lg:top-20">
                <div
                  className={`inline-flex items-center gap-2 mb-5 ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="h-px w-8 bg-accent" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    {copy.panel.eyebrow}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
                  {copy.panel.title}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                  {copy.panel.lead}
                </p>

                <div className="grid sm:grid-cols-2 gap-px bg-border rounded-md overflow-hidden border border-border">
                  <a
                    href="https://wa.me/966500226622"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background p-5 flex flex-col gap-2 hover-elevate"
                    data-testid="link-whatsapp"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      <SiWhatsapp className="w-4 h-4 text-green-600 dark:text-green-500" />
                      {copy.panel.whatsappLabel}
                    </div>
                    <div
                      className="text-base font-bold text-foreground"
                      dir="ltr"
                    >
                      {copy.panel.whatsappValue}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">
                      {copy.panel.whatsappCaption}
                    </div>
                  </a>

                  <a
                    href="mailto:info@sabq.org"
                    className="bg-background p-5 flex flex-col gap-2 hover-elevate"
                    data-testid="link-email"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      <Mail className="w-4 h-4 text-accent" />
                      {copy.panel.emailLabel}
                    </div>
                    <div
                      className="text-base font-bold text-foreground"
                      dir="ltr"
                    >
                      {copy.panel.emailValue}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">
                      {copy.panel.emailCaption}
                    </div>
                  </a>

                  <div className="bg-background p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      <Clock className="w-4 h-4 text-foreground" />
                      {copy.panel.hoursLabel}
                    </div>
                    <div className="text-base font-bold text-foreground">
                      {copy.panel.hoursValue}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">
                      {copy.panel.hoursCaption}
                    </div>
                  </div>

                  <div className="bg-background p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      <MapPin className="w-4 h-4 text-foreground" />
                      {copy.panel.regionLabel}
                    </div>
                    <div className="text-base font-bold text-foreground">
                      {copy.panel.regionValue}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">
                      {copy.panel.regionCaption}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="lg:col-span-7" data-testid="contact-form-wrapper">
              <div
                className={`inline-flex items-center gap-2 mb-5 ${
                  dir === "rtl" ? "flex-row-reverse" : ""
                }`}
              >
                <span className="h-px w-8 bg-accent" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {copy.form.eyebrow}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
                {copy.form.title}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                {copy.form.lead}
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6 border border-border rounded-md p-6 md:p-8 bg-card"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.form.nameLabel}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={copy.form.namePh}
                              {...field}
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.form.phoneLabel}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={copy.form.phonePh}
                              className="dir-ltr text-left"
                              dir="ltr"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.form.emailLabel}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={copy.form.emailPh}
                              className="dir-ltr text-left"
                              dir="ltr"
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.form.subjectLabel}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-subject">
                                <SelectValue
                                  placeholder={copy.form.subjectPh}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {copy.subjects.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  data-testid={`select-item-${option.value}`}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.form.messageLabel}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={copy.form.messagePh}
                            className="min-h-[140px] resize-none"
                            {...field}
                            data-testid="textarea-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attachments */}
                  <div className="space-y-3">
                    <FormLabel>{copy.form.attachLabel}</FormLabel>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((attachment, index) => {
                          const FileIcon = getFileIcon(attachment.type);
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-border"
                              data-testid={`attachment-item-${index}`}
                            >
                              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                                <FileIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {attachment.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAttachment(index)}
                                className="flex-shrink-0"
                                data-testid={`button-remove-attachment-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      data-testid="input-file"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full gap-2"
                      disabled={isUploading}
                      data-testid="button-add-attachment"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {copy.form.uploading}
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4" />
                          {copy.form.attachBtn}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {copy.form.attachHint}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-md p-4 border border-border">
                    <FormField
                      control={form.control}
                      name="captchaAnswer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            {copy.form.captchaLabel(captcha.num1, captcha.num2)}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={copy.form.captchaPh}
                              className="max-w-[180px]"
                              {...field}
                              data-testid="input-captcha"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {copy.form.sending}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {copy.form.submit}
                        <Arrow className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </ChromeWrapper>
  );
}
