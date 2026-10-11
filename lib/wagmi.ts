import { createConfig, http, injected } from "wagmi";
import { bsc } from "wagmi/chains";

export const config = createConfig({
  chains: [bsc],
  connectors: [injected({ shimDisconnect: false })],
  transports: {
    [bsc.id]: http("https://bsc.publicnode.com"),
  },
  ssr: true,
});
