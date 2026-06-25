export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOutput {
  width?: number;
  height?: number;
  mime?: "image/jpeg" | "image/png";
  quality?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Image load failed")));
    img.src = src;
  });
}

/**
 * Crop `src` to the given pixel area and return a blob.
 * Defaults to a 600x600 JPEG; pass PNG to preserve transparency (e.g. logos).
 */
export async function getCroppedBlob(
  src: string,
  area: CropArea,
  out: CropOutput = {},
): Promise<Blob> {
  const {
    width = 600,
    height = 600,
    mime = "image/jpeg",
    quality = 0.9,
  } = out;

  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // Source rect may extend past the image (when zoomed out); those areas stay
  // transparent, which PNG preserves.
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      mime,
      quality,
    );
  });
}
