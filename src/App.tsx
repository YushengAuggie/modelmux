import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRequestPreview, providerOptions } from '@/adapters';

import { templates } from '@/templates';
import { useAppStore } from '@/store';
import { useSendRequest } from '@/hooks/useSendRequest';
import type { MessageItem, OpenRouterModel, ProviderId, ResponseState } from '@/types';

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

function renderJsonNode(value: unknown, depth = 0, path = ''): React.ReactNode {
  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]</span>;
    return (
      <>
        <span>[</span>
        {'\n'}
        {value.map((item, index) => {
          const childPath = `${path}[${index}]`;
          return (
            <span key={childPath}>
              {nextIndent}
              {renderJsonNode(item, depth + 1, childPath)}
              {index < value.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          );
        })}
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
        {entries.map(([key, item], index) => {
          const childPath = `${path}.${key}`;
          return (
            <span key={childPath}>
              {nextIndent}
              <span className="json-key">"{key}"</span>
              <span>: </span>
              {renderJsonNode(item, depth + 1, childPath)}
              {index < entries.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          );
        })}
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

function formatHistoryTimestamp(value: string): string {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

function isAuthError(response?: ResponseState): boolean {
  if (!response) return false;
  if (response.status === 401 || response.status === 403) return true;
  return /invalid api key|api key|unauthorized|forbidden/i.test(response.rawText);
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

  const { streamText, validationError, send, copyRequestCurl, copyResponseText, clearStreamText } = useSendRequest();
  const apiKeyFieldRef = useRef<HTMLInputElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const providerSectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [historyOpen, setHistoryOpen] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [highlightApiKey, setHighlightApiKey] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState({
    messages: true,
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
    setAccordionOpen({ messages: true, parameters: false });
  }, [isMobile]);

  useEffect(() => {
    if (!highlightApiKey) return undefined;
    const timer = window.setTimeout(() => setHighlightApiKey(false), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightApiKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'enter' && !isSending) {
        event.preventDefault();
        clearStreamText();
        void send();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        modelSearchInputRef.current?.focus();
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
  const visibleModels = showAllModels ? filteredModels : filteredModels.slice(0, 5);
  const hasMoreModels = filteredModels.length > 5 && !showAllModels;
  const hasSentRequest = Boolean(response || history.length > 0 || isSending);
  const authError = isAuthError(response);

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

  const focusApiKeyField = () => {
    providerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => apiKeyFieldRef.current?.focus(), 150);
    setHighlightApiKey(true);
  };

  const responsePanel = (
    <section className="response-column">
      <div className={`surface surface--hero ${hasSentRequest ? '' : 'surface--compact'}`}>
        <div className="response-headline">
          <div>
            <p className="eyebrow">Response</p>
            <h2>Response output</h2>
          </div>
          <div className="response-headline__actions">
            <span className={`status-pill status-pill--response ${isSending ? 'is-live' : hasResponse ? 'is-ready' : ''}`}>
              {isSending ? 'Streaming' : hasResponse ? 'Ready' : 'Waiting'}
            </span>
            <button className="secondary-button" onClick={() => void onCopyResponseText()} disabled={!responseText}>
              Copy text
            </button>
            <button className="secondary-button" onClick={() => void onCopyCurl()}>
              Copy as cURL
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

        {(hasResponse || isSending) ? (
          <>
            <div className="metric-chip-row" aria-label="Response metrics">
              <span className={`metric-chip metric-chip--status tone-${statusTone} ${isSending ? 'is-pulsing' : ''}`}>
                <span className="metric-chip__label">Status</span>
                <strong className="status-value">
                  <span className="status-indicator" aria-hidden="true" />
                  <span>{response?.status ?? 'Not run yet'}</span>
                </strong>
              </span>
              <span className={`metric-chip ${isSending ? 'is-pulsing' : ''}`}>
                <span className="metric-chip__label">TTFT</span>
                <strong>{formatMs(response?.ttftMs)}</strong>
              </span>
              <span className={`metric-chip ${isSending ? 'is-pulsing' : ''}`}>
                <span className="metric-chip__label">Total time</span>
                <strong>{formatMs(response?.totalMs)}</strong>
              </span>
              <span className={`metric-chip ${isSending ? 'is-pulsing' : ''}`}>
                <span className="metric-chip__label">Cost</span>
                <strong>{formatCurrency(response?.costEstimateUsd)}</strong>
              </span>
            </div>

            <div className="token-bar">
              <span>Input {response?.usage.inputTokens ?? 'Pending'}</span>
              <span>Output {response?.usage.outputTokens ?? 'Pending'}</span>
              <span>Total {response?.usage.totalTokens ?? 'Pending'}</span>
            </div>
          </>
        ) : null}

        {authError ? (
          <div className="error-banner error-banner--actionable" role="alert">
            <div>
              <strong>Invalid API key</strong>
              <p>Check your key in the Provider &amp; Model section.</p>
            </div>
            <button className="secondary-button" onClick={focusApiKeyField}>
              Go to API key
            </button>
          </div>
        ) : response?.errorHint ? (
          <div className="error-banner">{response.errorHint}</div>
        ) : null}

        <article className={`response-output ${isSending ? 'is-loading' : ''} ${hasResponse ? '' : 'is-empty'}`} aria-live="polite">
          {responseText ? (
            responseJsonPreview !== undefined ? (
              <pre className="json-response">
                <code>{renderJsonNode(responseJsonPreview)}</code>
              </pre>
            ) : (
              <pre>{responseText}</pre>
            )
          ) : (
            <div className="empty-state empty-state--guided">
              <p className="empty-state__hint">
                {isSending ? 'Waiting for tokens…' : 'Send a request to see results'}
              </p>
              {isSending ? (
                <div className="typing-indicator" aria-label="Response in progress">
                  <span />
                  <span />
                  <span />
                </div>
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
            {history.map((item) => {
              const isExpanded = expandedHistoryId === item.id;
              return (
                <details key={item.id} className="history-card" open={isExpanded}>
                  <summary
                    className="history-card__summary"
                    onClick={(event) => {
                      event.preventDefault();
                      setExpandedHistoryId((current) => (current === item.id ? null : item.id));
                    }}
                  >
                    <strong
                      className="history-card__identity"
                      title={`${providerOptions.find((provider) => provider.id === item.request.provider)?.label ?? item.request.provider} · ${item.request.model}`}
                    >
                      {providerOptions.find((provider) => provider.id === item.request.provider)?.label ?? item.request.provider}
                      {' · '}
                      {item.request.model}
                    </strong>
                    <span className="history-card__summary-meta">{formatHistoryTimestamp(item.timestamp)}</span>
                    <span className={`status-pill tone-${getStatusTone(item.response.status)}`}>
                      <span className="status-indicator" aria-hidden="true" />
                      <span>{item.response.status ?? 'error'}</span>
                    </span>
                    <span className="history-card__summary-meta">{formatMs(item.response.totalMs)}</span>
                  </summary>
                  <div className="history-card__content">
                    <p className="history-meta">{item.requestPreview.url}</p>
                    <p className="history-preview">{item.response.extractedText || item.response.rawText || 'No response body captured.'}</p>
                    <div className="history-actions">
                      <button className="secondary-button" onClick={() => replayHistory(item.id)}>
                        Replay
                      </button>
                      <button className="ghost-button" onClick={() => deleteHistory(item.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );

  const controlsPanel = (
    <aside className="control-column">
      <section ref={providerSectionRef} className="surface accordion-section surface--setup">
        <div className="accordion-summary accordion-summary--static">
          <div>
            <p className="eyebrow">Request setup</p>
            <h3>Provider &amp; Model</h3>
          </div>
          <div className="accordion-summary__actions">
            <span className="shortcut-hint">Cmd/Ctrl + K</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                void fetchModels(true);
              }}
            >
              Refresh models
            </button>
          </div>
        </div>

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
              ref={apiKeyFieldRef}
              className={`control-input ${highlightApiKey ? 'control-input--highlighted' : ''}`}
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
              placeholder="Optional proxy or gateway URL"
            />
            <small className="field-hint">Optional override for any provider. Leave the default value to use official provider endpoints.</small>
          </label>
        </div>

        <div className="model-search-panel">
          <label className="field">
            <span>Model search</span>
            <input
              ref={modelSearchInputRef}
              id="model-search-input"
              className="control-input"
              placeholder="Search models, providers, or IDs"
              value={modelSearch}
              onChange={(event) => setModelSearch(event.target.value)}
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
              : 'Not in the OpenRouter index. You can still send to compatible endpoints.'}
          </p>
        </div>
      </section>

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
          </div>
          <div className="accordion-summary__actions">
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
          </div>
        </summary>

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

        <label className="field">
          <span>System prompt</span>
          <textarea
            className="control-input control-textarea"
            value={request.systemPrompt}
            onChange={(event) => setRequestField('systemPrompt', event.target.value)}
            placeholder="Set behavior, constraints, or persona"
          />
        </label>

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
            <p className="eyebrow">Advanced</p>
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
  );

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
          {validationError ? (
            <span className="error-text" role="alert">{validationError}</span>
          ) : null}
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
          <span className="shortcut-hint">⌘↵</span>
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
        {controlsPanel}
        {responsePanel}
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
