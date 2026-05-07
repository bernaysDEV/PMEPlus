import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sparkles,
  Brain,
  Cpu,
  MessageSquare,
  BarChart3,
  Clock,
  Target,
  Zap,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  EditorialHero,
  SectionHeader,
  PullQuote,
  CTABand,
  InfoStrip,
} from "@/components/footer-pages/SharedSections";

const dir = "rtl" as const;

const journey = [
  {
    year: "2007",
    title: "بداية الرحلة",
    desc: "انطلقت بروبرتي ME من الرياض كصوت إعلامي جديد في الإعلام الرقمي العربي.",
  },
  {
    year: "2012",
    title: "وصول جماهيري واسع",
    desc: "تجاوزنا حاجز المليون متابع وأصبحنا واحدة من أهم المنصات الرقمية في المنطقة.",
  },
  {
    year: "2018",
    title: "اعتراف وتميّز",
    desc: "حصدنا جوائز محلية ودولية تثمّن جودة المحتوى والابتكار التحريري.",
  },
  {
    year: "2024",
    title: "التحوّل إلى منصة ذكية",
    desc: "أطلقنا الجيل الجديد من بروبرتي ME بتجربة قراءة شخصية مدعومة بالذكاء الاصطناعي.",
  },
  {
    year: "ما بعد ٢٠٢٥",
    title: "آفاق جديدة",
    desc: "نتوسع في تطبيقات الجوال، الفيديو، والمحتوى التفاعلي ضمن إطار صحفي مسؤول.",
  },
];

const beliefs = [
  {
    title: "المصداقية ليست خيارًا",
    desc: "كل خبر يمر بطبقات من التحقق الصحفي قبل أن يصل إليك. السرعة لا تسبق الدقة.",
    icon: Shield,
  },
  {
    title: "التقنية تخدم الصحافة",
    desc: "نوظّف الذكاء الاصطناعي ليكون أداةً في يد المحرر، لا بديلاً عنه.",
    icon: Cpu,
  },
  {
    title: "القارئ هو المحور",
    desc: "نصمم تجربة شخصية تحترم وقتك واهتماماتك دون أن تضعك داخل فقاعة.",
    icon: Target,
  },
  {
    title: "السرعة بعمق",
    desc: "نقدّم اللحظة الإخبارية، ثم نتعمق فيها بتحليل يفسر «لماذا» وليس فقط «ماذا».",
    icon: Zap,
  },
];

const aiEdge = [
  {
    title: "توصيات شخصية",
    desc: "نظام يتعلم من قراءاتك ليقترح ما يهمك فعلًا، مع شفافية كاملة في طريقة التوصية.",
    icon: Brain,
  },
  {
    title: "تلخيص ذكي",
    desc: "نولّد ملخصات صوتية ونصية للأخبار الطويلة لتوفر وقتك دون أن يفوتك السياق.",
    icon: MessageSquare,
  },
  {
    title: "تحليل المصداقية",
    desc: "نختبر المحتوى وفق معايير صحفية واضحة ونوضّح مصدره عند كل خبر.",
    icon: BarChart3,
  },
  {
    title: "تغطية لحظية",
    desc: "متابعة حية للأحداث المتطورة مع تحديث ذكي لأهم النقاط دون ضجيج إشعارات.",
    icon: Clock,
  },
];

