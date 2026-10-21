"use client";

import { useConnection, useDisconnect } from "wagmi";
import { Copy, ExternalLink, LogOut } from "lucide-react";
import { WalletFilled } from "@/components/ui/WalletFilled";
import { useState } from "react";
import { useWalletModal } from "@/components/wallet/WalletModal";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { address, isConnected } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const { open: openWalletModal } = useWalletModal();

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={openWalletModal}
        className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-2.5 text-sm font-semibold text-ink scanlines transition-colors hover:bg-accent-hover sm:gap-2 sm:px-4"
      >
        <WalletFilled className="h-5 w-5" />
        Connect
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-accent transition-colors hover:bg-fill"
      >
        <WalletFilled className="h-5 w-5" />
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
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-surface-3 py-2 text-sm shadow-2xl shadow-black/40">
            <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
              Wallet
            </div>
            <button
              type="button"
              onClick={() => {
                if (address) void navigator.clipboard.writeText(address);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-dim transition-colors hover:bg-fill hover:text-accent"
            >
              <Copy className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              Copy address
            </button>
            <a
              href={`https://bscscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-dim transition-colors hover:bg-fill hover:text-accent"
            >
              <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              View on BscScan
            </a>
            <div className="my-1.5 border-t border-line" />
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-dim transition-colors hover:bg-fill hover:text-down"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              Disconnect
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
