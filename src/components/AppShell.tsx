"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Info, UserPlus, Users, type LucideIcon } from "lucide-react";
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

const TABS: {
  href: string;
  label: string;
  Icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  { href: "/", label: "Join", Icon: UserPlus },
  { href: "/directory", label: "Directory", Icon: Users },
  { href: "/stats", label: "Stats", adminOnly: true, Icon: BarChart3 },
  { href: "/info", label: "Info", Icon: Info },
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
