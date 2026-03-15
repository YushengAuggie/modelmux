import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';
import { buildRequestPreview, providerOptions } from '@/adapters';

import { templates } from '@/templates';
import { useAppStore } from '@/store';
import { useSendRequest } from '@/hooks/useSendRequest';
import type { MessageItem, OpenRouterModel, ProviderId } from '@/types';

const MOBILE_BREAKPOINT = 767;

type StatusTone = 'idle' | 'success' | 'warning' | 'error';

function getStatusTone(status?: number): StatusTone {
  if (status === undefined) return 'idle';
  if (status >= 500) return 'error';
  if (status >= 400) return 'warning';
  if (status >= 200 && status < 300) return 'success';
  return 'idle';
}

function normalizeTemplateRequest(templateRequest: Partial<import('@/types').RequestConfig>) {
  return {
    provider: templateRequest.provider,
    model: templateRequest.model,
    baseUrl: templateRequest.baseUrl,
    systemPrompt: templateRequest.systemPrompt,
    params: templateRequest.params,
    messages: templateRequest.messages?.map((message) => ({
      role: message.role,
      content: message.content,
      name: message.name ?? '',
    })),
  };
}

function normalizeCurrentRequest(request: import('@/types').RequestConfig) {
  return {
    provider: request.provider,
    model: request.model,
    baseUrl: request.baseUrl,
    systemPrompt: request.systemPrompt,
    params: request.params,
    messages: request.messages.map((message) => ({
      role: message.role,
      content: message.content,
      name: message.name ?? '',
    })),
  };
}

function requestMatchesTemplate(
  request: import('@/types').RequestConfig,
  templateRequest: Partial<import('@/types').RequestConfig>,
): boolean {
  const current = normalizeCurrentRequest(request);
  const template = normalizeTemplateRequest(templateRequest);
  return (
    (template.provider === undefined || current.provider === template.provider) &&
    (template.model === undefined || current.model === template.model) &&
    (template.baseUrl === undefined || current.baseUrl === template.baseUrl) &&
    (template.systemPrompt === undefined || current.systemPrompt === template.systemPrompt) &&
    (template.params === undefined || JSON.stringify(current.params) === JSON.stringify(template.params)) &&
    (template.messages === undefined || JSON.stringify(current.messages) === JSON.stringify(template.messages))
  );
}

