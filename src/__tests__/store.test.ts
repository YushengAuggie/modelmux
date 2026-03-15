import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/models', () => ({
  fetchOpenRouterModels: vi.fn(),
}));

import { fetchOpenRouterModels } from '@/models';
import { useAppStore } from '@/store';
import { templates } from '@/templates';
import type { OpenRouterModel } from '@/types';

const mockedFetchOpenRouterModels = vi.mocked(fetchOpenRouterModels);

const initialRequest = structuredClone(useAppStore.getState().request);
const baseModel: OpenRouterModel = {
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

function resetStore(): void {
  localStorage.clear();
  useAppStore.setState({
    theme: 'dark',
    showRawRequest: false,
    showRawResponse: false,
    modelSearch: '',
    request: structuredClone(initialRequest),
    models: [],
    modelsLoading: false,
    modelsError: undefined,
    lastModelFetch: undefined,
    response: undefined,
    isSending: false,
    history: [],
  });
}

describe('store actions', () => {
  beforeEach(() => {
    mockedFetchOpenRouterModels.mockReset();
    resetStore();
  });

  it('adds a blank user message', () => {
    const before = useAppStore.getState().request.messages.length;

    useAppStore.getState().addMessage();

    const after = useAppStore.getState().request.messages;
    expect(after).toHaveLength(before + 1);
    expect(after.at(-1)).toMatchObject({ role: 'user', content: '' });
  });

  it('removes a message by id', () => {
    const id = useAppStore.getState().request.messages[0].id;

    useAppStore.getState().removeMessage(id);

    expect(useAppStore.getState().request.messages.find((message) => message.id === id)).toBeUndefined();
  });

  it('moves messages down when possible', () => {
    useAppStore.setState({
      request: {
        ...useAppStore.getState().request,
        messages: [
          { id: 'a', role: 'user', content: 'first' },
          { id: 'b', role: 'assistant', content: 'second' },
        ],
      },
    });

    useAppStore.getState().moveMessage('a', 1);

    expect(useAppStore.getState().request.messages.map((message) => message.id)).toEqual(['b', 'a']);
  });

  it('does not move messages past boundaries', () => {
    const before = structuredClone(useAppStore.getState().request.messages);

    useAppStore.getState().moveMessage(before[0].id, -1);

    expect(useAppStore.getState().request.messages).toEqual(before);
  });

  it('applies templates with fresh message ids', () => {
    const template = templates.find((item) => item.id === 'multi-turn-tool');
    expect(template).toBeDefined();

    useAppStore.getState().applyTemplate('multi-turn-tool');

    const request = useAppStore.getState().request;
    expect(request.provider).toBe(template?.request.provider);
    expect(request.messages).toHaveLength(template?.request.messages?.length ?? 0);
    expect(request.messages.map((message) => message.id)).not.toEqual(
      template?.request.messages?.map((message) => message.id),
    );
  });

  it('ignores unknown templates', () => {
    const before = structuredClone(useAppStore.getState().request);

    useAppStore.getState().applyTemplate('missing-template');

    expect(useAppStore.getState().request).toEqual(before);
  });

  it('switches provider to Gemini and updates the default model', () => {
    useAppStore.setState({
      response: {
        ok: true,
        headers: {},
        rawText: '',
        json: {},
        extractedText: '',
        usage: {},
      },
    });

    useAppStore.getState().setProvider('gemini');

    const state = useAppStore.getState();
    expect(state.request.provider).toBe('gemini');
    expect(state.request.model).toBe('gemini-2.0-flash');
    expect(state.response).toBeUndefined();
  });

  it('switches provider to OpenAI responses and updates the default model', () => {
    useAppStore.getState().setProvider('openai-responses');

    expect(useAppStore.getState().request.model).toBe('openai/gpt-4.1');
  });

  it('loads models successfully', async () => {
    mockedFetchOpenRouterModels.mockResolvedValue({
      models: [baseModel],
      timestamp: 123,
    });

    await useAppStore.getState().fetchModels();

    expect(useAppStore.getState().models).toEqual([baseModel]);
    expect(useAppStore.getState().lastModelFetch).toBe(123);
    expect(useAppStore.getState().modelsError).toBeUndefined();
  });

  it('stores model loading errors', async () => {
    mockedFetchOpenRouterModels.mockRejectedValue(new Error('boom'));

    await useAppStore.getState().fetchModels();

    expect(useAppStore.getState().modelsLoading).toBe(false);
    expect(useAppStore.getState().modelsError).toBe('boom');
  });

  it('stores response state through slice actions', () => {
    useAppStore.getState().setResponse({
      ok: true,
      status: 200,
      headers: {},
      rawText: '{"ok":true}',
      json: { ok: true },
      extractedText: 'hello',
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    });
    useAppStore.getState().setIsSending(true);

    const state = useAppStore.getState();
    expect(state.response?.extractedText).toBe('hello');
    expect(state.isSending).toBe(true);
  });

  it('prepends history entries', () => {
    const item = {
      id: 'h1',
      timestamp: '2026-03-14T00:00:00.000Z',
      request: structuredClone(initialRequest),
      requestPreview: {
        method: 'POST' as const,
        url: 'https://example.com',
        headers: {},
        body: {},
      },
      response: {
        ok: true,
        headers: {},
        rawText: '',
        json: {},
        extractedText: 'saved',
        usage: {},
      },
    };

    useAppStore.getState().prependHistory(item);

    expect(useAppStore.getState().history).toEqual([item]);
  });

  it('replays, deletes, and clears history', () => {
    useAppStore.setState({
      history: [
        {
          id: 'h1',
          timestamp: '2026-03-14T00:00:00.000Z',
          request: {
            ...structuredClone(initialRequest),
            messages: [{ id: 'orig', role: 'user', content: 'from history' }],
          },
          requestPreview: {
            method: 'POST',
            url: 'https://example.com',
            headers: {},
            body: {},
          },
          response: {
            ok: true,
            headers: {},
            rawText: '',
            json: {},
            extractedText: 'saved',
            usage: {},
          },
        },
      ],
    });

    useAppStore.getState().replayHistory('h1');
    expect(useAppStore.getState().request.messages[0].content).toBe('from history');
    expect(useAppStore.getState().request.messages[0].id).not.toBe('orig');
    expect(useAppStore.getState().response?.extractedText).toBe('saved');

    useAppStore.getState().deleteHistory('h1');
    expect(useAppStore.getState().history).toHaveLength(0);

    useAppStore.setState({
      history: [
        {
          id: 'h2',
          timestamp: '2026-03-14T00:00:00.000Z',
          request: structuredClone(initialRequest),
          requestPreview: {
            method: 'POST',
            url: 'https://example.com',
            headers: {},
            body: {},
          },
          response: {
            ok: true,
            headers: {},
            rawText: '',
            json: {},
            extractedText: '',
            usage: {},
          },
        },
      ],
    });
    useAppStore.getState().clearHistory();
    expect(useAppStore.getState().history).toHaveLength(0);
  });
});
