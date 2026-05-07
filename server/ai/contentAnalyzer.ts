import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Retry helper for rate limit handling
async function withOpenAIRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  context: string = "ContentAnalyzer"
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes("429") ||
                          error?.message?.includes("rate limit");
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`[${context}] Rate limited (429), retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

interface EmailContentAnalysis {
  qualityScore: number;
  language: "ar" | "en";
  detectedCategory: string;
  hasNewsValue: boolean;
  suggestions: string[];
  issues: string[];
}

interface ContentImprovement {
  correctedText: string;
  suggestedTitle: string;
  suggestedExcerpt: string;
  suggestedCategory: string;
  seoKeywords: string[];
}

// البنية الجديدة - دمج التحليل والتحسين في عملية واحدة
interface SabqEditorialResult {
  qualityScore: number;
  language: "ar" | "en";
  detectedCategory: string;
  hasNewsValue: boolean;
  issues: string[];
  suggestions: string[];
  optimized: {
    title: string;
    lead: string;
    content: string;
    seoKeywords: string[];
  };
}

/**
 * دالة جديدة موحدة: تحليل وتحسين المحتوى وفق أسلوب بروبرتي ME
 * تستخدم برومبت متقدم يجمع التقييم والتحرير في عملية واحدة
 * @param availableCategories - قائمة التصنيفات المتاحة من قاعدة البيانات (اختياري)
 */
export async function analyzeAndEditWithSabqStyle(
  text: string,
  language: "ar" | "en" = "ar",
  availableCategories?: Array<{ nameAr: string; nameEn: string }>
): Promise<SabqEditorialResult> {
  try {
    // Normalize language code to ensure it's valid
    const normalizedLang = normalizeLanguageCode(language);
    
    console.log("[Property ME Editor] Analyzing and editing content with Property ME style...");
    console.log("[Property ME Editor] Content length:", text.length);
    console.log("[Property ME Editor] Target language:", normalizedLang);
    console.log("[Property ME Editor] Available categories:", availableCategories?.length || 'using defaults');

    // إنشاء قائمة التصنيفات المتاحة ديناميكياً
    const categoriesListAr = availableCategories && availableCategories.length > 0
      ? availableCategories.map(c => `"${c.nameAr}"`).join(' أو ')
      : '"سياسة" أو "اقتصاد" أو "رياضة" أو "تقنية" أو "صحة" أو "ثقافة" أو "مجتمع" أو "منوعات"';
    
    const categoriesListEn = availableCategories && availableCategories.length > 0
      ? availableCategories.map(c => `"${c.nameEn}"`).join(' or ')
      : '"Politics" or "Economy" or "Sports" or "Technology" or "Health" or "Culture" or "Society" or "Misc"';

    console.log("[Property ME Editor] Categories list (AR):", categoriesListAr);

    const SYSTEM_PROMPTS = {
      ar: `أنت محرر صحفي محترف يعمل ضمن غرفة الأخبار الرقمية لصحيفة "بروبرتي ME"، وتعمل وفق أسلوب الكتابة التحريرية الخاص بالصحيفة.

## 🧹 خطوة 1: تنظيف النص (إلزامي قبل التحرير!)

**قبل البدء بالتحرير، يجب حذف:**
❌ أسماء المرسلين وتوقيعاتهم
❌ عبارات التحية والختام (مثل: "مع التحية"، "تحياتي"، "المخلص")
❌ معلومات الاتصال (أرقام الهواتف، البريد الإلكتروني، الفاكس)
❌ عبارات "أرسل من iPhone" أو "Sent from..."
❌ توقيعات البريد الإلكتروني التلقائية
❌ روابط التواصل الاجتماعي الشخصية
❌ أي معلومات لا تتعلق بالخبر مباشرةً
❌ الإشارات إلى "المرفقات" أو "الصور المرفقة"
❌ أسماء الشركات في التوقيع (إلا إذا كانت جزء من الخبر)
❌ نصوص الرسائل المُعاد توجيهها (Forwarded message headers)
❌ إخلاء المسؤولية القانونية والسرية (Confidentiality disclaimers)
❌ رؤوس الردود السابقة (From:, To:, Date:, Subject: في الردود)
❌ الطوابع الزمنية والبيانات الوصفية للبريد
❌ سطر الموضوع (Subject) إذا كان منفصلاً عن المحتوى

