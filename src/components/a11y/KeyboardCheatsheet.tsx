/**
 * Keyboard shortcut handler. Press `?` to show a cheatsheet.
 * Also binds Esc/Enter inside any open dialog.
 */

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Binding {
  keys: string[];
  label: string;
  description: string;
}

const BINDINGS: Binding[] = [
  { keys: ['1-9'], label: 'Hotbar', description: 'Switch to hotbar slot 1–9' },
  { keys: ['R'], label: 'Rotate', description: 'Rotate the held block 90°' },
  { keys: ['Esc'], label: 'Cancel', description: 'Cancel placement / close panel' },
  { keys: ['Shift+Z'], label: 'Undo', description: 'Undo the last placement' },
  { keys: ['Shift+Y'], label: 'Redo', description: 'Redo the last undo' },
  { keys: ['Ctrl+S'], label: 'Save', description: 'Force a save to IndexedDB' },
  { keys: ['?'], label: 'Help', description: 'Show this cheatsheet' },
  { keys: ['I'], label: 'Inspect', description: 'Toggle inspect mode' },
  { keys: ['B'], label: 'Build', description: 'Switch to build mode' },
];

export function KeyboardCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only trigger on plain `?` not in an input
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheatsheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => setOpen(false)}
    >
      <div className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="cheatsheet-title" className="font-semibold">
            Keyboard shortcuts
          </h2>
          <button onClick={() => setOpen(false)} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {BINDINGS.map((b) => (
              <tr key={b.label} className="border-b border-border last:border-0">
                <td className="py-1 pr-3 font-mono text-xs">
                  {b.keys.map((k) => (
                    <kbd
                      key={k}
                      className="mr-1 rounded border border-border bg-bg-subtle px-1.5 py-0.5"
                    >
                      {k}
                    </kbd>
                  ))}
                </td>
                <td className="py-1 font-medium">{b.label}</td>
                <td className="py-1 text-fg-muted">{b.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
