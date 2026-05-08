export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return res.status(500).json({
      error: "Email belum dikonfigurasi. Tambahkan RESEND_API_KEY di Vercel Environment Variables.",
    });
  }

  const { to, subject, html, from, reply_to } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "to, subject, dan html wajib diisi" });
  }

  const fromAddress = from || `Vinstour Travel <noreply@${process.env.EMAIL_DOMAIN || "vinstour.com"}>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(reply_to ? { reply_to } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[email/send] Resend error:", data);
      return res.status(response.status).json({ error: data.message || "Gagal mengirim email" });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("[email/send] Network error:", err);
    return res.status(500).json({ error: err.message || "Network error" });
  }
}
