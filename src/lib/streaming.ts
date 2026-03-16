import { parseJson } from '@/adapters/base';

/** Parsed streaming payload with accumulated metadata. */
export interface StreamResult {
  rawText: string;
  streamedText: string;
  finalJson: unknown;
  ttftMs?: number;
}

function parseSseEvents(buffer: string): { events: string[]; remaining: string } {
  const chunks = buffer.split('\n\n');
  return {
    events: chunks.slice(0, -1).map((chunk) => chunk.trim()).filter(Boolean),
    remaining: chunks.at(-1) ?? '',
  };
}

function parseSseData(eventChunk: string): string[] {
  return eventChunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');
}

/** Reads an SSE response stream and emits text deltas. */
export async function readStreamingResponse(
  stream: ReadableStream<Uint8Array>,
  extractText: (json: unknown) => string,
  onText: (text: string) => void,
  startedAt: number,
): Promise<StreamResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';
  let streamedText = '';
  let finalJson: unknown;
  let ttftMs: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (ttftMs === undefined) {
      ttftMs = performance.now() - startedAt;
    }

    const chunk = decoder.decode(value, { stream: true });
    rawText += chunk;
    buffer += chunk;

    const { events, remaining } = parseSseEvents(buffer);
    buffer = remaining;

    for (const eventChunk of events) {
      for (const data of parseSseData(eventChunk)) {
        const json = parseJson(data);
        finalJson = json;
        const text = extractText(json);
        if (text) {
          streamedText += text;
          onText(text);
        }
      }
    }
  }

  // Flush any remaining buffer content after the stream ends
  if (buffer.trim()) {
    for (const data of parseSseData(buffer)) {
      const json = parseJson(data);
      finalJson = json;
      const text = extractText(json);
      if (text) {
        streamedText += text;
        onText(text);
      }
    }
  }

  return { rawText, streamedText, finalJson, ttftMs };
}
