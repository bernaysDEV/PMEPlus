import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Brain, Mail, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  EditorialHero,
  LongFormDocLayout,
  Callout,
  CTABand,
  type DocSection,
} from "@/components/footer-pages/SharedSections";

const dir = "rtl" as const;

const sections: DocSection[] = [
  {
    id: "intro",
    number: "01",
    title: "مقدمة",
    body: (
      <>
        <p>
          خصوصيتك تقع في صميم اهتماماتنا في «بروبرتي ME». تشرح هذه السياسة
          كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك
          للمنصة. نحن ملتزمون بحماية بياناتك وفقًا لأفضل الممارسات والأنظمة
          المحلية والدولية.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    number: "02",
    title: "المعلومات التي نجمعها",
    body: (
      <>
        <p>
          <strong className="text-foreground">معلومات تقدمها أنت:</strong>{" "}
          مثل الاسم والبريد الإلكتروني عند إنشاء حساب أو الاشتراك في النشرة
          البريدية.
        </p>
        <p>
          <strong className="text-foreground">
            معلومات نجمعها تلقائيًا (بيانات الاستخدام):
          </strong>
        </p>
        <ul className="list-disc pr-6 space-y-2">
          <li>
            <strong className="text-foreground">بيانات التفاعل:</strong>{" "}
            المقالات التي تقرأها، المواضيع التي تفضلها، والوقت الذي تقضيه على
            المنصة. تُستخدم لتشغيل نظام التوصيات الذكي وتقديم محتوى مخصص.
          </li>
          <li>
            <strong className="text-foreground">بيانات تقنية:</strong> نوع
            الجهاز، نظام التشغيل، عنوان IP، ونوع المتصفح. تُستخدم لتحسين أداء
            المنصة وضمان أمانها.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ai-personalization",
    number: "03",
    title: "البيانات التي نستخدمها لتخصيص تجربتك بالذكاء الاصطناعي",
    body: (
      <>
        <Callout
          dir={dir}
          tone="accent"
          icon={Brain}
          title="كيف نوظّف بياناتك في الذكاء الاصطناعي"
          testId="callout-ai-data"
        >
          <p>
            نستخدم سلوكك في القراءة (المقالات التي تتفاعل معها، الوقت الذي
            تمضيه، والمواضيع التي تتابعها) لتدريب نموذج توصيات شخصي خاص بك.
            لا نشارك هذه البيانات مع طرف ثالث، ولا نستخدمها لأي غرض إعلاني
            خارج المنصة. يمكنك في أي وقت إعادة ضبط تفضيلاتك أو تعطيل التوصيات
            الذكية من إعدادات الحساب.
          </p>
        </Callout>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: "04",
    title: "كيف نستخدم معلوماتك؟",
    body: (
      <ul className="list-disc pr-6 space-y-2">
        <li>
          <strong className="text-foreground">لتخصيص تجربتك:</strong> نستخدم
          بيانات التفاعل لتزويدك بتوصيات إخبارية ومحتوى يتناسب مع اهتماماتك.
        </li>
        <li>
          <strong className="text-foreground">لتحسين خدماتنا:</strong> نحلل
          بيانات الاستخدام لفهم كيفية تفاعل القراء مع المنصة وتطوير ميزات جديدة.
        </li>
        <li>
          <strong className="text-foreground">للتواصل معك:</strong> لإرسال
          إشعارات هامة حول حسابك أو تحديثات المنصة أو نشراتنا الإخبارية بعد
          موافقتك.
        </li>
      </ul>
    ),
  },
  {
    id: "protection",
    number: "05",
    title: "كيف نحمي معلوماتك؟",
    body: (
      <>
        <p>
          نستخدم تدابير أمنية تقنية وتنظيمية متقدمة (مثل التشفير وبروتوكولات
          الأمان) لحماية بياناتك من الوصول غير المصرح به.
        </p>
        <p>
          نحن لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض
          تسويقية دون موافقتك الصريحة.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    number: "06",
    title: "ملفات تعريف الارتباط (Cookies)",
    body: (
      <p>
        نستخدم ملفات تعريف الارتباط لتخزين تفضيلاتك وتحسين تجربة التصفح. يمكنك
        التحكم في استخدام هذه الملفات من خلال إعدادات المتصفح الخاص بك.
      </p>
    ),
  },
  {
    id: "your-rights",
    number: "07",
    title: "حقوقك",
    body: (
      <>
        <p>
          لك الحق في الوصول إلى معلوماتك الشخصية التي نحتفظ بها وتصحيحها أو طلب
          حذفها.
        </p>
        <p>يمكنك إلغاء الاشتراك في أي وقت من رسائلنا البريدية.</p>
      </>
    ),
  },
  {
    id: "changes",
    number: "08",
    title: "التغييرات على سياسة الخصوصية",
    body: (
      <p>
        قد نقوم بتحديث هذه السياسة من وقت لآخر. سنقوم بإعلامك بأي تغييرات
        جوهرية عبر نشر السياسة الجديدة على هذه الصفحة.
      </p>
    ),
  },
  {
    id: "contact",
    number: "09",
    title: "الاتصال بنا",
    body: (
      <p>
        إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا عبر:{" "}
        <a
          href="mailto:privacy@sabq.org"
          className="text-accent underline underline-offset-4 hover:text-accent/80"
        >
          privacy@sabq.org
        </a>{" "}
        أو من خلال{" "}
        <Link href="/contact">
          <span className="text-accent underline underline-offset-4 hover:text-accent/80 cursor-pointer">
            صفحة اتصل بنا
          </span>
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  const { data: user } = useQuery<{
    name?: string | null;
    email?: string;
    role?: string;
    profileImageUrl?: string | null;
  }>({
    queryKey: ["/api/auth/user"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header user={user} />

      <main className="flex-1">
        <EditorialHero
          dir={dir}
          eyebrow="وثيقة قانونية"
          title="سياسة الخصوصية."
          lead="بياناتك ملكك. هذه الوثيقة تشرح بدقة ووضوح ما الذي نجمعه، ولماذا، وكيف نحميه — وما الذي يمكنك التحكّم به في أي وقت."
          meta={[
            { label: "آخر تحديث", value: "أكتوبر 2025" },
            { label: "مدة القراءة", value: "٧ دقائق" },
            { label: "الإصدار", value: "2.0" },
            { label: "النطاق", value: "جميع منصات بروبرتي ME" },
          ]}
        />

        <LongFormDocLayout
          dir={dir}
          tocTitle="فهرس الوثيقة"
          sections={sections}
        />

        <CTABand
          dir={dir}
          eyebrow="تحكّم"
          title="خصوصيتك بيدك."
          lead="أعد ضبط تفضيلاتك في أي وقت، أو تواصل معنا مباشرة لأي استفسار يخص بياناتك."
          primary={{
            label: "إدارة تفضيلاتي",
            href: "/notification-settings",
            testId: "button-manage-preferences",
          }}
          secondary={{
            label: "تواصل مع فريق الخصوصية",
            href: "/contact",
            testId: "button-contact-privacy",
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
