"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Mobile-only floating column pager: a sliding window of two data columns so
 * small screens can reach every numeric column (choice-style chevrons pinned
 * to the table edges). Desktop shows all columns via sm:table-cell.
 */
export function windowVisible(index: number, page: number): boolean {
  return index >= page && index <= page + 1;
}

export function ColPager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const btn =
    "absolute top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-4 text-dim shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-colors hover:bg-fill-strong hover:text-accent sm:hidden";
  return (
    <>
      {page > 0 ? (
        <button
          type="button"
          aria-label="Previous columns"
          onClick={() => onPage(page - 1)}
          className={`${btn} left-1.5`}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
        </button>
      ) : null}
      {page < pages - 1 ? (
        <button
          type="button"
          aria-label="More columns"
          onClick={() => onPage(page + 1)}
          className={`${btn} right-1.5`}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
        </button>
      ) : null}
    </>
  );
}
