import { redirect } from "next/navigation";

// Redirect-only route: blocking is the intended behavior (instant = false
// is the documented opt-out for routes that cannot prerender a shell).
export const instant = false;

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function TradeIndex({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) for (const v of value) params.append(key, v);
  }
  const qs = params.toString();
  redirect(`/trade/swap${qs ? `?${qs}` : ""}`);
}