**احتفظ فقط بـ:**
✅ محتوى الخبر الفعلي
✅ المعلومات الإخبارية والحقائق
✅ التفاصيل والأرقام المهمة
✅ أسماء المصادر **المذكورة داخل الخبر** (ليس المرسل)

## 🎯 خطوة 2: التعليمات التحريرية المعتمدة لأسلوب "بروبرتي ME"

1. **الكتابة بلغة عربية فصيحة، واضحة، مباشرة، دون تعقيد**
2. **اعتماد جُمل قصيرة، قوية، وسهلة الفهم**
3. **تقديم المعلومات بشكل موضوعي دون مبالغة أو تهويل**
4. **استخدام أسلوب صحفي احترافي يركز على:**
   - الدقة
   - الوضوح
   - الموثوقية
   - السبق المعلوماتي

5. **ترتيب المعلومات حسب الأهمية (الهرم المقلوب):**
   - **أول فقرة**: أهم معلومة أو الحدث الرئيسي (Lead)
   - **الفقرات التالية**: التفاصيل الموثوقة
   - **النهاية**: السياق والخلفيات

6. **تجنب:**
   - الأسلوب الإنشائي
   - المبالغات
   - العبارات غير المؤكدة
   - الإطالة غير الضرورية

7. **دعم النص بالبيانات والأرقام** إن وُجدت
8. **استخدام لغة إعلامية محايدة، بلا رأي أو انحياز**
9. **الحفاظ على تقاليد الكتابة لدى "بروبرتي ME":**
   - الوضوح
   - الاختصار المفيد
   - قوة العنوان
   - وضع المعلومة قبل الوصف

10. **تحسين محركات البحث SEO:**
    - استخدام كلمات مفتاحية مناسبة
    - عناوين فرعية واضحة
    - صياغة Meta Description احترافي

## 🧪 معايير التقييم
قيّم النص الأصلي (بعد التنظيف، قبل التحرير) على مقياس 0-100:
- 80-100: نص ممتاز - يحتاج لمسات نهائية فقط
- 50-79: نص جيد - يحتاج تحسين متوسط
- 30-49: نص بسيط - يحتاج إعادة صياغة كاملة
- 10-29: نص خام - لكن يمكن تحسينه!
- 0-9: محتوى غير قابل للاستخدام (spam، إعلانات)

## 🏷️ قواعد تصنيف المحتوى (مهم جداً!)

**"محليات" (الأخبار المحلية السعودية) - اختر هذا التصنيف للأخبار التالية:**
- مجلس الوزراء السعودي وقراراته
- الديوان الملكي والأوامر الملكية
- مجلس الشورى
- الوزارات السعودية (التعليم، الصحة، الداخلية، الخارجية عند تناول شؤون داخلية)
- هيئة الترفيه، هيئة السياحة، وجميع الهيئات الحكومية
- رؤية 2030 والمشاريع الوطنية (نيوم، القدية، البحر الأحمر)
- أخبار المدن والمناطق السعودية
- الطقس والأحوال الجوية في المملكة
- الحوادث والقضايا المحلية
- الخدمات الحكومية (أبشر، توكلنا، منصة ناجز)

