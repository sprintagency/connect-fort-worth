import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getLiveEvent, getMyAttendee } from "@/lib/server-data";
import { DirectoryClient } from "@/components/directory/DirectoryClient";
import type { Attendee } from "@/lib/types";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const event = await getLiveEvent(supabase);
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
    />
  );
}
