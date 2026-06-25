import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Attendee, EventRow, Profile, Role } from "./types";

/** The signed-in user (anonymous or real), or null if Supabase isn't configured. */
export async function getCurrentUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * A "real" account = signed in and NOT anonymous. Any leftover anonymous
 * cookie from before accounts existed is treated as logged-out.
 */
export function isRealUser(user: User | null): boolean {
  return Boolean(user) && user!.is_anonymous !== true;
}

/** The current user's persistent profile (the memory carried across events). */
export async function getMyProfile(
  supabase: SupabaseClient,
  uid: string | null,
): Promise<Profile | null> {
  if (!uid) return null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

/** Role for the current user. Defaults to 'attendee' when unknown. */
export async function getRole(supabase: SupabaseClient): Promise<Role> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "attendee";
    // Filter to the user's own row. A superadmin's RLS would otherwise match
    // every profile row (is_admin() is true), and .maybeSingle() would fail.
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return (data?.role as Role) ?? "attendee";
  } catch {
    return "attendee";
  }
}

/** The live event (or the most recent one). */
export async function getLiveEvent(
  supabase: SupabaseClient,
): Promise<EventRow | null> {
  try {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("is_live", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as EventRow) ?? null;
  } catch {
    return null;
  }
}

/** The current user's attendee row for an event, if they've joined. */
export async function getMyAttendee(
  supabase: SupabaseClient,
  eventId: string | null,
  authUid: string | null,
): Promise<Attendee | null> {
  if (!authUid) return null;
  try {
    let q = supabase.from("attendees").select("*").eq("auth_uid", authUid);
    if (eventId) q = q.eq("event_id", eventId);
    const { data } = await q.limit(1).maybeSingle();
    return (data as Attendee) ?? null;
  } catch {
    return null;
  }
}

export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "superadmin";
}