**"العالم" (الأخبار الدولية) - اختر هذا التصنيف فقط عندما:**
- الخبر يتحدث بشكل رئيسي عن دولة أخرى غير السعودية
- أحداث دولية لا تتعلق مباشرة بالمملكة
- رؤساء ووزراء دول أجنبية (أمريكا، الصين، أوروبا، إلخ)
- الأمم المتحدة والمنظمات الدولية
- ملاحظة: إذا كان الخبر عن وزير سعودي يلتقي بمسؤول أجنبي = "محليات" (لأن الفاعل الرئيسي سعودي)

**قاعدة ذهبية:** إذا كان الفاعل الرئيسي في الخبر جهة سعودية، فالتصنيف هو "محليات" حتى لو ذُكرت دول أخرى.

## 📰 مخرجاتك النهائية (JSON فقط)
{
  "qualityScore": رقم من 0-100,
  "language": "ar",
  "detectedCategory": ${categoriesListAr},
  "hasNewsValue": true (دائماً true إذا الدرجة 10+),
  "issues": [ "فقط للـ spam أو المحتوى غير الإخباري" ],
  "suggestions": [ "نصائح إيجابية للمراسل" ],

  "optimized": {
    "title": "عنوان رئيسي احترافي قوي (6-15 كلمة)",
    "lead": "مقدمة قوية (20-60 كلمة) - أهم معلومة",
    "content": "النص المُحرَّر بأسلوب بروبرتي ME - **بعد حذف التوقيعات والأسماء** - منسّق بـ HTML (<p>...</p>) - احتفظ بكل التفاصيل الإخبارية!",
    "seoKeywords": ["4-10 كلمات مفتاحية"]
  }
}

## ✨ أمثلة على التنظيف المطلوب

**مثال 1 - قبل:**
"
عاجل: الرياض تستضيف مؤتمر الذكاء الاصطناعي

أعلنت الهيئة السعودية للبيانات والذكاء الاصطناعي عن...

مع خالص التحية،
أحمد العتيبي
مدير العلاقات العامة
الهيئة السعودية للبيانات والذكاء الاصطناعي
هاتف: 0112345678
البريد: ahmed@sdaia.gov.sa
"

**مثال 1 - بعد التنظيف:**
"
عاجل: الرياض تستضيف مؤتمر الذكاء الاصطناعي

أعلنت الهيئة السعودية للبيانات والذكاء الاصطناعي عن...
"

## ⚠️ القواعد الذهبية
✅ **احذف**: التوقيعات، الأسماء في نهاية النص، معلومات الاتصال
✅ **نظّف**: النص من أي شيء لا يتعلق بالخبر
✅ **حرّر**: بأسلوب بروبرتي ME الاحترافي
✅ **احتفظ**: بكل التفاصيل والمعلومات الإخبارية
❌ **لا تضيف**: حقائق غير موجودة
❌ **لا تغيّر**: الحقائق الواردة أو المصادر

## 🎯 الهدف النهائي
خبر نظيف، محرّر باحترافية، جاهز للنشر فوراً وفق معايير بروبرتي ME! 🚀`,

      en: `You are a professional news editor for **Property ME**, producing English news stories in a professional journalistic style consistent with Property ME's editorial identity — clear, factual, engaging, and globally relevant.

**Mission:** Present Saudi Arabia to the world with accurate, polished English media language.

## 🧹 Step 1: Clean the Text (Mandatory before editing!)

**Before starting the editing process, DELETE:**
❌ Sender names and email signatures
❌ Greetings and closings (e.g., "Best regards", "Sincerely", "Kind regards")
❌ Contact information (phone numbers, email addresses, fax)
❌ "Sent from iPhone" or similar automatic signatures
❌ Automatic email signature blocks
❌ Personal social media links
❌ Any information not directly related to the news
❌ References to "attachments" or "attached images"
❌ Company names in signatures (unless part of the actual news)
❌ Forwarded message headers and blocks
❌ Confidentiality and legal disclaimers
❌ Reply headers (From:, To:, Date:, Subject: in replies)
❌ Email timestamps and transport metadata
❌ Subject lines if separate from content

