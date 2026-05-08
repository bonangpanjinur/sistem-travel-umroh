import { Router } from "express";

const router = Router();

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

  const isProduction = process.env.MIDTRANS_ENV === "production";
  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const orderId = `${booking_code}-${Date.now()}`;
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

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
    const response = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Midtrans] Error response:", response.status, errorText);
      res.status(response.status).json({ error: `Midtrans error: ${response.status}`, detail: errorText });
      return;
    }

    const data = await response.json() as { token: string; redirect_url: string };
    res.json({ token: data.token, redirect_url: data.redirect_url, order_id: orderId });
  } catch (err: any) {
    console.error("[Midtrans] fetch error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Midtrans", detail: err.message });
  }
});

export default router;
