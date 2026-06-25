"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { attendeesToCsv } from "@/lib/csv";
import { useToast } from "@/components/Toast";
import type { Attendee } from "@/lib/types";

export function DataTools({ organizerEmail }: { organizerEmail: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function download() {
    setBusy("download");
    const { data, error } = await supabase
      .from("attendees")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast(error.message);
      setBusy(null);
      return;
    }
    const csv = attendeesToCsv((data ?? []) as Attendee[]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "connect-fort-worth-attendees.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBusy(null);
    toast(`Exported ${data?.length ?? 0} attendees`);
  }

  async function emailCsv() {
    setBusy("email");
    try {
      const res = await fetch("/api/admin/email-export", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) toast(`Sent to ${organizerEmail ?? "your email"}`);
      else toast(j.error || "Email isn't configured yet");
    } catch {
      toast("Couldn't send the email");
    }
    setBusy(null);
  }

  const canReset = confirmText.trim().toUpperCase() === "RESET";

  async function reset() {
    // Second confirmation (the first is typing RESET).
    if (
      !window.confirm(
        "Delete ALL attendees and activity? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy("reset");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast("All attendee data reset");
        setConfirmText("");
        router.refresh();
      } else {
        toast(j.error || "Reset failed");
      }
    } catch {
      toast("Reset failed");
    }
    setBusy(null);
  }

  return (
    <div className="info">
      <div className="infocard">
        <h3>Export attendees</h3>
        <p>
          Download everyone in the directory as a CSV, or email it to yourself.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy !== null}
          onClick={download}
          style={{ marginBottom: 10 }}
        >
          <Download size={17} strokeWidth={2} aria-hidden />
          {busy === "download" ? "Preparing…" : "Download CSV"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ color: "var(--navy)", borderColor: "var(--line)" }}
          disabled={busy !== null}
          onClick={emailCsv}
        >
          <Mail size={17} strokeWidth={2} aria-hidden />
          {busy === "email" ? "Sending…" : "Email CSV to me"}
        </button>
      </div>

      <div className="infocard" style={{ borderColor: "#F3C9BD" }}>
        <h3 style={{ color: "var(--orange-600)" }}>Reset all data</h3>
        <p>
          Permanently delete every attendee and all activity so you can start a
          fresh event. This cannot be undone.
        </p>
        <div className="field">
          <label>Type RESET to confirm</label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            autoCapitalize="characters"
          />
        </div>
        <button
          type="button"
          className="btn btn-block"
          disabled={!canReset || busy !== null}
          onClick={reset}
          style={{
            background: canReset ? "var(--orange-600)" : "var(--line)",
            color: canReset ? "#fff" : "var(--slate-2)",
          }}
        >
          <Trash2 size={17} strokeWidth={2} aria-hidden />
          {busy === "reset" ? "Resetting…" : "Permanently delete all data"}
        </button>
      </div>
    </div>
  );
}