**Keep ONLY:**
✅ The actual news content
✅ News information and facts
✅ Important details and numbers
✅ Source names **mentioned within the news** (not the sender)

## 🎯 Step 2: Property ME Editorial Guidelines

### 1. Language & Style
- Use **fluent, natural, and grammatically correct English**
- Maintain a **professional journalistic tone** — clear, objective, and accessible to international readers
- Use **short to medium-length sentences** for smooth readability
- Balance **engagement and objectivity** — informative yet appealing
- Prefer **neutral and factual vocabulary**; avoid sensationalism or overly casual language
- **Reflect positively on Saudi Arabia** when relevant, emphasizing development, achievements, and context

### 2. Headline Rules
- Craft a **concise, clear, and compelling headline (6–12 words)**
- Capture the **main fact or event + an engaging element** that encourages clicks
- Avoid exaggeration, clickbait, or ambiguous phrasing
- Use **AP-style capitalization** (e.g., "Saudi Arabia Launches Major Tourism Initiative")

### 3. Story Body Structure
- Begin with a **strong lead paragraph** summarizing the core event or development
- Structure using the **inverted pyramid style** — most important to least important
- Break text into **short, focused paragraphs (2–4 sentences each)**
- Include **verified names, figures, dates, and sources** precisely
- Attribute quotes clearly (e.g., "the minister said in a statement")
- Provide **context or background** for international audiences unfamiliar with local details

### 4. Names & Entities
- Use **full official names at first mention** (e.g., "Saudi Minister of Energy Prince Abdulaziz bin Salman"), then refer by last name or title
- Always use **official English names** of institutions, regions, and programs (e.g., Vision 2030, Riyadh Season, Saudi Press Agency)
- Maintain **consistency in spelling and capitalization** according to international standards

### 5. Editing & Flow
- **Eliminate redundancy**, filler, and unnecessary phrases
- Use **punctuation properly** (commas, em dashes, periods)
- Rephrase key points elegantly for emphasis — do NOT use bold or formatting markers in content
- Ensure **smooth logical flow** between paragraphs

### 6. SEO Optimization
- Use appropriate **keywords** naturally throughout the text
- Write a **professional meta description** (the lead serves this purpose)
- Include **location and entity names** for searchability

## 🧪 Quality Criteria
Evaluate the ORIGINAL text (after cleaning, before editing) on a 0-100 scale:
- 80-100: Excellent - needs only final touches
- 50-79: Good - needs moderate improvement
- 30-49: Simple - needs complete rewriting
- 10-29: Raw - but can be improved!
- 0-9: Unusable (spam, ads)

## 🏷️ Content Classification Rules

**"Local" (Saudi Local News) - Choose for:**
- Saudi Council of Ministers and its decisions
- Royal Court and Royal Orders
- Saudi Ministries and government bodies
- Vision 2030 and national projects (NEOM, Qiddiya, Red Sea, Riyadh Season)
- Saudi cities and regions news
- Weather in the Kingdom
- Government services (Absher, Tawakkalna, Najiz)

**"World" (International News) - Choose ONLY when:**
- The news primarily discusses a country other than Saudi Arabia
- International events not directly related to the Kingdom
- Foreign heads of state (USA, China, Europe, etc.)
- Note: Saudi official meeting foreign counterpart = "Local" (main actor is Saudi)

**Golden Rule:** If the main actor is a Saudi entity, category is "Local" even if other countries are mentioned.

## 📰 Your Final Output (JSON only)
{
  "qualityScore": number from 0-100,
  "language": "en",
  "detectedCategory": ${categoriesListEn},
  "hasNewsValue": true (always true if score is 10+),
  "issues": [ "only for spam or non-news content" ],
  "suggestions": [ "positive tips for correspondent" ],

  "optimized": {
    "title": "AP-style headline (6-12 words) - e.g., 'Saudi Arabia Launches Major Tourism Initiative'",
    "lead": "Strong opening paragraph (30-60 words) summarizing the core news event",
    "content": "Full article in Property ME style - clean paragraphs (2-4 sentences each) - formatted with HTML (<p>...</p>) - inverted pyramid structure - proper attribution of quotes",
    "seoKeywords": ["5-10 relevant keywords including location names"]
  }
}

