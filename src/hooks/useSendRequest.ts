import { useState } from 'react';
import { buildRequestPreview, estimateCost, getAdapter } from '@/adapters';
import { parseJson } from '@/adapters/base';
import { copyAsCurl } from '@/lib/curl';
import { readStreamingResponse } from '@/lib/streaming';
import { useAppStore } from '@/store';
import type { HistoryItem, OpenRouterModel, RequestConfig, RequestPreview, ResponseState } from '@/types';

function toHeadersRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function createHistoryItem(request: RequestConfig, response: ResponseState, requestPreview: RequestPreview): HistoryItem {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), request, requestPreview, response };
}

function modelById(models: OpenRouterModel[], modelId: string): OpenRouterModel | undefined {
  return models.find((model) => model.id === modelId);
}

/** Sends requests and manages streaming text state for the shell. */
export function useSendRequest() {
  const [streamText, setStreamText] = useState('');

  const send = async (): Promise<void> => {
    const state = useAppStore.getState();
    const adapter = getAdapter(state.request.provider);
    const preview = buildRequestPreview(state.request);
    const model = modelById(state.models, state.request.model);

    state.setIsSending(true);
    state.setResponse(undefined);
    setStreamText('');

    try {
      const startedAt = performance.now();
      const transport = await fetch(preview.url, {
        method: preview.method,
        headers: preview.headers,
        body: JSON.stringify(preview.body),
      });
      const headers = toHeadersRecord(transport.headers);

      const response = state.request.params.stream && transport.body
        ? await handleStreamingResponse(transport, headers, startedAt, adapter.extractText, adapter.normalizeUsage, adapter.getErrorHint, model, setStreamText)
        : await handleStandardResponse(transport, headers, startedAt, adapter.extractText, adapter.normalizeUsage, adapter.getErrorHint, model);

      useAppStore.getState().setResponse(response);
      useAppStore.getState().prependHistory(createHistoryItem(structuredClone(state.request), response, preview));
    } catch (error) {
      useAppStore.getState().setResponse({
        ok: false,
        headers: {},
        rawText: String(error instanceof Error ? error.message : error),
        json: undefined,
        extractedText: '',
        usage: {},
        errorHint: 'Request failed before receiving a response. Check endpoint, key, and CORS policy.',
      });
    } finally {
      useAppStore.getState().setIsSending(false);
    }
  };

  const copyRequestCurl = async (): Promise<void> => {
    await navigator.clipboard.writeText(copyAsCurl(buildRequestPreview(useAppStore.getState().request)));
  };

  const copyResponseText = async (): Promise<void> => {
    const response = useAppStore.getState().response;
    await navigator.clipboard.writeText(streamText || response?.extractedText || '');
  };

  return { streamText, send, copyRequestCurl, copyResponseText, clearStreamText: () => setStreamText('') };
}

async function handleStandardResponse(
  transport: Response,
  headers: Record<string, string>,
  startedAt: number,
  extractText: (json: unknown) => string,
  normalizeUsage: (json: unknown) => ResponseState['usage'],
  getErrorHint: (rawText: string) => string | undefined,
  model: OpenRouterModel | undefined,
): Promise<ResponseState> {
  const rawText = await transport.text();
  const json = parseJson(rawText);
  const usage = normalizeUsage(json);
  return {
    status: transport.status,
    ok: transport.ok,
    headers,
    rawText,
    json,
    extractedText: extractText(json),
    usage,
    costEstimateUsd: estimateCost(model, usage.inputTokens, usage.outputTokens),
    errorHint: transport.ok ? undefined : getErrorHint(rawText),
    totalMs: performance.now() - startedAt,
  };
}

async function handleStreamingResponse(
  transport: Response,
  headers: Record<string, string>,
  startedAt: number,
  extractText: (json: unknown) => string,
  normalizeUsage: (json: unknown) => ResponseState['usage'],
  getErrorHint: (rawText: string) => string | undefined,
  model: OpenRouterModel | undefined,
  onText: (updater: (value: string) => string) => void,
): Promise<ResponseState> {
  const result = await readStreamingResponse(transport.body!, extractText, (text) => onText((value) => value + text), startedAt);
  const usage = normalizeUsage(result.finalJson);
  return {
    status: transport.status,
    ok: transport.ok,
    headers,
    rawText: result.rawText,
    json: result.finalJson,
    extractedText: result.streamedText || extractText(result.finalJson),
    usage,
    costEstimateUsd: estimateCost(model, usage.inputTokens, usage.outputTokens),
    errorHint: transport.ok ? undefined : getErrorHint(result.rawText),
    ttftMs: result.ttftMs,
    totalMs: performance.now() - startedAt,
  };
}
