'use client';

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCw, Trash2, X } from 'lucide-react';
import { getBlock } from '@/lib/blocks';
import { useBuildStore } from '@/lib/store/build-store';

export function ObjectInspector() {
  const selectedId = useBuildStore((state) => state.selectedInstanceId);
  const instance = useBuildStore((state) => selectedId ? state.voxels[selectedId] : undefined);
  const setSelected = useBuildStore((state) => state.setSelected);
  const moveBlock = useBuildStore((state) => state.moveBlock);
  const rotateBlock = useBuildStore((state) => state.rotateBlock);
  const removeBlock = useBuildStore((state) => state.removeBlock);
  if (!selectedId || !instance) return null;
  const definition = getBlock(instance.type);
  const move = (dx: number, dz: number) => moveBlock(selectedId, { ...instance.position, x: instance.position.x + dx, z: instance.position.z + dz });

  return (
    <section className="panel absolute bottom-20 right-3 z-20 w-64 border-primary/30 bg-bg-panel/95 p-3 shadow-2xl" aria-label="Selected object controls">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Selected object</p>
          <h2 className="truncate text-sm font-semibold">{definition?.displayName ?? instance.type}</h2>
          <p className="font-mono text-[10px] text-fg-muted">x {instance.position.x} · y {instance.position.y} · z {instance.position.z} · {instance.rotation * 90}°</p>
        </div>
        <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close selected object controls"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <div className="grid grid-cols-3 gap-1" aria-label="Move selected object">
          <span /><button className="icon-btn" onClick={() => move(0, -1)} aria-label="Move forward"><ArrowUp className="h-4 w-4" /></button><span />
          <button className="icon-btn" onClick={() => move(-1, 0)} aria-label="Move left"><ArrowLeft className="h-4 w-4" /></button>
          <button className="icon-btn" onClick={() => move(0, 1)} aria-label="Move backward"><ArrowDown className="h-4 w-4" /></button>
          <button className="icon-btn" onClick={() => move(1, 0)} aria-label="Move right"><ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-1 border-l border-border pl-3">
          <button className="icon-btn" onClick={() => rotateBlock(selectedId)} aria-label="Rotate selected object"><RotateCw className="h-4 w-4" /></button>
          <button className="icon-btn text-danger" onClick={() => removeBlock(selectedId)} aria-label="Delete selected object"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-fg-muted">Move, rotate, or remove the selected scene object.</p>
    </section>
  );
}
