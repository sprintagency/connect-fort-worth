"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";

export function AdminAccessCard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    toast("Signed out of organizer");
    router.refresh();
    router.push("/");
  }

  return (
    <div className="infocard">
      <h3>Organizer access</h3>
      {isAdmin ? (
        <>
          <p>You&apos;re signed in as an organizer. The Stats tab is unlocked.</p>
          <div className="adminbox">
            <Link href="/stats" className="btn btn-primary btn-block">
              Open the dashboard
            </Link>
          </div>
          <div className="adminbox">
            <Link
              href="/admin/sponsor"
              className="btn btn-ghost btn-block"
              style={{ color: "var(--navy)", borderColor: "var(--line)" }}
            >
              Manage sponsor logo
            </Link>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ color: "var(--slate)", borderColor: "var(--line)" }}
            disabled={busy}
            onClick={signOut}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p>
            Live analytics are restricted to event admins. Sign in with the
            organizer account your superadmin set up to unlock the dashboard.
          </p>
          <div className="adminbox">
            <Link href="/admin/login" className="btn btn-primary btn-block">
              Organizer sign in
            </Link>
          </div>
          <p className="adminnote">
            Roles are assigned by your superadmin and enforced on the server.
            Attendees never see this data.
          </p>
        </>
      )}
    </div>
  );
}
