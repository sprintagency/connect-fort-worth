import type { SupabaseClient } from "@supabase/supabase-js";

export interface IndustrySlice {
  name: string;
  pct: number;
  color: string;
}
export interface CompanyRow {
  company: string;
  count: number;
}
export interface FeedItem {
  type: "s" | "v";
  text: string;
  ago: string;
}

export interface DashboardData {
  attendees: number;
  activeToday: number;
  smsTaps: number;
  vcardSaves: number;
  connections: number;
  avgPerAttendee: number;
  topIndustries: IndustrySlice[];
  topCompanies: CompanyRow[];
  feed: FeedItem[];
}

// Donut palette (prototype order), last entry reserved for "Other".
const DONUT_COLORS = ["#F0531F", "#1B4476", "#2D9CDB", "#19A974", "#E0851F"];
const OTHER_COLOR = "#C7D2DF";

function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortName(first?: string, last?: string): string {
  if (!first && !last) return "Someone";
  const initial = last ? `${last[0]}.` : "";
  return `${first ?? ""} ${initial}`.trim();
}

type AttendeeLite = {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  industry: string | null;
};
type ActionLite = {
  action_type: string;
  actor_attendee_id: string | null;
  target_attendee_id: string | null;
  created_at: string;
};

/**
 * Builds the event dashboard from real Supabase data. Must be called with a
 * client whose session belongs to an admin - the `attendee_actions` RLS policy
 * only returns rows to admins, so this returns zeros for anyone else.
 */
export async function computeDashboard(
  supabase: SupabaseClient,
  eventId: string | null,
  nowMs?: number,
): Promise<DashboardData> {
  const now = nowMs ?? Date.now();

  let attQuery = supabase
    .from("attendees")
    .select("id, first_name, last_name, company, industry");
  if (eventId) attQuery = attQuery.eq("event_id", eventId);

  // Apply filters BEFORE order/limit (those return a transform builder).
  let actFilter = supabase
    .from("attendee_actions")
    .select("action_type, actor_attendee_id, target_attendee_id, created_at");
  if (eventId) actFilter = actFilter.eq("event_id", eventId);
  const actQuery = actFilter
    .order("created_at", { ascending: false })
    .limit(5000);

  const [{ data: attData }, { data: actData }] = await Promise.all([
    attQuery,
    actQuery,
  ]);

  const attendeesList = (attData ?? []) as AttendeeLite[];
  const actions = (actData ?? []) as ActionLite[];
  const byId = new Map(attendeesList.map((a) => [a.id, a]));

  const attendees = attendeesList.length;
  const smsTaps = actions.filter((a) => a.action_type === "sms_click").length;
  const vcardSaves = actions.filter(
    (a) => a.action_type === "vcard_download",
  ).length;
  const connections = smsTaps + vcardSaves;
  const avgPerAttendee = attendees ? connections / attendees : 0;

  // Active today = distinct actors with any action since midnight UTC.
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const activeSet = new Set<string>();
  for (const a of actions) {
    if (a.actor_attendee_id && new Date(a.created_at).getTime() >= startOfToday.getTime()) {
      activeSet.add(a.actor_attendee_id);
    }
  }
  const activeToday = activeSet.size;

  // Top industries (share of directory).
  const indCounts = new Map<string, number>();
  for (const a of attendeesList) {
    const key = a.industry || "Other";
    indCounts.set(key, (indCounts.get(key) ?? 0) + 1);
  }
  const sortedInd = [...indCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topInd = sortedInd.slice(0, 5);
  const restCount = sortedInd
    .slice(5)
    .reduce((sum, [, n]) => sum + n, 0);
  const topIndustries: IndustrySlice[] = topInd.map(([name, n], i) => ({
    name,
    pct: attendees ? Math.round((n / attendees) * 100) : 0,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  if (restCount > 0) {
    topIndustries.push({
      name: "Other",
      pct: attendees ? Math.round((restCount / attendees) * 100) : 0,
      color: OTHER_COLOR,
    });
  }

  // Most-connected companies (sms + vcard targeting each company).
  const companyCounts = new Map<string, number>();
  for (const a of actions) {
    if (a.action_type !== "sms_click" && a.action_type !== "vcard_download")
      continue;
    const target = a.target_attendee_id
      ? byId.get(a.target_attendee_id)
      : undefined;
    const company = target?.company;
    if (!company) continue;
    companyCounts.set(company, (companyCounts.get(company) ?? 0) + 1);
  }
  const topCompanies: CompanyRow[] = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([company, count]) => ({ company, count }));

  // Recent activity feed (latest connection actions).
  const feed: FeedItem[] = actions
    .filter(
      (a) =>
        a.action_type === "sms_click" || a.action_type === "vcard_download",
    )
    .slice(0, 6)
    .map((a) => {
      const actor = a.actor_attendee_id ? byId.get(a.actor_attendee_id) : undefined;
      const target = a.target_attendee_id
        ? byId.get(a.target_attendee_id)
        : undefined;
      const actorName = shortName(actor?.first_name, actor?.last_name);
      const targetName = target
        ? `${target.first_name} ${target.last_name}`
        : "an attendee";
      const text =
        a.action_type === "sms_click"
          ? `${actorName} texted ${targetName}`
          : `${actorName} saved ${targetName}'s card`;
      return {
        type: a.action_type === "sms_click" ? "s" : "v",
        text,
        ago: relativeTime(a.created_at, now),
      };
    });

  return {
    attendees,
    activeToday,
    smsTaps,
    vcardSaves,
    connections,
    avgPerAttendee,
    topIndustries,
    topCompanies,
    feed,
  };
}
