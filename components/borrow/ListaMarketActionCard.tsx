"use client";

import { useState } from "react";
import {
  useConnect,
  useConnection,
  useConnectors,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountPill } from "@/components/ui/AmountPill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { ERC20_ABI } from "@/lib/erc20";
import {
  MOOLAH_ADDRESS,
  MOOLAH_ACTION_ABI,
  maxAdditionalBorrow,
  type ListaMarket,
} from "@/lib/lista";
import { formatUnits, parseAmountToUnits } from "@/lib/format";
import { useListaUserPosition } from "@/hooks/useLista";

type Tab = "supply" | "borrow" | "repay" | "withdraw";

const TABS: { key: Tab; label: string }[] = [
  { key: "supply", label: "Supply" },
  { key: "borrow", label: "Borrow" },
  { key: "repay", label: "Repay" },
  { key: "withdraw", label: "Withdraw" },
];

const AMOUNT_LABEL: Record<Tab, string> = {
  supply: "Amount to supply",
  borrow: "Amount to borrow",
  repay: "Amount to repay",
  withdraw: "Amount to withdraw",
};

const HELPERS: Record<Tab, (m: ListaMarket) => string> = {
  supply: (m) =>
    `Supplies ${m.collateralSymbol} as isolated collateral. It earns supply yield while it backs the loan.`,
  borrow: (m) =>
    `Borrows ${m.loanSymbol} against your collateral. Interest accrues per block.`,
  repay: (m) =>
    `Repays ${m.loanSymbol} debt in this market. Blocked if it would push your health below 1.00.`,
  withdraw: (m) =>
    `Withdraws ${m.collateralSymbol} collateral. Blocked if it would push your health below 1.00.`,
};

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Supply-collateral / borrow / repay / withdraw panel for one Lista (Moolah)
 * isolated market. Same layout as the Venus pool card: label row with balance
 * and MAX, large input with the token, one helper line, then the CTA.
 * Approve is staged automatically for supply and repay.
 */
