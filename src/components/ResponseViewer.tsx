import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import type { ResponseState } from '@/types';

function formatCurrency(value?: number): string {
  if (value === undefined) return '—';
  if (value === 0) return '$0.00';
  return `$${value.toFixed(6)}`;
}

function formatMs(value?: number): string {
  return value !== undefined ? `${Math.round(value)} ms` : '—';
}

/** Response viewer props. */
export interface ResponseViewerProps {
  response?: ResponseState;
  responseJson: string;
  showRaw: boolean;
  streamText: string;
  theme: 'dark' | 'light';
  onCopyText(): void;
  onToggleRaw(show: boolean): void;
}

/** Response display panel. */
export function ResponseViewer(props: ResponseViewerProps) {
  return (
    <div className="panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-medium">Response Viewer</h2>
        <label className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <input type="checkbox" checked={props.showRaw} onChange={(event) => props.onToggleRaw(event.target.checked)} />
          Raw JSON
        </label>
        <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={props.onCopyText}>
          Copy Text
        </button>
      </div>
      <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>Status: {props.response?.status ?? '—'}</div>
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>TTFT: {formatMs(props.response?.ttftMs)}</div>
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>Total: {formatMs(props.response?.totalMs)}</div>
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>Cost: {formatCurrency(props.response?.costEstimateUsd)}</div>
      </div>
      <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
        Tokens: in {props.response?.usage.inputTokens ?? '—'} | out {props.response?.usage.outputTokens ?? '—'} | total {props.response?.usage.totalTokens ?? '—'}
      </div>
      {props.response?.errorHint ? <div className="mt-2 rounded-md border p-2 text-sm" style={{ borderColor: '#ff8a8a', color: '#ffb4b4' }}>{props.response.errorHint}</div> : null}
      <div className="mt-3 rounded-md border p-3 text-sm leading-relaxed" style={{ borderColor: 'var(--border)' }}>
        {props.streamText || props.response?.extractedText || 'No response text yet.'}
      </div>
      {props.showRaw ? (
        <div className="mt-3 overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
          <CodeMirror value={props.responseJson} editable={false} height="300px" extensions={[json()]} theme={props.theme === 'dark' ? 'dark' : 'light'} />
        </div>
      ) : null}
      <details className="mt-3 rounded-md border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
        <summary className="cursor-pointer">Status code + headers</summary>
        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify({ status: props.response?.status, headers: props.response?.headers ?? {} }, null, 2)}</pre>
      </details>
    </div>
  );
}
