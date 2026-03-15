import type { OpenRouterModel, ProviderId, RequestConfig, RequestPreview } from '@/types';
import { normalizeProvider, providerOptions, type ProviderAdapter } from '@/adapters/base';
import { anthropicAdapter } from '@/adapters/anthropic';
import { geminiAdapter } from '@/adapters/gemini';
import { openAiChatAdapter } from '@/adapters/openai-chat';
import { openAiResponsesAdapter } from '@/adapters/openai-responses';

const adapters: Record<Exclude<ProviderId, 'custom'>, ProviderAdapter> = {
  'openai-chat': openAiChatAdapter,
  'openai-responses': openAiResponsesAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

/** Estimates request cost from normalized usage and model pricing. */
export function estimateCost(model: OpenRouterModel | undefined, inputTokens?: number, outputTokens?: number): number | undefined {
  if (!model) {
    return undefined;
  }

  const input = inputTokens ?? 0;
  const output = outputTokens ?? 0;
  return input === 0 && output === 0
    ? undefined
    : input * model.promptPricePerToken + output * model.completionPricePerToken;
}

/** Returns the adapter for a provider identifier. */
export function getAdapter(provider: ProviderId): ProviderAdapter {
  return adapters[normalizeProvider(provider)];
}

/** Builds a provider-specific request preview. */
export function buildRequestPreview(config: RequestConfig): RequestPreview {
  return getAdapter(config.provider).buildRequest(config);
}

export { providerOptions };
