/**
 * Block palette — the side panel listing every block the user can place.
 */

'use client';

import { useMemo, useState } from 'react';
import { useBuildStore } from '@/lib/store/build-store';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getBlocksByCategory,
  isValidBlockType,
  type BlockCategory,
  type BlockDef,
} from '@/lib/blocks';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { useBlockLabel } from '@/lib/i18n/blocks';

export function BlockPalette() {
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('power');
  const [query, setQuery] = useState('');
  const t = useT();
  const labels = useBlockLabel();

  const blocks = useMemo(() => {
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
  }, [activeCategory, query, labels]);

  return (
    <aside className="panel flex h-full w-72 flex-col border-r">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">{t('builder.palette.title')}</h2>
        <p className="text-xs text-fg-muted">{t('builder.palette.hint')}</p>
      </div>

      <div className="border-b p-2">
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

      <div className="flex-1 overflow-y-auto p-2">
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
    </aside>
  );
}

function PaletteItem({ block }: { block: BlockDef }) {
  const activeType = useBuildStore((s) => s.activeBlockType);
  const setActive = useBuildStore((s) => s.setActiveBlockType);
  const inventory = useBuildStore((s) => s.inventory[block.id] ?? 0);

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
        title={block.description}
      >
        <div
          className="flex h-12 w-full items-center justify-center rounded text-2xl"
          style={{ backgroundColor: block.color + '40', color: block.color }}
        >
          {block.icon}
        </div>
        <div className="w-full truncate text-xs font-medium">{block.displayName}</div>
        <div className="w-full truncate text-[10px] text-fg-muted">
          {outOfStock ? 'Out of stock' : `×${inventory}`}
        </div>
      </button>
    </li>
  );
}