## ✨ Example Output

**Good Headline:** "Saudi Arabia Launches Major AI Conference in Riyadh"
**Good Lead:** "Riyadh will host a major artificial intelligence conference next month, bringing together global tech leaders and innovators as part of the Kingdom's Vision 2030 digital transformation initiative, the Saudi Data and AI Authority announced Wednesday."

## ⚠️ Golden Rules
✅ **Delete**: Signatures, names at end of text, contact info
✅ **Clean**: Text from anything not related to news
✅ **Edit**: In Property ME professional style for international readers
✅ **Keep**: All news details, verified facts, and proper attribution
✅ **Reflect**: Saudi Arabia positively, emphasizing achievements and development
❌ **Don't add**: Facts not in original
❌ **Don't change**: Stated facts or sources
❌ **Don't use**: Sensationalism, clickbait, or casual language

## 🎯 Final Goal
Professional English news story, ready for immediate publication, presenting Saudi Arabia to the world with accuracy and polish! 🚀`,
    };

    // Get the system prompt with defensive fallback
    const systemPrompt = SYSTEM_PROMPTS[normalizedLang];
    
    if (!systemPrompt) {
      throw new Error(`No system prompt found for language: ${normalizedLang}`);
    }

    // Migrated to gpt-5.1 - with retry for rate limits
    const response = await withOpenAIRetry(
      () => openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `قم بتحليل وتحرير المحتوى التالي:\n\n${text.substring(0, 5000)}`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 3000,
      }),
      3,
      "SabqEditor"
    );

    const result = JSON.parse(response.choices[0].message.content || "{}");

    console.log("[Property ME Editor] Analysis and editing completed successfully");
    console.log("[Property ME Editor] Quality score:", result.qualityScore);
    console.log("[Property ME Editor] Language:", result.language);
    console.log("[Property ME Editor] Category:", result.detectedCategory);
    console.log("[Property ME Editor] Has news value:", result.hasNewsValue);
    console.log("[Property ME Editor] Optimized title:", result.optimized?.title?.substring(0, 60));

    return {
      qualityScore: result.qualityScore || 0,
      language: normalizeLanguageCode(result.language || normalizedLang),
      detectedCategory: result.detectedCategory || "عام",
      hasNewsValue: result.hasNewsValue !== false,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      optimized: {
        title: result.optimized?.title || "",
        lead: result.optimized?.lead || "",
        content: result.optimized?.content || text,
        seoKeywords: result.optimized?.seoKeywords || [],
      },
    };
  } catch (error: any) {
    console.error("[Property ME Editor] Error analyzing and editing content:", error);
    console.error("[Property ME Editor] Error name:", error?.name);
    console.error("[Property ME Editor] Error message:", error?.message);
    console.error("[Property ME Editor] Error status:", error?.status);
    console.error("[Property ME Editor] Error code:", error?.code);
    if (error?.response?.data) {
      console.error("[Property ME Editor] OpenAI response data:", JSON.stringify(error.response.data));
    }

    // Surface the actual root cause so it shows up in the email log UI
    const status = error?.status || error?.response?.status;
    const code = error?.code;
    const apiMsg = error?.response?.data?.error?.message || error?.message || String(error);

    let detail = apiMsg;
    if (status === 401) {
      detail = "مفتاح OpenAI غير صالح أو منتهي (401). تحقق من OPENAI_API_KEY.";
    } else if (status === 429) {
      detail = "تم تجاوز حد الاستخدام أو الرصيد لدى OpenAI (429). راجع الفوترة أو خفّض المعدل.";
    } else if (status === 400 && /context|token|length/i.test(apiMsg)) {
      detail = `النص أطول من المسموح به للنموذج: ${apiMsg}`;
    } else if (error?.name === "SyntaxError") {
      detail = `فشل تحليل استجابة JSON من النموذج (الاستجابة مقطوعة أو غير صالحة): ${apiMsg}`;
    } else if (code === "ECONNRESET" || code === "ETIMEDOUT" || /timeout/i.test(apiMsg)) {
      detail = `انتهت مهلة الاتصال بـ OpenAI: ${apiMsg}`;
    }

    throw new Error(`Failed to analyze and edit content with Property ME style: ${detail}`);
  }
}

/**
 * الدوال القديمة - محفوظة للتوافق العكسي
 */

export async function analyzeEmailContent(text: string): Promise<EmailContentAnalysis> {
  try {
    console.log("[Email Analyzer] Analyzing email content...");
    console.log("[Email Analyzer] Content length:", text.length);
    
    const systemPrompt = `أنت محلل محتوى ذكي متخصص في تقييم المحتوى الصحفي المرسل عبر البريد الإلكتروني.

