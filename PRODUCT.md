# PRODUCT.md — API Pilot

> Ruthlessly simple LLM API testing from any browser.

## Product Vision

API Pilot is the fastest way to test an LLM API from a phone or laptop. Paste an API key, pick a template or model, send one request, and immediately understand what happened. No signup, no backend, no workspace setup, no vendor lock-in.

The product wins by removing friction from fragmented LLM APIs:
- One mobile-first UI for multiple provider formats
- Zero-friction start: paste key and go
- Learning and debugging built in: show the raw request, raw response, extracted output, latency, usage, and errors
- Local-first privacy: credentials and history stay in the browser

## Product Principles

- Mobile-first: every core action must be fast and clear on a phone
- Zero friction: no signup, no onboarding flow, no required account
- Unified, not generic: normalize the major LLM formats without hiding what is actually sent
- Local-first: no backend dependency for MVP
- Fast to value: first successful request in under 30 seconds

## User Personas

### 1. AI Engineer on the Move
- Builds with OpenAI, Anthropic, Gemini, and compatible APIs
- Needs to test prompts, parameters, tools, and model behavior quickly
- Usually reaches for docs, curl, or a laptop today
- Values speed, raw visibility, and multi-provider support

### 2. Indie Builder / Hacker
- Ships side projects and prototypes with whichever model is cheapest or best today
- Wants to compare providers and test self-hosted endpoints like Ollama
- Does not want another SaaS account or a heavyweight API client
- Values bring-your-own-key, templates, and cURL export

### 3. PM / Designer Validating AI Behavior
- Needs to sanity-check prompts, JSON output, and simple tool flows without coding
- Wants prefilled templates and readable responses more than full API depth
- Often works from a phone, tablet, or borrowed machine
- Values simplicity, safe defaults, and clear error messages

## User Stories

- As an AI engineer, I can paste an API key and send a request in under 30 seconds so I can validate an endpoint immediately.
- As an AI engineer, I can switch between OpenAI, Anthropic, Gemini, and OpenAI-compatible endpoints without rewriting payloads by hand.
- As an indie builder, I can test a local or self-hosted model by setting a custom base URL.
- As a PM, I can start from a template for JSON mode, tools, vision, or web search instead of building a request from scratch.
- As a builder, I can see the extracted answer, raw JSON, status, latency, and token usage in one place.
- As a developer, I can inspect provider-specific errors and get hints about missing parameters or headers.
- As a repeat user, I can replay a recent request without rebuilding it.
- As a privacy-conscious user, I can use the product without creating an account or sending my API key to a third-party backend.

## Success Metrics

### Primary
- Time to first successful API call: median under 30 seconds
- First-session success rate: at least 80% of users who paste a key send one successful request
- Mobile completion rate: at least 90% of desktop completion rate

### Secondary
- Template usage rate: at least 40% of first-session requests start from a template
- Multi-provider usage: at least 25% of active users test more than one provider in a 30-day period
- Replay rate: at least 30% of active users reuse history
- Error recovery rate: at least 50% of failed requests are followed by a successful retry in the same session

## Feature Matrix

| Priority | Outcome | Included features |
|----------|---------|-------------------|
| **P0** | Make one LLM call and understand the result | Provider picker, auto-format switching, model selector, messages editor, system prompt, parameters panel, API key input, custom base URL, send button, response body, content extraction, token usage, latency, status/headers, error display, streaming, prefilled templates, format adapters, request translation, response normalization, auth handling, raw JSON view, OpenRouter model list, history, replay, mobile-responsive UI, copy buttons, share as cURL |
| **P1** | Make repeat usage smoother for power users | Provider-specific model lists, model metadata cards, search/filter, cache TTL, dark mode, keyboard shortcuts, collections, environments, diff view, conversation mode, tool execution simulator, request chaining, import/export, prompt library, shareable links, embed mode, export to code |
| **P2** | Expand reach, collaboration, and scale | Postman/OpenAPI import, user accounts, cloud sync, team sharing, PWA/offline replay, WebSocket support, batch testing, cost dashboard |

## User Journey Map

| Stage | User goal | Product behavior | Risk to remove |
|-------|-----------|------------------|----------------|
| **Discover** | Find a quick way to test an LLM API | Landing page and app make “paste key and go” obvious | Product feels like another heavyweight API client |
| **Start** | Begin without commitment | No signup, immediate request builder, template shortcuts | Too many setup fields before first send |
| **Configure** | Set provider, model, prompt, params | Unified builder adapts format automatically | Provider-specific JSON complexity leaks too early |
| **Send** | Execute a real request | Loading state, streaming when available, clear failure handling | Silent failures or unclear network state |
| **Understand** | See if it worked and why | Extracted output, raw JSON, latency, tokens, headers, errors | Response is readable only to experts |
| **Iterate** | Tweak prompt/model quickly | Replay from history, edit fields inline, switch templates/models fast | Rebuilding requests from scratch each time |
| **Share / Export** | Move to dev workflow | Copy response, request JSON, or cURL | Tool is useful only inside itself |

## Competitive Moat

- Mobile-first by default: not a desktop tool awkwardly squeezed onto a phone
- Multi-format normalization: one UI across the major LLM API standards
- Zero-backend trust model: no signup and no proxy for API keys in MVP
- Fast learning loop: actual request/response JSON plus normalized output in the same view
- Broad model discovery: OpenRouter-backed catalog plus provider-specific and local endpoints
- Low-friction portability: cURL export keeps the tool aligned with real developer workflows

## Positioning

API Pilot is not a full Postman replacement and not a hosted playground tied to one provider. It is the fastest path from “I need to test this model call” to “I know what happened,” especially on mobile.

*Created: 2026-03-14*
