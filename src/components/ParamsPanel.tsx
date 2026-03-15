import type { ParamsState } from '@/types';

/** Params panel props. */
export interface ParamsPanelProps {
  params: ParamsState;
  onChange<K extends keyof ParamsState>(key: K, value: ParamsState[K]): void;
}

/** Sampling and streaming controls. */
export function ParamsPanel(props: ParamsPanelProps) {
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-4">
      <label className="space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>Temperature</span>
        <input className="w-full rounded-md border px-2 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }} type="number" step="0.1" min="0" max="2" value={props.params.temperature} onChange={(event) => props.onChange('temperature', Number(event.target.value))} />
      </label>
      <label className="space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>max_tokens</span>
        <input className="w-full rounded-md border px-2 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }} type="number" min="1" value={props.params.maxTokens} onChange={(event) => props.onChange('maxTokens', Number(event.target.value))} />
      </label>
      <label className="space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>top_p</span>
        <input className="w-full rounded-md border px-2 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }} type="number" step="0.1" min="0" max="1" value={props.params.topP} onChange={(event) => props.onChange('topP', Number(event.target.value))} />
      </label>
      <label className="flex items-end gap-2 pb-2 text-sm">
        <input type="checkbox" checked={props.params.stream} onChange={(event) => props.onChange('stream', event.target.checked)} />
        <span>stream</span>
      </label>
    </div>
  );
}