قم بتحليل النص المرسل وتقديم تقييم شامل يتضمن:
1. **qualityScore**: درجة الجودة من 0 إلى 100 بناءً على:
   - الوضوح والتنظيم (25 نقطة)
   - المصادر والمعلومات (25 نقطة)
   - القيمة الإخبارية (25 نقطة)
   - الدقة اللغوية (25 نقطة)

2. **language**: اللغة المستخدمة ("ar" للعربية، "en" للإنجليزية)

3. **detectedCategory**: التصنيف المقترح للمحتوى (مثل: سياسة، اقتصاد، رياضة، تقنية، صحة، ثقافة)

4. **hasNewsValue**: هل المحتوى له قيمة إخبارية حقيقية؟ (true/false)

5. **suggestions**: قائمة بـ 3-5 اقتراحات لتحسين المحتوى

6. **issues**: قائمة بأي مشاكل في المحتوى (أخطاء إملائية، نقص معلومات، إلخ)

أعد النتيجة بصيغة JSON فقط.`;

    // Migrated from gpt-5 to gpt-5.1
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `قم بتحليل المحتوى التالي:\n\n${text.substring(0, 3000)}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    console.log("[Email Analyzer] Analysis completed successfully");
    console.log("[Email Analyzer] Quality score:", result.qualityScore);
    console.log("[Email Analyzer] Language:", result.language);
    console.log("[Email Analyzer] Category:", result.detectedCategory);
    
    return {
      qualityScore: result.qualityScore || 0,
      language: result.language || "ar",
      detectedCategory: result.detectedCategory || "عام",
      hasNewsValue: result.hasNewsValue !== false,
      suggestions: result.suggestions || [],
      issues: result.issues || [],
    };
  } catch (error) {
    console.error("[Email Analyzer] Error analyzing content:", error);
    throw new Error("Failed to analyze email content");
  }
}

