"use client";

import { PostHogProvider } from "./PostHogProvider";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ToastProvider>{children}</ToastProvider>
    </PostHogProvider>
  );
}
