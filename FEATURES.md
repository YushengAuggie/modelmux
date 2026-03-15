# FEATURES.md — ModelMux MVP

> The LLM API testing tool that doesn't exist yet.

---

## MVP (v1.0) — "Make one LLM call and see the result"

**Priority legend**
- `P0` = must ship for MVP
- `P1` = valuable soon after MVP
- `P2` = later expansion

### P0 acceptance criteria

1. A new user can open the app, paste an API key, use a template or manual setup, and send a successful request without creating an account.
2. The app can generate valid requests for OpenAI Chat Completions, OpenAI Responses, Anthropic Messages, and Gemini Native from the unified UI.
3. Every sent request shows extracted output plus raw request/response details, status, latency, and usage when available.
4. Common provider-specific setup mistakes surface a readable error message with a corrective hint.
5. The core request-send-read flow works on a phone browser without horizontal overflow or blocked actions.
6. API keys, history, and saved state stay local in the browser and are never routed through an ModelMux backend.

### Core: Request Builder
- [ ] **[P0] Provider picker** — OpenAI, Anthropic, Gemini, Custom (any OpenAI-compatible endpoint)
  - Acceptance: User can switch providers in one tap and the request form updates to the correct format assumptions without requiring a page refresh.
- [ ] **[P0] Auto-format switching** — selecting a provider sets the correct request format, auth headers, and endpoint
  - Acceptance: Selecting each supported provider produces a valid request shape and required auth/header scheme automatically before send.
- [ ] **[P0] Model selector** — dynamic model list fetched from provider's API (OpenRouter as fallback/index)
  - Acceptance: User can pick a model from a visible list for supported providers, and the chosen model is applied to the outgoing request.
- [ ] **[P0] Messages editor** — add/remove/reorder messages (system, user, assistant, tool)
  - Acceptance: User can add, delete, and reorder message rows and the outgoing payload preserves the visible order and roles.
- [ ] **[P0] System prompt** — dedicated field (maps to correct location per format: `messages[0]`, top-level `system`, `systemInstruction`, or `instructions`)
  - Acceptance: System instructions entered once are translated to the correct provider-specific field automatically.
- [ ] **[P0] Parameters panel** — temperature, max_tokens, top_p, stream toggle
  - Acceptance: User can edit common parameters and the outgoing request includes only fields supported by the selected format.
- [ ] **[P0] API key input** — stored locally (localStorage), never sent anywhere except the provider
  - Acceptance: API key persists locally across reloads and is only included in the provider request headers.
- [ ] **[P0] Custom base URL** — for Ollama, LM Studio, vLLM, any self-hosted endpoint
  - Acceptance: User can replace the default endpoint with a custom base URL for OpenAI-compatible providers and send successfully.
- [ ] **[P0] Send button** — fires the request, shows loading state
  - Acceptance: Send triggers exactly one in-flight request, disables duplicate submission, and shows progress until completion or error.

### Core: Response Viewer
- [ ] **[P0] Response body** — syntax-highlighted JSON, with formatted text extraction
  - Acceptance: After each request, user can view both the normalized text result and the raw response JSON on the same screen.
- [ ] **[P0] Content extraction** — auto-pull the text response from the correct path per format (`choices[0].message.content` vs `content[0].text` vs `candidates[0].content.parts[0].text` vs `output[].content[].text`)
  - Acceptance: For each P0 format, the primary text output is shown without the user manually navigating the JSON.
- [ ] **[P0] Token usage display** — input/output/total tokens, cost estimate based on model pricing
  - Acceptance: When the provider returns usage data, the app shows token counts and a cost estimate using available pricing data.
- [ ] **[P0] Latency** — time-to-first-token (TTFT) + total time
  - Acceptance: Non-streaming requests show total duration, and streaming requests show both TTFT and total completion time.
- [ ] **[P0] Status code + headers** — collapsible raw details
  - Acceptance: User can expand a section to inspect HTTP status and response headers for the last request.
- [ ] **[P0] Error display** — formatted error messages with provider-specific hints (e.g., "Anthropic requires `max_tokens`")
  - Acceptance: Failed requests show the provider error payload plus at least one plain-language hint when a known issue is detected.
- [ ] **[P0] Streaming support** — real-time token-by-token display for SSE responses
  - Acceptance: Supported streaming requests render partial output incrementally before the request completes.

### Core: Pre-filled Templates
- [ ] **[P0] Simple conversation** — "Hello, what can you do?"
  - Acceptance: Template fills provider-compatible defaults and can be sent without extra required input beyond API key.
- [ ] **[P0] JSON mode** — structured output with response_format
  - Acceptance: Template preconfigures a request that returns machine-readable structured output on supported providers.
- [ ] **[P0] Tool calling** — weather function example
  - Acceptance: Template populates a valid tool definition and visible example prompt for supported formats.
- [ ] **[P0] Web search** — OpenAI Responses API with `web_search_preview`
  - Acceptance: Template preconfigures the correct provider, endpoint, and tool field for a live web-search-enabled request.
- [ ] **[P0] Multi-turn** — conversation with tool call + tool result + follow-up
  - Acceptance: Template demonstrates a complete multi-message sequence including tool interaction context.
- [ ] **[P0] Vision** — image URL input
  - Acceptance: Template includes a valid image URL field and request structure for providers that support image input by URL.
- [ ] **[P0] Extended thinking** — Anthropic thinking parameter
  - Acceptance: Template prepopulates Anthropic-specific thinking settings that generate a valid request.