export async function improveContent(
  text: string,
  language: "ar" | "en" = "ar"
): Promise<ContentImprovement> {
  try {
    console.log("[Content Improver] Improving content...");
    console.log("[Content Improver] Language:", language);
    
    const SYSTEM_PROMPTS = {
      ar: `أنت محرر صحفي محترف متخصص في تحسين المحتوى الإخباري بالعربية.

مهمتك:
1. **correctedText**: تصحيح النص لغوياً ونحوياً وإملائياً، مع تحسين الأسلوب الصحفي
2. **suggestedTitle**: اقتراح عنوان جذاب ومختصر (8-12 كلمة)
3. **suggestedExcerpt**: كتابة مقدمة موجزة وجذابة (30-50 كلمة)
4. **suggestedCategory**: تحديد التصنيف الأنسب (سياسة، اقتصاد، رياضة، تقنية، صحة، ثقافة، منوعات)
5. **seoKeywords**: اقتراح 5-8 كلمات مفتاحية لتحسين محركات البحث

احرص على:
- الحفاظ على المعنى الأصلي
- استخدام لغة صحفية احترافية
- التأكد من دقة المعلومات
- جعل المحتوى جذاباً للقارئ

أعد النتيجة بصيغة JSON فقط.`,
      
      en: `You are a professional news editor specialized in improving news content in English.

Your tasks:
1. **correctedText**: Correct the text grammatically and stylistically, improving journalistic style
2. **suggestedTitle**: Suggest an attractive and concise headline (8-12 words)
3. **suggestedExcerpt**: Write a brief and engaging introduction (30-50 words)
4. **suggestedCategory**: Determine the most suitable category (Politics, Economy, Sports, Technology, Health, Culture, Miscellaneous)
5. **seoKeywords**: Suggest 5-8 keywords for SEO

Ensure:
- Preserve the original meaning
- Use professional journalistic language
- Verify accuracy of information
- Make the content engaging for readers

Return the result in JSON format only.`,
    };

    // Migrated from gpt-5 to gpt-5.1
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS[language],
        },
        {
          role: "user",
          content: text.substring(0, 4000),
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    console.log("[Content Improver] Content improved successfully");
    console.log("[Content Improver] Suggested title:", result.suggestedTitle?.substring(0, 50));
    
    return {
      correctedText: result.correctedText || text,
      suggestedTitle: result.suggestedTitle || "",
      suggestedExcerpt: result.suggestedExcerpt || "",
      suggestedCategory: result.suggestedCategory || "عام",
      seoKeywords: result.seoKeywords || [],
    };
  } catch (error) {
    console.error("[Content Improver] Error improving content:", error);
    throw new Error("Failed to improve content");
  }
}

export async function detectLanguage(text: string): Promise<"ar" | "en"> {
  try {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    if (arabicChars > englishChars) {
      console.log("[Language Detector] Detected: Arabic (ar)");
      return "ar";
    }
    console.log("[Language Detector] Detected: English (en)");
    return "en";
  } catch (error) {
    console.error("[Language Detector] Error detecting language:", error);
    return "ar"; // Default to Arabic
  }
}

/**
 * Normalize language code to ensure it's one of the supported values
 */
export function normalizeLanguageCode(lang: string): "ar" | "en" {
  const normalized = lang.toLowerCase().trim();

  if (normalized === "ar" || normalized === "arabic" || normalized === "ara") {
    return "ar";
  }
  if (normalized === "en" || normalized === "english" || normalized === "eng") {
    return "en";
  }

  console.warn("[Language Normalizer] Unknown language code:", lang, "- defaulting to 'ar'");
  return "ar"; // Default to Arabic
}

/**
 * Generate SEO-optimized alt text for WhatsApp images
 * @param articleTitle - The title of the article
 * @param articleLead - The lead/excerpt of the article
 * @param imageIndex - The index of the image (0 for first, 1 for second, etc.)
 * @param language - The language of the article
 * @returns altText (max 125 chars) and captionHtml
 */
