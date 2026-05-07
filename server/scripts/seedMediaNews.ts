/**
 * Seed 16 media test articles under the «ميديا» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedMediaNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const MEDIA_CATEGORY = {
  nameAr: "ميديا",
  nameEn: "Media",
  slug: "media",
  description: "فيديوهات وصور وإعلام رقمي",
  color: "#EAB308",
  icon: "🎬",
  displayOrder: 10,
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

const MEDIA_IMAGES = [
  "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574267432644-f410f8ec2d36?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1576280314550-cc4d09a7fe70?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162619095-3b34d3acba1d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1610028290816-5d937a395a49?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "netflix-arabic-content-investment-2026",
    title: "نتفليكس تستثمر مليار دولار في المحتوى العربي خلال 2026",
    subtitle: "إنتاج 50 عملاً درامياً وسينمائياً جديداً من المنطقة",
    excerpt:
      "أعلنت نتفليكس عن أكبر استثمار لها في المحتوى العربي بقيمة مليار دولار للعام 2026.",
    content: `<p>أعلنت <strong>نتفليكس</strong> عن استثمار قياسي في المحتوى العربي بقيمة مليار دولار.</p>
<h2>الإنتاجات</h2>
<ul><li>20 مسلسلاً درامياً جديداً</li><li>15 فيلماً سينمائياً</li><li>10 برامج ترفيهية</li><li>5 وثائقيات</li></ul>
<p>الاستثمار يستهدف رفع حصة المحتوى العربي على المنصة لـ 25% من إجمالي المحتوى.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[0],
    daysAgo: 1,
    metaDescription: "نتفليكس تستثمر مليار دولار في المحتوى العربي خلال 2026 وإنتاج 50 عملاً.",
    keywords: ["نتفليكس", "Netflix", "محتوى عربي", "إنتاج", "دراما"],
  },
  {
    slug: "shahid-mbc-record-subscriptions-2026",
    title: "منصة شاهد تحقق رقماً قياسياً بـ 25 مليون مشترك",
    subtitle: "نمو ضخم بفضل المحتوى الحصري والإنتاجات الكبرى",
    excerpt:
      "أعلنت منصة شاهد التابعة لمجموعة MBC عن تجاوز عدد مشتركيها 25 مليون مشترك.",
    content: `<p>أعلنت <strong>منصة شاهد</strong> التابعة لـ MBC عن تجاوز 25 مليون مشترك.</p>
<h2>عوامل النجاح</h2>
<ul><li>الحصرية على مسلسلات رمضان</li><li>إعادة إنتاج كلاسيكيات الدراما</li><li>محتوى مخصص للأطفال</li><li>تجربة مستخدم محسّنة</li></ul>
<p>المنصة تستهدف 40 مليون مشترك بحلول 2027.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[1],
    daysAgo: 2,
    metaDescription: "منصة شاهد تحقق 25 مليون مشترك عبر محتوى حصري وإنتاجات كبرى.",
    keywords: ["شاهد", "MBC", "بث رقمي", "مشتركين", "دراما"],
  },
  {
    slug: "amazon-prime-video-arabic-original",
    title: "أمازون برايم فيديو تطلق أول إنتاج درامي سعودي حصري",
    subtitle: "مسلسل من 12 حلقة بميزانية 30 مليون دولار",
    excerpt:
      "كشفت أمازون عن إطلاق أول إنتاج درامي سعودي حصري على منصتها برايم فيديو.",
    content: `<p>كشفت <strong>أمازون برايم فيديو</strong> عن أول إنتاج درامي سعودي حصري.</p>
<h2>تفاصيل المسلسل</h2>
<ul><li>12 حلقة من ساعة كاملة</li><li>ميزانية 30 مليون دولار</li><li>تصوير في الرياض والعلا</li><li>طاقم تمثيل من 10 دول عربية</li></ul>
<p>العرض الأول مقرر في الربع الثالث من 2026.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[2],
    daysAgo: 3,
    metaDescription: "أمازون برايم فيديو تطلق أول إنتاج درامي سعودي حصري بـ 30 مليون دولار.",
    keywords: ["أمازون", "برايم فيديو", "Amazon", "دراما", "سعودي"],
  },
  {
    slug: "spotify-arabic-podcast-2026-growth",
    title: "سبوتيفاي: نمو البودكاست العربي بنسبة 200% خلال 2026",
    subtitle: "السعودية تتصدر دول المنطقة في الاستماع للبودكاست",
    excerpt:
      "كشفت سبوتيفاي عن نمو ضخم في الاستماع للبودكاست العربي خلال العام الماضي.",
    content: `<p>كشفت <strong>سبوتيفاي</strong> عن نمو كبير في البودكاست العربي بنسبة 200%.</p>
<h2>الأرقام</h2>
<ul><li>السعودية الأولى عربياً بالاستماع</li><li>15 مليون مستمع شهرياً</li><li>أكثر من 100 ألف بودكاست عربي</li></ul>
<p>أبرز التصنيفات: الأعمال، التطوير الذاتي، السياسة، الكوميديا.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[3],
    daysAgo: 4,
    metaDescription: "نمو البودكاست العربي 200% خلال 2026 والسعودية تتصدر.",
    keywords: ["سبوتيفاي", "Spotify", "بودكاست", "عربي", "السعودية"],
  },
  {
    slug: "rotana-platform-relaunch-strategy",
    title: "روتانا تعيد إطلاق منصتها الرقمية بحلة جديدة كلياً",
    subtitle: "تجربة محدّثة ومحتوى من أرشيف 40 عاماً",
    excerpt:
      "أعلنت مجموعة روتانا عن إطلاق منصتها الرقمية بنسخة محدثة كلياً.",
    content: `<p>أعلنت مجموعة <strong>روتانا</strong> عن إعادة إطلاق منصتها الرقمية.</p>
<h2>المميزات</h2>
<ul><li>أرشيف موسيقي ضخم لـ 40 عاماً</li><li>قنوات حية بجودة 4K</li><li>محتوى حصري لمشاهير الفن</li><li>نظام اشتراك مرن</li></ul>
<p>المنصة تستهدف منافسة المنصات العالمية في المحتوى الموسيقي العربي.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[4],
    daysAgo: 5,
    metaDescription: "روتانا تعيد إطلاق منصتها الرقمية بأرشيف ضخم وتجربة محدثة.",
    keywords: ["روتانا", "Rotana", "موسيقى", "بث", "أرشيف"],
  },
  {
    slug: "stc-tv-saudi-pro-league-rights",
    title: "STC TV تستحوذ على حقوق بث دوري روشن السعودي حصرياً",
    subtitle: "الصفقة الأكبر في تاريخ البث الرياضي الإقليمي بـ 2.5 مليار ريال",
    excerpt:
      "حصلت منصة STC TV على حقوق البث الحصري لدوري روشن السعودي للسنوات الأربع المقبلة.",
    content: `<p>حصلت <strong>STC TV</strong> على حقوق البث الحصري لدوري روشن السعودي.</p>
<h2>تفاصيل الصفقة</h2>
<ul><li>قيمة 2.5 مليار ريال على 4 سنوات</li><li>بث جميع المباريات</li><li>محتوى حصري وراء الكواليس</li><li>برامج تحليلية متخصصة</li></ul>
<p>الصفقة الأكبر في تاريخ البث الرياضي بالشرق الأوسط.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[5],
    daysAgo: 6,
    metaDescription: "STC TV تستحوذ على حقوق بث دوري روشن السعودي بـ 2.5 مليار ريال.",
    keywords: ["STC TV", "دوري روشن", "بث رياضي", "السعودية", "كرة قدم"],
  },
  {
    slug: "tiktok-saudi-creators-economy-2026",
    title: "تيك توك: 50 ألف صانع محتوى سعودي يحققون دخلاً من المنصة",
    subtitle: "السعودية الأولى عربياً في اقتصاد المؤثرين الرقميين",
    excerpt:
      "كشفت تيك توك عن أرقام جديدة لصانعي المحتوى السعوديين الذين يحققون دخلاً من المنصة.",
    content: `<p>كشفت <strong>تيك توك</strong> عن نمو اقتصاد صانعي المحتوى في السعودية.</p>
<h2>الأرقام</h2>
<ul><li>50 ألف صانع محتوى يحققون دخلاً</li><li>متوسط دخل شهري 12 ألف ريال</li><li>نمو 80% في عدد المستخدمين النشطين</li></ul>
<p>منصة TikTok Shop تساهم بـ 60% من دخل صانعي المحتوى عبر المنتجات والإعلانات.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[6],
    daysAgo: 7,
    metaDescription: "50 ألف صانع محتوى سعودي يحققون دخلاً من تيك توك.",
    keywords: ["تيك توك", "TikTok", "صانع محتوى", "السعودية", "اقتصاد رقمي"],
  },
  {
    slug: "youtube-arabic-channels-1m-subs",
    title: "230 قناة عربية على يوتيوب تتجاوز المليون مشترك",
    subtitle: "ارتفاع كبير في صناعة المحتوى العربي على المنصة",
    excerpt:
      "كشفت يوتيوب عن أرقام جديدة لصانعي المحتوى العربي وقفزة كبيرة في عدد القنوات الكبرى.",
    content: `<p>كشفت <strong>يوتيوب</strong> عن نمو القنوات العربية الكبرى.</p>
<h2>الأرقام</h2>
<ul><li>230 قناة تجاوزت المليون مشترك</li><li>15 قناة تجاوزت 10 ملايين مشترك</li><li>المحتوى الكوميدي والتعليمي الأكثر شعبية</li></ul>
<p>السعودية ومصر تتصدران المنطقة في عدد القنوات الناجحة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[7],
    daysAgo: 8,
    metaDescription: "230 قناة عربية على يوتيوب تتجاوز المليون مشترك.",
    keywords: ["يوتيوب", "YouTube", "قنوات عربية", "محتوى رقمي", "صانعي محتوى"],
  },
  {
    slug: "snapchat-arabic-features-launch",
    title: "سناب شات تطلق ميزات عربية جديدة لمستخدمي السعودية",
    subtitle: "فلاتر بالعربية وتجارب مخصصة للمناطق المحلية",
    excerpt:
      "أعلنت سناب شات عن إطلاق سلسلة ميزات جديدة موجهة للمستخدمين العرب.",
    content: `<p>أعلنت <strong>سناب شات</strong> عن ميزات عربية جديدة لتعزيز التجربة المحلية.</p>
<h2>المميزات</h2>
<ul><li>فلاتر بأسماء مدن سعودية</li><li>عدسات AR لمعالم المملكة</li><li>محتوى Discover حصري</li><li>شراكات مع منشئي محتوى محليين</li></ul>
<p>السعودية تضم 22 مليون مستخدم نشط شهرياً على المنصة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[8],
    daysAgo: 9,
    metaDescription: "سناب شات تطلق ميزات عربية جديدة لمستخدمي السعودية.",
    keywords: ["سناب شات", "Snapchat", "AR", "عدسات", "السعودية"],
  },
  {
    slug: "meta-instagram-saudi-creators-fund",
    title: "ميتا تطلق صندوق دعم لصانعي المحتوى السعوديين بـ 100 مليون دولار",
    subtitle: "دعم لإنتاج محتوى احترافي على إنستجرام وفيسبوك",
    excerpt:
      "أعلنت ميتا عن إطلاق صندوق ضخم لدعم صانعي المحتوى في السعودية.",
    content: `<p>أعلنت <strong>ميتا</strong> عن صندوق دعم لصانعي المحتوى السعوديين بـ 100 مليون دولار.</p>
<h2>التفاصيل</h2>
<ul><li>دعم لـ 5000 صانع محتوى</li><li>دورات تدريبية متخصصة</li><li>أدوات تحليل متقدمة</li><li>أولوية للمحتوى التعليمي والاقتصادي</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[9],
    daysAgo: 10,
    metaDescription: "ميتا تطلق صندوقاً بـ 100 مليون دولار لدعم صانعي المحتوى السعوديين.",
    keywords: ["ميتا", "Meta", "إنستجرام", "صانعي محتوى", "السعودية"],
  },
  {
    slug: "apple-tv-plus-arabic-original-launch",
    title: "أبل تي في بلس تطلق أول مسلسل ناطق بالعربية",
    subtitle: "إنتاج كبير بميزانية 50 مليون دولار من 10 حلقات",
    excerpt:
      "أعلنت أبل عن إطلاق أول مسلسل ناطق بالعربية على منصتها أبل تي في بلس.",
    content: `<p>أعلنت <strong>أبل تي في بلس</strong> عن أول مسلسل ناطق بالعربية حصرياً.</p>
<h2>التفاصيل</h2>
<ul><li>10 حلقات من 60 دقيقة</li><li>ميزانية 50 مليون دولار</li><li>مخرج عالمي وكاتب سعودي</li><li>تصوير في 5 دول عربية</li></ul>
<p>المسلسل دراما تاريخية تتناول حقبة مهمة من التاريخ العربي.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[10],
    daysAgo: 12,
    metaDescription: "أبل تي في بلس تطلق أول مسلسل ناطق بالعربية بميزانية 50 مليون دولار.",
    keywords: ["أبل", "Apple TV+", "مسلسل عربي", "إنتاج", "دراما"],
  },
  {
    slug: "saudi-film-festival-record-attendance",
    title: "مهرجان البحر الأحمر السينمائي يستقطب 200 ألف زائر بنسخته الجديدة",
    subtitle: "عرض 150 فيلماً من 80 دولة وحضور أكثر من 600 نجم عالمي",
    excerpt:
      "اختُتم مهرجان البحر الأحمر السينمائي بأرقام قياسية في الحضور والعروض السينمائية.",
    content: `<p>اختُتم <strong>مهرجان البحر الأحمر السينمائي</strong> في جدة بأرقام قياسية.</p>
<h2>الأرقام</h2>
<ul><li>200 ألف زائر</li><li>150 فيلماً من 80 دولة</li><li>600 نجم وضيف عالمي</li><li>إعلان عن 50 مشروعاً سينمائياً جديداً</li></ul>
<p>المهرجان يعزز مكانة جدة كعاصمة للسينما العربية.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[11],
    daysAgo: 13,
    metaDescription: "مهرجان البحر الأحمر السينمائي يستقطب 200 ألف زائر و150 فيلماً.",
    keywords: ["مهرجان البحر الأحمر", "سينما", "جدة", "أفلام", "السعودية"],
  },
  {
    slug: "saudi-films-international-recognition",
    title: "أفلام سعودية تحصد جوائز في 5 مهرجانات دولية خلال 2026",
    subtitle: "إنتاج محلي يحقق حضوراً عالمياً غير مسبوق",
    excerpt:
      "حصدت أفلام سعودية جوائز في خمسة مهرجانات دولية كبرى خلال النصف الأول من 2026.",
    content: `<p>حصدت <strong>الأفلام السعودية</strong> جوائز دولية مرموقة خلال 2026.</p>
<h2>المهرجانات</h2>
<ul><li>مهرجان كان السينمائي - جائزة لأفضل فيلم وثائقي</li><li>مهرجان البندقية - جائزة الأسد الذهبي للقصير</li><li>مهرجان برلين - جائزة الدب الفضي</li><li>مهرجان تورنتو - جائزة الجمهور</li><li>مهرجان دبي - جائزة العمل الأول</li></ul>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[12],
    daysAgo: 14,
    metaDescription: "أفلام سعودية تحصد جوائز في 5 مهرجانات دولية كبرى خلال 2026.",
    keywords: ["أفلام سعودية", "كان", "البندقية", "برلين", "جوائز"],
  },
  {
    slug: "podcast-arabic-content-monetization",
    title: "تحقيق: كيف يحقق صانعو البودكاست العربي ملايين الريالات؟",
    subtitle: "نموذج اقتصادي ناجح يجذب آلاف صانعي المحتوى للمجال",
    excerpt:
      "تحقيق معمّق يكشف كيف أصبح البودكاست العربي صناعة بمليارات الريالات.",
    content: `<p>تحقيق معمّق يكشف اقتصاد <strong>البودكاست العربي</strong> الناشئ.</p>
<h2>مصادر الدخل</h2>
<ul><li>الإعلانات والرعايات (60%)</li><li>الاشتراكات المدفوعة (20%)</li><li>المحتوى الحصري (10%)</li><li>الفعاليات الحضورية (10%)</li></ul>
<p>أكبر البودكاست العربية يحقق إيرادات تتجاوز 5 ملايين ريال سنوياً.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[13],
    daysAgo: 16,
    metaDescription: "تحقيق: كيف يحقق صانعو البودكاست العربي ملايين الريالات؟",
    keywords: ["بودكاست", "تحقيق", "اقتصاد رقمي", "صانعي محتوى", "إعلانات"],
  },
  {
    slug: "saudi-radio-stations-digital-transformation",
    title: "إذاعات السعودية تتجه للتحول الرقمي وإطلاق منصات بث",
    subtitle: "10 محطات إذاعية تطلق تطبيقاتها الخاصة للوصول للجمهور الشاب",
    excerpt:
      "تتجه أبرز الإذاعات السعودية للتحول الرقمي وإطلاق تطبيقات وبودكاستات حصرية.",
    content: `<p>تشهد <strong>الإذاعات السعودية</strong> تحولاً رقمياً واسعاً.</p>
<h2>المحاور</h2>
<ul><li>10 محطات أطلقت تطبيقات خاصة</li><li>محتوى صوتي حصري على الطلب</li><li>برامج تفاعلية مع المستمعين</li><li>تكامل مع منصات البث الكبرى</li></ul>
<p>التحول يستهدف الوصول لـ 10 ملايين مستخدم رقمي.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: MEDIA_IMAGES[14],
    daysAgo: 18,
    metaDescription: "إذاعات السعودية تتجه للتحول الرقمي وإطلاق منصات بث وتطبيقات.",
    keywords: ["إذاعة", "تحول رقمي", "تطبيقات", "السعودية", "بث"],
  },
  {
    slug: "ai-content-creation-arabic-market",
    title: "الذكاء الاصطناعي يُحدث ثورة في صناعة المحتوى العربي",
    subtitle: "أدوات جديدة تُمكّن المبدعين من إنتاج محتوى احترافي بسرعة قياسية",
    excerpt:
      "تشهد صناعة المحتوى العربي ثورة بفضل أدوات الذكاء الاصطناعي الجديدة المتخصصة.",
    content: `<p>الذكاء الاصطناعي يُحدث ثورة في <strong>صناعة المحتوى العربي</strong>.</p>
<h2>الأدوات الأبرز</h2>
<ul><li>توليد الصوت بالعربية بصوت مشاهير</li><li>إنتاج فيديوهات قصيرة بالذكاء الاصطناعي</li><li>تحرير المحتوى تلقائياً</li><li>ترجمة الفيديوهات بدقة عالية</li></ul>
<p>السوق متوقع أن يصل لـ 5 مليارات دولار بحلول 2028.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: MEDIA_IMAGES[15],
    daysAgo: 21,
    metaDescription: "الذكاء الاصطناعي يحدث ثورة في صناعة المحتوى العربي ويصل السوق لـ 5 مليارات دولار.",
    keywords: ["ذكاء اصطناعي", "محتوى عربي", "AI", "إعلام", "مبدعين"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, MEDIA_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${MEDIA_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, MEDIA_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${MEDIA_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(MEDIA_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${MEDIA_CATEGORY.nameAr} (slug: ${MEDIA_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} media test articles...\n`);

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
      category: "Media",
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
        originalMessage: "Seeded by seedMediaNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new media articles.`);

  return {
    category: "Media",
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
