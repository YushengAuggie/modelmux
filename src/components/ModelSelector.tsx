import type { OpenRouterModel } from '@/types';

function capabilityBadges(model: OpenRouterModel): string[] {
  const badges: string[] = [];
  if (model.supportsTools) badges.push('tools');
  if (model.supportsSearch) badges.push('search');
  if (model.supportsVision) badges.push('vision');
  if (model.supportsReasoning) badges.push('reasoning');
  return badges;
}

/** Model selector props. */
export interface ModelSelectorProps {
  loading: boolean;
  error?: string;
  models: OpenRouterModel[];
  search: string;
  selectedModelId: string;
  selectedSummary: string;
  onRefresh(): void;
  onSearchChange(value: string): void;
  onSelect(modelId: string): void;
}

/** Searchable model picker panel. */
export function ModelSelector(props: ModelSelectorProps) {
  return (
    <div className="panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-medium">Model Selector</h2>
        <button className="ml-auto rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={props.onRefresh}>
          Refresh
        </button>
      </div>
      <input
        id="model-search-input"
        className="mb-2 w-full rounded-md border px-2 py-2 text-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
        placeholder="Search OpenRouter models"
        value={props.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
      />
      {props.loading ? <p className="text-sm">Loading models...</p> : null}
      {props.error ? <p className="text-sm" style={{ color: '#ff8a8a' }}>{props.error}</p> : null}
      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {props.models.map((model) => (
          <button
            key={model.id}
            className="panel block w-full rounded-md p-2 text-left transition-all duration-200 hover:border-sky-400"
            style={{
              borderColor: model.id === props.selectedModelId ? 'var(--accent)' : 'var(--border)',
              background: model.id === props.selectedModelId ? 'color-mix(in srgb, var(--accent) 10%, var(--panel))' : undefined,
            }}
            onClick={() => props.onSelect(model.id)}
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
      <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        {props.selectedSummary}
      </div>
    </div>
  );
}
