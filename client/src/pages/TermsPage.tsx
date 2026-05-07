import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, Scale } from "lucide-react";
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
      <p>
        مرحبًا بكم في «بروبرتي ME»، المنصة الإعلامية التابعة لبروبرتي ME.
        باستخدامك لمنصتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام. نرجو
        قراءتها بعناية. إن استمرارك في استخدام المنصة يُعد قبولاً ضمنيًا بهذه
        الشروط.
      </p>
    ),
  },
  {
    id: "use-of-platform",
    number: "02",
    title: "استخدام المنصة",
    body: (
      <>
        <p>
          تلتزم باستخدام المنصة لأغراض مشروعة وبما لا ينتهك حقوق الآخرين أو يحد
          من استخدامهم للمنصة.
        </p>
        <p>
          المحتوى المنشور على «بروبرتي ME» (نصوص، صور، فيديوهات) هو ملك فكري
          للمنصة ومحمي بموجب قوانين حقوق النشر، ولا يجوز نسخه أو إعادة نشره
          دون إذن خطي مسبق.
        </p>
      </>
    ),
  },
  {
    id: "ai-content",
    number: "03",
    title: "المحتوى المُولَّد بالذكاء الاصطناعي",
    body: (
      <>
        <Callout
          dir={dir}
          tone="warning"
          icon={AlertTriangle}
          title="إخلاء مسؤولية: المحتوى المدعوم بالذكاء الاصطناعي"
          testId="callout-ai-disclaimer"
        >
          <p>
            بعض المحتوى على «بروبرتي ME» يُولَّد كليًا أو جزئيًا بمساعدة أدوات
            الذكاء الاصطناعي (مثل الملخصات، التوصيات، التحليلات الأولية). هذا
            المحتوى يمر بمراجعة تحريرية، لكنه لا يخلو من احتمال الخطأ. لا
            يُعتبر استشارة قانونية أو مالية أو مهنية، ولا يجب الاعتماد عليه
            لاتخاذ قرارات حاسمة دون تحقق مستقل من المصادر الأصلية.
          </p>
        </Callout>
        <p>
          تستخدم «بروبرتي ME» تقنيات الذكاء الاصطناعي لتحليل المحتوى وتقديم
          توصيات مخصصة لتحسين تجربتك. نحن نسعى لتقديم محتوى دقيق وموثوق، لكننا
          لا نضمن خلوه من الأخطاء بشكل مطلق.
        </p>
      </>
    ),
  },
  {
    id: "user-account",
    number: "04",
    title: "حساب المستخدم",
    body: (
      <>
        <p>
          قد يتطلب الوصول إلى بعض الميزات إنشاء حساب شخصي. أنت مسؤول عن الحفاظ
          على سرية معلومات حسابك وعن جميع الأنشطة التي تحدث من خلاله.
        </p>
        <p>يجب أن تكون البيانات المقدمة عند التسجيل صحيحة ودقيقة.</p>
      </>
    ),
  },
  {
    id: "disclaimer",
    number: "05",
    title: "إخلاء المسؤولية",
    body: (
      <>
        <p>
          «بروبرتي ME» لا تتحمل مسؤولية أي أضرار مباشرة أو غير مباشرة قد تنشأ
          عن استخدامك للمنصة أو اعتمادك على محتواها.
        </p>
        <p>
          الروابط الخارجية التي قد تظهر في محتوانا لا تخضع لسيطرتنا، ولسنا
          مسؤولين عن محتوى تلك المواقع.
        </p>
      </>
    ),
  },
  {
    id: "modifications",
    number: "06",
    title: "تعديل الشروط",
    body: (
      <p>
        نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم نشر النسخة
        المحدثة على هذه الصفحة، ويعتبر استمرارك في استخدام المنصة بعد التعديل
        موافقة على الشروط الجديدة.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "07",
    title: "القانون الواجب التطبيق",
    body: (
      <>
        <Callout
          dir={dir}
          tone="primary"
          icon={Scale}
          title="القانون الحاكم"
          testId="callout-governing-law"
        >
          <p>
            تخضع هذه الشروط والأحكام وتُفسر وفقًا للأنظمة والقوانين المعمول بها
            في المملكة العربية السعودية، وتختص محاكم المملكة بالفصل في أي نزاع
            ينشأ عنها.
          </p>
        </Callout>
      </>
    ),
  },
];

export default function TermsPage() {
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
          title="الشروط والأحكام."
          lead="القواعد التي تحكم استخدامك لمنصة بروبرتي ME. مكتوبة بلغة واضحة قدر الإمكان، تضمن لك معرفة حقوقك ومسؤولياتك على المنصة."
          meta={[
            { label: "آخر تحديث", value: "أكتوبر 2025" },
            { label: "مدة القراءة", value: "٦ دقائق" },
            { label: "الإصدار", value: "2.0" },
            { label: "السريان", value: "فور النشر" },
          ]}
        />

        <LongFormDocLayout
          dir={dir}
          tocTitle="فهرس البنود"
          sections={sections}
        />

        <CTABand
          dir={dir}
          eyebrow="استفسارات"
          title="عندك سؤال حول الشروط؟"
          lead="فريق الدعم القانوني جاهز للإجابة على أي توضيح يخص هذه الوثيقة."
          primary={{
            label: "تواصل معنا",
            href: "/contact",
            testId: "button-cta-contact",
          }}
          secondary={{
            label: "اقرأ سياسة الخصوصية",
            href: "/ar/privacy",
            testId: "button-cta-privacy",
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
