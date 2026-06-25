"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EventRow } from "@/lib/types";
import { Header } from "./Header";
import { BuiltBy } from "./BuiltBy";
import { Toaster } from "./Toast";

interface AppShellProps {
  event: EventRow | null;
  isAdmin: boolean;
  sponsorUrl: string | null;
  sponsorName: string | null;
  children: React.ReactNode;
}

const TABS = [
  {
    href: "/",
    label: "Join",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/directory",
    label: "Directory",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19a6 6 0 0 1 12 0" />
        <circle cx="17.5" cy="9" r="2.4" />
        <path d="M16 19a5 5 0 0 1 5-3.5" />
      </>
    ),
  },
  {
    href: "/stats",
    label: "Stats",
    adminOnly: true,
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    href: "/info",
    label: "Info",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  },
];

export function AppShell({
  event,
  isAdmin,
  sponsorUrl,
  sponsorName,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="appbg">
      <div className="phone">
        <Header
          event={event}
          sponsorUrl={sponsorUrl}
          sponsorName={sponsorName}
        />
        <main className="appscroll">{children}</main>
        <BuiltBy />
        <nav className="tabbar">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`tab ${isActive(t.href) ? "on" : ""}`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {t.icon}
              </svg>
              {t.label}
            </Link>
          ))}
        </nav>
        <Toaster />
        {/* Portal target for the profile sheet so it overlays the whole frame */}
        <div id="cfw-overlay" className="overlay-root" />
      </div>
    </div>
  );
}
