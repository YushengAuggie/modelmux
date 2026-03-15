/** Header bar props. */
export interface HeaderProps {
  isSending: boolean;
  theme: 'dark' | 'light';
  onSend(): void;
  onToggleTheme(): void;
}

/** Top-level application header. */
export function Header({ isSending, theme, onSend, onToggleTheme }: HeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border p-3 panel">
      <h1 className="text-lg font-semibold tracking-tight">ModelMux</h1>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>
        LLM API testing tool
      </span>
      <div className="ml-auto flex gap-2">
        <button className="rounded-md border px-3 py-1 text-sm" style={{ borderColor: 'var(--border)' }} onClick={onToggleTheme}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          className="rounded-md border px-3 py-1 text-sm"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          onClick={onSend}
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </header>
  );
}
