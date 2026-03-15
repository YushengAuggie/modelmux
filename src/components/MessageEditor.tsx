import { MessageRow } from '@/components/MessageRow';
import type { MessageItem } from '@/types';

/** Message editor props. */
export interface MessageEditorProps {
  messages: MessageItem[];
  onAdd(): void;
  onChange(id: string, patch: Partial<MessageItem>): void;
  onMove(id: string, direction: -1 | 1): void;
  onRemove(id: string): void;
}

/** Message list editor. */
export function MessageEditor(props: MessageEditorProps) {
  return (
    <div className="panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-medium">Messages</h2>
        <button className="ml-auto rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={props.onAdd}>
          Add Message
        </button>
      </div>
      <div className="space-y-2">
        {props.messages.map((message, index) => (
          <MessageRow
            key={message.id}
            count={props.messages.length}
            index={index}
            message={message}
            onChange={props.onChange}
            onMove={props.onMove}
            onRemove={props.onRemove}
          />
        ))}
      </div>
    </div>
  );
}
