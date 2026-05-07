/**
 * Seed 16 life/lifestyle test articles under the «حياتنا» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedLifeNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const LIFE_CATEGORY = {
  nameAr: "حياتنا",
  nameEn: "Life",
  slug: "life",
  description: "نمط الحياة، الصحة، الأسرة والمجتمع",
  color: "#F472B6",
  icon: "🌱",
  displayOrder: 3,
  status: "active" as const,
};

type NewsType = "regular" | "featured" | "breaking";

interface SeedArticle {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  newsType: NewsType;
  isFeatured: boolean;
  imageUrl: string;
  daysAgo: number;
  metaDescription: string;
  keywords: string[];
}

const LIFE_IMAGES = [
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542736667-069246bdbc6d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1502691876148-a84978e59af8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1532635241-17e820acc59f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518605603039-e35eba0a3d44?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "heart-health-daily-habits-research",
    title: "دراسة: 5 عادات يومية تخفّض خطر أمراض القلب بنسبة 50%",
    subtitle: "أبحاث جديدة تكشف تأثير العادات البسيطة على صحة القلب",
    excerpt:
      "كشفت دراسة طبية واسعة أن خمس عادات يومية بسيطة قد تخفض خطر الإصابة بأمراض القلب إلى النصف.",
    content: `<p>كشفت دراسة طبية حديثة في جامعة هارفارد أن <strong>5 عادات يومية</strong> تقي من أمراض القلب.</p>
<h2>العادات الذهبية</h2>
<ul><li>المشي 30 دقيقة يومياً</li><li>تناول حصتين فاكهة وخضار</li><li>النوم 7-8 ساعات</li><li>التأمل 10 دقائق</li><li>شرب 2 لتر ماء</li></ul>
<p>الالتزام بهذه العادات يخفّض الإصابة بنسبة 50% خلال 5 سنوات.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: LIFE_IMAGES[0],
    daysAgo: 1,
    metaDescription: "5 عادات يومية تخفض خطر أمراض القلب بنسبة 50% بحسب دراسة هارفارد.",
    keywords: ["صحة", "قلب", "عادات يومية", "لياقة", "هارفارد"],
  },
  {
    slug: "parenting-screen-time-children-impact",
    title: "خبراء: ساعتان فقط من الشاشات يومياً للأطفال",
    subtitle: "توصيات جديدة من منظمة الصحة العالمية بشأن استخدام الأطفال للأجهزة",
    excerpt:
      "أصدرت منظمة الصحة العالمية توصيات محدثة بشأن وقت استخدام الأطفال للشاشات.",
    content: `<p>أصدرت <strong>منظمة الصحة العالمية</strong> توصيات جديدة بشأن استخدام الأطفال للشاشات.</p>
<h2>التوصيات</h2>
<ul><li>الأطفال دون السنتين: لا يُنصح بالشاشات</li><li>2-5 سنوات: ساعة واحدة كحد أقصى</li><li>6-12 سنة: ساعتان مع إشراف</li></ul>
<p>الإفراط مرتبط بضعف التركيز ومشكلات النوم وتأخر اللغة.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[1],
    daysAgo: 2,
    metaDescription: "منظمة الصحة العالمية توصي بحد أقصى ساعتين للأطفال على الشاشات يومياً.",
    keywords: ["تربية", "أطفال", "شاشات", "صحة", "منظمة الصحة"],
  },
  {
    slug: "sleep-quality-mental-health-link",
    title: "النوم الجيد يقلل خطر الاكتئاب بنسبة 35%",
    subtitle: "دراسة دولية تكشف العلاقة الوثيقة بين جودة النوم والصحة النفسية",
    excerpt:
      "نتائج دراسة طبية كبرى تؤكد ارتباط النوم العميق بانخفاض معدلات الاكتئاب والقلق.",
    content: `<p>دراسة دولية شاملة شملت 30 ألف مشارك تكشف أن <strong>النوم العميق</strong> يقي من الاكتئاب.</p>
<h2>النتائج</h2>
<ul><li>تقليل خطر الاكتئاب بنسبة 35%</li><li>تحسين الذاكرة</li><li>دعم جهاز المناعة</li></ul>
<p>أهم الإرشادات: تجنب الشاشات قبل النوم بساعة، وتثبيت موعد ثابت للنوم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[2],
    daysAgo: 3,
    metaDescription: "النوم الجيد يقلل خطر الاكتئاب بنسبة 35% وفقاً لدراسة شاملة.",
    keywords: ["نوم", "اكتئاب", "صحة نفسية", "دراسة", "ذاكرة"],
  },
  {
    slug: "ramadan-nutrition-balanced-iftar-suhoor",
    title: "نصائح غذائية لشهر رمضان: كيف تحقق وجبة إفطار متوازنة؟",
    subtitle: "خبراء تغذية يقدمون إرشادات للحفاظ على الصحة خلال الصيام",
    excerpt:
      "مع اقتراب رمضان، يقدم خبراء التغذية إرشادات لتحقيق وجبات إفطار وسحور متوازنة وصحية.",
    content: `<p>يقدم خبراء التغذية مع اقتراب رمضان نصائح لـ <strong>وجبات متوازنة</strong> خلال الصيام.</p>
<h2>الإفطار المثالي</h2>
<ul><li>تمر مع كأس ماء</li><li>شوربة خفيفة</li><li>سلطة موسمية</li><li>طبق رئيسي بكمية معتدلة</li></ul>
<h2>السحور</h2>
<p>يجب أن يحتوي على بروتين وكربوهيدرات معقدة لإمداد الجسم بالطاقة طوال اليوم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[3],
    daysAgo: 4,
    metaDescription: "نصائح غذائية لرمضان: وجبات إفطار وسحور متوازنة من خبراء التغذية.",
    keywords: ["رمضان", "تغذية", "إفطار", "سحور", "صيام"],
  },
  {
    slug: "workplace-mental-health-burnout-rise",
    title: "الإرهاق الوظيفي يؤثر على 60% من العاملين عن بُعد",
    subtitle: "دراسة جديدة تكشف ارتفاع معدلات الاحتراق النفسي في بيئات العمل المرنة",
    excerpt:
      "تكشف دراسة حديثة عن ارتفاع كبير في معدلات الاحتراق النفسي لدى العاملين عن بُعد.",
    content: `<p>كشفت دراسة دولية عن ارتفاع <strong>الإرهاق الوظيفي</strong> ليطال 60% من العاملين عن بُعد.</p>
<h2>الأسباب</h2>
<ul><li>عدم الفصل بين العمل والمنزل</li><li>طول ساعات الاجتماعات الافتراضية</li><li>ضعف التواصل البشري</li></ul>
<h2>الحلول</h2>
<p>تخصيص ساعات محددة للعمل، أخذ استراحات منتظمة، وممارسة الرياضة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[4],
    daysAgo: 5,
    metaDescription: "الإرهاق الوظيفي يطال 60% من العاملين عن بُعد بحسب دراسة جديدة.",
    keywords: ["عمل عن بُعد", "احتراق وظيفي", "صحة نفسية", "إرهاق", "إنتاجية"],
  },
  {
    slug: "home-workout-guide-equipment-free",
    title: "دليلك للتمارين المنزلية: 7 تمارين فعّالة بدون معدات",
    subtitle: "خبراء لياقة بدنية يستعرضون تمارين بسيطة لجميع المستويات",
    excerpt:
      "يستعرض المدربون أبرز التمارين المنزلية التي يمكن ممارستها دون الحاجة لأي معدات.",
    content: `<p>يقدم خبراء اللياقة <strong>7 تمارين منزلية</strong> فعّالة دون معدات.</p>
<h2>قائمة التمارين</h2>
<ul><li>الضغط (Push-ups)</li><li>القرفصاء (Squats)</li><li>البلانك (Plank)</li><li>الطعن (Lunges)</li><li>تسلق الجبل (Mountain Climbers)</li><li>قفز النجمة</li><li>تمارين البطن</li></ul>
<p>20 دقيقة يومياً تكفي للحفاظ على لياقة جيدة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[5],
    daysAgo: 6,
    metaDescription: "7 تمارين منزلية فعالة بدون معدات للحفاظ على اللياقة البدنية.",
    keywords: ["لياقة", "تمارين منزلية", "صحة", "رياضة", "جسم"],
  },
  {
    slug: "family-communication-digital-age-tips",
    title: "كيف نحافظ على التواصل الأسري في زمن التكنولوجيا؟",
    subtitle: "خبراء أسريون يقدمون نصائح عملية لتعزيز الروابط داخل الأسرة",
    excerpt:
      "يقدم استشاريون أسريون نصائح لتعزيز التواصل بين أفراد الأسرة في عصر التكنولوجيا.",
    content: `<p>يقدم استشاريون أسريون نصائح لتعزيز <strong>التواصل الأسري</strong>.</p>
<h2>النصائح</h2>
<ul><li>تخصيص ساعة يومياً للحوار العائلي</li><li>تناول وجبات الطعام معاً</li><li>منطقة منزلية خالية من الأجهزة</li><li>أنشطة ترفيهية مشتركة</li></ul>
<p>التواصل المنتظم يقلل المشكلات السلوكية لدى المراهقين بنسبة 40%.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[6],
    daysAgo: 7,
    metaDescription: "نصائح للحفاظ على التواصل الأسري في عصر التكنولوجيا.",
    keywords: ["أسرة", "تواصل", "تربية", "تكنولوجيا", "حوار عائلي"],
  },
  {
    slug: "marriage-counseling-strong-relationships-secrets",
    title: "أسرار الزواج الناجح: نصائح من 5 استشاريين",
    subtitle: "تجارب وخبرات تساعد الأزواج على بناء علاقات أكثر استقراراً",
    excerpt:
      "يقدم خمسة من أبرز الاستشاريين الأسريين نصائحهم لبناء علاقات زوجية متينة.",
    content: `<p>يجمع خمسة استشاريين أسريين على نصائح <strong>الزواج الناجح</strong>.</p>
<h2>المبادئ</h2>
<ul><li>الحوار اليومي ولو لـ 15 دقيقة</li><li>الاحترام المتبادل</li><li>تخصيص وقت للزوجين فقط</li><li>تقدير اللحظات الصغيرة</li><li>عدم النوم على خصام</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[7],
    daysAgo: 8,
    metaDescription: "أسرار الزواج الناجح من 5 استشاريين أسريين بارزين.",
    keywords: ["زواج", "علاقات", "استشاريون", "أسرة", "حياة زوجية"],
  },
  {
    slug: "diabetes-treatment-breakthrough-2026",
    title: "اختراق طبي في علاج السكري من النوع الثاني",
    subtitle: "دواء جديد يعيد توازن السكر دون حقن يومية بالأنسولين",
    excerpt:
      "أعلن باحثون عن دواء جديد لعلاج السكري من النوع الثاني بفاعلية مرتفعة.",
    content: `<p>أعلن باحثون من جامعة كامبريدج عن <strong>اختراق طبي</strong> في علاج السكري من النوع الثاني.</p>
<h2>التفاصيل</h2>
<p>الدواء يؤخذ مرة أسبوعياً ويُعيد توازن السكر بنسبة 80% في معظم المرضى.</p>
<h2>المرحلة المقبلة</h2>
<p>الدواء في المرحلة الثالثة من التجارب السريرية، ومتوقع طرحه عام 2027.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: LIFE_IMAGES[8],
    daysAgo: 9,
    metaDescription: "اختراق طبي جديد في علاج السكري من النوع الثاني بنسبة فاعلية 80%.",
    keywords: ["سكري", "صحة", "دواء", "كامبريدج", "علاج"],
  },
  {
    slug: "breast-cancer-prevention-screening-program",
    title: "حملة وطنية للكشف المبكر عن سرطان الثدي تستهدف مليون امرأة",
    subtitle: "وزارة الصحة تطلق برنامجاً مجانياً يصل لجميع مناطق المملكة",
    excerpt:
      "أطلقت وزارة الصحة حملة وطنية موسعة للكشف المبكر عن سرطان الثدي.",
    content: `<p>أطلقت <strong>وزارة الصحة</strong> حملة وطنية موسعة للكشف المبكر عن سرطان الثدي.</p>
<h2>تفاصيل الحملة</h2>
<ul><li>50 وحدة فحص متنقلة</li><li>كشف مجاني للنساء فوق 40 سنة</li><li>توعية في 200 مدرسة وجامعة</li></ul>
<p>الكشف المبكر يرفع نسبة الشفاء إلى 95%.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[9],
    daysAgo: 10,
    metaDescription: "حملة وطنية للكشف المبكر عن سرطان الثدي تستهدف مليون امرأة.",
    keywords: ["سرطان الثدي", "كشف مبكر", "وزارة الصحة", "صحة المرأة", "وقاية"],
  },
  {
    slug: "skincare-summer-tips-experts",
    title: "العناية بالبشرة في الصيف: 8 نصائح من خبراء الجلدية",
    subtitle: "كيف تحمين بشرتك من أضرار الشمس والحرارة المرتفعة؟",
    excerpt:
      "يقدم أطباء الجلدية إرشادات للعناية بالبشرة في فصل الصيف وتجنب أضرار الشمس.",
    content: `<p>يقدم أطباء الجلدية <strong>8 نصائح</strong> للعناية بالبشرة صيفاً.</p>
<h2>النصائح</h2>
<ul><li>استخدام واقي شمس SPF 50</li><li>الترطيب المستمر</li><li>تنظيف البشرة مرتين يومياً</li><li>تناول الفيتامينات</li><li>شرب كميات كافية من الماء</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[10],
    daysAgo: 12,
    metaDescription: "8 نصائح للعناية بالبشرة في الصيف من خبراء الجلدية.",
    keywords: ["بشرة", "صيف", "جلدية", "واقي شمس", "ترطيب"],
  },
  {
    slug: "elderly-fitness-active-lifestyle-program",
    title: "برامج لياقة موجهة لكبار السن في 100 مركز رياضي",
    subtitle: "وزارة الرياضة تطلق مبادرة وطنية لتعزيز نشاط كبار السن",
    excerpt:
      "أطلقت وزارة الرياضة برامج لياقة بدنية مخصصة لكبار السن في مراكز رياضية بمختلف المناطق.",
    content: `<p>أطلقت <strong>وزارة الرياضة</strong> برامج لياقة لكبار السن في 100 مركز.</p>
<h2>البرامج</h2>
<ul><li>تمارين قوة معتدلة</li><li>اليوغا والتأمل</li><li>السباحة العلاجية</li><li>المشي الجماعي</li></ul>
<p>المشاركة مجانية لكبار السن فوق 60 عاماً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[11],
    daysAgo: 13,
    metaDescription: "برامج لياقة لكبار السن في 100 مركز رياضي من وزارة الرياضة.",
    keywords: ["كبار السن", "لياقة", "وزارة الرياضة", "صحة", "نشاط"],
  },
  {
    slug: "schools-marathon-fitness-initiative",
    title: "ماراثون المدارس يجذب 50 ألف طالب وطالبة",
    subtitle: "مبادرة وطنية لتعزيز الرياضة بين الطلاب في جميع المراحل",
    excerpt:
      "انطلق ماراثون المدارس بمشاركة قياسية بلغت 50 ألف طالب وطالبة من مختلف المناطق.",
    content: `<p>انطلق <strong>ماراثون المدارس</strong> بمشاركة 50 ألف طالب وطالبة.</p>
<h2>الفئات</h2>
<ul><li>2 كم للابتدائي</li><li>5 كم للمتوسط</li><li>10 كم للثانوي</li></ul>
<p>المبادرة جزء من برنامج «جودة الحياة» لتعزيز الصحة البدنية بين الناشئة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[12],
    daysAgo: 14,
    metaDescription: "ماراثون المدارس يجذب 50 ألف طالب لتعزيز الرياضة المدرسية.",
    keywords: ["ماراثون", "مدارس", "طلاب", "رياضة", "جودة حياة"],
  },
  {
    slug: "intermittent-fasting-benefits-research",
    title: "الصيام المتقطع: فوائد علمية مثبتة لخسارة الوزن والصحة",
    subtitle: "أبحاث جديدة تؤكد فعالية الصيام المتقطع كنمط حياة صحي",
    excerpt:
      "تكشف أبحاث طبية حديثة عن فوائد متعددة للصيام المتقطع تتجاوز خسارة الوزن.",
    content: `<p>أبحاث طبية حديثة تؤكد فوائد <strong>الصيام المتقطع</strong> الصحية.</p>
<h2>الفوائد</h2>
<ul><li>خسارة دهون البطن</li><li>تحسين حساسية الإنسولين</li><li>تنشيط عمليات إصلاح الخلايا</li><li>دعم وظائف الدماغ</li></ul>
<p>أشهر النظم: 16:8 (16 ساعة صيام و8 ساعات أكل).</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[13],
    daysAgo: 16,
    metaDescription: "الصيام المتقطع: فوائد علمية مثبتة لخسارة الوزن وصحة الجسم.",
    keywords: ["صيام متقطع", "تغذية", "خسارة وزن", "صحة", "حمية"],
  },
  {
    slug: "work-life-balance-modern-strategies",
    title: "كيف تحقق التوازن بين العمل والحياة؟ 6 استراتيجيات مجربة",
    subtitle: "خبراء تنمية بشرية يقدمون نصائح لإدارة الوقت بفعالية",
    excerpt:
      "يستعرض خبراء التنمية البشرية أبرز الاستراتيجيات لتحقيق توازن صحي بين العمل والحياة.",
    content: `<p>يقدم خبراء التنمية البشرية <strong>6 استراتيجيات</strong> للتوازن.</p>
<h2>الاستراتيجيات</h2>
<ul><li>تحديد أوقات بداية ونهاية عمل واضحة</li><li>الفصل بين بريد العمل والشخصي</li><li>أخذ إجازات منتظمة</li><li>هواية أسبوعية</li><li>الاستثمار في الصداقات</li><li>ممارسة الرياضة</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[14],
    daysAgo: 18,
    metaDescription: "6 استراتيجيات مجربة لتحقيق التوازن بين العمل والحياة.",
    keywords: ["توازن", "عمل", "حياة", "إدارة وقت", "تنمية بشرية"],
  },
  {
    slug: "healthy-aging-longevity-research-saudi",
    title: "السعودية تحتل المرتبة 18 عالمياً في معدل الشيخوخة الصحية",
    subtitle: "متوسط العمر يرتفع إلى 78 سنة مع تحسن ملحوظ في جودة الحياة",
    excerpt:
      "أعلنت وزارة الصحة عن ارتفاع متوسط العمر في المملكة وتحسن مؤشرات الشيخوخة الصحية.",
    content: `<p>كشفت <strong>وزارة الصحة</strong> عن ارتفاع متوسط العمر في المملكة إلى 78 سنة.</p>
<h2>العوامل</h2>
<ul><li>تطور الرعاية الصحية</li><li>برامج التوعية الصحية</li><li>تحسن نمط الحياة</li><li>انخفاض معدلات التدخين</li></ul>
<p>المملكة في المرتبة 18 عالمياً في تصنيف الشيخوخة الصحية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LIFE_IMAGES[15],
    daysAgo: 21,
    metaDescription: "السعودية في المرتبة 18 عالمياً بمعدل الشيخوخة الصحية ومتوسط عمر 78 سنة.",
    keywords: ["شيخوخة صحية", "متوسط عمر", "صحة", "السعودية", "وزارة الصحة"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, LIFE_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${LIFE_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, LIFE_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${LIFE_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(LIFE_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${LIFE_CATEGORY.nameAr} (slug: ${LIFE_CATEGORY.slug})`);
  return created.id;
}

async function getDefaultAuthorId(): Promise<string> {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (admin) return admin.id;

  const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
  if (anyUser) return anyUser.id;

  throw new Error(
    "No users found in the database. Please bootstrap an admin user before running this seed.",
  );
}

export async function main() {
  console.log(`🌱 Seeding ${ARTICLES.length} life test articles...\n`);

  const categoryId = await ensureCategory();
  const authorId = await getDefaultAuthorId();
  console.log(`  ↳ Author ID: ${authorId}`);
  console.log(`  ↳ Category ID: ${categoryId}\n`);

  const slugs = ARTICLES.map((a) => a.slug);
  const existing = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(inArray(articles.slug, slugs));
  const existingSlugs = new Set(existing.map((row) => row.slug));

  const toInsert = ARTICLES.filter((a) => !existingSlugs.has(a.slug));
  if (toInsert.length === 0) {
    console.log(`✅ All ${ARTICLES.length} articles already exist. Nothing to do.`);
    return {
      category: "Life",
      total: ARTICLES.length,
      inserted: 0,
      skipped: ARTICLES.length,
    };
  }

  console.log(
    `  ↳ ${existingSlugs.size} already present, inserting ${toInsert.length} new articles...\n`,
  );

  const now = Date.now();
  const rows = toInsert.map((a, idx) => {
    const publishedAt = new Date(now - a.daysAgo * 24 * 60 * 60 * 1000);
    return {
      title: a.title,
      subtitle: a.subtitle,
      slug: a.slug,
      content: a.content,
      excerpt: a.excerpt,
      imageUrl: a.imageUrl || FALLBACK_IMG(idx),
      categoryId,
      authorId,
      articleType: "news",
      newsType: a.newsType,
      publishType: "instant",
      status: "published",
      isFeatured: a.isFeatured,
      views: Math.floor(Math.random() * 4000) + 200,
      source: "manual",
      sourceMetadata: {
        type: "manual" as const,
        originalMessage: "Seeded by seedLifeNews.ts",
      },
      seo: {
        metaTitle: a.title,
        metaDescription: a.metaDescription,
        keywords: a.keywords,
        socialTitle: a.title,
        socialDescription: a.metaDescription,
        imageAltText: a.title,
      },
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    };
  });

  const inserted = await db
    .insert(articles)
    .values(rows)
    .onConflictDoNothing({ target: articles.slug })
    .returning({ id: articles.id, slug: articles.slug, title: articles.title });

  for (const row of inserted) {
    console.log(`  ✅ ${row.slug}`);
  }

  console.log(`\n🎉 Done. Inserted ${inserted.length} new life articles.`);

  return {
    category: "Life",
    total: ARTICLES.length,
    inserted: inserted.length,
    skipped: existingSlugs.size,
  };
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