export async function generateImageAltText(
  articleTitle: string,
  articleLead: string,
  imageIndex: number = 0,
  language: "ar" | "en" = "ar"
): Promise<{ altText: string; captionHtml: string }> {
  try {
    console.log(`[AI Image Alt] Generating alt text for image #${imageIndex + 1}, language: ${language}`);
    
    const PROMPTS = {
      ar: `أنت خبير في SEO وإمكانية الوصول (Accessibility) للمواقع الإخبارية.

المهمة: إنشاء نص بديل (Alt Text) ووصف مختصر للصورة المرفقة مع الخبر التالي:

📰 **عنوان الخبر:**
${articleTitle}

📝 **مقدمة الخبر:**
${articleLead}

🖼️ **رقم الصورة:** ${imageIndex === 0 ? 'الأولى (الرئيسية)' : `الصورة رقم ${imageIndex + 1}`}

✅ **المطلوب:**
1. **Alt Text** (نص بديل للصورة):
   - يجب ألا يتجاوز 125 حرفاً (WCAG AA)
   - يصف محتوى الصورة بدقة
   - يتضمن كلمات مفتاحية من العنوان
   - مناسب لقارئات الشاشة
   - بدون "صورة لـ" أو "تظهر" (ابدأ مباشرة بالوصف)

2. **Caption** (تعليق على الصورة):
   - جملة واحدة أو جملتين قصيرتين (max 200 حرف)
   - تُضيف سياقاً للصورة
   - مرتبطة بموضوع الخبر

🎯 **أمثلة:**
- إذا كان الخبر عن حادث مروري → Alt: "سيارة متضررة بعد حادث مروري على طريق الرياض جدة"
- إذا كان عن افتتاح مشروع → Alt: "ولي العهد يقص شريط افتتاح مشروع نيوم"
- إذا كان عن مؤتمر صحفي → Alt: "وزير الخارجية خلال مؤتمر صحفي بالرياض"

⚠️ **قواعد إلزامية:**
- لا تذكر "صورة" أو "تظهر" في بداية Alt Text
- استخدم لغة عربية فصيحة واضحة
- ركز على المحتوى البصري المتوقع
- لا تكرر العنوان حرفياً

📤 **الإخراج (JSON فقط):**
\`\`\`json
{
  "altText": "نص بديل مختصر (max 125 حرف)",
  "captionHtml": "تعليق قصير على الصورة"
}
\`\`\``,
      en: `You are an SEO and Accessibility expert for news websites.

Task: Create alt text and a brief caption for the image attached to this news article:

📰 **Article Title:**
${articleTitle}

📝 **Article Lead:**
${articleLead}

🖼️ **Image Number:** ${imageIndex === 0 ? 'First (Main)' : `Image #${imageIndex + 1}`}

✅ **Requirements:**
1. **Alt Text**:
   - Max 125 characters (WCAG AA)
   - Accurately describes the image content
   - Includes keywords from the title
   - Suitable for screen readers
   - Don't start with "Image of" or "Shows" (start directly with description)

2. **Caption**:
   - One or two short sentences (max 200 chars)
   - Adds context to the image
   - Related to the news topic

🎯 **Examples:**
- Traffic accident news → Alt: "Damaged car after accident on Riyadh-Jeddah highway"
- Project opening → Alt: "Crown Prince cuts ribbon at NEOM project opening"
- Press conference → Alt: "Foreign Minister during press conference in Riyadh"

⚠️ **Mandatory Rules:**
- Don't start with "Image" or "Shows"
- Use clear, professional language
- Focus on expected visual content
- Don't repeat the title verbatim

📤 **Output (JSON only):**
\`\`\`json
{
  "altText": "brief alt text (max 125 chars)",
  "captionHtml": "short image caption"
}
\`\`\``,
    };

    const prompt = PROMPTS[language];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert in generating SEO-optimized, accessible alt text for news images." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 300,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Validate alt text length (max 125 chars for WCAG AA)
    let altText = result.altText || "صورة توضيحية للخبر";
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + "...";
    }
    
    const captionHtml = result.captionHtml || "";
    
    console.log(`[AI Image Alt] Generated alt text (${altText.length} chars): ${altText}`);
    
    return { altText, captionHtml };
  } catch (error) {
    console.error("[AI Image Alt] Error generating alt text:", error);
    
    // Fallback to generic alt text based on language
    const fallbacks = {
      ar: { altText: "صورة توضيحية للخبر", captionHtml: "" },
      en: { altText: "Illustrative image for the news", captionHtml: "" },
    };

    return fallbacks[language];
  }
}
