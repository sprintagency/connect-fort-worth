import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getRole, isAdminRole } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Delete actions first (FK to attendees), then attendees.
  // `.not("id","is",null)` matches every row (id is never null).
  const actions = await supabase
    .from("attendee_actions")
    .delete()
    .not("id", "is", null);
  if (actions.error) {
    return NextResponse.json({ error: actions.error.message }, { status: 400 });
  }

  const attendees = await supabase
    .from("attendees")
    .delete()
    .not("id", "is", null);
  if (attendees.error) {
    return NextResponse.json(
      { error: attendees.error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
