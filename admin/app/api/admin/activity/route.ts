import { NextResponse } from "next/server";
import { readActivity } from "@/lib/activity";
import { fetchTokenMap, humanAmount, swapUsd } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), 500);
  try {
    const [rows, tokenMap] = await Promise.all([readActivity(limit), fetchTokenMap()]);
    const items = rows.map((r) => {
      const info = tokenMap.get(r.sell.toLowerCase());
      const human = humanAmount(r.amount, info);
      return {
        ...r,
        amountHuman: human?.amount ?? null,
        symbol: human?.symbol ?? null,
        usd: swapUsd(r, tokenMap),
      };
    });
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "activity log unreadable" }, { status: 500 });
  }
}
