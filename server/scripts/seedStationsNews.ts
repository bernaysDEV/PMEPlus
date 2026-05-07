/**
 * Seed 16 special-report test articles under the «محطات» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedStationsNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const STATIONS_CATEGORY = {
  nameAr: "محطات",
  nameEn: "Stations",
  slug: "stations",
  description: "تقارير خاصة وملفات متنوعة",
  color: "#FBBF24",
  icon: "🛤️",
  displayOrder: 4,
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

const STATIONS_IMAGES = [
  "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1496449903678-68ddcb189a24?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542223189-67a03fa0f0bd?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551836022-aadb801c60ae?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542223616-9de9adb5e3e8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "report-saudi-economy-2030-roadmap",
    title: "تقرير: خارطة طريق الاقتصاد السعودي حتى 2030",
    subtitle: "تحليل شامل لمستهدفات رؤية المملكة وما تم إنجازه حتى الآن",
    excerpt:
      "تقرير معمّق يستعرض رحلة الاقتصاد السعودي نحو 2030 وما تحقق من إنجازات وما تبقى من تحديات.",
    content: `<p>تقرير معمّق يحلل <strong>خارطة طريق الاقتصاد السعودي</strong> حتى 2030.</p>
<h2>أبرز الإنجازات</h2>
<ul><li>نمو القطاع غير النفطي 5.7%</li><li>أكثر من 700 ألف وظيفة جديدة للمواطنين</li><li>زيادة مساهمة المرأة في سوق العمل لـ 35%</li><li>مشاريع كبرى بـ 1.3 تريليون ريال</li></ul>
<h2>التحديات</h2>
<p>تنويع الإيرادات بعيداً عن النفط يبقى التحدي الأبرز.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[0],
    daysAgo: 1,
    metaDescription: "تقرير خاص: خارطة طريق الاقتصاد السعودي حتى 2030 وأبرز الإنجازات.",
    keywords: ["رؤية 2030", "اقتصاد", "السعودية", "تنويع", "تقرير"],
  },
  {
    slug: "file-saudi-education-reform-decade",
    title: "ملف: عقد من إصلاحات التعليم في السعودية",
    subtitle: "كيف تحوّل النظام التعليمي خلال 10 سنوات؟",
    excerpt:
      "ملف خاص يستعرض أبرز الإصلاحات التعليمية في المملكة خلال العقد الماضي.",
    content: `<p>ملف خاص يستعرض <strong>عقداً من الإصلاحات</strong> في التعليم السعودي.</p>
<h2>المحاور الرئيسية</h2>
<ul><li>تحديث المناهج وفق رؤية 2030</li><li>تطوير قدرات المعلمين</li><li>إدخال البرمجة منذ الابتدائي</li><li>توسع التعليم الجامعي والابتعاث</li></ul>
<h2>المؤشرات</h2>
<p>ارتفعت نسب الالتحاق بالتعليم ما قبل الجامعي لـ 96% وتحسنت ترتيبات الجامعات السعودية عالمياً.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[1],
    daysAgo: 2,
    metaDescription: "ملف خاص: عقد من الإصلاحات التعليمية في السعودية وأثرها.",
    keywords: ["تعليم", "إصلاحات", "السعودية", "مناهج", "رؤية 2030"],
  },
  {
    slug: "report-energy-transition-renewable-shift",
    title: "تقرير: التحول الطاقوي وقفزة الطاقة المتجددة في المملكة",
    subtitle: "كيف تستعد السعودية لإنتاج 50% من كهربائها من المتجددة بحلول 2030؟",
    excerpt:
      "تقرير معمّق عن مسيرة التحول إلى الطاقة المتجددة وأبرز المشاريع الجارية والمستقبلية.",
    content: `<p>تقرير عن <strong>التحول الطاقوي</strong> في المملكة خلال السنوات المقبلة.</p>
<h2>المشاريع الكبرى</h2>
<ul><li>محطة سدير الشمسية بقدرة 1500 ميغاواط</li><li>دومة الجندل لطاقة الرياح</li><li>مشاريع نيوم للهيدروجين الأخضر</li></ul>
<h2>الهدف</h2>
<p>إنتاج 50% من الكهرباء عبر مصادر متجددة بحلول 2030 بقدرة 130 جيجاواط.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[2],
    daysAgo: 3,
    metaDescription: "تقرير: التحول الطاقوي في السعودية والوصول لـ 50% طاقة متجددة بحلول 2030.",
    keywords: ["طاقة متجددة", "السعودية", "هيدروجين أخضر", "نيوم", "تحول طاقوي"],
  },
  {
    slug: "file-saudi-women-leadership-decade",
    title: "ملف: عقد من تمكين المرأة السعودية",
    subtitle: "أرقام وإنجازات المرأة السعودية في الـ 10 سنوات الماضية",
    excerpt:
      "ملف خاص يستعرض رحلة تمكين المرأة السعودية وما تحقق من إنجازات نوعية.",
    content: `<p>ملف خاص يستعرض <strong>عقداً من تمكين المرأة السعودية</strong>.</p>
<h2>أبرز التحولات</h2>
<ul><li>قيادة السيارة منذ 2018</li><li>المشاركة في الانتخابات البلدية</li><li>تولي مناصب وزارية وسفارات</li><li>قفزة المشاركة في سوق العمل لـ 35%</li></ul>
<p>السعودية ضمن أسرع 10 دول في تمكين المرأة وفق تصنيفات البنك الدولي.</p>`,
    newsType: "regular",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[3],
    daysAgo: 4,
    metaDescription: "ملف عقد من تمكين المرأة السعودية وأبرز الإنجازات.",
    keywords: ["المرأة السعودية", "تمكين", "رؤية 2030", "قيادة", "وظائف"],
  },
  {
    slug: "report-saudi-tourism-2026-numbers",
    title: "تقرير: السياحة السعودية في أرقام 2026",
    subtitle: "توقعات استقبال 100 مليون سائح بحلول 2030",
    excerpt:
      "تقرير شامل عن قطاع السياحة السعودي وأبرز المؤشرات والتوقعات.",
    content: `<p>تقرير شامل عن <strong>قطاع السياحة السعودي</strong> ومؤشرات النمو.</p>
<h2>الأرقام</h2>
<ul><li>50 مليون سائح خلال 2025</li><li>30 ألف غرفة فندقية جديدة</li><li>إيرادات بلغت 100 مليار ريال</li></ul>
<h2>الوجهات الناشئة</h2>
<p>العلا، والبحر الأحمر، ونيوم، وموسم الرياض من أبرز الوجهات الجاذبة.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[4],
    daysAgo: 5,
    metaDescription: "تقرير: السياحة السعودية في أرقام 2026 و50 مليون سائح متوقع.",
    keywords: ["سياحة", "السعودية", "العلا", "نيوم", "أرقام"],
  },
  {
    slug: "file-judicial-reforms-saudi-arabia",
    title: "ملف: إصلاحات قضائية تعيد تشكيل العدالة في المملكة",
    subtitle: "تطورات تشريعية ورقمنة كاملة لمنظومة القضاء",
    excerpt:
      "ملف خاص يرصد أبرز الإصلاحات القضائية والتشريعية في المملكة.",
    content: `<p>ملف خاص حول <strong>الإصلاحات القضائية</strong> في المملكة.</p>
<h2>الإصلاحات</h2>
<ul><li>قانون الأحوال الشخصية</li><li>قانون الإثبات</li><li>قانون المعاملات المدنية</li><li>منصة ناجز للخدمات الإلكترونية</li></ul>
<p>الإصلاحات تختصر مدة التقاضي إلى 60 يوماً في المتوسط.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[5],
    daysAgo: 6,
    metaDescription: "ملف: إصلاحات قضائية تعيد تشكيل العدالة في المملكة وتختصر زمن التقاضي.",
    keywords: ["قضاء", "إصلاحات", "السعودية", "ناجز", "تشريعات"],
  },
  {
    slug: "report-saudi-healthcare-transformation",
    title: "تقرير: التحول الصحي في السعودية بعد 5 سنوات",
    subtitle: "كيف غيّرت التجمعات الصحية وجه الرعاية الصحية؟",
    excerpt:
      "تقرير شامل عن مسيرة التحول الصحي في المملكة وأبرز نتائج المبادرات الكبرى.",
    content: `<p>تقرير عن <strong>التحول الصحي السعودي</strong> منذ إطلاق برنامج التحول.</p>
<h2>المنجزات</h2>
<ul><li>21 تجمعاً صحياً تخدم جميع المناطق</li><li>تطبيق صحتي يخدم 30 مليون مستخدم</li><li>الرعاية الافتراضية في 200 مستشفى</li></ul>
<p>متوسط العمر ارتفع لـ 78 سنة وانخفض الانتظار بالطوارئ بنسبة 60%.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[6],
    daysAgo: 7,
    metaDescription: "تقرير: التحول الصحي السعودي بعد 5 سنوات وأبرز إنجازاته.",
    keywords: ["صحة", "تحول صحي", "تجمعات صحية", "صحتي", "السعودية"],
  },
  {
    slug: "file-saudi-youth-initiatives-impact",
    title: "ملف: مبادرات الشباب السعودي وقصص نجاح ملهمة",
    subtitle: "كيف أصبح الشباب محرّكاً للتحول الاقتصادي والاجتماعي؟",
    excerpt:
      "ملف يستعرض أبرز مبادرات الشباب السعودي وقصص النجاح في مختلف المجالات.",
    content: `<p>ملف خاص حول <strong>مبادرات الشباب السعودي</strong> وأثرها.</p>
<h2>قصص نجاح</h2>
<ul><li>رواد أعمال أسسوا شركات بمليارات الريالات</li><li>مبدعون في السينما والمحتوى الرقمي</li><li>أبطال رياضيون يمثلون المملكة عالمياً</li></ul>
<p>الشباب يشكلون 60% من المواطنين ويقودون التحول.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[7],
    daysAgo: 8,
    metaDescription: "ملف خاص: مبادرات الشباب السعودي وقصص النجاح الملهمة.",
    keywords: ["شباب", "السعودية", "ريادة أعمال", "مبادرات", "قصص نجاح"],
  },
  {
    slug: "report-environmental-greening-initiative",
    title: "تقرير: مبادرة السعودية الخضراء.. تشجير 10 مليارات شجرة",
    subtitle: "تفاصيل خطة وطنية طموحة لمكافحة التصحر والتغير المناخي",
    excerpt:
      "تقرير شامل عن مبادرة السعودية الخضراء وأبرز ما تم إنجازه على أرض الواقع.",
    content: `<p>تقرير شامل عن <strong>مبادرة السعودية الخضراء</strong> وما تحقق منها.</p>
<h2>الأرقام</h2>
<ul><li>زراعة 50 مليون شجرة حتى الآن</li><li>تأهيل 80 ألف هكتار من الأراضي المتدهورة</li><li>إنشاء 30 محمية طبيعية جديدة</li></ul>
<p>الهدف 10 مليارات شجرة بحلول 2030 ضمن خطة الشرق الأوسط الأخضر.</p>`,
    newsType: "regular",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[8],
    daysAgo: 9,
    metaDescription: "تقرير: السعودية الخضراء وتشجير 10 مليارات شجرة لمكافحة التصحر.",
    keywords: ["السعودية الخضراء", "تشجير", "بيئة", "تغير مناخي", "محميات"],
  },
  {
    slug: "file-digital-media-transformation-arab",
    title: "ملف: التحول الرقمي للإعلام العربي ومستقبل الصحافة",
    subtitle: "كيف تتأقلم المؤسسات الإعلامية مع الذكاء الاصطناعي؟",
    excerpt:
      "ملف خاص يحلل تحديات الإعلام العربي في عصر الذكاء الاصطناعي والتحول الرقمي.",
    content: `<p>ملف خاص حول <strong>التحول الرقمي للإعلام</strong> في العالم العربي.</p>
<h2>التحولات</h2>
<ul><li>الانتقال من الطباعة إلى الويب والتطبيقات</li><li>اعتماد الذكاء الاصطناعي للترجمة وتوليد المحتوى</li><li>صعود الإعلام البديل والمحتوى المرئي</li></ul>
<p>الإعلام العربي يحتاج لاستثمارات بـ 3 مليارات دولار للحاق بالركب الرقمي.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[9],
    daysAgo: 10,
    metaDescription: "ملف: التحول الرقمي للإعلام العربي ومستقبل الصحافة في عصر AI.",
    keywords: ["إعلام", "تحول رقمي", "ذكاء اصطناعي", "صحافة", "العالم العربي"],
  },
  {
    slug: "report-neom-mega-projects-progress",
    title: "تقرير: نيوم.. مدينة المستقبل بعد 5 سنوات من الإطلاق",
    subtitle: "ما تم إنجازه وما هي الخطط القادمة لأكبر مشروع تنموي في العالم",
    excerpt:
      "تقرير معمّق حول مشاريع نيوم الكبرى وما أُنجز منها على أرض الواقع.",
    content: `<p>تقرير معمّق عن <strong>مشاريع نيوم</strong> بعد 5 سنوات من إطلاقها.</p>
<h2>المشاريع</h2>
<ul><li>ذا لاين: 30% من المرحلة الأولى</li><li>أوكساجون: المدينة العائمة</li><li>تروجينا: الوجهة السياحية الجبلية</li><li>سندالة: الجزيرة السياحية</li></ul>
<p>الاستثمارات تجاوزت 500 مليار دولار حتى الآن.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[10],
    daysAgo: 12,
    metaDescription: "تقرير: نيوم بعد 5 سنوات من الإطلاق واستثمارات بـ 500 مليار دولار.",
    keywords: ["نيوم", "ذا لاين", "أوكساجون", "تروجينا", "السعودية"],
  },
  {
    slug: "file-saudi-food-security-strategy",
    title: "ملف: الأمن الغذائي السعودي.. استراتيجية متكاملة",
    subtitle: "كيف تستعد المملكة لتأمين احتياجاتها الغذائية في المستقبل؟",
    excerpt:
      "ملف خاص حول استراتيجية الأمن الغذائي السعودي وأبرز مبادراتها.",
    content: `<p>ملف خاص يستعرض <strong>استراتيجية الأمن الغذائي</strong> السعودية.</p>
<h2>المحاور</h2>
<ul><li>صندوق التنمية الزراعية بـ 25 مليار ريال</li><li>استثمارات زراعية خارجية</li><li>تطوير الزراعة المائية والعمودية</li><li>تخزين استراتيجي للقمح والأرز</li></ul>
<p>الهدف: الاكتفاء الذاتي في 70% من السلع الأساسية بحلول 2030.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[11],
    daysAgo: 13,
    metaDescription: "ملف: استراتيجية الأمن الغذائي السعودي والوصول لاكتفاء 70%.",
    keywords: ["أمن غذائي", "السعودية", "زراعة", "اكتفاء ذاتي", "استراتيجية"],
  },
  {
    slug: "report-saudi-football-development-2030",
    title: "تقرير: مستقبل كرة القدم السعودية.. الطريق إلى مونديال 2034",
    subtitle: "خطط احترافية لتطوير المنتخب والأندية والبنية التحتية",
    excerpt:
      "تقرير عن استراتيجية تطوير كرة القدم السعودية استعداداً لاستضافة كأس العالم 2034.",
    content: `<p>تقرير عن <strong>استراتيجية تطوير كرة القدم</strong> استعداداً لمونديال 2034.</p>
<h2>المحاور</h2>
<ul><li>11 ملعباً جديداً بمعايير الفيفا</li><li>أكاديميات للناشئين في 13 منطقة</li><li>استقطاب 50 لاعباً ومدرباً عالمياً</li></ul>
<p>المملكة الدولة العاشرة تستضيف بطولة كأس العالم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[12],
    daysAgo: 14,
    metaDescription: "تقرير: الطريق إلى مونديال 2034 وتطوير كرة القدم السعودية.",
    keywords: ["كرة قدم", "مونديال 2034", "السعودية", "أكاديميات", "ملاعب"],
  },
  {
    slug: "file-arabic-culture-creative-industries",
    title: "ملف: الصناعات الثقافية والإبداعية تُعيد تشكيل المشهد العربي",
    subtitle: "كيف أصبحت الثقافة قطاعاً اقتصادياً واعداً؟",
    excerpt:
      "ملف خاص يستعرض نمو الصناعات الثقافية في العالم العربي وآفاقها المستقبلية.",
    content: `<p>ملف خاص عن <strong>الصناعات الثقافية والإبداعية</strong> في العالم العربي.</p>
<h2>القطاعات الواعدة</h2>
<ul><li>السينما والإنتاج الدرامي</li><li>الموسيقى والفنون الأدائية</li><li>تصميم الأزياء والترفيه</li><li>الألعاب الإلكترونية</li></ul>
<p>القطاع يساهم بـ 3.5% من الناتج المحلي السعودي بقيمة 100 مليار ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[13],
    daysAgo: 16,
    metaDescription: "ملف: الصناعات الثقافية والإبداعية في العالم العربي.",
    keywords: ["ثقافة", "صناعات إبداعية", "سينما", "ترفيه", "اقتصاد"],
  },
  {
    slug: "report-saudi-mining-sector-revolution",
    title: "تقرير: قطاع التعدين السعودي.. الركيزة الثالثة للاقتصاد",
    subtitle: "احتياطيات بـ 9.4 تريليونات ريال تنتظر الاستثمار",
    excerpt:
      "تقرير عن قطاع التعدين السعودي وأبرز الفرص الاستثمارية في المعادن الثمينة والاستراتيجية.",
    content: `<p>تقرير عن <strong>قطاع التعدين</strong> الذي يصبح الركيزة الثالثة للاقتصاد.</p>
<h2>الاحتياطيات</h2>
<ul><li>9.4 تريليونات ريال من المعادن</li><li>الذهب، النحاس، الفوسفات، الزنك</li><li>معادن نادرة لتقنيات المستقبل</li></ul>
<p>المؤتمر الدولي للتعدين في الرياض يستقطب استثمارات بـ 100 مليار دولار.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: STATIONS_IMAGES[14],
    daysAgo: 18,
    metaDescription: "تقرير: قطاع التعدين السعودي بـ 9.4 تريليونات ريال احتياطيات.",
    keywords: ["تعدين", "السعودية", "معادن", "ذهب", "اقتصاد"],
  },
  {
    slug: "file-ai-national-strategy-saudi",
    title: "ملف: الاستراتيجية الوطنية للذكاء الاصطناعي.. السعودية في المقدمة",
    subtitle: "كيف تستعد المملكة لقيادة المنطقة في الذكاء الاصطناعي؟",
    excerpt:
      "ملف خاص يستعرض الاستراتيجية الوطنية للذكاء الاصطناعي وأبرز مبادراتها.",
    content: `<p>ملف خاص حول <strong>الاستراتيجية الوطنية للذكاء الاصطناعي</strong>.</p>
<h2>الأهداف</h2>
<ul><li>20 مليار دولار استثمارات بحلول 2030</li><li>تأهيل 20 ألف متخصص</li><li>المرتبة الأولى عربياً والـ 15 عالمياً</li><li>إطلاق نموذج لغوي عربي ضخم</li></ul>
<p>هيئة سدايا تقود التحول مع شراكات عالمية مع Nvidia وOpenAI.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: STATIONS_IMAGES[15],
    daysAgo: 21,
    metaDescription: "ملف: الاستراتيجية الوطنية للذكاء الاصطناعي في السعودية.",
    keywords: ["ذكاء اصطناعي", "سدايا", "استراتيجية", "السعودية", "تقنية"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, STATIONS_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${STATIONS_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, STATIONS_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${STATIONS_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(STATIONS_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${STATIONS_CATEGORY.nameAr} (slug: ${STATIONS_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} stations (special reports) test articles...\n`);

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
      category: "Stations",
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
        originalMessage: "Seeded by seedStationsNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new stations articles.`);

  return {
    category: "Stations",
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
