import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getLiveEvent, getMyAttendee } from "@/lib/server-data";
import { getSiteContent } from "@/lib/content";
import { JoinForm } from "@/components/join/JoinForm";

export default async function JoinPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const event = await getLiveEvent(supabase);
  const [existing, content] = await Promise.all([
    getMyAttendee(supabase, event?.id ?? null, user?.id ?? null),
    getSiteContent(supabase),
  ]);

  return <JoinForm event={event} existing={existing} copy={content} />;
}
