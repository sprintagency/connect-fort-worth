import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client";

/**
 * Refreshes the Supabase auth session on every request so SSR reads see a
 * valid token. Logged-out is a supported state now (real accounts) - we no
 * longer silently sign visitors in anonymously.
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
  // Calling getUser() refreshes the session cookie on the response.
  try {
    await supabase.auth.getUser();
  } catch {
    return supabaseResponse;
  }

  return supabaseResponse;
}
