import type { HistoryItem } from '@/types';

/** History panel props. */
export interface HistoryPanelProps {
  history: HistoryItem[];
  onClear(): void;
  onDelete(id: string): void;
  onReplay(id: string): void;
}

/** Persisted request history panel. */
export function HistoryPanel(props: HistoryPanelProps) {
  return (
    <div className="panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-medium">History</h2>
        <button className="ml-auto rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={props.onClear} disabled={props.history.length === 0}>
          Clear
        </button>
      </div>
      <div className="max-h-[40rem] space-y-2 overflow-auto pr-1">
        {props.history.length === 0 ? <p className="text-sm" style={{ color: 'var(--muted)' }}>No saved requests yet.</p> : null}
        {props.history.map((item) => (
          <div key={item.id} className="rounded-md border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.request.model}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(item.timestamp).toLocaleString()}</span>
              <span className="ml-auto text-xs">{item.response.status ?? 'error'}</span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{item.request.provider} · {item.requestPreview.url}</div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => props.onReplay(item.id)}>Replay</button>
              <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => props.onDelete(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
