import type { NormalizedUsage, RequestConfig, RequestPreview } from '@/types';
import { joinUrl, numberOrUndefined, OPENAI_BASE, type ProviderAdapter } from '@/adapters/base';

function extractOutputText(output: unknown): string {
  if (!Array.isArray(output)) {
    return '';
  }

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const block of content) {
      if (typeof (block as { text?: unknown }).text === 'string') {
        parts.push((block as { text: string }).text);
      }
    }
  }

  return parts.join('\n').trim();
}

/** Builds an OpenAI Responses API request preview. */
export function buildRequest(config: RequestConfig): RequestPreview {
  if (!config.model.trim()) {
    throw new Error('Model is required');
  }

  // Use baseUrl when set (e.g. Poe API proxy), otherwise default to OpenAI
  const hasCustomBase = config.baseUrl && config.baseUrl.trim() && config.baseUrl.trim() !== 'http://localhost:11434/v1';
  const base = hasCustomBase ? config.baseUrl!.trim() : OPENAI_BASE;
  // If custom base already ends with /v1, only append /responses
  const path = hasCustomBase ? '/responses' : '/v1/responses';
  return {
    method: 'POST',
    url: joinUrl(base, path),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: {
      model: config.model.trim(),
      instructions: config.systemPrompt.trim() || undefined,
      input: config.messages.map((message) => ({ role: message.role, content: message.content })),
      temperature: config.params.temperature,
      top_p: config.params.topP,
      max_output_tokens: config.params.maxTokens,
      stream: config.params.stream,
    },
  };
}

/** Extracts text from a Responses API payload. */
export function extractText(json: unknown): string {
  return extractOutputText((json as Record<string, unknown> | undefined)?.output);
}

/** Normalizes token usage for a Responses API payload. */
export function normalizeUsage(json: unknown): NormalizedUsage {
  const usage = (((json as Record<string, unknown>) ?? {}).usage as Record<string, unknown>) ?? {};
  return {
    inputTokens: numberOrUndefined(usage.input_tokens),
    outputTokens: numberOrUndefined(usage.output_tokens),
    totalTokens: numberOrUndefined(usage.total_tokens),
  };
}

/** Returns a provider-specific error hint for the Responses API. */
export function getErrorHint(rawText: string): string | undefined {
  return rawText.toLowerCase().includes('api key')
    ? 'OpenAI-compatible providers require `Authorization: Bearer <key>`.'
    : undefined;
}

/** OpenAI Responses adapter definition. */
export const openAiResponsesAdapter: ProviderAdapter = { buildRequest, extractText, normalizeUsage, getErrorHint };
