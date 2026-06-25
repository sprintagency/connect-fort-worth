import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  FALLBACK_KEY,
  FALLBACK_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./client";

/**
 * Server-side Supabase client bound to the request cookies.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL || FALLBACK_URL,
    SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY,
    {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookies). Safe to ignore:
          // the middleware refreshes the session cookie on every request.
        }
      },
    },
  });
}
