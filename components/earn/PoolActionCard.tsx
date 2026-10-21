"use client";

import { useMemo, useState } from "react";
import {
  useConnect,
  useConnection,
  useConnectors,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Check, ExternalLink, TriangleAlert } from "lucide-react";
import { WalletFilled } from "@/components/ui/WalletFilled";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountPill } from "@/components/ui/AmountPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { ERC20_ABI } from "@/lib/erc20";
import {
  VTOKEN_ABI,
  checkVenusAction,
  vTokensToUnderlying,
  venusClient,
} from "@/lib/venus";
import {
  VAULT_ABI,
  fetchNativeAccountStatus,
  fetchNativeActivationFeeWei,
  floorToGrid8,
  NATIVE_MIN_DEPOSIT_USD,
} from "@/lib/native";
import {
  fmtNumTrim,
  formatUnits,
  parseAmountToUnits,
  unitsToNumber,
} from "@/lib/format";
import { useVenusPosition } from "@/hooks/useVenus";
import { useNativeVault } from "@/hooks/useNative";
import { useYieldBalances, useYieldRows } from "@/hooks/useYield";

type Tab = "deposit" | "withdraw";

const TABS: { key: Tab; label: string }[] = [
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
];

/**
 * Deposit/withdraw panel for one yield pool, resolved from its URL key
 * (`venus-usdt`, `native-qqqb`). Self-contained: rows, wallet, allowance,
 * Venus/Native status checks and the whole tx state machine live here.
 */
