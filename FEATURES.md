# FEATURES.md — API Pilot MVP

> The LLM API testing tool that doesn't exist yet.

---

## MVP (v1.0) — "Make one LLM call and see the result"

### Core: Request Builder
- [ ] **Provider picker** — OpenAI, Anthropic, Gemini, Custom (any OpenAI-compatible endpoint)
- [ ] **Auto-format switching** — selecting a provider sets the correct request format, auth headers, and endpoint
- [ ] **Model selector** — dynamic model list fetched from provider's API (OpenRouter as fallback/index)
- [ ] **Messages editor** — add/remove/reorder messages (system, user, assistant, tool)
- [ ] **System prompt** — dedicated field (maps to correct location per format: `messages[0]`, top-level `system`, `systemInstruction`, or `instructions`)
- [ ] **Parameters panel** — temperature, max_tokens, top_p, stream toggle
- [ ] **API key input** — stored locally (localStorage), never sent anywhere except the provider
- [ ] **Custom base URL** — for Ollama, LM Studio, vLLM, any self-hosted endpoint
- [ ] **Send button** — fires the request, shows loading state

### Core: Response Viewer
- [ ] **Response body** — syntax-highlighted JSON, with formatted text extraction
- [ ] **Content extraction** — auto-pull the text response from the correct path per format (`choices[0].message.content` vs `content[0].text` vs `candidates[0].content.parts[0].text` vs `output[].content[].text`)
- [ ] **Token usage display** — input/output/total tokens, cost estimate based on model pricing
- [ ] **Latency** — time-to-first-token (TTFT) + total time
- [ ] **Status code + headers** — collapsible raw details
- [ ] **Error display** — formatted error messages with provider-specific hints (e.g., "Anthropic requires `max_tokens`")
- [ ] **Streaming support** — real-time token-by-token display for SSE responses

### Core: Pre-filled Templates
- [ ] **Simple conversation** — "Hello, what can you do?"
- [ ] **JSON mode** — structured output with response_format
- [ ] **Tool calling** — weather function example
- [ ] **Web search** — OpenAI Responses API with `web_search_preview`
- [ ] **Multi-turn** — conversation with tool call + tool result + follow-up
- [ ] **Vision** — image URL input
- [ ] **Extended thinking** — Anthropic thinking parameter
- [ ] **System prompt testing** — pirate/poet/translator persona
- [ ] **Local model** — Ollama localhost config
- [ ] Each template pre-fills everything: provider, model, messages, params, tools

### Core: Format Engine (the hard part)
- [ ] **4 format adapters:**
  1. OpenAI Chat Completions (`/v1/chat/completions`)
  2. OpenAI Responses (`/v1/responses`)
  3. Anthropic Messages (`/v1/messages`)
  4. Gemini Native (`/v1beta/models/{model}:generateContent`)
- [ ] **Request translation** — user builds in a unified UI; the engine generates the correct JSON for the selected provider
- [ ] **Response normalization** — extract text, tool calls, usage from any format into a common view
- [ ] **Auth handling** — Bearer token for OpenAI-compat, `x-api-key` + `anthropic-version` for Anthropic, `x-goog-api-key` for Gemini
- [ ] **Raw JSON view** — always show the actual request/response JSON (for learning/debugging)

### Core: Model Discovery
- [ ] **OpenRouter model list** — fetch from public API (no auth), show 344+ models with metadata
- [ ] **Provider-specific lists** — when user adds their API key, fetch from that provider's `/models`
- [ ] **Model info cards** — name, provider, context length, pricing, capability badges (🔧 tools, 🔍 search, 👁️ vision, 🧠 reasoning)
- [ ] **Search & filter** — by provider, capability, price range, context length
- [ ] **Cache with TTL** — refresh model lists every 24h or on-demand

### Core: History
- [ ] **Auto-save every request/response** — stored in localStorage
- [ ] **History list** — scrollable, shows method, model, timestamp, status
- [ ] **Replay** — click a history item to re-populate the request builder
- [ ] **Delete individual items** or clear all

