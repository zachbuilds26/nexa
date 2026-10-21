"use client";

import { Check, Coins, ExternalLink, History, RefreshCw, Search, Settings, Waypoints, X } from "lucide-react";
import { DropArrow } from "@/components/ui/DropArrow";
import { TipLabel } from "@/components/ui/InfoTip";
import { WalletFilled } from "@/components/ui/WalletFilled";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useConnection,
  useReadContracts,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountPill } from "@/components/ui/AmountPill";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBodyScrollLock } from "@/components/ui/useBodyScrollLock";
import { useSheetDrag } from "@/components/ui/useSheetDrag";
import { TokenSelectModal } from "./TokenSelectModal";
import { TradeSettingsPanel } from "./TradeSettingsPanel";
import { ActivityPanel } from "./ActivityPanel";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { logSwap } from "@/lib/swapActivity";
import { ERC20_ABI, PAY_TOKENS } from "@/lib/erc20";
import {
  formatUnits,
  fmtNumTrim,
  fmtUsd,
  minReceived,
  parseAmountToUnits,
  unitsToNumber,
} from "@/lib/format";
import { fetchBnbUsdPrice } from "@/lib/native";
import type { Stock } from "@/lib/rwa";
import { fetchBnSwap } from "@/lib/binanceTrade";
import {
  autoSlippagePct,
  loadTradeSettings,
  saveTradeSettings,
  type TradeSettings,
} from "@/lib/tradeSettings";
import { useDynamic, useUniverse } from "@/hooks/useRwa";
import { useQuote, QUOTE_TTL_S } from "@/hooks/useQuote";

const isAddr = (v: string | null | undefined) => !!v && /^0x[0-9a-f]{40}$/i.test(v);

// A malformed upstream amount string must never crash the swap card in
// render (BigInt throws on non-integer strings).
function safeUnits(v: string | undefined): bigint {
  try {
    return v ? BigInt(v) : 0n;
  } catch {
    return 0n;
  }
}
const isPayParam = (v: string | null | undefined) =>
  !!v && PAY_TOKENS.some((t) => t.symbol === v.toUpperCase());

const VENDOR_LOGOS: Record<string, string> = {
  liquidmesh: "/venues/liquidmesh-icon.svg",
};

