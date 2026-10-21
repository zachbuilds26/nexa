"use client";

import { TradeView } from "@/components/trade/TradeView";

export default function TradeChartPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <TradeView panel="chart" searchParams={props.searchParams} />;
}
