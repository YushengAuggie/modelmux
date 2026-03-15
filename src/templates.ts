import type { TemplateItem } from './types';

export const templates: TemplateItem[] = [
  {
    id: 'simple-conversation',
    name: 'Simple Conversation',
    description: 'Basic assistant interaction',
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
    name: 'JSON Output',
    description: 'Structured output test',
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
    name: 'Tool Calling',
    description: 'Weather function tool payload example',
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
    name: 'Web Search',
    description: 'Responses API with web_search_preview',
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
    name: 'Multi-turn Tool',
    description: 'Tool call and tool result continuation',
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
    name: 'Vision Prompt',
    description: 'Image URL prompt structure',
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
    name: 'Extended Thinking',
    description: 'Anthropic thinking-style prompt',
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
    name: 'Streaming Haiku',
    description: 'Streaming response comparison prompt',
    request: {
      provider: 'openai-chat',
      model: 'openai/gpt-4.1-mini',
      messages: [{ id: 't8m1', role: 'user', content: 'Write a haiku about programming.' }],
      params: { temperature: 0.9, maxTokens: 200, topP: 1, stream: true },
    },
  },
  {
    id: 'system-prompt-test',
    name: 'System Prompt Test',
    description: 'Persona prompt sensitivity test',
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
    name: 'Local Model',
    description: 'Custom base URL for Ollama/LM Studio/vLLM',
    request: {
      provider: 'custom',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
      messages: [{ id: 't10m1', role: 'user', content: 'Hello!' }],
      params: { temperature: 0.7, maxTokens: 500, topP: 1, stream: false },
    },
  },
];
