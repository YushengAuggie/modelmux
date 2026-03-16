import type {
  MessageItem,
  NormalizedUsage,
  ProviderId,
  ProviderOption,
  RequestConfig,
  RequestPreview,
} from '@/types';

/** Shared adapter contract for each provider implementation. */
export interface ProviderAdapter {
  buildRequest(config: RequestConfig): RequestPreview;
  extractText(json: unknown): string;
  normalizeUsage(json: unknown): NormalizedUsage;
  getErrorHint(rawText: string): string | undefined;
}

/** Default OpenAI API origin. */
export const OPENAI_BASE = 'https://api.openai.com';

/** Default Anthropic API origin. */
export const ANTHROPIC_BASE = 'https://api.anthropic.com';

/** Default Gemini API origin. */
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

/** Default local OpenAI-compatible origin used for custom providers. */
export const LOCAL_OPENAI_COMPAT_BASE = 'http://localhost:11434/v1';

/** Provider choices available in the UI. */
export const providerOptions: ProviderOption[] = [
  { id: 'openai-chat', label: 'OpenAI (Chat Completions)' },
  { id: 'openai-responses', label: 'OpenAI (Responses API)' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'custom', label: 'Custom (OpenAI-compatible)' },
];

/** Safely joins a base URL and path. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Returns a custom override base URL when it should replace provider defaults. */
export function getCustomBaseUrl(baseUrl: string): string | undefined {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed === LOCAL_OPENAI_COMPAT_BASE) {
    return undefined;
  }
  return trimmed;
}

/** Returns trimmed message content. */
export function normalizeMessageContent(content: string): string {
  return content.trim();
}

/** Converts messages into OpenAI-compatible chat messages. */
export function toOpenAiMessages(systemPrompt: string, messages: MessageItem[]): Array<Record<string, unknown>> {
  const normalized = messages.map((message) => {
    const payload: Record<string, unknown> = {
      role: message.role,
      content: normalizeMessageContent(message.content),
    };

    if (message.role === 'tool' && message.name) {
      payload.name = message.name;
    }

    return payload;
  });

  return systemPrompt.trim()
    ? [{ role: 'system', content: systemPrompt.trim() }, ...normalized]
    : normalized;
}

/** Converts messages into Anthropic message blocks. */
export function toAnthropicMessages(messages: MessageItem[]): Array<Record<string, unknown>> {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'text', text: normalizeMessageContent(message.content) }],
    }));
}

/** Converts messages into Gemini content parts. */
export function toGeminiContents(messages: MessageItem[]): Array<Record<string, unknown>> {
  return messages
    .filter((message) => message.role !== 'system' && message.role !== 'tool')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: normalizeMessageContent(message.content) }],
    }));
}

/** Parses a JSON payload without throwing. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Returns a finite number or `undefined`. */
export function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Resolves the adapter key for a provider identifier. */
export function normalizeProvider(provider: ProviderId): Exclude<ProviderId, 'custom'> | 'openai-chat' {
  return provider === 'custom' ? 'openai-chat' : provider;
}
