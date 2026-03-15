/** System prompt props. */
export interface SystemPromptProps {
  model: string;
  systemPrompt: string;
  onModelChange(value: string): void;
  onSystemPromptChange(value: string): void;
}

/** Model and system prompt controls. */
export function SystemPrompt(props: SystemPromptProps) {
  return (
    <>
      <label className="space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>Model</span>
        <input
          className="w-full rounded-md border px-2 py-2"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
          value={props.model}
          onChange={(event) => props.onModelChange(event.target.value)}
        />
      </label>
      <label className="mt-2 block space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>System Prompt</span>
        <textarea
          className="h-20 w-full rounded-md border p-2"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
          value={props.systemPrompt}
          onChange={(event) => props.onSystemPromptChange(event.target.value)}
        />
      </label>
    </>
  );
}
