"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useConnect, useConnectors, useConnection } from "wagmi";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/components/ui/useBodyScrollLock";
import type { Connector } from "wagmi";

const WalletModalCtx = createContext<{ open: () => void }>({ open: () => {} });

export function useWalletModal() {
  return useContext(WalletModalCtx);
}

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <WalletModalCtx.Provider value={value}>
      {children}
      {open ? <ConnectWalletModal onClose={() => setOpen(false)} /> : null}
    </WalletModalCtx.Provider>
  );
}

function connectorLabel(c: Connector) {
  return c.name?.trim() || "Wallet";
}

function ConnectWalletModal({ onClose }: { onClose: () => void }) {
  const connectors = useConnectors();
  const { isConnected } = useConnection();
  const { connect, isPending, error, reset } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  // A connector can resolve without firing onSuccess (e.g. eager reconnect) -
  // close whenever the app ends up connected while the modal is up.
  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  // Only wallets the user actually has: EIP-6963 discovery reports installed
  // browser wallets with real names/icons. Drop the generic "Injected" shim
  // and dedupe by display name (config + discovery can both surface one).
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: Connector[] = [];
    for (const c of connectors) {
      const name = connectorLabel(c);
      if (name === "Injected" || seen.has(name)) continue;
      seen.add(name);
      out.push(c);
    }
    return out;
  }, [connectors]);

  const pick = (c: Connector) => {
    reset();
    setPendingId(c.id);
    connect(
      { connector: c },
      {
        onSuccess: () => onClose(),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close connect wallet"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        tabIndex={-1}
        className="relative z-10 flex max-h-[min(540px,85vh)] w-full max-w-sm flex-col rounded-2xl border border-line bg-surface-3 p-6 outline-none shadow-2xl shadow-black/50"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill hover:text-fg"
        >
          <X size={16} strokeWidth={1.7} />
        </button>

        <div className="flex flex-col items-center gap-3 pb-6 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nexa-logo.png" alt="Nexa" className="h-7 w-auto" />
          <p className="text-sm text-dim">Connect wallet</p>
        </div>

        {rows.length === 0 ? (
          <p className="pb-2 text-center text-sm text-dim">
            No wallets found. Install a browser wallet extension, then reload.
          </p>
        ) : (
          <div className="-mx-1 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-1 pb-1">
            {rows.map((c) => {
              const name = connectorLabel(c);
              const detected = c.type === "injected";
              const busy = isPending && pendingId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-fill px-4 py-3.5 text-left transition-colors hover:border-line-strong disabled:opacity-60"
                >
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.icon} alt="" className="h-7 w-7 shrink-0 rounded-md" />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-4 text-xs font-semibold text-dim"
                      aria-hidden
                    >
                      {name.slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-sm font-semibold text-fg">{name}</span>
                  {busy ? (
                    <span className="shrink-0 text-xs text-dim">Connecting…</span>
                  ) : detected ? (
                    <span className="shrink-0 text-xs text-dim">Detected</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {error ? (
          <p className="mt-4 text-center text-sm text-down">
            {error.message.split("\n")[0]?.slice(0, 140) || "Connection failed."}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
