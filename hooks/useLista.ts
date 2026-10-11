"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  MOOLAH_ADDRESS,
  MOOLAH_VIEW_ABI,
  MORPHO_ORACLE_ABI,
  borrowSharesToAssets,
  fetchListaStockMarkets,
  listaHealthFactor,
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
        abi: MORPHO_ORACLE_ABI,
        functionName: "price" as const,
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
    const [pos, acct, price] = read.data;
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
    const priceRaw = price.status === "success" ? (price.result as bigint) : 0n;
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
      healthFactor: listaHealthFactor(collateral, priceRaw, market.lltv, debtAssets),
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

  const detailContracts = useMemo(() => {
    if (!open.length) return [];
    const seenOracle = new Set<string>();
    const contracts: {
      address: `0x${string}`;
      abi: typeof MOOLAH_VIEW_ABI | typeof MORPHO_ORACLE_ABI;
      functionName: string;
      args?: readonly [`0x${string}`];
    }[] = [];
    for (const { market } of open) {
      contracts.push({
        address: MOOLAH_ADDRESS,
        abi: MOOLAH_VIEW_ABI,
        functionName: "market",
        args: [market.id],
      });
      if (!seenOracle.has(market.oracle.toLowerCase())) {
        seenOracle.add(market.oracle.toLowerCase());
        contracts.push({
          address: market.oracle,
          abi: MORPHO_ORACLE_ABI,
          functionName: "price",
        });
      }
    }
    return contracts;
  }, [open]);

  const detailRead = useReadContracts({
    contracts: detailContracts,
    query: {
      enabled: detailContracts.length > 0,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const detailData = detailRead.data as
    | readonly { status: string; result?: unknown }[]
    | undefined;

  const rows = useMemo(() => {
    if (!open.length) return [];
    let cursor = 0;
    const oracleIndex = new Map<string, number>();
    const marketIndex: number[] = [];
    for (const { market } of open) {
      marketIndex.push(cursor);
      cursor += 1;
      const key = market.oracle.toLowerCase();
      if (!oracleIndex.has(key)) {
        oracleIndex.set(key, cursor);
        cursor += 1;
      }
    }
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
      const acctRes = detailData[marketIndex[i]];
      const priceRes = detailData[oracleIndex.get(market.oracle.toLowerCase()) ?? -1];
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
        const priceRaw = priceRes?.status === "success" ? (priceRes.result as bigint) : 0n;
        healthFactor = listaHealthFactor(collateral, priceRaw, market.lltv, debtAssets);
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
  }, [open, detailData]);

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
