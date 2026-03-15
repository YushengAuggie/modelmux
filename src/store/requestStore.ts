import { templates } from '@/templates';
import type { AppSlice } from '@/store/types';
import type { MessageItem, RequestConfig } from '@/types';

/** Default request loaded into the app. */
export const defaultRequest: RequestConfig = {
  provider: 'openai-chat',
  model: 'openai/gpt-4o-mini',
  apiKey: '',
  baseUrl: 'http://localhost:11434/v1',
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ id: crypto.randomUUID(), role: 'user', content: 'Hello, what can you do?' }],
  params: { temperature: 0.7, maxTokens: 800, topP: 1, stream: false },
};

/** Clones messages with fresh client-side IDs. */
export function withFreshMessageIds(messages: MessageItem[]): MessageItem[] {
  return messages.map((message) => ({ ...message, id: crypto.randomUUID() }));
}

/** Creates the request slice. */
export const createRequestSlice: AppSlice<Pick<import('@/types').AppState, 'request'> & import('@/store/types').RequestActions> = (
  set,
) => ({
  request: defaultRequest,
  setProvider: (provider) =>
    set((state) => {
      const request = { ...state.request, provider };
      if (provider === 'gemini') request.model = 'gemini-2.0-flash';
      if (provider === 'anthropic') request.model = 'anthropic/claude-sonnet-4';
      if (provider === 'openai-responses') request.model = 'openai/gpt-4.1';
      if (provider === 'custom') {
        request.model = state.request.model || 'llama3';
        request.baseUrl = state.request.baseUrl || 'http://localhost:11434/v1';
      }
      return { request, response: undefined };
    }),
  setRequestField: (key, value) => set((state) => ({ request: { ...state.request, [key]: value } })),
  setParamsField: (key, value) =>
    set((state) => ({ request: { ...state.request, params: { ...state.request.params, [key]: value } } })),
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
        messages: state.request.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
      },
    })),
  removeMessage: (id) =>
    set((state) => ({
      request: { ...state.request, messages: state.request.messages.filter((message) => message.id !== id) },
    })),
  moveMessage: (id, direction) =>
    set((state) => {
      const index = state.request.messages.findIndex((message) => message.id === id);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= state.request.messages.length) {
        return state;
      }
      const messages = [...state.request.messages];
      [messages[index], messages[swapIndex]] = [messages[swapIndex], messages[index]];
      return { request: { ...state.request, messages } };
    }),
  applyTemplate: (templateId) =>
    set((state) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        return state;
      }
      return {
        request: {
          ...state.request,
          ...template.request,
          messages: withFreshMessageIds(template.request.messages ?? state.request.messages),
        },
      };
    }),
  replaceRequest: (request) => set({ request: { ...request, messages: withFreshMessageIds(request.messages) } }),
});
