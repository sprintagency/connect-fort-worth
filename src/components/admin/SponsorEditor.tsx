"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/Toast";
import type { EventRow } from "@/lib/types";

const CropModal = dynamic(
  () => import("@/components/CropModal").then((m) => ({ default: m.CropModal })),
  { ssr: false },
);

export function SponsorEditor({ event }: { event: EventRow | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(event?.sponsor_name ?? "");
  const [url, setUrl] = useState(event?.sponsor_url ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(
    event?.sponsor_logo_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="info">
        <div className="infocard">
          <h3>Presenting sponsor</h3>
          <p>
            No live event found. Run the migration and make sure an event exists
            first.
          </p>
        </div>
      </div>
    );
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Open the crop/zoom step before uploading.
    const reader = new FileReader();
    reader.onload = () =>
      setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function uploadLogoBlob(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    const path = `sponsor/${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, blob, { upsert: true, contentType: "image/png" });

    if (error) {
      toast(error.message || "Upload failed. Did you run the migration?");
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast("Logo uploaded");
  }

  async function save() {
    if (!event) return;
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({
        sponsor_name: name.trim() || null,
        sponsor_url: url.trim() || null,
        sponsor_logo_url: logoUrl,
      })
      .eq("id", event.id);

    if (error) {
      toast(error.message || "Couldn't save sponsor");
      setSaving(false);
      return;
    }
    toast("Sponsor updated");
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="info">
      <div className="infocard">
        <h3>Presenting sponsor</h3>
        <p>
          Upload the sponsor logo and set a link. It shows in the
          &quot;PRESENTED BY&quot; slot in the header on every screen.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "6px 0 14px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "var(--navy)",
              borderRadius: 10,
              padding: "10px 14px",
              minWidth: 124,
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Sponsor logo"
                style={{ maxHeight: 28, maxWidth: 150, display: "block" }}
              />
            ) : (
              <span style={{ color: "#9fc0e6", fontSize: 12, fontWeight: 600 }}>
                No logo yet
              </span>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogo}
          />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--navy)", borderColor: "var(--line)" }}
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} strokeWidth={2} aria-hidden />
            {uploading ? "Uploading…" : "Upload logo"}
          </button>
          {logoUrl ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "var(--slate)", borderColor: "var(--line)" }}
              onClick={() => setLogoUrl(null)}
            >
              Remove
            </button>
          ) : null}
        </div>

        <div className="field">
          <label>Sponsor name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
        <div className="field">
          <label>Sponsor link (URL)</label>
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://sponsor.com"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save sponsor"}
        </button>
      </div>

      {cropSrc ? (
        <CropModal
          image={cropSrc}
          aspect={3}
          cropShape="rect"
          minZoom={0.5}
          restrictPosition={false}
          mime="image/png"
          outputWidth={600}
          title="Crop the sponsor logo"
          hint="Drag and zoom to frame the logo. Transparent areas are kept."
          confirmLabel="Use logo"
          onCancel={() => setCropSrc(null)}
          onConfirm={uploadLogoBlob}
        />
      ) : null}
    </div>
  );
}
