# LLM API Landscape — Complete Reference

## Overview

Most LLM providers have converged around a few formats. The OpenAI Chat Completions format is the de facto standard — 12+ providers use it with just a different base URL. But there are now **5 distinct API standards** worth supporting.

---

## The 5 API Standards

### 1. OpenAI Chat Completions (universal standard)
**Endpoint:** `POST /v1/chat/completions`
**Auth:** `Authorization: Bearer {key}`
**Used by:** OpenAI, Mistral, Groq, Together, Perplexity, OpenRouter, Fireworks, Poe, Ollama, LM Studio, Azure OpenAI, DeepSeek, xAI/Grok

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false,
  "tools": [...],
  "tool_choice": "auto",
  "response_format": {"type": "json_object"}
}
```

**Response path:** `choices[0].message.content`
**Tool calls:** `choices[0].message.tool_calls`
**Usage:** `usage.{prompt_tokens, completion_tokens, total_tokens}`

---

### 2. OpenAI Responses API (new, agentic)
**Endpoint:** `POST /v1/responses`
**Auth:** `Authorization: Bearer {key}`
**Used by:** OpenAI only (2025+)

```json
{
  "model": "gpt-4o",
  "input": "Tell me about the weather in SF",
  "instructions": "You are a helpful weather assistant.",
  "tools": [
    {"type": "web_search_preview"},
    {"type": "file_search", "vector_store_ids": ["vs_..."]},
    {"type": "computer_use_preview", "display_width": 1024, "display_height": 768},
    {"type": "function", "name": "get_weather", "description": "...", "parameters": {...}}
  ],
  "stream": false,
  "temperature": 0.7,
  "max_output_tokens": 1000,
  "previous_response_id": "resp_..." 
}
```

**Key differences from Chat Completions:**
- `input` can be a simple string (not always messages array)
- `input` can also be a messages array for multi-turn
- `instructions` replaces system message
- Built-in tools: `web_search_preview`, `file_search`, `computer_use_preview`, `code_interpreter`
- `previous_response_id` for conversation continuity (stateful)
- Response is a single `output` array of items, not `choices`
- Supports `conversation_id` for managed conversations

**Response path:** `output[].content[].text`
**Tool calls:** `output[].type == "function_call"`
**Usage:** `usage.{input_tokens, output_tokens, total_tokens}`

---

### 3. Anthropic Messages
**Endpoint:** `POST /v1/messages`
**Auth:** `x-api-key: {key}` + `anthropic-version: 2023-06-01`
**Used by:** Anthropic only

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "You are a helpful assistant.",
  "messages": [
    {"role": "user", "content": "Hello!"},
    {"role": "user", "content": [
      {"type": "text", "text": "What's in this image?"},
      {"type": "image", "source": {"type": "url", "url": "https://..."}}
    ]}
  ],
  "temperature": 0.7,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get weather",
      "input_schema": {"type": "object", "properties": {"location": {"type": "string"}}}
    },
    {"type": "computer_20250124", "display_width": 1024, "display_height": 768},
    {"type": "text_editor_20250124"},
    {"type": "bash_20250124"}
  ],
  "thinking": {"type": "enabled", "budget_tokens": 5000}
}
```

**Key differences:**
- `x-api-key` header (not Bearer)
- `anthropic-version` required header
- `system` is top-level (not a message role)
- Tools use `input_schema` (not `parameters`)
- `tool_choice`: `{"type": "auto"}` format
- Content can be arrays of blocks (text + image mixed)
- Has `thinking` parameter for extended thinking
- Built-in tools: `computer_use`, `text_editor`, `bash`
- Web search via `type: "web_search_20250305"` tool

**Response path:** `content[0].text`
**Tool calls:** `content[].type == "tool_use"`
**Usage:** `usage.{input_tokens, output_tokens}`

---

### 4. Google Gemini
**Endpoint:** `POST /v1beta/models/{model}:generateContent`
**Auth:** `x-goog-api-key: {key}`
**Used by:** Google only

```json
{
  "contents": [
    {"role": "user", "parts": [{"text": "Hello!"}]}
  ],
  "systemInstruction": {
    "parts": [{"text": "You are a helpful assistant."}]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1000,
    "topP": 0.9,
    "topK": 40
  },
  "tools": [{
    "functionDeclarations": [{
      "name": "get_weather",
      "description": "Get weather",
      "parameters": {"type": "object", "properties": {"location": {"type": "string"}}}
    }],
    "google_search": {}
  }]
}
```

**Key differences:**
- Model name in URL path (not body)
- `x-goog-api-key` header
- `contents` with `parts` (not `messages` with `content`)
- `systemInstruction` separate from contents
- Config under `generationConfig`
- Has `topK` (unique)
- Tools: `functionDeclarations` + `google_search` built-in
- Grounding with Google Search is a tool

**Response path:** `candidates[0].content.parts[0].text`
**Tool calls:** `candidates[0].content.parts[].functionCall`
**Usage:** `usageMetadata.{promptTokenCount, candidatesTokenCount}`

