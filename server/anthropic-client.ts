import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

function readAnthropicApiKey(): string | undefined {
  return (
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    undefined
  );
}

function readAnthropicBaseUrl(): string | undefined {
  return (
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    undefined
  );
}

export function isAnthropicConfigured(): boolean {
  return Boolean(readAnthropicApiKey());
}

export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = readAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "Anthropic API key is not configured. Set AI_INTEGRATIONS_ANTHROPIC_API_KEY (Replit AI Integrations) or ANTHROPIC_API_KEY."
    );
  }

  const baseURL = readAnthropicBaseUrl();
  cachedClient = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return cachedClient;
}
