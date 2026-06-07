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
    const data = JSON.parse(text) as BuildExportPayload;

    // Validate structure
    if (!data.version || !data.wallet || !data.build) {
      return {
        success: false,
        error: 'Invalid file format. Missing required fields.',
      };
    }

    // Validate build snapshot structure
    if (!data.build.buildId || !data.build.voxels) {
      return {
        success: false,
        error: 'Invalid build data. Missing buildId or voxels.',
      };
    }

    // Check wallet match (warning only, not blocking)
    const walletMismatch = currentWalletAddress
      ? data.wallet.address.toLowerCase() !== currentWalletAddress.toLowerCase()
      : undefined;

    return {
      success: true,
      snapshot: data.build,
      walletMismatch,
      exportedWallet: data.wallet.address,
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
