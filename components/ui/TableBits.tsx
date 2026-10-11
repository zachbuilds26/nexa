import { InfoTip } from "@/components/ui/InfoTip";

export type SortCol = string;

/** Inline sortable column header for explorer tables. */
export function SortHeader({
  label,
  col,
  active,
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
        {label}
        {tip ? <InfoTip text={tip} align={align === "right" ? "right" : "left"} /> : null}
      </button>
    </th>
  );
}
