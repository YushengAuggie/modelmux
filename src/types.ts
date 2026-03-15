export type ProviderId =
  | 'openai-chat'
  | 'openai-responses'
  | 'anthropic'
  | 'gemini'
  | 'custom';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageItem {
  id: string;
  role: MessageRole;
  content: string;
  name?: string;
}

export interface ParamsState {
  temperature: number;
  maxTokens: number;
  topP: number;
  stream: boolean;
}

export interface RequestConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  messages: MessageItem[];
  params: ParamsState;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  promptPricePerToken: number;
  completionPricePerToken: number;
  supportsTools: boolean;
  supportsSearch: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export interface NormalizedUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface RequestPreview {
  method: 'POST';
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface ResponseState {
  status?: number;
  ok: boolean;
  headers: Record<string, string>;
  rawText: string;
  json: unknown;
  extractedText: string;
  usage: NormalizedUsage;
  costEstimateUsd?: number;
  errorHint?: string;
  ttftMs?: number;
  totalMs?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  request: RequestConfig;
  requestPreview: RequestPreview;
  response: ResponseState;
}

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  request: Partial<RequestConfig>;
}

export interface AppState {
  theme: 'dark' | 'light';
  showRawRequest: boolean;
  showRawResponse: boolean;
  modelSearch: string;
  request: RequestConfig;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError?: string;
  lastModelFetch?: number;
  response?: ResponseState;
  isSending: boolean;
  history: HistoryItem[];
}
