"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Camera, Check, ChevronDown, Upload, UserRound } from "lucide-react";
import { createClient, SUPABASE_URL } from "@/utils/supabase/client";
import { formatUsPhone, isValidUsPhone } from "@/lib/phone";
import { INDUSTRIES, LOOKING_FOR } from "@/lib/constants";
import { identifyAttendee, track } from "@/lib/track";
import { useToast } from "@/components/Toast";
import type { EventRow, Profile } from "@/lib/types";
import type { SiteContent } from "@/lib/content";

// Lazy-load the cropper (and react-easy-crop) only when a photo is picked.
const CropModal = dynamic(
  () => import("@/components/CropModal").then((m) => ({ default: m.CropModal })),
  { ssr: false },
);

interface JoinFormProps {
  /** "create" = logged-out account creation; "edit" = signed-in profile editor. */
  mode: "create" | "edit";
  event: EventRow | null;
  /** Persistent profile to seed the form in edit mode (null when creating). */
  profile: Profile | null;
  copy: SiteContent;
  /** Create mode only: flip the parent AuthPanel to the sign-in view. */
  onSwitchToSignIn?: () => void;
}

const MIN_PASSWORD = 8;

export function JoinForm({
  mode,
  event,
  profile,
  copy,
  onSwitchToSignIn,
}: JoinFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const configured = Boolean(SUPABASE_URL);
  const creating = mode === "create";

  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  // Existing (already uploaded) photo, plus a deferred crop awaiting submit.
  const photoUrl = profile?.photo_url ?? null;
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [first, setFirst] = useState(profile?.first_name ?? "");
  const [last, setLast] = useState(profile?.last_name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [industry, setIndustry] = useState(profile?.industry ?? INDUSTRIES[0]);
  const [phone, setPhone] = useState(
    profile?.phone ? formatUsPhone(profile.phone) : "",
  );
  const [email, setEmail] = useState(profile?.email ?? "");
  const [offering, setOffering] = useState(profile?.offering ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [openToContact, setOpenToContact] = useState(
    profile?.open_to_contact ?? true,
  );
  const [lookingFor, setLookingFor] = useState<string[]>(
    profile?.looking_for ?? [],
  );
  const [agreed, setAgreed] = useState(profile?.agreed_terms ?? false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Revoke the object URL when it changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownPhoto = previewUrl ?? photoUrl;

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
    // Open the crop/zoom step; the actual upload is deferred to submit so it
    // happens under the authenticated user (works during account creation too).
    const reader = new FileReader();
    reader.onload = () =>
      setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handleCropped(blob: Blob) {
    setCropSrc(null);
    setPendingBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    toast("Looking good");
  }

  /** Upload the pending crop (if any) under uid; returns the URL to persist. */
  async function resolvePhotoUrl(uid: string): Promise<string | null> {
    if (!pendingBlob) return photoUrl;
    const path = `${uid}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("selfies")
      .upload(path, pendingBlob, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      toast("Photo upload failed - saving without it for now.");
      return photoUrl;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("selfies").getPublicUrl(path);
    return publicUrl;
  }

  function validate(): boolean {
    if (!configured) {
      toast("Connect Supabase to save your profile");
      return false;
    }
    if (!first.trim()) return toastFail("Add your first name");
    if (!last.trim()) return toastFail("Add your last name");
    if (!company.trim()) return toastFail("Add your company");
    if (!jobTitle.trim()) return toastFail("Add your job title");
    if (!industry) return toastFail("Pick your industry");
    if (!isValidUsPhone(phone)) {
      return toastFail("Enter a valid 10-digit US cell number");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toastFail("Enter a valid email address");
    }
    if (creating) {
      if (password.length < MIN_PASSWORD) {
        return toastFail(`Use a password of at least ${MIN_PASSWORD} characters`);
      }
      if (password !== confirm) return toastFail("Passwords don't match");
    }
    if (!agreed) return toastFail("Please agree to the terms");
    return true;
  }

  function toastFail(message: string): boolean {
    toast(message);
    return false;
  }

  /** Shared field payload for both profiles (memory) and attendees (snapshot). */
  function fieldPayload(photo: string | null) {
    return {
      first_name: first.trim(),
      last_name: last.trim(),
      company: company.trim() || null,
      job_title: jobTitle.trim() || null,
      industry,
      phone: phone.trim() || null,
      email: email.trim() || null,
      photo_url: photo,
      open_to_contact: openToContact,
      looking_for: lookingFor,
      offering: offering.trim() || null,
      agreed_terms: true,
    };
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    let uid: string;
    if (creating) {
      // Clear any leftover anonymous session before creating the real account.
      const { data: cur } = await supabase.auth.getUser();
      if (cur.user?.is_anonymous) await supabase.auth.signOut();

      const { data: signUp, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          toast("That email already has an account - sign in instead.");
          onSwitchToSignIn?.();
        } else {
          toast(error.message);
        }
        setSaving(false);
        return;
      }
      // With "Confirm email" ON, there's no session yet - they must confirm.
      if (!signUp.session) {
        toast("Account created. Check your email to confirm, then sign in.");
        onSwitchToSignIn?.();
        setSaving(false);
        return;
      }
      uid = signUp.user!.id;
    } else {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast("Your session expired - please sign in again.");
        setSaving(false);
        router.push("/");
        return;
      }
      uid = data.user.id;
    }

    const photo = await resolvePhotoUrl(uid);
    const fields = fieldPayload(photo);

    // 1. Persist to the profile (the memory carried across events).
    const { error: profileErr } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", uid);
    if (profileErr) {
      toast(profileErr.message || "Couldn't save your profile");
      setSaving(false);
      return;
    }

    // 2. Snapshot into the current event's check-in row.
    const { data: saved, error: attErr } = await supabase
      .from("attendees")
      .upsert(
        { auth_uid: uid, event_id: event?.id ?? null, ...fields },
        { onConflict: "auth_uid,event_id" },
      )
      .select()
      .single();
    if (attErr || !saved) {
      toast(attErr?.message ?? "Couldn't save your check-in");
      setSaving(false);
      return;
    }

    identifyAttendee(saved.id, {
      company: company.trim() || undefined,
      industry,
    });
    if (creating) {
      await track(
        { eventId: event?.id ?? null, actorAttendeeId: saved.id },
        "signup",
        { industry },
      );
    }

    toast(creating ? "You're in the directory!" : "Profile updated");
    router.push("/directory");
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast("Signed out");
    router.push("/");
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
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPhoto} alt="Your selfie" />
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
              onClick={() => cameraInput.current?.click()}
            >
              <Camera size={17} strokeWidth={2} aria-hidden />
              Take photo
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
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
          <span className={`dot ${shownPhoto ? "on" : ""}`} />
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

        <div className="field">
          <label>Your offering</label>
          <input
            id="offering"
            name="offering"
            value={offering}
            maxLength={120}
            onChange={(e) => setOffering(e.target.value)}
            placeholder="A few words on why you're here"
          />
        </div>

        {creating ? (
          <>
            <div className="field">
              <label>Password</label>
              <input
                id="password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                id="confirm"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
              />
            </div>
          </>
        ) : null}

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
          style={{ marginBottom: creating ? 14 : 10 }}
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving
            ? "Saving…"
            : creating
              ? "Create my account →"
              : "Update my profile →"}
        </button>

        {creating ? (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ color: "var(--slate)", borderColor: "var(--line)", marginBottom: 14 }}
            onClick={onSwitchToSignIn}
          >
            Already have an account? Sign in
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ color: "var(--slate)", borderColor: "var(--line)", marginBottom: 14 }}
            disabled={signingOut}
            onClick={signOut}
          >
            Sign out
          </button>
        )}
      </div>

      {cropSrc ? (
        <CropModal
          image={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={handleCropped}
        />
      ) : null}
    </>
  );
}
