import { useEffect } from 'react';
import { buildRequestPreview } from '@/adapters';
import { Header } from '@/components/Header';
import { HistoryPanel } from '@/components/HistoryPanel';
import { MessageEditor } from '@/components/MessageEditor';
import { ModelSelector } from '@/components/ModelSelector';
import { ParamsPanel } from '@/components/ParamsPanel';
import { ProviderPicker } from '@/components/ProviderPicker';
import { RequestPreview } from '@/components/RequestPreview';
import { ResponseViewer } from '@/components/ResponseViewer';
import { SystemPrompt } from '@/components/SystemPrompt';
import { TemplateStrip } from '@/components/TemplateStrip';
import { useSendRequest } from '@/hooks/useSendRequest';
import { useAppStore } from '@/store';

function filterModels(models: ReturnType<typeof useAppStore.getState>['models'], search: string, provider: ReturnType<typeof useAppStore.getState>['request']['provider']) {
  const query = search.trim().toLowerCase();
  return models
    .filter((model) => model.id.includes(query) || model.name.toLowerCase().includes(query) || model.provider.includes(query))
    .filter((model) => {
      if (provider === 'anthropic') return model.provider.includes('anthropic');
      if (provider === 'gemini') return model.provider.includes('google') || model.id.includes('gemini');
      if (provider === 'openai-chat' || provider === 'openai-responses') return model.provider.includes('openai') || model.id.startsWith('openai/');
      return true;
    })
    .slice(0, 80);
}

/** Application layout shell. */
export function App() {
  const state = useAppStore();
  const { streamText, send, copyRequestCurl, copyResponseText } = useSendRequest();
  const filteredModels = filterModels(state.models, state.modelSearch, state.request.provider);
  const selectedModel = state.models.find((model) => model.id === state.request.model);
  const selectedSummary = selectedModel
    ? `Selected model metadata: ${selectedModel.name} (${selectedModel.provider})`
    : 'Selected model metadata: Not in OpenRouter index';

  const requestPreviewJson = (() => {
    try {
      return JSON.stringify(buildRequestPreview(state.request), null, 2);
    } catch {
      return '{\n  "error": "Model is required"\n}';
    }
  })();

  const responseJson = state.response?.json !== undefined
    ? JSON.stringify(state.response.json, null, 2)
    : state.response?.rawText || '';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  useEffect(() => {
    void state.fetchModels(false);
  }, [state.fetchModels]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'enter' && !state.isSending) {
        event.preventDefault();
        void send();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('model-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [send, state.isSending]);

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 py-4 md:px-4">
      <Header isSending={state.isSending} theme={state.theme} onSend={() => void send()} onToggleTheme={() => state.setTheme(state.theme === 'dark' ? 'light' : 'dark')} />
      <main className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="panel rounded-xl p-3">
            <ProviderPicker
              apiKey={state.request.apiKey}
              baseUrl={state.request.baseUrl}
              provider={state.request.provider}
              onApiKeyChange={(value) => state.setRequestField('apiKey', value)}
              onBaseUrlChange={(value) => state.setRequestField('baseUrl', value)}
              onProviderChange={state.setProvider}
            />
            <SystemPrompt
              model={state.request.model}
              systemPrompt={state.request.systemPrompt}
              onModelChange={(value) => state.setRequestField('model', value)}
              onSystemPromptChange={(value) => state.setRequestField('systemPrompt', value)}
            />
            <ParamsPanel params={state.request.params} onChange={state.setParamsField} />
            <RequestPreview jsonText={requestPreviewJson} showRaw={state.showRawRequest} theme={state.theme} onCopyCurl={() => void copyRequestCurl()} onToggleRaw={state.setShowRawRequest} />
          </div>
          <ModelSelector
            error={state.modelsError}
            loading={state.modelsLoading}
            models={filteredModels}
            search={state.modelSearch}
            selectedModelId={state.request.model}
            selectedSummary={selectedSummary}
            onRefresh={() => void state.fetchModels(true)}
            onSearchChange={state.setModelSearch}
            onSelect={(modelId) => state.setRequestField('model', modelId)}
          />
          <MessageEditor messages={state.request.messages} onAdd={state.addMessage} onChange={state.updateMessage} onMove={state.moveMessage} onRemove={state.removeMessage} />
          <TemplateStrip onApply={state.applyTemplate} />
        </section>
        <section className="space-y-4">
          <ResponseViewer response={state.response} responseJson={responseJson} showRaw={state.showRawResponse} streamText={streamText} theme={state.theme} onCopyText={() => void copyResponseText()} onToggleRaw={state.setShowRawResponse} />
          <HistoryPanel history={state.history} onClear={state.clearHistory} onDelete={state.deleteHistory} onReplay={state.replayHistory} />
        </section>
      </main>
    </div>
  );
}
