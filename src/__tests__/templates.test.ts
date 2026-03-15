import { describe, expect, it } from 'vitest';
import { templates } from '@/templates';

const validProviders = new Set([
  'openai-chat',
  'openai-responses',
  'anthropic',
  'gemini',
  'custom',
]);

describe('templates', () => {
  it('contains only unique template ids', () => {
    const ids = templates.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains non-empty names and descriptions', () => {
    for (const template of templates) {
      expect(template.name.trim()).not.toBe('');
      expect(template.description.trim()).not.toBe('');
    }
  });

  it('uses only supported providers', () => {
    for (const template of templates) {
      expect(validProviders.has(template.request.provider ?? '')).toBe(true);
    }
  });

  it('defines models, params, and at least one message for every template', () => {
    for (const template of templates) {
      expect(template.request.model?.trim()).toBeTruthy();
      expect(template.request.messages?.length).toBeGreaterThan(0);
      expect(template.request.params).toMatchObject({
        temperature: expect.any(Number),
        maxTokens: expect.any(Number),
        topP: expect.any(Number),
        stream: expect.any(Boolean),
      });
    }
  });

  it('keeps template messages structurally valid', () => {
    for (const template of templates) {
      for (const message of template.request.messages ?? []) {
        expect(message.id.trim()).not.toBe('');
        expect(['system', 'user', 'assistant', 'tool']).toContain(message.role);
        expect(typeof message.content).toBe('string');
      }
    }
  });
});
