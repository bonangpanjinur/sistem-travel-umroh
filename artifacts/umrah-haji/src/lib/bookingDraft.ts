/**
 * Booking wizard draft persistence with TTL.
 *
 * Disimpan di sessionStorage agar tidak bocor lintas tab/perangkat,
 * tapi cukup tahan untuk redirect ke /auth/login lalu kembali.
 */

export const BOOKING_DRAFT_TTL_MS = 60 * 60 * 1000; // 60 menit

export interface BookingDraftEnvelope<T = any> {
  version: 1;
  savedAt: number;
  expiresAt: number;
  payload: T;
}

export function buildDraftKey(packageId?: string, departureId?: string) {
  if (!packageId || !departureId) return "";
  return `booking-draft:${packageId}:${departureId}`;
}

export function buildAutoSubmitKey(draftKey: string) {
  return `${draftKey}:auto-submit`;
}

export function saveBookingDraft<T>(key: string, payload: T) {
  if (!key) return;
  try {
    const env: BookingDraftEnvelope<T> = {
      version: 1,
      savedAt: Date.now(),
      expiresAt: Date.now() + BOOKING_DRAFT_TTL_MS,
      payload,
    };
    sessionStorage.setItem(key, JSON.stringify(env));
  } catch {}
}

export type LoadDraftResult<T> =
  | { status: "missing" }
  | { status: "expired"; savedAt: number }
  | { status: "ok"; payload: T; savedAt: number; expiresAt: number };

export function loadBookingDraft<T>(key: string): LoadDraftResult<T> {
  if (!key) return { status: "missing" };
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { status: "missing" };
    const env = JSON.parse(raw) as BookingDraftEnvelope<T> | T;
    // Backward compat: kalau objek lama tanpa envelope, anggap masih segar
    if (!env || typeof env !== "object" || !("expiresAt" in (env as any))) {
      return { status: "ok", payload: env as T, savedAt: Date.now(), expiresAt: Date.now() + BOOKING_DRAFT_TTL_MS };
    }
    const e = env as BookingDraftEnvelope<T>;
    if (Date.now() > e.expiresAt) {
      try { sessionStorage.removeItem(key); } catch {}
      return { status: "expired", savedAt: e.savedAt };
    }
    return { status: "ok", payload: e.payload, savedAt: e.savedAt, expiresAt: e.expiresAt };
  } catch {
    return { status: "missing" };
  }
}

export function clearBookingDraft(key: string) {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(buildAutoSubmitKey(key));
  } catch {}
}
