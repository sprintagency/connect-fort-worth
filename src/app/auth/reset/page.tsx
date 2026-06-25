"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";

type Phase = "verifying" | "ready" | "error" | "saving" | "done";

const MIN_PASSWORD = 8;

/**
 * Password recovery landing page. Supabase emails a link here; we establish a
 * recovery session (token_hash + verifyOtp is the cross-device-safe path, with
 * PKCE `code` and hash-based sessions handled as fallbacks), then let the user
 * set a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState(
    "This reset link is invalid or has expired.",
  );

  useEffect(() => {
    let active = true;
    async function run() {
      const q = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const tokenHash = q.get("token_hash");
      const type = q.get("type") || "recovery";
      const code = q.get("code");
      const errDesc = q.get("error_description") || hash.get("error_description");
      try {
        if (errDesc) throw new Error(errDesc);
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "recovery",
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Hash-based implicit flow auto-detects on load; check for a session.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("This reset link is invalid or has expired.");
          }
        }
        if (active) setPhase("ready");
      } catch (e) {
        if (active) {
          setErrorMsg(
            e instanceof Error
              ? e.message
              : "This reset link is invalid or has expired.",
          );
          setPhase("error");
        }
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function save() {
    if (password.length < MIN_PASSWORD) {
      toast(`Use a password of at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password !== confirm) {
      toast("Passwords don't match");
      return;
    }
    setPhase("saving");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast(error.message || "Couldn't update your password");
      setPhase("ready");
      return;
    }
    setPhase("done");
    toast("Password updated");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="info">
      <div className="infocard">
        <h3>Reset your password</h3>

        {phase === "verifying" ? <p>Checking your reset link…</p> : null}

        {phase === "error" ? (
          <>
            <p>{errorMsg}</p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => router.push("/")}
            >
              Back to sign in
            </button>
          </>
        ) : null}

        {phase === "ready" || phase === "saving" ? (
          <>
            <p>Choose a new password for your account.</p>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder="Re-enter your password"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={phase === "saving"}
              onClick={save}
            >
              {phase === "saving" ? "Saving…" : "Update password →"}
            </button>
          </>
        ) : null}

        {phase === "done" ? (
          <p>Your password has been updated. Redirecting…</p>
        ) : null}
      </div>
    </div>
  );
}