### UX
- [ ] **Mobile-responsive** — works great on phone browsers (the original premise)
- [ ] **Dark mode** — essential for devs
- [ ] **Keyboard shortcuts** — Cmd+Enter to send, Cmd+K for model search
- [ ] **Copy buttons** — copy response text, copy as cURL, copy request JSON
- [ ] **Share as cURL** — generate the equivalent cURL command for any request

---

## v1.1 — "Power User Features"

- [ ] **Collections** — save requests into named groups, organize by project
- [ ] **Environments** — variable sets (dev/staging/prod) with `{{variable}}` interpolation
- [ ] **Diff view** — compare two responses side-by-side
- [ ] **Conversation mode** — multi-turn chat UI that auto-appends assistant responses
- [ ] **Tool execution simulator** — define mock tool responses, auto-inject them
- [ ] **Request chaining** — use output of one request as input to the next
- [ ] **Import/Export** — save/load collections as JSON files
- [ ] **Prompt library** — save and reuse system prompts across requests

---

## v1.2 — "Collaboration & Sharing"

- [ ] **Shareable links** — encode request config in URL (no backend needed)
- [ ] **Embed mode** — iframe-friendly for docs/blogs
- [ ] **Postman collection import** — parse and convert
- [ ] **OpenAPI spec import** — auto-generate requests from spec
- [ ] **Export to code** — generate Python/JS/cURL code from any request

---

## v2.0 — "Platform"

- [ ] **User accounts** — optional, for sync across devices
- [ ] **Cloud sync** — save collections/history to cloud
- [ ] **Team sharing** — share collections with team members
- [ ] **PWA** — installable, works offline (requests cached for replay)
- [ ] **WebSocket support** — for real-time model APIs
- [ ] **Batch testing** — run multiple prompts against multiple models, compare results
- [ ] **Cost dashboard** — track spending across providers over time

---

## 🚫 NOT Building (v1.0)

These are explicitly out of scope for MVP:

| Feature | Why not |
|---------|---------|
| **User accounts / auth** | No backend needed for v1 — everything local |
| **Cloud sync** | localStorage is fine for MVP |
| **Postman collection import** | Complex format parsing; v1.1+ |
| **OAuth 2.0 flows** | LLM APIs use API keys, not OAuth |
| **GraphQL editor** | Not relevant to LLM APIs |
| **WebSocket** | Most LLM APIs use SSE, not WebSocket |
| **File upload** | Vision via URL is enough for v1 |
| **Batch/parallel requests** | Single request is the MVP |
| **Code generation** | Copy as cURL covers the basic need |
| **Backend/server** | Pure client-side — no server, no database, no deployment complexity |
| **iOS/Android native app** | Web-first; native later if validated |
| **Payment/billing integration** | Users bring their own API keys |
| **Rate limiting / quotas** | That's the provider's problem |
| **Automated testing / CI** | This is a manual testing tool |

---

## Tech Stack (v1.0)

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | React + Vite | Fast dev, good ecosystem, easy deployment |
| **Styling** | Tailwind CSS | Rapid UI, dark mode built-in, responsive |
| **State** | Zustand or React Context | Lightweight, no Redux overhead |
| **Code editor** | CodeMirror 6 | JSON editing with syntax highlighting |
| **Storage** | localStorage | Zero backend, instant, privacy-first |
| **Deployment** | GitHub Pages or Vercel | Free, fast, CDN |
| **HTTP client** | fetch API | Native, supports streaming via ReadableStream |
| **Markdown** | None (v1) | Raw JSON is fine for LLM responses |

**Alternative: Pure HTML/CSS/JS** (no React)
- Pros: Zero build step, simpler, matches personal site approach
- Cons: State management gets messy with complex UI (messages editor, model picker, templates)
- **Decision:** TBD — depends on complexity tolerance

---

## Key Metrics (what success looks like)

- **Time to first API call:** < 30 seconds (pick template → paste key → send)
- **Formats supported:** 4 (covers 95%+ of LLM API traffic)
- **Models discoverable:** 300+ (via OpenRouter)
- **Page load:** < 2 seconds
- **Works offline:** After first load (PWA stretch goal)
- **Zero backend:** Everything runs in the browser

---

*Created: 2026-03-14*
*Status: Draft — awaiting review*
