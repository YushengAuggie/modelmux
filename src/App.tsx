import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';
import { buildRequestPreview, copyAsCurl, providerOptions } from './adapters';
import { templates } from './templates';
import { useAppStore } from './store';
import type { MessageItem, OpenRouterModel, ProviderId } from './types';

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
  if (model.supportsTools) badges.push('Tools');
  if (model.supportsSearch) badges.push('Search');
  if (model.supportsVision) badges.push('Vision');
  if (model.supportsReasoning) badges.push('Reasoning');
  return badges;
}

function providerTone(provider: ProviderId): string {
  switch (provider) {
    case 'openai-chat':
    case 'openai-responses':
      return 'is-openai';
    case 'anthropic':
      return 'is-assistant';
    case 'gemini':
      return 'is-tool';
    case 'custom':
      return 'is-custom';
    default:
      return '';
  }
}

function messageTitle(role: MessageItem['role']): string {
  switch (role) {
    case 'system':
      return 'System';
    case 'user':
      return 'User';
    case 'assistant':
      return 'Assistant';
    case 'tool':
      return 'Tool';
    default:
      return role;
  }
}

function MessageBubble({
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
    <article className={`message-bubble ${providerTone(message.role === 'assistant' ? 'anthropic' : message.role === 'tool' ? 'gemini' : message.role === 'system' ? 'custom' : 'openai-chat')}`}>
      <div className="message-bubble__header">
        <div className="message-bubble__meta">
          <span className="role-badge">{messageTitle(message.role)}</span>
          <select
            className="control-input control-input--compact"
            aria-label={`Message ${index + 1} role`}
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
              className="control-input control-input--compact"
              placeholder="tool name"
              value={message.name ?? ''}
              onChange={(event) => onChange(message.id, { name: event.target.value })}
            />
          ) : null}
        </div>
        <div className="message-bubble__actions">
          <button className="secondary-button icon-button" onClick={() => onMove(message.id, -1)} disabled={index === 0}>
            ↑
          </button>
          <button className="secondary-button icon-button" onClick={() => onMove(message.id, 1)} disabled={index === count - 1}>
            ↓
          </button>
          <button className="ghost-button" onClick={() => onRemove(message.id)}>
            Remove
          </button>
        </div>
      </div>
      <textarea
        className="bubble-editor"
        value={message.content}
        placeholder={`Write the ${message.role} message...`}
        onChange={(event) => onChange(message.id, { content: event.target.value })}
      />
    </article>
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
  const [historyOpen, setHistoryOpen] = useState(true);

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
      .slice(0, 10);
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

  const responseText = streamText || response?.extractedText || '';

  const providerLabel = providerOptions.find((provider) => provider.id === request.provider)?.label ?? request.provider;

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
    await navigator.clipboard.writeText(responseText);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">AP</div>
          <div>
            <p className="eyebrow">LLM API testing tool</p>
            <h1>API Pilot</h1>
          </div>
        </div>
        <div className="header-actions">
          <div className="header-status">
            <span className="status-dot" />
            <span>{providerLabel}</span>
            <span className="status-separator">/</span>
            <span className="mono-text">{request.model || 'Select a model'}</span>
          </div>
          <button className="secondary-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="primary-button" onClick={onSend} disabled={isSending}>
            {isSending ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="response-column">
          <div className="surface surface--hero">
            <div className="response-headline">
              <div>
                <p className="eyebrow">Response</p>
                <h2>Inspect output first, then tune the request.</h2>
              </div>
              <div className="response-headline__actions">
                <button className="secondary-button" onClick={() => void onCopyResponseText()} disabled={!responseText}>
                  Copy text
                </button>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={showRawResponse}
                    onChange={(event) => setShowRawResponse(event.target.checked)}
                  />
                  <span>Raw JSON</span>
                </label>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Status</span>
                <strong>{response?.status ?? '—'}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">TTFT</span>
                <strong>{formatMs(response?.ttftMs)}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total time</span>
                <strong>{formatMs(response?.totalMs)}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Estimated cost</span>
                <strong>{formatCurrency(response?.costEstimateUsd)}</strong>
              </div>
            </div>

            <div className="token-bar">
              <span>Input {response?.usage.inputTokens ?? '—'}</span>
              <span>Output {response?.usage.outputTokens ?? '—'}</span>
              <span>Total {response?.usage.totalTokens ?? '—'}</span>
            </div>

            {response?.errorHint ? <div className="error-banner">{response.errorHint}</div> : null}

            <article className="response-output">
              {responseText ? <pre>{responseText}</pre> : <p className="empty-state">No response text yet. Send a request to see output here.</p>}
            </article>

            {showRawResponse ? (
              <div className="code-panel">
                <CodeMirror
                  value={responseJson}
                  editable={false}
                  height="320px"
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            ) : null}

            <details className="detail-panel">
              <summary>Status code and headers</summary>
              <pre>{JSON.stringify({ status: response?.status, headers: response?.headers ?? {} }, null, 2)}</pre>
            </details>
          </div>

          <section className="surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">History</p>
                <h3>Recent runs</h3>
              </div>
              <div className="section-heading__actions">
                <button className="ghost-button" onClick={() => setHistoryOpen((open) => !open)}>
                  {historyOpen ? 'Collapse' : 'Expand'}
                </button>
                <button className="ghost-button" onClick={clearHistory} disabled={history.length === 0}>
                  Clear
                </button>
              </div>
            </div>

            {historyOpen ? (
              <div className="history-list">
                {history.length === 0 ? <p className="empty-state">No saved requests yet.</p> : null}
                {history.map((item) => (
                  <article key={item.id} className="history-card">
                    <div className="history-card__top">
                      <div>
                        <strong>{item.request.model}</strong>
                        <p>{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="status-pill">{item.response.status ?? 'error'}</span>
                    </div>
                    <p className="history-meta">
                      {item.request.provider} · {item.requestPreview.url}
                    </p>
                    <div className="history-actions">
                      <button className="secondary-button" onClick={() => replayHistory(item.id)}>
                        Replay
                      </button>
                      <button className="ghost-button" onClick={() => deleteHistory(item.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>

        <aside className="control-column">
          <section className="surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Request setup</p>
                <h3>Choose provider and model</h3>
              </div>
              <button className="ghost-button" onClick={() => void fetchModels(true)}>
                Refresh models
              </button>
            </div>

            <div className="provider-pills" role="tablist" aria-label="Provider selection">
              {providerOptions.map((provider) => (
                <button
                  key={provider.id}
                  className={`provider-pill ${request.provider === provider.id ? 'is-active' : ''}`}
                  onClick={() => setProvider(provider.id)}
                >
                  {provider.label}
                </button>
              ))}
            </div>

            <div className="field-grid">
              <label className="field">
                <span>API key</span>
                <input
                  className="control-input"
                  type="password"
                  placeholder="Stored in localStorage only"
                  value={request.apiKey}
                  onChange={(event) => setRequestField('apiKey', event.target.value)}
                />
              </label>

              <label className="field">
                <span>Base URL</span>
                <input
                  className="control-input mono-text"
                  value={request.baseUrl}
                  onChange={(event) => setRequestField('baseUrl', event.target.value)}
                  placeholder="Custom provider base URL"
                />
              </label>
            </div>

            <div className="model-search-panel">
              <label className="field">
                <span>Model search</span>
                <input
                  id="model-search-input"
                  className="control-input"
                  placeholder="Search models, providers, or IDs"
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Selected model</span>
                <input
                  className="control-input mono-text"
                  value={request.model}
                  onChange={(event) => setRequestField('model', event.target.value)}
                />
              </label>

              {modelsLoading ? <p className="helper-text">Loading models…</p> : null}
              {modelsError ? <p className="error-text">{modelsError}</p> : null}

              <div className="model-results" role="list">
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    className={`model-option ${model.id === request.model ? 'is-active' : ''}`}
                    onClick={() => setRequestField('model', model.id)}
                  >
                    <div className="model-option__top">
                      <strong>{model.name}</strong>
                      <span>{model.contextLength.toLocaleString()} ctx</span>
                    </div>
                    <p className="model-option__id">{model.id}</p>
                    <div className="model-option__meta">
                      <span>{model.provider}</span>
                      <span>In ${(model.promptPricePerToken * 1_000_000).toFixed(2)}/1M</span>
                      <span>Out ${(model.completionPricePerToken * 1_000_000).toFixed(2)}/1M</span>
                    </div>
                    <div className="badge-row">
                      {capabilityBadges(model).map((badge) => (
                        <span key={badge} className="mini-badge">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="selected-model-card">
              <span className="eyebrow">Active model</span>
              <strong>{selectedModelInfo ? selectedModelInfo.name : request.model || 'Not selected'}</strong>
              <p>
                {selectedModelInfo
                  ? `${selectedModelInfo.provider} · ${selectedModelInfo.contextLength.toLocaleString()} token context`
                  : 'Not in the OpenRouter index. You can still send to custom-compatible endpoints.'}
              </p>
            </div>
          </section>

          <section className="surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Prompting</p>
                <h3>Compose the conversation</h3>
              </div>
              <button className="secondary-button" onClick={addMessage}>
                Add message
              </button>
            </div>

            <label className="field">
              <span>System prompt</span>
              <textarea
                className="control-input control-textarea"
                value={request.systemPrompt}
                onChange={(event) => setRequestField('systemPrompt', event.target.value)}
                placeholder="Set behavior, constraints, or persona"
              />
            </label>

            <div className="template-strip" aria-label="Prompt templates">
              {templates.map((template) => (
                <button key={template.id} className="template-chip" onClick={() => applyTemplate(template.id)}>
                  <span>{template.name}</span>
                  <small>{template.description}</small>
                </button>
              ))}
            </div>

            <div className="message-list">
              {request.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  index={index}
                  count={request.messages.length}
                  onChange={updateMessage}
                  onRemove={removeMessage}
                  onMove={moveMessage}
                />
              ))}
            </div>
          </section>

          <section className="surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Request tuning</p>
                <h3>Parameters and payload</h3>
              </div>
              <div className="section-heading__actions">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={showRawRequest}
                    onChange={(event) => setShowRawRequest(event.target.checked)}
                  />
                  <span>Raw JSON</span>
                </label>
                <button className="ghost-button" onClick={() => void onCopyCurl()}>
                  Copy as cURL
                </button>
              </div>
            </div>

            <div className="field-grid field-grid--metrics">
              <label className="field">
                <span>Temperature</span>
                <input
                  className="control-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={request.params.temperature}
                  onChange={(event) => setParamsField('temperature', Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Max tokens</span>
                <input
                  className="control-input"
                  type="number"
                  min="1"
                  value={request.params.maxTokens}
                  onChange={(event) => setParamsField('maxTokens', Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Top P</span>
                <input
                  className="control-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={request.params.topP}
                  onChange={(event) => setParamsField('topP', Number(event.target.value))}
                />
              </label>
              <label className="toggle-card">
                <span>
                  <strong>Streaming</strong>
                  <small>Receive tokens incrementally</small>
                </span>
                <input
                  type="checkbox"
                  checked={request.params.stream}
                  onChange={(event) => setParamsField('stream', event.target.checked)}
                />
              </label>
            </div>

            {showRawRequest ? (
              <div className="code-panel">
                <CodeMirror
                  value={requestPreviewJson}
                  editable={false}
                  height="280px"
                  extensions={[json()]}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            ) : null}
          </section>
        </aside>
      </main>
    </div>
  );
}
