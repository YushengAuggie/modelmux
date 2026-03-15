import type { NormalizedUsage, RequestConfig, RequestPreview } from '@/types';
import { ANTHROPIC_BASE, joinUrl, numberOrUndefined, toAnthropicMessages, type ProviderAdapter } from '@/adapters/base';

/** Builds an Anthropic messages request preview. */
export function buildRequest(config: RequestConfig): RequestPreview {
  if (!config.model.trim()) {
    throw new Error('Model is required');
  }

  return {
    method: 'POST',
    url: joinUrl(ANTHROPIC_BASE, '/v1/messages'),
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: config.model.trim(),
      system: config.systemPrompt.trim() || undefined,
      messages: toAnthropicMessages(config.messages),
      temperature: config.params.temperature,
      top_p: config.params.topP,
      max_tokens: config.params.maxTokens,
      stream: config.params.stream,
    },
  };
}

/** Extracts text from an Anthropic messages payload. */
export function extractText(json: unknown): string {
  const content = ((json as Record<string, unknown>) ?? {}).content as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .filter((item) => item.type === 'text')
    .map((item) => (typeof item.text === 'string' ? item.text : ''))
    .join('\n')
    .trim();
}

/** Normalizes token usage from Anthropic payloads. */
export function normalizeUsage(json: unknown): NormalizedUsage {
  const usage = (((json as Record<string, unknown>) ?? {}).usage as Record<string, unknown>) ?? {};
  const inputTokens = numberOrUndefined(usage.input_tokens);
  const outputTokens = numberOrUndefined(usage.output_tokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== undefined || outputTokens !== undefined ? (inputTokens ?? 0) + (outputTokens ?? 0) : undefined,
  };
}

/** Returns a provider-specific error hint for Anthropic calls. */
export function getErrorHint(rawText: string): string | undefined {
  return rawText.toLowerCase().includes('max_tokens')
    ? 'Anthropic requires `max_tokens` as a top-level field.'
    : undefined;
}

/** Anthropic adapter definition. */
export const anthropicAdapter: ProviderAdapter = { buildRequest, extractText, normalizeUsage, getErrorHint };
