"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

const REVEAL = 132; // two 66px action buttons

interface SwipeRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Swipe a row left to reveal Edit + Delete actions (organizer-only).
 * Vertical drags scroll the list (touch-action: pan-y); horizontal drags swipe.
 */
export function SwipeRow({ children, onEdit, onDelete }: SwipeRowProps) {
  const [tx, setTx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const baseX = useRef(0);
  const mode = useRef<"idle" | "h" | "v">("idle");
  const swiped = useRef(false);

  function close() {
    setTx(0);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseX.current = tx;
    mode.current = "idle";
    swiped.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (mode.current === "idle") {
      if (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy)) {
        mode.current = "h";
        setDragging(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* synthetic / no active pointer */
        }
      } else if (Math.abs(dy) > 8) {
        mode.current = "v"; // let the list scroll
        return;
      } else {
        return;
      }
    }
    if (mode.current === "h") {
      swiped.current = true;
      setTx(Math.min(0, Math.max(-REVEAL, baseX.current + dx)));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    if (mode.current === "h") {
      const pos = baseX.current + (e.clientX - startX.current);
      setTx(pos < -REVEAL / 2 ? -REVEAL : 0);
    }
    mode.current = "idle";
    setDragging(false);
  }
  // Swallow the tap that ends a swipe (or taps while open) so it doesn't also
  // open the profile; instead it closes the row.
  function onClickCapture(e: React.MouseEvent) {
    if (swiped.current || tx !== 0) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
      setTx(0);
    }
  }

  return (
    <div className="swipe-row">
      <div className="swipe-actions" aria-hidden={tx === 0}>
        <button
          type="button"
          className="swipe-act edit"
          tabIndex={tx === 0 ? -1 : 0}
          onClick={() => {
            close();
            onEdit();
          }}
        >
          <Pencil size={18} strokeWidth={2} aria-hidden />
          Edit
        </button>
        <button
          type="button"
          className="swipe-act del"
          tabIndex={tx === 0 ? -1 : 0}
          onClick={() => {
            close();
            onDelete();
          }}
        >
          <Trash2 size={18} strokeWidth={2} aria-hidden />
          Delete
        </button>
      </div>
      <div
        className="swipe-card"
        style={{
          transform: `translateX(${tx}px)`,
          transition: dragging ? "none" : "transform 0.25s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
