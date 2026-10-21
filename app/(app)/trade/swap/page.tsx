"use client";

import { TradeView } from "@/components/trade/TradeView";

export default function TradeSwapPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <TradeView panel="swap" searchParams={props.searchParams} />;
}
