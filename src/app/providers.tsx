/**
 * Root providers.
 * Wraps the app with wagmi, react-query, and the Solana wallet adapter.
 */

'use client';

import { ReactNode, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wallet/wagmi';
import { useSettings } from '@/lib/persist';
import { useBlockPlugins } from '@/lib/plugins/block-plugins';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = useSettings((s) => s.hydrate);
  const hydratePlugins = useBlockPlugins((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
    void hydratePlugins();
  }, [hydrate, hydratePlugins]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
