import { providerOptions } from '@/adapters';
import type { ProviderId } from '@/types';

/** Provider selection props. */
export interface ProviderPickerProps {
  apiKey: string;
  baseUrl: string;
  provider: ProviderId;
  onApiKeyChange(value: string): void;
  onBaseUrlChange(value: string): void;
  onProviderChange(provider: ProviderId): void;
}

/** Provider and credential controls. */
export function ProviderPicker(props: ProviderPickerProps) {
  return (
    <>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span style={{ color: 'var(--muted)' }}>Provider</span>
          <select
            className="w-full rounded-md border px-2 py-2"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
            value={props.provider}
            onChange={(event) => props.onProviderChange(event.target.value as ProviderId)}
          >
            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span style={{ color: 'var(--muted)' }}>API Key</span>
          <input
            className="w-full rounded-md border px-2 py-2"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
            type="password"
            placeholder="Stored in localStorage only"
            value={props.apiKey}
            onChange={(event) => props.onApiKeyChange(event.target.value)}
          />
        </label>
      </div>
      <label className="mt-2 block space-y-1 text-sm">
        <span style={{ color: 'var(--muted)' }}>Base URL</span>
        <input
          className="w-full rounded-md border px-2 py-2"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}
          value={props.baseUrl}
          onChange={(event) => props.onBaseUrlChange(event.target.value)}
          placeholder="Custom provider base URL"
        />
      </label>
    </>
  );
}
