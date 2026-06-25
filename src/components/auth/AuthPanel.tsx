"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";
import { JoinForm } from "@/components/join/JoinForm";
import type { EventRow } from "@/lib/types";
import type { SiteContent } from "@/lib/content";

interface AuthPanelProps {
  event: EventRow | null;
  copy: SiteContent;
}

/**
 * The logged-out home screen: create a new account (full Join form) or sign in
 * to an existing one. Defaults to "create" - the headline action at an event.
 */
export function AuthPanel({ event, copy }: AuthPanelProps) {
  const [view, setView] = useState<"create" | "signin">("create");

  if (view === "signin") {
    return (
      <SignInForm copy={copy} onSwitchToCreate={() => setView("create")} />
    );
  }
  return (
    <JoinForm
      mode="create"
      event={event}
      profile={null}
      copy={copy}
      onSwitchToSignIn={() => setView("signin")}
    />
  );
}

function SignInForm({
  copy,
  onSwitchToCreate,
}: {
  copy: SiteContent;
  onSwitchToCreate: () => void;
}) {
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
      toast(error.message || "Sign in failed");
      setBusy(false);
      return;
    }
    toast("Welcome back");
    // Home decides what's next (check-in prompt or profile).
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="hero">
        <h1>
          {copy.hero1}
          <br />
          <span className="fw">{copy.hero2}</span>
        </h1>
        <p className="sub">Welcome back - sign in to check in.</p>
      </div>

      <div className="form">
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") signIn();
            }}
            placeholder="Your password"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginBottom: 10 }}
          disabled={busy}
          onClick={signIn}
        >
          {busy ? "Signing in…" : "Sign in →"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ color: "var(--slate)", borderColor: "var(--line)", marginBottom: 14 }}
          onClick={onSwitchToCreate}
        >
          New here? Create an account
        </button>
      </div>
    </>
  );
}
