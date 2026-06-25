import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { computeDashboard } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const event = await getLiveEvent(supabase);
  const data = await computeDashboard(supabase, event?.id ?? null);
  return NextResponse.json(data);
}
