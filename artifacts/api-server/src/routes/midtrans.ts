import { Router } from "express";
import crypto from "crypto";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMidtransEnv(): "sandbox" | "production" {
  return (process.env.MIDTRANS_ENV === "production") ? "production" : "sandbox";
}

function getCoreApiBase(): string {
  return getMidtransEnv() === "production"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function getSnapBase(): string {
  return getMidtransEnv() === "production"
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function getAuthHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

/** Resolve server key: prefers env var, falls back to request header x-midtrans-server-key (for UI-initiated test only). */
function resolveServerKey(req?: any): string | null {
  return process.env.MIDTRANS_SERVER_KEY
    || (req?.headers?.["x-midtrans-server-key"] as string | undefined)
    || null;
}

/** Verify Midtrans notification signature.
 *  Signature = SHA512( order_id + status_code + gross_amount + server_key )
 */
function verifySignature(body: any, serverKey: string): boolean {
  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return body.signature_key === expected;
}

/** Update payment status in Supabase via REST API (no SDK needed in backend). */
async function supabaseUpdatePayment(
  orderId: string,
  status: string,
  transactionId: string,
  paymentType: string
): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[Midtrans Webhook] Supabase URL/key not set — cannot update payment");
    return;
  }

  // Determine new payment status
  const newStatus =
    status === "capture" || status === "settlement" ? "verified" :
    status === "pending" ? "pending" :
    status === "deny" || status === "cancel" || status === "expire" ? "failed" :
    "pending";

  // Find payment by payment_code (order_id)
  const findRes = await fetch(
    `${url}/rest/v1/payments?payment_code=eq.${encodeURIComponent(orderId)}&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const existing = await findRes.json() as any[];

  if (existing?.length) {
    // Update existing payment row
    await fetch(`${url}/rest/v1/payments?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: newStatus,
        payment_method: "midtrans",
        bank_name: paymentType,
        notes: `Midtrans notification: ${status} (tx: ${transactionId})`,
      }),
    });
  } else {
    console.warn(`[Midtrans Webhook] No payment found for order_id: ${orderId}`);
  }
}

// ─── GET /config-status — Check env var configuration ────────────────────────

router.get("/config-status", (_req, res) => {
  const serverKeySet = !!process.env.MIDTRANS_SERVER_KEY;
  const clientKeySet = !!process.env.MIDTRANS_CLIENT_KEY;
  const env = getMidtransEnv();

  res.json({
    server_key_configured: serverKeySet,
    client_key_configured: clientKeySet,
    environment: env,
    ready: serverKeySet,
    // Partially mask if set
    server_key_hint: process.env.MIDTRANS_SERVER_KEY
      ? `${process.env.MIDTRANS_SERVER_KEY.slice(0, 12)}...`
      : null,
    client_key_hint: process.env.MIDTRANS_CLIENT_KEY
      ? `${process.env.MIDTRANS_CLIENT_KEY.slice(0, 12)}...`
      : null,
  });
});

// ─── POST /test-connection — Real Midtrans connectivity test ─────────────────

router.post("/test-connection", async (req, res) => {
  // Allow passing key from body for UI-initiated test (never used in production flows)
  const serverKey = process.env.MIDTRANS_SERVER_KEY || req.body?.server_key;
  if (!serverKey) {
    res.status(400).json({
      success: false,
      message: "Server Key belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di Replit Secrets.",
    });
    return;
  }

  const env = req.body?.sandbox === false ? "production" : getMidtransEnv();
  const base = env === "production"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

  try {
    // Use a non-existent order_id — Midtrans will return 404 which still means auth worked.
    const response = await fetch(`${base}/ping`, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(serverKey),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    // Midtrans Core API doesn't have /ping, so 404 = authenticated (vs 401 = bad key)
    if (response.status === 401) {
      res.json({ success: false, message: "Server Key tidak valid — Midtrans menolak autentikasi (401).", status: 401 });
      return;
    }

    res.json({
      success: true,
      message: `Koneksi ke Midtrans berhasil! Mode: ${env === "production" ? "Production 🟢" : "Sandbox ⚙️"}`,
      environment: env,
      status: response.status,
    });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      res.json({ success: false, message: "Timeout — Midtrans tidak merespons dalam 8 detik." });
    } else {
      res.json({ success: false, message: `Gagal terhubung ke Midtrans: ${err.message}` });
    }
  }
});

// ─── POST /create-transaction — Snap token (all payment methods) ─────────────

