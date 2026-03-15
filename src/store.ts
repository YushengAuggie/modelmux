import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sendRequest } from './adapters';
import { copy } from './copy';
import { fetchOpenRouterModels } from './models';
import { templates } from './templates';
import type { AppState, HistoryItem, MessageItem, OpenRouterModel, ProviderId, RequestConfig, ResponseState } from './types';

const defaultRequest: RequestConfig = {
  provider: 'openai-chat',
  model: 'openai/gpt-4o-mini',
  apiKey: '',
  baseUrl: 'http://localhost:11434/v1',
  systemPrompt: copy.defaults.systemPrompt,
  messages: [{ id: crypto.randomUUID(), role: 'user', content: copy.defaults.firstMessage }],
  params: {
    temperature: 0.7,
    maxTokens: 800,
    topP: 1,
    stream: false,
  },
};

interface AppActions {
  setTheme: (theme: 'dark' | 'light') => void;
  setShowRawRequest: (show: boolean) => void;
  setShowRawResponse: (show: boolean) => void;
  setModelSearch: (value: string) => void;
  setProvider: (provider: ProviderId) => void;
  setRequestField: <K extends keyof RequestConfig>(key: K, value: RequestConfig[K]) => void;
  setParamsField: <K extends keyof RequestConfig['params']>(
    key: K,
    value: RequestConfig['params'][K],
  ) => void;
  addMessage: () => void;
  updateMessage: (id: string, patch: Partial<MessageItem>) => void;
  removeMessage: (id: string) => void;
  moveMessage: (id: string, direction: -1 | 1) => void;
  applyTemplate: (templateId: string) => void;
  fetchModels: (force?: boolean) => Promise<void>;
  send: (onStreamText: (text: string) => void) => Promise<void>;
  replayHistory: (id: string) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

export type AppStore = AppState & AppActions;

function withFreshMessageIds(messages: MessageItem[]): MessageItem[] {
  return messages.map((msg) => ({ ...msg, id: crypto.randomUUID() }));
}

function createHistoryItem(request: RequestConfig, response: ResponseState, requestPreview: HistoryItem['requestPreview']): HistoryItem {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    request,
    requestPreview,
    response,
  };
}

function modelById(models: OpenRouterModel[], modelId: string): OpenRouterModel | undefined {
  return models.find((model) => model.id === modelId);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      showRawRequest: false,
      showRawResponse: false,
      modelSearch: '',
      request: defaultRequest,
      models: [],
      modelsLoading: false,
      modelsError: undefined,
      lastModelFetch: undefined,
      response: undefined,
      isSending: false,
      history: [],

      setTheme: (theme) => set({ theme }),
      setShowRawRequest: (showRawRequest) => set({ showRawRequest }),
      setShowRawResponse: (showRawResponse) => set({ showRawResponse }),
      setModelSearch: (modelSearch) => set({ modelSearch }),
      setProvider: (provider) =>
        set((state) => {
          const nextRequest = { ...state.request, provider };
          if (provider === 'gemini') {
            nextRequest.model = 'gemini-2.0-flash';
          }
          if (provider === 'anthropic') {
            nextRequest.model = 'anthropic/claude-sonnet-4';
          }
          if (provider === 'openai-responses') {
            nextRequest.model = 'openai/gpt-4.1';
          }
          if (provider === 'custom') {
            nextRequest.model = state.request.model || 'llama3';
            nextRequest.baseUrl = state.request.baseUrl || 'http://localhost:11434/v1';
          }
          return { request: nextRequest, response: undefined };
        }),
      setRequestField: (key, value) =>
        set((state) => ({
          request: {
            ...state.request,
            [key]: value,
          },
        })),
      setParamsField: (key, value) =>
        set((state) => ({
          request: {
            ...state.request,
            params: {
              ...state.request.params,
              [key]: value,
            },
          },
        })),
      addMessage: () =>
        set((state) => ({
          request: {
            ...state.request,
            messages: [...state.request.messages, { id: crypto.randomUUID(), role: 'user', content: '' }],
          },
        })),
      updateMessage: (id, patch) =>
        set((state) => ({
          request: {
            ...state.request,
            messages: state.request.messages.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)),
          },
        })),
      removeMessage: (id) =>
        set((state) => ({
          request: {
            ...state.request,
            messages: state.request.messages.filter((msg) => msg.id !== id),
          },
        })),
      moveMessage: (id, direction) =>
        set((state) => {
          const idx = state.request.messages.findIndex((msg) => msg.id === id);
          if (idx < 0) {
            return state;
          }
          const swapIdx = idx + direction;
          if (swapIdx < 0 || swapIdx >= state.request.messages.length) {
            return state;
          }
          const cloned = [...state.request.messages];
          const current = cloned[idx];
          cloned[idx] = cloned[swapIdx];
          cloned[swapIdx] = current;
          return {
            request: {
              ...state.request,
              messages: cloned,
            },
          };
        }),
      applyTemplate: (templateId) =>
        set((state) => {
          const found = templates.find((item) => item.id === templateId);
          if (!found) {
            return state;
          }
          return {
            request: {
              ...state.request,
              ...found.request,
              messages: withFreshMessageIds(found.request.messages ?? state.request.messages),
            },
          };
        }),
      fetchModels: async (force = false) => {
        set({ modelsLoading: true, modelsError: undefined });
        try {
          const result = await fetchOpenRouterModels(force);
          set({
            models: result.models,
            lastModelFetch: result.timestamp,
            modelsLoading: false,
            modelsError: undefined,
          });
        } catch (error) {
          set({
            modelsLoading: false,
            modelsError: error instanceof Error ? error.message : copy.errors.loadModels,
          });
        }
      },
      send: async (onStreamText) => {
        const state = get();
        set({ isSending: true, response: undefined });
        try {
          const modelInfo = modelById(state.models, state.request.model);
          const result = await sendRequest(state.request, modelInfo, onStreamText);

          const historyItem = createHistoryItem(
            structuredClone(state.request),
            result.response,
            result.preview,
          );

          set((curr) => ({
            isSending: false,
            response: result.response,
            history: [historyItem, ...curr.history].slice(0, 100),
          }));
        } catch (error) {
          set({
            isSending: false,
            response: {
              ok: false,
              headers: {},
              rawText: String(error instanceof Error ? error.message : error),
              json: undefined,
              extractedText: '',
              usage: {},
              errorHint: copy.errors.sendFailed,
            },
          });
        }
      },
      replayHistory: (id) =>
        set((state) => {
          const item = state.history.find((entry) => entry.id === id);
          if (!item) {
            return state;
          }
          return {
            request: {
              ...item.request,
              messages: withFreshMessageIds(item.request.messages),
            },
            response: item.response,
          };
        }),
      deleteHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'api-pilot-store-v1',
      partialize: (state) => ({
        theme: state.theme,
        showRawRequest: state.showRawRequest,
        showRawResponse: state.showRawResponse,
        request: state.request,
        history: state.history,
        lastModelFetch: state.lastModelFetch,
        models: state.models,
      }),
    },
  ),
);
