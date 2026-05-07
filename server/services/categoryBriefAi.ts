import OpenAI from "openai";
import { memoryCache } from "../memoryCache";
import { getAnthropicClient } from "../anthropic-client";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const BRIEF_TTL_MS = 60 * 60 * 1000;

export interface CategoryBriefArticleInput {
  title: string;
  summary?: string | null;
  excerpt?: string | null;
  publishedAt?: Date | string | null;
  views?: number | null;
  reactionsCount?: number | null;
}

export interface CategoryBriefResult {
  brief: string;
  generatedAt: string;
  articleCount: number;
  fromCache: boolean;
  provider: "anthropic" | "openai";
}

function cacheKey(slug: string, signature: string) {
  return `category-brief:${slug}:${signature}`;
}

function buildSignature(articles: CategoryBriefArticleInput[]): string {
  const titles = articles
    .slice(0, 10)
    .map((a) => (a.title || "").trim().slice(0, 80))
    .join("|");
  let hash = 0;
  for (let i = 0; i < titles.length; i++) {
    hash = (hash * 31 + titles.charCodeAt(i)) | 0;
  }
  return `${articles.length}-${(hash >>> 0).toString(36)}`;
}

function buildPrompt(
  categoryName: string,
  articles: CategoryBriefArticleInput[],
): string {
  const list = articles
    .slice(0, 12)
    .map((a, idx) => {
      const snippet = (a.summary || a.excerpt || "").toString().trim().slice(0, 240);
      const views = a.views ? ` (مشاهدات: ${a.views})` : "";
      return `${idx + 1}. ${a.title}${views}${snippet ? `\n   ملخص: ${snippet}` : ""}`;
    })
    .join("\n");

  return `أنت محرر أخبار محترف في غرفة تحرير عربية. مهمتك إعداد "موجز المحرر" اليومي لقرّاء قسم "${categoryName}".

اعتمد فقط على العناوين أدناه من آخر مقالات القسم، ولا تختلق أي معلومة غير موجودة فيها.

اكتب موجزًا عربيًا فصيحًا من 3 إلى 4 جمل (بحدود 60 إلى 90 كلمة) يلخّص أهم ما يحدث في هذا القسم اليوم: التوجهات البارزة، أبرز الأحداث أو الصفقات، ولمسة عن المزاج العام للقطاع. ابدأ مباشرةً بالموجز دون مقدمات أو عناوين، ودون نقاط أو ترقيم، ودون استخدام الإيموجي.

المقالات:
${list}`;
}

async function generateWithAnthropic(prompt: string): Promise<string> {
  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block && block.type === "text") {
    return block.text.trim();
  }
  throw new Error("Anthropic returned no text content");
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned no text content");
  return text;
}

export async function generateCategoryBrief(params: {
  slug: string;
  categoryName: string;
  articles: CategoryBriefArticleInput[];
  forceRefresh?: boolean;
}): Promise<CategoryBriefResult | null> {
  const { slug, categoryName, articles, forceRefresh } = params;
  const filtered = articles.filter((a) => a.title && a.title.trim().length > 0);
  if (filtered.length === 0) return null;

  const signature = buildSignature(filtered);
  const key = cacheKey(slug, signature);

  if (!forceRefresh) {
    const cached = memoryCache.get<CategoryBriefResult>(key);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }

  const prompt = buildPrompt(categoryName, filtered);

  let brief: string;
  let provider: "anthropic" | "openai" = "anthropic";
  try {
    brief = await generateWithAnthropic(prompt);
  } catch (anthropicErr) {
    console.warn(
      `[categoryBriefAi] Anthropic failed for ${slug}, falling back to OpenAI:`,
      (anthropicErr as Error).message,
    );
    try {
      brief = await generateWithOpenAI(prompt);
      provider = "openai";
    } catch (openaiErr) {
      console.error(
        `[categoryBriefAi] Both providers failed for ${slug}:`,
        (openaiErr as Error).message,
      );
      return null;
    }
  }

  const result: CategoryBriefResult = {
    brief,
    generatedAt: new Date().toISOString(),
    articleCount: filtered.length,
    fromCache: false,
    provider,
  };

  memoryCache.set(key, result, BRIEF_TTL_MS);
  return result;
}
