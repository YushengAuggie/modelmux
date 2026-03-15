import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRequestPreview,
  copyAsCurl,
  extractText,
  normalizeUsage,
  sendRequest,
} from '../adapters';
import type { OpenRouterModel, RequestConfig } from '../types';

const baseConfig: RequestConfig = {
  provider: 'openai-chat',
  model: 'openai/gpt-4o-mini',
  apiKey: 'test-key',
  baseUrl: 'http://localhost:11434/v1',
  systemPrompt: 'Be concise.',
  messages: [
    { id: 'm1', role: 'user', content: ' Hello ' },
    { id: 'm2', role: 'tool', name: 'lookup', content: ' result ' },
  ],
  params: {
    temperature: 0.4,
    maxTokens: 256,
    topP: 0.9,
    stream: false,
  },
};

function makeResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('buildRequestPreview', () => {
  it('builds OpenAI chat previews with auth and system message', () => {
    const preview = buildRequestPreview(baseConfig);

    expect(preview.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(preview.headers.authorization).toBe('Bearer test-key');
    expect(preview.body).toMatchObject({
      model: 'openai/gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 256,
      top_p: 0.9,
      stream: false,
    });
    expect(preview.body.messages).toEqual([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Hello' },
      { role: 'tool', name: 'lookup', content: 'result' },
    ]);
  });

  it('builds custom previews with fallback base URL', () => {
    const preview = buildRequestPreview({
      ...baseConfig,
      provider: 'custom',
      baseUrl: '  ',
    });

    expect(preview.url).toBe('http://localhost:11434/v1/chat/completions');
    expect(preview.headers.authorization).toBe('Bearer test-key');
  });

  it('builds OpenAI responses previews', () => {
    const preview = buildRequestPreview({
      ...baseConfig,
      provider: 'openai-responses',
    });

    expect(preview.url).toBe('https://api.openai.com/v1/responses');
    expect(preview.body).toMatchObject({
      model: 'openai/gpt-4o-mini',
      instructions: 'Be concise.',
      temperature: 0.4,
      top_p: 0.9,
      max_output_tokens: 256,
    });
    expect(preview.body.input).toEqual([
      { role: 'user', content: ' Hello ' },
      { role: 'tool', content: ' result ' },
    ]);
  });

  it('builds Anthropic previews with required headers', () => {
    const preview = buildRequestPreview({
      ...baseConfig,
      provider: 'anthropic',
    });

    expect(preview.url).toBe('https://api.anthropic.com/v1/messages');
    expect(preview.headers).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
    expect(preview.body.messages).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'user', content: [{ type: 'text', text: 'result' }] },
    ]);
  });

  it('builds Gemini previews with model in URL path', () => {
    const preview = buildRequestPreview({
      ...baseConfig,
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      params: { ...baseConfig.params, stream: true },
    });

    expect(preview.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse',
    );
    expect(preview.headers['x-goog-api-key']).toBe('test-key');
    expect(preview.body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      systemInstruction: { parts: [{ text: 'Be concise.' }] },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 256,
        topP: 0.9,
      },
    });
  });

  it('throws when model is blank', () => {
    expect(() =>
      buildRequestPreview({
        ...baseConfig,
        model: '  ',
      }),
    ).toThrow('Model is required');
  });
});

describe('extractText', () => {
  it('extracts OpenAI chat string content', () => {
    expect(
      extractText('openai-chat', {
        choices: [{ message: { content: 'hello world' } }],
      }),
    ).toBe('hello world');
  });

  it('extracts OpenAI chat block content arrays', () => {
    expect(
      extractText('custom', {
        choices: [{ message: { content: [{ text: 'line 1' }, { text: 'line 2' }] } }],
      }),
    ).toBe('line 1\nline 2');
  });

  it('extracts OpenAI responses output text', () => {
    expect(
      extractText('openai-responses', {
        output: [{ content: [{ text: 'first' }, { text: 'second' }] }],
      }),
    ).toBe('first\nsecond');
  });

  it('extracts Anthropic text blocks only', () => {
    expect(
      extractText('anthropic', {
        content: [
          { type: 'thinking', text: 'ignored' },
          { type: 'text', text: 'answer' },
        ],
      }),
    ).toBe('answer');
  });

  it('extracts Gemini candidate parts', () => {
    expect(
      extractText('gemini', {
        candidates: [{ content: { parts: [{ text: 'part 1' }, { text: 'part 2' }] } }],
      }),
    ).toBe('part 1\npart 2');
  });

  it('returns an empty string for unknown shapes', () => {
    expect(extractText('gemini', {})).toBe('');
  });
});

