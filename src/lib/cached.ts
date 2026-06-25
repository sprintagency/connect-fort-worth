import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CONTENT, type SiteContent } from "./content";
import type { EventRow } from "./types";

// Public, cookieless client so the result is cacheable across requests.
const URL_ =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const KEY_ =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "placeholder";

function pub() {
  return createClient(URL_, KEY_, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Live event, cached ~30s across requests (public data; rarely changes).
 * Organizer edits propagate to the public screens within the TTL.
 */
export const getCachedEvent = unstable_cache(
  async (): Promise<EventRow | null> => {
    try {
      const { data } = await pub()
        .from("events")
        .select("*")
        .order("is_live", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as EventRow) ?? null;
    } catch {
      return null;
    }
  },
  ["live-event"],
  { revalidate: 30 },
);

/** Editable copy, cached ~30s across requests (rarely changes). */
export const getCachedContent = unstable_cache(
  async (): Promise<SiteContent> => {
    try {
      const { data } = await pub()
        .from("site_content")
        .select("content")
        .eq("id", "main")
        .maybeSingle();
      return {
        ...DEFAULT_CONTENT,
        ...((data?.content ?? {}) as Partial<SiteContent>),
      };
    } catch {
      return DEFAULT_CONTENT;
    }
  },
  ["site-content"],
  { revalidate: 30 },
);
