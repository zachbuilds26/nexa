"use client";

import { useMemo } from "react";
import { TokenImage } from "@/components/ui/TokenImage";
import { USDT_BSC, USDC_BSC, WBNB_BSC } from "@/lib/erc20";
import type { Stock } from "@/lib/rwa";

type AmbBlob = {
  left: string;
  top: string;
  size: number;
  blur: number;
  opacity: number;
  dur: number;
};

const BLOBS: AmbBlob[] = [
  { left: "1%", top: "10%", size: 120, blur: 14, opacity: 0.5, dur: 11 },
  { left: "7%", top: "56%", size: 88, blur: 10, opacity: 0.45, dur: 13 },
  { left: "16%", top: "33%", size: 56, blur: 7, opacity: 0.4, dur: 9 },
  { left: "84%", top: "8%", size: 108, blur: 13, opacity: 0.5, dur: 12 },
  { left: "90%", top: "52%", size: 72, blur: 8, opacity: 0.45, dur: 10 },
  { left: "78%", top: "76%", size: 96, blur: 12, opacity: 0.45, dur: 14 },
  { left: "30%", top: "84%", size: 64, blur: 8, opacity: 0.35, dur: 12 },
  { left: "61%", top: "5%", size: 56, blur: 7, opacity: 0.35, dur: 9 },
];

const STABLES = [
  { address: USDT_BSC, symbol: "USDT" },
  { address: USDC_BSC, symbol: "USDC" },
  { address: WBNB_BSC, symbol: "WBNB" },
];

export function AmbientTokens({ stocks }: { stocks?: Stock[] }) {
  const tokens = useMemo(() => {
    const list: { address?: string; symbol: string }[] = [];
    const picked = (stocks ?? []).filter((_, i) => i % 7 === 2).slice(0, 5);
    let stable = 0;
    for (let i = 0; i < BLOBS.length; i += 1) {
      if (i % 3 === 1 || picked.length === 0) {
        list.push(STABLES[stable % STABLES.length]);
        stable += 1;
      } else {
        const s = picked[(i / 2) | 0];
        list.push({
          address: s?.contractAddress ?? STABLES[0].address,
          symbol: s?.symbol ?? STABLES[0].symbol,
        });
      }
    }
    return list;
  }, [stocks]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      {BLOBS.map((b, i) => {
        const t = tokens[i] ?? STABLES[0];
        return (
          <div
            key={i}
            className="absolute animate-[float_ease-in-out_infinite] mix-blend-screen motion-reduce:animate-none"
            style={{
              left: b.left,
              top: b.top,
              opacity: b.opacity,
              filter: `blur(${b.blur}px)`,
              animationDuration: `${b.dur}s`,
              animationDelay: `-${i * 1.6}s`,
            }}
          >
            <TokenImage address={t.address} symbol={t.symbol} size={b.size} />
          </div>
        );
      })}
    </div>
  );
}
