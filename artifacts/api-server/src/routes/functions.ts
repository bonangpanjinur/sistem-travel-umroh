/**
 * /api/functions/:name — stub router for Supabase Edge Functions
 * Routes previously-invoked edge functions to Express handlers.
 * Functions not yet implemented return a graceful 501 instead of crashing.
 */

import { Router } from "express";
import { logger } from "../lib/logger.js";
import { verifyRequestToken } from "../lib/auth.js";
import { pool } from "../lib/db.js";

const router = Router();

// ── request-2fa-otp ──────────────────────────────────────────────────────────
router.post("/request-2fa-otp", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { purpose, method, phone } = req.body as {
    purpose?: string;
    method?: string;
    phone?: string;
  };

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT is_enabled, method, phone_number FROM user_2fa_settings WHERE user_id = $1 LIMIT 1`,
        [payload.sub]
      );
      const settings = rows[0];

      if (!settings?.is_enabled) {
        res.json({ ok: false, error: "2FA tidak aktif" });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await client.query(
        `INSERT INTO otp_tokens (user_id, token, purpose, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, purpose) DO UPDATE SET token = $2, expires_at = $4, created_at = NOW()`,
        [payload.sub, otp, purpose ?? "login", expiresAt]
      );

      const destination =
        method === "email" ? payload.email :
        (phone ?? settings.phone_number ?? "unknown");

      logger.info({ userId: payload.sub, purpose }, "2FA OTP generated (not sent — configure Fonnte/SMTP)");

      res.json({ ok: true, destination, debug_otp_for_dev: process.env["NODE_ENV"] !== "production" ? otp : undefined });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, "request-2fa-otp error");
    res.status(500).json({ error: "Server error" });
  }
});

// ── verify-2fa-otp ───────────────────────────────────────────────────────────
router.post("/verify-2fa-otp", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { purpose, code } = req.body as { purpose?: string; code?: string };
  if (!code) {
    res.status(400).json({ error: "code wajib diisi" });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT token, expires_at FROM otp_tokens WHERE user_id = $1 AND purpose = $2 LIMIT 1`,
        [payload.sub, purpose ?? "login"]
      );
      const row = rows[0];

      if (!row || row.token !== code) {
        res.json({ ok: false, error: "Kode tidak valid" });
        return;
      }

      if (new Date(row.expires_at) < new Date()) {
        res.json({ ok: false, error: "Kode sudah kadaluarsa" });
        return;
      }

      await client.query(
        `DELETE FROM otp_tokens WHERE user_id = $1 AND purpose = $2`,
        [payload.sub, purpose ?? "login"]
      );

      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, "verify-2fa-otp error");
    res.status(500).json({ error: "Server error" });
  }
});

// ── push-subscribe ───────────────────────────────────────────────────────────
router.post("/push-subscribe", async (req, res) => {
  res.json({ ok: true, message: "Push notifications not yet configured on this server." });
});

// ── send-push ────────────────────────────────────────────────────────────────
router.post("/send-push", async (_req, res) => {
  res.json({ ok: false, message: "Push send not yet implemented." });
});

// ── process-push-queue ───────────────────────────────────────────────────────
router.post("/process-push-queue", async (_req, res) => {
  res.json({ ok: false, processed: 0, message: "Push queue not yet implemented." });
});

// ── Catch-all — graceful 501 for unimplemented functions ────────────────────
router.post("/:name", (req, res) => {
  logger.warn({ name: req.params.name }, "Edge function not implemented");
  res.status(501).json({
    ok: false,
    error: `Edge function '${req.params.name}' is not yet implemented on this server.`,
  });
});

export default router;
