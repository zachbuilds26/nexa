import { ListPageSkeleton } from "@/components/ui/ListPageSkeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      title="Borrow"
      subtitle="Post a listed bStock as collateral and borrow stables against it, through Lista Lending on BNB Chain."
      tabs={["Markets", "Positions"]}
      active={1}
    />
  );
}
