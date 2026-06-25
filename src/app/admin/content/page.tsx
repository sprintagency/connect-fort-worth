import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { getSiteContent } from "@/lib/content";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) redirect("/directory");

  const [event, content] = await Promise.all([
    getLiveEvent(supabase),
    getSiteContent(supabase),
  ]);

  return <ContentEditor event={event} content={content} />;
}
