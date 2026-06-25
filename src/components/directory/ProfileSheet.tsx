"use client";

import { useEffect, useState } from "react";
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
