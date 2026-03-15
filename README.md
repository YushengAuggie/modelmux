# API Pilot

Test LLM APIs fast from one clean browser UI.

- Build one request shape and send it to OpenAI, Anthropic, Gemini, or an OpenAI-compatible endpoint.
- Browse models, switch templates, and inspect the exact request and response JSON.
- Save runs locally so you can replay them, compare output, and keep moving.

## Quick start

```bash
npm install
npm run dev
```

Open the local Vite URL, paste an API key, pick a template, and send a request.

## Providers

| Provider | Works with | Notes |
| --- | --- | --- |
| OpenAI chat | `/v1/chat/completions` | Good default for chat and tool tests |
| OpenAI responses | `/v1/responses` | Useful for newer Responses API flows |
| Anthropic | `/v1/messages` | Uses `x-api-key` and `anthropic-version` |
| Gemini | `generateContent` | Uses `x-goog-api-key` and model-in-path URLs |
| Custom endpoint | OpenAI-compatible APIs | Good for Ollama, LM Studio, vLLM, and proxies |

## Features

- 💬 Unified request builder for prompts, system instructions, and multi-message threads
- 🔍 Model browser backed by the OpenRouter index with pricing, context, and capability hints
- 👁 Raw JSON view for both the outgoing request and provider response
- 🧠 Response summary with extracted text, token counts, latency, and cost estimate
- ⚡ Streaming support so you can watch tokens arrive in real time
- 🏠 Local-first history and API key storage in your own browser

## Tech stack

- React 19
- TypeScript
- Vite
- Zustand
- CodeMirror
- Tailwind CSS

## Dev setup

```bash
npm install
npm run dev
npm run build
```

The app is client-side only. API keys and history stay in `localStorage` unless you send a request to a provider.

## Contributing

Issues and pull requests are welcome. Keep copy clear, keep the UI fast, and prefer changes that make the first request easier to send.

## License

MIT

