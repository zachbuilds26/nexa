import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronsUpDown } from "lucide-react";
import { TipLabel } from "@/components/ui/InfoTip";

export type SortCol = string;

/** Inline sortable column header for explorer tables. */
export function SortHeader({
  label,
  col,
  active,
  dir = "desc",
  onSort,
  align = "right",
  className = "",
  tip,
}: {
  label: string;
  col: SortCol;
  active: boolean;
  dir?: "asc" | "desc";
  onSort: (c: SortCol) => void;
  align?: "left" | "right";
  className?: string;
  tip?: string;
}) {
  return (
    <th
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 pb-2 font-medium ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg ${
          active ? "text-fg" : "text-dim"
        }`}
      >
        <TipLabel
          interactive={false}
          label={label}
          text={tip}
          align={align === "right" ? "right" : "left"}
        />
        {active ? (
          dir === "asc" ? (
            <ArrowUpNarrowWide className="h-3.5 w-3.5 -scale-x-100" strokeWidth={1.7} aria-hidden />
          ) : (
            <ArrowDownWideNarrow className="h-3.5 w-3.5 -scale-x-100" strokeWidth={1.7} aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" strokeWidth={1.7} aria-hidden />
        )}
      </button>
    </th>
  );
}
