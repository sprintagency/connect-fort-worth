import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, getRole, isAdminRole } from "@/lib/server-data";
import { attendeesToCsv } from "@/lib/csv";
import type { Attendee } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();

  const role = await getRole(supabase);
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await getCurrentUser(supabase);
  const to = user?.email;
  if (!to) {
    return NextResponse.json(
      { error: "No email on your organizer account" },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Connect Fort Worth <onboarding@resend.dev>";
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email isn't configured. Add RESEND_API_KEY in Vercel to enable sending (CSV download works without it).",
      },
      { status: 501 },
    );
  }

  const { data } = await supabase
    .from("attendees")
    .select("*")
    .order("created_at", { ascending: true });
  const csv = attendeesToCsv((data ?? []) as Attendee[]);
  const content = Buffer.from(csv, "utf-8").toString("base64");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Connect Fort Worth — attendee export",
      text: `Attached is the latest attendee export (${data?.length ?? 0} attendees).`,
      attachments: [
        { filename: "connect-fort-worth-attendees.csv", content },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json(
      { error: `Email failed: ${t.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
