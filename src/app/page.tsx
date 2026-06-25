import { createClient } from "@/utils/supabase/server";
import {
  getCurrentUser,
  getMyAttendee,
  getMyProfile,
  isRealUser,
} from "@/lib/server-data";
import { getCachedContent, getCachedEvent } from "@/lib/cached";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { JoinForm } from "@/components/join/JoinForm";
import { CheckInPrompt } from "@/components/checkin/CheckInPrompt";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const event = await getCachedEvent();
  const real = isRealUser(user);

  const [profile, content, checkin, sp] = await Promise.all([
    real ? getMyProfile(supabase, user!.id) : Promise.resolve(null),
    getCachedContent(),
    real && event?.id
      ? getMyAttendee(supabase, event.id, user!.id)
      : Promise.resolve(null),
    searchParams,
  ]);

  // Logged out (or a leftover anonymous session) -> create account / sign in.
  if (!real) {
    return <AuthPanel event={event} copy={content} />;
  }

  const profileComplete = Boolean(profile?.first_name);
  const wantsEdit = sp?.edit === "1";

  // Finish an incomplete profile, an explicit edit, or the post-check-in editor.
  if (!profileComplete || wantsEdit || (event && checkin)) {
    return (
      <JoinForm mode="edit" event={event} profile={profile} copy={content} />
    );
  }

  // Complete profile, not yet checked into this event -> the check-in prompt.
  if (event) {
    return <CheckInPrompt event={event} profile={profile!} />;
  }

  // No live event configured -> just the profile editor.
  return <JoinForm mode="edit" event={event} profile={profile} copy={content} />;
}
