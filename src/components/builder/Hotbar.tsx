/**
 * Hotbar — quick-swap slots 1-9. Bottom of the screen.
 */

'use client';

import { useEffect, useState } from 'react';
import { useBuildStore } from '@/lib/store/build-store';
import { getBlock, isValidBlockType } from '@/lib/blocks';
import { cn } from '@/lib/utils';

const HOTBAR_SIZE = 9;

export function Hotbar() {
  const [slots, setSlots] = useState<string[]>(Array(HOTBAR_SIZE).fill(''));
  const activeType = useBuildStore((s) => s.activeBlockType);
  const setActiveType = useBuildStore((s) => s.setActiveBlockType);
  const inventory = useBuildStore((s) => s.inventory);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        const slot = slots[idx];
        if (slot) setActiveType(activeType === slot ? null : slot);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slots, activeType, setActiveType]);

  // Allow user to "pick up" a block from palette to hotbar via right-click
  useEffect(() => {
    if (activeType && !slots.includes(activeType)) {
      const next = [...slots];
      const firstEmpty = next.findIndex((s) => !s);
      if (firstEmpty >= 0) {
        next[firstEmpty] = activeType;
        setSlots(next);
      }
    }
  }, [activeType, slots]);

  return (
    <div className="pointer-events-auto panel flex items-center gap-1 rounded-lg p-1 shadow-2xl">
      {slots.map((slot, idx) => {
        if (!slot || !isValidBlockType(slot)) {
          return (
            <div
              key={idx}
              className="flex h-14 w-14 flex-col items-center justify-center rounded border border-dashed border-border/50 text-fg-muted"
            >
              <span className="text-[10px]">{idx + 1}</span>
            </div>
          );
        }
        const def = getBlock(slot);
        if (!def) return null;
        const count = inventory[slot] ?? 0;
        const isActive = activeType === slot;
        return (
          <button
            key={idx}
            onClick={() => setActiveType(isActive ? null : slot)}
            className={cn(
              'group relative flex h-14 w-14 flex-col items-center justify-center rounded border-2 transition-all',
              isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
              count <= 0 && 'opacity-50',
            )}
            title={def.displayName}
          >
            <span className="text-xl" style={{ color: def.color }}>
              {def.icon}
            </span>
            <span className="absolute bottom-0.5 right-1 rounded bg-bg/70 px-1 text-[9px] font-mono">
              {count}
            </span>
            <span className="absolute left-0.5 top-0.5 text-[9px] text-fg-muted">{idx + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
