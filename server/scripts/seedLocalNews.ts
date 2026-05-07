/**
 * Seed 16 local (Saudi regions) test articles under the «محليات» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedLocalNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const LOCAL_CATEGORY = {
  nameAr: "محليات",
  nameEn: "Local",
  slug: "local",
  description: "أخبار المناطق والمدن السعودية",
  color: "#3B82F6",
  icon: "🗺️",
  displayOrder: 1,
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

const LOCAL_IMAGES = [
  "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551860823-4118bbf6c0fe?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542840411-5b3d2f3a2c1c?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1545158539-1709fb4ff60a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1592486058517-36236ba247c8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1601563040242-5a0a5e4e2f6f?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "riyadh-mukaab-megaproject-update-2026",
    title: "الرياض تكشف عن المرحلة الثانية من مشروع «المربع» العملاق",
    subtitle: "المشروع يهدف لاستيعاب 100 ألف ساكن وملايين الزوار سنوياً",
    excerpt:
      "أعلنت شركة المربع الجديد عن انطلاق المرحلة الثانية من المشروع وسط الرياض بتكلفة تتجاوز 50 مليار ريال.",
    content: `<p>كشفت شركة <strong>المربع الجديد</strong> التابعة لصندوق الاستثمارات العامة عن تفاصيل المرحلة الثانية من المشروع.</p>
<h2>أبرز المنشآت</h2>
<ul><li>المكعب الرمزي بارتفاع 400 متر</li><li>أكثر من 80 ألف وحدة سكنية</li><li>9000 غرفة فندقية</li><li>620 ألف م² مكاتب</li></ul>
<h2>الجدول الزمني</h2>
<p>من المتوقع تسليم المرحلة الثانية بحلول 2030 ضمن مستهدفات رؤية المملكة.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: LOCAL_IMAGES[0],
    daysAgo: 1,
    metaDescription: "المرحلة الثانية من مشروع المربع الجديد بالرياض بتكلفة 50 مليار ريال.",
    keywords: ["الرياض", "المربع", "صندوق الاستثمارات", "رؤية 2030", "عقارات"],
  },
  {
    slug: "jeddah-corniche-new-waterfront-opening",
    title: "افتتاح الواجهة البحرية الجديدة في كورنيش جدة بطول 7 كيلومترات",
    subtitle: "المشروع يضم متنزهات ومطاعم وممرات للدراجات والمشاة",
    excerpt:
      "افتتحت أمانة محافظة جدة الواجهة البحرية الجديدة بكورنيش جدة بعد عامين من الأعمال التطويرية.",
    content: `<p>افتتحت <strong>أمانة محافظة جدة</strong> الواجهة البحرية الجديدة بطول 7 كيلومترات على الكورنيش الشمالي.</p>
<h2>المرافق الجديدة</h2>
<ul><li>ممرات للمشاة وراكبي الدراجات</li><li>30 مطعماً ومقهى</li><li>3 متنزهات عائلية</li><li>مسطحات خضراء بمساحة 250 ألف م²</li></ul>
<p>المشروع جزء من خطة جدة التطويرية لتحويلها إلى وجهة سياحية عالمية على البحر الأحمر.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: LOCAL_IMAGES[1],
    daysAgo: 2,
    metaDescription: "افتتاح الواجهة البحرية الجديدة بكورنيش جدة بطول 7 كم.",
    keywords: ["جدة", "كورنيش", "البحر الأحمر", "سياحة", "أمانة جدة"],
  },
  {
    slug: "makkah-haram-third-expansion-phase",
    title: "بدء أعمال المرحلة الثالثة من توسعة المسجد الحرام",
    subtitle: "التوسعة ستضيف طاقة استيعابية لـ 1.6 مليون مصلٍ إضافي",
    excerpt:
      "أعلنت الرئاسة العامة لشؤون الحرمين انطلاق أعمال المرحلة الثالثة من توسعة المسجد الحرام.",
    content: `<p>انطلقت أعمال <strong>المرحلة الثالثة</strong> من توسعة المسجد الحرام لاستيعاب أعداد الحجاج والمعتمرين المتزايدة.</p>
<h2>تفاصيل التوسعة</h2>
<ul><li>إضافة طاقة استيعاب لـ 1.6 مليون مصلٍ</li><li>78 بوابة جديدة</li><li>500 سلم كهربائي</li><li>منظومة تكييف ذكية</li></ul>
<p>تستهدف التوسعة الاكتمال عام 2030 مع تحسين شامل لمنظومة الخدمات.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[2],
    daysAgo: 3,
    metaDescription: "بدء المرحلة الثالثة من توسعة المسجد الحرام بطاقة 1.6 مليون مصلٍ.",
    keywords: ["مكة", "المسجد الحرام", "توسعة", "حج", "حرمين"],
  },
  {
    slug: "madinah-mashaer-train-extension",
    title: "تمديد قطار المشاعر المقدسة ليصل إلى المدينة المنورة",
    subtitle: "المشروع يربط بين الحرمين بقطار سريع خلال ساعتين",
    excerpt:
      "أعلنت وزارة النقل عن مشروع تمديد قطار المشاعر المقدسة ليصل إلى المدينة المنورة.",
    content: `<p>كشفت <strong>وزارة النقل والخدمات اللوجستية</strong> عن مشروع طموح لتوسيع قطار المشاعر ليربط مكة بالمدينة المنورة.</p>
<h2>المسار الجديد</h2>
<p>القطار سيقطع المسافة بين الحرمين خلال ساعتين فقط بسرعة تصل إلى 300 كم/ساعة.</p>
<h2>الفائدة</h2>
<p>تخفيف الازدحام على الطرق وتعزيز تجربة الحجاج والمعتمرين.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[3],
    daysAgo: 4,
    metaDescription: "تمديد قطار المشاعر المقدسة ليصل إلى المدينة المنورة بسرعة 300 كم/س.",
    keywords: ["المدينة المنورة", "قطار المشاعر", "النقل", "حج", "وزارة النقل"],
  },
  {
    slug: "dammam-marjan-island-tourism-launch",
    title: "إطلاق مشروع جزيرة المرجان السياحي بالدمام",
    subtitle: "الجزيرة الاصطناعية ستضم منتجعات فاخرة ومرافق ترفيهية",
    excerpt:
      "أعلنت الهيئة الملكية بالجبيل عن إطلاق مشروع جزيرة المرجان السياحي قبالة سواحل الدمام.",
    content: `<p>أُطلق رسمياً مشروع <strong>جزيرة المرجان</strong>، الجزيرة السياحية الاصطناعية على الخليج العربي قبالة الدمام.</p>
<h2>المرافق</h2>
<ul><li>5 منتجعات بـ 2500 غرفة</li><li>مرسى لـ 300 يخت</li><li>مدينة ألعاب مائية</li><li>مركز تسوق فاخر</li></ul>
<p>يستهدف المشروع 2 مليون زائر سنوياً ضمن خطة تطوير المنطقة الشرقية.</p>`,
    newsType: "regular",
    isFeatured: true,
    imageUrl: LOCAL_IMAGES[4],
    daysAgo: 5,
    metaDescription: "مشروع جزيرة المرجان بالدمام يستهدف 2 مليون زائر سنوياً.",
    keywords: ["الدمام", "المنطقة الشرقية", "سياحة", "جزيرة المرجان", "خليج عربي"],
  },
  {
    slug: "abha-summer-festival-2026-launch",
    title: "انطلاق فعاليات صيف أبها 2026 بأكثر من 200 فعالية",
    subtitle: "المهرجان يستقطب أكثر من 3 ملايين زائر طوال أشهر الصيف",
    excerpt:
      "انطلقت فعاليات «صيف أبها 2026» التي تستمر 90 يوماً وسط حضور جماهيري كبير.",
    content: `<p>افتُتحت فعاليات <strong>صيف أبها 2026</strong> بحفل جماهيري ضخم في منطقة عسير.</p>
<h2>أبرز الفعاليات</h2>
<ul><li>مهرجان الزهور والورود</li><li>مسرحيات وعروض موسيقية</li><li>سباقات الهجن والخيل</li><li>مهرجان الأكلات الشعبية</li></ul>
<p>تستمر الفعاليات حتى نهاية أغسطس بمشاركة فنانين عرب وعالميين.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[5],
    daysAgo: 6,
    metaDescription: "صيف أبها 2026 بأكثر من 200 فعالية يستقطب 3 ملايين زائر.",
    keywords: ["أبها", "عسير", "صيف", "سياحة", "مهرجان"],
  },
  {
    slug: "taif-rose-season-record-production",
    title: "موسم الورد الطائفي يحقق إنتاجاً قياسياً يتجاوز 700 مليون وردة",
    subtitle: "ارتفاع إنتاج الورد ودهنه بنسبة 20% مقارنة بالعام الماضي",
    excerpt:
      "حقق موسم الورد الطائفي هذا العام إنتاجاً قياسياً مع زيادة طلب محلي وعالمي على دهن الورد.",
    content: `<p>سجّل <strong>موسم الورد الطائفي</strong> لهذا العام إنتاجاً قياسياً تجاوز 700 مليون وردة.</p>
<h2>المنتجات</h2>
<ul><li>دهن الورد الفاخر</li><li>ماء الورد العضوي</li><li>عطور مستخلصة من الورد البلدي</li></ul>
<p>الإنتاج يصدّر إلى أكثر من 30 دولة بما فيها فرنسا واليابان.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[6],
    daysAgo: 7,
    metaDescription: "موسم الورد الطائفي يحقق 700 مليون وردة بزيادة 20%.",
    keywords: ["الطائف", "ورد طائفي", "دهن الورد", "زراعة", "صادرات"],
  },
  {
    slug: "tabuk-neom-the-line-progress-update",
    title: "نيوم تكشف عن نسبة إنجاز المرحلة الأولى من مشروع «ذا لاين»",
    subtitle: "المرحلة الأولى تستوعب 200 ألف ساكن مع افتتاح جزئي عام 2030",
    excerpt:
      "أعلنت شركة نيوم عن وصول نسبة إنجاز المرحلة الأولى من مشروع «ذا لاين» إلى 30%.",
    content: `<p>أعلنت <strong>شركة نيوم</strong> عن تحديث جديد لأعمال «ذا لاين»، حيث وصلت أعمال المرحلة الأولى إلى 30%.</p>
<h2>الإحصائيات</h2>
<ul><li>أكثر من 140 ألف عامل في الموقع</li><li>140 رافعة عملاقة</li><li>أعمال حفر بطول 5 كيلومترات</li></ul>
<p>المرحلة الأولى ستستوعب 200 ألف ساكن وتفتتح جزئياً عام 2030.</p>`,
    newsType: "regular",
    isFeatured: true,
    imageUrl: LOCAL_IMAGES[7],
    daysAgo: 8,
    metaDescription: "نيوم تعلن إنجاز 30% من المرحلة الأولى لمشروع ذا لاين.",
    keywords: ["تبوك", "نيوم", "ذا لاين", "رؤية 2030", "مدن مستقبلية"],
  },
  {
    slug: "qassim-dates-festival-record-sales",
    title: "مهرجان بريدة للتمور يحقق مبيعات قياسية تتجاوز مليار ريال",
    subtitle: "أكبر سوق للتمور في العالم يستقطب تجاراً من 25 دولة",
    excerpt:
      "اختُتمت فعاليات مهرجان بريدة للتمور بأرقام قياسية في المبيعات وأعداد الزوار.",
    content: `<p>اختُتم <strong>مهرجان بريدة للتمور</strong> بمبيعات تجاوزت مليار ريال خلال شهرين.</p>
<h2>الإنجازات</h2>
<ul><li>أكثر من 5 ملايين زائر</li><li>تجار من 25 دولة</li><li>120 ألف طن من التمور</li></ul>
<p>المهرجان يعزز مكانة القصيم كعاصمة للتمور عالمياً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[8],
    daysAgo: 9,
    metaDescription: "مهرجان بريدة للتمور يحقق مبيعات تتجاوز مليار ريال في القصيم.",
    keywords: ["القصيم", "بريدة", "تمور", "مهرجان", "تجارة"],
  },
  {
    slug: "hail-heritage-tourism-development",
    title: "حائل تطلق مشروعاً متكاملاً لتطوير السياحة التراثية",
    subtitle: "المشروع يشمل ترميم جبة وحاتم الطائي ومتحف عقلة آل مهنا",
    excerpt:
      "أطلقت أمانة منطقة حائل مشروعاً تطويرياً لتعزيز السياحة التراثية والثقافية.",
    content: `<p>أعلنت <strong>أمانة منطقة حائل</strong> عن إطلاق مشروع تطويري شامل للسياحة التراثية.</p>
<h2>المواقع المشمولة</h2>
<ul><li>موقع جبة الأثري المسجل في اليونسكو</li><li>متحف عقلة آل مهنا</li><li>قصر القشلة التاريخي</li></ul>
<p>المشروع يهدف لجذب مليون سائح سنوياً ضمن استراتيجية السياحة الوطنية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[9],
    daysAgo: 10,
    metaDescription: "حائل تطلق مشروعاً للسياحة التراثية يستهدف مليون سائح سنوياً.",
    keywords: ["حائل", "سياحة تراثية", "اليونسكو", "متاحف", "تراث"],
  },
  {
    slug: "asir-helicopter-tours-launch",
    title: "إطلاق رحلات هليكوبتر سياحية تحلق فوق قمم عسير",
    subtitle: "الرحلات تتيح مشاهدة المرتفعات والقرى التراثية من الجو",
    excerpt:
      "أطلقت شركة الطيران السعودية الخاصة رحلات هليكوبتر سياحية فوق منطقة عسير.",
    content: `<p>أُطلقت رحلات <strong>الهليكوبتر السياحية</strong> فوق منطقة عسير بأسعار تبدأ من 800 ريال للراكب.</p>
<h2>المسارات</h2>
<ul><li>قمم السودة وجبل أبا الرشراش</li><li>قرى رجال ألمع التراثية</li><li>منتزه عسير الوطني</li></ul>
<p>المبادرة جزء من تطوير السياحة المغامرة في الجنوب.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[10],
    daysAgo: 12,
    metaDescription: "رحلات هليكوبتر سياحية فوق عسير بأسعار تبدأ من 800 ريال.",
    keywords: ["عسير", "هليكوبتر", "سياحة مغامرة", "السودة", "رجال ألمع"],
  },
  {
    slug: "jazan-mango-export-record-2026",
    title: "صادرات مانجو جازان تحقق رقماً قياسياً في 2026",
    subtitle: "ارتفاع كميات التصدير إلى دول الخليج وأوروبا بنسبة 35%",
    excerpt:
      "حققت صادرات مانجو جازان أرقاماً قياسية مع توسع الأسواق المستوردة لتشمل أوروبا.",
    content: `<p>كشفت وزارة البيئة والمياه والزراعة عن أرقام قياسية لصادرات <strong>مانجو جازان</strong>.</p>
<h2>أبرز الأرقام</h2>
<ul><li>40 ألف طن صادرات</li><li>أكثر من 12 دولة مستوردة</li><li>زيادة 35% عن العام الماضي</li></ul>
<p>المانجو الجازانية معروفة بأكثر من 50 صنفاً متنوعاً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[11],
    daysAgo: 13,
    metaDescription: "صادرات مانجو جازان تتجاوز 40 ألف طن إلى 12 دولة.",
    keywords: ["جازان", "مانجو", "صادرات", "زراعة", "وزارة الزراعة"],
  },
  {
    slug: "riyadh-metro-blue-line-launch",
    title: "تشغيل المسار الأزرق من قطار الرياض رسمياً للجمهور",
    subtitle: "المسار يربط شمال الرياض بجنوبها على طول 38 كم بـ 25 محطة",
    excerpt:
      "افتُتح المسار الأزرق من مشروع قطار الرياض رسمياً مع توقعات بنقل مليون راكب يومياً.",
    content: `<p>افتتحت الهيئة الملكية لمدينة الرياض المسار الأزرق من <strong>قطار الرياض</strong>.</p>
<h2>التفاصيل</h2>
<ul><li>طول المسار 38 كم</li><li>25 محطة على امتداد طريق الملك عبدالعزيز</li><li>قدرة استيعابية مليون راكب يومياً</li></ul>
<p>القطار يتميز بالقيادة الذاتية والتكييف الذكي للمحطات.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: LOCAL_IMAGES[12],
    daysAgo: 14,
    metaDescription: "افتتاح المسار الأزرق من قطار الرياض بطول 38 كم و25 محطة.",
    keywords: ["الرياض", "قطار الرياض", "المسار الأزرق", "نقل عام", "هيئة الرياض"],
  },
  {
    slug: "albaha-forest-eco-tourism-park",
    title: "افتتاح أكبر منتزه بيئي في غابات منطقة الباحة",
    subtitle: "المنتزه يضم مسارات للمشي ومخيمات بيئية على مساحة 5000 هكتار",
    excerpt:
      "افتُتح المنتزه البيئي الجديد في الباحة كأكبر مشروع للسياحة البيئية في الجنوب.",
    content: `<p>افتُتح أكبر <strong>منتزه بيئي</strong> في منطقة الباحة على مساحة 5000 هكتار من الغابات.</p>
<h2>المرافق</h2>
<ul><li>مسارات للمشي بطول 50 كم</li><li>مخيمات بيئية صديقة للبيئة</li><li>مراكز ملاحظة الطيور</li></ul>
<p>المشروع يشكّل وجهة جديدة لمحبي السياحة البيئية والتخييم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[13],
    daysAgo: 16,
    metaDescription: "افتتاح أكبر منتزه بيئي في غابات الباحة على 5000 هكتار.",
    keywords: ["الباحة", "سياحة بيئية", "غابات", "منتزه", "تخييم"],
  },
  {
    slug: "hafar-albatin-development-strategy",
    title: "حفر الباطن تطلق استراتيجية تنموية شاملة بـ 8 مليارات ريال",
    subtitle: "الاستراتيجية تستهدف مشاريع التعليم والصحة والبنية التحتية",
    excerpt:
      "أعلنت أمانة منطقة حفر الباطن عن استراتيجية تنموية متكاملة بقيمة 8 مليارات ريال.",
    content: `<p>أطلقت <strong>أمانة منطقة حفر الباطن</strong> استراتيجية تنموية شاملة بقيمة 8 مليارات ريال على 5 سنوات.</p>
<h2>المحاور</h2>
<ul><li>30 مشروعاً تعليمياً</li><li>3 مستشفيات جديدة</li><li>تطوير شبكة الطرق الداخلية</li><li>مدن صناعية متخصصة</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[14],
    daysAgo: 18,
    metaDescription: "حفر الباطن تطلق استراتيجية تنموية بـ 8 مليارات ريال على 5 سنوات.",
    keywords: ["حفر الباطن", "تنمية", "استراتيجية", "بنية تحتية", "أمانة"],
  },
  {
    slug: "yanbu-industrial-expansion-projects",
    title: "ينبع الصناعية تستقطب استثمارات بـ 25 مليار ريال خلال 2026",
    subtitle: "مشاريع جديدة في البتروكيماويات والطاقة المتجددة والخدمات اللوجستية",
    excerpt:
      "أعلنت الهيئة الملكية بينبع عن استثمارات جديدة في المدينة الصناعية تتجاوز 25 مليار ريال.",
    content: `<p>كشفت <strong>الهيئة الملكية بينبع</strong> عن استثمارات قياسية بلغت 25 مليار ريال خلال 2026.</p>
<h2>أبرز المشاريع</h2>
<ul><li>مجمّعات بتروكيماوية متقدمة</li><li>محطة طاقة شمسية بقدرة 600 ميغاواط</li><li>توسعة الميناء التجاري</li></ul>
<p>المشاريع تخلق أكثر من 12 ألف وظيفة جديدة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: LOCAL_IMAGES[15],
    daysAgo: 20,
    metaDescription: "ينبع الصناعية تستقطب 25 مليار ريال استثمارات تخلق 12 ألف وظيفة.",
    keywords: ["ينبع", "صناعة", "بتروكيماويات", "استثمار", "هيئة ملكية"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, LOCAL_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${LOCAL_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, LOCAL_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${LOCAL_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(LOCAL_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${LOCAL_CATEGORY.nameAr} (slug: ${LOCAL_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} local (regions) test articles...\n`);

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
      category: "Local",
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
        originalMessage: "Seeded by seedLocalNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new local articles.`);

  return {
    category: "Local",
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
