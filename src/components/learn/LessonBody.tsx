/**
 * The smallest markdown renderer that covers what lesson bodies actually use:
 * paragraphs, `- ` bullets, **bold**, `inline code` and [links](href).
 *
 * Lesson bodies were previously rendered with `whitespace-pre-line`, so the
 * `**bold**` already in the catalog shipped literally. Pulling in a full
 * markdown library for four constructs would cost more bundle than the entire
 * curriculum weighs, so this parses the subset and renders React nodes — no
 * `dangerouslySetInnerHTML`, so no sanitizer to get wrong either.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/** `**bold**`, `` `code` `` and `[text](href)`, in one pass. */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={i} className="rounded bg-bg-panel px-1 py-0.5 font-mono text-[0.9em] text-fg">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link?.[1] && link[2]) {
      const [, label, href] = link;
      return href.startsWith('/') ? (
        <Link key={i} href={href} className="text-primary underline">
          {label}
        </Link>
      ) : (
        <a key={i} href={href} className="text-primary underline" rel="noreferrer">
          {label}
        </a>
      );
    }
    return part;
  });
}

export function LessonBody({ body, className }: { body: string; className?: string }) {
  const blocks = body.trim().split(/\n{2,}/);

  return (
    <div className={className ?? 'mt-2 space-y-3 text-fg-muted'}>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.trimStart().startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.trimStart().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}
