"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  LISTA_ORACLE_ABI,
  MOOLAH_ADDRESS,
  MOOLAH_VIEW_ABI,
  borrowSharesToAssets,
  fetchListaStockMarkets,
  listaHealthFactor,
  oraclePriceRaw,
  type ListaMarket,
  type ListaUserPosition,
} from "@/lib/lista";

export function useListaMarkets() {
  return useQuery({
    queryKey: ["lista-markets"],
    queryFn: fetchListaStockMarkets,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * One user's position on one Lista market: on-chain position() plus live
 * market accounting and oracle price, combined into collateral, debt and HF.
 */
export function useListaUserPosition(
  market: ListaMarket | undefined,
  user: `0x${string}` | undefined,
) {
  const contracts = useMemo(() => {
    if (!market || !user) return [];
    return [
      {
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_VIEW_ABI,
        functionName: "position" as const,
        args: [market.id, user] as const,
      },
      {
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_VIEW_ABI,
        functionName: "market" as const,
        args: [market.id] as const,
      },
      {
        address: market.oracle,
        abi: LISTA_ORACLE_ABI,
        functionName: "peek" as const,
        args: [market.collateralAddress] as const,
      },
      {
        address: market.oracle,
        abi: LISTA_ORACLE_ABI,
        functionName: "peek" as const,
        args: [market.loanAddress] as const,
      },
    ];
  }, [market, user]);

  const read = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(market && user),
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  const data = useMemo<ListaUserPosition | undefined>(() => {
    if (!market || !read.data) return undefined;
    const [pos, acct, collPeek, loanPeek] = read.data;
    if (pos.status !== "success" || acct.status !== "success") return undefined;
    const [, borrowShares, collateral] = pos.result as unknown as [
      bigint,
      bigint,
      bigint,
    ];
    const [, , totalBorrowAssets, totalBorrowShares] = acct.result as unknown as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      number,
    ];
    const collUsd =
      collPeek.status === "success" ? (collPeek.result as bigint) : 0n;
    const loanUsd =
      loanPeek.status === "success" ? (loanPeek.result as bigint) : 0n;
    const priceOk = collUsd > 0n && loanUsd > 0n;
    const priceRaw = priceOk ? oraclePriceRaw(collUsd, loanUsd) : 0n;
    const debtAssets = borrowSharesToAssets(borrowShares, {
      totalSupplyAssets: 0n,
      totalBorrowAssets,
      totalBorrowShares,
    });
    return {
      collateral,
      borrowShares,
      debtAssets,
      priceRaw,
      // A failed oracle read must not render HF 0.00 (which reads as
      // "about to be liquidate"); null = unknown, shown as "-".
      healthFactor: priceOk
        ? listaHealthFactor(collateral, priceRaw, market.lltv, debtAssets)
        : null,
    };
  }, [market, read.data]);

  return { ...read, data };
}

/** Position multicall across every market in the list (Positions tab). */
export function useListaAllPositions(
  markets: ListaMarket[] | undefined,
  user: `0x${string}` | undefined,
) {
  const positionContracts = useMemo(() => {
    if (!markets || !user) return [];
    return markets.map((m) => ({
      address: MOOLAH_ADDRESS,
      abi: MOOLAH_VIEW_ABI,
      functionName: "position" as const,
      args: [m.id, user] as const,
    }));
  }, [markets, user]);

  const posRead = useReadContracts({
    contracts: positionContracts,
    query: {
      enabled: Boolean(markets && user && markets.length > 0),
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const open = useMemo(() => {
    if (!markets || !posRead.data) return [];
    const out: { market: ListaMarket; collateral: bigint; borrowShares: bigint }[] =
      [];
    markets.forEach((m, i) => {
      const res = posRead.data[i];
      if (res?.status !== "success") return;
      const [, borrowShares, collateral] = res.result as unknown as [
        bigint,
        bigint,
        bigint,
      ];
      if (collateral > 0n || borrowShares > 0n) out.push({ market: m, collateral, borrowShares });
    });
    return out;
  }, [markets, posRead.data]);

  const detailPlan = useMemo(() => {
    const contracts: {
      address: `0x${string}`;
      abi: typeof MOOLAH_VIEW_ABI | typeof LISTA_ORACLE_ABI;
      functionName: string;
      args?: readonly [`0x${string}`];
    }[] = [];
    const marketIndex: number[] = [];
    const pairIndex: { coll: number; loan: number }[] = [];
    const seenPrice = new Map<string, number>();
    for (const { market } of open) {
      marketIndex.push(contracts.length);
      contracts.push({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_VIEW_ABI,
        functionName: "market",
        args: [market.id],
      });
      const pair = { coll: -1, loan: -1 };
      const tokens = [
        ["coll", market.collateralAddress],
        ["loan", market.loanAddress],
      ] as const;
      for (const [slot, token] of tokens) {
        const key = `${market.oracle.toLowerCase()}:${token.toLowerCase()}`;
        let idx = seenPrice.get(key);
        if (idx === undefined) {
          idx = contracts.length;
          seenPrice.set(key, idx);
          contracts.push({
            address: market.oracle,
            abi: LISTA_ORACLE_ABI,
            functionName: "peek",
            args: [token],
          });
        }
        pair[slot] = idx;
      }
      pairIndex.push(pair);
    }
    return { contracts, marketIndex, pairIndex };
  }, [open]);

  const detailRead = useReadContracts({
    contracts: detailPlan.contracts,
    query: {
      enabled: detailPlan.contracts.length > 0,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const detailData = detailRead.data as
    | readonly { status: string; result?: unknown }[]
    | undefined;

  const rows = useMemo(() => {
    if (!open.length) return [];
    if (!detailData) {
      return open.map(({ market, collateral, borrowShares }) => ({
        market,
        collateral,
        borrowShares,
        debtAssets: 0n,
        healthFactor: null as number | null,
        ready: false,
      }));
    }
    return open.map(({ market, collateral, borrowShares }, i) => {
      const acctRes = detailData[detailPlan.marketIndex[i]];
      const pair = detailPlan.pairIndex[i];
      const collRes = detailData[pair.coll];
      const loanRes = detailData[pair.loan];
      let debtAssets = 0n;
      let healthFactor: number | null = null;
      if (acctRes?.status === "success") {
        const [, , totalBorrowAssets, totalBorrowShares] = acctRes.result as unknown as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          number,
        ];
        debtAssets = borrowSharesToAssets(borrowShares, {
          totalSupplyAssets: 0n,
          totalBorrowAssets,
          totalBorrowShares,
        });
        const collUsd =
          collRes?.status === "success" ? (collRes.result as bigint) : 0n;
        const loanUsd =
          loanRes?.status === "success" ? (loanRes.result as bigint) : 0n;
        // Same rule as useListaUserPosition: unread oracle -> HF unknown.
        healthFactor =
          collUsd > 0n && loanUsd > 0n
            ? listaHealthFactor(
                collateral,
                oraclePriceRaw(collUsd, loanUsd),
                market.lltv,
                debtAssets,
              )
            : null;
      }
      return {
        market,
        collateral,
        borrowShares,
        debtAssets,
        healthFactor,
        ready: acctRes?.status === "success",
      };
    });
  }, [open, detailData, detailPlan]);

  return {
    rows,
    isLoading: posRead.isLoading || detailRead.isLoading,
    isError: posRead.isError || detailRead.isError,
    refetch: () => {
      void posRead.refetch();
      void detailRead.refetch();
    },
  };
}
