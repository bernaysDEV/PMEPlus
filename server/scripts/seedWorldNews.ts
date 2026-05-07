/**
 * Seed 16 world test articles under the «العالم» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedWorldNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const WORLD_CATEGORY = {
  nameAr: "العالم",
  nameEn: "World",
  slug: "world",
  description: "أخبار العالم والتحليلات الدولية",
  color: "#6366F1",
  icon: "🌍",
  displayOrder: 2,
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

const WORLD_IMAGES = [
  "https://images.unsplash.com/photo-1526666923127-b2970f64b422?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1505739773434-37286ec1ed5b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1494059980473-813e73ee784b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1535320485706-44d43b919500?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1526666923127-b2970f64b422?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "us-china-trade-deal-2026-breakthrough",
    title: "أمريكا والصين تتوصلان لاتفاق تجاري جديد بعد سنوات من التوترات",
    subtitle: "الاتفاق يخفّض الرسوم الجمركية المتبادلة بنسبة تصل إلى 40%",
    excerpt:
      "أعلن البيت الأبيض وبكين عن توصلهما إلى اتفاقية تجارية شاملة تنهي سنوات من التصعيد المتبادل.",
    content: `<p>أعلن البيت الأبيض وبكين عن التوصل إلى <strong>اتفاقية تجارية شاملة</strong> تنهي حرب الرسوم المتبادلة.</p>
<h2>أبرز البنود</h2>
<ul><li>تخفيض الرسوم الجمركية بنسبة 40%</li><li>فتح أسواق المنتجات الزراعية</li><li>التزامات بشأن الملكية الفكرية</li></ul>
<p>الأسواق العالمية استقبلت الاتفاق بارتياح وارتفعت المؤشرات الكبرى.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: WORLD_IMAGES[0],
    daysAgo: 1,
    metaDescription: "أمريكا والصين تتفقان على تخفيض الرسوم الجمركية 40% بعد سنوات من الحرب التجارية.",
    keywords: ["أمريكا", "الصين", "اتفاقية تجارية", "رسوم جمركية", "اقتصاد عالمي"],
  },
  {
    slug: "ukraine-russia-peace-deal-progress",
    title: "محادثات سلام جديدة بين أوكرانيا وروسيا في إسطنبول",
    subtitle: "وساطة سعودية-تركية تحمل أملاً بإنهاء الحرب المستمرة منذ 2022",
    excerpt:
      "انطلقت في إسطنبول جولة جديدة من محادثات السلام الأوكرانية الروسية بوساطة سعودية وتركية.",
    content: `<p>انطلقت في إسطنبول جولة جديدة من <strong>محادثات السلام</strong> بين أوكرانيا وروسيا.</p>
<h2>الوسطاء</h2>
<p>تقود السعودية وتركيا الوساطة بدعم من الإمارات وقطر، مع رعاية أممية.</p>
<h2>المطالب</h2>
<ul><li>وقف فوري لإطلاق النار</li><li>تبادل أسرى</li><li>إعادة إعمار المناطق المتضررة</li></ul>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: WORLD_IMAGES[1],
    daysAgo: 2,
    metaDescription: "محادثات سلام أوكرانية روسية في إسطنبول بوساطة سعودية وتركية.",
    keywords: ["أوكرانيا", "روسيا", "السعودية", "تركيا", "سلام"],
  },
  {
    slug: "gaza-reconstruction-international-conference",
    title: "مؤتمر دولي في الرياض لإعادة إعمار غزة بـ 50 مليار دولار",
    subtitle: "السعودية ومصر والإمارات تقود تحالفاً عربياً لإعمار القطاع",
    excerpt:
      "تستضيف الرياض مؤتمراً دولياً موسعاً لإعادة إعمار قطاع غزة بمشاركة 60 دولة.",
    content: `<p>تستضيف <strong>الرياض</strong> مؤتمراً دولياً لإعادة إعمار غزة بمشاركة 60 دولة و30 منظمة دولية.</p>
<h2>التعهدات</h2>
<ul><li>تعهدات أولية بـ 50 مليار دولار</li><li>15 مليار من السعودية</li><li>10 مليارات من الإمارات</li><li>8 مليارات من قطر</li></ul>
<p>المؤتمر يضع خطة 5 سنوات لإعادة بناء البنية التحتية.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: WORLD_IMAGES[2],
    daysAgo: 3,
    metaDescription: "مؤتمر الرياض لإعادة إعمار غزة بـ 50 مليار دولار من 60 دولة.",
    keywords: ["غزة", "إعمار", "السعودية", "الإمارات", "مؤتمر دولي"],
  },
  {
    slug: "european-energy-transition-2026",
    title: "الاتحاد الأوروبي يعلن عن خطة طاقة موحدة لتقليل الاعتماد على روسيا",
    subtitle: "الخطة تستهدف الوصول لـ 60% من الطاقة المتجددة بحلول 2030",
    excerpt:
      "أعلنت المفوضية الأوروبية خطة طاقة موحدة بقيمة 300 مليار يورو لتعزيز أمن الطاقة.",
    content: `<p>كشفت <strong>المفوضية الأوروبية</strong> عن خطة طاقة موحدة بقيمة 300 مليار يورو على 5 سنوات.</p>
<h2>المحاور الرئيسية</h2>
<ul><li>تعزيز الطاقة المتجددة</li><li>مفاعلات نووية صغيرة</li><li>شبكات كهرباء عابرة للحدود</li></ul>
<p>الهدف الوصول لـ 60% طاقة متجددة وإنهاء الاعتماد على الغاز الروسي.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[3],
    daysAgo: 4,
    metaDescription: "خطة طاقة أوروبية بـ 300 مليار يورو للوصول إلى 60% طاقة متجددة.",
    keywords: ["الاتحاد الأوروبي", "طاقة متجددة", "روسيا", "غاز", "نووي"],
  },
  {
    slug: "india-economy-overtakes-japan-third",
    title: "الهند تتجاوز اليابان لتصبح ثالث أكبر اقتصاد في العالم",
    subtitle: "الناتج المحلي الهندي يتخطى 5 تريليونات دولار للمرة الأولى",
    excerpt:
      "أعلن صندوق النقد الدولي عن تجاوز الهند لليابان في حجم الناتج المحلي الإجمالي.",
    content: `<p>كشف <strong>صندوق النقد الدولي</strong> عن تجاوز الهند لليابان في الناتج المحلي الإجمالي.</p>
<h2>الأرقام</h2>
<ul><li>الناتج المحلي الهندي: 5.1 تريليون دولار</li><li>الناتج المحلي الياباني: 4.95 تريليون دولار</li></ul>
<p>الهند تعد لتجاوز ألمانيا خلال عامين والوصول للمرتبة الرابعة عالمياً.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: WORLD_IMAGES[4],
    daysAgo: 5,
    metaDescription: "الهند تتجاوز اليابان كثالث أكبر اقتصاد في العالم بـ 5.1 تريليون دولار.",
    keywords: ["الهند", "اقتصاد عالمي", "اليابان", "صندوق النقد", "ناتج محلي"],
  },
  {
    slug: "japan-new-pm-elections-results",
    title: "اليابان تنتخب أول رئيسة وزراء في تاريخها",
    subtitle: "ساناي تاكاييشي تتصدر نتائج الانتخابات العامة",
    excerpt:
      "حصدت ساناي تاكاييشي أصواتاً تاريخية لتصبح أول امرأة تتولى رئاسة الحكومة في اليابان.",
    content: `<p>شهدت اليابان حدثاً تاريخياً بانتخاب <strong>ساناي تاكاييشي</strong> أول امرأة لرئاسة الحكومة.</p>
<h2>الأولويات</h2>
<ul><li>إصلاحات اقتصادية</li><li>تحسين العلاقة مع الجيران</li><li>الاستثمار في الطاقة النووية الآمنة</li></ul>
<p>التغيير يأتي بعد عقود من هيمنة الذكور على المشهد السياسي الياباني.</p>`,
    newsType: "breaking",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[5],
    daysAgo: 6,
    metaDescription: "ساناي تاكاييشي أول رئيسة وزراء في تاريخ اليابان.",
    keywords: ["اليابان", "رئيسة وزراء", "انتخابات", "ساناي تاكاييشي", "تاريخ"],
  },
  {
    slug: "north-korea-icbm-launch-test",
    title: "كوريا الشمالية تختبر صاروخاً عابراً للقارات بمدى 15 ألف كم",
    subtitle: "التجربة تستفز اليابان وكوريا الجنوبية وتدفع لاجتماع طارئ بمجلس الأمن",
    excerpt:
      "أجرت كوريا الشمالية تجربة صاروخية جديدة وصلت إلى مياه بحر اليابان وأثارت ردود فعل دولية.",
    content: `<p>أجرت <strong>كوريا الشمالية</strong> تجربة صاروخية جديدة لصاروخ عابر للقارات.</p>
<h2>التفاصيل</h2>
<p>الصاروخ بمدى يصل إلى 15 ألف كم، مما يضع كافة الأراضي الأمريكية في مرماه.</p>
<h2>ردود الفعل</h2>
<p>دعت اليابان لاجتماع طارئ مع كوريا الجنوبية والولايات المتحدة، فيما دعت الصين للتهدئة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[6],
    daysAgo: 7,
    metaDescription: "كوريا الشمالية تختبر صاروخاً عابراً للقارات بمدى 15 ألف كم.",
    keywords: ["كوريا الشمالية", "صاروخ", "مجلس الأمن", "اليابان", "أمريكا"],
  },
  {
    slug: "africa-summit-economic-integration",
    title: "القمة الأفريقية تتفق على تسريع منطقة التجارة الحرة القارية",
    subtitle: "إزالة 90% من الحواجز التجارية بين الدول الأفريقية بحلول 2027",
    excerpt:
      "اختُتمت القمة الأفريقية بالاتفاق على تسريع تنفيذ منطقة التجارة الحرة القارية.",
    content: `<p>اختُتمت <strong>القمة الأفريقية</strong> بالاتفاق على تسريع منطقة التجارة الحرة القارية AfCFTA.</p>
<h2>الأهداف</h2>
<ul><li>إزالة 90% من الحواجز التجارية بحلول 2027</li><li>توحيد المعايير الجمركية</li><li>إنشاء مصرف استثمار قاري</li></ul>
<p>المنطقة تضم 1.4 مليار نسمة وستصبح أكبر تكتل تجاري بعدد السكان.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[7],
    daysAgo: 8,
    metaDescription: "القمة الأفريقية تتفق على إزالة 90% من الحواجز التجارية بحلول 2027.",
    keywords: ["أفريقيا", "تجارة حرة", "AfCFTA", "اقتصاد", "قمة"],
  },
  {
    slug: "brazil-amazon-deforestation-historic-low",
    title: "البرازيل تعلن عن أدنى معدل لإزالة غابات الأمازون منذ 15 عاماً",
    subtitle: "انخفاض بنسبة 65% في معدلات قطع الأشجار بفضل إجراءات صارمة",
    excerpt:
      "أعلنت الحكومة البرازيلية عن انخفاض كبير في معدلات إزالة غابات الأمازون.",
    content: `<p>أعلنت الحكومة البرازيلية عن انخفاض معدلات <strong>إزالة غابات الأمازون</strong> بنسبة 65%.</p>
<h2>الإجراءات</h2>
<ul><li>تشديد الرقابة بطائرات مسيّرة</li><li>غرامات قياسية على المخالفين</li><li>دعم لمجتمعات السكان الأصليين</li></ul>
<p>الإنجاز يُعد ضربة قوية لخطط مكافحة التغير المناخي عالمياً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[8],
    daysAgo: 9,
    metaDescription: "إزالة غابات الأمازون تنخفض 65% لتصل لأدنى معدل منذ 15 عاماً.",
    keywords: ["البرازيل", "الأمازون", "غابات", "بيئة", "تغير مناخي"],
  },
  {
    slug: "turkey-syria-normalization-talks",
    title: "تركيا وسوريا تستأنفان المحادثات الدبلوماسية بعد سنوات من القطيعة",
    subtitle: "اللقاءات تركز على عودة اللاجئين والتعاون الأمني الحدودي",
    excerpt:
      "أعلنت أنقرة ودمشق عن استئناف المحادثات الدبلوماسية بوساطة روسية.",
    content: `<p>استأنفت <strong>تركيا وسوريا</strong> المحادثات الدبلوماسية بعد قطيعة استمرت سنوات.</p>
<h2>الملفات المطروحة</h2>
<ul><li>عودة اللاجئين السوريين من تركيا</li><li>التعاون الأمني الحدودي</li><li>إعادة فتح السفارات</li></ul>
<p>الوساطة تقودها روسيا بدعم من إيران، مع متابعة دقيقة من الدول الخليجية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[9],
    daysAgo: 10,
    metaDescription: "تركيا وسوريا تستأنفان المحادثات الدبلوماسية بوساطة روسية.",
    keywords: ["تركيا", "سوريا", "روسيا", "لاجئون", "دبلوماسية"],
  },
  {
    slug: "lebanon-economic-reform-imf-deal",
    title: "لبنان يوقّع اتفاقاً مع صندوق النقد الدولي بقيمة 4 مليارات دولار",
    subtitle: "الاتفاق يُلزم بإصلاحات اقتصادية شاملة لإنقاذ الاقتصاد المنهار",
    excerpt:
      "وقّع لبنان اتفاقاً تاريخياً مع صندوق النقد الدولي ينهي سنوات من المفاوضات.",
    content: `<p>وقّع <strong>لبنان</strong> اتفاقاً مع صندوق النقد الدولي بقيمة 4 مليارات دولار.</p>
<h2>الإصلاحات المطلوبة</h2>
<ul><li>إعادة هيكلة القطاع المصرفي</li><li>توحيد سعر الصرف</li><li>إصلاح قطاع الكهرباء</li><li>مكافحة الفساد</li></ul>
<p>الاتفاق يفتح الباب لاستثمارات خليجية ودولية بعد سنوات من التراجع.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[10],
    daysAgo: 12,
    metaDescription: "لبنان يوقّع اتفاقاً بـ 4 مليارات دولار مع صندوق النقد الدولي.",
    keywords: ["لبنان", "صندوق النقد", "إصلاحات", "اقتصاد", "أزمة"],
  },
  {
    slug: "iran-nuclear-deal-revised-framework",
    title: "اتفاق نووي إيراني جديد بإطار محسّن مع الدول الست",
    subtitle: "الاتفاق يخفض اليورانيوم المخصب مقابل رفع تدريجي للعقوبات",
    excerpt:
      "توصلت إيران والدول الست الكبرى إلى إطار جديد للاتفاق النووي بعد محادثات في فيينا.",
    content: `<p>توصلت <strong>إيران والدول الست الكبرى</strong> إلى إطار جديد للاتفاق النووي.</p>
<h2>أبرز البنود</h2>
<ul><li>تخفيض اليورانيوم المخصب لـ 3.67%</li><li>رفع تدريجي للعقوبات</li><li>تفتيش أكثر صرامة</li></ul>
<p>الاتفاق ينعكس إيجاباً على أسعار النفط واستقرار المنطقة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[11],
    daysAgo: 13,
    metaDescription: "اتفاق نووي إيراني جديد بإطار محسّن ورفع تدريجي للعقوبات.",
    keywords: ["إيران", "اتفاق نووي", "فيينا", "عقوبات", "يورانيوم"],
  },
  {
    slug: "iraq-elections-new-government-formation",
    title: "العراق يشكّل حكومة جديدة بعد انتخابات تنافسية",
    subtitle: "الحكومة الجديدة تركز على الإصلاحات الاقتصادية وقطاع الكهرباء",
    excerpt:
      "أعلن البرلمان العراقي عن تشكيل حكومة جديدة برئاسة شخصية تحظى بتوافق سياسي واسع.",
    content: `<p>أعلن <strong>البرلمان العراقي</strong> عن تشكيل حكومة جديدة بعد انتخابات تنافسية.</p>
<h2>الأولويات</h2>
<ul><li>إصلاح قطاع الكهرباء</li><li>مكافحة الفساد</li><li>تنويع مصادر الدخل</li><li>تعزيز العلاقات الإقليمية</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[12],
    daysAgo: 14,
    metaDescription: "تشكيل حكومة عراقية جديدة بعد انتخابات تنافسية.",
    keywords: ["العراق", "انتخابات", "حكومة", "إصلاحات", "كهرباء"],
  },
  {
    slug: "egypt-grand-renaissance-dam-final-agreement",
    title: "اتفاق نهائي بشأن سد النهضة الإثيوبي بين مصر والسودان وإثيوبيا",
    subtitle: "الاتفاق يضمن حصص مصر المائية ويفتح آفاقاً للتعاون الإقليمي",
    excerpt:
      "أعلنت الدول الثلاث عن توصلها لاتفاق ملزم قانونياً بشأن سد النهضة الإثيوبي.",
    content: `<p>أعلنت <strong>مصر والسودان وإثيوبيا</strong> عن اتفاق نهائي ملزم قانونياً بشأن سد النهضة.</p>
<h2>أبرز البنود</h2>
<ul><li>ضمان حصة مصر السنوية من مياه النيل</li><li>تنسيق ملء الخزان</li><li>آلية لمواجهة الجفاف</li></ul>
<p>الاتفاق ينهي خلافات استمرت أكثر من عقد وكاد يدخل المنطقة في صراع.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: WORLD_IMAGES[13],
    daysAgo: 16,
    metaDescription: "اتفاق نهائي بشأن سد النهضة بين مصر والسودان وإثيوبيا.",
    keywords: ["مصر", "إثيوبيا", "سد النهضة", "السودان", "النيل"],
  },
  {
    slug: "germany-economy-recession-recovery",
    title: "ألمانيا تخرج من الركود الاقتصادي بنمو 1.8% خلال الربع الأول",
    subtitle: "تحسن الصناعات التحويلية والصادرات يقود الاقتصاد الألماني",
    excerpt:
      "أعلن المكتب الفيدرالي للإحصاء عن خروج الاقتصاد الألماني من الركود مع نمو إيجابي.",
    content: `<p>خرجت <strong>ألمانيا</strong> رسمياً من الركود الاقتصادي بنمو 1.8% خلال الربع الأول.</p>
<h2>المحركات</h2>
<ul><li>انتعاش الصناعات التحويلية</li><li>تحسن الصادرات للصين والولايات المتحدة</li><li>انخفاض أسعار الطاقة</li></ul>
<p>التحسن جاء بعد عامين من الانكماش الاقتصادي الناجم عن أزمة الطاقة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[14],
    daysAgo: 18,
    metaDescription: "ألمانيا تخرج من الركود الاقتصادي بنمو 1.8% في الربع الأول.",
    keywords: ["ألمانيا", "اقتصاد", "ركود", "صادرات", "أوروبا"],
  },
  {
    slug: "us-presidential-election-2026-midterm",
    title: "نتائج الانتخابات النصفية الأمريكية تعيد تشكيل الكونغرس",
    subtitle: "الجمهوريون يحتفظون بمجلس النواب فيما يتقدم الديمقراطيون في الشيوخ",
    excerpt:
      "أسفرت نتائج الانتخابات النصفية في الولايات المتحدة عن نتائج متفاوتة بين الحزبين.",
    content: `<p>أسفرت <strong>الانتخابات النصفية الأمريكية</strong> عن نتائج متوازنة بين الحزبين.</p>
<h2>التوزيع الجديد</h2>
<ul><li>الجمهوريون يحتفظون بمجلس النواب بفارق ضئيل</li><li>الديمقراطيون يفوزون بأغلبية مريحة في الشيوخ</li><li>تحول 3 ولايات حدودية لصالح الديمقراطيين</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: WORLD_IMAGES[15],
    daysAgo: 21,
    metaDescription: "الانتخابات النصفية الأمريكية تعيد تشكيل الكونغرس بنتائج متوازنة.",
    keywords: ["أمريكا", "انتخابات نصفية", "الكونغرس", "جمهوريون", "ديمقراطيون"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, WORLD_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${WORLD_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, WORLD_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${WORLD_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(WORLD_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${WORLD_CATEGORY.nameAr} (slug: ${WORLD_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} world test articles...\n`);

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
      category: "World",
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
        originalMessage: "Seeded by seedWorldNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new world articles.`);

  return {
    category: "World",
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
