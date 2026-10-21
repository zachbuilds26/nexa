import { redirect } from "next/navigation";
import { earnKey } from "@/lib/earnKey";

export const instant = false;

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function EarnIndex({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const venue = typeof sp.venue === "string" ? sp.venue : undefined;
  const asset = typeof sp.asset === "string" ? sp.asset : undefined;

  // Legacy deep-links from the inline-selection era: /earn?venue=x&asset=y
  if ((venue === "venus" || venue === "native") && asset) {
    redirect(`/earn/${earnKey(venue, asset)}`);
  }

  redirect("/earn/pools");
}
