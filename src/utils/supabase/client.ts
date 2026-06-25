import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase URL + publishable key. Falls back to the legacy anon key name. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Harmless placeholders so the client constructs even before env is wired
// (queries simply fail and are caught). `isConfigured` reports the real state.
export const FALLBACK_URL = "https://placeholder.supabase.co";
export const FALLBACK_KEY = "placeholder-anon-key";
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let browserClient: SupabaseClient | undefined;

/** Browser-side Supabase client (singleton; reads/writes the auth cookie). */
export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      SUPABASE_URL || FALLBACK_URL,
      SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY,
    );
  }
  return browserClient;
}
