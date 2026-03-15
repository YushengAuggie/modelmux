import type { RequestPreview } from '@/types';

/** Serializes a request preview into a copyable `curl` command. */
export function copyAsCurl(preview: RequestPreview): string {
  const headers = Object.entries(preview.headers)
    .map(([key, value]) => `-H ${JSON.stringify(`${key}: ${value}`)}`)
    .join(' ');

  return `curl -X ${preview.method} ${JSON.stringify(preview.url)} ${headers} -d ${JSON.stringify(JSON.stringify(preview.body))}`;
}
