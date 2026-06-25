"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { INDUSTRIES } from "@/lib/constants";
import { formatUsPhone } from "@/lib/phone";
import { useToast } from "@/components/Toast";
import type { Attendee } from "@/lib/types";

interface MemberEditorProps {
  member: Attendee;
  onClose: () => void;
  onSaved: () => void;
}

export function MemberEditor({ member, onClose, onSaved }: MemberEditorProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const [first, setFirst] = useState(member.first_name);
  const [last, setLast] = useState(member.last_name);
  const [company, setCompany] = useState(member.company ?? "");
  const [jobTitle, setJobTitle] = useState(member.job_title ?? "");
  const [industry, setIndustry] = useState(member.industry ?? INDUSTRIES[0]);
  const [phone, setPhone] = useState(
    member.phone ? formatUsPhone(member.phone) : "",
  );
  const [email, setEmail] = useState(member.email ?? "");
  const [openToContact, setOpenToContact] = useState(member.open_to_contact);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locate the portal node once after mount
    setTarget(document.getElementById("cfw-overlay"));
  }, []);

  if (!target) return null;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("attendees")
      .update({
        first_name: first.trim(),
        last_name: last.trim(),
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        industry,
        phone: phone.trim() || null,
        email: email.trim() || null,
        open_to_contact: openToContact,
      })
      .eq("id", member.id);

    if (error) {
      toast(error.message || "Couldn't save member");
      setSaving(false);
      return;
    }
    toast("Member updated");
    onSaved();
  }

  return createPortal(
    <div className="member-mask" onClick={onClose}>
      <div className="member-card" onClick={(e) => e.stopPropagation()}>
        <div className="member-head">Edit member</div>
        <div className="member-body">
          <div className="field">
            <label>First name</label>
            <input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="field">
            <label>Last name</label>
            <input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
          <div className="field">
            <label>Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="field">
            <label>Job title</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <span className="chev">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
          <div className="field">
            <label>Cell number</label>
            <input
              type="tel"
              inputMode="tel"
              maxLength={14}
              value={phone}
              onChange={(e) => setPhone(formatUsPhone(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="row-toggle">
            <div className="t">
              Open to being contacted
              <small>Show in the directory with text &amp; vCard</small>
            </div>
            <button
              type="button"
              aria-pressed={openToContact}
              className={`switch ${openToContact ? "on" : ""}`}
              onClick={() => setOpenToContact((v) => !v)}
            />
          </div>
        </div>
        <div className="member-foot">
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ color: "var(--slate)", borderColor: "var(--line)" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    target,
  );
}
