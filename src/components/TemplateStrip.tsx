import { templates } from '@/templates';

/** Template strip props. */
export interface TemplateStripProps {
  onApply(templateId: string): void;
}

/** Template quick-start panel. */
export function TemplateStrip({ onApply }: TemplateStripProps) {
  return (
    <div className="panel rounded-xl p-3">
      <h2 className="mb-2 font-medium">Templates</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {templates.map((template) => (
          <button key={template.id} className="rounded-md border p-2 text-left text-sm transition-all duration-200 hover:border-sky-400" style={{ borderColor: 'var(--border)' }} onClick={() => onApply(template.id)}>
            <div className="font-medium">{template.name}</div>
            <div style={{ color: 'var(--muted)' }}>{template.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
