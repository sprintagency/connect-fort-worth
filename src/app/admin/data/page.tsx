import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getRole, isAdminRole } from "@/lib/server-data";
import { DataTools } from "@/components/admin/DataTools";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) redirect("/directory");

  const user = await getCurrentUser(supabase);
  return <DataTools organizerEmail={user?.email ?? null} />;
}
