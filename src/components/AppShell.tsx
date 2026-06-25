"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Info,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { EventRow } from "@/lib/types";
import { Header } from "./Header";
import { BuiltBy } from "./BuiltBy";
import { Toaster } from "./Toast";

interface AppShellProps {
  event: EventRow | null;
  isAdmin: boolean;
  hasJoined: boolean;
  sponsorUrl: string | null;
  sponsorName: string | null;
  children: React.ReactNode;
}

type TabItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  adminOnly?: boolean;
};

const SECONDARY_TABS: TabItem[] = [
  { href: "/directory", label: "Directory", Icon: Users },
  { href: "/stats", label: "Stats", adminOnly: true, Icon: BarChart3 },
  { href: "/info", label: "Info", Icon: Info },
];

export function AppShell({
  event,
  isAdmin,
  hasJoined,
  sponsorUrl,
  sponsorName,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The home tab doubles as the profile editor once a visitor has joined.
  const homeTab: TabItem = hasJoined
    ? { href: "/", label: "Profile", Icon: UserRound }
    : { href: "/", label: "Join", Icon: UserPlus };
  const tabs: TabItem[] = [homeTab, ...SECONDARY_TABS];

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
          {tabs.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`tab ${isActive(t.href) ? "on" : ""}`}
            >
              <t.Icon size={22} strokeWidth={2} aria-hidden />
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
