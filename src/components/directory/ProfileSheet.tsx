"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { avatarGradient, initials } from "@/lib/constants";
import type { Attendee } from "@/lib/types";

interface ProfileSheetProps {
  attendee: Attendee | null;
  onClose: () => void;
  onSms: (a: Attendee) => void;
  onVcard: (a: Attendee) => void;
}

function DetailIcon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d={d} />
    </svg>
  );
}

export function ProfileSheet({
  attendee,
  onClose,
  onSms,
  onVcard,
}: ProfileSheetProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locate the portal node once after mount
    setTarget(document.getElementById("cfw-overlay"));
  }, []);

  if (!target || !attendee) return null;

  const a = attendee;
  const fullName = `${a.first_name} ${a.last_name}`;

  // Play the slide-out animation, then ask the parent to unmount us.
  const requestClose = () => setClosing(true);
  const handleAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      onClose();
    }
  };

  return createPortal(
    <>
      <div
        className={`sheetmask ${closing ? "closing" : ""}`}
        onClick={requestClose}
      />
      <div
        className={`sheet ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        onAnimationEnd={handleAnimationEnd}
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
            {[a.company, a.industry].filter(Boolean).join(" · ")}
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

        <div className="cta2">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => onSms(a)}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5Z" />
            </svg>{" "}
            Tap to text
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => onVcard(a)}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 15V3M12 15l-4-4M12 15l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>{" "}
            Save vCard
          </button>
        </div>

        <div className="detrows">
          {a.phone ? (
            <div className="detrow">
              <DetailIcon d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
              <span className="v">{a.phone}</span>
            </div>
          ) : null}
          {a.email ? (
            <div className="detrow">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <span className="v">{a.email}</span>
            </div>
          ) : null}
          {a.company ? (
            <div className="detrow">
              <DetailIcon d="M3 21V7l9-4 9 4v14M3 21h18M9 21v-5h6v5" />
              <span className="v">{a.company}</span>
            </div>
          ) : null}
          <div className="detrow">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l3 2" />
            </svg>
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
