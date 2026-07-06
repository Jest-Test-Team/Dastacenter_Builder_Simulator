/**
 * Mode bar — top of builder: build/sim/inspect modes, undo/redo, export, finish.
 */

'use client';

import { useState } from 'react';
import { useBuildStore, useBuildHistory } from '@/lib/store/build-store';
import { downloadBuildJson } from '@/lib/export/build-export';
import { importBuildFromFile, createFileInput } from '@/lib/export/build-import';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  Undo2,
  Redo2,
  Award,
  Trash2,
  PlayCircle,
  FlaskConical,
  Download,
  Upload,
  Snowflake,
  Flame,
} from 'lucide-react';
import { cn, shortAddress } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

export function ModeBar() {
  const router = useRouter();
  const mode = useBuildStore((s) => s.mode);
  const visualMode = useBuildStore((s) => s.visualMode);
  const setMode = useBuildStore((s) => s.setMode);
  const setVisualMode = useBuildStore((s) => s.setVisualMode);
  const clearAll = useBuildStore((s) => s.clearAll);
  const loadBuild = useBuildStore((s) => s.loadBuild);
  const buildId = useBuildStore((s) => s.buildId);
  const { pastCount, futureCount, undo, redo } = useBuildHistory();
  const { address, isConnected, chain } = useAccount();
  const t = useT();
  const [importing, setImporting] = useState(false);

  function handleDownloadWorks() {
    if (!address) return;
    downloadBuildJson({
      snapshot: useBuildStore.getState().exportSnapshot(),
      walletAddress: address,
      chainId: chain?.id,
      chainName: chain?.name,
    });
  }

  function handleImportWorks() {
    if (!address) return;
    setImporting(true);

    const input = createFileInput(async (file) => {
      const result = await importBuildFromFile(file, address);

      if (!result.success) {
        alert(`${t('builder.import.error')}: ${result.error}`);
        setImporting(false);
        return;
      }

      if (result.walletMismatch) {
        const confirmed = confirm(
          t('builder.import.walletMismatch').replace(
            '{wallet}',
            shortAddress(result.exportedWallet ?? ''),
          ),
        );
        if (!confirmed) {
          setImporting(false);
          return;
        }
      }

      if (result.snapshot) {
        loadBuild(result.snapshot);
        alert(t('builder.import.success'));
      }

      setImporting(false);
    });

    input.click();
  }

  return (
    <div className="panel z-30 flex flex-col gap-2 border-b px-3 py-2 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <ModeButton
          active={mode === 'build'}
          onClick={() => setMode('build')}
          icon={<PlayCircle className="h-4 w-4" />}
          label={t('builder.mode.build')}
        />
        <ModeButton
          active={mode === 'sim'}
          onClick={() => router.push(`/sim/${buildId}`)}
          icon={<FlaskConical className="h-4 w-4" />}
          label={t('builder.mode.simulate')}
        />
        <ModeButton
          active={mode === 'inspect'}
          onClick={() => setMode('inspect')}
          icon={<Award className="h-4 w-4" />}
          label={t('builder.mode.inspect')}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <ModeButton
          active={visualMode === 'thermal'}
          onClick={() => setVisualMode(visualMode === 'thermal' ? 'standard' : 'thermal')}
          icon={visualMode === 'thermal' ? <Flame className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
          label={visualMode === 'thermal' ? 'Thermal View' : 'Thermal Off'}
        />
      </div>

      <div className="mx-1 hidden h-6 w-px bg-border lg:block" />

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <IconButton onClick={undo} disabled={pastCount === 0} title={t('builder.undo')}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={redo} disabled={futureCount === 0} title={t('builder.redo')}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-border lg:block" />

      <div className="hidden flex-1 lg:block" />

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:ml-auto">
        <WalletPicker />

        <button
          onClick={handleImportWorks}
          disabled={!isConnected || importing}
          title={!isConnected ? t('builder.import.hint') : undefined}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing...' : t('builder.import')}
        </button>

        <button
          onClick={handleDownloadWorks}
          disabled={!isConnected}
          title={!isConnected ? t('builder.export.hint') : undefined}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {t('sim.downloadWorks')}
        </button>

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

        <button onClick={() => router.push(`/result/${buildId}`)} className="btn">
          <Award className="h-4 w-4" />
          {t('builder.finish')}
        </button>
      </div>
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
    <button onClick={onClick} disabled={disabled} title={title} className="icon-btn">
      {children}
    </button>
  );
}
