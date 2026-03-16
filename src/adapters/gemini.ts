import type { NormalizedUsage, RequestConfig, RequestPreview } from '@/types';
import { GEMINI_BASE, getCustomBaseUrl, joinUrl, numberOrUndefined, toGeminiContents, type ProviderAdapter } from '@/adapters/base';

/** Builds a Gemini generateContent request preview. */
export function buildRequest(config: RequestConfig): RequestPreview {
  const model = config.model.trim();
  if (!model) {
    throw new Error('Model is required');
  }

  const customBase = getCustomBaseUrl(config.baseUrl);
  const path = config.params.stream
    ? `${customBase ? '' : '/v1beta'}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
    : `${customBase ? '' : '/v1beta'}/models/${encodeURIComponent(model)}:generateContent`;

  return {
    method: 'POST',
    url: joinUrl(customBase || GEMINI_BASE, path),
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': config.apiKey.trim(),
    },
    body: {
      contents: toGeminiContents(config.messages),
      systemInstruction: config.systemPrompt.trim()
        ? { parts: [{ text: config.systemPrompt.trim() }] }
        : undefined,
      generationConfig: {
        temperature: config.params.temperature,
        maxOutputTokens: config.params.maxTokens,
        topP: config.params.topP,
      },
    },
  };
}

/** Extracts text from a Gemini response payload. */
export function extractText(json: unknown): string {
  const candidates = ((json as Record<string, unknown>) ?? {}).candidates as Array<Record<string, unknown>> | undefined;
  const parts = (((candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as Array<Record<string, unknown>> | undefined) ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean);

  return parts.join('\n').trim();
}

/** Normalizes token usage from Gemini payloads. */
export function normalizeUsage(json: unknown): NormalizedUsage {
  const usage = (((json as Record<string, unknown>) ?? {}).usageMetadata as Record<string, unknown>) ?? {};
  return {
    inputTokens: numberOrUndefined(usage.promptTokenCount),
    outputTokens: numberOrUndefined(usage.candidatesTokenCount),
    totalTokens: numberOrUndefined(usage.totalTokenCount),
  };
}

/** Returns a provider-specific error hint for Gemini calls. */
export function getErrorHint(rawText: string): string | undefined {
  return rawText.toLowerCase().includes('api key')
    ? 'Gemini requires the `x-goog-api-key` header and the model in the URL path.'
    : undefined;
}

/** Gemini adapter definition. */
export const geminiAdapter: ProviderAdapter = { buildRequest, extractText, normalizeUsage, getErrorHint };
