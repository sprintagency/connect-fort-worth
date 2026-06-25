import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Next 16 renamed the "middleware" convention to "proxy".
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - Next internals (_next/static, _next/image)
     * - the PostHog reverse proxy (/ingest)
     * - common static files (favicon, images, fonts)
     */
    "/((?!_next/static|_next/image|ingest|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
