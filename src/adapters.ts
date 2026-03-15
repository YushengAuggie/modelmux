import type {
  MessageItem,
  NormalizedUsage,
  OpenRouterModel,
  ProviderId,
  RequestConfig,
  RequestPreview,
  ResponseState,
} from './types';
import { copy, providerCopy } from './copy';

const OPENAI_BASE = 'https://api.openai.com';
const ANTHROPIC_BASE = 'https://api.anthropic.com';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export const providerOptions: Array<{ id: ProviderId; label: string }> = [
  { id: 'openai-chat', label: providerCopy['openai-chat'] },
  { id: 'openai-responses', label: providerCopy['openai-responses'] },
  { id: 'anthropic', label: providerCopy.anthropic },
  { id: 'gemini', label: providerCopy.gemini },
  { id: 'custom', label: providerCopy.custom },
];

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function normalizeMessageContent(content: string): string {
  return content.trim();
}

function toOpenAiMessages(systemPrompt: string, messages: MessageItem[]): Array<Record<string, unknown>> {
  const normalized = messages.map((msg) => {
    const payload: Record<string, unknown> = {
      role: msg.role,
      content: normalizeMessageContent(msg.content),
    };
    if (msg.role === 'tool' && msg.name) {
      payload.name = msg.name;
    }
    return payload;
  });

  if (!systemPrompt.trim()) {
    return normalized;
  }

  return [{ role: 'system', content: systemPrompt.trim() }, ...normalized];
}

function toAnthropicMessages(messages: MessageItem[]): Array<Record<string, unknown>> {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'text', text: normalizeMessageContent(m.content) }],
    }));
}

function toGeminiContents(messages: MessageItem[]): Array<Record<string, unknown>> {
  return messages
    .filter((m) => m.role !== 'system' && m.role !== 'tool')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: normalizeMessageContent(m.content) }],
    }));
}

function extractResponsesText(output: unknown): string {
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
      const text = (block as { text?: unknown }).text;
      if (typeof text === 'string') {
        parts.push(text);
      }
    }
  }

  return parts.join('\n').trim();
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function buildRequestPreview(config: RequestConfig): RequestPreview {
  const baseUrl = config.baseUrl.trim();
  const model = config.model.trim();

  if (!model) {
    throw new Error(copy.errors.modelRequired);
  }

  switch (config.provider) {
    case 'openai-chat':
    case 'custom': {
      const base = config.provider === 'custom' ? baseUrl || 'http://localhost:11434/v1' : OPENAI_BASE;
      const body: Record<string, unknown> = {
        model,
        messages: toOpenAiMessages(config.systemPrompt, config.messages),
        temperature: config.params.temperature,
        max_tokens: config.params.maxTokens,
        top_p: config.params.topP,
        stream: config.params.stream,
      };

      return {
        method: 'POST',
        url: joinUrl(base, '/v1/chat/completions'),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body,
      };
    }
    case 'openai-responses': {
      const body: Record<string, unknown> = {
        model,
        instructions: config.systemPrompt.trim() || undefined,
        input: config.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: config.params.temperature,
        top_p: config.params.topP,
        max_output_tokens: config.params.maxTokens,
        stream: config.params.stream,
      };

      return {
        method: 'POST',
        url: joinUrl(OPENAI_BASE, '/v1/responses'),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body,
      };
    }
    case 'anthropic': {
      const body: Record<string, unknown> = {
        model,
        system: config.systemPrompt.trim() || undefined,
        messages: toAnthropicMessages(config.messages),
        temperature: config.params.temperature,
        top_p: config.params.topP,
        max_tokens: config.params.maxTokens,
        stream: config.params.stream,
      };

      return {
        method: 'POST',
        url: joinUrl(ANTHROPIC_BASE, '/v1/messages'),
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        body,
      };
    }
    case 'gemini': {
      const streamPath = config.params.stream
        ? `/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
        : `/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body: Record<string, unknown> = {
        contents: toGeminiContents(config.messages),
        systemInstruction: config.systemPrompt.trim()
          ? {
              parts: [{ text: config.systemPrompt.trim() }],
            }
          : undefined,
        generationConfig: {
          temperature: config.params.temperature,
          maxOutputTokens: config.params.maxTokens,
          topP: config.params.topP,
        },
      };

      return {
        method: 'POST',
        url: joinUrl(GEMINI_BASE, streamPath),
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': config.apiKey.trim(),
        },
        body,
      };
    }
    default:
      throw new Error(copy.errors.unsupportedProvider);
  }
}

export function extractText(provider: ProviderId, json: unknown): string {
  const root = (json as Record<string, unknown>) || {};

  if (provider === 'openai-chat' || provider === 'custom') {
    const choices = root.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => (typeof (item as { text?: unknown }).text === 'string' ? (item as { text: string }).text : ''))
        .join('\n')
        .trim();
    }
    return '';
  }

  if (provider === 'openai-responses') {
    return extractResponsesText(root.output);
  }

  if (provider === 'anthropic') {
    const content = root.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) {
      return '';
    }
    return content
      .filter((item) => item.type === 'text')
      .map((item) => (typeof item.text === 'string' ? item.text : ''))
      .join('\n')
      .trim();
  }

  if (provider === 'gemini') {
    const candidates = root.candidates as Array<Record<string, unknown>> | undefined;
    const parts = (((candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as
      | Array<Record<string, unknown>>
      | undefined) ?? [])
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .filter(Boolean);
    return parts.join('\n').trim();
  }

  return '';
}

