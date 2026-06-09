/**
 * F-24: Kompresi file otomatis (client-side, no external library)
 * Uses Canvas API to compress images before upload.
 */

export interface CompressionOptions {
  maxSizeMb?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp" | "image/png";
}

const DEFAULT_OPTS: Required<CompressionOptions> = {
  maxSizeMb: 2,
  maxWidthOrHeight: 1920,
  quality: 0.82,
  outputType: "image/jpeg",
};

/**
 * Resize a canvas so the longest side ≤ maxSide.
 */
function calcDimensions(
  w: number,
  h: number,
  maxSide: number
): { width: number; height: number } {
  if (w <= maxSide && h <= maxSide) return { width: w, height: h };
  const ratio = w > h ? maxSide / w : maxSide / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/**
 * Load an image File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Convert a data URL to a Blob.
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/**
 * Compress an image File.
 *
 * For non-image files (PDF, etc.) the original file is returned unchanged.
 *
 * @returns A new File object, potentially smaller than the original.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTS, ...options };

  // Only compress images
  if (!file.type.startsWith("image/")) return file;
  // SVG — don't process (no pixel data)
  if (file.type === "image/svg+xml") return file;

  const maxBytes = opts.maxSizeMb * 1024 * 1024;

  // Already small enough? skip
  if (file.size <= maxBytes) return file;

  try {
    const img = await loadImage(file);
    const { width, height } = calcDimensions(img.naturalWidth, img.naturalHeight, opts.maxWidthOrHeight);

    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // White background for JPEG (transparent → white)
    if (opts.outputType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Try progressively lower quality until under maxSizeMb
    let quality = opts.quality;
    let dataUrl: string;

    do {
      dataUrl = canvas.toDataURL(opts.outputType, quality);
      const blob = dataURLtoBlob(dataUrl);
      if (blob.size <= maxBytes || quality <= 0.3) break;
      quality -= 0.08;
    } while (quality > 0.2);

    const blob = dataURLtoBlob(dataUrl);

    // Only replace if compressed version is actually smaller
    if (blob.size >= file.size) return file;

    const ext = opts.outputType === "image/jpeg" ? "jpg"
      : opts.outputType === "image/webp" ? "webp"
      : "png";

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: opts.outputType, lastModified: Date.now() });
  } catch {
    // Compression failed — return original
    return file;
  }
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Compress a list of files for upload, applying compression to images.
 */
export async function compressFiles(
  files: File[],
  options: CompressionOptions = {}
): Promise<{ file: File; compressed: boolean; originalSize: number; newSize: number }[]> {
  return Promise.all(
    files.map(async (original) => {
      const result = await compressImage(original, options);
      return {
        file: result,
        compressed: result !== original,
        originalSize: original.size,
        newSize: result.size,
      };
    })
  );
}
