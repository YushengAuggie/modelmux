import type { MessageItem } from '@/types';

/** Single message row props. */
export interface MessageRowProps {
  count: number;
  index: number;
  message: MessageItem;
  onChange(id: string, patch: Partial<MessageItem>): void;
  onMove(id: string, direction: -1 | 1): void;
  onRemove(id: string): void;
}

/** Editable message row. */
export function MessageRow({ count, index, message, onChange, onMove, onRemove }: MessageRowProps) {
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
          <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => onMove(message.id, -1)} disabled={index === 0}>↑</button>
          <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => onMove(message.id, 1)} disabled={index === count - 1}>↓</button>
          <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => onRemove(message.id)}>remove</button>
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
