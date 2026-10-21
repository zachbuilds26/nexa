"use client";

import { BorrowShell } from "@/components/borrow/BorrowShell";
import { ListaPositionsCard } from "@/components/borrow/ListaMarketsPanel";

export default function BorrowPositionsPage() {
  return (
    <BorrowShell view="positions">
      <div className="flex min-w-0 flex-col gap-6">
        <ListaPositionsCard />
      </div>
    </BorrowShell>
  );
}
