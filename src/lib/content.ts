import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Organizer-editable copy. Defaults match the original hardcoded text; the
 * /admin/content editor overrides any of these via the site_content row.
 */
export const DEFAULT_CONTENT = {
  hero1: "Live Connect",
  hero2: "Fort Worth",
  subtitle: "Build connections. Grow your business. Meet the room.",
  selfieHint: "A friendly face helps people put a name to you.",
  infoIntro:
    "One room. A few hundred people who could change your year. This app is your shortcut to finding them.",
  privacy:
    'Stored securely and only shared with attendees you choose to be visible to. Turn off "Open to being contacted" anytime to leave the directory.',
  step1: "Add your selfie and what you're looking for.",
  step2: "Search the room by industry or name.",
  step3: "Tap to text or save a contact, then go say hello.",
};

export type SiteContent = typeof DEFAULT_CONTENT;
export type ContentKey = keyof SiteContent;

/** Fetch the editable copy, merged over the defaults. Always returns a value. */
export async function getSiteContent(
  supabase: SupabaseClient,
): Promise<SiteContent> {
  try {
    const { data } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();
    const stored = (data?.content ?? {}) as Partial<SiteContent>;
    return { ...DEFAULT_CONTENT, ...stored };
  } catch {
    return DEFAULT_CONTENT;
  }
}