export function ListaMarketActionCard({ market }: { market: ListaMarket }) {
  const { address, isConnected } = useConnection();
  const { mutate: connect, isPending: connecting } = useConnect();
  const connectors = useConnectors();

  const [tab, setTab] = useState<Tab>("supply");
  const [amount, setAmount] = useState("");

  const approveMut = useWriteContract();
  const actionMut = useWriteContract();
  const approveHash = approveMut.data;
  const actionHash = actionMut.data;
  const activeHash = actionHash ?? approveHash;
  const receipt = useWaitForTransactionReceipt({
    hash: activeHash,
    query: { enabled: Boolean(activeHash) },
  });
  const actionMined = Boolean(actionHash) && receipt.isSuccess;
  const waitingReceipt = Boolean(activeHash) && receipt.isLoading;
  const txBusy = approveMut.isPending || actionMut.isPending || waitingReceipt;
  const fastPoll = Boolean(activeHash);

  const position = useListaUserPosition(market, address);

  const tokenSide = tab === "supply" || tab === "withdraw" ? "collateral" : "loan";
  const tokenAddress =
    tokenSide === "collateral" ? market.collateralAddress : market.loanAddress;
  const tokenSymbol =
    tokenSide === "collateral" ? market.collateralSymbol : market.loanSymbol;
  const tokenDecimals = 18;

  const walletRead = useReadContracts({
    contracts: address
      ? [
          {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf" as const,
            args: [address] as const,
          },
          {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "allowance" as const,
            args: [address as `0x${string}`, MOOLAH_ADDRESS] as const,
          },
        ]
      : [],
    query: {
      enabled: Boolean(address),
      staleTime: 5_000,
      refetchInterval: fastPoll ? 2_000 : false,
    },
  });
  const walletBalance =
    (walletRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const allowance = (walletRead.data?.[1]?.result as bigint | undefined) ?? 0n;

  const pos = position.data;
  const unitAmount = parseAmountToUnits(amount, tokenDecimals);

  const maxForTab: bigint = (() => {
    if (tab === "supply") return walletBalance;
    if (tab === "withdraw") return pos?.collateral ?? 0n;
    if (tab === "repay") return min(pos?.debtAssets ?? 0n, walletBalance);
    if (!pos) return 0n;
    return maxAdditionalBorrow(
      pos.collateral,
      pos.priceRaw,
      market.lltv,
      pos.debtAssets,
      market.liquidity,
      tokenDecimals,
    );
  })();

  const needsApprove =
    unitAmount > 0n &&
    (tab === "supply" || tab === "repay") &&
    allowance < unitAmount;

  const overMax = unitAmount > maxForTab && maxForTab >= 0n && amount !== "";
  const invalid = amount !== "" && (unitAmount <= 0n || overMax);

  const balanceLabel =
    tab === "supply" || tab === "withdraw"
      ? market.collateralSymbol
      : market.loanSymbol;

  function setMax() {
    setAmount(formatUnits(maxForTab, tokenDecimals, 8));
  }

  function handleAmount(v: string) {
    if (/^\d*\.?\d*$/.test(v)) setAmount(v);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setAmount("");
    approveMut.reset();
    actionMut.reset();
  }

  function submit() {
    if (!isConnected) {
      connect({ connector: connectors[0] });
      return;
    }
    if (!address || unitAmount <= 0n) return;
    if (needsApprove) {
      approveMut.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MOOLAH_ADDRESS, unitAmount],
      });
      return;
    }
    if (tab === "supply") {
      actionMut.writeContract({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_ACTION_ABI,
        functionName: "supplyCollateral",
        args: [market.id, unitAmount, address, "0x"],
      });
    } else if (tab === "borrow") {
      actionMut.writeContract({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_ACTION_ABI,
        functionName: "borrow",
        args: [market.id, unitAmount, address, "0x"],
      });
    } else if (tab === "repay") {
      actionMut.writeContract({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_ACTION_ABI,
        functionName: "repay",
        args: [market.id, unitAmount, address, "0x"],
      });
    } else {
      actionMut.writeContract({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_ACTION_ABI,
        functionName: "withdrawCollateral",
        args: [market.id, unitAmount, address, address],
      });
    }
  }

  function reset() {
    approveMut.reset();
    actionMut.reset();
    setAmount("");
    void position.refetch();
    void walletRead.refetch();
  }

  const err =
    approveMut.error?.message?.split("\n")[0] ??
    actionMut.error?.message?.split("\n")[0] ??
    null;

  const busyLabel =
    tab === "supply"
      ? "Supplying"
      : tab === "borrow"
        ? "Borrowing"
        : tab === "repay"
          ? "Repaying"
          : "Withdrawing";

  const idleLabel =
    tab === "supply"
      ? "Supply"
      : tab === "borrow"
        ? "Borrow"
        : tab === "repay"
          ? "Repay"
          : "Withdraw";

  let ctaLabel: string;
  if (!isConnected) {
    ctaLabel = connecting ? "Connecting…" : "Connect wallet";
  } else if (txBusy) {
    ctaLabel = waitingReceipt
      ? "Confirming…"
      : approveMut.isPending
        ? "Approve in wallet…"
        : actionMut.isPending
          ? "Sign in wallet…"
          : busyLabel;
  } else if (unitAmount <= 0n) {
    ctaLabel = "Enter an amount";
  } else if (needsApprove) {
    ctaLabel = `Approve ${tokenSymbol}`;
  } else {
    ctaLabel = idleLabel;
  }

  const ctaDisabled =
    connecting ||
    txBusy ||
    (isConnected &&
      (unitAmount <= 0n ||
        invalid ||
        (tab !== "supply" && position.isLoading)));

  return (
    <Card className="flex flex-col p-5 lg:flex-1">
      <SegmentedTabs
        ariaLabel="Lista action"
        value={tab}
        onChange={switchTab}
        tabs={TABS}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-dim">
        <span>{AMOUNT_LABEL[tab]}</span>
        <span className="flex items-center gap-2">
          <span className="tnum">
            Bal{" "}
            {!isConnected
              ? "-"
              : walletRead.isLoading
                ? "…"
                : formatUnits(walletBalance, tokenDecimals, 4)}
          </span>
          <AmountPill icon onClick={setMax} ariaLabel="Set max amount">
            Max
          </AmountPill>
        </span>
      </div>

      <div className="mt-1.5 flex h-14 items-center gap-3 rounded-xl border border-line-strong bg-surface-4 px-4">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmount(e.target.value)}
          placeholder="0"
          aria-label={AMOUNT_LABEL[tab]}
          className="tnum h-9 w-full min-w-0 bg-transparent text-xl font-semibold text-fg outline-none placeholder:text-dim/40"
        />
        <span className="flex shrink-0 items-center gap-1.5">
          <TokenImage
            address={tokenAddress}
            src={tokenSide === "collateral" ? market.collateralIcon : market.loanIcon}
            symbol={tokenSymbol || "?"}
            size={20}
          />
          <span className="text-sm font-semibold text-fg">{tokenSymbol}</span>
        </span>
      </div>

      {invalid ? (
        <p className="mt-3 text-xs text-down">
          {overMax
            ? `More than the ${formatUnits(maxForTab, tokenDecimals, 4)} ${balanceLabel} available for this action.`
            : "Enter an amount."}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-dim">{HELPERS[tab](market)}</p>

      {actionMined && activeHash ? (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-1 px-3 py-2.5">
          <span className="flex items-center gap-2 text-xs text-up">
            <Check className="h-3.5 w-3.5" strokeWidth={1.7} />
            Confirmed
          </span>
          <span className="flex items-center gap-3">
            <a
              href={`https://bscscan.com/tx/${activeHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View
              <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
            </a>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-dim transition-colors hover:text-fg"
            >
              Dismiss
            </button>
          </span>
        </div>
      ) : null}

      {err && !actionMined ? (
        <p className="mt-3 break-words text-xs text-down">{err.slice(0, 200)}</p>
      ) : null}

      {waitingReceipt ? (
        <Skeleton className="mt-3 h-4 w-2/3" />
      ) : null}

      <Button className="mt-4 w-full" onClick={submit} disabled={ctaDisabled}>
        {ctaLabel}
      </Button>
    </Card>
  );
}

export function ListaTokenPairIcons({
  market,
  size = 32,
}: {
  market: ListaMarket;
  size?: number;
}) {
  return (
    <span className="relative flex shrink-0">
      <TokenImage
        src={market.collateralIcon}
        symbol={market.collateralSymbol}
        size={size}
        className="relative z-10 ring-2 ring-surface-3"
      />
      <TokenImage
        src={market.loanIcon}
        symbol={market.loanSymbol}
        size={size}
        className="-ml-2"
      />
    </span>
  );
}
