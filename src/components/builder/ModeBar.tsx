/**
 * Mode bar — top of builder: build/sim/inspect modes, undo/redo, save, finish.
 */

'use client';

import { useBuildStore, useBuildHistory } from '@/lib/store/build-store';
import { useSaveBuild } from '@/lib/persist';
import { useRouter } from 'next/navigation';
import { Undo2, Redo2, Save, Award, Trash2, PlayCircle, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

export function ModeBar() {
  const router = useRouter();
  const mode = useBuildStore((s) => s.mode);
  const setMode = useBuildStore((s) => s.setMode);
  const clearAll = useBuildStore((s) => s.clearAll);
  const buildId = useBuildStore((s) => s.buildId);
  const save = useSaveBuild();
  const { pastCount, futureCount, undo, redo } = useBuildHistory();
  const t = useT();

  async function navigateAfterSave(path: string) {
    await save();
    router.push(path);
  }

  async function handleFinish() {
    const state = useBuildStore.getState();
    await navigateAfterSave(`/result/${state.buildId}`);
  }

  return (
    <div className="panel flex items-center gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-1">
        <ModeButton active={mode === 'build'} onClick={() => setMode('build')} icon={<PlayCircle className="h-4 w-4" />} label={t('builder.mode.build')} />
        <ModeButton active={mode === 'sim'} onClick={() => void navigateAfterSave(`/sim/${buildId}`)} icon={<FlaskConical className="h-4 w-4" />} label={t('builder.mode.simulate')} />
        <ModeButton active={mode === 'inspect'} onClick={() => setMode('inspect')} icon={<Award className="h-4 w-4" />} label={t('builder.mode.inspect')} />
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <IconButton onClick={undo} disabled={pastCount === 0} title={t('builder.undo')}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={redo} disabled={futureCount === 0} title={t('builder.redo')}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex-1" />

      <button
        onClick={() => {
          if (confirm(t('builder.clear.confirm'))) clearAll();
        }}
        className="btn-ghost"
        title={t('builder.clear')}
      >
        <Trash2 className="h-4 w-4" />
        {t('builder.clear')}
      </button>

      <button onClick={save} className="btn-ghost" title={t('builder.save')}>
        <Save className="h-4 w-4" />
        {t('builder.save')}
      </button>

      <button onClick={() => void handleFinish()} className="btn">
        <Award className="h-4 w-4" />
        {t('builder.finish')}
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
