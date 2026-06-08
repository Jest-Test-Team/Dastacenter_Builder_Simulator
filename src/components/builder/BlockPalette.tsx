/**
 * Block palette — the side panel listing every block the user can place.
 */

'use client';

import { useState } from 'react';
import { useBuildStore } from '@/lib/store/build-store';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getBlocksByCategory,
  type BlockCategory,
  type BlockDef,
} from '@/lib/blocks';
import { useBlockPlugins } from '@/lib/plugins/block-plugins';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { useBlockLabel } from '@/lib/i18n/blocks';

export function BlockPalette({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const mobileSheet = (
    <div
      className={cn(
        'fixed inset-x-2 bottom-2 z-40 hidden max-h-[72dvh] flex-col overflow-hidden rounded-2xl border bg-bg-panel/98 shadow-2xl md:hidden',
        mobileOpen && 'flex',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={useT()('builder.palette.title')}
    >
      <div className="flex items-center justify-between border-b p-3">
        <div>
          <h2 className="text-sm font-semibold">{useT()('builder.palette.title')}</h2>
          <p className="text-xs text-fg-muted">{useT()('builder.palette.hint')}</p>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label={useT()('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <PaletteBody compact />
    </div>
  );

  return (
    <>
      <aside className="panel hidden h-full w-72 flex-col border-r md:flex">
        <PaletteBody />
      </aside>
      <div
        className={cn('fixed inset-0 z-30 bg-black/40 md:hidden', mobileOpen ? 'block' : 'hidden')}
        onClick={onClose}
      />
      {mobileSheet}
    </>
  );
}

function PaletteBody({ compact = false }: { compact?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('power');
  const [query, setQuery] = useState('');
  const t = useT();
  const labels = useBlockLabel();
  const pluginRevision = useBlockPlugins((state) => state.revision);

  const blocks = (() => {
    void pluginRevision;
    const all = getBlocksByCategory(activeCategory);
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((b) => {
      const lbl = labels.block(b);
      return (
        b.id.toLowerCase().includes(q) ||
        lbl.displayName.toLowerCase().includes(q) ||
        lbl.description.toLowerCase().includes(q) ||
        b.tags.some((tt) => tt.toLowerCase().includes(q))
      );
    });
  })();

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', compact ? 'p-2' : '')}>
      <div className={compact ? 'border-b py-2' : 'border-b p-2'}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            className="input pl-8 pr-8"
            placeholder={t('builder.palette.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b p-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              activeCategory === cat
                ? 'bg-primary text-primary-fg'
                : 'bg-bg-subtle text-fg-muted hover:text-fg',
            )}
          >
            {labels.category(cat, CATEGORY_LABELS[cat])}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="p-4 text-center text-sm text-fg-muted">{t('builder.palette.empty')}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {blocks.map((b) => (
              <PaletteItem key={b.id} block={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PaletteItem({ block }: { block: BlockDef }) {
  const activeType = useBuildStore((s) => s.activeBlockType);
  const setActive = useBuildStore((s) => s.setActiveBlockType);
  const inventory = useBuildStore((s) => s.inventory[block.id] ?? 0);
  const t = useT();
  const labels = useBlockLabel();
  const lbl = labels.block(block);

  const isActive = activeType === block.id;
  const outOfStock = inventory <= 0 && !block.decorative;

  return (
    <li>
      <button
        onClick={() => setActive(isActive ? null : block.id)}
        disabled={outOfStock}
        className={cn(
          'group flex w-full flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors',
          'hover:border-primary/50',
          isActive && 'border-primary bg-primary/10',
          outOfStock && 'cursor-not-allowed opacity-50',
        )}
        title={lbl.description}
      >
        <div
          className="flex h-12 w-full items-center justify-center rounded text-2xl"
          style={{ backgroundColor: block.color + '40', color: block.color }}
        >
          {block.icon}
        </div>
        <div className="w-full truncate text-xs font-medium">{lbl.displayName}</div>
        <div className="w-full truncate text-[10px] text-fg-muted">
          {outOfStock ? t('builder.palette.outOfStock') : `×${inventory}`}
        </div>
      </button>
    </li>
  );
}
