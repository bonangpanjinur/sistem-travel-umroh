/**
 * TOTP (Time-based One-Time Password) routes
 * Uses speakeasy for secret generation & verification.
 * Users enroll via QR code scanned in Google Authenticator / Authy / similar.
 *
 * All write endpoints require a valid Supabase access token in the
 * Authorization header — the server verifies it against Supabase Auth
 * before operating on the user's profile row.
 */

import { Router } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { logger } from "../lib/logger.js";

const router = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
const APP_NAME = process.env["APP_NAME"] || "Vinstour Travel";

// ─── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Verify a Supabase access token and return the user id.
 * Returns null if the token is invalid or Supabase is not configured.
 */
async function verifySupabaseToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────

async function getProfile(userId: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,totp_secret,totp_enabled,totp_verified_at&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows: any[] = await res.json();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function updateProfile(userId: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patch),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── GET /api/totp/status ─────────────────────────────────────────────────────
// Query: ?userId=<uuid>
// Returns public TOTP status for the authenticated user (no secret exposed).

router.get("/status", async (req, res) => {
  const userId = req.query["userId"] as string;
  if (!userId) return res.status(400).json({ error: "userId wajib diisi" });

  const verified = await verifySupabaseToken(req.headers.authorization);
  if (!verified || verified !== userId) {
    return res.status(401).json({ error: "Token tidak valid atau tidak cocok" });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return res.json({ enabled: false, verified_at: null });
  }
  return res.json({
    enabled: profile.totp_enabled === true,
    verified_at: profile.totp_verified_at ?? null,
  });
});

// ─── POST /api/totp/enroll ────────────────────────────────────────────────────
// Body: { userId }
// Generates a TOTP secret, stores it (pending, totp_enabled stays false),
// returns { otpAuthUrl, qrCodeDataUrl, manualKey }.

router.post("/enroll", async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId wajib diisi" });

  const verified = await verifySupabaseToken(req.headers.authorization);
  if (!verified || verified !== userId) {
    return res.status(401).json({ error: "Token tidak valid" });
  }

  try {
    // Get user email for the label
    let userEmail = userId;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        });
        if (r.ok) {
          const u: any = await r.json();
          userEmail = u?.email ?? userId;
        }
      } catch { /* use userId as label */ }
    }

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME}:${userEmail}`,
      issuer: APP_NAME,
      length: 20,
    });

    // Store pending secret (totp_enabled stays false until verify-enroll)
    const ok = await updateProfile(userId, {
      totp_secret: secret.base32,
      totp_enabled: false,
    });
    if (!ok) throw new Error("Gagal menyimpan secret ke database");

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url ?? "");

    logger.info({ userId }, "TOTP enroll initiated");
    return res.json({
      otpAuthUrl: secret.otpauth_url,
      qrCodeDataUrl,
      manualKey: secret.base32,
    });
  } catch (err: any) {
    logger.error({ err, userId }, "TOTP enroll failed");
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/totp/verify-enroll ────────────────────────────────────────────
// Body: { userId, token }
// Verifies the first OTP from the authenticator app.
// On success: sets totp_enabled = true, totp_verified_at = now.

router.post("/verify-enroll", async (req, res) => {
  const { userId, token } = req.body as { userId?: string; token?: string };
  if (!userId || !token) return res.status(400).json({ error: "userId dan token wajib diisi" });
  if (!/^\d{6}$/.test(token)) return res.status(400).json({ error: "Token harus 6 digit angka" });

  const verified = await verifySupabaseToken(req.headers.authorization);
  if (!verified || verified !== userId) {
    return res.status(401).json({ error: "Token tidak valid" });
  }

  const profile = await getProfile(userId);
  if (!profile?.totp_secret) {
    return res.status(400).json({ error: "Tidak ada pendaftaran TOTP yang aktif. Mulai ulang proses enroll." });
  }

  const isValid = speakeasy.totp.verify({
    secret: profile.totp_secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isValid) {
    return res.status(400).json({ error: "Kode OTP salah atau sudah kedaluwarsa. Coba lagi." });
  }

  const ok = await updateProfile(userId, {
    totp_enabled: true,
    totp_verified_at: new Date().toISOString(),
  });
  if (!ok) return res.status(500).json({ error: "Gagal mengaktifkan TOTP di database" });

  logger.info({ userId }, "TOTP enrolled successfully");
  return res.json({ success: true, message: "TOTP Authenticator berhasil diaktifkan" });
});

// ─── POST /api/totp/verify ────────────────────────────────────────────────────
// Body: { userId, token }
// Verifies a TOTP token for an already-enrolled user.
// Used during login challenge or re-authentication.
// Does NOT require the user's access token (call before session is established).

router.post("/verify", async (req, res) => {
  const { userId, token } = req.body as { userId?: string; token?: string };
  if (!userId || !token) return res.status(400).json({ error: "userId dan token wajib diisi" });
  if (!/^\d{6}$/.test(token)) return res.status(400).json({ error: "Token harus 6 digit angka" });

  const profile = await getProfile(userId);
  if (!profile?.totp_secret || !profile.totp_enabled) {
    return res.status(400).json({ error: "TOTP tidak aktif untuk user ini" });
  }

  const isValid = speakeasy.totp.verify({
    secret: profile.totp_secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isValid) {
    return res.status(400).json({ error: "Kode OTP salah atau kedaluwarsa" });
  }

  // Update last verified timestamp
  await updateProfile(userId, { totp_verified_at: new Date().toISOString() });

  return res.json({ success: true });
});

// ─── POST /api/totp/disable ───────────────────────────────────────────────────
// Body: { userId, token }
// Requires a valid OTP to confirm the disable action.
// Clears totp_secret and sets totp_enabled = false.

router.post("/disable", async (req, res) => {
  const { userId, token } = req.body as { userId?: string; token?: string };
  if (!userId || !token) return res.status(400).json({ error: "userId dan token wajib diisi" });
  if (!/^\d{6}$/.test(token)) return res.status(400).json({ error: "Token harus 6 digit angka" });

  const verified = await verifySupabaseToken(req.headers.authorization);
  if (!verified || verified !== userId) {
    return res.status(401).json({ error: "Token tidak valid" });
  }

  const profile = await getProfile(userId);
  if (!profile?.totp_secret || !profile.totp_enabled) {
    return res.status(400).json({ error: "TOTP tidak aktif" });
  }

  const isValid = speakeasy.totp.verify({
    secret: profile.totp_secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isValid) {
    return res.status(400).json({ error: "Kode OTP salah. Masukkan kode dari aplikasi Authenticator Anda untuk mengkonfirmasi." });
  }

  const ok = await updateProfile(userId, {
    totp_secret: null,
    totp_enabled: false,
    totp_verified_at: null,
  });
  if (!ok) return res.status(500).json({ error: "Gagal menonaktifkan TOTP" });

  logger.info({ userId }, "TOTP disabled");
  return res.json({ success: true, message: "TOTP Authenticator berhasil dinonaktifkan" });
});

export default router;
