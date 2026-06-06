/**
 * Block-aware i18n. Translates the registry's `displayName`,
 * `description`, and `CATEGORY_LABELS` to the active locale.
 *
 * Block ids remain English (snake_case), but the user-facing name and
 * description come from the message bundles via `block.name.<id>` and
 * `block.desc.<id>`.
 */

'use client';

import { useT } from '@/lib/i18n/client';
import type { BlockCategory, BlockDef } from '@/lib/blocks/types';

export function useBlockLabel() {
  const t = useT();
  return {
    name: (id: string, fallback?: string) => t(`block.name.${id}`) !== `block.name.${id}` ? t(`block.name.${id}`) : (fallback ?? id),
    desc: (id: string, fallback?: string) => t(`block.desc.${id}`) !== `block.desc.${id}` ? t(`block.desc.${id}`) : (fallback ?? ''),
    category: (cat: BlockCategory, fallback: string) => {
      const v = t(`block.category.${cat}`);
      return v !== `block.category.${cat}` ? v : fallback;
    },
    block: (b: BlockDef) => {
      const n = t(`block.name.${b.id}`);
      const d = t(`block.desc.${b.id}`);
      return {
        displayName: n !== `block.name.${b.id}` ? n : b.displayName,
        description: d !== `block.desc.${b.id}` ? d : b.description,
      };
    },
  };
}
