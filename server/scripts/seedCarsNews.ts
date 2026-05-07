/**
 * Seed 16 cars test articles under the «سيارات» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedCarsNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const CARS_CATEGORY = {
  nameAr: "سيارات",
  nameEn: "Cars",
  slug: "cars",
  description: "أخبار وتقارير السيارات",
  color: "#0EA5E9",
  icon: "🚗",
  displayOrder: 9,
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

const CARS_IMAGES = [
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1617886322168-72b886573c5f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1547744957-e9b9bb8f0a44?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1605515298946-d062b8a05ce4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1502877828070-33b167598133?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "lucid-air-saudi-production-launch",
    title: "لوسيد تبدأ إنتاج سيارات «إير» في مصنعها بالملك عبدالله الاقتصادية",
    subtitle: "أول سيارة كهربائية فاخرة مصنوعة في السعودية",
    excerpt:
      "احتفلت لوسيد بدخول خط الإنتاج الفعلي في مصنعها بمدينة الملك عبدالله الاقتصادية بالسعودية.",
    content: `<p>أعلنت <strong>لوسيد موتورز</strong> عن بدء الإنتاج الفعلي لسياراتها في مصنعها السعودي.</p>
<h2>تفاصيل المصنع</h2>
<ul><li>الطاقة الإنتاجية 155 ألف سيارة سنوياً</li><li>أكثر من 4500 وظيفة مباشرة</li><li>استثمارات تتجاوز 4 مليارات دولار</li></ul>
<p>الإنتاج يبدأ بسيارات Lucid Air مع خطط لإطلاق طرازات جديدة موجهة للأسواق الإقليمية.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: CARS_IMAGES[0],
    daysAgo: 1,
    metaDescription: "لوسيد تبدأ إنتاج سياراتها الكهربائية في مصنعها بالسعودية بطاقة 155 ألف سيارة.",
    keywords: ["لوسيد", "السعودية", "سيارات كهربائية", "Lucid Air", "تصنيع"],
  },
  {
    slug: "tesla-cybertruck-launch-saudi",
    title: "تيسلا تطرح سيارة «سايبر تراك» رسمياً في السعودية",
    subtitle: "السوق السعودي أول وجهة لـ Cybertruck في الشرق الأوسط",
    excerpt:
      "أعلنت تيسلا عن طرح سيارتها الجريئة Cybertruck رسمياً في السوق السعودي.",
    content: `<p>أعلنت <strong>تيسلا</strong> عن طرح Cybertruck رسمياً في السعودية كأول دولة بالشرق الأوسط.</p>
<h2>المواصفات</h2>
<ul><li>3 طرازات بمدى يصل لـ 850 كم</li><li>طاقة تصل لـ 845 حصاناً</li><li>تسارع 0-100 في 2.6 ثانية</li><li>قدرة سحب 5 أطنان</li></ul>
<p>الأسعار تبدأ من 280 ألف ريال للطراز الأساسي.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: CARS_IMAGES[1],
    daysAgo: 2,
    metaDescription: "تيسلا تطرح Cybertruck رسمياً في السوق السعودي بأسعار تبدأ من 280 ألف ريال.",
    keywords: ["تيسلا", "Cybertruck", "السعودية", "سيارات كهربائية", "Tesla"],
  },
  {
    slug: "toyota-camry-2026-saudi-arabia",
    title: "تويوتا كامري 2026 تصل للسعودية بتصميم جديد كلياً",
    subtitle: "هاجين متطور وتقنيات أمان متقدمة",
    excerpt:
      "أعلن وكلاء تويوتا في السعودية عن وصول سيارة كامري 2026 بتعديلات جوهرية.",
    content: `<p>أعلن وكلاء تويوتا عن وصول <strong>كامري 2026</strong> الجديدة كلياً للسوق السعودي.</p>
<h2>التحسينات</h2>
<ul><li>محرك هاجين 2.5 لتر بقوة 232 حصاناً</li><li>شاشة معلومات 12.3 بوصة</li><li>نظام Toyota Safety Sense 3.0</li><li>استهلاك وقود محسّن بنسبة 25%</li></ul>
<p>الأسعار تبدأ من 110 ألف ريال للفئة الأساسية.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: CARS_IMAGES[2],
    daysAgo: 3,
    metaDescription: "تويوتا كامري 2026 تصل للسعودية بمحرك هاجين 232 حصاناً.",
    keywords: ["تويوتا", "كامري", "هاجين", "السعودية", "سيارات"],
  },
  {
    slug: "hyundai-electric-cars-saudi-strategy",
    title: "هيونداي تعتزم إنتاج سيارات كهربائية في السعودية بحلول 2027",
    subtitle: "استثمار يتجاوز 500 مليون دولار في مصنع جديد",
    excerpt:
      "كشفت هيونداي عن خطط طموحة لتصنيع سياراتها الكهربائية في المملكة.",
    content: `<p>كشفت <strong>هيونداي</strong> عن خطط لإنتاج سيارات كهربائية في السعودية بحلول 2027.</p>
<h2>التفاصيل</h2>
<ul><li>استثمار 500 مليون دولار</li><li>مصنع في مدينة الملك عبدالله الاقتصادية</li><li>طاقة إنتاجية 50 ألف سيارة سنوياً</li></ul>
<p>المشروع جزء من استراتيجية المملكة لتوطين صناعة السيارات.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[3],
    daysAgo: 4,
    metaDescription: "هيونداي تستثمر 500 مليون دولار لإنتاج سيارات كهربائية بالسعودية بحلول 2027.",
    keywords: ["هيونداي", "كهربائية", "السعودية", "تصنيع", "Hyundai"],
  },
  {
    slug: "mercedes-eqs-2026-saudi-launch",
    title: "مرسيدس EQS الجديدة تصل بمدى 800 كم على شحنة واحدة",
    subtitle: "السيارة الفاخرة تنافس بتقنيات لا مثيل لها",
    excerpt:
      "وصلت سيارة مرسيدس EQS الكهربائية الجديدة كلياً للسوق السعودي بتقنيات متقدمة.",
    content: `<p>أعلنت مرسيدس بنز عن وصول <strong>EQS 2026</strong> بتطويرات شاملة.</p>
<h2>المواصفات</h2>
<ul><li>مدى يصل لـ 800 كم على الشحنة الواحدة</li><li>قوة 658 حصاناً للطراز الأعلى</li><li>شاشة Hyperscreen عرضها 142 سم</li><li>نظام MBUX المحدث</li></ul>
<p>الأسعار تبدأ من 480 ألف ريال.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: CARS_IMAGES[4],
    daysAgo: 5,
    metaDescription: "مرسيدس EQS 2026 تصل للسعودية بمدى 800 كم على شحنة واحدة.",
    keywords: ["مرسيدس", "EQS", "كهربائية", "فاخرة", "Mercedes"],
  },
  {
    slug: "bmw-i7-2026-luxury-electric",
    title: "BMW i7 2026: قمة الفخامة الكهربائية في السوق السعودي",
    subtitle: "ميزات ترفيهية لا مثيل لها بشاشة سينمائية للمقاعد الخلفية",
    excerpt:
      "كشفت BMW عن نسخة 2026 من سيارتها الفاخرة الكهربائية i7 في السعودية.",
    content: `<p>كشفت <strong>BMW</strong> عن نسخة 2026 من i7 الفاخرة بميزات حصرية.</p>
<h2>أبرز الميزات</h2>
<ul><li>شاشة 31 بوصة قابلة للنزول من السقف</li><li>مدى 615 كم</li><li>نظام صوتي Bowers & Wilkins بـ 36 سماعة</li><li>قيادة شبه ذاتية المستوى الثالث</li></ul>
<p>السعر يبدأ من 510 آلاف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[5],
    daysAgo: 6,
    metaDescription: "BMW i7 2026: قمة الفخامة الكهربائية في السوق السعودي.",
    keywords: ["BMW", "i7", "فاخرة", "كهربائية", "السعودية"],
  },
  {
    slug: "kia-ev9-saudi-arabia-launch",
    title: "كيا EV9 الكهربائية تنطلق في السعودية بفئة 7 مقاعد",
    subtitle: "أكبر SUV كهربائية كورية تستهدف العائلات",
    excerpt:
      "أعلنت كيا عن إطلاق سيارة EV9 الكهربائية الكاملة بفئة 7 مقاعد في السوق السعودي.",
    content: `<p>أعلنت <strong>كيا موتورز</strong> عن إطلاق EV9 الكهربائية في السعودية.</p>
<h2>المواصفات</h2>
<ul><li>7 مقاعد فاخرة</li><li>مدى 540 كم</li><li>قوة تصل لـ 379 حصاناً</li><li>شحن سريع من 10% لـ 80% في 24 دقيقة</li></ul>
<p>الأسعار تبدأ من 280 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[6],
    daysAgo: 7,
    metaDescription: "كيا EV9 الكهربائية تنطلق في السعودية بفئة 7 مقاعد ومدى 540 كم.",
    keywords: ["كيا", "EV9", "كهربائية", "SUV", "Kia"],
  },
  {
    slug: "ford-mustang-mach-e-2026-arrival",
    title: "فورد موستنج ماك-إي 2026 تصل بنسخة GT أسرع وأقوى",
    subtitle: "تسارع 0-100 في 3.5 ثانية ومدى 480 كم",
    excerpt:
      "أعلنت فورد عن وصول النسخة المحدثة من Mustang Mach-E 2026 للسوق السعودي.",
    content: `<p>أعلنت <strong>فورد</strong> عن وصول Mustang Mach-E 2026 بتحسينات كبيرة.</p>
<h2>التحسينات</h2>
<ul><li>قوة 487 حصاناً في فئة GT</li><li>تسارع 0-100 في 3.5 ثانية</li><li>مدى 480 كم</li><li>شاشة 15.5 بوصة</li></ul>
<p>الأسعار تبدأ من 250 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[7],
    daysAgo: 8,
    metaDescription: "فورد موستنج ماك-إي 2026 بنسخة GT بقوة 487 حصاناً وتسارع 3.5 ثانية.",
    keywords: ["فورد", "موستنج", "Mach-E", "كهربائية", "Ford"],
  },
  {
    slug: "chevrolet-corvette-e-ray-saudi",
    title: "شيفروليه كورفيت E-Ray هاجين تصل للسعودية للمرة الأولى",
    subtitle: "أول كورفيت بدفع رباعي ومحرك V8 وكهرباء",
    excerpt:
      "وصلت سيارة شيفروليه كورفيت E-Ray الهاجين للسوق السعودي بتجربة فريدة.",
    content: `<p>وصلت سيارة <strong>كورفيت E-Ray</strong> الهاجين للسوق السعودي.</p>
<h2>المواصفات</h2>
<ul><li>محرك V8 6.2 لتر مع محرك كهربائي</li><li>قوة إجمالية 655 حصاناً</li><li>دفع رباعي للمرة الأولى</li><li>تسارع 0-100 في 2.5 ثانية</li></ul>
<p>السعر يبدأ من 480 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[8],
    daysAgo: 9,
    metaDescription: "شيفروليه كورفيت E-Ray هاجين بقوة 655 حصاناً ودفع رباعي تصل للسعودية.",
    keywords: ["شيفروليه", "كورفيت", "E-Ray", "هاجين", "Corvette"],
  },
  {
    slug: "lexus-lx-2026-flagship-suv",
    title: "لكزس LX 2026: تطويرات في الفخامة وقوة المحرك",
    subtitle: "محرك V6 توين تيربو بقوة 415 حصاناً",
    excerpt:
      "كشفت لكزس عن نسخة 2026 من سيارتها الرائدة LX بتطويرات شاملة.",
    content: `<p>كشفت <strong>لكزس</strong> عن نسخة 2026 من سيارتها الرائدة LX.</p>
<h2>التحسينات</h2>
<ul><li>محرك V6 توين تيربو 3.5 لتر</li><li>قوة 415 حصاناً</li><li>تصميم خارجي محدّث</li><li>نظام معلوماتي 14 بوصة</li></ul>
<p>الأسعار تبدأ من 460 ألف ريال للفئة الأساسية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[9],
    daysAgo: 10,
    metaDescription: "لكزس LX 2026 بمحرك V6 توين تيربو وقوة 415 حصاناً.",
    keywords: ["لكزس", "LX", "SUV", "Lexus", "فاخرة"],
  },
  {
    slug: "land-rover-defender-octa-launch",
    title: "لاند روفر ديفندر OCTA الجديدة تصل بأقوى محرك في تاريخ الموديل",
    subtitle: "محرك V8 توين تيربو بقوة 626 حصاناً",
    excerpt:
      "أطلقت لاند روفر النسخة الأقوى من ديفندر تحت اسم OCTA.",
    content: `<p>أطلقت <strong>لاند روفر</strong> ديفندر OCTA كأقوى نسخة في تاريخ الموديل.</p>
<h2>المواصفات</h2>
<ul><li>محرك V8 توين تيربو 4.4 لتر</li><li>قوة 626 حصاناً</li><li>تسارع 0-100 في 4.0 ثانية</li><li>قدرة على الطرق الوعرة بمستويات استثنائية</li></ul>
<p>الأسعار تبدأ من 720 ألف ريال.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: CARS_IMAGES[10],
    daysAgo: 12,
    metaDescription: "لاند روفر ديفندر OCTA بمحرك V8 توين تيربو وقوة 626 حصاناً.",
    keywords: ["لاند روفر", "ديفندر", "OCTA", "Defender", "طرق وعرة"],
  },
  {
    slug: "honda-cr-v-hybrid-saudi-arabia-launch",
    title: "هوندا CR-V هاجين 2026 تصل بـ 200 حصان واستهلاك اقتصادي",
    subtitle: "السيارة العائلية المفضلة بنظام دفع كهربائي محسّن",
    excerpt:
      "أعلنت هوندا عن وصول CR-V هاجين 2026 للسوق السعودي بتطويرات تشمل المحرك والتقنيات.",
    content: `<p>أعلنت <strong>هوندا</strong> عن وصول CR-V هاجين 2026 بتحسينات شاملة.</p>
<h2>المواصفات</h2>
<ul><li>محرك هاجين 2.0 لتر</li><li>قوة إجمالية 204 حصان</li><li>استهلاك 5.4 لتر/100 كم</li><li>نظام Honda Sensing الأمني</li></ul>
<p>الأسعار تبدأ من 145 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[11],
    daysAgo: 13,
    metaDescription: "هوندا CR-V هاجين 2026 تصل للسعودية بـ 204 حصان واستهلاك اقتصادي.",
    keywords: ["هوندا", "CR-V", "هاجين", "Honda", "عائلية"],
  },
  {
    slug: "nissan-patrol-2026-saudi-launch",
    title: "نيسان باترول 2026: تصميم جريء ومحرك V6 توين تيربو",
    subtitle: "ملك الصحراء يعود بحلة جديدة كلياً",
    excerpt:
      "أعلنت نيسان عن إطلاق باترول 2026 الجديدة كلياً في السوق السعودي بتصميم جريء.",
    content: `<p>أعلنت <strong>نيسان</strong> عن إطلاق باترول 2026 الجديدة كلياً.</p>
<h2>التطويرات</h2>
<ul><li>محرك V6 توين تيربو 3.5 لتر</li><li>قوة 425 حصاناً</li><li>ناقل حركة 9 سرعات</li><li>تصميم داخلي محدث بالكامل</li></ul>
<p>الأسعار تبدأ من 235 ألف ريال للفئة الأساسية.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: CARS_IMAGES[12],
    daysAgo: 14,
    metaDescription: "نيسان باترول 2026 الجديدة كلياً بمحرك V6 توين تيربو وقوة 425 حصاناً.",
    keywords: ["نيسان", "باترول", "Patrol", "Nissan", "صحراء"],
  },
  {
    slug: "subaru-forester-2026-features",
    title: "سوبارو فورستر 2026: الأمان مستوى جديد كلياً",
    subtitle: "نظام EyeSight المطور وميزات قيادة شبه ذاتية",
    excerpt:
      "كشفت سوبارو عن نسخة 2026 من فورستر بنظام أمان متطور.",
    content: `<p>كشفت <strong>سوبارو</strong> عن فورستر 2026 بتطويرات في الأمان.</p>
<h2>التحسينات</h2>
<ul><li>نظام EyeSight بـ 5 كاميرات</li><li>قيادة شبه ذاتية</li><li>محرك بوكسر 2.5 لتر بقوة 182 حصاناً</li><li>دفع رباعي دائم</li></ul>
<p>الأسعار تبدأ من 125 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[13],
    daysAgo: 16,
    metaDescription: "سوبارو فورستر 2026 بنظام EyeSight المطور وميزات قيادة شبه ذاتية.",
    keywords: ["سوبارو", "فورستر", "Forester", "Subaru", "أمان"],
  },
  {
    slug: "porsche-taycan-saudi-fastest-charge",
    title: "بورش تايكان 2026: شحن أسرع 200% ومدى 580 كم",
    subtitle: "تكنولوجيا شحن جديدة تحدث قفزة في عالم السيارات الكهربائية",
    excerpt:
      "كشفت بورش عن نسخة 2026 من تايكان مع تحسينات جوهرية في تقنية الشحن.",
    content: `<p>كشفت <strong>بورش</strong> عن تايكان 2026 بتحسينات شاملة في الأداء والشحن.</p>
<h2>التحسينات</h2>
<ul><li>شحن من 10% لـ 80% في 18 دقيقة</li><li>مدى 580 كم</li><li>قوة 1019 حصاناً للطراز Turbo S</li><li>تسارع 0-100 في 2.4 ثانية</li></ul>
<p>الأسعار تبدأ من 450 ألف ريال.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: CARS_IMAGES[14],
    daysAgo: 18,
    metaDescription: "بورش تايكان 2026 بشحن أسرع 200% ومدى 580 كم.",
    keywords: ["بورش", "تايكان", "Taycan", "كهربائية", "Porsche"],
  },
  {
    slug: "audi-q8-e-tron-saudi-launch",
    title: "أودي Q8 e-tron الكهربائية تصل للسعودية بمدى 600 كم",
    subtitle: "SUV فاخرة تجمع بين الأناقة والأداء الكهربائي",
    excerpt:
      "وصلت سيارة أودي Q8 e-tron الكهربائية الفاخرة للسوق السعودي.",
    content: `<p>وصلت سيارة <strong>أودي Q8 e-tron</strong> الكهربائية للسعودية.</p>
<h2>المواصفات</h2>
<ul><li>مدى 600 كم على الشحنة</li><li>قوة 408 حصان للطراز quattro</li><li>شحن سريع 170 كيلوواط</li><li>تصميم داخلي بشاشتين رقميتين</li></ul>
<p>الأسعار تبدأ من 380 ألف ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: CARS_IMAGES[15],
    daysAgo: 21,
    metaDescription: "أودي Q8 e-tron الكهربائية تصل للسعودية بمدى 600 كم.",
    keywords: ["أودي", "Q8 e-tron", "كهربائية", "Audi", "فاخرة"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, CARS_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${CARS_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, CARS_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${CARS_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(CARS_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${CARS_CATEGORY.nameAr} (slug: ${CARS_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} cars test articles...\n`);

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
      category: "Cars",
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
        originalMessage: "Seeded by seedCarsNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new cars articles.`);

  return {
    category: "Cars",
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
