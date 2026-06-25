import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getCurrentUser,
  getMyAttendee,
  getRole,
  isAdminRole,
  isRealUser,
} from "@/lib/server-data";
import { getCachedEvent } from "@/lib/cached";
import { DirectoryClient } from "@/components/directory/DirectoryClient";
import type { Attendee } from "@/lib/types";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  // The directory is for members only - send guests to sign in / create.
  if (!isRealUser(user)) redirect("/");

  const event = await getCachedEvent();
  const role = await getRole(supabase);
  const mine = await getMyAttendee(supabase, event?.id ?? null, user?.id ?? null);

  // RLS returns open_to_contact rows (+ the viewer's own row, + all for admins).
  let query = supabase.from("attendees").select("*");
  if (event?.id) query = query.eq("event_id", event.id);

  const { data } = await query.order("created_at", { ascending: false });
  const attendees = (data ?? []) as Attendee[];

  return (
    <DirectoryClient
      initial={attendees}
      event={event}
      myAttendeeId={mine?.id ?? null}
      isAdmin={isAdminRole(role)}
    />
  );
}
