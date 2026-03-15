import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOpenRouterModels,
  isModelsCacheFresh,
  loadCachedModels,
} from '../models';

describe('models', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns undefined when cached models are missing', () => {
    expect(loadCachedModels()).toBeUndefined();
  });

  it('returns undefined for invalid cached JSON payloads', () => {
    localStorage.setItem('api-pilot-openrouter-models-v1', '{not-json');
    expect(loadCachedModels()).toBeUndefined();
  });

  it('detects fresh cache entries', () => {
    expect(isModelsCacheFresh(Date.now() - 1_000)).toBe(true);
  });

  it('detects stale or missing cache entries', () => {
    expect(isModelsCacheFresh()).toBe(false);
    expect(isModelsCacheFresh(Date.now() - 25 * 60 * 60 * 1000)).toBe(false);
  });

  it('uses cached models without calling fetch when cache is fresh', async () => {
    const cached = { timestamp: Date.now(), models: [{ id: 'openai/gpt', name: 'GPT', provider: 'openai', contextLength: 1, promptPricePerToken: 0, completionPricePerToken: 0, supportsTools: false, supportsSearch: false, supportsVision: false, supportsReasoning: false }] };
    localStorage.setItem('api-pilot-openrouter-models-v1', JSON.stringify(cached));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchOpenRouterModels();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('parses OpenRouter models, prices, providers, and capabilities', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'openai/gpt-4o-mini',
              name: 'GPT-4o mini',
              context_length: 128000,
              pricing: { prompt: '0.0000015', completion: 0.000006 },
              supported_parameters: ['tools', 'web_search_options', 'reasoning_effort'],
              architecture: { input_modalities: ['text', 'image'] },
            },
          ],
        }),
      ),
    );

    const result = await fetchOpenRouterModels(true);

    expect(result.models).toHaveLength(1);
    expect(result.models[0]).toEqual({
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o mini',
      provider: 'openai',
      contextLength: 128000,
      promptPricePerToken: 0.0000015,
      completionPricePerToken: 0.000006,
      supportsTools: true,
      supportsSearch: true,
      supportsVision: true,
      supportsReasoning: true,
    });
    expect(loadCachedModels()?.models[0].id).toBe('openai/gpt-4o-mini');
  });

  it('forces a refetch even when cache exists', async () => {
    localStorage.setItem(
      'api-pilot-openrouter-models-v1',
      JSON.stringify({ timestamp: Date.now(), models: [] }),
    );
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] })),
    );

    await fetchOpenRouterModels(true);

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('throws when the OpenRouter request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(fetchOpenRouterModels(true)).rejects.toThrow('Failed to fetch models (500)');
  });
});
