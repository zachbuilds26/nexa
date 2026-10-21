"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { Info } from "lucide-react";

/**
 * Shared hover/tap explanation bubble. The bubble is `fixed` and clamped to
 * the viewport, so it stays fully readable on narrow screens and inside
 * scrollable / clipping containers.
 * - Desktop: hover or keyboard focus shows it; mouse leave hides it.
 * - Mobile: tap toggles; tap away (blur) dismisses it.
 * - align="right" anchors the bubble leftward (for right-aligned headers).
 */
function useTip(align: "left" | "right") {
  const id = useId();
  const [hover, setHover] = useState(false);
  const [tapped, setTapped] = useState(false);
  const visible = hover || tapped;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = bubbleRef.current?.offsetWidth ?? 224;
    const h = bubbleRef.current?.offsetHeight ?? 80;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    const below = r.bottom + 6;
    const fitsBelow = below + h <= window.innerHeight - 12;
    const top = fitsBelow ? below : Math.max(12, r.top - 6 - h);
    setPos({ left, top });
  }, [align]);

  useEffect(() => {
    if (!visible) return;
    place();
    const onChange = () => place();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [visible, place]);

  return { id, visible, tapped, setHover, setTapped, anchorRef, bubbleRef, pos };
}

function TipBubble({
  id,
  text,
  visible,
  pos,
  bubbleRef,
}: {
  id: string;
  text: string;
  visible: boolean;
  pos: { left: number; top: number } | null;
  bubbleRef: RefObject<HTMLSpanElement | null>;
}) {
  return (
    <span
      ref={bubbleRef}
      id={id}
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : undefined}
      className={`pointer-events-none fixed z-[70] w-56 rounded-xl border border-line bg-surface-4 px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-dim shadow-xl shadow-black/40 transition-opacity duration-150 ${
        visible && pos ? "opacity-100" : "opacity-0"
      }`}
    >
      {text}
    </span>
  );
}

export function InfoTip({
  text,
  align = "left",
}: {
  text: string;
  align?: "left" | "right";
}) {
  const { id, visible, tapped, setHover, setTapped, anchorRef, bubbleRef, pos } =
    useTip(align);

  return (
    <span
      ref={anchorRef}
      className="inline-flex shrink-0 items-center"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setHover(false);
      }}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label="More info"
        aria-expanded={tapped}
        aria-describedby={id}
        onClick={(e) => {
          e.stopPropagation();
          setTapped((o) => !o);
        }}
        onBlur={() => setTapped(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setTapped((o) => !o);
          }
          if (e.key === "Escape") setTapped(false);
        }}
        className="-m-1.5 cursor-help p-1.5 text-dim transition-colors hover:text-fg focus:text-fg focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <TipBubble id={id} text={text} visible={visible} pos={pos} bubbleRef={bubbleRef} />
    </span>
  );
}

/**
 * Label-style tip: the term itself carries a dotted underline and reveals the
 * bubble on hover, so tables don't sprout an info icon on every column.
 * - interactive (default): the underlined term is the trigger - tap / focus /
 *   Enter toggle the bubble. Use for standalone labels.
 * - interactive={false}: hover only, no extra focus stop. Use inside a button
 *   that already owns the click (e.g. sortable table headers).
 * - No `text` renders the label plain, with no underline and no bubble.
 */
export function TipLabel({
  label,
  text,
  align = "left",
  className = "",
  interactive = true,
}: {
  label: string;
  text?: string;
  align?: "left" | "right";
  className?: string;
  interactive?: boolean;
}) {
  const { id, visible, tapped, setHover, setTapped, anchorRef, bubbleRef, pos } =
    useTip(align);

  if (!text) return <span className={className}>{label}</span>;

  const deco = `cursor-help underline decoration-dotted underline-offset-[3px] ${className}`;

  return (
    <span
      ref={anchorRef}
      className="inline-flex min-w-0 items-center"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setHover(false);
      }}
    >
      {interactive ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="More info"
          aria-expanded={tapped}
          aria-describedby={id}
          onClick={(e) => {
            e.stopPropagation();
            setTapped((o) => !o);
          }}
          onBlur={() => setTapped(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setTapped((o) => !o);
            }
            if (e.key === "Escape") setTapped(false);
          }}
          className={`focus:outline-none ${deco}`}
        >
          {label}
        </span>
      ) : (
        <span className={deco}>{label}</span>
      )}
      <TipBubble id={id} text={text} visible={visible} pos={pos} bubbleRef={bubbleRef} />
    </span>
  );
}
