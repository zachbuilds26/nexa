/**
 * Faint 1px dot field on a 14px pitch at 10% white, faded out towards the
 * bottom with a mask so the band dissolves before the content gets dense.
 * Absolutely positioned inside a relative page wrapper, so it scrolls away
 * with the page - not fixed.
 */
export function DotsBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[180px]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.10) 1px, rgba(0, 0, 0, 0) 0px)",
        backgroundSize: "14px 14px",
        maskImage: "linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 72%)",
        WebkitMaskImage: "linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 72%)",
      }}
    />
  );
}
