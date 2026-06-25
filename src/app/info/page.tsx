import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { AdminAccessCard } from "@/components/info/AdminAccessCard";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format YYYY-MM-DD without Date() timezone drift.
function formatEventDate(d: string | null): string {
  if (!d) return "TBA";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}

export default async function InfoPage() {
  const supabase = await createClient();
  const event = await getLiveEvent(supabase);
  const role = await getRole(supabase);

  let countQuery = supabase
    .from("attendees")
    .select("id", { count: "exact", head: true });
  if (event?.id) countQuery = countQuery.eq("event_id", event.id);
  const { count } = await countQuery;

  return (
    <div className="info">
      <div className="infocard">
        <h3>{event?.name ?? "Connect Fort Worth"}</h3>
        <p>
          One room. A few hundred people who could change your year. This app is
          your shortcut to finding them.
        </p>
        <div className="statline">
          <span>Date</span>
          <span className="v">{formatEventDate(event?.event_date ?? null)}</span>
        </div>
        <div className="statline">
          <span>Venue</span>
          <span className="v">{event?.venue ?? "TBA"}</span>
        </div>
        <div className="statline">
          <span>In the directory</span>
          <span className="v">{count ?? 0}</span>
        </div>
      </div>

      <div className="infocard">
        <h3>How it works</h3>
        <p>
          <b>1.</b> Add your selfie and what you&apos;re looking for.
        </p>
        <p>
          <b>2.</b> Search the room by industry or name.
        </p>
        <p>
          <b>3.</b> Tap to text or save a contact, then go say hello.
        </p>
      </div>

      <div className="infocard">
        <h3>Your data</h3>
        <p>
          Stored securely and only shared with attendees you choose to be
          visible to. Turn off &quot;Open to being contacted&quot; anytime to
          leave the directory.
        </p>
      </div>

      <AdminAccessCard isAdmin={isAdminRole(role)} />
    </div>
  );
}
