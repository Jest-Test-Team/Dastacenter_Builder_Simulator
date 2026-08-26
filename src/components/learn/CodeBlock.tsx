/**
 * A source excerpt with the privacy-relevant keywords called out.
 *
 * This is deliberately not a general syntax highlighter. The Compact track is
 * about one question — what crosses from private witness to public ledger — so
 * the only tokens worth colouring are the ones that answer it: `witness`,
 * `ledger`, `disclose`, and the `pub` marker in Noir. Everything else stays
 * plain, which keeps the eye on the boundary.
 */

import type { CodeBlock as CodeBlockData } from '@/lib/content/modules';

/** Tokens that mark a privacy boundary, and how each reads. */
const MARKERS: { pattern: RegExp; className: string }[] = [
  { pattern: /\bwitness\b/g, className: 'text-warn font-semibold' },
  { pattern: /\bdisclose\b/g, className: 'text-danger font-semibold' },
  { pattern: /\bledger\b/g, className: 'text-success font-semibold' },
  { pattern: /\bpub\b/g, className: 'text-success font-semibold' },
];

const SPLIT = new RegExp(`(${MARKERS.map((m) => m.pattern.source).join('|')})`, 'g');

function markLine(line: string) {
  return line.split(SPLIT).map((part, i) => {
    const marker = MARKERS.find((m) => new RegExp(`^${m.pattern.source}$`).test(part));
    return marker ? (
      <span key={i} className={marker.className}>
        {part}
      </span>
    ) : (
      part
    );
  });
}

export function CodeBlock({ block }: { block: CodeBlockData }) {
  const lines = block.source.replace(/\n+$/, '').split('\n');
  const highlighted = new Set(block.highlight);

  return (
    <figure className="mt-4 overflow-hidden rounded-lg border border-border bg-bg">
      <figcaption className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[11px] text-fg-muted">
        <span className="font-mono">{block.file}</span>
        <span className="badge text-[10px] uppercase">{block.language}</span>
      </figcaption>
      <div className="overflow-x-auto">
        <pre className="min-w-full p-3 font-mono text-xs leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <span
                key={i}
                className={
                  highlighted.has(i)
                    ? 'block bg-primary/10 px-1 -mx-1 border-l-2 border-primary'
                    : 'block px-1 -mx-1 border-l-2 border-transparent'
                }
              >
                {line === '' ? ' ' : markLine(line)}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {block.caption && (
        <p className="border-t border-border px-3 py-2 text-xs text-fg-muted">{block.caption}</p>
      )}
    </figure>
  );
}
