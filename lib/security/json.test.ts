import { describe, expect, it } from 'vitest';
import { jsonObjectSchema, jsonValueSchema } from './json';

describe('jsonValueSchema', () => {
  it('accepts every JSON scalar', () => {
    for (const value of ['text', 1, 0, true, false, null]) {
      expect(jsonValueSchema.safeParse(value).success).toBe(true);
    }
  });

  it('accepts nested arrays and objects', () => {
    const value = { kpi: 'Total Revenue', tags: ['a', 1, null], nested: { ok: true } };
    const result = jsonValueSchema.safeParse(value);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(value);
  });

  it('rejects values that cannot be stored in jsonb', () => {
    expect(jsonValueSchema.safeParse(undefined).success).toBe(false);
    expect(jsonValueSchema.safeParse(() => 1).success).toBe(false);
    expect(jsonValueSchema.safeParse(new Date()).success).toBe(false);
    expect(jsonValueSchema.safeParse({ nested: undefined }).success).toBe(false);
  });
});

describe('jsonObjectSchema', () => {
  it('accepts an audit metadata object', () => {
    const result = jsonObjectSchema.safeParse({ email: 'a@b.com', role: 'member', seats: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects a non-object payload', () => {
    expect(jsonObjectSchema.safeParse('nope').success).toBe(false);
    expect(jsonObjectSchema.safeParse(['nope']).success).toBe(false);
  });
});
