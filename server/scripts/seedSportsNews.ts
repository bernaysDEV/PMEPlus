/**
 * Seed 16 sports test articles under the «رياضة» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedSportsNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const SPORTS_CATEGORY = {
  nameAr: "رياضة",
  nameEn: "Sports",
  slug: "sports",
  description: "أخبار رياضية محلية وعالمية",
  color: "#F59E0B",
  icon: "⚽",
  displayOrder: 5,
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

const SPORTS_IMAGES = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1495555687398-3f50d6e79e1e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "saudi-pro-league-record-attendance-2026",
    title: "دوري روشن السعودي يُسجّل أعلى متوسط حضور جماهيري في تاريخه",
    subtitle: "متوسط الحضور يصل إلى 28 ألف متفرج لكل مباراة في الموسم الحالي",
    excerpt:
      "كشفت رابطة دوري المحترفين السعودي عن أرقام قياسية لحضور الجماهير في موسم 2025-2026 مدفوعة بنجوم عالميين.",
    content: `<p>أعلنت رابطة دوري المحترفين السعودي عن تسجيل <strong>أعلى متوسط حضور جماهيري</strong> في تاريخ المسابقة خلال الموسم الحالي 2025-2026.</p>
<h2>الأرقام</h2>
<p>وصل متوسط الحضور إلى <strong>28,400 متفرج</strong> لكل مباراة، بنمو 35% مقارنة بالموسم السابق، مع تسجيل مباراة الكلاسيكو بين الهلال والنصر حضوراً تجاوز 70 ألف متفرج.</p>
<h2>أسباب الازدهار</h2>
<ul>
<li>وجود نجوم عالميين كبار من أمثال رونالدو ونيمار وبنزيما</li>
<li>تطوير ملاعب حديثة بمواصفات عالمية</li>
<li>أسعار تذاكر مدعومة وعروض عائلية</li>
<li>بث تلفزيوني عالمي يصل إلى أكثر من 170 دولة</li>
</ul>
<h2>الإيرادات</h2>
<p>قُدّرت إيرادات بيع التذاكر هذا الموسم بأكثر من 850 مليون ريال، إضافة إلى عقود رعاية تجاوزت 1.2 مليار ريال.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: SPORTS_IMAGES[0],
    daysAgo: 1,
    metaDescription:
      "دوري روشن يُسجل متوسط حضور قياسي بـ 28 ألف متفرج لكل مباراة في موسم 2025-2026.",
    keywords: ["دوري روشن", "السعودية", "كرة قدم", "الهلال", "النصر"],
  },
  {
    slug: "al-hilal-asian-champions-league-final-2026",
    title: "الهلال يبلغ نهائي دوري أبطال آسيا للنخبة للمرة الخامسة في تاريخه",
    subtitle: "الزعيم يتأهل بفوز عريض على الفريق الياباني في نصف النهائي",
    excerpt:
      "ضمن نادي الهلال السعودي تأهله إلى نهائي دوري أبطال آسيا للنخبة بعد فوزه على ضيفه الياباني بنتيجة 4-1.",
    content: `<p>تأهل نادي <strong>الهلال السعودي</strong> رسمياً إلى المباراة النهائية لدوري أبطال آسيا للنخبة للمرة الخامسة في تاريخه، وذلك بعد فوزه الكبير على نظيره الياباني في نصف النهائي.</p>
<h2>تفاصيل المباراة</h2>
<p>سيطر الهلال على أحداث المباراة منذ صافرة البداية، وافتتح التسجيل في الدقيقة 12 عبر مهاجمه البرازيلي، قبل أن يُضيف ثلاثة أهداف أخرى في الشوط الثاني.</p>
<h2>المنافس في النهائي</h2>
<p>سيواجه الهلال الفائز من مباراة <strong>القادسية</strong> وأولسان الكوري الجنوبي، في نهائي مرتقب يُقام في مايو المقبل بمدينة الرياض.</p>
<h2>تصريحات المدرب</h2>
<p>قال مدرب الفريق إن الهدف لم يتحقق بعد، مؤكداً أن المباراة النهائية ستكون فرصة للزعيم لإثبات أنه الأفضل آسيوياً.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: SPORTS_IMAGES[1],
    daysAgo: 2,
    metaDescription:
      "الهلال يتأهل لنهائي دوري أبطال آسيا للنخبة للمرة الخامسة في تاريخه.",
    keywords: ["الهلال", "دوري أبطال آسيا", "السعودية", "كرة قدم", "نهائي"],
  },
  {
    slug: "ronaldo-1000-career-goals-milestone",
    title: "كريستيانو رونالدو يقترب من الهدف الـ 1000 في مسيرته الاحترافية",
    subtitle: "الدون يحتاج إلى 12 هدفاً فقط لتحقيق الإنجاز التاريخي",
    excerpt:
      "نجم النصر السعودي كريستيانو رونالدو على بُعد 12 هدفاً من تسجيل الهدف الألف في مسيرته الاحترافية.",
    content: `<p>أصبح النجم البرتغالي <strong>كريستيانو رونالدو</strong> على بُعد خطوات قليلة من تحقيق إنجاز غير مسبوق في عالم كرة القدم بالوصول إلى <strong>1000 هدف</strong> في مسيرته الاحترافية.</p>
<h2>الأرقام الحالية</h2>
<p>وصل رصيد رونالدو إلى 988 هدفاً بين الأندية والمنتخب، بعد تسجيله ثنائية في مباراة فريقه الأخيرة في دوري روشن.</p>
<h2>التوزيع</h2>
<ul>
<li>سبورتنغ لشبونة: 5 أهداف</li>
<li>مانشستر يونايتد: 145 هدفاً</li>
<li>ريال مدريد: 450 هدفاً</li>
<li>يوفنتوس: 101 هدف</li>
<li>النصر السعودي: 95 هدفاً</li>
<li>منتخب البرتغال: 137 هدفاً</li>
</ul>
<h2>الاحتفال المرتقب</h2>
<p>أكد نادي النصر أنه يستعد لاحتفالية ضخمة ستُقام في ملعب الأول بارك بمناسبة وصول الدون إلى الهدف الألف.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: SPORTS_IMAGES[2],
    daysAgo: 3,
    metaDescription:
      "كريستيانو رونالدو على بُعد 12 هدفاً من تحقيق إنجاز الـ 1000 هدف الاحترافي.",
    keywords: ["رونالدو", "النصر", "كرة قدم", "السعودية", "البرتغال"],
  },
  {
    slug: "world-cup-2026-final-draw-results",
    title: "قرعة كأس العالم 2026: تصنيف المنتخبات العربية في مجموعات قوية",
    subtitle: "السعودية والمغرب وقطر يواجهون منتخبات أوروبية وأمريكية لاتينية",
    excerpt:
      "أُجريت قرعة المرحلة النهائية لبطولة كأس العالم 2026 المشتركة بين الولايات المتحدة وكندا والمكسيك.",
    content: `<p>أُجريت في مدينة لاس فيغاس قرعة المرحلة النهائية لـ <strong>كأس العالم 2026</strong>، التي ستُقام في الولايات المتحدة وكندا والمكسيك خلال يونيو ويوليو من العام القادم.</p>
<h2>المنتخبات العربية</h2>
<ul>
<li><strong>السعودية:</strong> في مجموعة قوية مع البرازيل وإسبانيا والسنغال</li>
<li><strong>المغرب:</strong> مع فرنسا والأرجنتين وكوريا الجنوبية</li>
<li><strong>قطر:</strong> مع ألمانيا وأوروغواي وأستراليا</li>
<li><strong>تونس:</strong> مع إنجلترا وكولومبيا واليابان</li>
<li><strong>الجزائر:</strong> مع البرتغال وكرواتيا وكندا</li>
<li><strong>مصر:</strong> مع هولندا وإيران ونيوزيلندا</li>
</ul>
<h2>توقعات</h2>
<p>وصف خبراء كروياً أن مجموعة المغرب هي "مجموعة الموت"، فيما تُعد فرص السعودية والمغرب الأكبر للتأهل لدور الـ16.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: SPORTS_IMAGES[3],
    daysAgo: 4,
    metaDescription:
      "قرعة كأس العالم 2026 تضع المنتخبات العربية في مجموعات قوية مع البرازيل وفرنسا وألمانيا.",
    keywords: ["كأس العالم", "2026", "السعودية", "المغرب", "قطر"],
  },
  {
    slug: "saudi-arabia-formula-1-investment",
    title: "السعودية توقّع اتفاقية تاريخية مع الفورمولا 1 لاستضافة 3 سباقات سنوياً",
    subtitle: "الاتفاق يمتد لـ 10 سنوات ويشمل سباقات في الرياض وجدة والقدية",
    excerpt:
      "أعلنت السعودية عن توقيع اتفاقية حصرية مع الفورمولا 1 تجعلها أول دولة تستضيف 3 سباقات سنوياً في تاريخ البطولة.",
    content: `<p>وقّعت المملكة العربية السعودية اتفاقية تاريخية مع إدارة <strong>الفورمولا 1</strong> تتضمن استضافة المملكة لثلاثة سباقات سنوياً، في خطوة تعد الأولى من نوعها في تاريخ البطولة.</p>
<h2>تفاصيل الاتفاقية</h2>
<ul>
<li>مدة العقد: 10 سنوات قابلة للتجديد</li>
<li>المدن المستضيفة: جدة، الرياض، القدية</li>
<li>قيمة الاستثمار الإجمالية: تتجاوز 5 مليارات دولار</li>
</ul>
<h2>القدية: حلبة المستقبل</h2>
<p>سيُفتتح في 2027 مشروع حلبة <strong>القدية</strong> التي ستكون أحد أطول مسارات الفورمولا 1 في العالم بطول 8 كم، وستُقام عليها سباقات ليلية مميزة.</p>
<h2>الأثر الاقتصادي</h2>
<p>تتوقع وزارة السياحة أن تُسهم السباقات في جذب أكثر من 500 ألف زائر سنوياً للمملكة، مع عائدات اقتصادية مباشرة تتجاوز 3 مليارات ريال.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: SPORTS_IMAGES[4],
    daysAgo: 5,
    metaDescription:
      "السعودية توقّع مع الفورمولا 1 لاستضافة 3 سباقات سنوياً في جدة والرياض والقدية.",
    keywords: ["فورمولا 1", "السعودية", "القدية", "سباقات", "F1"],
  },
  {
    slug: "qatar-asian-games-2030-preparations",
    title: "قطر تستعد لاستضافة دورة الألعاب الآسيوية 2030 بمنشآت متطورة",
    subtitle: "اللجنة المنظمة تكشف عن خطة تضم 45 رياضة و12 ألف رياضي",
    excerpt:
      "كشفت اللجنة المنظمة لدورة الألعاب الآسيوية 2030 في الدوحة عن استعدادات استثنائية تشمل 35 منشأة رياضية حديثة.",
    content: `<p>كشفت اللجنة المنظمة لـ <strong>دورة الألعاب الآسيوية 2030</strong> التي ستستضيفها قطر عن خططها التفصيلية للدورة التي ستجمع <strong>12 ألف رياضي</strong> من 45 دولة آسيوية.</p>
<h2>المنشآت</h2>
<p>أعلنت اللجنة عن جاهزية 28 منشأة من أصل 35 منشأة، فيما تُكمل البقية أعمالها قبل نهاية 2027، أي ثلاث سنوات قبل الموعد المقرر للدورة.</p>
<h2>الرياضات</h2>
<p>تتضمن الدورة 45 رياضة بينها رياضات إلكترونية ولأول مرة الكرة المعدلة (Modified Football) والبادل، إلى جانب الرياضات التقليدية.</p>
<h2>الإرث</h2>
<p>تُؤكد قطر أن المنشآت ستُستخدم بعد الدورة لاستضافة بطولات قارية ودولية، إضافة إلى تحويل بعضها إلى مرافق مجتمعية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[5],
    daysAgo: 7,
    metaDescription:
      "قطر تستعد لدورة الألعاب الآسيوية 2030 بـ 35 منشأة و12 ألف رياضي و45 رياضة.",
    keywords: ["قطر", "الألعاب الآسيوية", "2030", "الدوحة", "رياضة"],
  },
  {
    slug: "morocco-football-academy-success",
    title: "أكاديمية محمد السادس تُخرّج جيلاً ذهبياً يقود منتخب المغرب",
    subtitle: "70% من لاعبي المنتخب المغربي الحالي تخرّجوا من الأكاديمية",
    excerpt:
      "تواصل أكاديمية محمد السادس لكرة القدم في سلا تخريج لاعبين مميزين باتوا أساس المنتخب المغربي.",
    content: `<p>تستمر <strong>أكاديمية محمد السادس لكرة القدم</strong> في سلا بالمغرب في تخريج جيل ذهبي يُمثل عماد المنتخب المغربي على المستوى العربي والإفريقي.</p>
<h2>الأرقام</h2>
<p>تكشف إحصائيات الاتحاد المغربي أن أكثر من <strong>70% من لاعبي المنتخب الأول</strong> هم خريجو الأكاديمية، فيما تخرّج منها أكثر من 200 لاعب محترف يلعبون في كبرى الأندية الأوروبية والآسيوية.</p>
<h2>المنهجية</h2>
<p>تتبع الأكاديمية منهج تطوير شامل يجمع بين الإعداد الفني والبدني والذهني، إضافة إلى التعليم الأكاديمي، مع حضور علماء نفس ومدربين متخصصين.</p>
<h2>التوسعات</h2>
<p>أعلنت الأكاديمية عن خطط لافتتاح فرع جديد في طنجة بسعة 200 لاعب، بهدف زيادة قدرتها الاستيعابية خلال السنوات القادمة.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[6],
    daysAgo: 8,
    metaDescription:
      "أكاديمية محمد السادس تخرّج 70% من لاعبي المنتخب المغربي وأكثر من 200 محترف.",
    keywords: ["المغرب", "أكاديمية", "كرة قدم", "محمد السادس", "أسود الأطلس"],
  },
  {
    slug: "uae-jiu-jitsu-world-championship",
    title: "الإمارات تحصد المركز الأول في بطولة العالم للجوجيتسو",
    subtitle: "أبوظبي تتوّج بـ 18 ميدالية بينها 8 ذهبيات",
    excerpt:
      "حقق منتخب الإمارات للجوجيتسو إنجازاً تاريخياً بحصده المركز الأول في بطولة العالم التي أُقيمت في أبوظبي.",
    content: `<p>توّج منتخب <strong>الإمارات للجوجيتسو</strong> إنجازاً تاريخياً جديداً بفوزه بالمركز الأول في بطولة العالم التي استضافتها العاصمة أبوظبي.</p>
<h2>الميداليات</h2>
<p>حصد المنتخب الإماراتي <strong>18 ميدالية</strong> منها 8 ذهبيات و6 فضيات و4 برونزيات، متفوقاً على البرازيل ومنغوليا اللتين جاءتا في المركزين الثاني والثالث.</p>
<h2>الأبطال</h2>
<p>برز من بين الأبطال محمد المنصوري الذي توّج بالذهبية في وزن 85 كغم، وفاطمة المهيري التي حصدت الذهبية في وزن 62 كغم.</p>
<h2>الدعم الحكومي</h2>
<p>يأتي الإنجاز ثمرة لخطة استراتيجية أطلقها مجلس أبوظبي الرياضي قبل خمس سنوات لتطوير رياضة الجوجيتسو على المستويين الشعبي والاحترافي.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[7],
    daysAgo: 9,
    metaDescription:
      "الإمارات تتصدر بطولة العالم للجوجيتسو بـ 18 ميدالية بينها 8 ذهبيات.",
    keywords: ["الإمارات", "جوجيتسو", "أبوظبي", "بطولة العالم", "رياضة"],
  },
  {
    slug: "egypt-handball-african-championship",
    title: "مصر تتوّج بكأس أمم أفريقيا لكرة اليد للمرة الـ 9 في تاريخها",
    subtitle: "الفراعنة يهزمون تونس في النهائي بنتيجة 32-28",
    excerpt:
      "حقق منتخب مصر لكرة اليد لقب بطولة أمم أفريقيا للمرة التاسعة في تاريخه بعد فوزه على تونس في نهائي مثير.",
    content: `<p>حقق منتخب <strong>مصر لكرة اليد</strong> لقباً جديداً في بطولة أمم أفريقيا، رافعاً رصيده إلى 9 ألقاب، بعد فوزه على نظيره التونسي بنتيجة 32-28 في النهائي.</p>
<h2>تفاصيل المباراة</h2>
<p>سيطر الفراعنة على أغلب فترات اللقاء الذي شهد متعة كبيرة، وتألق فيه قائد الفريق <strong>كريم هنداوي</strong> الذي تصدى لـ 14 رمية خطيرة.</p>
<h2>الهداف</h2>
<p>فاز اللاعب المصري <strong>يحيى عمر</strong> بجائزة أفضل لاعب في البطولة بعد تسجيله 47 هدفاً، فيما حصد علي زين جائزة الهداف بـ 51 هدفاً.</p>
<h2>التأهل لكأس العالم</h2>
<p>يُؤهل اللقب منتخب مصر إلى بطولة كأس العالم لكرة اليد التي ستُقام نهاية العام في الدنمارك.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[8],
    daysAgo: 10,
    metaDescription:
      "مصر تحقق لقب أمم أفريقيا لكرة اليد للمرة الـ 9 بفوزها على تونس 32-28.",
    keywords: ["مصر", "كرة يد", "أمم أفريقيا", "تونس", "الفراعنة"],
  },
  {
    slug: "messi-inter-miami-championship-2026",
    title: "ميسي يقود إنتر ميامي لأول لقب دوري في تاريخه",
    subtitle: "الأرجنتيني يُسجل هاتريك في النهائي ويُتوّج هدافاً للموسم",
    excerpt:
      "قاد النجم الأرجنتيني ليونيل ميسي فريقه إنتر ميامي للتتويج بلقب الدوري الأمريكي للمرة الأولى في تاريخه.",
    content: `<p>قاد النجم الأرجنتيني <strong>ليونيل ميسي</strong> فريقه إنتر ميامي إلى أول لقب دوري في تاريخه، بعد الفوز على لوس أنجلوس FC في المباراة النهائية.</p>
<h2>أداء استثنائي</h2>
<p>سجّل ميسي ثلاثية مذهلة في المباراة النهائية، ليرفع رصيده الموسمي إلى 32 هدفاً ويتوج هدافاً للدوري الأمريكي للمحترفين MLS لأول مرة.</p>
<h2>الجوائز الفردية</h2>
<ul>
<li>هداف الدوري بـ 32 هدفاً</li>
<li>أفضل لاعب في الموسم</li>
<li>أفضل لاعب في النهائي</li>
<li>أكثر صانع أهداف بـ 21 تمريرة حاسمة</li>
</ul>
<h2>المستقبل</h2>
<p>أكد ميسي بعد المباراة أنه سيواصل اللعب في إنتر ميامي حتى نهاية عقده، مع التطلع لتحقيق ألقاب جديدة في الموسم القادم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[9],
    daysAgo: 12,
    metaDescription:
      "ميسي يقود إنتر ميامي لأول لقب دوري ويتوج هدافاً بـ 32 هدفاً.",
    keywords: ["ميسي", "إنتر ميامي", "MLS", "الأرجنتين", "كرة قدم"],
  },
  {
    slug: "al-nassr-king-cup-final-2026",
    title: "النصر يبلغ نهائي كأس الملك بقيادة كريستيانو رونالدو",
    subtitle: "العالمي يهزم الاتحاد بثلاثية في نصف النهائي",
    excerpt:
      "تأهل النصر إلى نهائي كأس الملك بعد فوزه على الاتحاد في مباراة مثيرة بنصف النهائي.",
    content: `<p>تأهل نادي <strong>النصر السعودي</strong> رسمياً إلى المباراة النهائية لمسابقة كأس الملك، وذلك بعد فوزه على ضيفه الاتحاد بنتيجة 3-1 في مباراة نصف النهائي.</p>
<h2>أبطال المباراة</h2>
<p>تألق النجم البرتغالي <strong>كريستيانو رونالدو</strong> الذي سجل ثنائية، فيما أضاف زميله البرازيلي تاليسكا الهدف الثالث.</p>
<h2>المنافس في النهائي</h2>
<p>سيواجه النصر الفائز من مباراة الهلال والقادسية في النهائي المنتظر الذي سيُقام في ملعب الملك فهد الدولي بالرياض.</p>
<h2>سعي للقب</h2>
<p>يسعى النصر للتتويج بكأس الملك للمرة السابعة في تاريخه، بعد آخر لقب نالته الفريق عام 1990.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[10],
    daysAgo: 13,
    metaDescription:
      "النصر يبلغ نهائي كأس الملك بقيادة رونالدو بعد فوزه على الاتحاد 3-1.",
    keywords: ["النصر", "كأس الملك", "رونالدو", "الاتحاد", "السعودية"],
  },
  {
    slug: "khabib-mma-academy-saudi-arabia",
    title: "خبيب نورماجوميدوف يفتتح أكاديمية للفنون القتالية المختلطة في الرياض",
    subtitle: "الأكاديمية ستُقام في الرياض كأول فرع لها خارج روسيا",
    excerpt:
      "أعلن البطل الروسي خبيب نورماجوميدوف عن افتتاح أكاديمية MMA متخصصة في العاصمة السعودية الرياض.",
    content: `<p>أعلن البطل السابق للوزن الخفيف في بطولة UFC <strong>خبيب نورماجوميدوف</strong> عن افتتاح أكاديميته الجديدة للفنون القتالية المختلطة في الرياض.</p>
<h2>تفاصيل الأكاديمية</h2>
<p>ستحمل الأكاديمية اسم <strong>"إيغل أكاديمي - الرياض"</strong> وتُعد أول فرع للأكاديمية الأم خارج روسيا، وتمتد على مساحة 5000 متر مربع.</p>
<h2>البرامج</h2>
<ul>
<li>تدريب احترافي للراغبين بالاحتراف</li>
<li>برامج للأطفال من سن 6 سنوات</li>
<li>تدريبات للسيدات في صالات منفصلة</li>
<li>برامج اللياقة العامة</li>
</ul>
<h2>المدربون</h2>
<p>سيقود الأكاديمية مدربون روس وداغستانيون، إضافة إلى كادر سعودي يضمن استمرار الجودة بعد أن يُسلَّم تدريجياً للكوادر المحلية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[11],
    daysAgo: 14,
    metaDescription:
      "خبيب نورماجوميدوف يفتتح أكاديمية MMA في الرياض كأول فرع خارج روسيا.",
    keywords: ["خبيب", "MMA", "الرياض", "السعودية", "فنون قتالية"],
  },
  {
    slug: "saudi-tennis-cup-rafael-nadal",
    title: "كأس السعودية للتنس: نادال يفوز باللقب في وداع رياضي مؤثر",
    subtitle: "الإسباني يتوّج بأول وآخر لقب في الرياض ويعتزل رسمياً",
    excerpt:
      "اختتم الأسطورة رافاييل نادال مسيرته الاحترافية بالفوز بكأس السعودية للتنس في حفل تكريمي مؤثر بالرياض.",
    content: `<p>توّج الأسطورة الإسباني <strong>رافاييل نادال</strong> مسيرته الاحترافية بشكل مثالي بفوزه بكأس السعودية للتنس في الرياض، قبل إعلانه الاعتزال رسمياً.</p>
<h2>المباراة النهائية</h2>
<p>هزم نادال في المباراة النهائية الإيطالي يانيك سينر بنتيجة 6-4 و7-5 في مباراة استمرت ساعتين.</p>
<h2>التكريم</h2>
<p>أُقيم حفل تكريم خاص للنجم الإسباني حضره عدد من نجوم التنس الحاليين والسابقين بينهم روجر فيدرر ونوفاك دجوكوفيتش، تكريماً لمسيرة استمرت 22 عاماً.</p>
<h2>الجائزة</h2>
<p>حصل نادال على جائزة قياسية بقيمة 10 ملايين دولار كبطل للنسخة الافتتاحية من البطولة، فيما تبرع بمليوني دولار منها لمؤسسته الخيرية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[12],
    daysAgo: 16,
    metaDescription:
      "نادال يتوج بكأس السعودية للتنس في الرياض ويعلن اعتزاله بعد مسيرة 22 عاماً.",
    keywords: ["نادال", "تنس", "السعودية", "الرياض", "اعتزال"],
  },
  {
    slug: "nba-dubai-game-2026",
    title: "دبي تستضيف أول مباراة رسمية لدوري NBA خارج أمريكا الشمالية",
    subtitle: "ليكرز ضد سيلتيكس في كوكا كولا أرينا أمام 17 ألف متفرج",
    excerpt:
      "شهدت دبي إنجازاً تاريخياً باستضافتها لأول مباراة رسمية في دوري كرة السلة الأمريكي خارج أمريكا الشمالية.",
    content: `<p>دخلت مدينة دبي تاريخ <strong>دوري كرة السلة الأمريكي للمحترفين (NBA)</strong> باستضافتها لأول مباراة رسمية للدوري خارج قارة أمريكا الشمالية.</p>
<h2>المباراة</h2>
<p>أُقيمت المباراة بين فريقي <strong>لوس أنجلوس ليكرز</strong> و<strong>بوسطن سيلتيكس</strong> في صالة كوكا كولا أرينا، أمام 17 ألف متفرج، وانتهت لصالح الليكرز بنتيجة 112-108.</p>
<h2>الأبرز</h2>
<p>تألق نجم الليكرز <strong>لوكا دونتشيتش</strong> الذي سجل 38 نقطة، فيما أضاف ليبرون جيمس 25 نقطة مع 12 تمريرة حاسمة.</p>
<h2>المستقبل</h2>
<p>أعلنت إدارة NBA عن خطط لتوسيع استضافة دبي لمباريات رسمية بمعدل مباراتين سنوياً ابتداءً من الموسم القادم.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[13],
    daysAgo: 17,
    metaDescription:
      "دبي تستضيف أول مباراة NBA رسمية خارج أمريكا الشمالية بين الليكرز والسيلتيكس.",
    keywords: ["NBA", "دبي", "كرة سلة", "ليكرز", "سيلتيكس"],
  },
  {
    slug: "saudi-women-football-league-launch",
    title: "انطلاق الدوري السعودي لكرة قدم السيدات بمشاركة 14 فريقاً",
    subtitle: "البطولة تنطلق رسمياً مع رعاية كبرى وعقود احترافية للاعبات",
    excerpt:
      "انطلقت رسمياً النسخة الجديدة من الدوري السعودي لكرة قدم السيدات بمشاركة 14 فريقاً ولاعبات من 25 جنسية.",
    content: `<p>أُطلقت رسمياً النسخة الجديدة من <strong>الدوري السعودي الممتاز لكرة قدم السيدات</strong> بمشاركة 14 فريقاً، في خطوة تاريخية لتطوير اللعبة في المملكة.</p>
<h2>المشاركون</h2>
<p>تضم البطولة فرقاً تابعة للأندية الكبرى بينها الهلال والنصر والاتحاد والأهلي، إلى جانب أندية متخصصة في كرة قدم السيدات.</p>
<h2>التطور</h2>
<p>قفز عدد اللاعبات المسجلات إلى أكثر من 350 لاعبة من 25 جنسية، بينهن نجمات عالميات من البرازيل وإسبانيا والولايات المتحدة.</p>
<h2>الرعاية والإيرادات</h2>
<p>وقّع الاتحاد السعودي عقد رعاية بقيمة 200 مليون ريال لمدة 4 سنوات مع إحدى الشركات الكبرى، إضافة إلى عقد بث تلفزيوني حصري.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[14],
    daysAgo: 19,
    metaDescription:
      "انطلاق الدوري السعودي لكرة قدم السيدات بمشاركة 14 فريقاً ولاعبات من 25 جنسية.",
    keywords: ["السعودية", "كرة قدم سيدات", "دوري", "رياضة نسائية", "الهلال"],
  },
  {
    slug: "olympics-2028-arab-medals-prediction",
    title: "تقرير: المنتخبات العربية مرشحة لحصد 25 ميدالية في أولمبياد لوس أنجلوس 2028",
    subtitle: "السعودية ومصر والمغرب وقطر يتصدرون قائمة المرشحين",
    excerpt:
      "تقرير تحليلي يتوقع حصد المنتخبات العربية لـ 25 ميدالية في دورة الألعاب الأولمبية المقبلة.",
    content: `<p>توقع تقرير تحليلي صادر عن <strong>اللجنة الأولمبية الدولية</strong> أن تحصد الدول العربية مجتمعة 25 ميدالية في دورة الألعاب الأولمبية الصيفية لوس أنجلوس 2028.</p>
<h2>الترشيحات حسب الدول</h2>
<ul>
<li><strong>السعودية:</strong> 6 ميداليات بينها 2 ذهبية متوقعة</li>
<li><strong>مصر:</strong> 5 ميداليات بينها 1 ذهبية</li>
<li><strong>المغرب:</strong> 4 ميداليات بينها 1 ذهبية</li>
<li><strong>قطر:</strong> 3 ميداليات</li>
<li><strong>تونس:</strong> 3 ميداليات</li>
<li><strong>الإمارات:</strong> 2 ميداليات</li>
<li><strong>الكويت والبحرين والأردن:</strong> ميدالية واحدة لكل منهم</li>
</ul>
<h2>الرياضات الواعدة</h2>
<p>تتنوع الترشيحات بين ألعاب القوى، الجوجيتسو، رفع الأثقال، الفروسية، والإسكواش، إضافة إلى التايكوندو والمصارعة.</p>
<h2>الاستعدادات</h2>
<p>أطلقت الدول العربية برامج إعداد متقدمة بميزانيات ضخمة، أبرزها برنامج "نخبتنا" السعودي الذي خُصصت له ميزانية تتجاوز مليار ريال.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: SPORTS_IMAGES[15],
    daysAgo: 22,
    metaDescription:
      "العرب مرشحون لحصد 25 ميدالية في أولمبياد لوس أنجلوس 2028 بقيادة السعودية ومصر.",
    keywords: ["أولمبياد", "2028", "العرب", "ميداليات", "السعودية"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, SPORTS_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${SPORTS_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, SPORTS_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${SPORTS_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(SPORTS_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${SPORTS_CATEGORY.nameAr} (slug: ${SPORTS_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} sports test articles...\n`);

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
      category: "Sports",
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
        originalMessage: "Seeded by seedSportsNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new sports articles.`);

  return {
    category: "Sports",
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