/** Second-line names for the pay tokens (shown under the symbol). */
const PAY_NAMES: Record<string, string> = {
  USDT: "Tether USD",
  USDC: "USD Coin",
  U: "United Stables",
  USD1: "World Liberty Financial USD",
  WBNB: "Wrapped BNB",
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

/**
 * Countdown for the live quote: a circular arrow whose tail sweeps down as
 * the 30s TTL runs out, seconds remaining printed inside the ring. Sits in
 * the "Quote expires" row of Route details.
 */
function QuoteTimer({ secondsLeft, expired }: { secondsLeft: number | null; expired: boolean }) {
  const ttl = QUOTE_TTL_S;
  const left = expired ? 0 : Math.max(0, Math.min(ttl, secondsLeft ?? ttl));
  const frac = left / ttl;
  const R = 8.4;
  const C = 2 * Math.PI * R;
  const gap = Math.min(3, C * frac * 0.5);
  const dash = Math.max(0, C * frac - gap);
  const tipFrac = dash / C;
  const theta = (-90 + 360 * tipFrac) * (Math.PI / 180);
  const tipX = 12 + R * Math.cos(theta);
  const tipY = 12 + R * Math.sin(theta);
  const tipRot = -90 + 360 * tipFrac + 90;
  const showArc = dash > 0.4;
  return (
    <span
      data-quote-timer
      aria-hidden="true"
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full">
        <circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-dim opacity-25"
        />
        {showArc ? (
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            transform="rotate(-90 12 12)"
            className={expired ? "text-down" : "text-accent"}
          />
        ) : null}
        {showArc ? (
          <path
            d="M -3.1 -2.3 L 2.2 0 L -3.1 2.3 Z"
            transform={`translate(${tipX} ${tipY}) rotate(${tipRot})`}
            className={expired ? "fill-down" : "fill-accent"}
          />
        ) : null}
      </svg>
      <span className={`tnum relative text-[8.5px] font-bold ${expired ? "text-down" : "text-accent"}`}>
        {secondsLeft !== null ? (expired ? 0 : secondsLeft) : "…"}
      </span>
    </span>
  );
}

function PayTokenPicker({
  paySymbol,
  onPick,
  disabled = false,
}: {
  paySymbol: string;
  onPick: (symbol: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const openedAtRef = useRef(0);
  // Absorb accidental double-clicks: the card opens under the cursor, so a
  // fast second click would otherwise land on a row and select it unseen.
  const shielded = () => Date.now() - openedAtRef.current < 400;
  const { address } = useConnection();
  const selected = PAY_TOKENS.find((t) => t.symbol === paySymbol) ?? PAY_TOKENS[0];
  const { dragY, dragging, handleProps } = useSheetDrag(() => setOpen(false));

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const balContracts = useMemo(
    () =>
      PAY_TOKENS.map((t) => ({
        address: t.address,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address ?? ZERO_ADDR] as const,
      })),
    [address],
  );
  const balRead = useReadContracts({
    contracts: balContracts,
    query: { enabled: open && Boolean(address), staleTime: 10_000 },
  });

  // WBNB's USD line needs the BNB oracle; same query key as the card's
  // estimate so React Query dedupes them.
  const bnbPriceQ = useQuery({
    queryKey: ["native-mark-bnb"],
    queryFn: fetchBnbUsdPrice,
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: open && Boolean(address),
  });

  const balUnits = (addr: string): bigint | null => {
    const i = PAY_TOKENS.findIndex((t) => t.address === addr);
    const r = i >= 0 ? balRead.data?.[i] : undefined;
    if (!r || r.status !== "success") return null;
    return r.result as bigint;
  };

  const balText = (addr: string) => {
    if (!address) return "0";
    if (balRead.isLoading) return "…";
    const units = balUnits(addr);
    if (units === null) return "–";
    const i = PAY_TOKENS.findIndex((t) => t.address === addr);
    return formatUnits(units, PAY_TOKENS[i]?.decimals ?? 18, 6);
  };

  const usdText = (addr: string) => {
    if (!address) return "$0";
    const units = balUnits(addr);
    if (units === null) return "-";
    const i = PAY_TOKENS.findIndex((t) => t.address === addr);
    const t = PAY_TOKENS[i];
    const v = unitsToNumber(units, t?.decimals ?? 18);
    if (v === 0) return "$0";
    const price = t?.symbol === "WBNB" ? bnbPriceQ.data ?? null : 1;
    if (price === null) return "-";
    return fmtUsd(v * price);
  };

  const s = q.trim().toLowerCase();
  const rows = PAY_TOKENS.filter(
    (t) => !s || t.symbol.toLowerCase().includes(s) || t.address.toLowerCase().includes(s),
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          openedAtRef.current = Date.now();
          setOpen(true);
        }}
        aria-label="Pick token to pay with"
        className="flex shrink-0 items-center gap-2 rounded-full bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TokenImage
          address={selected.address}
          src={selected.logo}
          symbol={selected.symbol}
          size={20}
        />
        {selected.symbol}
        <DropArrow />
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-ink/70"
            onClick={() => {
              if (!shielded()) setOpen(false);
            }}
            aria-hidden
          />
          {/* Same shell as the header search card: 412x540 flush under the
              header on desktop, full-height drawer on mobile. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select token to pay with"
            style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
            className={`fixed inset-x-0 bottom-0 top-16 z-[60] flex flex-col overflow-hidden rounded-t-2xl border-t border-line bg-surface-3 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-14 md:h-[540px] md:w-[412px] md:rounded-2xl md:border md:-translate-x-1/2 ${
              dragging ? "" : "transition-transform"
            }`}
          >
            <div
              {...handleProps}
              data-drag-handle
              className="flex cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing md:hidden"
            >
              <span className="h-1 w-8 rounded-full bg-line" aria-hidden />
            </div>
            <div className="px-3 pt-3 md:px-3.5 md:pt-3.5">
              <div className="flex h-11 items-center gap-2.5 rounded-xl bg-fill px-3.5 transition-shadow focus-within:ring-1 focus-within:ring-line-strong md:rounded-full">
                <Search size={16} strokeWidth={1.7} className="shrink-0 text-dim" aria-hidden />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search tokens"
                  placeholder="Search tokens"
                  className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
                />
                {q ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQ("")}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill-strong hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-1 text-xs font-medium text-dim">
                <Coins className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
                All tokens
              </p>
              {rows.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => {
                    if (shielded()) return;
                    onPick(t.symbol);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-fill"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <TokenImage
                      address={t.address}
                      src={t.logo}
                      symbol={t.symbol}
                      size={36}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">{t.symbol}</span>
                      <span className="block truncate text-xs text-dim">
                        {PAY_NAMES[t.symbol] ?? t.symbol}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 pl-3 text-right">
                    <span className="tnum block text-sm font-semibold text-fg">
                      {balText(t.address)}
                    </span>
                    <span className="tnum block text-xs text-dim">
                      {usdText(t.address)}
                    </span>
                  </span>
                </button>
              ))}
              {rows.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-dim">
                  No matches for &quot;<span className="tnum text-fg">{q.trim()}</span>&quot;.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function QuoteDots() {
  return (
    <span className="quote-dots inline-flex items-center gap-1" aria-label="Refreshing quote">
      <span className="h-1.5 w-1.5 rounded-full bg-dim" />
      <span className="h-1.5 w-1.5 rounded-full bg-dim" />
      <span className="h-1.5 w-1.5 rounded-full bg-dim" />
    </span>
  );
}

export function SwapCard({
  stock,
  deepLink,
  urlTouchedRef,
  onSelectStock,
  syncUrl = true,
}: {
  stock?: Stock;
  deepLink?: { input?: string; output?: string };
  urlTouchedRef: { current: boolean };
  onSelectStock: (s: Stock) => void;
  syncUrl?: boolean;
}) {
  const universeQ = useUniverse();
  const universe = universeQ.data;
  // No stock picked yet while the universe is still loading - show skeletons
  // instead of a fake "Pick token" flash.
  const stockLoading = !stock && (universeQ.isLoading || (!universe && !universeQ.isError));
  // Hydration gate: the header can warm the universe cache before this
  // boundary hydrates, which would flip the token pickers from skeleton
  // span to button during hydration (React hydration mismatch). Keep the
  // server markup until the client has taken over.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { address, isConnected } = useConnection();
  const { open: openWalletModal } = useWalletModal();

  // Deep link (?input=...&output=...) seeds initial state (category-standard).
  const [direction, setDirection] = useState<"buy" | "sell">(
    deepLink && isAddr(deepLink.input) ? "sell" : "buy",
  );
  const [paySymbol, setPaySymbol] = useState(() => {
    if (deepLink) {
      if (isPayParam(deepLink.input)) return deepLink.input!.toUpperCase();
      if (isPayParam(deepLink.output)) return deepLink.output!.toUpperCase();
    }
    return "USDT";
  });
  const [amountIn, setAmountIn] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [actPop, setActPop] = useState(false);
  const [slipPop, setSlipPop] = useState(false);
  const [settings, setSettings] = useState<TradeSettings>(() => loadTradeSettings());
  const [armedQuote, setArmedQuote] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [approveKey, setApproveKey] = useState<string | null>(null);
  const [executed, setExecuted] = useState<{
    amountUnits: bigint;
    outUnits: bigint;
    minOut: bigint;
    tokenInDecimals: number;
    tokenOutDecimals: number;
    inSymbol: string;
    outSymbol: string;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    saveTradeSettings(settings);
  }, [settings]);

  function updateSettings(patch: Partial<TradeSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  const router = useRouter();
  const pathname = usePathname();

  // After the user touches the card, keep the URL mirroring input/output.
  useEffect(() => {
    if (!syncUrl || !urlTouchedRef.current || !stock) return;
    const stockRef = stock.contractAddress.toLowerCase();
    const params = new URLSearchParams();
    if (direction === "buy") {
      params.set("input", paySymbol);
      params.set("output", stockRef);
    } else {
      params.set("input", stockRef);
      params.set("output", paySymbol);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [direction, paySymbol, stock, router, pathname, urlTouchedRef, syncUrl]);

  const payToken = PAY_TOKENS.find((t) => t.symbol === paySymbol) ?? PAY_TOKENS[0];
  const tokenIn = direction === "buy" ? payToken.address : (stock?.contractAddress as `0x${string}` | undefined);
  const tokenOut = direction === "buy" ? (stock?.contractAddress as `0x${string}` | undefined) : payToken.address;
  // bStocks report their real decimals in the universe (PortfolioView uses the
  // same field); hardcoding 18 mis-scales amounts if `d` ever differs.
  const stockDecimals = stock?.decimals ?? 18;
  const tokenInDecimals = direction === "buy" ? payToken.decimals : stockDecimals;
  const tokenOutDecimals = direction === "buy" ? stockDecimals : payToken.decimals;
  const inSymbol = direction === "buy" ? paySymbol : stock?.symbol ?? "";
  const outSymbol = direction === "buy" ? stock?.symbol ?? "" : paySymbol;

  const amountUnits = parseAmountToUnits(amountIn, tokenInDecimals);

  const quote = useQuote({ tokenIn, tokenOut, amountUnits });
  const q = quote.data;
  // Auto slippage tracks the quote's price impact; manual mode uses the stored value.
  const autoPct = autoSlippagePct(q?.priceImpactBps ?? null);
  const slippage = settings.autoSlippage ? autoPct / 100 : settings.slippage;
  const vendorLogo = q ? VENDOR_LOGOS[q.vendorName.trim().toLowerCase()] : undefined;

  const { data: dynamic } = useDynamic(stock?.contractAddress);

  const bnbPriceQ = useQuery({
    queryKey: ["native-mark-bnb"],
    queryFn: fetchBnbUsdPrice,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const approveMut = useWriteContract();
  const sendMut = useSendTransaction();
  const approveHash = approveMut.data;
  const sendHash = sendMut.data;
  const activeHash = sendHash ?? approveHash;
  const receipt = useWaitForTransactionReceipt({
    hash: activeHash,
    query: { enabled: Boolean(activeHash) },
  });

  const approveMined = Boolean(approveHash) && !sendHash && receipt.isSuccess;
  const swapMined = Boolean(sendHash) && receipt.isSuccess;
  const waitingReceipt = Boolean(activeHash) && receipt.isLoading;
  const txBusy = approveMut.isPending || sendMut.isPending || waitingReceipt || building;

  // One multicall for both sides of the swap instead of two separate
  // useReadContracts (each one is its own RPC round trip). Entries are
  // filtered so a side that isn't resolved yet (stock still loading) never
  // lands an undefined address in the batch.
  const balanceContracts = (() => {
    if (!address) return [];
    const list: {
      address: `0x${string}`;
      abi: typeof ERC20_ABI;
      functionName: "balanceOf";
      args: readonly [`0x${string}`];
    }[] = [];
    if (tokenIn) {
      list.push({
        address: tokenIn as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`] as const,
      });
    }
    if (tokenOut) {
      list.push({
        address: tokenOut as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`] as const,
      });
    }
    return list;
  })();
  const balanceRead = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: balanceContracts.length > 0,
      staleTime: 10_000,
      refetchInterval: swapMined ? 2_000 : false,
    },
  });
  const balInIdx = tokenIn ? 0 : -1;
  const balOutIdx = tokenIn ? (tokenOut ? 1 : -1) : tokenOut ? 0 : -1;
  const balance: bigint =
    (balInIdx >= 0
      ? (balanceRead.data?.[balInIdx]?.result as bigint | undefined)
      : undefined) ?? 0n;
  const balLoading = Boolean(address && tokenIn) && balanceRead.isLoading;
  const balFailed = Boolean(address && tokenIn) && balanceRead.isError;
  const balanceOut: bigint =
    (balOutIdx >= 0
      ? (balanceRead.data?.[balOutIdx]?.result as bigint | undefined)
      : undefined) ?? 0n;
  const outLoading = Boolean(address && tokenOut) && balanceRead.isLoading;
  const outFailed = Boolean(address && tokenOut) && balanceRead.isError;

  const spender = q?.approveTarget;
  const allowanceRead = useReadContracts({
    contracts: [
      {
        address: tokenIn as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address as `0x${string}`, spender as `0x${string}`],
      },
    ],
    query: {
      enabled: Boolean(address && tokenIn && spender),
      staleTime: 5_000,
      refetchInterval: approveMined ? 2_000 : false,
    },
  });
  const allowance: bigint = (allowanceRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const needsApproval = Boolean(spender && amountUnits > 0n && allowance < amountUnits);
  const approvalKey = `${tokenIn ?? ""}-${amountUnits}-${spender ?? ""}`;
  const approvalConfirming =
    approveMined && needsApproval && approveKey === approvalKey;

  const txError =
    approveMut.error?.message ??
    sendMut.error?.message ??
    receipt.error?.message ??
    buildError;
  const insufficient = amountUnits > 0n && amountUnits > balance;
  const expired = quote.expired;
  // A refreshed or expired quote invalidates the first tap of the two-step
  // confirmation: the user must review the new route before the second tap.
  const armed = Boolean(q && !expired && armedQuote === q.quoteId);
  const outUnits = q ? safeUnits(q.toTokenAmount) : 0n;

  // Log each settled swap once with the amounts captured when it was built.
  useEffect(() => {
    if (!swapMined || !sendHash || !executed) return;
    logSwap({
      hash: sendHash,
      fromSymbol: executed.inSymbol,
      toSymbol: executed.outSymbol,
      fromAmount: formatUnits(executed.amountUnits, executed.tokenInDecimals, 4),
      toAmount: formatUnits(executed.outUnits, executed.tokenOutDecimals, 4),
    });
  }, [swapMined, sendHash, executed]);
  const minOut = q ? minReceived(outUnits, slippage) : 0n;
  const secondsLeft =
    q && quote.now > 0 ? Math.max(0, q.expiresAt - Math.floor(quote.now / 1000)) : null;

  // USD estimates: stables are $1, WBNB tracks the BNB oracle, bStocks track
  // the onchain dynamic price. A missing price renders as "-".
  const stockPriceUsd = dynamic?.onchainPrice ? Number(dynamic.onchainPrice) : null;
  const payPriceUsd = paySymbol === "WBNB" ? (bnbPriceQ.data ?? null) : 1;
  const priceInUsd = direction === "buy" ? payPriceUsd : stockPriceUsd;
  const priceOutUsd = direction === "buy" ? stockPriceUsd : payPriceUsd;
  const payUsd =
    priceInUsd !== null ? unitsToNumber(amountUnits, tokenInDecimals) * priceInUsd : null;
  const recUsd =
    priceOutUsd !== null
      ? unitsToNumber(outUnits, tokenOutDecimals) * priceOutUsd
      : null;

  function resetTx() {
    approveMut.reset();
    sendMut.reset();
    setBuildError(null);
    setApproveKey(null);
    setExecuted(null);
  }

  function handleAmount(v: string) {
    if (v === "" || /^\d*\.?\d*$/.test(v)) setAmountIn(v);
    setArmedQuote(null);
    setApproveKey(null);
    if (approveMut.error || sendMut.error) resetTx();
  }

  function setPercent(pct: number) {
    urlTouchedRef.current = true;
    const units = (balance * BigInt(pct)) / 100n;
    handleAmount(formatUnits(units, tokenInDecimals, tokenInDecimals).replace(/,/g, ""));
  }

  const balDisplay = balLoading ? "…" : balFailed ? "–" : formatUnits(balance, tokenInDecimals, 4);
  const pctDisabled = balLoading || balFailed;
  const outDisplay = outLoading ? "…" : outFailed ? "–" : formatUnits(balanceOut, tokenOutDecimals, 4);

  function pickPayToken(sym: string) {
    urlTouchedRef.current = true;
    setPaySymbol(sym);
    setArmedQuote(null);
    setApproveKey(null);
    if (approveMut.error || sendMut.error) resetTx();
  }

  function handleAction() {
    if (!isConnected) {
      openWalletModal();
      return;
    }
    if (expired) {
      setArmedQuote(null);
      void quote.refetch();
      return;
    }
    if (!q || !tokenIn || !tokenOut) return;
    if (needsApproval && spender && !approvalConfirming) {
      if (!isAddr(spender)) {
        setBuildError("Quote returned an invalid approval spender - refresh and retry.");
        return;
      }
      resetTx();
      setApproveKey(`${tokenIn}-${amountUnits}-${spender}`);
      approveMut.mutate({
        address: tokenIn,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender as `0x${string}`, amountUnits],
      });
      return;
    }
    if (approvalConfirming) return;
    if (!settings.expert && !armed) {
      setArmedQuote(q.quoteId);
      return;
    }
    setArmedQuote(null);
    void runSwap();
  }

  async function runSwap() {
    if (!q || !address || !tokenIn || !tokenOut) return;
    resetTx();
    setBuilding(true);
    try {
      const built = await fetchBnSwap({
        quoteId: q.quoteId,
        from: tokenIn,
        to: tokenOut,
        amount: amountUnits.toString(),
        wallet: address,
        slippagePercent: String(Math.round(slippage * 10000) / 100),
      });
      const tx = built.tx;
      if (!tx) throw new Error("Binance returned no transaction");
      // Never sign a payload that fails structural checks: every asset this
      // desk trades (stables, WBNB, bStocks) is an ERC-20, so a legitimate
      // swap never carries native BNB value. A tampered upstream response
      // must not be able to drain gas token via msg.value.
      if (!isAddr(tx.to)) throw new Error("Swap rejected: invalid router address");
      if (!/^0x[0-9a-fA-F]*$/.test(tx.data ?? "")) {
        throw new Error("Swap rejected: invalid transaction data");
      }
      let txValue: bigint;
      try {
        txValue = BigInt(tx.value);
      } catch {
        throw new Error("Swap rejected: invalid transaction value");
      }
      if (txValue !== 0n) {
        throw new Error("Swap rejected: unexpected native token value");
      }
      setExecuted({
        amountUnits,
        outUnits,
        minOut,
        tokenInDecimals,
        tokenOutDecimals,
        inSymbol,
        outSymbol,
      });
      sendMut.mutate({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: txValue,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to build swap";
      const expiredErr = msg.includes("40401") || msg.toLowerCase().includes("expire");
      setBuildError(expiredErr ? "Quote expired and was refreshed. Tap Swap again." : msg);
      void quote.refetch();
    } finally {
      setBuilding(false);
    }
  }

  function flipDirection() {
    urlTouchedRef.current = true;
    resetTx();
    setArmedQuote(null);
    setDirection((d) => (d === "buy" ? "sell" : "buy"));
  }

  let ctaLabel = "Swap";
  let ctaDisabled = false;
  if (!isConnected) {
    ctaLabel = "Connect wallet";
  } else if (amountUnits === 0n) {
    ctaLabel = "Enter an amount";
    ctaDisabled = true;
  } else if (balFailed) {
    ctaLabel = "Balance failed to load";
    ctaDisabled = true;
  } else if (balLoading) {
    // While the balance read is in flight it resolves to 0n; without this
    // branch the CTA flashes "Insufficient" before the real balance lands.
    ctaLabel = "Loading balance…";
    ctaDisabled = true;
  } else if (quote.isFetching && !q) {
    ctaLabel = "Fetching quote…";
    ctaDisabled = true;
  } else if (quote.isError) {
    ctaLabel = "No route found";
    ctaDisabled = true;
  } else if (!q) {
    ctaLabel = "Fetching quote…";
    ctaDisabled = true;
  } else if (expired) {
    ctaLabel = "Quote expired, refresh";
  } else if (insufficient) {
    ctaLabel = `Insufficient ${inSymbol}`;
    ctaDisabled = true;
  } else if (approveMut.isPending) {
    ctaLabel = "Approving…";
    ctaDisabled = true;
  } else if (building) {
    ctaLabel = "Building swap…";
    ctaDisabled = true;
  } else if (sendMut.isPending) {
    ctaLabel = "Confirming in wallet…";
    ctaDisabled = true;
  } else if (waitingReceipt) {
    ctaLabel = sendHash ? "Swap confirming…" : "Approval confirming…";
    ctaDisabled = true;
  } else if (approvalConfirming) {
    ctaLabel = "Approval confirming…";
    ctaDisabled = true;
  } else if (needsApproval) {
    ctaLabel = `Approve ${inSymbol}`;
  } else if (armed) {
    ctaLabel = "Confirm swap";
  }

  if (swapMined && executed) {
    return (
      <Card className="flex h-full flex-col p-5">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-up/15">
            <Check className="h-5 w-5 text-up" strokeWidth={1.7} />
          </div>
          <p className="text-sm font-semibold text-fg">Swap settled</p>
          <p className="tnum text-sm text-dim">
            {formatUnits(executed.outUnits, executed.tokenOutDecimals, 6)}{" "}
            {executed.outSymbol} expected (min{" "}
            {formatUnits(executed.minOut, executed.tokenOutDecimals, 6)})
          </p>
          {sendHash ? (
            <a
              href={`https://bscscan.com/tx/${sendHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View on BscScan
              <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
            </a>
          ) : null}
          <Button
            variant="secondary"
            className="mt-2 max-w-[240px]"
            onClick={() => {
              resetTx();
              setAmountIn("");
            }}
          >
            Swap more
          </Button>
        </div>
      </Card>
    );
  }

  if (slipOpen) {
    return (
      <Card className="flex h-full min-h-[420px] flex-col p-5">
        <TradeSettingsPanel
          settings={settings}
          onChange={updateSettings}
          autoPct={autoPct}
          onBack={() => setSlipOpen(false)}
        />
      </Card>
    );
  }

  if (actOpen) {
    return (
      <Card className="flex h-full min-h-[420px] flex-col p-5">
        <ActivityPanel onBack={() => setActOpen(false)} />
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-fg">Swap</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // Let the pop play before the panel swaps in over the toolbar.
              setActPop(true);
              window.setTimeout(() => setActOpen(true), 380);
            }}
            aria-label="Swap activity"
            className="flex items-center rounded-lg p-1 text-dim transition-colors hover:text-fg"
          >
            <History
              className={`h-[22px] w-[22px] ${actPop ? "icon-pop" : ""}`}
              strokeWidth={1.7}
              onAnimationEnd={() => setActPop(false)}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setSlipPop(true);
              window.setTimeout(() => setSlipOpen(true), 380);
            }}
            aria-label="Trade settings"
            className="flex items-center rounded-lg p-1 text-dim transition-colors hover:text-fg"
          >
            <Settings
              className={`h-[22px] w-[22px] ${slipPop ? "gear-spin" : ""}`}
              strokeWidth={1.7}
              onAnimationEnd={() => setSlipPop(false)}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex max-h-[170px] min-h-[120px] flex-1 flex-col justify-between rounded-2xl border border-line bg-surface-4 p-4">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>You pay</span>
            <div className="flex items-center gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <AmountPill
                  key={pct}
                  icon={pct === 100}
                  onClick={() => setPercent(pct)}
                  disabled={pctDisabled || txBusy}
                  ariaLabel={pct === 100 ? "Set max amount" : `Set ${pct} percent`}
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </AmountPill>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            {direction === "buy" ? (
              <PayTokenPicker
                paySymbol={paySymbol}
                onPick={pickPayToken}
                disabled={txBusy}
              />
            ) : stockLoading || !hydrated ? (
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-fill-strong px-3 py-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3.5 w-14" />
                <DropArrow />
              </span>
            ) : (
              <button
                type="button"
                disabled={txBusy}
                onClick={() => {
                  if (!txBusy) setPickerOpen(true);
                }}
                aria-label="Pick token to pay with"
                className="flex shrink-0 items-center gap-2 rounded-full bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stock && <TokenImage address={stock.contractAddress} symbol={stock.symbol} size={20} />}
                {stock?.symbol ?? "Pick token"}
                <DropArrow />
              </button>
            )}
            <input
              inputMode="decimal"
              value={amountIn}
              onChange={(e) => handleAmount(e.target.value)}
              disabled={txBusy}
              placeholder="0"
              aria-label={`Amount of ${inSymbol} to ${direction === "buy" ? "pay" : "sell"}`}
              className="tnum h-9 w-full min-w-0 bg-transparent text-right text-2xl font-semibold text-fg outline-none placeholder:text-dim/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            {isConnected ? (
              <span
                className={`tnum flex items-center gap-1.5 ${balFailed ? "text-down" : "text-dim"}`}
              >
                <WalletFilled className="h-5 w-5" />
                {balLoading ? <Skeleton className="h-3.5 w-14 rounded-full" /> : balDisplay}
              </span>
            ) : (
              <span />
            )}
            <span className="tnum text-dim">≈ {fmtUsd(payUsd)}</span>
          </div>
        </div>

        <div className="relative flex justify-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-line-strong to-transparent"
          />
          <button
            type="button"
            aria-label="Flip swap direction"
            disabled={txBusy}
            onClick={() => {
              if (txBusy) return;
              setFlipping(true);
              flipDirection();
              window.setTimeout(() => setFlipping(false), 500);
            }}
            className="relative rounded-full border border-line-strong bg-surface-3 p-1.5 text-dim transition-colors hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${flipping ? "animate-spin" : ""}`}
              strokeWidth={1.7}
            />
          </button>
        </div>

        <div className="flex max-h-[170px] min-h-[120px] flex-1 flex-col justify-between rounded-2xl border border-line bg-surface-4 p-4">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>You receive</span>
            {direction === "buy" && dynamic?.sharesMultiplier ? (
              <span className="tnum text-dim">
                1 {stock?.symbol ?? "token"} = {Number(dynamic.sharesMultiplier).toFixed(6)} shares
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {direction === "sell" ? (
              <PayTokenPicker
                paySymbol={paySymbol}
                onPick={pickPayToken}
                disabled={txBusy}
              />
            ) : stockLoading || !hydrated ? (
              <span className="flex shrink-0 items-center gap-2 rounded-full bg-fill-strong px-3 py-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3.5 w-14" />
                <DropArrow />
              </span>
            ) : (
              <button
                type="button"
                disabled={txBusy}
                onClick={() => {
                  if (!txBusy) setPickerOpen(true);
                }}
                aria-label="Pick token to receive"
                className="flex shrink-0 items-center gap-2 rounded-full bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stock && <TokenImage address={stock.contractAddress} symbol={stock.symbol} size={20} />}
                {stock?.symbol ?? "Pick token"}
                <DropArrow />
              </button>
            )}
            <div className="tnum flex h-9 w-full min-w-0 items-center justify-end overflow-hidden text-2xl font-semibold text-fg">
              {quote.isFetching || (q && expired) ? (
                <QuoteDots />
              ) : q ? (
                formatUnits(outUnits, tokenOutDecimals, 6)
              ) : (
                <span className="text-dim/40">0</span>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            {isConnected ? (
              <span
                className={`tnum flex items-center gap-1.5 ${outFailed ? "text-down" : "text-dim"}`}
              >
                <WalletFilled className="h-5 w-5" />
                {outLoading ? <Skeleton className="h-3.5 w-14 rounded-full" /> : outDisplay}
              </span>
            ) : (
              <span />
            )}
            <span className="tnum text-dim">≈ {fmtUsd(recUsd)}</span>
          </div>
        </div>
      </div>

      {q ? (
        <div className="mt-4 rounded-xl border border-line bg-surface-4 p-3 text-xs">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            aria-expanded={showDetails}
            className="group flex w-full items-center justify-between text-dim transition-colors hover:text-fg"
          >
            <span className="font-medium">Route details</span>
            <DropArrow open={showDetails} />
          </button>
          {showDetails ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-dim">Route</span>
                <span className="flex items-center gap-1.5">
                  {vendorLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local static venue logo from /public
                    <img
                      src={vendorLogo}
                      alt=""
                      className="h-5 w-auto"
                    />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-fill-strong">
                      <Waypoints className="h-3 w-3 text-accent" strokeWidth={1.7} />
                    </span>
                  )}
                  <span className="font-medium text-fg">{q.vendorName}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Rate"
                  className="text-dim"
                  text={`How much ${outSymbol} one ${inSymbol} buys on this quote, after fees.`}
                />
                <span className="tnum text-fg">
                  1 {inSymbol} ≈{" "}
                  {amountUnits > 0n
                    ? fmtNumTrim(
                        (unitsToNumber(outUnits, tokenOutDecimals) /
                          unitsToNumber(amountUnits, tokenInDecimals)),
                        6,
                      )
                    : "-"}{" "}
                  {outSymbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Slippage"
                  className="text-dim"
                  text="Your price-move tolerance between quote and fill. Past it, the swap fills less or reverts."
                />
                <span className="tnum text-fg">{fmtNumTrim(slippage * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Min. Received"
                  className="text-dim"
                  text="The least you will accept. The swap stops if the fill would give you less."
                />
                <span className="tnum text-fg">
                  {formatUnits(minOut, tokenOutDecimals, 6)} {outSymbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Service Fee"
                  className="text-dim"
                  text="The venue's service fee on this trade, already priced into the quote."
                />
                {Number(q.tradeFee || 0) === 0 ? (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    Free
                  </span>
                ) : (
                  <span className="tnum text-fg">{fmtUsd(Number(q.tradeFee), 4)}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Price impact"
                  className="text-dim"
                  text="How much your own order moves the market price. Bigger trades dig deeper."
                />
                <span
                  className={`tnum ${
                    q.priceImpactBps === null
                      ? "text-dim"
                      : q.priceImpactBps >= 100
                        ? "text-down"
                        : "text-fg"
                  }`}
                >
                  {q.priceImpactBps !== null
                    ? `${fmtNumTrim(q.priceImpactBps / 100, 2)}%`
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <TipLabel
                  label="Quote expires"
                  className="text-dim"
                  text={`The price is only good for ${QUOTE_TTL_S} seconds. When the ring empties, the swap button fetches a fresh quote.`}
                />
                <QuoteTimer secondsLeft={secondsLeft} expired={expired} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {quote.isError ? (
        <p className="mt-3 text-xs text-down">
          {(quote.error as Error)?.message ?? "Quote unavailable"}. Try a different amount.
        </p>
      ) : null}
      {txError ? (
        <p className="mt-3 break-words text-xs text-down">
          {txError.split("\n")[0].slice(0, 200)}
        </p>
      ) : null}

      {settings.expert && q && q.priceImpactBps !== null && q.priceImpactBps >= 100 ? (
        <p className="mt-3 text-xs text-warn">
          High price impact: {fmtNumTrim(q.priceImpactBps / 100, 2)}%
        </p>
      ) : null}

      <Button className="mt-4 rounded-full" onClick={handleAction} disabled={ctaDisabled || txBusy} loading={txBusy}>
        {!isConnected ? <WalletFilled className="h-5 w-5" /> : null}
        {ctaLabel}
      </Button>

      {activeHash && waitingReceipt ? (
        <a
          href={`https://bscscan.com/tx/${activeHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1 text-xs text-accent hover:underline"
        >
            Transaction pending. View on BscScan
          <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
        </a>
      ) : null}

      {pickerOpen && (universe || universeQ.isError || universeQ.isLoading) ? (
        <TokenSelectModal
          tokens={universe ?? []}
          loading={universeQ.isLoading && !universe}
          error={universeQ.isError}
          onRetry={() => void universeQ.refetch()}
          onSelect={(t) => {
            urlTouchedRef.current = true;
            resetTx();
            onSelectStock(t);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

    </Card>
  );
}
