/**
 * Seed 16 technology test articles under the «تقنية» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedTechNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const TECH_CATEGORY = {
  nameAr: "تقنية",
  nameEn: "Technology",
  slug: "technology",
  description: "أخبار وتطورات التقنية والذكاء الاصطناعي",
  color: "#8B5CF6",
  icon: "💻",
  displayOrder: 8,
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

const TECH_IMAGES = [
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1535303311164-664fc9ec6532?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551808525-51a94da548ce?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "openai-gpt-6-launch-2026",
    title: "OpenAI تُطلق الجيل السادس من نماذج GPT بقدرات استدلال مُتقدّمة",
    subtitle: "النموذج الجديد يدّعي تفوقاً ملحوظاً في الرياضيات والبرمجة والتفكير المنطقي",
    excerpt:
      "أعلنت OpenAI عن إطلاق GPT-6 بقفزة كبيرة في أداء الاستدلال متعدد الخطوات وإمكانيات وكلاء البرمجة الذاتيين.",
    content: `<p>أعلنت شركة OpenAI رسمياً عن إطلاق الجيل السادس من نماذجها اللغوية الكبرى تحت اسم <strong>GPT-6</strong>، مدّعيةً قفزة نوعية في قدرات الاستدلال متعدد الخطوات.</p>
<h2>الميزات الأبرز</h2>
<ul>
<li>سياق مدخل يصل إلى 2 مليون رمز</li>
<li>دعم محسّن لـ 100 لغة بما فيها العربية بلهجاتها المختلفة</li>
<li>وضع وكيل ذاتي قادر على تنفيذ مهام برمجية كاملة دون تدخل بشري</li>
<li>تكلفة استدلال أقل بنسبة 40% مقارنة بـ GPT-5</li>
</ul>
<h2>الأداء في معايير الصناعة</h2>
<p>سجل النموذج درجات قياسية في معايير MMLU وHumanEval وSWE-Bench، متجاوزاً جميع النماذج المنافسة بفارق واضح، خصوصاً في مهام البرمجة الطويلة.</p>
<h2>متى يصبح متاحاً؟</h2>
<p>سيُتاح النموذج لمشتركي ChatGPT Plus وTeam ابتداءً من الأسبوع القادم، فيما تحصل واجهات API على الإصدار خلال شهر.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: TECH_IMAGES[0],
    daysAgo: 1,
    metaDescription:
      "OpenAI تُطلق GPT-6 بقدرات استدلال متقدمة وسياق يصل إلى 2 مليون رمز.",
    keywords: ["OpenAI", "GPT-6", "ذكاء اصطناعي", "نماذج لغوية", "ChatGPT"],
  },
  {
    slug: "apple-vision-pro-2-launch",
    title: "آبل تكشف عن Vision Pro 2 بسعر أقل ووزن أخف بنسبة 30%",
    subtitle: "النظارة الجديدة تأتي بمعالج M5 وبطارية تدوم 4 ساعات",
    excerpt:
      "كشفت شركة آبل عن الجيل الثاني من نظارة الواقع المختلط Vision Pro بتصميم أنحف وسعر يبدأ من 2499 دولاراً.",
    content: `<p>أزاحت آبل الستار عن نظارة <strong>Vision Pro 2</strong>، الجيل الثاني من نظارتها للواقع المختلط، بعد عامين من إطلاق الجيل الأول الذي تلقى انتقادات بسبب الوزن والسعر المرتفع.</p>
<h2>تحسينات جوهرية</h2>
<p>خفّضت آبل وزن الجهاز بنسبة 30% ليصل إلى 450 جراماً، كما زادت عمر البطارية إلى 4 ساعات، ودمجت معالج M5 الجديد الذي يقدم أداء أعلى بنسبة 50%.</p>
<h2>السعر والإتاحة</h2>
<p>سعر النموذج الجديد يبدأ من <strong>2499 دولاراً</strong>، أي أقل بنحو 1000 دولار عن الجيل الأول، وسيكون متاحاً في الأسواق العالمية بداية يونيو القادم بما فيها الإمارات والسعودية.</p>
<h2>تطبيقات جديدة</h2>
<p>أعلنت آبل عن أكثر من 5000 تطبيق جديد مُحسّن للجهاز، بما في ذلك تطبيقات ترفيهية وتعليمية وطبية.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TECH_IMAGES[6],
    daysAgo: 2,
    metaDescription:
      "آبل تُطلق Vision Pro 2 بوزن أخف وسعر أقل ومعالج M5 الجديد.",
    keywords: ["آبل", "Vision Pro", "واقع مختلط", "نظارات ذكية", "Apple"],
  },
  {
    slug: "meta-ai-glasses-mass-production",
    title: "ميتا تبدأ الإنتاج الضخم لنظاراتها الذكية بالشراكة مع EssilorLuxottica",
    subtitle: "الهدف: بيع 10 ملايين نظارة خلال 2026 بأسعار تبدأ من 299 دولاراً",
    excerpt:
      "أعلنت ميتا عن خطة طموحة لتوسيع إنتاج نظاراتها الذكية المدعومة بالذكاء الاصطناعي بالشراكة مع EssilorLuxottica.",
    content: `<p>كشفت شركة ميتا عن انطلاقة الإنتاج الواسع لنظاراتها الذكية الجديدة بالتعاون مع شركة EssilorLuxottica العالمية، مستهدفةً بيع <strong>10 ملايين وحدة</strong> خلال 2026.</p>
<h2>المواصفات</h2>
<p>تحتوي النظارات على كاميرتين عاليتي الدقة، 6 ميكروفونات لاستقبال الصوت، وذاكرة داخلية تكفي لتسجيل ما يصل إلى ساعتين من الفيديو، إلى جانب مساعد Meta AI المدمج.</p>
<h2>التسعير</h2>
<p>تبدأ الأسعار من <strong>299 دولاراً</strong> للنموذج الأساسي، وتصل إلى 499 دولاراً للنموذج المزود بشاشة عرض داخل العدسة.</p>
<h2>المنافسة مع آبل</h2>
<p>تأتي هذه الخطوة لتعزيز موقع ميتا في سباق الأجهزة القابلة للارتداء، خصوصاً في مواجهة Vision Pro 2 من آبل.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: TECH_IMAGES[12],
    daysAgo: 3,
    metaDescription:
      "ميتا تبدأ الإنتاج الضخم لنظاراتها الذكية بأسعار تبدأ من 299 دولاراً.",
    keywords: ["ميتا", "Meta", "نظارات ذكية", "EssilorLuxottica", "ذكاء اصطناعي"],
  },
  {
    slug: "saudi-humain-ai-supercomputer",
    title: "السعودية تُطلق «هيومن» أكبر حاسوب فائق للذكاء الاصطناعي في الشرق الأوسط",
    subtitle: "الحاسوب يضم 18,000 شريحة Nvidia GB200 ويهدف لخدمة المنطقة العربية",
    excerpt:
      "كشفت شركة هيومن السعودية عن تشغيل أكبر بنية تحتية للذكاء الاصطناعي في المنطقة بطاقة حسابية تتجاوز 50 إكسافلوب.",
    content: `<p>أعلنت شركة <strong>هيومن (Humain)</strong> السعودية، المملوكة لصندوق الاستثمارات العامة، عن تشغيل أكبر حاسوب فائق مخصص للذكاء الاصطناعي في الشرق الأوسط.</p>
<h2>المواصفات الفنية</h2>
<ul>
<li>18,000 شريحة Nvidia GB200 الجديدة</li>
<li>طاقة حسابية تتجاوز 50 إكسافلوب</li>
<li>استهلاك طاقة 200 ميغاواط من مصادر متجددة</li>
<li>تبريد بالمياه المعالجة لتقليل البصمة البيئية</li>
</ul>
<h2>الأهداف</h2>
<p>سيُستخدم الحاسوب في تدريب نماذج لغوية عربية كبرى، إضافة إلى تقديم خدمات حوسبة سحابية للشركات والباحثين في المنطقة.</p>
<h2>الشراكات</h2>
<p>وقّعت هيومن اتفاقيات مع Nvidia وAMD وQualcomm لضمان الحصول على أحدث الشرائح، كما أعلنت عن شراكة مع Anthropic لتوفير نماذج Claude في المنطقة.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: TECH_IMAGES[1],
    daysAgo: 4,
    metaDescription:
      "السعودية تُشغل أكبر حاسوب فائق للذكاء الاصطناعي في الشرق الأوسط بـ 18,000 شريحة Nvidia.",
    keywords: ["السعودية", "هيومن", "ذكاء اصطناعي", "Nvidia", "حاسوب فائق"],
  },
  {
    slug: "uae-arabic-llm-jais-3-launch",
    title: "الإمارات تُطلق «جيس 3» أقوى نموذج لغوي عربي مفتوح المصدر",
    subtitle: "النموذج بحجم 70 مليار معامل يتفوق على المنافسين في معايير اللغة العربية",
    excerpt:
      "أطلقت مؤسسة Inception الإماراتية الإصدار الثالث من نموذج «جيس» بقدرات محسّنة في فهم وتوليد العربية.",
    content: `<p>أعلنت مؤسسة <strong>Inception</strong> التابعة لمجموعة G42 الإماراتية عن إطلاق الإصدار الثالث من نموذجها اللغوي العربي «جيس» (Jais 3).</p>
<h2>تطورات النموذج</h2>
<p>يأتي النموذج بحجم <strong>70 مليار معامل</strong>، ضِعفَي حجم الإصدار السابق، مع تدريب على 1.6 تريليون رمز عربي وإنجليزي.</p>
<h2>الأداء</h2>
<p>تفوّق جيس 3 على جميع النماذج المنافسة في معايير اللغة العربية مثل ArabicMMLU وHellaswag-Arabic، كما يقدم أداءً تنافسياً بالإنجليزية.</p>
<h2>مفتوح المصدر</h2>
<p>طُرح النموذج برخصة Apache 2.0 على منصة Hugging Face، مما يتيح للباحثين والشركات استخدامه وتعديله بحرية.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: TECH_IMAGES[4],
    daysAgo: 5,
    metaDescription: "الإمارات تُطلق جيس 3 أقوى نموذج لغوي عربي مفتوح المصدر بـ 70 مليار معامل.",
    keywords: ["الإمارات", "جيس", "Jais", "نموذج لغوي عربي", "G42"],
  },
  {
    slug: "samsung-galaxy-s27-ultra-features",
    title: "سامسونج تُعلن عن Galaxy S27 Ultra بكاميرا 250 ميجابكسل وذكاء اصطناعي مُطوّر",
    subtitle: "الجهاز الجديد يأتي بشاشة 7 بوصات قابلة للطي ومعالج Snapdragon 8 Gen 5",
    excerpt:
      "كشفت سامسونج عن هاتفها الرائد الجديد Galaxy S27 Ultra الذي يحمل قفزة نوعية في الكاميرا وميزات الذكاء الاصطناعي.",
    content: `<p>كشفت شركة سامسونج عن هاتفها الرائد الجديد <strong>Galaxy S27 Ultra</strong> خلال مؤتمر Galaxy Unpacked.</p>
<h2>المواصفات الرئيسية</h2>
<ul>
<li>كاميرا خلفية رباعية بدقة 250 ميجابكسل للعدسة الأساسية</li>
<li>شاشة Dynamic AMOLED بحجم 6.9 بوصة وتردد 144 هرتز</li>
<li>معالج Snapdragon 8 Gen 5 بتقنية 2 نانومتر</li>
<li>ذاكرة وصول عشوائي 16 جيجابايت كحد أدنى</li>
<li>بطارية 5500 mAh مع شحن سريع 100 واط</li>
</ul>
<h2>Galaxy AI 3.0</h2>
<p>يأتي الجهاز بإصدار محدّث من Galaxy AI يدعم الترجمة الفورية لـ 30 لغة منها العربية، إضافة إلى ميزات تحرير الصور بالذكاء الاصطناعي وملخصات المكالمات.</p>
<h2>السعر والإتاحة</h2>
<p>يبدأ السعر من 1299 دولاراً، وسيكون متاحاً للحجز المسبق منتصف الشهر.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: TECH_IMAGES[8],
    daysAgo: 6,
    metaDescription:
      "سامسونج تُطلق Galaxy S27 Ultra بكاميرا 250 ميجابكسل ومعالج Snapdragon 8 Gen 5.",
    keywords: ["سامسونج", "Galaxy S27", "هاتف ذكي", "Samsung", "Snapdragon"],
  },
  {
    slug: "tesla-robotaxi-saudi-arabia-launch",
    title: "تيسلا تبدأ تشغيل خدمة «روبوتاكسي» في الرياض كأولى مدن الشرق الأوسط",
    subtitle: "الخدمة تنطلق بـ 200 مركبة ذاتية القيادة بالكامل",
    excerpt:
      "أعلنت تيسلا عن إطلاق خدمة «روبوتاكسي» في الرياض ضمن شراكة مع شركة سعودية، لتصبح أول مدينة شرق أوسطية تشهد هذه الخدمة.",
    content: `<p>دخلت خدمة <strong>روبوتاكسي (Robotaxi)</strong> من تيسلا منطقة الشرق الأوسط لأول مرة عبر إطلاقها رسمياً في مدينة الرياض.</p>
<h2>تفاصيل التشغيل</h2>
<p>تبدأ الخدمة بأسطول من <strong>200 مركبة Cybercab</strong> ذاتية القيادة بالكامل، تغطي مناطق محددة في وسط الرياض وشمالها، مع خطط للتوسع إلى 1000 مركبة قبل نهاية العام.</p>
<h2>التسعير</h2>
<p>تبدأ الرحلة من 15 ريالاً، مع تسعير حسب المسافة والوقت، وهو ما يجعل الخدمة منافسة لتطبيقات النقل التشاركي التقليدية.</p>
<h2>التشريعات</h2>
<p>منحت هيئة النقل السعودية تيسلا تراخيص خاصة بعد فترة اختبار استمرت 8 أشهر لضمان السلامة والامتثال.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: TECH_IMAGES[3],
    daysAgo: 7,
    metaDescription:
      "تيسلا تطلق خدمة روبوتاكسي ذاتية القيادة في الرياض بـ 200 مركبة Cybercab.",
    keywords: ["تيسلا", "روبوتاكسي", "السعودية", "قيادة ذاتية", "Tesla"],
  },
  {
    slug: "google-gemini-3-pro-release",
    title: "جوجل تكشف عن Gemini 3 Pro بقدرات وسائط متعددة محسّنة",
    subtitle: "النموذج الجديد يقدم أداءً متفوقاً في تحليل الفيديو والصور والصوت",
    excerpt:
      "أعلنت جوجل عن إطلاق Gemini 3 Pro، الإصدار الأحدث من نموذجها متعدد الوسائط مع تحسينات كبيرة في فهم الفيديو.",
    content: `<p>كشفت جوجل عن الإصدار الثالث من نموذج <strong>Gemini Pro</strong> ضمن سلسلة نماذج Gemini متعددة الوسائط.</p>
<h2>القدرات الجديدة</h2>
<ul>
<li>تحليل فيديوهات يصل طولها إلى 6 ساعات</li>
<li>فهم 50 صورة دفعة واحدة في سياق مشترك</li>
<li>توليد صور بدقة 4K مدمج</li>
<li>دعم 75 لغة بما فيها العربية الفصحى ولهجاتها الرئيسية</li>
</ul>
<h2>التكامل مع منتجات جوجل</h2>
<p>سيُتاح النموذج عبر Google Workspace وAndroid Studio وVertex AI، مع توفر مجاني محدود في Google AI Studio.</p>
<h2>التسعير</h2>
<p>يبدأ سعر API من 1.5 دولار لكل مليون رمز إدخال، أي أقل بنسبة 30% من المنافس الأقرب.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: TECH_IMAGES[5],
    daysAgo: 8,
    metaDescription:
      "جوجل تُطلق Gemini 3 Pro بقدرات تحليل فيديو تصل إلى 6 ساعات و50 صورة دفعة واحدة.",
    keywords: ["جوجل", "Gemini", "Google AI", "ذكاء اصطناعي", "وسائط متعددة"],
  },
  {
    slug: "microsoft-copilot-windows-12-integration",
    title: "مايكروسوفت تكشف عن Windows 12 المعتمد كلياً على Copilot",
    subtitle: "نظام التشغيل الجديد يضع الذكاء الاصطناعي في قلب تجربة المستخدم",
    excerpt:
      "أعلنت مايكروسوفت عن النسخة المقبلة من ويندوز التي تدمج Copilot في كل جانب من جوانب نظام التشغيل.",
    content: `<p>كشفت مايكروسوفت رسمياً عن <strong>Windows 12</strong>، أول نظام تشغيل من جيل ما بعد الذكاء الاصطناعي.</p>
<h2>الأبرز في النظام</h2>
<p>يتميز Windows 12 بدمج <strong>Copilot+</strong> بشكل عميق في النظام، حيث يمكن للمستخدم التحكم بكل شيء عبر الأوامر الصوتية أو النصية.</p>
<h2>متطلبات تشغيل عالية</h2>
<p>يتطلب النظام معالجاً يدعم وحدة معالجة عصبية NPU بقوة لا تقل عن 40 TOPS، إلى جانب 16 جيجابايت رام كحد أدنى.</p>
<h2>التوفر</h2>
<p>سيُطرح النظام بداية أكتوبر 2026 كترقية مجانية لمستخدمي Windows 11 المؤهلين، مع نسخة تجريبية متاحة لأعضاء برنامج Insider.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: TECH_IMAGES[7],
    daysAgo: 9,
    metaDescription:
      "مايكروسوفت تُعلن عن Windows 12 بدمج عميق لـ Copilot في نظام التشغيل.",
    keywords: ["مايكروسوفت", "Windows 12", "Copilot", "نظام تشغيل", "Microsoft"],
  },
  {
    slug: "spacex-starship-mars-mission-2026",
    title: "سبيس إكس تستعد لأول رحلة غير مأهولة إلى المريخ نهاية 2026",
    subtitle: "خمس مركبات Starship ستحمل معدات لتأسيس قاعدة مستقبلية",
    excerpt:
      "كشفت سبيس إكس عن خططها لإطلاق أول مهمة فعلية إلى المريخ خلال نافذة الإطلاق المقبلة في نهاية العام.",
    content: `<p>أعلنت شركة <strong>سبيس إكس</strong> عن استعدادها لإطلاق أول مهمة غير مأهولة إلى كوكب المريخ نهاية 2026.</p>
<h2>تفاصيل المهمة</h2>
<p>ستُرسل الشركة <strong>5 مركبات Starship</strong> محملةً بمعدات بحثية وأنظمة دعم حياة وألواح شمسية ومحطات لتوليد الأكسجين.</p>
<h2>الأهداف</h2>
<ul>
<li>اختبار الهبوط الذاتي على سطح المريخ</li>
<li>تجميع بيانات حول البيئة المريخية</li>
<li>تجربة استخراج الأكسجين من الغلاف الجوي</li>
<li>تأسيس بنية تحتية أولية لمهمات مأهولة لاحقة</li>
</ul>
<h2>الجدول الزمني</h2>
<p>من المتوقع أن تستغرق الرحلة 7 أشهر، مع خطة لإرسال أول رواد بشريين عام 2030 إذا نجحت المهمة الحالية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[10],
    daysAgo: 10,
    metaDescription:
      "سبيس إكس تستعد لإرسال 5 مركبات Starship إلى المريخ نهاية 2026.",
    keywords: ["سبيس إكس", "SpaceX", "المريخ", "Starship", "فضاء"],
  },
  {
    slug: "tiktok-saudi-data-center-investment",
    title: "تيك توك تستثمر مليار دولار لإنشاء مركز بيانات في الرياض",
    subtitle: "الاستثمار يأتي ضمن اتفاقية مع وزارة الاتصالات لتعزيز الاقتصاد الرقمي",
    excerpt:
      "أعلنت تيك توك عن استثمار ضخم لبناء مركز بيانات إقليمي في الرياض لخدمة المستخدمين في الشرق الأوسط وأفريقيا.",
    content: `<p>وقّعت شركة <strong>تيك توك (TikTok)</strong> اتفاقية استثمار بقيمة <strong>مليار دولار</strong> مع وزارة الاتصالات وتقنية المعلومات السعودية لبناء مركز بيانات في الرياض.</p>
<h2>أهمية المشروع</h2>
<p>سيخدم المركز أكثر من 200 مليون مستخدم في منطقة الشرق الأوسط وشمال أفريقيا، ويُحسّن سرعة الاستجابة بنسبة تتجاوز 60%.</p>
<h2>الالتزامات</h2>
<p>تتعهد تيك توك بتوظيف أكثر من 1500 مهندس سعودي خلال 3 سنوات، إضافة إلى نقل خبرات في مجالات الذكاء الاصطناعي والتوصيات.</p>
<h2>سياق أوسع</h2>
<p>تأتي هذه الخطوة ضمن جهود السعودية لجذب استثمارات شركات التقنية الكبرى وتحقيق مستهدفات رؤية 2030 الرقمية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[2],
    daysAgo: 12,
    metaDescription:
      "تيك توك تستثمر مليار دولار في مركز بيانات إقليمي بالرياض لخدمة 200 مليون مستخدم.",
    keywords: ["تيك توك", "TikTok", "السعودية", "مركز بيانات", "استثمار رقمي"],
  },
  {
    slug: "anthropic-claude-4-opus-launch",
    title: "Anthropic تكشف عن Claude 4 Opus بأداء مُتفوّق في الاستدلال المعقد",
    subtitle: "النموذج الجديد يستهدف الشركات والباحثين في المهام البحثية الطويلة",
    excerpt:
      "أعلنت Anthropic عن إطلاق Claude 4 Opus بقدرات معززة في الاستدلال متعدد الخطوات والبرمجة.",
    content: `<p>أعلنت شركة <strong>Anthropic</strong> عن إطلاق نموذجها الجديد <strong>Claude 4 Opus</strong>، الإصدار الأكثر تطوراً في عائلة Claude.</p>
<h2>التحسينات</h2>
<p>يتميز النموذج بقدرات استدلال موسّع تسمح له بالعمل على مهام مستقلة لساعات طويلة، إضافة إلى دقة محسّنة في كتابة الأكواد البرمجية وحل المسائل العلمية.</p>
<h2>السوق المستهدف</h2>
<p>تستهدف Anthropic بهذا النموذج الشركات الكبرى ومراكز الأبحاث، وقد أعلنت عن شراكات مع Amazon وApple لتوفير النموذج عبر منصاتها.</p>
<h2>الأمان</h2>
<p>يأتي النموذج وفق إطار <strong>Responsible Scaling Policy</strong> الجديد من Anthropic، مع ضوابط مشددة لضمان الاستخدام الآمن.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[14],
    daysAgo: 13,
    metaDescription:
      "Anthropic تُطلق Claude 4 Opus بقدرات استدلال متفوقة للشركات والباحثين.",
    keywords: ["Anthropic", "Claude", "ذكاء اصطناعي", "نماذج لغوية", "AI"],
  },
  {
    slug: "quantum-computing-breakthrough-ibm",
    title: "IBM تُحقق إنجازاً في الحوسبة الكمومية بمعالج 1500 كيوبت",
    subtitle: "المعالج الجديد يُقرّب الحوسبة الكمومية من التطبيقات التجارية",
    excerpt:
      "أعلنت IBM عن نجاح تشغيل معالج كمومي بـ 1500 كيوبت مع معدلات خطأ منخفضة قياسياً.",
    content: `<p>حققت شركة <strong>IBM</strong> إنجازاً مهماً في عالم الحوسبة الكمومية بإطلاق معالج <strong>Condor-2</strong> الذي يضم 1500 كيوبت.</p>
<h2>الأهمية</h2>
<p>يُعد هذا تجاوزاً لحاجز "التفوق الكمومي" في حل مسائل عملية، حيث يمكن للمعالج محاكاة أنظمة كيميائية وفيزيائية معقدة في دقائق بدل سنوات.</p>
<h2>التطبيقات المُحتملة</h2>
<ul>
<li>اكتشاف أدوية جديدة</li>
<li>تطوير مواد متقدمة للبطاريات</li>
<li>تحسين خوارزميات الأمن السيبراني</li>
<li>محاكاة الطقس والمناخ بدقة أعلى</li>
</ul>
<h2>الإتاحة</h2>
<p>سيُتاح المعالج للشركات والباحثين عبر منصة IBM Quantum السحابية بداية الربع القادم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[11],
    daysAgo: 14,
    metaDescription:
      "IBM تُطلق معالجاً كمومياً بـ 1500 كيوبت يُقرب الحوسبة الكمومية من التطبيقات التجارية.",
    keywords: ["IBM", "حوسبة كمومية", "كيوبت", "Quantum", "تكنولوجيا"],
  },
  {
    slug: "cybersecurity-ai-attacks-rise-2026",
    title: "تقرير: ارتفاع الهجمات السيبرانية المدعومة بالذكاء الاصطناعي بنسبة 300%",
    subtitle: "الشرق الأوسط ضمن المناطق الأكثر استهدافاً مع زيادة الاعتماد على الأتمتة",
    excerpt:
      "تقرير جديد يكشف عن قفزة هائلة في الهجمات السيبرانية التي تستخدم الذكاء الاصطناعي خلال الربع الأول من 2026.",
    content: `<p>كشف تقرير حديث صادر عن شركة <strong>Mandiant</strong> الأمنية عن ارتفاع غير مسبوق في الهجمات السيبرانية المدعومة بالذكاء الاصطناعي بنسبة 300% خلال الربع الأول من 2026.</p>
<h2>أنواع الهجمات</h2>
<ul>
<li>هجمات تصيد متطورة بالـ Deepfake الصوتي والمرئي</li>
<li>توليد آلي لبرمجيات خبيثة قادرة على التهرب من برامج الحماية</li>
<li>اختراق أنظمة المؤسسات عبر هندسة اجتماعية مدعومة بـ LLM</li>
</ul>
<h2>المناطق الأكثر استهدافاً</h2>
<p>صنّف التقرير الشرق الأوسط ضمن أكثر 3 مناطق تعرضاً، خصوصاً قطاعات الطاقة والبنوك في دول الخليج.</p>
<h2>التوصيات</h2>
<p>يدعو التقرير الشركات إلى الاستثمار في حلول دفاعية مبنية على الذكاء الاصطناعي والتدريب المستمر للموظفين.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[13],
    daysAgo: 16,
    metaDescription:
      "ارتفاع الهجمات السيبرانية المدعومة بالذكاء الاصطناعي 300% والشرق الأوسط ضمن المستهدفين.",
    keywords: ["أمن سيبراني", "ذكاء اصطناعي", "Deepfake", "هجمات", "Mandiant"],
  },
  {
    slug: "5g-advanced-deployment-gulf",
    title: "دول الخليج تتصدر العالم في نشر شبكات 5G-Advanced",
    subtitle: "الإمارات والسعودية وقطر يتفوقن في سرعات التحميل ومعدلات التغطية",
    excerpt:
      "تقرير عالمي يضع دول الخليج على قمة قائمة الدول الأكثر نشراً لشبكات 5G-Advanced مع سرعات تتجاوز 10 جيجابت/ثانية.",
    content: `<p>صنّف تقرير حديث من <strong>Ookla</strong> دول مجلس التعاون الخليجي على رأس قائمة الدول الأكثر نشراً لشبكات الجيل الخامس المتقدم (5G-Advanced).</p>
<h2>الأداء</h2>
<p>تحتل الإمارات المرتبة الأولى عالمياً بسرعة تحميل متوسطة تبلغ <strong>1.2 جيجابت/ثانية</strong>، تليها قطر ثم السعودية.</p>
<h2>الاستثمارات</h2>
<p>أنفقت دول الخليج مجتمعةً أكثر من 25 مليار دولار على البنية التحتية للاتصالات خلال 2025، مع التركيز على مدن مثل دبي والرياض والدوحة.</p>
<h2>التطبيقات</h2>
<p>تتيح هذه السرعات تطبيقات متقدمة مثل المركبات ذاتية القيادة، الجراحة عن بُعد، والمصانع الذكية بمستويات أداء غير مسبوقة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[15],
    daysAgo: 18,
    metaDescription:
      "دول الخليج تتصدر نشر شبكات 5G-Advanced بسرعات تتجاوز جيجابت/ثانية.",
    keywords: ["5G", "الخليج", "اتصالات", "الإمارات", "السعودية"],
  },
  {
    slug: "open-source-ai-models-rise",
    title: "النماذج المفتوحة المصدر تنافس النماذج التجارية في الأداء بنهاية 2026",
    subtitle: "نماذج Llama 4 وMistral وQwen تُحدث ثورة في إتاحة الذكاء الاصطناعي",
    excerpt:
      "تقرير يستعرض كيف باتت نماذج الذكاء الاصطناعي مفتوحة المصدر تُنافس النماذج التجارية الرائدة في معايير الأداء.",
    content: `<p>شهدت ساحة الذكاء الاصطناعي تحولاً جوهرياً مع اقتراب النماذج مفتوحة المصدر من الأداء التجاري، بحسب تقرير Stanford AI Index الجديد.</p>
<h2>النماذج البارزة</h2>
<ul>
<li><strong>Llama 4</strong> من ميتا بحجم 400 مليار معامل</li>
<li><strong>Mistral Large 3</strong> من فرنسا</li>
<li><strong>Qwen 3</strong> من علي بابا</li>
<li><strong>DeepSeek-R2</strong> من الصين</li>
</ul>
<h2>الفائدة للمؤسسات</h2>
<p>تُتيح هذه النماذج للشركات استضافتها على بنيتها التحتية الخاصة، مما يحل مشاكل خصوصية البيانات ويُخفّض التكاليف بنسبة تتجاوز 70%.</p>
<h2>التحديات</h2>
<p>رغم التقدم الكبير، لا تزال النماذج المغلقة تتفوق في مهام محددة كالبرمجة والاستدلال متعدد الخطوات.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: TECH_IMAGES[9],
    daysAgo: 21,
    metaDescription:
      "النماذج مفتوحة المصدر مثل Llama 4 وMistral تُنافس النماذج التجارية بنهاية 2026.",
    keywords: ["مفتوح المصدر", "Llama", "Mistral", "Qwen", "ذكاء اصطناعي"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, TECH_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${TECH_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, TECH_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${TECH_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(TECH_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${TECH_CATEGORY.nameAr} (slug: ${TECH_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} technology test articles...\n`);

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
      category: "Technology",
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
        originalMessage: "Seeded by seedTechNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new technology articles.`);

  return {
    category: "Technology",
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
