import { describe, expect, it } from 'vitest';
import { stripDangerousHtml } from './sanitize';

describe('stripDangerousHtml', () => {
  it('removes script blocks', () => {
    expect(stripDangerousHtml('hello <script>alert(1)</script> world')).toBe('hello  world');
  });

  it('removes inline event handlers', () => {
    expect(stripDangerousHtml('<img src=x onerror="alert(1)">')).not.toContain('onerror');
  });

  it('removes javascript: URLs', () => {
    expect(stripDangerousHtml('[x](javascript:alert(1))')).not.toContain('javascript:');
  });

  it('leaves ordinary markdown intact', () => {
    expect(stripDangerousHtml('**bold** and `code`')).toBe('**bold** and `code`');
  });
});
