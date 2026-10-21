import { redirect } from "next/navigation";

export const instant = false;

export default async function LegacyStockPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  redirect(`/stocks/${address}`);
}
