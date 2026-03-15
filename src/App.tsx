import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';
import { buildRequestPreview, copyAsCurl, providerOptions } from './adapters';
import { templates } from './templates';
import { useAppStore } from './store';
import type { MessageItem, OpenRouterModel } from './types';

function formatCurrency(value?: number): string {
  if (value === undefined) {
    return '—';
  }
  if (value === 0) {
    return '$0.00';
  }
  return `$${value.toFixed(6)}`;
}

function formatMs(value?: number): string {
  return value !== undefined ? `${Math.round(value)} ms` : '—';
}

function capabilityBadges(model: OpenRouterModel): string[] {
  const badges: string[] = [];
  if (model.supportsTools) badges.push('🔧 tools');
  if (model.supportsSearch) badges.push('🔍 search');
  if (model.supportsVision) badges.push('👁 vision');
  if (model.supportsReasoning) badges.push('🧠 reasoning');
  return badges;
}

function MessageRow({
  message,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  message: MessageItem;
  index: number;
  count: number;
  onChange: (id: string, patch: Partial<MessageItem>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="panel rounded-xl p-3 transition-all duration-200 hover:-translate-y-px">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
          value={message.role}
          onChange={(event) => onChange(message.id, { role: event.target.value as MessageItem['role'] })}
        >
          <option value="system">system</option>
          <option value="user">user</option>
          <option value="assistant">assistant</option>
          <option value="tool">tool</option>
        </select>
        {message.role === 'tool' ? (
          <input
            className="min-w-24 flex-1 rounded-md border px-2 py-1 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
            placeholder="tool name"
            value={message.name ?? ''}
            onChange={(event) => onChange(message.id, { name: event.target.value })}
          />
        ) : null}
        <div className="ml-auto flex gap-1">
          <button
            className="rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onMove(message.id, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            className="rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onMove(message.id, 1)}
            disabled={index === count - 1}
          >
            ↓
          </button>
          <button
            className="rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onRemove(message.id)}
          >
            remove
          </button>
        </div>
      </div>
      <textarea
        className="h-24 w-full rounded-md border p-2 text-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
        value={message.content}
        onChange={(event) => onChange(message.id, { content: event.target.value })}
      />
    </div>
  );
}

