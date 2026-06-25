"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname } from "next/navigation";
import { posthogLoaded } from "@/lib/track";

function PostHogPageView() {
  const pathname = usePathname();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph && posthogLoaded()) {
      ph.capture("$pageview", { $current_url: window.location.href });
    }
  }, [pathname, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    // No key set → clean no-op (capture() calls are guarded by posthogLoaded()).
    if (!key || posthogLoaded()) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
      ui_host: "https://us.posthog.com",
      capture_pageview: false, // captured manually on route change
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}
