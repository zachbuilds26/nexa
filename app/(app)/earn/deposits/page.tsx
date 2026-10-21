"use client";

import { EarnShell } from "@/components/earn/EarnShell";
import { EarnDepositsCard } from "@/components/earn/EarnDepositsCard";

export default function EarnDepositsPage() {
  return (
    <EarnShell view="deposits">
      <EarnDepositsCard />
    </EarnShell>
  );
}
