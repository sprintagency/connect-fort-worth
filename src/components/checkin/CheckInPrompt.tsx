"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatEventDate } from "@/lib/format";
import { identifyAttendee, track } from "@/lib/track";
import { useToast } from "@/components/Toast";
import type { EventRow, Profile } from "@/lib/types";

interface CheckInPromptProps {
  event: EventRow;
  profile: Profile;
}

/**
 * Shown to a returning, signed-in member who hasn't checked into the current
 * event yet: "Check in at today's event?" + a button carrying the event info.
 * Check-in copies the persistent profile into a per-event attendees snapshot.
 */
export function CheckInPrompt({ event, profile }: CheckInPromptProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [offering, setOffering] = useState(profile.offering ?? "");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const dateVenue = [formatEventDate(event.event_date), event.venue]
    .filter(Boolean)
    .join(" · ");

  async function checkIn() {
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast("Your session expired - please sign in again.");
      setBusy(false);
      router.push("/");
      return;
    }
    const uid = data.user.id;
    const offeringValue = offering.trim() || profile.offering || null;

    const { data: saved, error } = await supabase
      .from("attendees")
      .upsert(
        {
          auth_uid: uid,
          event_id: event.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company: profile.company,
          job_title: profile.job_title,
          industry: profile.industry,
          phone: profile.phone,
          email: profile.email,
          photo_url: profile.photo_url,
          open_to_contact: profile.open_to_contact,
          looking_for: profile.looking_for,
          offering: offeringValue,
          agreed_terms: true,
        },
        { onConflict: "auth_uid,event_id" },
      )
      .select()
      .single();

    if (error || !saved) {
      toast(error?.message ?? "Couldn't check you in");
      setBusy(false);
      return;
    }

    // Remember an edited offering back on the profile for next time.
    if (offeringValue !== (profile.offering ?? null)) {
      await supabase
        .from("profiles")
        .update({ offering: offeringValue })
        .eq("id", uid);
    }

    identifyAttendee(saved.id, {
      company: profile.company ?? undefined,
      industry: profile.industry ?? undefined,
    });
    await track(
      { eventId: event.id, actorAttendeeId: saved.id },
      "signup",
      { industry: profile.industry ?? undefined },
    );

    toast("You're checked in!");
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
    <div className="info">
      <div className="infocard">
        <h3>Welcome back, {profile.first_name}.</h3>
        <p>
          Your profile is saved. Check in below to appear in today&apos;s
          attendee directory.
        </p>

        <div className="field" style={{ marginTop: 4 }}>
          <label>Your offering for today</label>
          <input
            value={offering}
            maxLength={120}
            onChange={(e) => setOffering(e.target.value)}
            placeholder="A few words on why you're here"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{
            height: "auto",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
            padding: "12px 16px",
            marginTop: 6,
          }}
          disabled={busy}
          onClick={checkIn}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <CalendarCheck size={17} strokeWidth={2} aria-hidden />
            {busy ? "Checking in…" : `Check in at ${event.name}`}
          </span>
          {dateVenue ? (
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 400,
                opacity: 0.85,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                paddingLeft: 25,
              }}
            >
              <MapPin size={12} strokeWidth={2} aria-hidden />
              {dateVenue}
            </span>
          ) : null}
        </button>
      </div>

      <div className="infocard">
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ color: "var(--navy)", borderColor: "var(--line)", marginBottom: 10 }}
          onClick={() => router.push("/?edit=1")}
        >
          Edit my profile
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ color: "var(--slate)", borderColor: "var(--line)" }}
          disabled={signingOut}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
