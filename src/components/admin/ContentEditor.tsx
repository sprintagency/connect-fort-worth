"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";
import type { SiteContent } from "@/lib/content";
import type { EventRow } from "@/lib/types";

export function ContentEditor({
  event,
  content,
}: {
  event: EventRow | null;
  content: SiteContent;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [name, setName] = useState(event?.name ?? "");
  const [date, setDate] = useState(event?.event_date ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [c, setC] = useState<SiteContent>(content);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof SiteContent, v: string) =>
    setC((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);

    if (event) {
      const { error: evErr } = await supabase
        .from("events")
        .update({
          name: name.trim() || event.name,
          event_date: date || null,
          venue: venue.trim() || null,
        })
        .eq("id", event.id);
      if (evErr) {
        toast(evErr.message || "Couldn't save event details");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("site_content")
      .upsert({ id: "main", content: c, updated_at: new Date().toISOString() });
    if (error) {
      toast(error.message || "Couldn't save copy");
      setSaving(false);
      return;
    }

    toast("Changes saved");
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="info">
      <div className="infocard">
        <h3>Event details</h3>
        <div className="field">
          <label>Event name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={date ?? ""}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Venue</label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
      </div>

      <div className="infocard">
        <h3>Home screen</h3>
        <div className="field">
          <label>Headline line 1</label>
          <input value={c.hero1} onChange={(e) => set("hero1", e.target.value)} />
        </div>
        <div className="field">
          <label>Headline line 2 (orange)</label>
          <input value={c.hero2} onChange={(e) => set("hero2", e.target.value)} />
        </div>
        <div className="field">
          <label>Subtitle</label>
          <textarea
            rows={2}
            value={c.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Selfie hint</label>
          <input
            value={c.selfieHint}
            onChange={(e) => set("selfieHint", e.target.value)}
          />
        </div>
      </div>

      <div className="infocard">
        <h3>Info screen</h3>
        <div className="field">
          <label>Intro paragraph</label>
          <textarea
            rows={3}
            value={c.infoIntro}
            onChange={(e) => set("infoIntro", e.target.value)}
          />
        </div>
        <div className="field">
          <label>How it works &middot; step 1</label>
          <input value={c.step1} onChange={(e) => set("step1", e.target.value)} />
        </div>
        <div className="field">
          <label>How it works &middot; step 2</label>
          <input value={c.step2} onChange={(e) => set("step2", e.target.value)} />
        </div>
        <div className="field">
          <label>How it works &middot; step 3</label>
          <input value={c.step3} onChange={(e) => set("step3", e.target.value)} />
        </div>
        <div className="field">
          <label>Your data note</label>
          <textarea
            rows={3}
            value={c.privacy}
            onChange={(e) => set("privacy", e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={saving}
        onClick={save}
        style={{ marginBottom: 16 }}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