export default function App() {
  const {
    theme,
    setTheme,
    request,
    response,
    isSending,
    history,
    models,
    modelsLoading,
    modelsError,
    modelSearch,
    showRawRequest,
    showRawResponse,
    setShowRawRequest,
    setShowRawResponse,
    setModelSearch,
    setProvider,
    setRequestField,
    setParamsField,
    addMessage,
    updateMessage,
    removeMessage,
    moveMessage,
    applyTemplate,
    fetchModels,
    send,
    replayHistory,
    deleteHistory,
    clearHistory,
  } = useAppStore();

  const [streamText, setStreamText] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    void fetchModels(false);
  }, [fetchModels]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'enter' && !isSending) {
        event.preventDefault();
        setStreamText('');
        void send((text) => {
          setStreamText((curr) => curr + text);
        });
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.getElementById('model-search-input') as HTMLInputElement | null;
        input?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSending, send]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models
      .filter((model) => model.id.includes(q) || model.name.toLowerCase().includes(q) || model.provider.includes(q))
      .filter((model) => {
        if (request.provider === 'anthropic') {
          return model.provider.includes('anthropic');
        }
        if (request.provider === 'gemini') {
          return model.provider.includes('google') || model.id.includes('gemini');
        }
        if (request.provider === 'openai-chat' || request.provider === 'openai-responses') {
          return model.provider.includes('openai') || model.id.startsWith('openai/');
        }
        return true;
      })
      .slice(0, 80);
  }, [modelSearch, models, request.provider]);

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.id === request.model),
    [models, request.model],
  );

  const requestPreview = useMemo(() => {
    try {
      return buildRequestPreview(request);
    } catch {
      return undefined;
    }
  }, [request]);

  const requestPreviewJson = useMemo(
    () => (requestPreview ? JSON.stringify(requestPreview, null, 2) : '{\n  "error": "Model is required"\n}'),
    [requestPreview],
  );

  const responseJson = useMemo(() => {
    if (response?.json !== undefined) {
      return JSON.stringify(response.json, null, 2);
    }
    if (response?.rawText) {
      return response.rawText;
    }
    return '';
  }, [response]);

  const onSend = () => {
    setStreamText('');
    void send((text) => {
      setStreamText((curr) => curr + text);
    });
  };

  const onCopyCurl = async () => {
    if (!requestPreview) {
      return;
    }
    await navigator.clipboard.writeText(copyAsCurl(requestPreview));
  };

  const onCopyResponseText = async () => {
    const text = streamText || response?.extractedText || '';
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 py-4 md:px-4">
      <header className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border p-3 panel">
        <h1 className="text-lg font-semibold tracking-tight">API Pilot</h1>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          LLM API testing tool
        </span>
        <div className="ml-auto flex gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            className="rounded-md border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={onSend}
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </header>

      <main className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="panel rounded-xl p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="font-medium">Request Builder</h2>
              <label className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={showRawRequest}
                  onChange={(event) => setShowRawRequest(event.target.checked)}
                />
                Raw JSON
              </label>
              <button
                className="rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
                onClick={onCopyCurl}
              >
                Copy as cURL
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>Provider</span>
                <select
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  value={request.provider}
                  onChange={(event) => setProvider(event.target.value as typeof request.provider)}
                >
                  {providerOptions.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>API Key</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  type="password"
                  placeholder="Stored in localStorage only"
                  value={request.apiKey}
                  onChange={(event) => setRequestField('apiKey', event.target.value)}
                />
              </label>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>Model</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  value={request.model}
                  onChange={(event) => setRequestField('model', event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>Base URL</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  value={request.baseUrl}
                  onChange={(event) => setRequestField('baseUrl', event.target.value)}
                  placeholder="Custom provider base URL"
                />
              </label>
            </div>

            <label className="mt-2 block space-y-1 text-sm">
              <span style={{ color: 'var(--muted)' }}>System Prompt</span>
              <textarea
                className="h-20 w-full rounded-md border p-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                value={request.systemPrompt}
                onChange={(event) => setRequestField('systemPrompt', event.target.value)}
              />
            </label>

            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>Temperature</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={request.params.temperature}
                  onChange={(event) => setParamsField('temperature', Number(event.target.value))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>max_tokens</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  type="number"
                  min="1"
                  value={request.params.maxTokens}
                  onChange={(event) => setParamsField('maxTokens', Number(event.target.value))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span style={{ color: 'var(--muted)' }}>top_p</span>
                <input
                  className="w-full rounded-md border px-2 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={request.params.topP}
                  onChange={(event) => setParamsField('topP', Number(event.target.value))}
                />
              </label>
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={request.params.stream}
                  onChange={(event) => setParamsField('stream', event.target.checked)}
                />
                <span>stream</span>
              </label>
            </div>

            {showRawRequest ? (
              <div className="mt-3 overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
                <CodeMirror
                  value={requestPreviewJson}
                  editable={false}
                  height="220px"
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            ) : null}
          </div>

          <div className="panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium">Model Selector</h2>
              <button
                className="ml-auto rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => void fetchModels(true)}
              >
                Refresh
              </button>
            </div>
            <input
              id="model-search-input"
              className="mb-2 w-full rounded-md border px-2 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
              placeholder="Search OpenRouter models"
              value={modelSearch}
              onChange={(event) => setModelSearch(event.target.value)}
            />
            {modelsLoading ? <p className="text-sm">Loading models...</p> : null}
            {modelsError ? (
              <p className="text-sm" style={{ color: '#ff8a8a' }}>
                {modelsError}
              </p>
            ) : null}
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  className="panel block w-full rounded-md p-2 text-left transition-all duration-200 hover:border-sky-400"
                  style={{
                    borderColor: model.id === request.model ? 'var(--accent)' : 'var(--border)',
                    background: model.id === request.model ? 'color-mix(in srgb, var(--accent) 10%, var(--panel))' : undefined,
                  }}
                  onClick={() => setRequestField('model', model.id)}
                >
                  <div className="text-sm font-medium">{model.name}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {model.id} · {model.provider} · {model.contextLength.toLocaleString()} ctx
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded border px-1" style={{ borderColor: 'var(--border)' }}>
                      in ${(model.promptPricePerToken * 1_000_000).toFixed(2)}/1M
                    </span>
                    <span className="rounded border px-1" style={{ borderColor: 'var(--border)' }}>
                      out ${(model.completionPricePerToken * 1_000_000).toFixed(2)}/1M
                    </span>
                    {capabilityBadges(model).map((badge) => (
                      <span key={badge} className="rounded border px-1" style={{ borderColor: 'var(--border)' }}>
                        {badge}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium">Messages</h2>
              <button
                className="ml-auto rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
                onClick={addMessage}
              >
                Add Message
              </button>
            </div>
            <div className="space-y-2">
              {request.messages.map((message, idx) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  index={idx}
                  count={request.messages.length}
                  onChange={updateMessage}
                  onRemove={removeMessage}
                  onMove={moveMessage}
                />
              ))}
            </div>
          </div>

          <div className="panel rounded-xl p-3">
            <h2 className="mb-2 font-medium">Templates</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="rounded-md border p-2 text-left text-sm transition-all duration-200 hover:border-sky-400"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="font-medium">{template.name}</div>
                  <div style={{ color: 'var(--muted)' }}>{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium">Response Viewer</h2>
              <label className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={showRawResponse}
                  onChange={(event) => setShowRawResponse(event.target.checked)}
                />
                Raw JSON
              </label>
              <button
                className="rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => void onCopyResponseText()}
              >
                Copy Text
              </button>
            </div>

            <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                Status: {response?.status ?? '—'}
              </div>
              <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                TTFT: {formatMs(response?.ttftMs)}
              </div>
              <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                Total: {formatMs(response?.totalMs)}
              </div>
              <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                Cost: {formatCurrency(response?.costEstimateUsd)}
              </div>
            </div>

            <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
              Tokens: in {response?.usage.inputTokens ?? '—'} | out {response?.usage.outputTokens ?? '—'} | total{' '}
              {response?.usage.totalTokens ?? '—'}
            </div>

            {response?.errorHint ? (
              <div className="mt-2 rounded-md border p-2 text-sm" style={{ borderColor: '#ff8a8a', color: '#ffb4b4' }}>
                {response.errorHint}
              </div>
            ) : null}

            <div className="mt-3 rounded-md border p-3 text-sm leading-relaxed" style={{ borderColor: 'var(--border)' }}>
              {streamText || response?.extractedText || 'No response text yet.'}
            </div>

            {showRawResponse ? (
              <div className="mt-3 overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
                <CodeMirror
                  value={responseJson}
                  editable={false}
                  height="300px"
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            ) : null}

            <details className="mt-3 rounded-md border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
              <summary className="cursor-pointer">Status code + headers</summary>
              <pre className="mt-2 overflow-auto text-xs">
                {JSON.stringify({ status: response?.status, headers: response?.headers ?? {} }, null, 2)}
              </pre>
            </details>
          </div>

          <div className="panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium">History</h2>
              <button
                className="ml-auto rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                Clear
              </button>
            </div>
            <div className="max-h-[40rem] space-y-2 overflow-auto pr-1">
              {history.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No saved requests yet.
                </p>
              ) : null}
              {history.map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.request.model}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <span className="ml-auto text-xs">{item.response.status ?? 'error'}</span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    {item.request.provider} · {item.requestPreview.url}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => replayHistory(item.id)}
                    >
                      Replay
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => deleteHistory(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-xl p-3 text-xs" style={{ color: 'var(--muted)' }}>
            Selected model metadata: {selectedModelInfo ? `${selectedModelInfo.name} (${selectedModelInfo.provider})` : 'Not in OpenRouter index'}
          </div>
        </section>
      </main>
    </div>
  );
}