export function PoolActionCard({ poolKey }: { poolKey: string }) {
  const { address, isConnected } = useConnection();
  const { mutate: connect, isPending: connecting } = useConnect();
  const connectors = useConnectors();

  const { rows, venus, vUSDT, loading, error, refetch } = useYieldRows();
  const selected = useMemo(
    () => rows.find((r) => r.key === poolKey),
    [rows, poolKey],
  );
  /** The Venus market this row lends into (per-row vToken, legacy = USDT). */
  const venusMarket = useMemo(() => {
    if (selected?.venue !== "venus" || !venus.data) return undefined;
    if (selected.vToken) {
      return venus.data.find((m) => m.vToken === selected.vToken);
    }
    return vUSDT;
  }, [selected, venus.data, vUSDT]);

  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const approveMut = useWriteContract();
  const actionMut = useWriteContract();
  const approveHash = approveMut.data;
  const actionHash = actionMut.data;
  const activeHash = actionHash ?? approveHash;
  const receipt = useWaitForTransactionReceipt({
    hash: activeHash,
    query: { enabled: Boolean(activeHash) },
  });
  const approveMined = Boolean(approveHash) && !actionHash && receipt.isSuccess;
  const actionMined = Boolean(actionHash) && receipt.isSuccess;
  const waitingReceipt = Boolean(activeHash) && receipt.isLoading;
  const txBusy =
    approveMut.isPending || actionMut.isPending || waitingReceipt || checking;
  const fastPoll = Boolean(activeHash);

  const position = useVenusPosition(
    address,
    venus.data,
    venus.dataUpdatedAt,
    fastPoll,
  );
  const balanceByKeyQ = useYieldBalances(rows, fastPoll);
  const balanceByKey = balanceByKeyQ.balanceByKey;
  const balancesLoading = balanceByKeyQ.isLoading;
  const balancesFailed = balanceByKeyQ.isError;
  const positionLoading = isConnected && position.isLoading;
  const positionFailed = isConnected && position.isError;

  const vault = useNativeVault();

  const spender =
    !selected
      ? undefined
      : selected.venue === "venus"
        ? venusMarket?.vToken
        : vault.data?.source === "runtime"
          ? vault.data.address
          : undefined;

  const allowanceRead = useReadContracts({
    contracts:
      selected?.token && spender && address
        ? [
            {
              address: selected.token,
              abi: ERC20_ABI,
              functionName: "allowance" as const,
              args: [address, spender],
            },
          ]
        : [],
    query: {
      enabled: Boolean(address && selected?.token && spender),
      staleTime: 5_000,
      refetchInterval: approveMined ? 2_000 : false,
    },
  });
  const allowance =
    (allowanceRead.data?.[0]?.result as bigint | undefined) ?? 0n;

  const nativeStateRead = useReadContracts({
    contracts:
      selected?.venue === "native" && vault.data && selected.token
        ? [
            {
              address: vault.data.address,
              abi: VAULT_ABI,
              functionName: "emergencyPaused" as const,
            },
            {
              address: vault.data.address,
              abi: VAULT_ABI,
              functionName: "isDepositPaused" as const,
              args: [selected.token],
            },
            {
              address: vault.data.address,
              abi: VAULT_ABI,
              functionName: "isSupportedUnderlying" as const,
              args: [selected.token],
            },
          ]
        : [],
    query: {
      enabled: Boolean(
        selected?.venue === "native" && vault.data && selected.token,
      ),
      staleTime: 60_000,
    },
  });
  const nativeEmergency = nativeStateRead.data?.[0]?.result as
    | boolean
    | undefined;
  const nativeDepositPaused = nativeStateRead.data?.[1]?.result as
    | boolean
    | undefined;
  const nativeSupported = nativeStateRead.data?.[2]?.result as
    | boolean
    | undefined;

  const walletBalance = selected
    ? (balanceByKey.get(selected.key) ?? 0n)
    : 0n;
  const decimals = selected?.decimals ?? 18;
  const unitAmount = parseAmountToUnits(amount, decimals);
  const priceUsd = selected?.priceUsd ?? null;

  const pos = position.data;
  const venusSuppliedVTokens =
    pos && venusMarket
      ? (pos.supplied.find((i) => i.vToken === venusMarket.vToken)?.amount ??
        0n)
      : 0n;
  const venusSupplied =
    venusMarket && venusSuppliedVTokens > 0n
      ? vTokensToUnderlying(venusSuppliedVTokens, venusMarket.exchangeRate)
      : 0n;
  const withdrawCap =
    selected?.venue === "venus" ? venusSupplied : walletBalance;

  const nativeExternalWithdraw =
    selected?.venue === "native" && tab === "withdraw";

  const needsApprove =
    tab === "deposit" &&
    unitAmount > 0n &&
    Boolean(selected?.token && spender) &&
    allowance < unitAmount;

  const depositUsd =
    priceUsd !== null
      ? unitsToNumber(unitAmount, decimals) * priceUsd
      : null;
  const belowNativeMin =
    selected?.venue === "native" &&
    tab === "deposit" &&
    depositUsd !== null &&
    depositUsd > 0 &&
    depositUsd < NATIVE_MIN_DEPOSIT_USD;

  const insufficient =
    unitAmount > 0n &&
    ((tab === "deposit" && unitAmount > walletBalance) ||
      (tab === "withdraw" && unitAmount > withdrawCap));
  const insufficientLabel =
    tab === "deposit"
      ? `Insufficient ${selected?.symbol ?? "balance"}`
      : venusSupplied <= 0n
        ? "Nothing supplied yet"
        : "Not enough supplied";

  const approvalConfirming = approveMined && needsApprove;
  const txError =
    approveMut.error?.message ?? actionMut.error?.message ?? checkError ?? null;

  function clearTx() {
    approveMut.reset();
    actionMut.reset();
    setCheckError(null);
  }

  function handleAmount(v: string) {
    if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
    if (approveMut.error || actionMut.error || checkError) clearTx();
  }

  function switchTab(next: Tab) {
    setTab(next);
    setAmount("");
    clearTx();
  }

  function setMax() {
    if (tab === "deposit") setAmount(formatUnits(walletBalance, decimals, 6));
    else setAmount(formatUnits(withdrawCap, decimals, 6));
  }

  async function handleAction() {
    if (txBusy) return;
    if (!isConnected) {
      const target = connectors.find((c) => c.id === "injected") ?? connectors[0];
      if (target) connect({ connector: target });
      return;
    }
    if (!address || !selected || unitAmount === 0n || nativeExternalWithdraw) {
      return;
    }

    if (needsApprove) {
      if (!selected.token || !spender) return;
      clearTx();
      approveMut.mutate({
        address: selected.token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, unitAmount],
      });
      return;
    }

    setCheckError(null);
    setChecking(true);
    try {
      if (selected.venue === "venus") {
        if (!venusMarket) {
          setCheckError("Venus market unavailable - try again.");
          return;
        }
        if (tab === "deposit") {
          const code = await checkVenusAction(
            "mint",
            venusMarket.vToken,
            address,
            unitAmount,
            venusMarket,
          );
          if (code !== null && code !== 0) {
            setCheckError(
              `Venus would reject this deposit (error code ${code}). Try a smaller amount.`,
            );
            return;
          }
          clearTx();
          actionMut.mutate({
            address: venusMarket.vToken,
            abi: VTOKEN_ABI,
            functionName: "mint",
            args: [unitAmount],
          });
        } else {
          const code = await checkVenusAction(
            "redeem",
            venusMarket.vToken,
            address,
            unitAmount,
            venusMarket,
          );
          if (code !== null && code !== 0) {
            setCheckError(
              `Venus would block this withdrawal (error code ${code}). Repay debt or withdraw less.`,
            );
            return;
          }
          clearTx();
          actionMut.mutate({
            address: venusMarket.vToken,
            abi: VTOKEN_ABI,
            functionName: "redeemUnderlying",
            args: [unitAmount],
          });
        }
        return;
      }

      // Native Pool deposit - the vault does not enforce most of these rules,
      // so every one of them is checked here before signing anything.
      if (tab !== "deposit") return;
      if (!vault.data || vault.data.source !== "runtime") {
        setCheckError(
          "Can't verify Native's live deposit contract right now - try again shortly.",
        );
        return;
      }
      if (!selected.token) {
        setCheckError("Asset address not loaded yet - try again.");
        return;
      }
      const vaultAddr = vault.data.address;
      let emergency: boolean;
      let depPaused: boolean;
      let supported: boolean;
      try {
        [emergency, depPaused, supported] = await Promise.all([
          venusClient.readContract({
            address: vaultAddr,
            abi: VAULT_ABI,
            functionName: "emergencyPaused",
          }),
          venusClient.readContract({
            address: vaultAddr,
            abi: VAULT_ABI,
            functionName: "isDepositPaused",
            args: [selected.token],
          }),
          venusClient.readContract({
            address: vaultAddr,
            abi: VAULT_ABI,
            functionName: "isSupportedUnderlying",
            args: [selected.token],
          }),
        ]);
      } catch {
        setCheckError("Native pool status checks failed - try again.");
        return;
      }
      if (emergency) {
        setCheckError("Native Pool deposits are paused (emergency stop).");
        return;
      }
      if (depPaused) {
        setCheckError("Deposits for this asset are paused on Native Pool.");
        return;
      }
      if (!supported) {
        setCheckError("This asset isn't supported by the Native vault.");
        return;
      }

      const floored = floorToGrid8(unitAmount, decimals);
      if (floored === 0n) {
        setCheckError(
          "Amount rounds down to zero on the pool's 8-decimal grid.",
        );
        return;
      }
      const flooredUsd =
        priceUsd !== null
          ? unitsToNumber(floored, decimals) * priceUsd
          : null;
      if (flooredUsd === null) {
        setCheckError("No price for this asset right now - try again.");
        return;
      }
      if (flooredUsd < NATIVE_MIN_DEPOSIT_USD) {
        setCheckError(
          `Minimum Native Pool deposit is $${NATIVE_MIN_DEPOSIT_USD}.`,
        );
        return;
      }

      let value = 0n;
      try {
        const status = await fetchNativeAccountStatus(address);
        if (!status.found) {
          value = await fetchNativeActivationFeeWei();
        }
      } catch {
        setCheckError(
          "Couldn't price the one-time activation fee - try again.",
        );
        return;
      }

      clearTx();
      actionMut.mutate({
        address: vaultAddr,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [selected.token, floored, 1n],
        value,
      });
    } finally {
      setChecking(false);
    }
  }

  let ctaLabel = "";
  let ctaDisabled = false;
  const unitSym = selected?.symbol ?? "";
  if (nativeExternalWithdraw) {
    ctaLabel = "";
    ctaDisabled = true;
  } else if (!isConnected) {
    ctaLabel = connecting ? "Connecting…" : "Connect wallet";
  } else if (!selected) {
    ctaLabel = loading ? "Loading pools…" : "Pool unavailable";
    ctaDisabled = true;
  } else if (selected.venue === "venus" && !venusMarket) {
    ctaLabel = venus.isLoading ? "Loading Venus market…" : "Market unavailable";
    ctaDisabled = true;
  } else if (
    positionFailed &&
    selected.venue === "venus" &&
    tab === "withdraw"
  ) {
    ctaLabel = "Position failed to load";
    ctaDisabled = true;
  } else if (
    balancesFailed &&
    (tab === "deposit" || selected.venue === "native")
  ) {
    ctaLabel = "Balance failed to load";
    ctaDisabled = true;
  } else if (
    positionLoading &&
    selected.venue === "venus" &&
    tab === "withdraw"
  ) {
    ctaLabel = "Loading position…";
    ctaDisabled = true;
  } else if (balancesLoading && (tab === "deposit" || selected.venue === "native")) {
    ctaLabel = "Reading balance…";
    ctaDisabled = true;
  } else if (unitAmount === 0n) {
    ctaLabel = "Enter an amount";
    ctaDisabled = true;
  } else if (selected.venue === "native" && tab === "deposit") {
    if (vault.isLoading || nativeStateRead.isLoading) {
      ctaLabel = "Checking Native Pool…";
      ctaDisabled = true;
    } else if (vault.isError || vault.data?.source !== "runtime") {
      ctaLabel = "Vault unverified";
      ctaDisabled = true;
    } else if (nativeEmergency || nativeDepositPaused) {
      ctaLabel = "Deposits paused";
      ctaDisabled = true;
    } else if (nativeSupported === false) {
      ctaLabel = "Asset not supported";
      ctaDisabled = true;
    } else if (belowNativeMin) {
      ctaLabel = `Minimum $${NATIVE_MIN_DEPOSIT_USD}`;
      ctaDisabled = true;
    } else {
      ctaLabel = "";
    }
  }
  if (!ctaLabel && !nativeExternalWithdraw && selected) {
    if (checking) {
      ctaLabel =
        selected.venue === "native"
          ? "Preparing deposit…"
          : "Checking with Venus…";
      ctaDisabled = true;
    } else if (checkError) {
      ctaLabel = "Blocked - see note";
      ctaDisabled = true;
    } else if (insufficient) {
      ctaLabel = insufficientLabel;
      ctaDisabled = true;
    } else if (approveMut.isPending) {
      ctaLabel = "Approving…";
      ctaDisabled = true;
    } else if (actionMut.isPending) {
      ctaLabel = "Confirm in wallet…";
      ctaDisabled = true;
    } else if (waitingReceipt) {
      ctaLabel = `${tab === "deposit" ? "Deposit" : "Withdrawal"} confirming…`;
      ctaDisabled = true;
    } else if (approvalConfirming) {
      ctaLabel = "Approval confirming…";
      ctaDisabled = true;
    } else if (needsApprove) {
      ctaLabel = `Approve ${unitSym}`;
    } else {
      ctaLabel =
        tab === "deposit" ? `Deposit ${unitSym}` : `Withdraw ${unitSym}`;
    }
  }

  return (
    <Card className="flex flex-col p-5 lg:flex-1">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-fill p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            aria-pressed={tab === t.key}
            disabled={txBusy}
            className={`rounded-full px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              tab === t.key
                ? "bg-accent/10 font-medium text-accent"
                : "font-normal text-dim hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !selected ? (
        <Skeleton className="mb-4 h-16 w-full" />
      ) : !selected ? (
        <div className="mb-4 rounded-xl border border-line bg-surface-1 px-4 py-5 text-center text-sm text-dim">
          {error ? (
            <span className="flex flex-col items-center gap-3">
              <span>Failed to load yield pools - check your connection.</span>
              <button
                type="button"
                onClick={refetch}
                className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fill"
              >
                Retry
              </button>
            </span>
          ) : rows.length === 0 ? (
            "No yield pool available right now."
          ) : (
            "This pool isn't listed right now."
          )}
        </div>
      ) : null}

      {nativeExternalWithdraw ? (
        <div className="space-y-3 rounded-xl border border-line bg-surface-1 p-4">
          <p className="text-xs leading-relaxed text-dim">
            Native Pool withdrawals are signed in Native&apos;s own app.
            Choose scheduled (waits{" "}
            {selected?.withdrawPendingSeconds
              ? Math.round(selected.withdrawPendingSeconds / 86_400)
              : 3}{" "}
            days) or instant (
            {selected?.instantFeeBps !== undefined
              ? fmtNumTrim(selected.instantFeeBps / 100)
              : 1}
            % fee).
          </p>
          <Button
            variant="secondary"
            className="group"
            onClick={() =>
              window.open(
                "https://app.native.org/pool?chain=bsc",
                "_blank",
                "noopener",
              )
            }
          >
            Open Native Pool
            <ExternalLink
              className="h-3.5 w-3.5 text-dim transition-colors group-hover:text-accent"
              strokeWidth={1.7}
            />
          </Button>
          <p className="text-xs leading-relaxed text-dim">
            Hand-off, not a swap: your wallet stays connected to the same
            account you deposited from.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-dim">
            <span>
              {tab === "deposit" ? "Amount to deposit" : "Amount to withdraw"}
            </span>
            <span className="flex items-center gap-2">
              <span className="tnum">
                {tab === "deposit"
                  ? `Bal ${
                      balancesLoading ? "…" : balancesFailed ? "-" : formatUnits(walletBalance, decimals, 4)
                    }`
                  : selected?.venue === "venus"
                    ? `Supplied ${
                        positionLoading ? "…" : positionFailed ? "-" : formatUnits(venusSupplied, decimals, 4)
                      }`
                    : `Bal ${
                        balancesLoading ? "…" : balancesFailed ? "-" : formatUnits(walletBalance, decimals, 4)
                      }`}
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
              aria-label={tab === "deposit" ? "Amount to deposit" : "Amount to withdraw"}
              className="tnum h-9 w-full min-w-0 bg-transparent text-xl font-semibold text-fg outline-none placeholder:text-dim/40"
            />
            <span className="flex shrink-0 items-center gap-1.5">
              <TokenImage
                address={selected?.token}
                symbol={unitSym || "?"}
                size={20}
              />
              <span className="text-sm font-semibold text-fg">
                {unitSym || "-"}
              </span>
            </span>
          </div>

          {selected?.venue === "native" &&
          selected.token &&
          nativeStateRead.data &&
          (nativeEmergency || nativeDepositPaused) ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
              <TriangleAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                strokeWidth={1.7}
              />
              <span>
                Native Pool deposits are paused for this asset right now.
              </span>
            </div>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-dim">
            {selected?.venue === "native" && tab === "deposit"
                ? `Deposits credit after Native's settlement cycle, usually a few minutes.`
              : tab === "deposit"
                ? `Supplies ${selected?.symbol ?? "USDT"} into Venus. Interest accrues per block.`
                : `Redeems supplied ${selected?.symbol ?? "USDT"}. Blocked if it would push your Venus health below 1.00.`}
          </p>

          {actionMined && actionHash ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-1 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-up">
                <Check className="h-3.5 w-3.5" strokeWidth={1.7} />
                {tab === "deposit" ? "Deposit" : "Withdrawal"} confirmed
              </span>
              <span className="flex items-center gap-3">
                <a
                  href={`https://bscscan.com/tx/${actionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  View
                  <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
                </a>
                <button
                  type="button"
                  onClick={clearTx}
                  className="text-xs text-dim transition-colors hover:text-fg"
                >
                  Dismiss
                </button>
              </span>
            </div>
          ) : null}

          {actionMined &&
          selected?.venue === "native" &&
          tab === "deposit" ? (
            <p className="mt-2 text-xs leading-relaxed text-dim">
              Native credits pool balances after its deposit cycle,
              usually a few minutes. Your balance updates when it lands.
            </p>
          ) : null}

          {txError ? (
            <p className="mt-3 break-words text-xs text-down">
              {txError.split("\n")[0].slice(0, 200)}
            </p>
          ) : null}

          {positionFailed || balancesFailed ||
          (selected?.venue === "native" &&
            tab === "deposit" &&
            !vault.isLoading &&
            (vault.isError || vault.data?.source !== "runtime")) ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-xs text-down">
              <span>
                {selected?.venue === "native" &&
                tab === "deposit" &&
                !vault.isLoading &&
                (vault.isError || vault.data?.source !== "runtime")
                  ? "Couldn't verify Native's live deposit contract."
                  : positionFailed && balancesFailed
                    ? "Position and balance failed to load."
                    : positionFailed
                      ? "Your Venus position failed to load."
                      : "Wallet balance failed to load."}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    selected?.venue === "native" &&
                    (vault.isError || vault.data?.source !== "runtime")
                  ) {
                    void vault.refetch();
                  }
                  if (positionFailed) void position.refetch();
                  if (balancesFailed) balanceByKeyQ.refetch();
                }}
                className="shrink-0 font-medium text-fg underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          <Button
            className="mt-4"
            onClick={() => void handleAction()}
            disabled={ctaDisabled || txBusy}
            loading={txBusy}
          >
            {!isConnected ? (
              <WalletFilled className="h-5 w-5" />
            ) : null}
            {ctaLabel}
          </Button>

          {activeHash ? (
            <a
              href={`https://bscscan.com/tx/${activeHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1 text-xs text-accent hover:underline"
            >
              {waitingReceipt
                ? "Transaction pending. View on BscScan"
                : "View last transaction"}
              <ExternalLink className="h-3 w-3" strokeWidth={1.7} />
            </a>
          ) : null}
        </>
      )}
    </Card>
  );
}
