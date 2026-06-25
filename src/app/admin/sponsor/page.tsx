import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { SponsorEditor } from "@/components/admin/SponsorEditor";

export const dynamic = "force-dynamic";

export default async function SponsorPage() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) redirect("/directory");

  const event = await getLiveEvent(supabase);
  return <SponsorEditor event={event} />;
}
