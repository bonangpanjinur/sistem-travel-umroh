/**
 * TOTP (Time-based One-Time Password) routes
 * Uses speakeasy for secret generation & verification.
 * Token verified via JWT (no Supabase dependency).
 */

import { Router } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { logger } from "../lib/logger.js";
import { verifyRequestToken } from "../lib/auth.js";
import { pool } from "../lib/db.js";

const router = Router();

const APP_NAME = process.env["APP_NAME"] || "Vinstour Travel";

async function getProfile(userId: string): Promise<any | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, totp_secret, totp_enabled, totp_verified_at FROM profiles WHERE id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0] ?? null;
  } finally {
    client.release();
  }
}

async function updateProfile(userId: string, patch: Record<string, unknown>): Promise<boolean> {
  const client = await pool.connect();
  try {
    const keys = Object.keys(patch);
    if (keys.length === 0) return true;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => patch[k]);
    await client.query(
      `UPDATE profiles SET ${sets}, updated_at = NOW() WHERE id = $1`,
      [userId, ...values]
    );
    return true;
  } finally {
    client.release();
  }
}

// POST /api/totp/setup — generate TOTP secret + QR code
router.post("/setup", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const secret = speakeasy.generateSecret({ name: `${APP_NAME} (${payload.email})`, length: 20 });
    const qr = await QRCode.toDataURL(secret.otpauth_url!);

    await updateProfile(payload.sub, {
      totp_secret: secret.base32,
      totp_enabled: false,
      totp_verified_at: null,
    });

    res.json({ success: true, secret: secret.base32, qr });
  } catch (err) {
    logger.error({ err }, "totp/setup error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/totp/verify — verify OTP token
router.post("/verify", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token wajib diisi." });
    return;
  }

  try {
    const profile = await getProfile(payload.sub);
    if (!profile?.totp_secret) {
      res.status(400).json({ error: "TOTP belum disetup." });
      return;
    }

    const valid = speakeasy.totp.verify({
      secret: profile.totp_secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!valid) {
      res.status(400).json({ error: "Kode tidak valid atau sudah kadaluarsa." });
      return;
    }

    await updateProfile(payload.sub, {
      totp_enabled: true,
      totp_verified_at: new Date().toISOString(),
    });

    res.json({ success: true, message: "TOTP berhasil diaktifkan." });
  } catch (err) {
    logger.error({ err }, "totp/verify error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/totp/validate — validate TOTP token (login 2FA)
router.post("/validate", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token wajib diisi." });
    return;
  }

  try {
    const profile = await getProfile(payload.sub);
    if (!profile?.totp_secret || !profile?.totp_enabled) {
      res.status(400).json({ error: "TOTP tidak aktif." });
      return;
    }

    const valid = speakeasy.totp.verify({
      secret: profile.totp_secret,
      encoding: "base32",
      token,
      window: 1,
    });

    res.json({ valid });
  } catch (err) {
    logger.error({ err }, "totp/validate error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/totp/disable — disable TOTP
router.post("/disable", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await updateProfile(payload.sub, {
      totp_secret: null,
      totp_enabled: false,
      totp_verified_at: null,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "totp/disable error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/totp/status — get TOTP status
router.get("/status", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profile = await getProfile(payload.sub);
    res.json({
      enabled: profile?.totp_enabled ?? false,
      verified_at: profile?.totp_verified_at ?? null,
    });
  } catch (err) {
    logger.error({ err }, "totp/status error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
