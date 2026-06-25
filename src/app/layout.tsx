import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import { getLiveEvent, getRole, isAdminRole } from "@/lib/server-data";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Live Connect Fort Worth",
  description:
    "Build connections. Grow your business. Meet the room. The Access Fort Worth event networking directory.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2a4a",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const [event, role] = await Promise.all([
    getLiveEvent(supabase),
    getRole(supabase),
  ]);

  const sponsorUrl = process.env.NEXT_PUBLIC_SPONSOR_LOGO_URL || null;
  const sponsorName = process.env.NEXT_PUBLIC_SPONSOR_NAME || null;

  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Providers>
          <AppShell
            event={event}
            isAdmin={isAdminRole(role)}
            sponsorUrl={sponsorUrl}
            sponsorName={sponsorName}
          >
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