---

### 5. Cohere Chat (v2)
**Endpoint:** `POST /v2/chat`
**Auth:** `Authorization: Bearer {key}`
**Used by:** Cohere

```json
{
  "model": "command-a-03-2025",
  "messages": [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "tools": [{
    "type": "function",
    "function": {"name": "web_search", "description": "...", "parameters": {...}}
  }],
  "connectors": [{"id": "web-search"}]
}
```

**Key differences:**
- Uses `connectors` for built-in web search
- v2 format is OpenAI-like but with extras
- Has citation generation built-in

---

## Provider Details

### Model List Endpoints (for dynamic fetching)

| Provider | Endpoint | Auth | CORS? |
|----------|----------|------|-------|
| **OpenAI** | `GET /v1/models` | Bearer | ❌ |
| **OpenRouter** | `GET /api/v1/models` | None (public) | ✅ |
| **Poe** | `GET /v1/models` | Bearer | ❌ |
| **Groq** | `GET /v1/models` | Bearer | ❌ |
| **Mistral** | `GET /v1/models` | Bearer | ❌ |
| **Together** | `GET /v1/models` | Bearer | ❌ |
| **Anthropic** | No list endpoint | — | — |
| **Gemini** | `GET /v1beta/models` | API key | ❌ |
| **Ollama** | `GET /api/tags` | None | ✅ (local) |

**OpenRouter is the best for model discovery** — 344 models, public endpoint, no auth needed, CORS friendly.

### Verified Model Counts (live as of 2026-03-14):
- **OpenRouter**: 344 models
- **Poe**: 352 models
- **OpenAI**: ~30 chat models
- **Anthropic**: ~10 models
- **Gemini**: ~15 models
- **Groq**: ~20 models

---

## Built-in Tools by Provider

| Tool | OpenAI CC | OpenAI Resp | Anthropic | Gemini |
|------|-----------|-------------|-----------|--------|
| **Web Search** | ❌ | ✅ `web_search_preview` | ✅ `web_search_20250305` | ✅ `google_search` |
| **Code Interpreter** | ✅ (Assistants) | ✅ `code_interpreter` | ❌ | ✅ `code_execution` |
| **File Search** | ✅ (Assistants) | ✅ `file_search` | ❌ | ❌ |
| **Computer Use** | ❌ | ✅ `computer_use_preview` | ✅ `computer_20250124` | ❌ |
| **Text Editor** | ❌ | ❌ | ✅ `text_editor_20250124` | ❌ |
| **Bash** | ❌ | ❌ | ✅ `bash_20250124` | ❌ |
| **Custom Functions** | ✅ | ✅ | ✅ | ✅ |

---

## Pre-filled Templates

### Template 1: Simple Conversation
```
Provider: Any
Messages: [
  system: "You are a helpful assistant.",
  user: "What is the capital of France?"
]
Parameters: temperature=0.7, max_tokens=500
```

### Template 2: JSON Output
```
Provider: OpenAI / compatible
Messages: [
  system: "You are an API that returns JSON.",
  user: "List the top 3 programming languages with name and year created"
]
Parameters: response_format={"type": "json_object"}
```

### Template 3: Tool Calling — Weather
```
Provider: Any that supports tools
Messages: [
  user: "What's the weather in San Francisco?"
]
Tools: [{
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {location: string, unit: "celsius"|"fahrenheit"}
}]
```

### Template 4: Web Search
```
Provider: OpenAI Responses API
Input: "What happened in tech news today?"
Tools: [{"type": "web_search_preview"}]
```

### Template 5: Multi-turn with Tool Results
```
Provider: Any
Messages: [
  user: "What's the weather in SF?",
  assistant: {tool_calls: [{name: "get_weather", args: {location: "SF"}}]},
  tool: {name: "get_weather", content: '{"temp": 62, "condition": "foggy"}'},
  user: "And in New York?"
]
```

### Template 6: Vision (Image Input)
```
Provider: OpenAI / Anthropic / Gemini
Messages: [
  user: [
    {type: "text", text: "What's in this image?"},
    {type: "image_url", url: "https://example.com/photo.jpg"}
  ]
]
```

### Template 7: Extended Thinking (Anthropic)
```
Provider: Anthropic
Messages: [
  user: "Solve this step by step: What is 127 * 843?"
]
thinking: {type: "enabled", budget_tokens: 5000}
```

### Template 8: Streaming Comparison
```
Provider: Side-by-side (OpenAI vs Anthropic)
Messages: [
  user: "Write a haiku about programming"
]
Stream: true
```

### Template 9: System Prompt Testing
```
Provider: Any
Messages: [
  system: "You are a pirate. Respond only in pirate speak.",
  user: "How do I make a HTTP request?"
]
```

### Template 10: Custom Base URL (Local / Self-hosted)
```
Provider: Custom
Base URL: http://localhost:11434/v1  (Ollama)
Model: llama3
Messages: [user: "Hello!"]
```

