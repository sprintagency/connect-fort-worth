import { createClient } from "@/utils/supabase/server";
import { getRole, isAdminRole } from "@/lib/server-data";
import { getCachedContent, getCachedEvent } from "@/lib/cached";
import { formatEventDate } from "@/lib/format";
import { AdminAccessCard } from "@/components/info/AdminAccessCard";

export default async function InfoPage() {
  const supabase = await createClient();
  const event = await getCachedEvent();
  const role = await getRole(supabase);
  const content = await getCachedContent();

  // SECURITY DEFINER RPC so the count shows even for logged-out visitors
  // (the attendees table itself is members-only).
  const { data: count } = await supabase.rpc("directory_count", {
    p_event_id: event?.id ?? null,
  });

  return (
    <div className="info">
      <div className="infocard">
        <h3>{event?.name ?? "Live Connect Fort Worth"}</h3>
        <p>{content.infoIntro}</p>
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
          <b style={{ marginRight: "0.4em" }}>1.</b>
          {content.step1}
        </p>
        <p>
          <b style={{ marginRight: "0.4em" }}>2.</b>
          {content.step2}
        </p>
        <p>
          <b style={{ marginRight: "0.4em" }}>3.</b>
          {content.step3}
        </p>
      </div>

      <div className="infocard">
        <h3>Your data</h3>
        <p>{content.privacy}</p>
      </div>

      <AdminAccessCard isAdmin={isAdminRole(role)} />
    </div>
  );
}
