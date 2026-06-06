/**
 * Mode bar — top of builder: build/sim/inspect modes, undo/redo, save, finish.
 */

'use client';

import { useBuildStore, useBuildHistory } from '@/lib/store/build-store';
import { useSaveBuild } from '@/lib/persist';
import { score } from '@/lib/scoring';
import { useRouter } from 'next/navigation';
import { Undo2, Redo2, Save, Award, Trash2, PlayCircle, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModeBar() {
  const router = useRouter();
  const mode = useBuildStore((s) => s.mode);
  const setMode = useBuildStore((s) => s.setMode);
  const clearAll = useBuildStore((s) => s.clearAll);
  const buildId = useBuildStore((s) => s.buildId);
  const save = useSaveBuild();
  const { pastCount, futureCount, undo, redo } = useBuildHistory();

  function handleFinish() {
    const state = useBuildStore.getState();
    const report = score(state);
    save();
    router.push(`/result/${state.buildId}`);
  }

  return (
    <div className="panel flex items-center gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-1">
        <ModeButton active={mode === 'build'} onClick={() => setMode('build')} icon={<PlayCircle className="h-4 w-4" />} label="Build" />
        <ModeButton active={mode === 'sim'} onClick={() => router.push(`/sim/${buildId}`)} icon={<FlaskConical className="h-4 w-4" />} label="Simulate" />
        <ModeButton active={mode === 'inspect'} onClick={() => setMode('inspect')} icon={<Award className="h-4 w-4" />} label="Inspect" />
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconButton onClick={undo} disabled={pastCount === 0} title="Undo (Cmd+Z)">
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={redo} disabled={futureCount === 0} title="Redo (Cmd+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex-1" />

      <button
        onClick={() => {
          if (confirm('Clear the entire build? This can be undone.')) clearAll();
        }}
        className="btn-ghost"
        title="Clear all"
      >
        <Trash2 className="h-4 w-4" />
        Clear
      </button>

      <button onClick={save} className="btn-ghost" title="Save (auto-saves too)">
        <Save className="h-4 w-4" />
        Save
      </button>

      <button onClick={handleFinish} className="btn">
        <Award className="h-4 w-4" />
        Finish & Rate
      </button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="icon-btn"
    >
      {children}
    </button>
  );
}
