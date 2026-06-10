import { Router } from "express";
import crypto from "crypto";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const XENDIT_BASE = "https://api.xendit.co";

function getXenditKey(): string | null {
  return process.env.XENDIT_SECRET_KEY || null;
}

function getXenditAuthHeader(key?: string): string {
  const k = key || process.env.XENDIT_SECRET_KEY || "";
  return `Basic ${Buffer.from(`${k}:`).toString("base64")}`;
}

function getXenditEnv(): "live" | "test" {
  const key = getXenditKey() || "";
  if (key.startsWith("xnd_development") || key.startsWith("xnd_public_development")) return "test";
  return process.env.XENDIT_ENV === "live" ? "live" : "test";
}

/** Verify Xendit webhook using x-callback-token header */
function verifyXenditCallback(req: any): boolean {
  const token = req.headers["x-callback-token"];
  const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
  if (!expectedToken) return true; // skip if not configured
  return token === expectedToken;
}

async function xenditUpdatePayment(
  externalId: string,
  status: string,
  transactionId: string,
  paymentMethod: string
): Promise<void> {
  try {
    const { pool } = await import("../lib/db.js");
    const newStatus =
      status === "PAID" || status === "SETTLED" ? "verified" :
      status === "PENDING" ? "pending" :
      status === "EXPIRED" || status === "FAILED" ? "failed" :
      "pending";

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id FROM payments WHERE payment_code = $1 LIMIT 1`,
        [externalId]
      );
      if (rows.length > 0) {
        await client.query(
          `UPDATE payments SET status = $1, payment_method = 'xendit', bank_name = $2,
           notes = $3, updated_at = NOW() WHERE id = $4`,
          [newStatus, paymentMethod, `Xendit notification: ${status} (id: ${transactionId})`, rows[0].id]
        );
      } else {
        console.warn(`[Xendit Webhook] No payment found for external_id: ${externalId}`);
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn("[Xendit Webhook] DB update failed:", err.message);
  }
}

// ─── GET /config-status ───────────────────────────────────────────────────────

router.get("/config-status", (_req, res) => {
  const key = getXenditKey();
  const callbackToken = !!process.env.XENDIT_CALLBACK_TOKEN;
  const env = getXenditEnv();

  res.json({
    secret_key_configured: !!key,
    callback_token_configured: callbackToken,
    environment: env,
    ready: !!key,
    key_hint: key ? `${key.slice(0, 16)}...` : null,
  });
});

// ─── POST /test-connection ────────────────────────────────────────────────────

router.post("/test-connection", async (req, res) => {
  const key = req.body?.secret_key || getXenditKey();
  if (!key) {
    res.status(400).json({
      success: false,
      message: "Secret Key belum dikonfigurasi. Set XENDIT_SECRET_KEY di Replit Secrets.",
    });
    return;
  }

  try {
    const response = await fetch(`${XENDIT_BASE}/balance`, {
      method: "GET",
      headers: {
        Authorization: getXenditAuthHeader(key),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401) {
      res.json({ success: false, message: "Secret Key tidak valid — Xendit menolak autentikasi (401).", status: 401 });
      return;
    }

    const data = await response.json() as any;
    const env = key.startsWith("xnd_development") ? "Test" : "Live";
    res.json({
      success: true,
      message: `Koneksi ke Xendit berhasil! Mode: ${env} 🟢`,
      environment: env.toLowerCase(),
      balance: data.balance ?? null,
      status: response.status,
    });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      res.json({ success: false, message: "Timeout — Xendit tidak merespons dalam 8 detik." });
    } else {
      res.json({ success: false, message: `Gagal terhubung ke Xendit: ${err.message}` });
    }
  }
});

// ─── POST /create-invoice — Xendit Invoice (most flexible, supports all methods)

router.post("/create-invoice", async (req, res) => {
  const key = getXenditKey();
  if (!key) {
    res.status(503).json({ error: "Xendit belum dikonfigurasi. Set XENDIT_SECRET_KEY di Replit Secrets." });
    return;
  }

  const {
    booking_id, booking_code, amount,
    customer_name, customer_email, customer_phone,
    payment_methods,
  } = req.body;

  if (!booking_code || !amount || amount <= 0) {
    res.status(400).json({ error: "booking_code dan amount wajib diisi" });
    return;
  }

  const externalId = `INV-${booking_code}-${Date.now()}`;
  const frontendUrl = process.env.FRONTEND_URL || "";

  const payload: Record<string, unknown> = {
    external_id: externalId,
    amount: Math.round(amount),
    description: `Pembayaran Booking ${booking_code}`,
    invoice_duration: 86400,
    customer: {
      given_names: customer_name || "Jamaah",
      email: customer_email || "jamaah@vinstour.com",
      mobile_number: customer_phone || "+6281234567890",
    },
    customer_notification_preference: {
      invoice_created: ["email", "whatsapp"],
      invoice_reminder: ["email", "whatsapp"],
      invoice_paid: ["email", "whatsapp"],
    },
    success_redirect_url: frontendUrl ? `${frontendUrl}/my-bookings/${booking_id}?payment=success` : undefined,
    failure_redirect_url: frontendUrl ? `${frontendUrl}/my-bookings/${booking_id}?payment=failed` : undefined,
    currency: "IDR",
    items: [
      {
        name: `Paket Umroh/Haji - Booking ${booking_code}`,
        quantity: 1,
        price: Math.round(amount),
        url: frontendUrl ? `${frontendUrl}/packages` : undefined,
      },
    ],
  };

  if (payment_methods && Array.isArray(payment_methods) && payment_methods.length > 0) {
    payload.payment_methods = payment_methods;
  }

  try {
    const response = await fetch(`${XENDIT_BASE}/v2/invoices`, {
      method: "POST",
      headers: {
        Authorization: getXenditAuthHeader(key),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("[Xendit Invoice] Error:", response.status, data);
      res.status(response.status).json({ error: data.message || "Gagal membuat invoice", detail: data });
      return;
    }

    res.json({
      invoice_id: data.id,
      external_id: data.external_id,
      invoice_url: data.invoice_url,
      expiry_date: data.expiry_date,
      amount: data.amount,
      status: data.status,
    });
  } catch (err: any) {
    console.error("[Xendit Invoice] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Xendit", detail: err.message });
  }
});

// ─── POST /create-qris ────────────────────────────────────────────────────────

router.post("/create-qris", async (req, res) => {
  const key = getXenditKey();
  if (!key) {
    res.status(503).json({ error: "Xendit belum dikonfigurasi. Set XENDIT_SECRET_KEY di Replit Secrets." });
    return;
  }

  const { booking_id, booking_code, amount, customer_name } = req.body;

  if (!booking_code || !amount || amount <= 0) {
    res.status(400).json({ error: "booking_code dan amount wajib diisi" });
    return;
  }

  const externalId = `QRIS-${booking_code}-${Date.now()}`;

  const payload = {
    reference_id: externalId,
    type: "DYNAMIC",
    currency: "IDR",
    amount: Math.round(amount),
    metadata: { booking_code, customer_name: customer_name || "Jamaah" },
  };

  try {
    const response = await fetch(`${XENDIT_BASE}/qr_codes`, {
      method: "POST",
      headers: {
        Authorization: getXenditAuthHeader(key),
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-version": "2022-07-31",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("[Xendit QRIS] Error:", response.status, data);
      res.status(response.status).json({ error: data.message || "Gagal membuat QRIS", detail: data });
      return;
    }

    res.json({
      id: data.id,
      reference_id: data.reference_id,
      qr_string: data.qr_string,
      status: data.status,
      amount: data.amount,
      expires_at: data.expires_at,
    });
  } catch (err: any) {
    console.error("[Xendit QRIS] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Xendit", detail: err.message });
  }
});

// ─── POST /create-va — Virtual Account ───────────────────────────────────────

const XENDIT_VA_BANKS = ["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "BSI", "BJB", "CIMB", "SAHABAT_SAMPOERNA"];

router.post("/create-va", async (req, res) => {
  const key = getXenditKey();
  if (!key) {
    res.status(503).json({ error: "Xendit belum dikonfigurasi. Set XENDIT_SECRET_KEY di Replit Secrets." });
    return;
  }

  const {
    booking_id, booking_code, amount,
    customer_name, customer_email, customer_phone,
    bank = "BNI",
  } = req.body;

  if (!booking_code || !amount || amount <= 0) {
    res.status(400).json({ error: "booking_code dan amount wajib diisi" });
    return;
  }

  const bankCode = (bank as string).toUpperCase();
  if (!XENDIT_VA_BANKS.includes(bankCode)) {
    res.status(400).json({ error: `Bank tidak didukung: ${bank}. Pilih: ${XENDIT_VA_BANKS.join(", ")}` });
    return;
  }

  const externalId = `VA-${bankCode}-${booking_code}-${Date.now()}`;

  const payload: Record<string, unknown> = {
    external_id: externalId,
    bank_code: bankCode,
    name: (customer_name || "Jamaah Vinstour").substring(0, 50),
    expected_amount: Math.round(amount),
    is_single_use: true,
    is_closed: true,
    expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    description: `Booking ${booking_code}`,
  };

  if (customer_email) payload.email = customer_email;

  try {
    const response = await fetch(`${XENDIT_BASE}/callback_virtual_accounts`, {
      method: "POST",
      headers: {
        Authorization: getXenditAuthHeader(key),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("[Xendit VA] Error:", response.status, data);
      res.status(response.status).json({ error: data.message || "Gagal membuat Virtual Account", detail: data });
      return;
    }

    res.json({
      id: data.id,
      external_id: data.external_id,
      bank_code: data.bank_code,
      account_number: data.account_number,
      name: data.name,
      expected_amount: data.expected_amount,
      expiration_date: data.expiration_date,
      status: data.status,
    });
  } catch (err: any) {
    console.error("[Xendit VA] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Xendit", detail: err.message });
  }
});

// ─── POST /notification — Xendit webhook ─────────────────────────────────────

router.post("/notification", async (req, res) => {
  if (!verifyXenditCallback(req)) {
    console.warn("[Xendit Webhook] Invalid callback token");
    res.status(403).json({ error: "Invalid callback token" });
    return;
  }

  const body = req.body;
  if (!body) {
    res.status(400).json({ error: "Empty payload" });
    return;
  }

  // Xendit sends different payload shapes per payment type
  const externalId   = body.external_id || body.reference_id || null;
  const status       = body.status || body.payment_status || null;
  const transactionId = body.id || body.transaction_id || "";
  const paymentMethod = body.payment_method || body.payment_channel || body.type || "xendit";

  if (!externalId || !status) {
    res.status(200).json({ received: true, note: "Missing external_id or status" });
    return;
  }

  console.log(`[Xendit Webhook] external_id=${externalId} status=${status} method=${paymentMethod}`);

  const actionable = ["PAID", "SETTLED", "EXPIRED", "FAILED", "PENDING"];
  if (actionable.includes(status)) {
    try {
      await xenditUpdatePayment(externalId, status, transactionId, paymentMethod);
    } catch (err: any) {
      console.error("[Xendit Webhook] DB update failed:", err.message);
    }
  }

  res.status(200).json({ received: true, external_id: externalId, status });
});

export default router;
