/**
 * WhatsApp Notifier — Fonnte API integration
 * Sends messages directly from the browser using the Fonnte REST API.
 * Token is stored in the whatsapp_config table (fetched by the caller).
 *
 * Fonnte docs: https://fonnte.com/docs
 * Endpoint: POST https://api.fonnte.com/send
 * Header:   Authorization: <TOKEN>
 */

export interface SendWAPayload {
  token: string;
  target: string;      // phone number, e.g. "628123456789" or "08123456789"
  message: string;
  countryCode?: string; // default "62" (Indonesia)
}

export interface SendWAResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WASendLog {
  phone: string;
  message: string;
  status: "sent" | "failed" | "pending";
  errorMessage?: string;
  sentAt: Date;
}

/** Normalise Indonesian phone number to E.164 without "+" */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (!digits.startsWith("62")) return "62" + digits;
  return digits;
}

/** Send a single WhatsApp message via Fonnte */
export async function sendWhatsAppMessage(payload: SendWAPayload): Promise<SendWAResult> {
  const { token, target, message, countryCode = "62" } = payload;
  if (!token) return { success: false, error: "API token tidak dikonfigurasi" };
  if (!target) return { success: false, error: "Nomor tujuan tidak boleh kosong" };
  if (!message) return { success: false, error: "Pesan tidak boleh kosong" };

  const phone = normalisePhone(target);

  try {
    const formData = new FormData();
    formData.append("target", phone);
    formData.append("message", message);
    formData.append("countryCode", countryCode);
    formData.append("typing", "true");  // simulate typing indicator

    const resp = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });

    const data = await resp.json();

    if (!resp.ok || data.status === false) {
      return { success: false, error: data.reason || data.message || "Gagal mengirim pesan" };
    }
    return { success: true, messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

/** Send to multiple recipients and return per-recipient results */
export async function sendWhatsAppBulk(
  token: string,
  recipients: Array<{ phone: string; message: string; name?: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<WASendLog[]> {
  const logs: WASendLog[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const { phone, message } = recipients[i];
    const result = await sendWhatsAppMessage({ token, target: phone, message });
    logs.push({
      phone: normalisePhone(phone),
      message,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
      sentAt: new Date(),
    });
    onProgress?.(i + 1, recipients.length);

    // 1-second delay between messages to avoid rate-limiting
    if (i < recipients.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return logs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in message templates with variable substitution
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateVars = Record<string, string | number>;

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

/** Default templates (used when DB templates are not available) */
export const DEFAULT_TEMPLATES = {
  BOOKING_CONFIRM: {
    name: "Konfirmasi Booking",
    template: `Assalamu'alaikum {nama} 🕌

✅ *Booking Anda Berhasil!*

📋 Kode Booking: *{kode_booking}*
📦 Paket: {nama_paket}
📅 Keberangkatan: {tanggal_berangkat}
💰 Total: {total_harga}
💳 DP/Terbayar: {terbayar}
⏳ Sisa: {sisa_bayar}

Terima kasih telah mempercayakan perjalanan ibadah Anda kepada kami. 🙏

Informasi lebih lanjut: {nomor_cs}`,
    variables: ["nama", "kode_booking", "nama_paket", "tanggal_berangkat", "total_harga", "terbayar", "sisa_bayar", "nomor_cs"],
  },

  PAYMENT_CONFIRM: {
    name: "Konfirmasi Pembayaran",
    template: `Assalamu'alaikum {nama} 🕌

✅ *Pembayaran Diterima!*

📋 Kode Booking: *{kode_booking}*
💰 Jumlah Diterima: *{jumlah_bayar}*
📅 Tanggal: {tanggal_bayar}
💳 Total Terbayar: {total_terbayar}
⏳ Sisa: {sisa_bayar}

Jazakallahu khairan atas kepercayaan Anda. 🙏

Info: {nomor_cs}`,
    variables: ["nama", "kode_booking", "jumlah_bayar", "tanggal_bayar", "total_terbayar", "sisa_bayar", "nomor_cs"],
  },

  PAYMENT_LUNAS: {
    name: "Pembayaran Lunas",
    template: `Assalamu'alaikum {nama} 🕌

🎉 *Pembayaran Lunas!*

Alhamdulillah, pembayaran Anda untuk paket *{nama_paket}* telah LUNAS.

📋 Kode Booking: *{kode_booking}*
📅 Keberangkatan: {tanggal_berangkat}

Kami akan segera memproses dokumen perjalanan Anda. Mohon lengkapi persyaratan dokumen jika belum.

Informasi: {nomor_cs} 🙏`,
    variables: ["nama", "nama_paket", "kode_booking", "tanggal_berangkat", "nomor_cs"],
  },

  DOCUMENT_READY: {
    name: "Dokumen Siap",
    template: `Assalamu'alaikum {nama} 🕌

📄 *Dokumen Anda Sudah Siap!*

Jenis dokumen: *{jenis_dokumen}*
Paket: {nama_paket}
Keberangkatan: {tanggal_berangkat}

Silakan hubungi kami untuk pengambilan dokumen.

Info: {nomor_cs} 🙏`,
    variables: ["nama", "jenis_dokumen", "nama_paket", "tanggal_berangkat", "nomor_cs"],
  },

  DEPARTURE_REMINDER: {
    name: "Pengingat Keberangkatan",
    template: `Assalamu'alaikum {nama} 🕌

⏰ *Pengingat Keberangkatan!*

Keberangkatan Umrah/Haji Anda tinggal *{sisa_hari} hari* lagi!

📅 Tanggal: {tanggal_berangkat}
✈️ Nomor Penerbangan: {nomor_penerbangan}
🏨 Hotel Makkah: {hotel_makkah}
📍 Titik Kumpul: {titik_kumpul}

Pastikan dokumen perjalanan Anda sudah lengkap.
Semoga menjadi haji/umrah yang mabrur! 🤲

Info: {nomor_cs}`,
    variables: ["nama", "sisa_hari", "tanggal_berangkat", "nomor_penerbangan", "hotel_makkah", "titik_kumpul", "nomor_cs"],
  },

  EQUIPMENT_READY: {
    name: "Perlengkapan Siap Ambil",
    template: `Assalamu'alaikum {nama} 🕌

📦 *Perlengkapan Anda Siap Diambil!*

Perlengkapan perjalanan untuk paket *{nama_paket}* sudah siap.

📅 Tanggal Ambil: {tanggal_ambil}
📍 Lokasi: {lokasi_ambil}

Harap membawa kartu identitas saat pengambilan.

Info: {nomor_cs} 🙏`,
    variables: ["nama", "nama_paket", "tanggal_ambil", "lokasi_ambil", "nomor_cs"],
  },

  CUSTOM: {
    name: "Pesan Custom",
    template: `Assalamu'alaikum {nama} 🕌

{isi_pesan}

{nomor_cs}`,
    variables: ["nama", "isi_pesan", "nomor_cs"],
  },
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

export function buildMessage(templateKey: TemplateKey, vars: TemplateVars): string {
  const tpl = DEFAULT_TEMPLATES[templateKey];
  return renderTemplate(tpl.template, vars);
}
