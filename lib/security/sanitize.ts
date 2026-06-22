/**
 * HTML sanitization for AI-generated markdown output.
 *
 * AI responses are rendered as Markdown. To prevent XSS from prompt-injected
 * raw HTML, we strip raw HTML tags before passing to a markdown renderer and
 * the renderer itself escapes. This is a defense-in-depth layer.
 *
 * @module lib/security/sanitize
 */

/**
 * Remove raw <script>...</script>, on* attributes, and dangerous tags from
 * an HTML/markdown string. Returns text safe to feed to a markdown renderer
 * that escapes by default.
 */
export function stripDangerousHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');
}
