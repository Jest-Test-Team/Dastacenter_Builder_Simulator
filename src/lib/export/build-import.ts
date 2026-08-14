/**
 * Import a build from a previously exported JSON file.
 * Validates the file format and wallet ownership.
 */

import type { BuildSnapshot } from '@/lib/store/build-store';
import type { BuildExportPayload } from './build-export';

export interface ImportResult {
  success: boolean;
  snapshot?: BuildSnapshot;
  error?: string;
  walletMismatch?: boolean;
  exportedWallet?: string;
}

export async function importBuildFromFile(
  file: File,
  currentWalletAddress?: string,
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as Partial<BuildExportPayload> & Partial<BuildSnapshot>;

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid file format. Missing required fields.' };
    }

    // Two shapes are accepted:
    //  1. The wrapped export envelope from "Download your works":
    //     { version, wallet, build: BuildSnapshot }.
    //  2. A bare BuildSnapshot — what /demos/templates/[file] serves, so a demo
    //     template downloaded from the app re-imports without being rejected.
    let snapshot: BuildSnapshot | undefined;
    let exportedWallet: string | undefined;

    if (data.build) {
      snapshot = data.build;
      exportedWallet = data.wallet?.address;
    } else if (data.buildId && data.voxels) {
      snapshot = data as BuildSnapshot;
    }

    // Validate the snapshot we landed on, whichever shape it came from.
    if (!snapshot || !snapshot.buildId || !snapshot.voxels) {
      return {
        success: false,
        error: 'Invalid build data. Missing buildId or voxels.',
      };
    }

    // Check wallet match (warning only, not blocking). A demo template carries
    // no wallet, so there is nothing to mismatch against.
    const walletMismatch =
      currentWalletAddress && exportedWallet
        ? exportedWallet.toLowerCase() !== currentWalletAddress.toLowerCase()
        : undefined;

    return {
      success: true,
      snapshot,
      walletMismatch,
      exportedWallet,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse file',
    };
  }
}

export function createFileInput(
  onFileSelected: (file: File) => void,
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.display = 'none';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onFileSelected(file);
    input.remove();
  };
  document.body.appendChild(input);
  return input;
}
