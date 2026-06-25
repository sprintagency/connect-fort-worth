import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getMyAttendee } from "@/lib/server-data";
import { getCachedContent, getCachedEvent } from "@/lib/cached";
import { JoinForm } from "@/components/join/JoinForm";

export default async function JoinPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const event = await getCachedEvent();
  const [existing, content] = await Promise.all([
    getMyAttendee(supabase, event?.id ?? null, user?.id ?? null),
    getCachedContent(),
  ]);

  return <JoinForm event={event} existing={existing} copy={content} />;
}