router.post("/create-transaction", async (req, res) => {
  const serverKey = resolveServerKey(req);
  if (!serverKey) {
    res.status(503).json({ error: "Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di Replit Secrets." });
    return;
  }

  const { booking_id, booking_code, amount, customer_name, customer_email, customer_phone } = req.body;

  if (!booking_code || !amount || amount <= 0) {
    res.status(400).json({ error: "booking_code dan amount wajib diisi" });
    return;
  }

  const orderId = `${booking_code}-${Date.now()}`;

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(amount),
    },
    customer_details: {
      first_name: customer_name || "Jamaah",
      email: customer_email || "jamaah@vinstour.com",
      phone: customer_phone || "08000000000",
    },
    item_details: [
      {
        id: booking_id || booking_code,
        price: Math.round(amount),
        quantity: 1,
        name: `Pembayaran Booking ${booking_code}`,
      },
    ],
    callbacks: {
      finish: `${process.env.FRONTEND_URL || ""}/my-bookings/${booking_id}?payment=finish`,
    },
  };

  try {
    const response = await fetch(`${getSnapBase()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(serverKey),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Midtrans Snap] Error:", response.status, errorText);
      res.status(response.status).json({ error: `Midtrans error: ${response.status}`, detail: errorText });
      return;
    }

    const data = await response.json() as { token: string; redirect_url: string };
    res.json({ token: data.token, redirect_url: data.redirect_url, order_id: orderId });
  } catch (err: any) {
    console.error("[Midtrans Snap] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Midtrans", detail: err.message });
  }
});

// ─── POST /create-qris — Core API: generate QRIS ─────────────────────────────

router.post("/create-qris", async (req, res) => {
  const serverKey = resolveServerKey(req);
  if (!serverKey) {
    res.status(503).json({ error: "Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di Replit Secrets." });
    return;
  }

  const { booking_id, booking_code, amount, customer_name, customer_email, customer_phone } = req.body;

  if (!booking_code || !amount || amount <= 0) {
    res.status(400).json({ error: "booking_code dan amount wajib diisi" });
    return;
  }

  const orderId = `QRIS-${booking_code}-${Date.now()}`;

  const payload = {
    payment_type: "qris",
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(amount),
    },
    customer_details: {
      first_name: customer_name || "Jamaah",
      email: customer_email || "jamaah@vinstour.com",
      phone: customer_phone || "08000000000",
    },
    item_details: [
      {
        id: booking_id || booking_code,
        price: Math.round(amount),
        quantity: 1,
        name: `Pembayaran Booking ${booking_code}`,
      },
    ],
    qris: { acquirer: "gopay" },
  };

  try {
    const response = await fetch(`${getCoreApiBase()}/charge`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(serverKey),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json() as any;

    if (data.status_code !== "201") {
      console.error("[Midtrans QRIS] Error:", data);
      res.status(400).json({
        error: data.status_message || "Gagal membuat QRIS",
        status_code: data.status_code,
        detail: data,
      });
      return;
    }

    const qrAction = (data.actions as any[] | undefined)?.find(
      (a: any) => a.name === "generate-qr-code"
    );

    res.json({
      transaction_id: data.transaction_id,
      order_id: data.order_id,
      qr_code_url: qrAction?.url ?? null,
      qr_string: data.qr_string ?? null,
      expiry_time: data.expiry_time ?? null,
      gross_amount: data.gross_amount,
      transaction_status: data.transaction_status,
    });
  } catch (err: any) {
    console.error("[Midtrans QRIS] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Midtrans", detail: err.message });
  }
});

// ─── GET /qris-status/:orderId — Poll QRIS payment status ───────────────────

router.get("/qris-status/:orderId", async (req, res) => {
  const serverKey = resolveServerKey(req);
  if (!serverKey) {
    res.status(503).json({ error: "Midtrans belum dikonfigurasi" });
    return;
  }

  const { orderId } = req.params;
  if (!orderId) {
    res.status(400).json({ error: "orderId wajib diisi" });
    return;
  }

  try {
    const response = await fetch(`${getCoreApiBase()}/${encodeURIComponent(orderId)}/status`, {
      headers: {
        Authorization: getAuthHeader(serverKey),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as any;

    res.json({
      transaction_status: data.transaction_status,
      fraud_status: data.fraud_status,
      status_message: data.status_message,
      order_id: data.order_id,
      transaction_id: data.transaction_id,
      gross_amount: data.gross_amount,
      payment_type: data.payment_type,
      settlement_time: data.settlement_time,
    });
  } catch (err: any) {
    console.error("[Midtrans QRIS status] error:", err.message);
    res.status(500).json({ error: "Gagal cek status pembayaran", detail: err.message });
  }
});

// ─── POST /notification — Midtrans webhook (payment notification) ─────────────
// Register this URL in Midtrans Dashboard → Settings → Configuration → Payment Notification URL
// URL: https://your-api-domain/api/midtrans/notification

router.post("/notification", async (req, res) => {
  const body = req.body;
  if (!body?.order_id) {
    res.status(400).json({ error: "Invalid notification payload" });
    return;
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.warn("[Midtrans Webhook] MIDTRANS_SERVER_KEY not set — signature cannot be verified");
    res.status(200).json({ received: true, note: "Server key not configured" });
    return;
  }

  // Verify signature
  if (!verifySignature(body, serverKey)) {
    console.warn("[Midtrans Webhook] Invalid signature for order:", body.order_id);
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  const {
    order_id,
    transaction_status,
    transaction_id,
    payment_type,
    fraud_status,
  } = body;

  console.log(`[Midtrans Webhook] order=${order_id} status=${transaction_status} payment=${payment_type}`);

  // Only update for actionable statuses
  const actionable = ["capture", "settlement", "pending", "deny", "cancel", "expire"];
  if (actionable.includes(transaction_status)) {
    // Skip if fraud
    if (fraud_status === "deny") {
      console.warn(`[Midtrans Webhook] Fraud detected for order: ${order_id}`);
    }
    try {
      await supabaseUpdatePayment(order_id, transaction_status, transaction_id, payment_type);
    } catch (err: any) {
      console.error("[Midtrans Webhook] DB update failed:", err.message);
    }
  }

  // Always return 200 to Midtrans
  res.status(200).json({ received: true, order_id, transaction_status });
});

export default router;
