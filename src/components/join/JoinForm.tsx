"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Camera, Check, ChevronDown, Upload, UserRound } from "lucide-react";
import { createClient, SUPABASE_URL } from "@/utils/supabase/client";
import { formatUsPhone, isValidUsPhone } from "@/lib/phone";
import { INDUSTRIES, LOOKING_FOR } from "@/lib/constants";
import { identifyAttendee, track } from "@/lib/track";
import { useToast } from "@/components/Toast";
import type { Attendee, EventRow } from "@/lib/types";
import type { SiteContent } from "@/lib/content";

// Lazy-load the cropper (and react-easy-crop) only when a photo is picked.
const CropModal = dynamic(
  () => import("@/components/CropModal").then((m) => ({ default: m.CropModal })),
  { ssr: false },
);

interface JoinFormProps {
  event: EventRow | null;
  existing: Attendee | null;
  copy: SiteContent;
}

export function JoinForm({ event, existing, copy }: JoinFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const configured = Boolean(SUPABASE_URL);

  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(
    existing?.photo_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [first, setFirst] = useState(existing?.first_name ?? "");
  const [last, setLast] = useState(existing?.last_name ?? "");
  const [company, setCompany] = useState(existing?.company ?? "");
  const [jobTitle, setJobTitle] = useState(existing?.job_title ?? "");
  const [industry, setIndustry] = useState(existing?.industry ?? INDUSTRIES[0]);
  const [phone, setPhone] = useState(
    existing?.phone ? formatUsPhone(existing.phone) : "",
  );
  const [email, setEmail] = useState(existing?.email ?? "");
  const [openToContact, setOpenToContact] = useState(
    existing?.open_to_contact ?? true,
  );
  const [lookingFor, setLookingFor] = useState<string[]>(
    existing?.looking_for ?? [],
  );
  const [agreed, setAgreed] = useState(existing?.agreed_terms ?? false);
  const [saving, setSaving] = useState(false);

  const editing = Boolean(existing);

  /** Ensure we have a uid (middleware usually has signed us in anonymously). */
  async function ensureUid(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    if (data.user) return data.user.id;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) {
      toast("Couldn't start a session. Is anonymous sign-in enabled?");
      return null;
    }
    return anon.user?.id ?? null;
  }

  function toggleLooking(value: string) {
    setLookingFor((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!configured) {
      toast("Connect Supabase to upload photos");
      return;
    }
    // Open the crop/zoom step before uploading.
    const reader = new FileReader();
    reader.onload = () =>
      setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function uploadCropped(blob: Blob) {
    setCropSrc(null);
    if (!configured) return;

    setUploading(true);
    const uid = await ensureUid();
    if (!uid) {
      setUploading(false);
      return;
    }

    const path = `${uid}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("selfies")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      toast("Photo upload failed. Try a different image.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("selfies").getPublicUrl(path);
    setPhotoUrl(publicUrl);
    setUploading(false);
    toast("Looking good");
    void track(
      { eventId: event?.id ?? null, actorAttendeeId: existing?.id ?? null },
      "photo_uploaded",
    );
  }

  async function handleSubmit() {
    if (!configured) {
      toast("Connect Supabase to save your profile");
      return;
    }
    if (!first.trim()) {
      toast("Add your first name");
      return;
    }
    if (!last.trim()) {
      toast("Add your last name");
      return;
    }
    if (!company.trim()) {
      toast("Add your company");
      return;
    }
    if (!jobTitle.trim()) {
      toast("Add your job title");
      return;
    }
    if (!industry) {
      toast("Pick your industry");
      return;
    }
    if (!isValidUsPhone(phone)) {
      toast("Enter a valid 10-digit US cell number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast("Enter a valid email address");
      return;
    }
    if (!agreed) {
      toast("Please agree to the terms");
      return;
    }

    setSaving(true);
    const uid = await ensureUid();
    if (!uid) {
      setSaving(false);
      return;
    }

    const { data: saved, error } = await supabase
      .from("attendees")
      .upsert(
        {
          auth_uid: uid,
          event_id: event?.id ?? null,
          first_name: first.trim(),
          last_name: last.trim(),
          company: company.trim(),
          job_title: jobTitle.trim(),
          industry,
          phone: phone.trim(),
          email: email.trim(),
          photo_url: photoUrl,
          open_to_contact: openToContact,
          looking_for: lookingFor,
          agreed_terms: true,
        },
        { onConflict: "auth_uid,event_id" },
      )
      .select()
      .single();

    if (error || !saved) {
      toast(error?.message ?? "Couldn't save your profile");
      setSaving(false);
      return;
    }

    identifyAttendee(saved.id, {
      company: company.trim() || undefined,
      industry,
    });
    await track(
      { eventId: event?.id ?? null, actorAttendeeId: saved.id },
      "signup",
      { industry },
    );

    toast(editing ? "Profile updated" : "You're in the directory!");
    router.push("/directory");
    router.refresh();
  }

  return (
    <>
      <div className="hero">
        <h1>
          {copy.hero1}
          <br />
          <span className="fw">{copy.hero2}</span>
        </h1>
        <p className="sub">{copy.subtitle}</p>
        <div className="selfie-wrap">
          <div className="selfie">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Your selfie" />
            ) : (
              <UserRound size={46} strokeWidth={1.6} color="#cdd9e6" aria-hidden />
            )}
          </div>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={handlePhoto}
          />
          <input
            ref={uploadInput}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhoto}
          />
          <div className="selfie-btns">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={uploading}
              onClick={() => cameraInput.current?.click()}
            >
              <Camera size={17} strokeWidth={2} aria-hidden />
              {uploading ? "Uploading…" : "Take photo"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={uploading}
              onClick={() => uploadInput.current?.click()}
            >
              <Upload size={17} strokeWidth={2} aria-hidden />
              Upload
            </button>
          </div>
          <div className="selfie-hint">{copy.selfieHint}</div>
        </div>
      </div>

      <div className="form">
        <div className="steps">
          <span className="dot on" />
          <span className={`dot ${photoUrl ? "on" : ""}`} />
          <span className={`dot ${agreed ? "on" : ""}`} />
        </div>

        <div className="field">
          <label>First name</label>
          <input
            id="first"
            name="firstName"
            autoComplete="given-name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="First name"
          />
        </div>
        <div className="field">
          <label>Last name</label>
          <input
            id="last"
            name="lastName"
            autoComplete="family-name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Last name"
          />
        </div>
        <div className="field">
          <label>Company</label>
          <input
            id="company"
            name="organization"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
          />
        </div>
        <div className="field">
          <label>Job title</label>
          <input
            id="jobTitle"
            name="organization-title"
            autoComplete="organization-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Job title"
          />
        </div>
        <div className="field">
          <label>Industry</label>
          <select
            id="industry"
            name="industry"
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
            <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
        <div className="field">
          <label>Cell number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            maxLength={14}
            onChange={(e) => setPhone(formatUsPhone(e.target.value))}
            placeholder="(817) 555-0123"
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />
        </div>

        <div className="row-toggle">
          <div className="t">
            Open to being contacted
            <small>Let attendees text &amp; save your card</small>
          </div>
          <button
            type="button"
            aria-pressed={openToContact}
            className={`switch ${openToContact ? "on" : ""}`}
            onClick={() => setOpenToContact((v) => !v)}
          />
        </div>

        <div className="lookfor">
          <div className="h">What are you looking for?</div>
          <div className="chips">
            {LOOKING_FOR.map((value) => (
              <button
                type="button"
                key={value}
                className={`chip ${lookingFor.includes(value) ? "on" : ""}`}
                onClick={() => toggleLooking(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="agree">
          <button
            type="button"
            aria-pressed={agreed}
            className={`cbx ${agreed ? "on" : ""}`}
            onClick={() => setAgreed((v) => !v)}
          >
            <Check size={13} strokeWidth={3} aria-hidden />
          </button>
          <div>
            I agree to the <a>Terms</a> &amp; <a>Privacy Policy</a>, and consent
            to appear in the attendee directory.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginBottom: 14 }}
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving
            ? "Saving…"
            : editing
              ? "Update my profile →"
              : "Join the directory →"}
        </button>
      </div>

      {cropSrc ? (
        <CropModal
          image={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={uploadCropped}
        />
      ) : null}
    </>
  );
}