- [ ] **[P0] System prompt testing** — pirate/poet/translator persona
  - Acceptance: Template demonstrates how changing system instructions alters output without manual payload editing.
- [ ] **[P0] Local model** — Ollama localhost config
  - Acceptance: Template points to a local OpenAI-compatible base URL and includes a runnable example model value.
- [ ] **[P0] Each template pre-fills everything: provider, model, messages, params, tools**
  - Acceptance: Choosing a template updates all required request fields in one action with no partially filled state.

### Core: Format Engine (the hard part)
- [ ] **[P0] 4 format adapters:**
  1. OpenAI Chat Completions (`/v1/chat/completions`)
  2. OpenAI Responses (`/v1/responses`)
  3. Anthropic Messages (`/v1/messages`)
  4. Gemini Native (`/v1beta/models/{model}:generateContent`)
  - Acceptance: The app can send one successful request with each of the four supported adapters using the same shared UI concepts.
- [ ] **[P0] Request translation** — user builds in a unified UI; the engine generates the correct JSON for the selected provider
  - Acceptance: The raw request view reflects the provider-specific payload generated from the unified form state.
- [ ] **[P0] Response normalization** — extract text, tool calls, usage from any format into a common view
  - Acceptance: Supported formats render into the same response layout without requiring provider-specific navigation.
- [ ] **[P0] Auth handling** — Bearer token for OpenAI-compat, `x-api-key` + `anthropic-version` for Anthropic, `x-goog-api-key` for Gemini
  - Acceptance: Each provider sends the correct auth header pattern automatically using the stored API key.
- [ ] **[P0] Raw JSON view** — always show the actual request/response JSON (for learning/debugging)
  - Acceptance: User can inspect the exact request body and response body for the most recent call without leaving the main flow.

### Core: Model Discovery
- [ ] **[P0] OpenRouter model list** — fetch from public API (no auth), show 344+ models with metadata
  - Acceptance: App loads a browsable default model catalog without requiring the user to enter an API key.
- [ ] **[P1] Provider-specific lists** — when user adds their API key, fetch from that provider's `/models`
- [ ] **[P1] Model info cards** — name, provider, context length, pricing, capability badges (🔧 tools, 🔍 search, 👁️ vision, 🧠 reasoning)
- [ ] **[P1] Search & filter** — by provider, capability, price range, context length
- [ ] **[P1] Cache with TTL** — refresh model lists every 24h or on-demand

### Core: History
- [ ] **[P0] Auto-save every request/response** — stored in localStorage
  - Acceptance: Every completed request, including failures, is added to local history on the same device.
- [ ] **[P0] History list** — scrollable, shows method, model, timestamp, status
  - Acceptance: User can scan recent entries with enough metadata to identify and reopen a previous request.
- [ ] **[P0] Replay** — click a history item to re-populate the request builder
  - Acceptance: Selecting a history item restores request inputs so the user can resend or modify them immediately.
- [ ] **[P1] Delete individual items** or clear all

### UX
- [ ] **[P0] Mobile-responsive** — works great on phone browsers (the original premise)
  - Acceptance: Core request and response actions remain usable on common mobile viewport widths without horizontal scrolling.
- [ ] **[P1] Dark mode** — essential for devs
- [ ] **[P1] Keyboard shortcuts** — Cmd+Enter to send, Cmd+K for model search
- [ ] **[P0] Copy buttons** — copy response text, copy as cURL, copy request JSON
  - Acceptance: User can copy extracted output, raw request JSON, and generated cURL with one tap each.
- [ ] **[P0] Share as cURL** — generate the equivalent cURL command for any request
  - Acceptance: For the current request state, app generates a runnable cURL command with the correct URL, headers, and body.

---

## v1.1 — "Power User Features"

- [ ] **[P1] Collections** — save requests into named groups, organize by project
- [ ] **[P1] Environments** — variable sets (dev/staging/prod) with `{{variable}}` interpolation
- [ ] **[P1] Diff view** — compare two responses side-by-side
- [ ] **[P1] Conversation mode** — multi-turn chat UI that auto-appends assistant responses
- [ ] **[P1] Tool execution simulator** — define mock tool responses, auto-inject them
- [ ] **[P1] Request chaining** — use output of one request as input to the next
- [ ] **[P1] Import/Export** — save/load collections as JSON files
- [ ] **[P1] Prompt library** — save and reuse system prompts across requests

---

## v1.2 — "Collaboration & Sharing"

- [ ] **[P1] Shareable links** — encode request config in URL (no backend needed)
- [ ] **[P1] Embed mode** — iframe-friendly for docs/blogs
- [ ] **[P2] Postman collection import** — parse and convert
- [ ] **[P2] OpenAPI spec import** — auto-generate requests from spec
- [ ] **[P1] Export to code** — generate Python/JS/cURL code from any request

---

## v2.0 — "Platform"

- [ ] **[P2] User accounts** — optional, for sync across devices
- [ ] **[P2] Cloud sync** — save collections/history to cloud
- [ ] **[P2] Team sharing** — share collections with team members
- [ ] **[P2] PWA** — installable, works offline (requests cached for replay)
- [ ] **[P2] WebSocket support** — for real-time model APIs
- [ ] **[P2] Batch testing** — run multiple prompts against multiple models, compare results
- [ ] **[P2] Cost dashboard** — track spending across providers over time

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
