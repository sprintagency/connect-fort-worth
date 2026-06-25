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
}

export function CropModal({ image, onCancel, onConfirm }: CropModalProps) {
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

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(image, area);
      await onConfirm(blob);
    } catch {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="crop-mask">
      <div className="crop-card">
        <div className="crop-area">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={3}
            aspect={1}
            cropShape="round"
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
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
            />
          </label>
          <p className="crop-hint">Drag to reposition, pinch or slide to zoom.</p>
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
              {busy ? "Saving…" : "Use photo"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    target,
  );
}
