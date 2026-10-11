"use client";

import { ArrowUpDown, ChevronDown, ExternalLink, Settings, WalletCards, Waypoints, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useConnect,
  useConnectors,
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
import { TokenSelectModal } from "./TokenSelectModal";
import { SlippageModal } from "./SlippageModal";
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
import { useDynamic, useUniverse } from "@/hooks/useRwa";
import { useQuote } from "@/hooks/useQuote";

const isAddr = (v: string | null | undefined) => !!v && /^0x[0-9a-f]{40}$/i.test(v);
const isPayParam = (v: string | null | undefined) =>
  !!v && PAY_TOKENS.some((t) => t.symbol === v.toUpperCase());

const VENDOR_LOGOS: Record<string, string> = {
  liquidmesh: "/venues/liquidmesh-icon.svg",
};

function PayTokenPicker({
  paySymbol,
  onPick,
}: {
  paySymbol: string;
  onPick: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = PAY_TOKENS.find((t) => t.symbol === paySymbol) ?? PAY_TOKENS[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Pick token to pay with"
        className="flex shrink-0 items-center gap-2 rounded-lg bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
      >
        <TokenImage
          address={selected.address}
          src={selected.logo}
          symbol={selected.symbol}
          size={20}
        />
        {selected.symbol}
        <ChevronDown className="h-3.5 w-3.5 text-dim" strokeWidth={1.7} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close token picker"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface-1/95 shadow-2xl shadow-black/50 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-fg">Select token</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-dim transition-colors hover:bg-fill hover:text-accent"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
            <div className="py-1">
              {PAY_TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => {
                    onPick(t.symbol);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-fill"
                >
                  <span className="flex items-center gap-3">
                    <TokenImage
                      address={t.address}
                      src={t.logo}
                      symbol={t.symbol}
                      size={32}
                    />
                    <span className="text-sm font-semibold text-fg">
                      {t.symbol}
                    </span>
                  </span>
                  <span className="tnum text-xs text-dim">
                    {t.address.slice(0, 6)}…{t.address.slice(-4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
  const { address, isConnected } = useConnection();
  const { mutate: connect, isPending: connecting } = useConnect();
  const connectors = useConnectors();

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
  const [slippage, setSlippage] = useState(0.005);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  const router = useRouter();

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
    router.replace(`/trade?${params.toString()}`, { scroll: false });
  }, [direction, paySymbol, stock, router, urlTouchedRef, syncUrl]);

  const payToken = PAY_TOKENS.find((t) => t.symbol === paySymbol) ?? PAY_TOKENS[0];
  const tokenIn = direction === "buy" ? payToken.address : (stock?.contractAddress as `0x${string}` | undefined);
  const tokenOut = direction === "buy" ? (stock?.contractAddress as `0x${string}` | undefined) : payToken.address;
  const tokenInDecimals = direction === "buy" ? payToken.decimals : 18;
  const tokenOutDecimals = direction === "buy" ? 18 : payToken.decimals;
  const inSymbol = direction === "buy" ? paySymbol : stock?.symbol ?? "";
  const outSymbol = direction === "buy" ? stock?.symbol ?? "" : paySymbol;

  const amountUnits = parseAmountToUnits(amountIn, tokenInDecimals);

  const quote = useQuote({ tokenIn, tokenOut, amountUnits, slippage });
  const q = quote.data;
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

  const balanceRead = useReadContracts({
    contracts: [
      {
        address: tokenIn as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      },
    ],
    query: {
      enabled: Boolean(address && tokenIn),
      staleTime: 10_000,
      refetchInterval: swapMined ? 2_000 : false,
    },
  });
  const balance: bigint = (balanceRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const balLoading = Boolean(address && tokenIn) && balanceRead.isLoading;
  const balFailed = Boolean(address && tokenIn) && balanceRead.isError;

  const balanceOutRead = useReadContracts({
    contracts: [
      {
        address: tokenOut as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      },
    ],
    query: {
      enabled: Boolean(address && tokenOut),
      staleTime: 10_000,
      refetchInterval: swapMined ? 2_000 : false,
    },
  });
  const balanceOut: bigint = (balanceOutRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const outLoading = Boolean(address && tokenOut) && balanceOutRead.isLoading;
  const outFailed = Boolean(address && tokenOut) && balanceOutRead.isError;

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
  const approvalConfirming = approveMined && needsApproval;

  const txError = approveMut.error?.message ?? sendMut.error?.message ?? buildError;
  const insufficient = amountUnits > 0n && amountUnits > balance;
  const expired = quote.expired;
  const outUnits = q ? BigInt(q.toTokenAmount) : 0n;
  const minOut = q ? minReceived(outUnits, quote.slippage) : 0n;
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
  }

  function handleAmount(v: string) {
    if (v === "" || /^\d*\.?\d*$/.test(v)) setAmountIn(v);
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
    if (approveMut.error || sendMut.error) resetTx();
  }

  function handleAction() {
    if (!isConnected) {
      const target = connectors.find((c) => c.id === "injected") ?? connectors[0];
      if (target) connect({ connector: target });
      return;
    }
    if (expired) {
      void quote.refetch();
      return;
    }
    if (!q || !tokenIn || !tokenOut) return;
    if (needsApproval && spender && !approvalConfirming) {
      resetTx();
      approveMut.mutate({
        address: tokenIn,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender as `0x${string}`, amountUnits],
      });
      return;
    }
    if (approvalConfirming) return;
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
        slippagePercent: String(Math.round(quote.slippage * 10000) / 100),
      });
      const tx = built.tx;
      if (!tx) throw new Error("Binance returned no transaction");
      sendMut.mutate({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value),
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
    setDirection((d) => (d === "buy" ? "sell" : "buy"));
  }

  let ctaLabel = "Swap";
  let ctaDisabled = false;
  if (!isConnected) {
    ctaLabel = connecting ? "Connecting…" : "Connect wallet";
  } else if (amountUnits === 0n) {
    ctaLabel = "Enter an amount";
    ctaDisabled = true;
  } else if (balFailed) {
    ctaLabel = "Balance failed to load";
    ctaDisabled = true;
  } else if (quote.isFetching && !q) {
    ctaLabel = "Fetching quote…";
    ctaDisabled = true;
  } else if (quote.isError) {
    ctaLabel = "No route / quote failed";
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
  }

  if (swapMined && q) {
    return (
      <Card className="flex h-full flex-col p-5">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-up/15">
            <span className="text-lg text-up">✓</span>
          </div>
          <p className="text-sm font-semibold text-fg">Swap settled</p>
          <p className="tnum text-sm text-dim">
            {formatUnits(outUnits, tokenOutDecimals, 6)} {outSymbol} received (min{" "}
            {formatUnits(minOut, tokenOutDecimals, 6)})
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

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-fg">Swap</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSlipOpen(true)}
            aria-label="Slippage settings"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-4 px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
          >
            <Settings className="h-3.5 w-3.5 text-dim" strokeWidth={1.7} />
            <span className="tnum">{fmtNumTrim(slippage * 100)}%</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex max-h-[160px] min-h-[110px] flex-1 flex-col justify-between rounded-xl border border-line-strong bg-surface-4 p-4">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>You pay</span>
            <div className="flex items-center gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <AmountPill
                  key={pct}
                  icon={pct === 100}
                  onClick={() => setPercent(pct)}
                  disabled={pctDisabled}
                  ariaLabel={pct === 100 ? "Set max amount" : `Set ${pct} percent`}
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </AmountPill>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              inputMode="decimal"
              value={amountIn}
              onChange={(e) => handleAmount(e.target.value)}
              placeholder="0"
              className="tnum h-9 w-full min-w-0 bg-transparent text-2xl font-semibold text-fg outline-none placeholder:text-dim/40"
            />
            {direction === "buy" ? (
              <PayTokenPicker paySymbol={paySymbol} onPick={pickPayToken} />
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-label="Pick token to pay with"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
              >
                {stock && <TokenImage address={stock.contractAddress} symbol={stock.symbol} size={20} />}
                {stock?.symbol ?? "Pick token"}
                <ChevronDown className="h-3.5 w-3.5 text-dim" strokeWidth={1.7} />
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="tnum text-dim">≈ {fmtUsd(payUsd)}</span>
            {isConnected ? (
              <span
                className={`tnum flex items-center gap-1 ${balFailed ? "text-down" : "text-dim"}`}
              >
                <WalletCards className="h-3.5 w-3.5" strokeWidth={1.7} />
                {balDisplay}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            aria-label="Flip swap direction"
            onClick={flipDirection}
            className="rounded-lg border border-line-strong bg-surface-3 p-2 text-dim transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <ArrowUpDown className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="flex max-h-[160px] min-h-[110px] flex-1 flex-col justify-between rounded-xl border border-line-strong bg-surface-4 p-4">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>You receive</span>
            {direction === "buy" && dynamic?.sharesMultiplier ? (
              <span className="tnum text-dim">
                1 {stock?.symbol ?? "token"} = {Number(dynamic.sharesMultiplier).toFixed(6)} shares
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="tnum flex h-9 w-full min-w-0 items-center overflow-hidden text-2xl font-semibold text-fg">
              {quote.isFetching || (q && expired) ? (
                <QuoteDots />
              ) : q ? (
                formatUnits(outUnits, tokenOutDecimals, 6)
              ) : (
                <span className="text-dim/40">0</span>
              )}
            </div>
            {direction === "sell" ? (
              <PayTokenPicker paySymbol={paySymbol} onPick={pickPayToken} />
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-label="Pick token to receive"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-fill-strong px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
              >
                {stock && <TokenImage address={stock.contractAddress} symbol={stock.symbol} size={20} />}
                {stock?.symbol ?? "Pick token"}
                <ChevronDown className="h-3.5 w-3.5 text-dim" strokeWidth={1.7} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="tnum text-dim">≈ {fmtUsd(recUsd)}</span>
            {isConnected ? (
              <span
                className={`tnum flex items-center gap-1 ${outFailed ? "text-down" : "text-dim"}`}
              >
                <WalletCards className="h-3.5 w-3.5" strokeWidth={1.7} />
                {outDisplay}
              </span>
            ) : null}
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
            <ChevronDown
              className={`h-4 w-4 transition-all group-hover:text-accent ${
                showDetails ? "rotate-180" : "rotate-0"
              }`}
              strokeWidth={1.7}
            />
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
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    Best price
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Rate</span>
                <span className="tnum text-fg">
                  1 {inSymbol} ≈{" "}
                  {amountUnits > 0n
                    ? fmtNumTrim(
                        (unitsToNumber(outUnits, tokenOutDecimals) /
                          unitsToNumber(amountUnits, tokenInDecimals)),
                        6,
                      )
                    : "—"}{" "}
                  {outSymbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Slippage</span>
                <span className="tnum text-fg">{fmtNumTrim(slippage * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Min. Received</span>
                <span className="tnum text-fg">
                  {formatUnits(minOut, tokenOutDecimals, 6)} {outSymbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Service Fee</span>
                {Number(q.tradeFee || 0) === 0 ? (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    Free
                  </span>
                ) : (
                  <span className="tnum text-fg">{fmtUsd(Number(q.tradeFee), 4)}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Price impact</span>
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
                <span className="text-dim">Quote expires</span>
                <span className={`tnum ${expired ? "text-down" : "text-fg"}`}>
                  {expired ? "expired" : secondsLeft !== null ? `${secondsLeft}s` : "…"}
                </span>
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

      <Button className="mt-4" onClick={handleAction} disabled={ctaDisabled || txBusy} loading={txBusy}>
        {!isConnected ? <WalletCards className="h-4 w-4" strokeWidth={1.7} /> : null}
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

      {slipOpen ? (
        <SlippageModal
          value={slippage}
          onChange={setSlippage}
          onClose={() => setSlipOpen(false)}
        />
      ) : null}
    </Card>
  );
}
