import type { StateCreator } from 'zustand';
import type { AppState, HistoryItem, MessageItem, ProviderId, RequestConfig, ResponseState } from '@/types';

/** UI slice actions. */
export interface UiActions {
  setTheme(theme: 'dark' | 'light'): void;
  setShowRawRequest(show: boolean): void;
  setShowRawResponse(show: boolean): void;
  setModelSearch(value: string): void;
}

/** Request slice actions. */
export interface RequestActions {
  setProvider(provider: ProviderId): void;
  setRequestField<K extends keyof RequestConfig>(key: K, value: RequestConfig[K]): void;
  setParamsField<K extends keyof RequestConfig['params']>(key: K, value: RequestConfig['params'][K]): void;
  addMessage(): void;
  updateMessage(id: string, patch: Partial<MessageItem>): void;
  removeMessage(id: string): void;
  moveMessage(id: string, direction: -1 | 1): void;
  applyTemplate(templateId: string): void;
  replaceRequest(request: RequestConfig): void;
}

/** Response slice actions. */
export interface ResponseActions {
  setResponse(response: ResponseState | undefined): void;
  setIsSending(isSending: boolean): void;
}

/** Model slice actions. */
export interface ModelsActions {
  fetchModels(force?: boolean): Promise<void>;
}

/** History slice actions. */
export interface HistoryActions {
  prependHistory(item: HistoryItem): void;
  replayHistory(id: string): void;
  deleteHistory(id: string): void;
  clearHistory(): void;
}

/** Root application store type. */
export type AppStore = AppState & UiActions & RequestActions & ResponseActions & ModelsActions & HistoryActions;

/** Shared zustand slice creator type. */
export type AppSlice<T> = StateCreator<AppStore, [], [], T>;
