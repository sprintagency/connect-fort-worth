"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedBlob } from "@/lib/crop";

interface CropModalProps {
  image: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
  aspect?: number;
  cropShape?: "round" | "rect";
  minZoom?: number;
  restrictPosition?: boolean;
  mime?: "image/jpeg" | "image/png";
  outputWidth?: number;
  title?: string;
  hint?: string;
  confirmLabel?: string;
}

export function CropModal({
  image,
  onCancel,
  onConfirm,
  aspect = 1,
  cropShape = "round",
  minZoom = 1,
  restrictPosition = true,
  mime = "image/jpeg",
  outputWidth = 600,
  title,
  hint = "Drag to reposition, pinch or slide to zoom.",
  confirmLabel = "Use photo",
}: CropModalProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locate the portal node once after mount
    setTarget(document.getElementById("cfw-overlay"));
  }, []);

  const onCropComplete = useCallback(
    (_: Area, pixels: Area) => setArea(pixels),
    [],
  );

  if (!target) return null;

  const outputHeight = Math.round(outputWidth / aspect);

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(image, area, {
        width: outputWidth,
        height: outputHeight,
        mime,
      });
      await onConfirm(blob);
    } catch {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="crop-mask">
      <div className="crop-card">
        {title ? <div className="crop-title">{title}</div> : null}
        <div className="crop-area">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={3}
            aspect={aspect}
            cropShape={cropShape}
            restrictPosition={restrictPosition}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-controls">
          <label className="crop-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={minZoom}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
            />
          </label>
          <p className="crop-hint">{hint}</p>
          <div className="crop-btns">
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? "Saving…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    target,
  );
}
