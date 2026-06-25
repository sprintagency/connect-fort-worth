import type { NextConfig } from "next";

// PostHog reverse proxy: route /ingest/* through our own origin so events
// aren't blocked by ad/tracking blockers. Upstream defaults to US Cloud;
// override with POSTHOG_API_HOST / POSTHOG_ASSET_HOST for EU.
const POSTHOG_API_HOST =
  process.env.POSTHOG_API_HOST ?? "https://us.i.posthog.com";
const POSTHOG_ASSET_HOST =
  process.env.POSTHOG_ASSET_HOST ?? "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile in a parent
  // Dropbox folder otherwise makes Next infer the wrong root).
  turbopack: { root: process.cwd() },
  // PostHog rewrites need this so trailing-slash handling doesn't break ingest.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${POSTHOG_ASSET_HOST}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_API_HOST}/:path*`,
      },
      {
        source: "/ingest/decide",
        destination: `${POSTHOG_API_HOST}/decide`,
      },
    ];
  },
  images: {
    // Allow selfies served from Supabase Storage's public bucket.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
