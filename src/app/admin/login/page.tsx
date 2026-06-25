"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      toast("Enter your email and password");
      return;
    }
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      toast(error.message);
      setBusy(false);
      return;
    }

    // Confirm this account is actually an organizer before sending to /stats.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .single();
    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    router.refresh();
    if (isAdmin) {
      toast("Welcome back, organizer");
      router.push("/stats");
    } else {
      toast("That account isn't an organizer");
      setBusy(false);
    }
  }

  return (
    <div className="info">
      <div className="infocard">
        <h3>Organizer sign in</h3>
        <p>
          Live analytics are restricted to event admins. Sign in with the
          organizer account your superadmin set up.
        </p>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@accessfortworth.com"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") signIn();
            }}
            placeholder="••••••••"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={signIn}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="adminnote" style={{ marginTop: 12 }}>
          Roles are assigned by your superadmin and enforced on the server.
          Attendees never see analytics. <Link href="/info">Back to Info</Link>
        </p>
      </div>
    </div>
  );
}
