"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type UTCTimestamp,
} from "lightweight-charts";
import { Skeleton } from "@/components/ui/Skeleton";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const UP = "#34d399";
const DOWN = "#fb7185";
const GRID = "rgba(233, 233, 236, 0.09)";
const TEXT = "#9d9da6";

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export function StockChart({
  candles,
  loading = false,
  error = false,
  onRetry,
  timeVisible = false,
  height = 260,
}: {
  candles: Candle[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  timeVisible?: boolean;
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const first = candles.length ? candles[0].close : null;
  const last = candles.length ? candles[candles.length - 1].close : null;
  const periodUp = first !== null && last !== null && last >= first;
  const color = periodUp ? UP : DOWN;

  useEffect(() => {
    const el = boxRef.current;
    if (!el || candles.length < 2) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: TEXT,
        fontSize: 12,
        fontFamily: "Sora",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID, style: LineStyle.LargeDashed },
        horzLines: { color: GRID, style: LineStyle.LargeDashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(233, 233, 236, 0.22)",
          labelBackgroundColor: "#1c1c20",
        },
        horzLine: {
          color: "rgba(233, 233, 236, 0.22)",
          labelBackgroundColor: "#1c1c20",
        },
      },
      rightPriceScale: {
        borderColor: "transparent",
        scaleMargins: { top: 0.16, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "transparent",
        timeVisible,
      },
      handleScale: { axisPressedMouseMove: { time: false } },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: hexAlpha(color, 0.28),
      bottomColor: hexAlpha(color, 0.02),
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (p: number) => `$${Number(p.toFixed(2))}`,
      },
    });

    series.setData(
      candles.map((c) => ({
        time: Math.floor(c.time) as UTCTimestamp,
        value: c.close,
      })),
    );
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [candles, timeVisible, color]);

  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-line bg-surface-1 text-sm text-dim"
        style={{ height }}
      >
        <span>Chart data failed to load.</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fill"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  if (candles.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-line bg-surface-1 text-sm text-dim"
        style={{ height }}
      >
        No chart data yet.
      </div>
    );
  }

  return <div ref={boxRef} className="w-full" style={{ height }} />;
}