---

---

## Dynamic Model Lists — API Reference

### OpenRouter (`GET /api/v1/models`) — BEST SOURCE
- **No auth required**, public endpoint, CORS-friendly
- **344 models** from 25+ providers
- Returns rich metadata per model:
  - `id`, `name`, `description`
  - `architecture.modality` (text, image, audio, video)
  - `architecture.input_modalities` / `output_modalities`
  - `context_length`, `top_provider.max_completion_tokens`
  - `pricing.prompt` / `pricing.completion` (per token in $)
  - `supported_parameters` — exactly which params the model supports
  - `default_parameters` — default values
- **70% of models support tools** (240/344)
- **15 models support `web_search_options`** (Perplexity, OpenAI search models)

### Poe (`GET /v1/models`) — Requires API key
- **352 models** (includes image/video/audio generators)
- Rich metadata:
  - `supported_features` (tools, web_search)
  - `pricing.prompt` / `pricing.completion`
  - `context_window.context_length` / `max_output_tokens`
  - `metadata.display_name`, `metadata.image` (model icon)
  - `parameters` — custom params with schema, defaults, descriptions
  - `reasoning.supports_reasoning_effort`
- **94 models support tools**, **27 support web_search**
- Unique: model icons/images, rich parameter schemas

### OpenAI (`GET /v1/models`) — Requires API key
- ~30 chat models, basic metadata (id, owned_by, created)
- No pricing, no feature flags, no context length
- Must hardcode capabilities

### Gemini (`GET /v1beta/models`) — Requires API key
- Returns model name, description, input/output token limits
- Includes `supportedGenerationMethods`

### Anthropic — **No model list endpoint**
- Models must be hardcoded from docs
- Current: claude-opus-4, claude-sonnet-4, claude-haiku-3.5, etc.

### Groq (`GET /v1/models`) — Requires API key
- OpenAI-compatible format, ~20 models

### Mistral (`GET /v1/models`) — Requires API key
- OpenAI-compatible format

---

## Live Stats (2026-03-14)

### Provider Distribution (OpenRouter)
| Provider | Models | Notable |
|----------|--------|---------|
| OpenAI | 60 | GPT-5.4, o3, search models |
| Qwen | 50 | Qwen3.5 series |
| Google | 27 | Gemini 3.1 series |
| Mistral | 25 | Mistral Large, Small |
| Meta-Llama | 16 | Llama 4 series |
| Anthropic | 13 | Claude Opus 4, Sonnet 4 |
| DeepSeek | 11 | DeepSeek V3 |
| xAI | 10 | Grok 4.20 |

### Model Capabilities
- **Tools support:** 240/344 (70%) on OpenRouter
- **Web search:** 15 models (Perplexity Sonar, OpenAI Search)
- **Reasoning:** 153 models support reasoning parameter
- **Free models:** 28 available

### Context Lengths
| Range | Count |
|-------|-------|
| 1M+ tokens | 40 |
| 200K-1M | 85 |
| 100K-200K | 136 |
| 32K-100K | 54 |
| <32K | 29 |

### Pricing Range (per 1M tokens, OpenRouter)
| Tier | Input | Output | Example |
|------|-------|--------|---------|
| Free | $0 | $0 | openrouter/free, nvidia/nemotron:free |
| Budget | $0.03-0.25 | $0.12-1.00 | qwen3.5-9b, liquid/lfm-2 |
| Mid | $0.50-3.00 | $2.00-15.00 | gpt-5.4, claude-sonnet-4 |
| Premium | $10-30 | $30-180 | gpt-5.4-pro, claude-opus-4 |

### Modalities
| Type | Count |
|------|-------|
| Text → Text | 199 |
| Text + Image → Text | 64 |
| Text + Image + File → Text | 39 |
| Text + Image + Video → Text | 15 |
| Multimodal (audio/video) | 12 |
| Text → Image | 3 |

---

## App Strategy for Model Lists

### Recommended approach:
1. **OpenRouter as primary model index** — public, no auth, richest metadata, CORS-friendly
2. **Provider-specific `/models` endpoints** when user adds their own API key
3. **Hardcoded fallback list** for providers without list APIs (Anthropic)
4. **Cache model lists** with TTL (refresh every 24h or on-demand)
5. **Show metadata:** pricing, context length, tool support, modality icons
6. **Filter & sort:** by provider, capability (tools, vision, search), price, context length

### Model data to display in the UI:
- Model name + provider icon
- Context length (visual bar)
- Pricing ($/1M tokens)
- Capabilities badges: 🔧 Tools, 🔍 Search, 👁️ Vision, 🧠 Reasoning
- Modality: text, image, audio, video

---

*Research completed: 2026-03-14*
*Sources: OpenAI API docs, Anthropic API docs, Google Gemini docs, OpenRouter docs, Poe API, live API queries*
*Data is live from API queries — model counts and capabilities change frequently*
