/**
 * Seed 16 tourism test articles under the «سياحة» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedTourismNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const TOURISM_CATEGORY = {
  nameAr: "سياحة",
  nameEn: "Tourism",
  slug: "tourism",
  description: "تقارير سياحية ومواقع مميزة",
  color: "#34D399",
  icon: "🧳",
  displayOrder: 6,
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

const TOURISM_IMAGES = [
  "https://images.unsplash.com/photo-1563492065-1a3a7c2c0e62?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1601025045839-c44a98a6dc35?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1601228334283-3e1d6f9be1f7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574236170880-faf57c0e4f6c?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1601751818941-571144562ff8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611235244649-1f1b6dab33c1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1543674892-7d64d45df18b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1597217060415-9e44c1f1b8e9?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1563492065-1a3a7c2c0e62?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "ula-winter-festival-2026-launch",
    title: "انطلاق مهرجان شتاء طنطورة في العلا بنسخة استثنائية",
    subtitle: "أكثر من 150 فعالية فنية وثقافية على مدى شهرين",
    excerpt:
      "افتُتحت فعاليات مهرجان شتاء طنطورة في العلا بمشاركة فنانين عالميين وحضور سياحي ضخم.",
    content: `<p>افتُتحت فعاليات <strong>شتاء طنطورة</strong> في العلا بنسخة استثنائية لعام 2026.</p>
<h2>أبرز الفعاليات</h2>
<ul><li>حفلات موسيقية لنجوم عالميين</li><li>عروض فنية بالإضاءة على الجبال</li><li>سباقات الخيل العربية</li><li>تجارب بالطائرات الورقية والمناطيد</li></ul>
<p>المهرجان يستقطب نصف مليون زائر خلال شهرين.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[0],
    daysAgo: 1,
    metaDescription: "مهرجان شتاء طنطورة في العلا بنسخة استثنائية و150 فعالية.",
    keywords: ["العلا", "شتاء طنطورة", "سياحة", "مهرجان", "السعودية"],
  },
  {
    slug: "riyadh-season-2026-record-attendance",
    title: "موسم الرياض 2026 يحقق رقماً قياسياً بـ 25 مليون زائر",
    subtitle: "تجربة ترفيهية متكاملة على مدى 6 أشهر بفعاليات لجميع الأذواق",
    excerpt:
      "اختُتم موسم الرياض بأرقام قياسية في أعداد الزوار والإيرادات السياحية.",
    content: `<p>اختُتم <strong>موسم الرياض 2026</strong> برقم قياسي تجاوز 25 مليون زائر.</p>
<h2>أبرز الفعاليات</h2>
<ul><li>بوليفارد سيتي والوادي</li><li>حلبة الفورمولا 1</li><li>منطقة المربع التراثية</li><li>عروض الترفيه العائلي</li></ul>
<p>الإيرادات تجاوزت 8 مليارات ريال محققةً نمواً 30%.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[1],
    daysAgo: 2,
    metaDescription: "موسم الرياض 2026 يحقق 25 مليون زائر وإيرادات 8 مليارات ريال.",
    keywords: ["موسم الرياض", "ترفيه", "السعودية", "سياحة", "بوليفارد"],
  },
  {
    slug: "jeddah-season-2026-summer-launch",
    title: "إطلاق موسم جدة 2026 بهوية بصرية جديدة وأنشطة بحرية",
    subtitle: "المهرجان يستقطب الزوار بفعاليات شاطئية وثقافية متنوعة",
    excerpt:
      "انطلقت فعاليات موسم جدة 2026 بفعاليات بحرية مميزة على كورنيش جدة الجديد.",
    content: `<p>انطلقت فعاليات <strong>موسم جدة 2026</strong> بمزيج من الترفيه البحري والثقافي.</p>
<h2>المميزات</h2>
<ul><li>كرنفال بحري على كورنيش جدة</li><li>مهرجان الطعام البحري</li><li>عروض رياضات الإثارة المائية</li><li>الرحلات البحرية للجزر</li></ul>
<p>الموسم يستهدف 8 ملايين زائر حتى نهاية الصيف.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[2],
    daysAgo: 3,
    metaDescription: "موسم جدة 2026 ينطلق بفعاليات بحرية وثقافية متنوعة.",
    keywords: ["جدة", "موسم جدة", "كورنيش", "بحر أحمر", "سياحة"],
  },
  {
    slug: "asir-mountains-tourism-experience",
    title: "السودة وقمم عسير: وجهة سياحية صاعدة على خارطة العالم",
    subtitle: "قمة جبلية بارتفاع 3 آلاف متر تجذب عشاق المغامرات",
    excerpt:
      "تستقطب قمم عسير وعلى رأسها السودة أعداداً متزايدة من السياح بفضل مناخها وطبيعتها الخلابة.",
    content: `<p>تتربع <strong>السودة</strong> وقمم عسير على عرش السياحة الجبلية في المملكة.</p>
<h2>التجارب</h2>
<ul><li>التزحلق على الجبال</li><li>التلفريك بطول 5.4 كم</li><li>منتزه السحاب</li><li>قرى رجال ألمع التراثية</li></ul>
<p>هيئة تطوير عسير تستهدف جذب 10 ملايين سائح سنوياً.</p>`,
    newsType: "regular",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[3],
    daysAgo: 4,
    metaDescription: "السودة وقمم عسير وجهة سياحية صاعدة على خارطة العالم.",
    keywords: ["عسير", "السودة", "سياحة جبلية", "تلفريك", "رجال ألمع"],
  },
  {
    slug: "hail-heritage-tourism-jubbah-rocks",
    title: "جبة بحائل: متحف صخري عمره 10 آلاف سنة في قائمة اليونسكو",
    subtitle: "نقوش صخرية نادرة تحكي قصة حضارات الجزيرة العربية القديمة",
    excerpt:
      "موقع جبة بمنطقة حائل يستقطب الباحثين والسياح لاستكشاف نقوش صخرية تعود لآلاف السنين.",
    content: `<p>موقع <strong>جبة</strong> بحائل يعد واحداً من أهم المواقع الأثرية في المملكة.</p>
<h2>المعالم</h2>
<ul><li>نقوش صخرية تمثل بشراً وحيوانات</li><li>صور للأبقار والثيران المنقرضة</li><li>كتابات بالخط الثمودي</li></ul>
<p>الموقع مدرج في قائمة اليونسكو للتراث العالمي ويستقبل أكثر من 200 ألف زائر سنوياً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[4],
    daysAgo: 5,
    metaDescription: "جبة بحائل: متحف صخري عمره 10 آلاف سنة في قائمة اليونسكو.",
    keywords: ["حائل", "جبة", "تراث", "اليونسكو", "نقوش صخرية"],
  },
  {
    slug: "diriyah-historic-city-major-development",
    title: "الدرعية: تحولات كبرى لعاصمة الدولة السعودية الأولى",
    subtitle: "افتتاح أكثر من 30 معلماً سياحياً جديداً قبل نهاية العام",
    excerpt:
      "تشهد الدرعية تحولات كبرى مع افتتاح فنادق فاخرة ومتاحف ومرافق ترفيهية.",
    content: `<p>تشهد <strong>الدرعية</strong> تحولات كبرى استعداداً لافتتاحها رسمياً للسياح.</p>
<h2>المرافق الجديدة</h2>
<ul><li>متحف المملكة العربية السعودية</li><li>متحف الدرعية</li><li>20 فندقاً فاخراً</li><li>مطاعم على مستوى عالمي</li></ul>
<p>المشروع يستهدف 50 مليون زائر سنوياً بحلول 2030.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[5],
    daysAgo: 6,
    metaDescription: "الدرعية تشهد تحولات كبرى وافتتاح 30 معلماً سياحياً جديداً.",
    keywords: ["الدرعية", "تراث", "السعودية", "سياحة", "متاحف"],
  },
  {
    slug: "dammam-corniche-summer-events-launch",
    title: "كورنيش الدمام يطلق سلسلة فعاليات صيفية عائلية",
    subtitle: "ألعاب مائية ومهرجانات طعام وفنون شعبية",
    excerpt:
      "أطلق كورنيش الدمام برنامجاً صيفياً متكاملاً يستهدف العائلات بأنشطة متنوعة.",
    content: `<p>أطلق <strong>كورنيش الدمام</strong> سلسلة فعاليات صيفية متنوعة.</p>
<h2>الأنشطة</h2>
<ul><li>ألعاب مائية للعائلات</li><li>مهرجان الأكلات الشعبية</li><li>عروض فنون شعبية يومية</li><li>سباقات قوارب الكاياك</li></ul>
<p>الفعاليات مجانية وتمتد حتى نهاية أغسطس.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[6],
    daysAgo: 7,
    metaDescription: "كورنيش الدمام يطلق فعاليات صيفية عائلية متنوعة.",
    keywords: ["الدمام", "كورنيش", "سياحة", "صيف", "عائلات"],
  },
  {
    slug: "red-sea-project-tabuk-resorts-open",
    title: "افتتاح أول 5 منتجعات في مشروع البحر الأحمر بتبوك",
    subtitle: "منتجعات فاخرة من علامات تجارية عالمية على شواطئ بكر",
    excerpt:
      "افتتح مشروع البحر الأحمر أول 5 منتجعات على ساحل تبوك بتجارب سياحية فاخرة.",
    content: `<p>افتتح مشروع <strong>البحر الأحمر</strong> أول دفعة من المنتجعات الفاخرة.</p>
<h2>المنتجعات</h2>
<ul><li>سانت ريجيس البحر الأحمر</li><li>ستيلا ماريس</li><li>أمالا</li><li>فور سيزونز</li><li>ريتز كارلتون ريزرف</li></ul>
<p>المشروع ضمن أكبر مشاريع السياحة الفاخرة في العالم.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[7],
    daysAgo: 8,
    metaDescription: "افتتاح أول 5 منتجعات في مشروع البحر الأحمر بتبوك.",
    keywords: ["البحر الأحمر", "تبوك", "منتجعات", "سياحة فاخرة", "سعودية"],
  },
  {
    slug: "abha-summit-heli-skiing-launch",
    title: "السودة تطلق رياضة التزلج بالهليكوبتر للمرة الأولى في المنطقة",
    subtitle: "تجربة فريدة لعشاق المغامرات على المنحدرات الجبلية",
    excerpt:
      "أطلقت هيئة تطوير عسير تجربة التزلج بالهليكوبتر على قمم السودة.",
    content: `<p>أطلقت <strong>هيئة تطوير عسير</strong> رياضة التزلج بالهليكوبتر فوق قمم السودة.</p>
<h2>التفاصيل</h2>
<ul><li>طائرات هليكوبتر متخصصة</li><li>مرشدون عالميون مدربون</li><li>أسعار تبدأ من 5000 ريال للجلسة</li></ul>
<p>التجربة تستهدف عشاق المغامرات من السعودية وحول العالم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[8],
    daysAgo: 9,
    metaDescription: "السودة تطلق رياضة التزلج بالهليكوبتر للمرة الأولى في المنطقة.",
    keywords: ["السودة", "تزلج", "هليكوبتر", "مغامرات", "عسير"],
  },
  {
    slug: "farasan-islands-jazan-eco-tourism",
    title: "جزر فرسان بجازان: جنة بيئية ووجهة الغوص الجديدة",
    subtitle: "أكثر من 84 جزيرة بشواطئ بكر وحياة بحرية فريدة",
    excerpt:
      "تستقطب جزر فرسان بجازان السياح من حول العالم بفضل تنوعها البيئي وشواطئها الخلابة.",
    content: `<p>تتميز <strong>جزر فرسان</strong> بجازان كوجهة بيئية فريدة في البحر الأحمر.</p>
<h2>المعالم</h2>
<ul><li>محمية فرسان للحياة البرية</li><li>غزال الإدمي النادر</li><li>أكثر من 200 نوع من الأسماك</li><li>الشعاب المرجانية الملونة</li></ul>
<p>الجزر مدرجة ضمن مشاريع السياحة البيئية الكبرى.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[9],
    daysAgo: 10,
    metaDescription: "جزر فرسان بجازان: جنة بيئية ووجهة الغوص الجديدة.",
    keywords: ["جازان", "فرسان", "غوص", "بيئة", "بحر أحمر"],
  },
  {
    slug: "hegra-madain-saleh-night-tours",
    title: "جولات ليلية في مدائن صالح بالعلا تجذب الزوار",
    subtitle: "تجربة فريدة لاستكشاف أول موقع سعودي في قائمة اليونسكو ليلاً",
    excerpt:
      "أطلقت هيئة العلا جولات سياحية ليلية في موقع مدائن صالح الأثري.",
    content: `<p>أطلقت <strong>هيئة العلا</strong> جولات سياحية ليلية في مدائن صالح.</p>
<h2>التجربة</h2>
<ul><li>إضاءة فنية للقبور النبطية</li><li>مرشدون متخصصون</li><li>قصص تاريخية تفاعلية</li><li>عروض ضوئية تروي قصة الأنباط</li></ul>
<p>الجولات تستوعب 200 سائح كل ليلة وتمتد لـ 3 ساعات.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[10],
    daysAgo: 12,
    metaDescription: "جولات ليلية في مدائن صالح بالعلا تجذب الزوار من حول العالم.",
    keywords: ["العلا", "مدائن صالح", "اليونسكو", "أنباط", "جولات"],
  },
  {
    slug: "taif-rose-festival-tourism-package",
    title: "باقات سياحية لمهرجان الورد الطائفي تشمل الإقامة والتجارب",
    subtitle: "تجربة متكاملة من قطف الورد إلى زيارة معامل الدهن",
    excerpt:
      "أطلقت وزارة السياحة باقات سياحية متكاملة لزوار مهرجان الورد الطائفي.",
    content: `<p>أطلقت <strong>وزارة السياحة</strong> باقات سياحية لمهرجان الورد الطائفي.</p>
<h2>تشمل الباقة</h2>
<ul><li>إقامة في فنادق الطائف</li><li>زيارة مزارع الورد</li><li>جولة بمعامل الدهن</li><li>وجبات تقليدية</li></ul>
<p>أسعار الباقات تبدأ من 2500 ريال للفرد لـ 3 أيام.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[11],
    daysAgo: 13,
    metaDescription: "باقات سياحية لمهرجان الورد الطائفي تشمل الإقامة والتجارب.",
    keywords: ["الطائف", "ورد طائفي", "مهرجان", "سياحة", "وزارة السياحة"],
  },
  {
    slug: "umrah-package-improvements-2026",
    title: "تحسينات نوعية في خدمات العمرة لموسم 2026",
    subtitle: "تجربة رقمية متكاملة من التأشيرة وحتى المغادرة",
    excerpt:
      "أعلنت وزارة الحج والعمرة عن تحسينات نوعية في خدمات المعتمرين لموسم 2026.",
    content: `<p>أعلنت <strong>وزارة الحج والعمرة</strong> عن تحسينات شاملة لموسم 2026.</p>
<h2>التحسينات</h2>
<ul><li>تأشيرات إلكترونية في 24 ساعة</li><li>تطبيق نسك المطور</li><li>شركات نقل ذكية</li><li>إقامة مرنة في فنادق المنطقة المركزية</li></ul>
<p>الهدف استقبال 30 مليون معتمر بحلول 2030.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[12],
    daysAgo: 14,
    metaDescription: "تحسينات نوعية في خدمات العمرة لموسم 2026 وتجربة رقمية متكاملة.",
    keywords: ["العمرة", "وزارة الحج", "نسك", "معتمرين", "السعودية"],
  },
  {
    slug: "albaha-eco-tourism-mountains-trails",
    title: "الباحة: مسارات جبلية جديدة للهايكنغ وعشاق الطبيعة",
    subtitle: "أكثر من 30 مساراً معتمداً في غابات وجبال الباحة",
    excerpt:
      "افتتحت أمانة الباحة 30 مساراً جبلياً جديداً للسياحة البيئية والمشي الطويل.",
    content: `<p>افتتحت <strong>أمانة الباحة</strong> 30 مساراً جبلياً للسياحة البيئية.</p>
<h2>المسارات</h2>
<ul><li>مسارات قصيرة عائلية</li><li>مسارات متوسطة لعشاق الطبيعة</li><li>مسارات جبلية احترافية</li></ul>
<p>المسارات مزودة بلوحات إرشادية ومحطات استراحة وكاميرات للسلامة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[13],
    daysAgo: 16,
    metaDescription: "الباحة تفتتح 30 مساراً جبلياً للهايكنغ وعشاق الطبيعة.",
    keywords: ["الباحة", "هايكنغ", "سياحة بيئية", "غابات", "مشي طويل"],
  },
  {
    slug: "jubail-marine-tourism-yacht-marina",
    title: "الجبيل تفتتح أكبر مرسى لليخوت في الخليج العربي",
    subtitle: "المرسى يستوعب 500 يخت ويربط الجبيل بالوجهات الخليجية",
    excerpt:
      "افتتحت الهيئة الملكية بالجبيل أكبر مرسى لليخوت على ساحل الخليج العربي.",
    content: `<p>افتتحت <strong>الهيئة الملكية بالجبيل</strong> أكبر مرسى لليخوت في الخليج.</p>
<h2>المرافق</h2>
<ul><li>500 موقف لليخوت بأطوال مختلفة</li><li>محطات وقود وصيانة</li><li>نادي بحري</li><li>مطاعم ومتاجر</li></ul>
<p>المرسى يربط الجبيل برحلات يخوت إلى البحرين والكويت والإمارات.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TOURISM_IMAGES[14],
    daysAgo: 18,
    metaDescription: "الجبيل تفتتح أكبر مرسى لليخوت في الخليج العربي بسعة 500 يخت.",
    keywords: ["الجبيل", "يخوت", "مرسى", "الخليج العربي", "سياحة بحرية"],
  },
  {
    slug: "saudi-tourism-global-rank-improvement",
    title: "السعودية في المركز 11 عالمياً بمؤشر تنافسية السياحة",
    subtitle: "قفزة 30 مرتبة مقارنة بـ 5 سنوات مضت",
    excerpt:
      "أعلن المنتدى الاقتصادي العالمي عن تقدم السعودية 30 مرتبة في مؤشر تنافسية السياحة.",
    content: `<p>أعلن <strong>المنتدى الاقتصادي العالمي</strong> عن قفزة كبيرة للسياحة السعودية في تصنيفه.</p>
<h2>أبرز المؤشرات</h2>
<ul><li>الأمن والسلامة (المرتبة 5 عالمياً)</li><li>البنية التحتية للنقل</li><li>تطور قطاع الفنادق</li><li>الاستثمار الحكومي في القطاع</li></ul>
<p>الإيرادات السياحية تجاوزت 350 مليار ريال خلال 2025.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TOURISM_IMAGES[15],
    daysAgo: 21,
    metaDescription: "السعودية في المركز 11 عالمياً بمؤشر تنافسية السياحة وقفزة 30 مرتبة.",
    keywords: ["السعودية", "سياحة", "تنافسية", "المنتدى الاقتصادي", "تصنيف"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, TOURISM_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${TOURISM_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, TOURISM_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${TOURISM_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(TOURISM_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${TOURISM_CATEGORY.nameAr} (slug: ${TOURISM_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} tourism test articles...\n`);

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
      category: "Tourism",
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
        originalMessage: "Seeded by seedTourismNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new tourism articles.`);

  return {
    category: "Tourism",
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
