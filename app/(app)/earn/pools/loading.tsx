import { ListPageSkeleton } from "@/components/ui/ListPageSkeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Earn"
      subtitle="Supply USDT, USDC, or a listed bStock into the Venus Core Pool or the Native Pool. Rates and TVL are read live from each pool."
      tabs={["Pools", "Deposits"]}
      active={0}
    />
  );
}
