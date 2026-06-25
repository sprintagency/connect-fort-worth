"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  Building2,
  CircleCheck,
  CircleSlash,
  Download,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { avatarGradient, initials } from "@/lib/constants";
import type { Attendee } from "@/lib/types";

interface ProfileSheetProps {
  attendee: Attendee | null;
  onClose: () => void;
  onSms: (a: Attendee) => void;
  onVcard: (a: Attendee) => void;
}

const DISMISS_THRESHOLD = 120;

export function ProfileSheet({
  attendee,
  onClose,
  onSms,
  onVcard,
}: ProfileSheetProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const startY = useRef(0);
  const dragYRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locate the portal node once after mount
    setTarget(document.getElementById("cfw-overlay"));
  }, []);

  useEffect(() => {
    // Slide up on mount (rAF defers the state update out of the effect body).
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!target || !attendee) return null;
  const a = attendee;
  const fullName = `${a.first_name} ${a.last_name}`;

  function beginClose() {
    draggingRef.current = false;
    setDragging(false);
    setClosing(true);
  }
  function handleTransitionEnd() {
    if (closing) onClose();
  }

  function onPointerDown(e: React.PointerEvent) {
    if (closing) return;
    startY.current = e.clientY;
    draggingRef.current = true;
    setDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore (e.g. synthetic events with no active pointer)
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const dy = Math.max(0, e.clientY - startY.current);
    dragYRef.current = dy;
    setDragY(dy);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (dragYRef.current > DISMISS_THRESHOLD) {
      beginClose();
    } else {
      dragYRef.current = 0;
      setDragY(0);
    }
  }

  const translateY = closing
    ? "100%"
    : dragging || dragY > 0
      ? `${dragY}px`
      : open
        ? "0px"
        : "100%";
  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${translateY})`,
    transition: dragging
      ? "none"
      : "transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1)",
  };
  const maskStyle: React.CSSProperties = {
    opacity: closing ? 0 : open ? Math.max(0, 1 - dragY / 480) : 0,
    transition: dragging ? "none" : "opacity 0.34s ease",
  };

  return createPortal(
    <>
      <div className="sheetmask" style={maskStyle} onClick={beginClose} />
      <div
        className="sheet"
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        onTransitionEnd={handleTransitionEnd}
      >
        <div
          className="sheet-handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="grab" />
          <div className="ph-top">
            <div
              className="bigav"
              style={
                a.photo_url ? undefined : { background: avatarGradient(a.id) }
              }
            >
              {a.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photo_url} alt="" />
              ) : (
                initials(a.first_name, a.last_name)
              )}
            </div>
            <h2>{fullName}</h2>
            <div className="role">
              {a.job_title || a.company || a.industry}
            </div>
            {a.looking_for.length > 0 ? (
              <div className="lf">
                {a.looking_for.map((x) => (
                  <span className="c" key={x}>
                    {x}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="cta2">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => onSms(a)}
          >
            <MessageCircle size={17} strokeWidth={2} aria-hidden /> Tap to text
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => onVcard(a)}
          >
            <Download size={17} strokeWidth={2} aria-hidden /> Save vCard
          </button>
        </div>

        <div className="detrows">
          {a.phone ? (
            <div className="detrow">
              <Phone size={18} strokeWidth={2} aria-hidden />
              <span className="v">{a.phone}</span>
            </div>
          ) : null}
          {a.email ? (
            <div className="detrow">
              <Mail size={18} strokeWidth={2} aria-hidden />
              <span className="v">{a.email}</span>
            </div>
          ) : null}
          {a.company ? (
            <div className="detrow">
              <Building2 size={18} strokeWidth={2} aria-hidden />
              <span className="v">{a.company}</span>
            </div>
          ) : null}
          {a.industry ? (
            <div className="detrow">
              <Briefcase size={18} strokeWidth={2} aria-hidden />
              <span className="v">{a.industry}</span>
            </div>
          ) : null}
          <div className="detrow">
            {a.open_to_contact ? (
              <CircleCheck size={18} strokeWidth={2} aria-hidden />
            ) : (
              <CircleSlash size={18} strokeWidth={2} aria-hidden />
            )}
            <span className={`v ${a.open_to_contact ? "lk" : ""}`}>
              {a.open_to_contact
                ? "Open to be contacted"
                : "Prefers not to be contacted"}
            </span>
          </div>
        </div>

        <div className="fine">
          Saving a vCard agrees to keep this contact for personal networking
          only.
        </div>
      </div>
    </>,
    target,
  );
}
