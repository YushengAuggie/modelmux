import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';

/** Request preview props. */
export interface RequestPreviewProps {
  jsonText: string;
  showRaw: boolean;
  theme: 'dark' | 'light';
  onCopyCurl(): void;
  onToggleRaw(show: boolean): void;
}

/** Request preview panel. */
export function RequestPreview(props: RequestPreviewProps) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="font-medium">Request Builder</h2>
        <label className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <input type="checkbox" checked={props.showRaw} onChange={(event) => props.onToggleRaw(event.target.checked)} />
          Raw JSON
        </label>
        <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }} onClick={props.onCopyCurl}>
          Copy as cURL
        </button>
      </div>
      {props.showRaw ? (
        <div className="overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
          <CodeMirror value={props.jsonText} editable={false} height="220px" extensions={[json()]} theme={props.theme === 'dark' ? 'dark' : 'light'} />
        </div>
      ) : null}
    </div>
  );
}
