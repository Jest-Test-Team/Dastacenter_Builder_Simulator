/**
 * Export a build snapshot as a downloadable JSON file.
 * Includes wallet metadata when the user is connected.
 */

import type { BuildSnapshot } from '@/lib/store/build-store';

export interface BuildExportPayload {
  version: 1;
  exportedAt: string;
  wallet: {
    address: string;
    chainId?: number;
    chainName?: string;
  };
  build: BuildSnapshot;
}

export function downloadBuildJson(options: {
  snapshot: BuildSnapshot;
  walletAddress: string;
  chainId?: number;
  chainName?: string;
  filename?: string;
}): void {
  const payload: BuildExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    wallet: {
      address: options.walletAddress,
      chainId: options.chainId,
      chainName: options.chainName,
    },
    build: options.snapshot,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    options.filename ??
    `datacenter-builder-${options.snapshot.buildId.slice(0, 8)}-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
