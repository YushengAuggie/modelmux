import type { OpenRouterModel } from './types';

const MODELS_CACHE_KEY = 'api-pilot-openrouter-models-v1';
const MODELS_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedPayload {
  timestamp: number;
  models: OpenRouterModel[];
}

function parsePrice(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveProvider(id: string): string {
  const prefix = id.split('/')[0];
  return prefix || 'unknown';
}

export function loadCachedModels(): CachedPayload | undefined {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed.models) || typeof parsed.timestamp !== 'number') {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function isModelsCacheFresh(timestamp?: number): boolean {
  if (!timestamp) {
    return false;
  }
  return Date.now() - timestamp < MODELS_TTL_MS;
}

export async function fetchOpenRouterModels(force = false): Promise<{ models: OpenRouterModel[]; timestamp: number }> {
  const cached = loadCachedModels();
  if (!force && cached && isModelsCacheFresh(cached.timestamp)) {
    return { models: cached.models, timestamp: cached.timestamp };
  }

  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) {
    throw new Error(`Failed to fetch models (${res.status})`);
  }

  const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
  const data = Array.isArray(json.data) ? json.data : [];
  const models: OpenRouterModel[] = data.map((item) => {
    const id = typeof item.id === 'string' ? item.id : '';
    const name = typeof item.name === 'string' && item.name ? item.name : id;
    const supportedParameters = Array.isArray(item.supported_parameters) ? item.supported_parameters : [];
    const architecture = (item.architecture as Record<string, unknown>) || {};
    const inputModalities = Array.isArray(architecture.input_modalities)
      ? architecture.input_modalities
      : [];

    return {
      id,
      name,
      provider: deriveProvider(id),
      contextLength: typeof item.context_length === 'number' ? item.context_length : 0,
      promptPricePerToken: parsePrice((item.pricing as Record<string, unknown> | undefined)?.prompt),
      completionPricePerToken: parsePrice((item.pricing as Record<string, unknown> | undefined)?.completion),
      supportsTools: supportedParameters.includes('tools'),
      supportsSearch: supportedParameters.includes('web_search_options'),
      supportsVision: inputModalities.includes('image') || inputModalities.includes('images'),
      supportsReasoning:
        supportedParameters.includes('reasoning') || supportedParameters.includes('reasoning_effort'),
    };
  });

  const timestamp = Date.now();
  localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ timestamp, models }));
  return { models, timestamp };
}