export default function AboutPage() {
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
          eyebrow="من نحن"
          title="نكتب الحاضر، ونصمم تجربة قراءته."
          lead="بروبرتي ME منصة عقارية وإعلامية مقرها الشرق الأوسط، تجمع بين خبرة تحريرية متراكمة وأدوات ذكاء اصطناعي حديثة، لتقدّم لك سوق العقار كما يستحق أن يُروى: واضحًا، عميقًا، وشخصيًا."
          meta={[
            { label: "تأسست", value: "2007" },
            { label: "المقر", value: "الرياض، السعودية" },
            { label: "اللغات", value: "العربية والإنجليزية" },
            { label: "النطاق", value: "الشرق الأوسط" },
          ]}
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/news">
              <Button size="lg" className="gap-2" data-testid="button-explore-news">
                <Sparkles className="w-4 h-4" />
                ابدأ بقراءة آخر الأخبار
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                data-testid="button-talk-to-us"
              >
                تواصل مع فريق التحرير
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </EditorialHero>

        <InfoStrip
          dir={dir}
          items={[
            { label: "سنوات عمل", value: "+18" },
            { label: "متابع شهري", value: "+5 مليون" },
            { label: "محرر ومطور", value: "نخبة سعودية" },
            { label: "تحديث المحتوى", value: "على مدار الساعة" },
          ]}
        />

        {/* Editorial paragraph block */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <SectionHeader
                dir={dir}
                eyebrow="القصة في فقرة"
                title="إعلام عربي بهوية تقنية."
              />
              <div className="mt-8 space-y-5 text-base md:text-lg leading-[1.95] text-muted-foreground">
                <p>
                  بدأنا بسؤال بسيط: كيف يمكن للصحافة العربية أن تواكب تحولات
                  السوق العقاري والاقتصاد الرقمي دون أن تفقد روحها؟ الإجابة لم
                  تكن في تكرار النموذج التقليدي، ولا في اللحاق الأعمى بالتقنية،
                  بل في صياغة موقف تحريري واضح: المحتوى أولًا، والتقنية وسيلة.
                </p>
                <p>
                  اليوم، يقف خلف بروبرتي ME فريق من المحررين والمحللين والمطورين
                  الذين يعملون يدًا بيد. نخبر القصة من الميدان، ونغذيها بأدوات
                  بحث ذكية، ونقدّمها لك في تجربة قراءة تعرفك وتحترم وقتك.
                </p>
              </div>

              <PullQuote
                dir={dir}
                quote="نحن لا نطارد العاجل لأجل العاجل. نحن نطارد القصة الكاملة."
                author="غرفة تحرير بروبرتي ME"
              />
            </div>
          </div>
        </section>

        {/* Journey - editorial timeline */}
        <section
          className="py-16 md:py-24 bg-muted/40 border-y border-border"
          aria-labelledby="journey-heading"
        >
          <div className="container mx-auto px-4">
            <div className="mb-12 md:mb-16">
              <SectionHeader
                dir={dir}
                eyebrow="رحلتنا"
                title="من خبر يومي إلى منصة ذكية."
                lead="محطات اختزلت فيها بروبرتي ME تحوّلها من موقع إخباري سعودي إلى منصة إقليمية ذكية."
              />
            </div>

            <ol className="grid gap-px bg-border overflow-hidden rounded-md md:grid-cols-2 lg:grid-cols-5">
              {journey.map((item, i) => (
                <li
                  key={i}
                  className="relative bg-background p-6 md:p-7 flex flex-col gap-3"
                  data-testid={`timeline-item-${i}`}
                >
                  <div className="flex items-baseline gap-3 flex-row-reverse justify-end">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                      {item.year}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground/60 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3
                    className="text-lg md:text-xl font-bold text-foreground leading-snug"
                    data-testid={`timeline-title-${i}`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Beliefs - alternating editorial blocks */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-12 md:mb-16">
              <SectionHeader
                dir={dir}
                eyebrow="ما نؤمن به"
                title="أربع قناعات تحكم كل قرار تحريري."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden border border-border">
              {beliefs.map((b, i) => (
                <article
                  key={i}
                  className="bg-background p-7 md:p-9 flex gap-5 flex-row-reverse"
                  data-testid={`belief-${i}`}
                >
                  <div className="flex-1 text-right">
                    <div className="flex items-baseline gap-3 mb-3 flex-row-reverse">
                      <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        {b.title}
                      </h3>
                      <span className="text-xs font-mono font-bold text-accent tabular-nums">
                        ٠{i + 1}
                      </span>
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-foreground" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* AI Edge - dark editorial section */}
        <section className="py-16 md:py-24 bg-foreground text-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <div className="inline-flex items-center gap-2 mb-5 flex-row-reverse">
                  <span className="h-px w-8 bg-accent" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    الميزة الذكية
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                  ذكاء اصطناعي يخدم القارئ، لا يستبدل المحرر.
                </h2>
                <p className="text-base md:text-lg text-background/75 leading-relaxed">
                  نستثمر التقنية لتوسيع قدرة المحرر، وتقديم تجربة قراءة مفصّلة لك
                  دون التضحية بأخلاقيات المهنة أو خصوصيتك.
                </p>
              </div>

              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-background/15 rounded-md overflow-hidden">
                {aiEdge.map((f, i) => (
                  <div
                    key={i}
                    className="bg-foreground p-6 md:p-7"
                    data-testid={`ai-feature-${i}`}
                  >
                    <div className="w-10 h-10 rounded-md bg-background/10 flex items-center justify-center mb-4 text-accent">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-background mb-2 leading-snug">
                      {f.title}
                    </h3>
                    <p className="text-sm text-background/70 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CTABand
          dir={dir}
          eyebrow="تواصل"
          title="حوار مفتوح مع فريق التحرير."
          lead="عندك ملاحظة، تصحيح، أو فكرة قصة؟ بابنا مفتوح. تواصل معنا مباشرة."
          primary={{
            label: "تواصل معنا",
            href: "/contact",
            testId: "button-cta-contact",
          }}
          secondary={{
            label: "قراءة الملخص اليومي",
            href: "/daily-brief",
            testId: "button-cta-daily-brief",
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
