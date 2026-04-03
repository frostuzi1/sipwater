const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

/**
 * Downscales large uploads and re-encodes as WebP when supported (else JPEG).
 * Reduces storage and catalog load time.
 */
export async function processProductImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }

  const img = await loadImage(file);
  let { width, height } = img;
  const maxSide = Math.max(width, height);
  if (maxSide > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / maxSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const tryWebp = canvas.toDataURL("image/webp", WEBP_QUALITY);
  const useWebp = tryWebp.startsWith("data:image/webp");

  const blob: Blob | null = await new Promise((resolve) => {
    if (useWebp) {
      canvas.toBlob((b) => resolve(b), "image/webp", WEBP_QUALITY);
    } else {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    }
  });

  if (!blob) {
    throw new Error("Could not encode image.");
  }

  const ext = useWebp ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "product";
  return new File([blob], `${base}.${ext}`, {
    type: useWebp ? "image/webp" : "image/jpeg",
    lastModified: Date.now(),
  });
}
