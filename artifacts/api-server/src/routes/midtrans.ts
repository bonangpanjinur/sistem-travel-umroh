import { Router } from "express";

const router = Router();

// ─── Helper ───────────────────────────────────────────────────────────────────

function getCoreApiBase() {
  return process.env.MIDTRANS_ENV === "production"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function getSnapBase() {
  return process.env.MIDTRANS_ENV === "production"
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function getAuthHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

// ─── POST /create-transaction — Snap (semua metode via popup) ────────────────

router.post("/create-transaction", async (req, res) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    res.status(503).json({ error: "Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di environment." });
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
        "Authorization": getAuthHeader(serverKey),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
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

// ─── POST /create-qris — Core API: generate QRIS QR code ────────────────────

router.post("/create-qris", async (req, res) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    res.status(503).json({ error: "Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di environment." });
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
    qris: {
      acquirer: "gopay",
    },
  };

  try {
    const response = await fetch(`${getCoreApiBase()}/charge`, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(serverKey),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    // Midtrans Core API returns 201 for success (embedded in body status_code)
    if (data.status_code !== "201") {
      console.error("[Midtrans QRIS] Error:", data);
      res.status(400).json({
        error: data.status_message || "Gagal membuat QRIS",
        status_code: data.status_code,
        detail: data,
      });
      return;
    }

    // QR code URL is in actions array
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
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
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
        "Authorization": getAuthHeader(serverKey),
        "Accept": "application/json",
      },
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

export default router;
