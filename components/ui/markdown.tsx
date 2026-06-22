'use client';

/**
 * Markdown Renderer Component
 *
 * Renders a markdown string as HTML using the safe `markdownToHtml` converter,
 * which strips dangerous HTML and escapes all entities before transforming.
 * Prose-like Tailwind classes are applied for readable styling.
 *
 * @module components/ui/markdown
 */

import {markdownToHtml} from '@/lib/utils/markdown';
import {cn} from '@/lib/utils';

/**
 * Props for the {@link Markdown} component.
 */
export interface MarkdownProps {
  /** Raw markdown content to render. */
  content: string;
  /** Optional extra class names appended to the wrapper. */
  className?: string;
}

/**
 * Render markdown content as safe HTML.
 *
 * The output of `markdownToHtml` is pre-escaped, so `dangerouslySetInnerHTML`
 * is safe here — no raw user/AI HTML can reach the DOM.
 */
export function Markdown({content, className}: MarkdownProps) {
  const html = markdownToHtml(content);

  return (
    <div
      className={cn(
        // Base prose-like styling.
        'text-sm leading-relaxed space-y-2',
        // Headings.
        '[&_*]:my-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold',
        // Inline code.
        '[&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono',
        // Fenced code blocks.
        '[&_pre]:bg-slate-900 [&_pre]:text-slate-50 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-50',
        // Lists.
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
        // Links.
        '[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-800',
        // Paragraphs.
        '[&_p]:my-1',
        className,
      )}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}

export default Markdown;