describe('normalizeUsage', () => {
  it('normalizes OpenAI chat usage fields', () => {
    expect(
      normalizeUsage('openai-chat', {
        usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
      }),
    ).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      totalTokens: 18,
    });
  });

  it('normalizes OpenAI responses usage fields', () => {
    expect(
      normalizeUsage('openai-responses', {
        usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 },
      }),
    ).toEqual({
      inputTokens: 2,
      outputTokens: 3,
      totalTokens: 5,
    });
  });

  it('normalizes Anthropic usage and derives total tokens', () => {
    expect(
      normalizeUsage('anthropic', {
        usage: { input_tokens: 12, output_tokens: 8 },
      }),
    ).toEqual({
      inputTokens: 12,
      outputTokens: 8,
      totalTokens: 20,
    });
  });

  it('normalizes Gemini usage metadata', () => {
    expect(
      normalizeUsage('gemini', {
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 9, totalTokenCount: 14 },
      }),
    ).toEqual({
      inputTokens: 5,
      outputTokens: 9,
      totalTokens: 14,
    });
  });

  it('returns empty usage when values are missing', () => {
    expect(normalizeUsage('custom', { usage: { prompt_tokens: 'x' } })).toEqual({
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
    });
  });
});

describe('copyAsCurl', () => {
  it('serializes previews to a curl command', () => {
    const preview = buildRequestPreview(baseConfig);
    const curl = copyAsCurl(preview);

    expect(curl).toContain('curl -X POST');
    expect(curl).toContain('"https://api.openai.com/v1/chat/completions"');
    expect(curl).toContain('"authorization: Bearer test-key"');
    expect(curl).toContain('\\"model\\":\\"openai/gpt-4o-mini\\"');
  });
});

describe('sendRequest error hints', () => {
  const modelInfo: OpenRouterModel = {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    contextLength: 128000,
    promptPricePerToken: 0.000001,
    completionPricePerToken: 0.000002,
    supportsTools: true,
    supportsSearch: false,
    supportsVision: false,
    supportsReasoning: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds Anthropic max_tokens hint on failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse('missing max_tokens', { status: 400, statusText: 'Bad Request' }),
    );

    const result = await sendRequest(
      { ...baseConfig, provider: 'anthropic' },
      modelInfo,
      vi.fn(),
    );

    expect(result.response.ok).toBe(false);
    expect(result.response.errorHint).toBe('Anthropic requires `max_tokens` as a top-level field.');
  });

  it('adds OpenAI-compatible auth hints on failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse('invalid api key', { status: 401, statusText: 'Unauthorized' }),
    );

    const result = await sendRequest(baseConfig, modelInfo, vi.fn());

    expect(result.response.errorHint).toBe(
      'OpenAI-compatible providers require `Authorization: Bearer <key>`.',
    );
  });

  it('adds Gemini header hints on failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse('api key missing', { status: 403, statusText: 'Forbidden' }),
    );

    const result = await sendRequest(
      { ...baseConfig, provider: 'gemini', model: 'gemini-2.0-flash' },
      modelInfo,
      vi.fn(),
    );

    expect(result.response.errorHint).toBe(
      'Gemini requires `x-goog-api-key` header and model in URL path.',
    );
  });

  it('adds custom provider CORS hints on failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeResponse('Failed to fetch', { status: 500, statusText: 'Internal Server Error' }),
    );

    const result = await sendRequest(
      { ...baseConfig, provider: 'custom' },
      modelInfo,
      vi.fn(),
    );

    expect(result.response.errorHint).toBe(
      'Custom endpoint may block CORS. Check base URL and local server availability.',
    );
  });
});
