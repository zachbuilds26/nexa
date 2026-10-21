"use client";

/** CSS border-triangle caret. Flips up when `open`. */
export function DropArrow({ open = false }: { open?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none shrink-0 transition-transform duration-150"
      style={{
        width: 0,
        height: 0,
        borderStyle: "solid",
        borderWidth: open ? "0 4px 5px 4px" : "5px 4px 0 4px",
        borderColor: open
          ? "transparent transparent currentColor transparent"
          : "transparent",
        ...(open ? {} : { borderTopColor: "currentColor" }),
      }}
    />
  );
}
