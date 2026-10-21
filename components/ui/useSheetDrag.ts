"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Drag-down-to-dismiss for mobile bottom sheets. Attach `handleProps` to the
 * grab handle and apply `translateY(dragY)` to the sheet. Releasing past
 * ~90px closes; anything shorter snaps back.
 */
export function useSheetDrag(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  return {
    dragY,
    dragging,
    handleProps: {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        startY.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        if (startY.current === null) return;
        const dy = e.clientY - startY.current;
        if (dy > 4 && !dragging) setDragging(true);
        if (dy > 0) setDragY(dy);
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        if (startY.current === null) return;
        const dy = e.clientY - startY.current;
        startY.current = null;
        setDragging(false);
        if (dy > 90) onClose();
        else setDragY(0);
      },
      onPointerCancel: () => {
        startY.current = null;
        setDragging(false);
        setDragY(0);
      },
    },
  };
}