function renderJsonNode(value: unknown, depth = 0): React.ReactNode {
  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]</span>;
    return (
      <>
        <span>[</span>
        {'\n'}
        {value.map((item, index) => (
          <span key={`${depth}-${index}`}>
            {nextIndent}
            {renderJsonNode(item, depth + 1)}
            {index < value.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}
        <span>]</span>
      </>
    );
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <>
        <span>{'{'}</span>
        {'\n'}
        {entries.map(([key, item], index) => (
          <span key={`${depth}-${key}`}>
            {nextIndent}
            <span className="json-key">"{key}"</span>
            <span>: </span>
            {renderJsonNode(item, depth + 1)}
            {index < entries.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}
        <span>{'}'}</span>
      </>
    );
  }

  if (typeof value === 'string') {
    return <span className="json-string">{JSON.stringify(value)}</span>;
  }

  if (typeof value === 'number') {
    return <span className="json-number">{String(value)}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="json-boolean">{String(value)}</span>;
  }

  if (value === null) {
    return <span className="json-null">null</span>;
  }

  return <span>{String(value)}</span>;
}

function formatCurrency(value?: number): string {
  if (value === undefined) {
    return 'Pending';
  }
  if (value === 0) {
    return '$0.00';
  }
  return `$${value.toFixed(6)}`;
}

function formatMs(value?: number): string {
  return value !== undefined ? `${Math.round(value)} ms` : 'Pending';
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

function getProviderLabel(provider: ProviderId, compact: boolean): string {
  if (!compact) {
    return providerOptions.find((option) => option.id === provider)?.label ?? provider;
  }

  switch (provider) {
    case 'openai-chat':
      return 'OpenAI CC';
    case 'openai-responses':
      return 'OpenAI Resp';
    case 'anthropic':
      return 'Anthropic';
    case 'gemini':
      return 'Gemini';
    case 'custom':
      return 'Custom';
    default:
      return provider;
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
          <select
            className="control-input control-input--compact role-select"
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
          <button className="ghost-button action-button" onClick={() => onRemove(message.id)}>
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
    replayHistory,
    deleteHistory,
    clearHistory,
  } = useAppStore();

  const { streamText, send, copyRequestCurl, copyResponseText, clearStreamText } = useSendRequest();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [historyOpen, setHistoryOpen] = useState(true);
  const [showAllModels, setShowAllModels] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState({
    provider: true,
    messages: false,
    parameters: false,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    const themeColor = theme === 'dark' ? '#0f172a' : '#f4f8fb';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  }, [theme]);

  useEffect(() => {
    void fetchModels(false);
  }, [fetchModels]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const updateIsMobile = (event?: MediaQueryListEvent) => {
      setIsMobile(event ? event.matches : mediaQuery.matches);
    };

    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  useEffect(() => {
    setAccordionOpen(
      isMobile
        ? { provider: true, messages: false, parameters: false }
        : { provider: true, messages: true, parameters: true },
    );
  }, [isMobile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'enter' && !isSending) {
        event.preventDefault();
        clearStreamText();
        void send();
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
      });
  }, [modelSearch, models, request.provider]);

  useEffect(() => {
    setShowAllModels(false);
  }, [isMobile, modelSearch, request.provider]);

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
  const hasResponse = Boolean(responseText || response?.status || response?.errorHint);
  const statusTone = getStatusTone(response?.status);
  const responseJsonPreview = useMemo(() => {
    const trimmed = responseText.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return undefined;
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }, [responseText]);
  const activeTemplateId = useMemo(
    () => templates.find((template) => requestMatchesTemplate(request, template.request))?.id,
    [request],
  );

  const providerLabel = getProviderLabel(request.provider, false);
  const visibleModels = isMobile && !showAllModels ? filteredModels.slice(0, 3) : filteredModels.slice(0, 5);
  const hasMoreModels = isMobile && filteredModels.length > 3 && !showAllModels;

  const onSend = () => {
    clearStreamText();
    void send();
  };

  const onCopyCurl = async () => {
    await copyRequestCurl();
  };

  const onCopyResponseText = async () => {
    await copyResponseText();
  };

  const toggleAccordionSection = (section: keyof typeof accordionOpen) => {
    setAccordionOpen((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">AP</div>
          <div>
            <p className="eyebrow">LLM API testing tool</p>
            <h1>ModelMux</h1>
          </div>
        </div>
        <div className="header-actions">
          <div
            className="header-status"
            title={`${providerLabel} / ${request.model || 'Select a model'}`}
          >
            <span className="status-dot" />
            <span className="header-status__label">{providerLabel}</span>
            <span className="status-separator">/</span>
            <span className="mono-text header-status__value">{request.model || 'Select a model'}</span>
          </div>
          <button
            className="secondary-button theme-toggle-button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span className="theme-toggle-button__label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            className="primary-button primary-button--hero header-send-button"
            onClick={onSend}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <span className="primary-button__spinner" aria-hidden="true" />
                <span>Sending…</span>
              </>
            ) : (
              'Send request'
            )}
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
                <p className="section-intro">
                  The output area stays front-and-center so you can compare latency, tokens, and text without hunting.
                </p>
              </div>
              <div className="response-headline__actions">
                <span className={`status-pill status-pill--response ${isSending ? 'is-live' : hasResponse ? 'is-ready' : ''}`}>
                  {isSending ? 'Streaming response' : hasResponse ? 'Response ready' : 'Waiting for request'}
                </span>
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
              <div className={`stat-card stat-card--status tone-${statusTone} ${isSending ? 'is-pulsing' : ''}`}>
                <span className="stat-label">Status</span>
                <strong className="status-value">
                  <span className="status-indicator" aria-hidden="true" />
                  <span>{response?.status ?? 'Not run yet'}</span>
                </strong>
              </div>
              <div className={`stat-card ${isSending ? 'is-pulsing' : ''}`}>
                <span className="stat-label">TTFT</span>
                <strong>{formatMs(response?.ttftMs)}</strong>
              </div>
              <div className={`stat-card ${isSending ? 'is-pulsing' : ''}`}>
                <span className="stat-label">Total time</span>
                <strong>{formatMs(response?.totalMs)}</strong>
              </div>
              <div className={`stat-card ${isSending ? 'is-pulsing' : ''}`}>
                <span className="stat-label">Estimated cost</span>
                <strong>{formatCurrency(response?.costEstimateUsd)}</strong>
              </div>
            </div>

            <div className="token-bar">
              <span>Input {response?.usage.inputTokens ?? 'Pending'}</span>
              <span>Output {response?.usage.outputTokens ?? 'Pending'}</span>
              <span>Total {response?.usage.totalTokens ?? 'Pending'}</span>
            </div>

            {response?.errorHint ? <div className="error-banner">{response.errorHint}</div> : null}

            <article className={`response-output ${isSending ? 'is-loading' : ''}`} aria-live="polite">
              {responseText ? (
                responseJsonPreview !== undefined ? (
                  <pre className="json-response">
                    <code>{renderJsonNode(responseJsonPreview)}</code>
                  </pre>
                ) : (
                  <pre>{responseText}</pre>
                )
              ) : (
                <div className="empty-state">
                  <p className="empty-state__title">{isSending ? 'Waiting for the first tokens…' : 'Pick a template or build a request, then hit Send'}</p>
                  <p className="empty-state__body">
                    {isSending
                      ? 'The model is processing your request. Streaming text will appear here as soon as it arrives.'
                      : 'The response pane stays open here so you can compare output, timing, and token usage without digging through controls.'}
                  </p>
                  {isSending ? (
                    <div className="typing-indicator" aria-label="Response in progress">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                  {!isSending ? (
                    <p className="empty-state__hint">
                      {isMobile ? 'Use the Send button pinned at the bottom of the screen.' : 'Use the Send button in the header above and to the right ↗'}
                    </p>
                  ) : null}
                </div>
              )}
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
                {history.length === 0 ? <p className="empty-state empty-state--compact">Your requests will appear here.</p> : null}
                {history.map((item) => (
                  <article key={item.id} className="history-card">
                    <div className="history-card__top">
                      <strong
                        className="history-card__identity"
                        title={`${providerOptions.find((provider) => provider.id === item.request.provider)?.label ?? item.request.provider} · ${item.request.model}`}
                      >
                        {providerOptions.find((provider) => provider.id === item.request.provider)?.label ?? item.request.provider}
                        {' · '}
                        {item.request.model}
                      </strong>
                    </div>
                    <div className="history-card__subhead">
                      <p>{new Date(item.timestamp).toLocaleString()}</p>
                      <span className={`status-pill tone-${getStatusTone(item.response.status)}`}>
                        <span className="status-indicator" aria-hidden="true" />
                        <span>{item.response.status ?? 'error'}</span>
                      </span>
                    </div>
                    <p className="history-meta">
                      {item.requestPreview.url}
                    </p>
                    <p className="history-latency">Latency: {formatMs(item.response.totalMs)}</p>
                    <p className="history-preview">{item.response.extractedText || item.response.rawText || 'No response body captured.'}</p>
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
          <details className="surface accordion-section" open={accordionOpen.provider}>
            <summary
              className="accordion-summary"
              onClick={(event) => {
                event.preventDefault();
                toggleAccordionSection('provider');
              }}
            >
              <div>
                <p className="eyebrow">Request setup</p>
                <h3>Provider &amp; Model</h3>
                <p className="section-intro">Pick the target model quickly, then refine the prompt and payload below.</p>
              </div>
              <div className="accordion-summary__actions">
                <span className="shortcut-hint">Cmd/Ctrl + K</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void fetchModels(true);
                  }}
                >
                  Refresh models
                </button>
                <span className={`accordion-chevron ${accordionOpen.provider ? 'is-open' : ''}`} aria-hidden="true">
                  ⌄
                </span>
              </div>
            </summary>

            <div className="provider-pills" role="tablist" aria-label="Provider selection">
              {providerOptions.map((provider) => (
                <button
                  key={provider.id}
                  className={`provider-pill ${request.provider === provider.id ? 'is-active' : ''}`}
                  onClick={() => setProvider(provider.id)}
                >
                  {getProviderLabel(provider.id, isMobile)}
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
                {visibleModels.length > 0 ? (
                  visibleModels.map((model) => (
                    <button
                      key={model.id}
                      className={`model-option ${model.id === request.model ? 'is-active' : ''}`}
                      onClick={() => setRequestField('model', model.id)}
                      title={model.id}
                    >
                      <div className="model-option__row">
                        <div className="model-option__identity">
                          <strong>{model.name}</strong>
                          <p className="model-option__id">{model.id}</p>
                        </div>
                        <div className="model-option__metrics">
                          <span>{model.contextLength.toLocaleString()} ctx</span>
                          <span>In ${(model.promptPricePerToken * 1_000_000).toFixed(2)}/1M</span>
                          <span>Out ${(model.completionPricePerToken * 1_000_000).toFixed(2)}/1M</span>
                        </div>
                      </div>
                      <div className="model-option__meta">
                        <span>{model.provider}</span>
                        <div className="badge-row">
                          {capabilityBadges(model).map((badge) => (
                            <span key={badge} className="mini-badge">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="empty-state empty-state--compact">Type to search 300+ models.</p>
                )}
              </div>
              {hasMoreModels ? (
                <button className="secondary-button model-results__more" onClick={() => setShowAllModels(true)}>
                  Show more
                </button>
              ) : null}
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
          </details>

          <details className="surface accordion-section" open={accordionOpen.messages}>
            <summary
              className="accordion-summary"
              onClick={(event) => {
                event.preventDefault();
                toggleAccordionSection('messages');
              }}
            >
              <div>
                <p className="eyebrow">Prompting</p>
                <h3>Messages</h3>
                <p className="section-intro">Messages use the same card structure across roles to keep edits predictable.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  addMessage();
                }}
              >
                Add message
              </button>
              <span className={`accordion-chevron ${accordionOpen.messages ? 'is-open' : ''}`} aria-hidden="true">
                ⌄
              </span>
            </summary>

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
                <button
                  key={template.id}
                  className={`template-chip ${activeTemplateId === template.id ? 'is-active' : ''}`}
                  onClick={() => applyTemplate(template.id)}
                >
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
          </details>

          <details className="surface accordion-section" open={accordionOpen.parameters}>
            <summary
              className="accordion-summary"
              onClick={(event) => {
                event.preventDefault();
                toggleAccordionSection('parameters');
              }}
            >
              <div>
                <p className="eyebrow">Request tuning</p>
                <h3>Parameters</h3>
              </div>
              <div className="accordion-summary__actions">
                <label
                  className="toggle-row"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showRawRequest}
                    onChange={(event) => setShowRawRequest(event.target.checked)}
                  />
                  <span>Raw JSON</span>
                </label>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void onCopyCurl();
                  }}
                >
                  Copy as cURL
                </button>
                <span className={`accordion-chevron ${accordionOpen.parameters ? 'is-open' : ''}`} aria-hidden="true">
                  ⌄
                </span>
              </div>
            </summary>

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
          </details>
        </aside>
      </main>

      <div className="mobile-send-bar">
        <button className="primary-button primary-button--hero mobile-send-bar__button" onClick={onSend} disabled={isSending}>
          {isSending ? (
            <>
              <span className="primary-button__spinner" aria-hidden="true" />
              <span>Sending…</span>
            </>
          ) : (
            'Send request'
          )}
        </button>
      </div>
    </div>
  );
}
