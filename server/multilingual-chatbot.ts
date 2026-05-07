import { aiManager, AI_MODELS } from './ai-manager';
import type { AIModelConfig } from './ai-manager';

export type ChatLanguage = 'ar' | 'en';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  recentArticles?: {
    title: string;
    summary?: string;
    categoryName?: string;
  }[];
  conversationHistory?: ChatMessage[];
}

const LANGUAGE_MODEL_MAPPING: Record<ChatLanguage, AIModelConfig> = {
  ar: {
    ...AI_MODELS.GPT_5_1,
    maxTokens: 1000,
    temperature: 0.7,
  },
  en: {
    ...AI_MODELS.GPT_5_1,
    maxTokens: 1000,
  },
};

const SYSTEM_PROMPTS: Record<ChatLanguage, (articlesContext: string) => string> = {
  ar: (articlesContext: string) => `أنت مساعد أخبار ذكي لبروبرتي ME. ساعد القراء في العثور على الأخبار والمعلومات. أجب بالعربية دائماً بشكل واضح ومفيد.

${articlesContext ? `آخر الأخبار المنشورة:\n${articlesContext}\n\nاستخدم هذه الأخبار للإجابة على أسئلة القارئ عندما يكون ذلك مناسباً.` : ''}

قدم إجابات دقيقة ومختصرة ومفيدة.

مهم جداً: في نهاية كل رد، أضف قسم اقتراحات بالتنسيق التالي بالضبط:
---SUGGESTIONS---
اقتراح قصير 1
اقتراح قصير 2
اقتراح قصير 3
---END---

الاقتراحات يجب أن تكون:
- 3 اقتراحات فقط
- قصيرة (5-10 كلمات)
- متعلقة بالموضوع الذي تحدثنا عنه
- أسئلة أو طلبات يمكن للمستخدم الضغط عليها`,

  en: (articlesContext: string) => `You are an intelligent news assistant for Property ME. Help readers find news and information. Always respond in English clearly and helpfully.

${articlesContext ? `Recent published news:\n${articlesContext}\n\nUse these articles to answer the reader's questions when appropriate.` : ''}

Provide accurate, concise, and helpful answers.

IMPORTANT: At the end of every response, add a suggestions section in exactly this format:
---SUGGESTIONS---
Short suggestion 1
Short suggestion 2
Short suggestion 3
---END---

Suggestions must be:
- Exactly 3 suggestions
- Short (5-10 words)
- Related to the topic we discussed
- Questions or requests the user can click on`,
};

const ERROR_MESSAGES: Record<ChatLanguage, { auth: string; rate: string; general: string }> = {
  ar: {
    auth: 'عذراً، هناك مشكلة في إعدادات المساعد الذكي. يرجى المحاولة لاحقاً.',
    rate: 'عذراً، لقد تجاوزت حد الاستخدام. يرجى المحاولة بعد قليل.',
    general: 'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.',
  },
  en: {
    auth: 'Sorry, there is an issue with the assistant settings. Please try again later.',
    rate: 'Sorry, you have exceeded the usage limit. Please try again shortly.',
    general: 'Sorry, I could not process your request. Please try again.',
  },
};

export async function chatWithMultilingualAssistant(
  message: string,
  language: ChatLanguage,
  context?: ChatContext
): Promise<string> {
  console.log(`[MultilingualChatbot] Processing ${language} message:`, message.substring(0, 100));

  const articlesContext = context?.recentArticles
    ? context.recentArticles
        .map((article, index) => {
          const parts = [`${index + 1}. ${article.title}`];
          if (article.categoryName) parts.push(`(${article.categoryName})`);
          if (article.summary) parts.push(`\n   Summary: ${article.summary}`);
          return parts.join(' ');
        })
        .join('\n')
    : '';

  const systemPrompt = SYSTEM_PROMPTS[language](articlesContext);
  const modelConfig = LANGUAGE_MODEL_MAPPING[language];

  console.log(`[MultilingualChatbot] Using model: ${modelConfig.provider}/${modelConfig.model} for language: ${language}`);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (context?.conversationHistory) {
    messages.push(...context.conversationHistory);
  }

  messages.push({ role: 'user', content: message });

  const fullPrompt = messages.map(msg => {
    if (msg.role === 'system') return msg.content;
    return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
  }).join('\n\n');

  const response = await aiManager.generate(fullPrompt, modelConfig);

  if (!response.content) {
    console.warn('[MultilingualChatbot] Empty response from AI');
    throw new Error('AI_EMPTY_RESPONSE');
  }

  console.log(`[MultilingualChatbot] Response generated successfully (${response.usage?.outputTokens || 0} tokens)`);
  return response.content;
}

export async function chatWithAssistantFallback(
  message: string,
  language: ChatLanguage,
  context?: ChatContext,
  primaryModel?: AIModelConfig,
  fallbackModel?: AIModelConfig
): Promise<{ content: string; modelUsed: string }> {
  const primary = primaryModel || LANGUAGE_MODEL_MAPPING[language];
  const fallback = fallbackModel || {
    ...AI_MODELS.GPT4,
    maxTokens: 1000,
  };

  try {
    const content = await chatWithMultilingualAssistant(message, language, context);
    return {
      content,
      modelUsed: `${primary.provider}/${primary.model}`,
    };
  } catch (error) {
    console.warn(`[MultilingualChatbot] Primary model failed, trying fallback...`);
    
    try {
      const articlesContext = context?.recentArticles
        ? context.recentArticles
            .map((article, index) => `${index + 1}. ${article.title}`)
            .join('\n')
        : '';

      const systemPrompt = SYSTEM_PROMPTS[language](articlesContext);
      
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      if (context?.conversationHistory) {
        messages.push(...context.conversationHistory);
      }

      messages.push({ role: 'user', content: message });

      const fullPrompt = messages.map(msg => {
        if (msg.role === 'system') return msg.content;
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      }).join('\n\n');

      const response = await aiManager.generate(fullPrompt, fallback);
      
      return {
        content: response.content || ERROR_MESSAGES[language].general,
        modelUsed: `${fallback.provider}/${fallback.model} (fallback)`,
      };
    } catch (fallbackError) {
      console.error('[MultilingualChatbot] Fallback model also failed:', fallbackError);
      return {
        content: ERROR_MESSAGES[language].general,
        modelUsed: 'none (all models failed)',
      };
    }
  }
}

export function getOptimalModelForLanguage(language: ChatLanguage): AIModelConfig {
  return LANGUAGE_MODEL_MAPPING[language];
}

export function getSupportedLanguages(): ChatLanguage[] {
  return ['ar', 'en'];
}

export interface ChatResponseWithSuggestions {
  content: string;
  suggestions: string[];
  modelUsed: string;
}

export function parseResponseWithSuggestions(response: string): { content: string; suggestions: string[] } {
  const suggestionsMatch = response.match(/---SUGGESTIONS---\n([\s\S]*?)\n---END---/);
  
  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1];
    const suggestions = suggestionsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 100);
    
    const content = response.replace(/---SUGGESTIONS---[\s\S]*?---END---/, '').trim();
    
    return { content, suggestions: suggestions.slice(0, 3) };
  }
  
  return { content: response.trim(), suggestions: [] };
}

export async function chatWithSuggestions(
  message: string,
  language: ChatLanguage,
  context?: ChatContext
): Promise<ChatResponseWithSuggestions> {
  const result = await chatWithAssistantFallback(message, language, context);
  const parsed = parseResponseWithSuggestions(result.content);
  
  return {
    content: parsed.content,
    suggestions: parsed.suggestions,
    modelUsed: result.modelUsed,
  };
}
