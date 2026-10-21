"use client";

import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";

type PublicSettings = {
  ok: boolean;
  maintenance: { enabled: boolean; message: string };
};

/**
 * Site-wide maintenance notice driven by the admin console
 * (Settings -> Maintenance banner). Renders nothing unless the admin is
 * running and the banner is switched on, so production behavior without
 * an admin is unchanged.
 */
export function MaintenanceBanner() {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL;

  const { data } = useQuery({
    queryKey: ["admin-settings"],
    enabled: !!base,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<PublicSettings | null> => {
      try {
        const res = await fetch(`${base}/api/public/settings`, {
          signal: AbortSignal.timeout(4_000),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as PublicSettings;
        if (!json?.ok || !json.maintenance) return null;
        return json;
      } catch {
        return null;
      }
    },
  });

  if (!data?.maintenance?.enabled) return null;
  const message = data.maintenance.message.trim();

  return (
    <div className="flex items-center justify-center gap-2 border-b border-line bg-surface-3 px-4 py-3 text-sm">
      <TriangleAlert className="h-4 w-4 shrink-0 text-warn" strokeWidth={1.7} />
      <span className="text-fg">
        {message || "Scheduled maintenance in progress. Some data may be delayed."}
      </span>
    </div>
  );
}
