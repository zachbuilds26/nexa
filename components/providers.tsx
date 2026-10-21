"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { WalletModalProvider } from "@/components/wallet/WalletModal";

export function Providers({ children }: { children: React.ReactNode }) {
  // App-wide defaults: polling intervals already provide freshness, so a
  // focus-refetch would just re-fire every mounted query at once on each
  // tab focus. retry:1 keeps a rate-limited upstream from being hammered.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
