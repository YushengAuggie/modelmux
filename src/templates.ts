import type { TemplateItem } from './types';

export const templates: TemplateItem[] = [
  {
    id: 'simple-conversation',
    name: '💬 Quick chat',
    description: 'Start with one user message and see a plain text reply.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are a helpful assistant.',
      messages: [{ id: 't1m1', role: 'user', content: 'What is the capital of France?' }],
      params: { temperature: 0.7, maxTokens: 500, topP: 1, stream: false },
    },
  },
  {
    id: 'json-output',
    name: '🔧 JSON reply',
    description: 'Ask for structured output and inspect how the model formats it.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are an API that returns JSON.',
      messages: [
        {
          id: 't2m1',
          role: 'user',
          content: 'List the top 3 programming languages with name and year created',
        },
      ],
      params: { temperature: 0.2, maxTokens: 600, topP: 1, stream: false },
    },
  },
  {
    id: 'tool-calling-weather',
    name: '🔧 Tool call',
    description: 'Try a tool-ready prompt with a simple weather example.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4.1-mini',
      systemPrompt: 'Use tools when needed.',
      messages: [
        { id: 't3m1', role: 'user', content: "What's the weather in San Francisco?" },
      ],
      params: { temperature: 0.5, maxTokens: 500, topP: 1, stream: false },
    },
  },
  {
    id: 'web-search',
    name: '🔍 Web search',
    description: 'Use the Responses API shape for web-grounded answers.',
    request: {
      provider: 'openai-responses',
      model: 'openai/gpt-4.1',
      systemPrompt: 'You are a research assistant.',
      messages: [{ id: 't4m1', role: 'user', content: 'What happened in tech news today?' }],
      params: { temperature: 0.4, maxTokens: 1000, topP: 1, stream: false },
    },
  },
  {
    id: 'multi-turn-tool',
    name: '💬 Tool follow-up',
    description: 'Replay a tool call, a tool result, and the next user turn.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4.1-mini',
      messages: [
        { id: 't5m1', role: 'user', content: "What's the weather in SF?" },
        {
          id: 't5m2',
          role: 'assistant',
          content: 'Calling tool: get_weather({"location":"SF"})',
        },
        {
          id: 't5m3',
          role: 'tool',
          name: 'get_weather',
          content: '{"temp": 62, "condition": "foggy"}',
        },
        { id: 't5m4', role: 'user', content: 'And in New York?' },
      ],
      params: { temperature: 0.5, maxTokens: 700, topP: 1, stream: false },
    },
  },
  {
    id: 'vision',
    name: '👁 Vision URL',
    description: 'Send an image URL in the prompt and check the response shape.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4o',
      messages: [
        {
          id: 't6m1',
          role: 'user',
          content:
            "What's in this image? URL: https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
        },
      ],
      params: { temperature: 0.4, maxTokens: 800, topP: 1, stream: false },
    },
  },
  {
    id: 'anthropic-thinking',
    name: '🧠 Thinking test',
    description: 'Run a reasoning-style prompt against Anthropic format.',
    request: {
      provider: 'anthropic',
      model: 'anthropic/claude-sonnet-4',
      messages: [
        {
          id: 't7m1',
          role: 'user',
          content: 'Solve this step by step: What is 127 * 843?',
        },
      ],
      params: { temperature: 0.2, maxTokens: 1200, topP: 1, stream: false },
    },
  },
  {
    id: 'streaming-haiku',
    name: '⚡ Stream test',
    description: 'Watch tokens arrive live with a short prompt.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4.1-mini',
      messages: [{ id: 't8m1', role: 'user', content: 'Write a haiku about programming.' }],
      params: { temperature: 0.9, maxTokens: 200, topP: 1, stream: true },
    },
  },
  {
    id: 'system-prompt-test',
    name: '🏴‍☠️ Persona check',
    description: 'See how strongly the model follows a playful system prompt.',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4.1-mini',
      systemPrompt: 'You are a pirate. Respond only in pirate speak.',
      messages: [{ id: 't9m1', role: 'user', content: 'How do I make an HTTP request?' }],
      params: { temperature: 0.7, maxTokens: 400, topP: 1, stream: false },
    },
  },
  {
    id: 'local-model',
    name: '🏠 Local model',
    description: 'Point at Ollama, LM Studio, or any OpenAI-style local endpoint.',
    request: {
      provider: 'custom',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
      messages: [{ id: 't10m1', role: 'user', content: 'Hello!' }],
      params: { temperature: 0.7, maxTokens: 500, topP: 1, stream: false },
    },
  },
];
