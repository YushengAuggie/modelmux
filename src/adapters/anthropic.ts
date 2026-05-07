import type { NormalizedUsage, RequestConfig, RequestPreview } from '@/types';
import {
  ANTHROPIC_BASE,
  getCustomBaseUrl,
  joinUrl,
  numberOrUndefined,
  toAnthropicMessages,
  type ProviderAdapter,
} from '@/adapters/base';

/** Builds an Anthropic messages request preview. */
export function buildRequest(config: RequestConfig): RequestPreview {
  if (!config.model.trim()) {
    throw new Error('Model is required');
  }

  const customBase = getCustomBaseUrl(config.baseUrl);
  const base = customBase || ANTHROPIC_BASE;

  const defaultPath = customBase ? '/messages' : '/v1/messages';
  const endpointOverride = (config.endpointPath ?? '').trim();
  const path = endpointOverride || defaultPath;
  // Only strip anthropic/ prefix for official Anthropic endpoint, not custom proxies
  const rawModel = config.model.trim();
  const model = customBase ? rawModel : rawModel.replace(/^anthropic\//, '');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': config.apiKey.trim(),
    'anthropic-version': '2023-06-01',
  };
  // Only send the direct-browser-access header to the real Anthropic API.
  // Custom endpoints (like Poe) don't allow it in their CORS preflight.
  if (!customBase) {
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  return {
    method: 'POST',
    url: joinUrl(base, path),
    headers,
    body: {
      model,
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
