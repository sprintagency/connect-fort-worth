import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { computeDashboard } from "@/lib/stats";
import { StatsDashboard } from "@/components/stats/StatsDashboard";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createClient();

  // Server-side role gate. Non-admins never see this data (also enforced by RLS).
  const role = await getRole(supabase);
  if (!isAdminRole(role)) redirect("/directory");

  const event = await getLiveEvent(supabase);
  const data = await computeDashboard(supabase, event?.id ?? null);

  return <StatsDashboard initial={data} />;
}