export function normalizeUsage(provider: ProviderId, json: unknown): NormalizedUsage {
  const root = (json as Record<string, unknown>) || {};
  if (provider === 'openai-chat' || provider === 'custom') {
    const usage = (root.usage as Record<string, unknown>) || {};
    return {
      inputTokens: numberOrUndefined(usage.prompt_tokens),
      outputTokens: numberOrUndefined(usage.completion_tokens),
      totalTokens: numberOrUndefined(usage.total_tokens),
    };
  }

  if (provider === 'openai-responses') {
    const usage = (root.usage as Record<string, unknown>) || {};
    return {
      inputTokens: numberOrUndefined(usage.input_tokens),
      outputTokens: numberOrUndefined(usage.output_tokens),
      totalTokens: numberOrUndefined(usage.total_tokens),
    };
  }

  if (provider === 'anthropic') {
    const usage = (root.usage as Record<string, unknown>) || {};
    const input = numberOrUndefined(usage.input_tokens);
    const output = numberOrUndefined(usage.output_tokens);
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: input !== undefined || output !== undefined ? (input ?? 0) + (output ?? 0) : undefined,
    };
  }

  if (provider === 'gemini') {
    const usage = (root.usageMetadata as Record<string, unknown>) || {};
    return {
      inputTokens: numberOrUndefined(usage.promptTokenCount),
      outputTokens: numberOrUndefined(usage.candidatesTokenCount),
      totalTokens: numberOrUndefined(usage.totalTokenCount),
    };
  }

  return {};
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function estimateCost(model: OpenRouterModel | undefined, usage: NormalizedUsage): number | undefined {
  if (!model) {
    return undefined;
  }

  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  if (input === 0 && output === 0) {
    return undefined;
  }

  return input * model.promptPricePerToken + output * model.completionPricePerToken;
}

function parseSseEvents(buffer: string): { events: string[]; remaining: string } {
  const chunks = buffer.split('\n\n');
  const remaining = chunks.pop() ?? '';
  const events = chunks.map((part) => part.trim()).filter(Boolean);
  return { events, remaining };
}

function parseSseData(eventChunk: string): string[] {
  return eventChunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .filter((value) => value !== '[DONE]');
}

function toHeadersRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function sendRequest(
  config: RequestConfig,
  modelInfo: OpenRouterModel | undefined,
  onStreamText: (text: string) => void,
): Promise<{ preview: RequestPreview; response: ResponseState }> {
  const preview = buildRequestPreview(config);
  const start = performance.now();

  const response = await fetch(preview.url, {
    method: preview.method,
    headers: preview.headers,
    body: JSON.stringify(preview.body),
  });

  const headers = toHeadersRecord(response.headers);

  if (!config.params.stream || !response.body) {
    const rawText = await response.text();
    const json = parseJson(rawText);
    const extractedText = extractText(config.provider, json);
    const usage = normalizeUsage(config.provider, json);
    const totalMs = performance.now() - start;

    return {
      preview,
      response: {
        status: response.status,
        ok: response.ok,
        headers,
        rawText,
        json,
        extractedText,
        usage,
        costEstimateUsd: estimateCost(modelInfo, usage),
        errorHint: response.ok ? undefined : providerErrorHint(config.provider, rawText),
        totalMs,
      },
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';
  let ttftMs: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!ttftMs) {
      ttftMs = performance.now() - start;
    }

    const chunk = decoder.decode(value, { stream: true });
    rawText += chunk;
    buffer += chunk;

    const parsed = parseSseEvents(buffer);
    buffer = parsed.remaining;
    for (const eventChunk of parsed.events) {
      const dataItems = parseSseData(eventChunk);
      for (const data of dataItems) {
        const json = parseJson(data);
        const partialText = extractText(config.provider, json);
        if (partialText) {
          onStreamText(partialText);
        }
      }
    }
  }

  const parsedJson = parseJson(rawText);
  const extractedText = extractText(config.provider, parsedJson);
  const usage = normalizeUsage(config.provider, parsedJson);
  const totalMs = performance.now() - start;

  return {
    preview,
    response: {
      status: response.status,
      ok: response.ok,
      headers,
      rawText,
      json: parsedJson,
      extractedText,
      usage,
      costEstimateUsd: estimateCost(modelInfo, usage),
      errorHint: response.ok ? undefined : providerErrorHint(config.provider, rawText),
      ttftMs,
      totalMs,
    },
  };
}

function providerErrorHint(provider: ProviderId, raw: string): string | undefined {
  const lower = raw.toLowerCase();
  if (provider === 'anthropic' && lower.includes('max_tokens')) {
    return copy.errors.anthropicMaxTokens;
  }
  if ((provider === 'openai-chat' || provider === 'openai-responses' || provider === 'custom') && lower.includes('api key')) {
    return copy.errors.openAiKey;
  }
  if (provider === 'gemini' && lower.includes('api key')) {
    return copy.errors.geminiKey;
  }
  if (provider === 'custom' && lower.includes('failed to fetch')) {
    return copy.errors.customCors;
  }
  return undefined;
}

export function copyAsCurl(preview: RequestPreview): string {
  const headerParts = Object.entries(preview.headers)
    .map(([key, value]) => `-H ${JSON.stringify(`${key}: ${value}`)}`)
    .join(' ');

  return `curl -X ${preview.method} ${JSON.stringify(preview.url)} ${headerParts} -d ${JSON.stringify(
    JSON.stringify(preview.body),
  )}`;
}
