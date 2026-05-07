/**
 * Seed 16 business test articles under the «أعمال» category.
 * Idempotent: skips any articles whose slug already exists.
 *
 * Usage: npx tsx server/scripts/seedBusinessNews.ts
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articles, categories, users } from "../../shared/schema";

const BUSINESS_CATEGORY = {
  nameAr: "أعمال",
  nameEn: "Business",
  slug: "business",
  description: "أخبار الأعمال والشركات وريادة الأعمال",
  color: "#10B981",
  icon: "💼",
  displayOrder: 7,
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

const BUSINESS_IMAGES = [
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1559526324-c1f275fbfa32?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1593672715438-d88a70629abe?auto=format&fit=crop&w=1600&q=80",
];

const FALLBACK_IMG = (id: number) =>
  `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80&sig=${id}`;

const ARTICLES: SeedArticle[] = [
  {
    slug: "saudi-aramco-q1-2026-record-profits",
    title: "أرامكو السعودية تُسجّل أرباحاً قياسية بـ 31 مليار دولار في الربع الأول من 2026",
    subtitle: "نمو 18% مدعوم بارتفاع أسعار النفط واستراتيجية التوسع في الغاز",
    excerpt:
      "أعلنت شركة أرامكو السعودية عن نتائج مالية قوية للربع الأول من 2026 مع زيادة في الأرباح مدفوعة بأسعار النفط.",
    content: `<p>أعلنت شركة <strong>أرامكو السعودية</strong>، أكبر شركة نفط في العالم، عن تحقيق صافي ربح بقيمة <strong>31 مليار دولار</strong> خلال الربع الأول من العام 2026.</p>
<h2>الأرقام الرئيسية</h2>
<ul>
<li>نمو الأرباح بنسبة 18% مقارنة بالربع المماثل من 2025</li>
<li>الإيرادات الإجمالية: 121 مليار دولار</li>
<li>التدفقات النقدية الحرة: 22 مليار دولار</li>
<li>توزيعات الأرباح: 31.1 مليار دولار للربع</li>
</ul>
<h2>محركات النمو</h2>
<p>أرجعت الشركة هذا الأداء القوي إلى ارتفاع متوسط أسعار النفط الخام بنسبة 12%، إلى جانب زيادة كميات الإنتاج من الغاز الطبيعي وتوسع نشاطات التكرير.</p>
<h2>المشاريع المستقبلية</h2>
<p>أكدت أرامكو على المضي قدماً في خططها لزيادة إنتاج الغاز الطبيعي بنسبة 60% بحلول 2030، مع استثمارات ضخمة في الطاقة المتجددة والهيدروجين الأخضر.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[0],
    daysAgo: 1,
    metaDescription:
      "أرامكو تُسجل أرباحاً قياسية بـ 31 مليار دولار في الربع الأول 2026 بنمو 18%.",
    keywords: ["أرامكو", "السعودية", "نفط", "أرباح", "Saudi Aramco"],
  },
  {
    slug: "pif-1-trillion-dollar-investments-2026",
    title: "صندوق الاستثمارات العامة السعودي يتجاوز تريليون دولار من الأصول",
    subtitle: "الصندوق يُصبح من بين أكبر 5 صناديق سيادية في العالم",
    excerpt:
      "تجاوزت أصول صندوق الاستثمارات العامة السعودي حاجز التريليون دولار للمرة الأولى، مع توسعات في قطاعات الرياضة والتقنية.",
    content: `<p>تجاوزت أصول <strong>صندوق الاستثمارات العامة (PIF)</strong> السعودي حاجز <strong>تريليون دولار</strong> للمرة الأولى في تاريخه، ليصبح من بين أكبر 5 صناديق سيادية في العالم.</p>
<h2>التوزيع الجغرافي</h2>
<p>يستحوذ السوق المحلي على نحو 70% من استثمارات الصندوق، فيما توزعت البقية بين الولايات المتحدة وأوروبا وآسيا.</p>
<h2>القطاعات الرئيسية</h2>
<ul>
<li>الترفيه والسياحة (نيوم، القدية، البحر الأحمر)</li>
<li>الرياضة (دوري روشن، LIV Golf)</li>
<li>التقنية (هيومن، Lucid Motors)</li>
<li>الطيران (طيران الرياض)</li>
<li>الألعاب الإلكترونية (Savvy Games Group)</li>
</ul>
<h2>الأهداف المستقبلية</h2>
<p>يستهدف الصندوق الوصول إلى 2 تريليون دولار من الأصول بحلول 2030، مع التركيز على الاستثمارات الاستراتيجية التي تدعم تنويع الاقتصاد السعودي.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[1],
    daysAgo: 2,
    metaDescription:
      "صندوق الاستثمارات العامة السعودي يتجاوز تريليون دولار ويصبح بين أكبر 5 صناديق سيادية عالمياً.",
    keywords: ["صندوق الاستثمارات العامة", "PIF", "السعودية", "صندوق سيادي", "استثمار"],
  },
  {
    slug: "uae-foreign-direct-investment-2026",
    title: "الإمارات تتصدر منطقة الشرق الأوسط في جذب الاستثمارات الأجنبية المباشرة",
    subtitle: "الاستثمارات تتجاوز 50 مليار دولار في 2025 بنمو 24% سنوياً",
    excerpt:
      "كشف تقرير أممي عن تصدر دولة الإمارات لمنطقة الشرق الأوسط في جذب الاستثمارات الأجنبية المباشرة لعام 2025.",
    content: `<p>تصدّرت دولة <strong>الإمارات العربية المتحدة</strong> منطقة الشرق الأوسط وشمال أفريقيا في جذب الاستثمارات الأجنبية المباشرة خلال عام 2025، وفقاً لتقرير الأمم المتحدة للتجارة والتنمية.</p>
<h2>الأرقام</h2>
<p>بلغت الاستثمارات المباشرة المتدفقة إلى الإمارات خلال 2025 نحو <strong>50.4 مليار دولار</strong>، بنمو 24% مقارنة بالعام السابق.</p>
<h2>القطاعات الرائدة</h2>
<ul>
<li>التكنولوجيا والذكاء الاصطناعي (32%)</li>
<li>الطاقة المتجددة (24%)</li>
<li>اللوجستيات والنقل (18%)</li>
<li>السياحة والضيافة (15%)</li>
<li>قطاعات أخرى (11%)</li>
</ul>
<h2>عوامل الجذب</h2>
<p>أرجع التقرير هذا الأداء المتميز إلى عدة عوامل، أبرزها قانون الجنسية الجديد الذي يسمح بالملكية الكاملة للأجانب، وبرامج الإقامة طويلة الأمد، إضافة إلى البنية التحتية المتطورة.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[2],
    daysAgo: 3,
    metaDescription:
      "الإمارات تتصدر الشرق الأوسط بـ 50 مليار دولار من الاستثمارات الأجنبية المباشرة في 2025.",
    keywords: ["الإمارات", "استثمار أجنبي", "FDI", "اقتصاد", "نمو"],
  },
  {
    slug: "stc-tawal-merger-mena-tower-leader",
    title: "stc وtawal تُكملان أكبر صفقة دمج في قطاع أبراج الاتصالات بالشرق الأوسط",
    subtitle: "الكيان المدمج يضم 30 ألف برج اتصالات في 7 دول",
    excerpt:
      "أكملت مجموعة stc السعودية وشركة tawal صفقة دمج تُنشئ أكبر شركة لأبراج الاتصالات في الشرق الأوسط.",
    content: `<p>أعلنت <strong>مجموعة الاتصالات السعودية (stc)</strong> عن إكمال صفقة دمج كبرى بين شركتها التابعة <strong>tawal</strong> وشركة منافسة، لتشكل أكبر شركة لأبراج الاتصالات في منطقة الشرق الأوسط وشمال أفريقيا.</p>
<h2>تفاصيل الصفقة</h2>
<p>تبلغ قيمة الصفقة <strong>14 مليار ريال</strong>، وستملك شركة stc 65% من الكيان المدمج، مع استحواذ المساهمين الآخرين على 35%.</p>
<h2>الكيان الجديد</h2>
<ul>
<li>30 ألف برج اتصالات</li>
<li>تواجد في 7 دول: السعودية، الكويت، البحرين، باكستان، البحرين، الأردن، العراق</li>
<li>إيرادات سنوية متوقعة: 6.5 مليار ريال</li>
<li>قدرة على دعم انتشار شبكات 5G و6G</li>
</ul>
<h2>الأثر</h2>
<p>تتيح هذه الصفقة لمجموعة stc تعزيز موقعها كشركة بنية تحتية رقمية عالمية، مع توقعات بطرح بعض أسهم الكيان الجديد للاكتتاب العام خلال 2027.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[3],
    daysAgo: 4,
    metaDescription:
      "stc وtawal تكملان دمجاً بـ 14 مليار ريال لإنشاء أكبر شركة أبراج اتصالات بالشرق الأوسط.",
    keywords: ["stc", "tawal", "اتصالات", "السعودية", "أبراج"],
  },
  {
    slug: "noon-amazon-mena-ecommerce-competition",
    title: "نون وأمازون يتصارعان للسيطرة على سوق التجارة الإلكترونية في الشرق الأوسط",
    subtitle: "حجم السوق يتجاوز 100 مليار دولار سنوياً بنمو 18%",
    excerpt:
      "تشتد المنافسة بين منصتي نون وأمازون للسيطرة على سوق التجارة الإلكترونية في المنطقة.",
    content: `<p>تشتد المنافسة بين <strong>نون</strong> الإماراتية و<strong>أمازون</strong> العالمية للسيطرة على سوق التجارة الإلكترونية في منطقة الشرق الأوسط الذي تجاوز <strong>100 مليار دولار</strong> سنوياً.</p>
<h2>حصة السوق</h2>
<p>تستحوذ أمازون على نحو 38% من السوق، تليها نون بـ 32%، فيما توزع باقي السوق على عدة منصات إقليمية مثل Sharaf DG وCarrefour.</p>
<h2>استراتيجيات التوسع</h2>
<p>تستثمر نون بكثافة في خدمات التوصيل السريع وتوسيع مراكز الفرز، فيما تركز أمازون على الخدمات الاحترافية للبائعين وبرنامج Prime.</p>
<h2>قطاع البقالة</h2>
<p>تُعد التجارة الإلكترونية للبقالة الجبهة الأكثر سخونة، حيث تنافس "نون مينتس" منصتي "أمازون فريش" و"كاريفور".</p>
<h2>التوقعات</h2>
<p>يُتوقع أن يصل حجم السوق إلى 200 مليار دولار بحلول 2030 مدفوعاً بزيادة معدلات استخدام الإنترنت والثقة في التسوق الإلكتروني.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[4],
    daysAgo: 5,
    metaDescription:
      "نون وأمازون يتنافسان على سوق التجارة الإلكترونية بالشرق الأوسط بحجم يتجاوز 100 مليار دولار.",
    keywords: ["نون", "أمازون", "تجارة إلكترونية", "noon", "Amazon"],
  },
  {
    slug: "saudi-startups-funding-record-q1-2026",
    title: "الشركات الناشئة السعودية تُحطّم رقماً قياسياً بجمع 1.2 مليار دولار في الربع الأول",
    subtitle: "صفقات قياسية في FinTech وHealthTech تقود النمو",
    excerpt:
      "حصدت الشركات الناشئة السعودية تمويلاً قياسياً يتجاوز 1.2 مليار دولار خلال الربع الأول من 2026.",
    content: `<p>سجّل قطاع <strong>الشركات الناشئة في المملكة العربية السعودية</strong> رقماً قياسياً جديداً بجمعه <strong>1.2 مليار دولار</strong> من التمويل خلال الربع الأول من العام 2026.</p>
<h2>الأبرز</h2>
<ul>
<li><strong>Tabby:</strong> 250 مليون دولار في جولة Series F</li>
<li><strong>STC Pay:</strong> 200 مليون دولار</li>
<li><strong>Tamara:</strong> 180 مليون دولار</li>
<li><strong>Foodics:</strong> 120 مليون دولار</li>
<li><strong>Lean Technologies:</strong> 90 مليون دولار</li>
</ul>
<h2>القطاعات الرائدة</h2>
<p>تصدّرت قطاعات التكنولوجيا المالية (FinTech) قائمة الأكثر استقطاباً للتمويل بنسبة 45%، تليها قطاعات الصحة الرقمية (HealthTech) واللوجستيات.</p>
<h2>المستثمرون</h2>
<p>شارك في الجولات صناديق استثمارية كبرى من السعودية والإمارات والولايات المتحدة، أبرزها صندوق سنابل وArbor Ventures وSequoia.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[5],
    daysAgo: 6,
    metaDescription:
      "الشركات الناشئة السعودية تجمع 1.2 مليار دولار في الربع الأول من 2026 بقيادة FinTech.",
    keywords: ["شركات ناشئة", "السعودية", "FinTech", "تمويل", "Tabby"],
  },
  {
    slug: "emirates-airline-largest-aircraft-order",
    title: "طيران الإمارات تُعلن عن أكبر صفقة طائرات في تاريخ الطيران المدني",
    subtitle: "الصفقة تتضمن 250 طائرة بوينج 777X و100 طائرة إيرباص A350",
    excerpt:
      "أعلنت طيران الإمارات عن صفقة تاريخية لشراء 350 طائرة جديدة بقيمة تتجاوز 100 مليار دولار.",
    content: `<p>أعلنت شركة <strong>طيران الإمارات</strong> عن إبرام أكبر صفقة شراء طائرات في تاريخ الطيران المدني، بقيمة إجمالية تتجاوز <strong>100 مليار دولار</strong>.</p>
<h2>تفاصيل الصفقة</h2>
<ul>
<li>250 طائرة بوينج 777X (قيمة 75 مليار دولار)</li>
<li>100 طائرة إيرباص A350-1000 (قيمة 32 مليار دولار)</li>
<li>عقود صيانة وتدريب لمدة 25 عاماً</li>
</ul>
<h2>التوسع المرتقب</h2>
<p>تُمكّن هذه الطائرات شركة طيران الإمارات من توسيع شبكتها لتشمل 250 وجهة عالمية بحلول 2032، بزيادة عن 145 وجهة حالياً.</p>
<h2>الأثر الاقتصادي</h2>
<p>صرّح الرئيس التنفيذي للناقلة بأن الصفقة ستُسهم في خلق أكثر من 50 ألف وظيفة جديدة في الإمارات والدول المصنّعة، إضافة إلى تعزيز موقع دبي مركزاً عالمياً للطيران.</p>`,
    newsType: "breaking",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[6],
    daysAgo: 7,
    metaDescription:
      "طيران الإمارات تُعلن أكبر صفقة طائرات بقيمة 100 مليار دولار لشراء 350 طائرة.",
    keywords: ["طيران الإمارات", "بوينج", "إيرباص", "دبي", "طيران"],
  },
  {
    slug: "neom-the-line-progress-2026-update",
    title: "نيوم تكشف عن تقدم ملموس في «ذا لاين» وافتتاح أول حي سكني نهاية 2026",
    subtitle: "الحي يستوعب 50 ألف ساكن ويمتد على 5 كم",
    excerpt:
      "كشفت إدارة نيوم عن تقدم كبير في تنفيذ مشروع «ذا لاين»، مع جاهزية أول حي سكني للافتتاح نهاية 2026.",
    content: `<p>أعلنت إدارة <strong>نيوم</strong> عن تحقيق تقدم كبير في تنفيذ المشروع العملاق <strong>«ذا لاين»</strong>، مع جاهزية الحي السكني الأول للافتتاح نهاية 2026.</p>
<h2>الحي الأول</h2>
<ul>
<li>الطول: 5 كم من المدينة الخطية</li>
<li>الطاقة الاستيعابية: 50 ألف ساكن</li>
<li>المساكن: 12 ألف وحدة سكنية متنوعة</li>
<li>المرافق: مدارس، مستشفى، مراكز تسوق، حدائق عامة</li>
</ul>
<h2>الحياة في «ذا لاين»</h2>
<p>تعتمد المدينة على نظام نقل عمودي متطور باستخدام مصاعد فائقة السرعة، بحيث لا تستغرق التنقلات داخل الحي أكثر من 5 دقائق.</p>
<h2>الاستدامة</h2>
<p>تعمل المدينة بالكامل على الطاقة المتجددة، مع نظام إعادة تدوير شامل للمياه والمخلفات، ومستهدفات صفرية للانبعاثات الكربونية.</p>
<h2>المرحلة الثانية</h2>
<p>من المقرر أن يبدأ العمل على الأحياء التالية بداية 2027، بهدف الوصول إلى استيعاب مليون ساكن بحلول 2030.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[7],
    daysAgo: 8,
    metaDescription:
      "نيوم تستعد لافتتاح أول حي في «ذا لاين» نهاية 2026 يستوعب 50 ألف ساكن.",
    keywords: ["نيوم", "ذا لاين", "السعودية", "NEOM", "The Line"],
  },
  {
    slug: "qatar-energy-lng-expansion-deal",
    title: "قطر للطاقة توقّع صفقة قياسية لتوريد الغاز المسال لأوروبا لمدة 27 عاماً",
    subtitle: "الاتفاقية الجديدة تُعزز موقع قطر كأكبر مصدّر للغاز المسال في العالم",
    excerpt:
      "وقّعت قطر للطاقة عقداً تاريخياً لتوريد 7.5 مليون طن سنوياً من الغاز الطبيعي المسال لدول أوروبية لمدة 27 عاماً.",
    content: `<p>وقّعت <strong>قطر للطاقة</strong> عقداً قياسياً لتوريد <strong>7.5 مليون طن سنوياً</strong> من الغاز الطبيعي المسال (LNG) لعدد من الدول الأوروبية لمدة 27 عاماً.</p>
<h2>تفاصيل العقد</h2>
<p>يُغطي العقد إمدادات لشركات في ألمانيا وفرنسا وإيطاليا وهولندا، بقيمة إجمالية تتجاوز 70 مليار دولار.</p>
<h2>التوسعات في الإنتاج</h2>
<p>يأتي العقد في إطار مشروع توسعة حقل الشمال الذي سيرفع الطاقة الإنتاجية لقطر من الغاز المسال من 77 إلى 142 مليون طن سنوياً بحلول 2030.</p>
<h2>الأهمية الاستراتيجية</h2>
<p>تُعزز هذه الصفقة موقع قطر كأكبر مُصدّر للغاز المسال في العالم، وتُسهم في تنويع مصادر الطاقة الأوروبية بعيداً عن الاعتماد على روسيا.</p>
<h2>التحدي البيئي</h2>
<p>وعدت قطر بأن جميع الإمدادات ستلتزم بمعايير الانبعاثات المنخفضة، مع استثمارات في تقنيات احتجاز الكربون.</p>`,
    newsType: "featured",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[8],
    daysAgo: 9,
    metaDescription:
      "قطر للطاقة توقّع عقداً بـ 70 مليار دولار لتوريد الغاز المسال لأوروبا لمدة 27 عاماً.",
    keywords: ["قطر للطاقة", "غاز مسال", "LNG", "أوروبا", "قطر"],
  },
  {
    slug: "egypt-stock-exchange-record-trading-volume",
    title: "البورصة المصرية تُسجّل أعلى حجم تداول يومي في تاريخها",
    subtitle: "حجم التداول يتجاوز 12 مليار جنيه مدفوعاً بإصلاحات اقتصادية",
    excerpt:
      "حققت البورصة المصرية رقماً قياسياً جديداً بحجم تداول يومي تجاوز 12 مليار جنيه.",
    content: `<p>سجّلت <strong>البورصة المصرية</strong> رقماً قياسياً جديداً في حجم التداول اليومي، إذ تجاوز إجمالي التعاملات حاجز <strong>12 مليار جنيه</strong> في جلسة واحدة.</p>
<h2>الأسباب</h2>
<p>أرجع المحللون هذا الانتعاش إلى مزيج من العوامل، بينها الإصلاحات الاقتصادية الأخيرة، وانخفاض معدلات التضخم، إضافة إلى صفقات طروحات حكومية ناجحة.</p>
<h2>الأسهم الأكثر ارتفاعاً</h2>
<ul>
<li>البنك التجاري الدولي (CIB) +5.2%</li>
<li>طلعت مصطفى القابضة +4.8%</li>
<li>السويدي إليكتريك +4.1%</li>
<li>المجموعة المالية هيرميس +3.7%</li>
</ul>
<h2>المؤشر الرئيسي</h2>
<p>قفز مؤشر EGX30 بنسبة 2.3% ليصل إلى أعلى مستوى له خلال 5 سنوات، مع توقعات بمواصلة الارتفاع خلال الأشهر القادمة.</p>
<h2>الاستثمار الأجنبي</h2>
<p>سجّل المستثمرون الأجانب صافي شراء بنحو 850 مليون جنيه في الجلسة، وهو ما يعكس تحسن ثقة الأسواق العالمية في الاقتصاد المصري.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[9],
    daysAgo: 10,
    metaDescription:
      "البورصة المصرية تسجل أعلى حجم تداول يومي في تاريخها بـ 12 مليار جنيه.",
    keywords: ["البورصة المصرية", "EGX", "اقتصاد", "مصر", "تداول"],
  },
  {
    slug: "kuwait-investment-authority-tech-portfolio",
    title: "الهيئة العامة للاستثمار الكويتية تُضاعف استثماراتها التقنية بـ 25 مليار دولار",
    subtitle: "تركيز على الذكاء الاصطناعي وأشباه الموصلات والبنية التحتية الرقمية",
    excerpt:
      "أعلنت الهيئة العامة للاستثمار الكويتية عن خطة لمضاعفة محفظتها التقنية إلى 25 مليار دولار.",
    content: `<p>أعلنت <strong>الهيئة العامة للاستثمار الكويتية (KIA)</strong>، إحدى أقدم الصناديق السيادية في العالم، عن خطة لمضاعفة استثماراتها في قطاع التكنولوجيا لتصل إلى <strong>25 مليار دولار</strong> خلال السنوات الثلاث المقبلة.</p>
<h2>محاور الاستثمار</h2>
<ul>
<li>الذكاء الاصطناعي والحوسبة السحابية (40%)</li>
<li>أشباه الموصلات (25%)</li>
<li>البنية التحتية الرقمية (20%)</li>
<li>التكنولوجيا الحيوية (15%)</li>
</ul>
<h2>الشراكات</h2>
<p>أعلنت الهيئة عن شراكات مع صناديق استثمار كبرى في وادي السيليكون، إضافة إلى استثمارات مباشرة في شركات تقنية رائدة بينها OpenAI وAnthropic وNvidia.</p>
<h2>الأهداف</h2>
<p>تستهدف الهيئة تحقيق عوائد تتجاوز 12% سنوياً من المحفظة التقنية، مع تركيز على الأصول طويلة الأجل في قطاعات المستقبل.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[10],
    daysAgo: 12,
    metaDescription:
      "الهيئة العامة للاستثمار الكويتية تضاعف محفظتها التقنية إلى 25 مليار دولار.",
    keywords: ["الكويت", "هيئة الاستثمار", "تقنية", "صندوق سيادي", "KIA"],
  },
  {
    slug: "careem-uber-mena-merger-deal",
    title: "كريم وأوبر تُعيدان هيكلة عملياتهما في المنطقة بصفقة 5 مليار دولار",
    subtitle: "كريم تستحوذ على عمليات أوبر للتوصيل في الشرق الأوسط",
    excerpt:
      "أعلنت كريم وأوبر عن إعادة هيكلة شراكتهما في المنطقة بصفقة كبرى تشمل توزيع الأنشطة بين الطرفين.",
    content: `<p>أعلنت كل من <strong>كريم</strong> و<strong>أوبر</strong> عن إعادة هيكلة شاملة لعملياتهما في منطقة الشرق الأوسط ضمن صفقة بقيمة <strong>5 مليارات دولار</strong>.</p>
<h2>تفاصيل الصفقة</h2>
<ul>
<li>كريم تستحوذ على عمليات Uber Eats في 12 دولة</li>
<li>أوبر تستحوذ على نشاط نقل الركاب في كريم في باكستان</li>
<li>تأسيس مشروع مشترك للتوصيل اللحظي للبضائع</li>
</ul>
<h2>الاستراتيجية</h2>
<p>تهدف الصفقة إلى تعزيز موقع كريم كـ "السوبر آب" الرائد في المنطقة، فيما تُركّز أوبر على عمليات نقل الركاب وLogistics.</p>
<h2>الأثر على المستخدمين</h2>
<p>أكدت الشركتان أن المستخدمين لن يتأثروا بالصفقة، مع الحفاظ على نفس مستوى الخدمات والأسعار في المرحلة الأولى.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[11],
    daysAgo: 13,
    metaDescription:
      "كريم وأوبر تُعيدان هيكلة عملياتهما بصفقة 5 مليار دولار في الشرق الأوسط.",
    keywords: ["كريم", "أوبر", "Careem", "Uber", "صفقات"],
  },
  {
    slug: "bahrain-fintech-bay-300-startups",
    title: "Bahrain FinTech Bay يحتضن أكثر من 300 شركة ناشئة من 60 جنسية",
    subtitle: "البحرين تترسخ كمركز إقليمي رائد للتكنولوجيا المالية",
    excerpt:
      "كشف مركز Bahrain FinTech Bay عن تجاوز عدد الشركات الناشئة المحتضنة 300 شركة من 60 جنسية مختلفة.",
    content: `<p>أعلن مركز <strong>Bahrain FinTech Bay</strong> عن تجاوز عدد الشركات الناشئة في مجال التكنولوجيا المالية المحتضنة فيه أكثر من <strong>300 شركة</strong> من 60 جنسية مختلفة.</p>
<h2>التنوع</h2>
<p>تتنوع الشركات بين متخصصة في الدفع الإلكتروني، وتطبيقات إدارة الثروات، والتأمين الرقمي (InsurTech)، والتمويل اللامركزي (DeFi).</p>
<h2>التمويل</h2>
<p>حصلت الشركات المحتضنة على تمويلات تتجاوز <strong>2 مليار دولار</strong> منذ تأسيس المركز عام 2018، مع توقعات بمضاعفة هذا الرقم خلال 3 سنوات.</p>
<h2>البيئة التنظيمية</h2>
<p>يعتبر مصرف البحرين المركزي من أوائل الجهات التي أطلقت "صندوق رقابي" (Regulatory Sandbox) للسماح للشركات الناشئة باختبار حلولها بأمان.</p>
<h2>التوجه المستقبلي</h2>
<p>يستهدف المركز جذب 500 شركة بحلول 2027، مع تركيز خاص على الذكاء الاصطناعي في الخدمات المالية.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[12],
    daysAgo: 14,
    metaDescription:
      "Bahrain FinTech Bay يحتضن 300 شركة ناشئة من 60 جنسية بتمويل يتجاوز 2 مليار دولار.",
    keywords: ["البحرين", "FinTech", "تكنولوجيا مالية", "شركات ناشئة", "مصرف البحرين المركزي"],
  },
  {
    slug: "oman-tourism-investment-billion-dollar",
    title: "سلطنة عُمان تستقطب استثمارات سياحية بقيمة 5 مليارات دولار خلال عام واحد",
    subtitle: "مشاريع فندقية وترفيهية كبرى في مسقط وصلالة والبستان",
    excerpt:
      "كشفت وزارة التراث والسياحة العُمانية عن استقطاب استثمارات سياحية ضخمة خلال عام 2025.",
    content: `<p>كشفت وزارة التراث والسياحة في <strong>سلطنة عُمان</strong> عن استقطاب استثمارات سياحية بقيمة <strong>5 مليارات دولار</strong> خلال عام 2025، في إطار رؤية «عُمان 2040».</p>
<h2>المشاريع الكبرى</h2>
<ul>
<li>منتجع سياحي متكامل في صلالة بقيمة 1.2 مليار دولار</li>
<li>توسعة فندق "البستان بالاس" بقيمة 800 مليون دولار</li>
<li>مشروع مدينة "خزائن" الترفيهية بقيمة 1.5 مليار دولار</li>
<li>مرافق سياحية بيئية في جبل أخضر بقيمة 600 مليون دولار</li>
</ul>
<h2>الأرقام السياحية</h2>
<p>استقبلت السلطنة في 2025 نحو 4.2 مليون سائح بنمو 22% على أساس سنوي، مع إيرادات قطاع السياحة التي تجاوزت 3.5 مليار ريال عُماني.</p>
<h2>المستهدفات</h2>
<p>تستهدف عُمان الوصول إلى 10 ملايين سائح سنوياً بحلول 2040، مع رفع مساهمة القطاع في الناتج المحلي إلى 10%.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[13],
    daysAgo: 16,
    metaDescription:
      "عُمان تستقطب 5 مليارات دولار استثمارات سياحية في 2025 وتستهدف 10 ملايين سائح بحلول 2040.",
    keywords: ["عُمان", "سياحة", "استثمار", "صلالة", "مسقط"],
  },
  {
    slug: "lulu-ipo-record-mena-2026",
    title: "اللولو تطرح 25% من أسهمها في طرح عام يحطّم أرقاماً قياسية",
    subtitle: "الاكتتاب يجمع 4 مليار دولار ويُغطّى 24 مرة",
    excerpt:
      "حققت مجموعة اللولو الإماراتية اكتتاباً قياسياً في طرحها العام الأولي بسوق أبوظبي للأوراق المالية.",
    content: `<p>حققت <strong>مجموعة اللولو</strong>، إحدى أكبر شركات تجارة التجزئة في المنطقة، اكتتاباً تاريخياً في طرحها العام الأولي (IPO) بسوق أبوظبي للأوراق المالية.</p>
<h2>أرقام قياسية</h2>
<ul>
<li>الأسهم المطروحة: 25% من رأس المال</li>
<li>قيمة الاكتتاب: 4 مليار دولار</li>
<li>التغطية: 24 ضعفاً للأسهم المطروحة</li>
<li>القيمة السوقية للشركة بعد الطرح: 16 مليار دولار</li>
</ul>
<h2>قائمة المكتتبين</h2>
<p>شملت قائمة المكتتبين المؤسسيين صناديق سيادية كبرى من المنطقة وآسيا، إضافة إلى مستثمرين أفراد من الإمارات والسعودية وعُمان وقطر والكويت.</p>
<h2>خطط التوسع</h2>
<p>تخطط مجموعة اللولو لاستخدام عائدات الاكتتاب في تمويل توسعها بافتتاح 50 فرعاً جديداً في الشرق الأوسط وآسيا خلال 4 سنوات.</p>
<h2>أكبر طرح في 2026</h2>
<p>يعتبر هذا الطرح هو الأكبر في منطقة الشرق الأوسط منذ بداية 2026، متجاوزاً طروحات سابقة في كل من السعودية ومصر.</p>`,
    newsType: "featured",
    isFeatured: true,
    imageUrl: BUSINESS_IMAGES[14],
    daysAgo: 18,
    metaDescription:
      "اللولو تحقق اكتتاباً قياسياً بـ 4 مليار دولار وتُغطى 24 مرة في أكبر طرح بالشرق الأوسط 2026.",
    keywords: ["اللولو", "Lulu", "اكتتاب", "أبوظبي", "IPO"],
  },
  {
    slug: "jordan-renewable-energy-investments",
    title: "الأردن يقفز إلى المركز الثالث عربياً في الاستثمارات بالطاقة المتجددة",
    subtitle: "30% من الكهرباء المنتجة محلياً تأتي من مصادر متجددة",
    excerpt:
      "حقق الأردن قفزة نوعية في قطاع الطاقة المتجددة ليحتل المركز الثالث عربياً بعد المغرب والإمارات.",
    content: `<p>قفز <strong>الأردن</strong> إلى المركز الثالث عربياً في حجم الاستثمارات في قطاع الطاقة المتجددة، بعد المغرب والإمارات، وفقاً لتقرير الوكالة الدولية للطاقة المتجددة (IRENA).</p>
<h2>الإنجازات</h2>
<ul>
<li>30% من الكهرباء المُنتَجة من مصادر متجددة</li>
<li>2.5 جيجاواط طاقة شمسية وريحية مركبة</li>
<li>استثمارات تتجاوز 8 مليارات دولار خلال 10 سنوات</li>
<li>توفير 25% من فاتورة استيراد الطاقة</li>
</ul>
<h2>المشاريع البارزة</h2>
<p>يضم الأردن عدداً من أكبر مشاريع الطاقة المتجددة بالمنطقة، أبرزها مجمع شمس معان للطاقة الشمسية، ومشروع الطفيلة لطاقة الرياح.</p>
<h2>الرؤية المستقبلية</h2>
<p>يستهدف الأردن الوصول إلى 50% من إنتاج الكهرباء من المصادر المتجددة بحلول 2030، مع خطط لتصدير الكهرباء النظيفة إلى دول الجوار.</p>`,
    newsType: "regular",
    isFeatured: false,
    imageUrl: BUSINESS_IMAGES[15],
    daysAgo: 21,
    metaDescription:
      "الأردن في المركز الثالث عربياً بالطاقة المتجددة و30% من الكهرباء من مصادر نظيفة.",
    keywords: ["الأردن", "طاقة متجددة", "طاقة شمسية", "IRENA", "كهرباء"],
  },
];

async function ensureCategory(): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, BUSINESS_CATEGORY.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  ↳ Found existing category: ${BUSINESS_CATEGORY.nameAr}`);
    return existing[0].id;
  }

  const existingByName = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameAr, BUSINESS_CATEGORY.nameAr))
    .limit(1);

  if (existingByName.length > 0) {
    console.log(`  ↳ Found existing category by name: ${BUSINESS_CATEGORY.nameAr}`);
    return existingByName[0].id;
  }

  const [created] = await db
    .insert(categories)
    .values(BUSINESS_CATEGORY)
    .returning({ id: categories.id });

  console.log(`  ✅ Created category: ${BUSINESS_CATEGORY.nameAr} (slug: ${BUSINESS_CATEGORY.slug})`);
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
  console.log(`🌱 Seeding ${ARTICLES.length} business test articles...\n`);

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
      category: "Business",
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
        originalMessage: "Seeded by seedBusinessNews.ts",
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

  console.log(`\n🎉 Done. Inserted ${inserted.length} new business articles.`);

  return {
    category: "Business",
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
