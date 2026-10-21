"use client";

/**
 * Horizontal range slider with accent thumb, used for the borrow LTV picker.
 * Native input styled via a wrapper class so the track and thumb match the
 * Nexa dark theme (globals.css .ltv-slider).
 */
export function LtvSlider({
  value,
  max,
  onChange,
  disabled = false,
}: {
  /** 0-100 */
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="ltv-slider-wrapper">
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Borrow percentage of max borrow"
        className="ltv-slider"
      />
    </div>
  );
}
