/**
 * Helper srcset/sizes responsif.
 * - Unsplash: gunakan parameter `w=` & `q=` per breakpoint.
 * - Supabase Storage / sumber lain: kembalikan src apa adanya
 *   (browser akan tetap memakai `sizes` untuk hint layout).
 */

const UNSPLASH_HOSTS = ["images.unsplash.com", "source.unsplash.com"];

function isUnsplash(url: string) {
  try {
    const u = new URL(url);
    return UNSPLASH_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}

function rewriteUnsplash(url: string, width: number, quality = 70) {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", String(quality));
    u.searchParams.set("auto", "format");
    if (!u.searchParams.get("fit")) u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return url;
  }
}

export function buildSrcSet(src: string, widths: number[], quality = 70): string | undefined {
  if (!src) return undefined;
  if (isUnsplash(src)) {
    return widths.map((w) => `${rewriteUnsplash(src, w, quality)} ${w}w`).join(", ");
  }
  return undefined;
}

export const BANNER_WIDTHS = [480, 768, 1024, 1440];
export const BANNER_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px";

export const CARD_WIDTHS = [200, 320, 480, 640];
export const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px";