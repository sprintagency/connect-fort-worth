import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getLiveEvent, getMyAttendee } from "@/lib/server-data";
import { JoinForm } from "@/components/join/JoinForm";

export default async function JoinPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const event = await getLiveEvent(supabase);
  const existing = await getMyAttendee(
    supabase,
    event?.id ?? null,
    user?.id ?? null,
  );

  return <JoinForm event={event} existing={existing} />;
}
