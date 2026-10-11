"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  fetchNativeAccount,
  fetchNativePoolConfig,
  fetchNativeVault,
} from "@/lib/native";

export function useNativePoolConfig() {
  return useQuery({
    queryKey: ["native-pool-config"],
    queryFn: fetchNativePoolConfig,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

/** Runtime vault discovery (docs: never ship the address as a constant). */
export function useNativeVault() {
  return useQuery({
    queryKey: ["native-vault", 56],
    queryFn: () => fetchNativeVault(56),
    staleTime: 30 * 60_000,
  });
}

export function useNativeAccount(user: Address | undefined) {
  return useQuery({
    queryKey: ["native-account", user],
    queryFn: () => fetchNativeAccount(user as Address),
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
