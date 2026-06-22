/**
 * Safe Markdown-to-HTML Converter
 *
 * A lightweight, dependency-free converter for rendering AI-generated markdown.
 * Pipeline: strip dangerous HTML -> escape all entities -> apply markdown.
 * Because every HTML entity is escaped after sanitization, the output is safe
 * to inject via `dangerouslySetInnerHTML`.
 *
 * @module lib/utils/markdown
 */

import {stripDangerousHtml} from '@/lib/security/sanitize';

/** Escape the five significant HTML characters to their named entities. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert a markdown string into safe HTML.
 * Supports headings, bold, italics, inline code, fenced code blocks, ordered
 * and unordered lists, links, and paragraphs.
 */
export function markdownToHtml(input: string): string {
  // 1. Defense-in-depth: remove raw HTML/scripts before processing.
  const cleaned = stripDangerousHtml(input);
  // 2. Escape all remaining HTML so nothing can be injected as markup.
  const escaped = escapeHtml(cleaned);

  const lines = escaped.split('\n');
  const out: string[] = [];
  let inCode = false;
  let listType: 'ul' | 'ol' | null = null;

  const inline = (text: string): string =>
    text
      // Inline code first so its contents are not re-parsed.
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links: [text](url) — url is already entity-escaped, so it is safe.
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw;

    // Fenced code block toggling.
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        closeList();
        out.push('<pre><code>');
        inCode = true;
      } else {
        out.push('</code></pre>');
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    // Headings.
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    // Unordered list item.
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list item.
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Blank line closes any open list.
    if (line.trim() === '') {
      closeList();
      continue;
    }

    // Paragraph.
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}
