import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client";

/**
 * Refreshes the Supabase auth session on every request and, for logged-out
 * visitors, transparently signs them in anonymously so the directory and
 * other SSR reads work on first paint (zero-friction attendee auth).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Not configured yet (no env) - don't break the app; just pass through.
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run other code between createServerClient and getUser().
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  if (!user) {
    try {
      await supabase.auth.signInAnonymously();
    } catch {
      // Anonymous sign-ins may be disabled in the Supabase dashboard.
      // The Join screen surfaces a clearer message in that case.
    }
  }

  return supabaseResponse;
}
