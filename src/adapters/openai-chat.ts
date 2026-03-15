import type { NormalizedUsage, RequestConfig, RequestPreview } from '@/types';
import { joinUrl, numberOrUndefined, OPENAI_BASE, toOpenAiMessages, type ProviderAdapter } from '@/adapters/base';

/** Builds an OpenAI Chat Completions request preview. */
export function buildRequest(config: RequestConfig): RequestPreview {
  const model = config.model.trim();
  if (!model) {
    throw new Error('Model is required');
  }

  const base = config.provider === 'custom' ? config.baseUrl.trim() || 'http://localhost:11434/v1' : OPENAI_BASE;
  return {
    method: 'POST',
    url: joinUrl(base, '/v1/chat/completions'),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: {
      model,
      messages: toOpenAiMessages(config.systemPrompt, config.messages),
      temperature: config.params.temperature,
      max_tokens: config.params.maxTokens,
      top_p: config.params.topP,
      stream: config.params.stream,
    },
  };
}

/** Extracts assistant text from an OpenAI chat payload. */
export function extractText(json: unknown): string {
  const root = (json as Record<string, unknown>) ?? {};
  const choices = root.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
  const content = message?.content ?? delta?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => (typeof (item as { text?: unknown }).text === 'string' ? (item as { text: string }).text : ''))
    .join('\n')
    .trim();
}

/** Normalizes token usage for OpenAI chat payloads. */
export function normalizeUsage(json: unknown): NormalizedUsage {
  const usage = (((json as Record<string, unknown>) ?? {}).usage as Record<string, unknown>) ?? {};
  return {
    inputTokens: numberOrUndefined(usage.prompt_tokens),
    outputTokens: numberOrUndefined(usage.completion_tokens),
    totalTokens: numberOrUndefined(usage.total_tokens),
  };
}

/** Returns a provider-specific error hint for OpenAI chat calls. */
export function getErrorHint(rawText: string): string | undefined {
  const lower = rawText.toLowerCase();
  if (lower.includes('api key')) {
    return 'OpenAI-compatible providers require `Authorization: Bearer <key>`.';
  }
  if (lower.includes('failed to fetch')) {
    return 'Custom endpoints may block CORS. Check the base URL and local server availability.';
  }
  return undefined;
}

/** OpenAI chat adapter definition. */
export const openAiChatAdapter: ProviderAdapter = { buildRequest, extractText, normalizeUsage, getErrorHint };
