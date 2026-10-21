import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { bsc } from "wagmi/chains";

// WalletConnect needs a projectId from cloud.walletconnect.com; without it the
// connector is simply omitted from the connect modal (the row would error on
// click otherwise). Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable it.
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// No forced MetaMask/Coinbase rows: the connect modal lists only wallets the
// user actually has. Installed browser wallets surface through EIP-6963
// discovery; the bare `injected` connector is the generic fallback shim.
export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected({ shimDisconnect: false }),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
  ],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC ?? "https://bsc.publicnode.com"),
  },
  ssr: true,
});
