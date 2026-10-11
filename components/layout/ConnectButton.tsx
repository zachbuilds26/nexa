"use client";

import {
  useConnect,
  useConnectors,
  useConnection,
  useDisconnect,
} from "wagmi";
import { Loader2, WalletCards } from "lucide-react";
import { useState } from "react";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const CONNECT_TIMEOUT_MS = 15000;

export function ConnectButton() {
  const { address, isConnected, status } = useConnection();
  const { mutateAsync: connect, isPending, reset } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const connectors = useConnectors();
  const [open, setOpen] = useState(false);

  async function handleConnect() {
    const target = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!target) return;
    reset();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        connect({ connector: target }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Timed out")), CONNECT_TIMEOUT_MS);
        }),
      ]);
    } catch {
      // rejected or timed out — button returns to idle
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const noConnector = connectors.length === 0;

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={isPending || status === "reconnecting" || noConnector}
        title={noConnector ? "No browser wallet detected. Install a wallet extension." : undefined}
        onClick={handleConnect}
        className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-ink scanlines transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending || status === "reconnecting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
            Connecting…
          </>
        ) : noConnector ? (
          "No wallet detected"
        ) : (
          "Connect"
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-accent transition-colors hover:bg-fill"
      >
        <WalletCards className="h-4 w-4" strokeWidth={1.7} />
        <span className="tnum font-medium">{address ? short(address) : ""}</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-surface-1/95 py-2 text-sm shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
              Wallet
            </div>
            <button
              type="button"
              onClick={() => {
                if (address) void navigator.clipboard.writeText(address);
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-dim transition-colors hover:bg-fill hover:text-accent"
            >
              Copy address
            </button>
            <a
              href={`https://bscscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-dim transition-colors hover:bg-fill hover:text-accent"
            >
              View on BscScan
            </a>
            <div className="my-1.5 border-t border-line" />
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-dim transition-colors hover:bg-fill hover:text-down"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
