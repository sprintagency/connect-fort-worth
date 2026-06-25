import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  userId?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  phone?: string;
  email?: string;
  offering?: string;
  openToContact?: boolean;
  lookingFor?: string[];
  photoBase64?: string | null;
}

/**
 * Provisions a brand-new account's profile + first-event check-in using the
 * service role. Needed because, with email confirmation ON, signUp returns no
 * session, so the browser can't write these rows itself. The attendee appears
 * in the directory instantly and re-enters nothing; the confirmation email is
 * still sent (by the client signUp) and gates their own sign-in.
 *
 * Security: provisions ONLY when the profile is still blank (first_name null),
 * so it can't overwrite an established member, and auth user ids are unguessable.
 */
export async function POST(request: Request) {
  if (!URL_ || !SECRET) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SECRET_KEY" },
      { status: 501 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const first = (body.firstName ?? "").trim();
  const last = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim();
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  if (!first || !last || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = createClient(URL_, SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Confirm the user exists and hasn't been provisioned yet (provision-once).
  const { data: existing } = await service
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.first_name) {
    return NextResponse.json({ error: "Already set up" }, { status: 409 });
  }

  // The live event (server-decided; don't trust the client for this).
  const { data: ev } = await service
    .from("events")
    .select("id")
    .order("is_live", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const eventId = (ev?.id as string | undefined) ?? null;

  // Optional selfie (data URL or bare base64) -> selfies/{uid}/{ts}.jpg.
  let photoUrl: string | null = null;
  if (body.photoBase64) {
    try {
      const base64 = body.photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Buffer.from(base64, "base64");
      if (bytes.length > 0 && bytes.length < 6_000_000) {
        const path = `${userId}/${Date.now()}.jpg`;
        const { error: upErr } = await service.storage
          .from("selfies")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        if (!upErr) {
          photoUrl = service.storage.from("selfies").getPublicUrl(path)
            .data.publicUrl;
        }
      }
    } catch {
      // Non-fatal: save the profile without a photo; they can add it later.
    }
  }

  const fields = {
    first_name: first,
    last_name: last,
    company: (body.company ?? "").trim() || null,
    job_title: (body.jobTitle ?? "").trim() || null,
    industry: (body.industry ?? "").trim() || null,
    phone: (body.phone ?? "").trim() || null,
    email,
    photo_url: photoUrl,
    open_to_contact: body.openToContact !== false,
    looking_for: Array.isArray(body.lookingFor) ? body.lookingFor : [],
    offering: (body.offering ?? "").trim() || null,
    agreed_terms: true,
  };

  // 1. Persistent profile (the memory carried across events).
  const { error: profErr } = await service
    .from("profiles")
    .upsert({ id: userId, ...fields }, { onConflict: "id" });
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // 2. First-event check-in snapshot.
  const { data: saved, error: attErr } = await service
    .from("attendees")
    .upsert(
      { auth_uid: userId, event_id: eventId, ...fields },
      { onConflict: "auth_uid,event_id" },
    )
    .select("id")
    .single();
  if (attErr || !saved) {
    return NextResponse.json(
      { error: attErr?.message ?? "Could not check you in" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, attendeeId: saved.id });
}
