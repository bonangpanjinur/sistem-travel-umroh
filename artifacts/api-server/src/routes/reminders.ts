import { Router } from "express";
import { logger } from "../lib/logger.js";
import { pool } from "../lib/db.js";

const router = Router();

async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch {
    return [];
  } finally {
    client.release();
  }
}

// ── Helper: get Fonnte token (env var first, then whatsapp_config DB) ─────────
async function getFonnteToken(): Promise<string> {
  if (process.env["FONNTE_TOKEN"]) return process.env["FONNTE_TOKEN"];
  const rows = await dbQuery(
    `SELECT api_key FROM whatsapp_config WHERE is_active = true AND api_key IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
  );
  return rows[0]?.api_key || "";
}

async function dbQueryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await dbQuery(sql, params);
  return rows[0] ?? null;
}

async function dbExec(sql: string, params: any[] = []): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(sql, params);
  } catch {}  finally {
    client.release();
  }
}

async function sendWA(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const FONNTE_TOKEN = await getFonnteToken();
  if (!FONNTE_TOKEN) return { success: false, error: "Konfigurasi WhatsApp belum diatur. Silakan atur di menu WhatsApp panel admin." };
  const digits = phone.replace(/\D/g, "");
  const target = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : "62" + digits;
  try {
    const form = new FormData();
    form.append("target", target);
    form.append("message", message);
    form.append("countryCode", "62");
    form.append("typing", "true");
    const resp = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: FONNTE_TOKEN },
      body: form,
    });
    const data: any = await resp.json();
    if (!resp.ok || data.status === false) {
      return { success: false, error: data.reason || data.message || "Fonnte error" };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function logWA(opts: {
  recipient_phone: string;
  recipient_name?: string;
  trigger_type: string;
  message_content: string;
  status: "sent" | "failed";
  error_message?: string;
}): Promise<void> {
  await dbExec(
    `INSERT INTO whatsapp_logs (recipient_phone, recipient_name, trigger_type, message_content, status, error_message, sent_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
    [opts.recipient_phone, opts.recipient_name ?? null, opts.trigger_type, opts.message_content, opts.status, opts.error_message ?? null]
  );
}

async function getAppSettingJson(key: string): Promise<any> {
  const row = await dbQueryOne(`SELECT value FROM app_settings WHERE key = $1 LIMIT 1`, [key]);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

async function getWAOtomatisTriggers(): Promise<Record<string, boolean>> {
  const val = await getAppSettingJson("wa_otomatis_triggers");
  return val ?? {};
}

async function getWATemplate(key: string, fallback: string): Promise<string> {
  const val = await getAppSettingJson(key);
  return typeof val === "string" ? val : fallback;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ─── Cicilan Reminders ───────────────────────────────────────────────────────

async function getCicilanSettings(): Promise<{ reminder_days: number; auto_enabled: boolean; reminder_template: string }> {
  const defaults = {
    reminder_days: 3,
    auto_enabled: false,
    reminder_template: `Assalamu'alaikum *{nama}*,\n\n💰 *Pengingat Setoran Tabungan Umroh*\n\nSetoran Anda jatuh tempo dalam *{hari} hari* pada *{tanggal}*.\n\n• Jumlah: *{jumlah}*\n• Progress: *{progress}%*\n\nBarakallahu fiikum 🤲\n_Tim Vinstour Travel_`,
  };
  const val = await getAppSettingJson("cicilan_reminder_settings");
  if (!val) return defaults;
  return { ...defaults, ...val };
}

function buildCicilanMessage(template: string, data: {
  nama: string; hari: number; tanggal: string;
  jumlah: string; total: string; target: string; progress: number;
}): string {
  return template
    .replace(/{nama}/g, data.nama)
    .replace(/{hari}/g, data.hari.toString())
    .replace(/{tanggal_jatuh_tempo}/g, data.tanggal)
    .replace(/{tanggal}/g, data.tanggal)
    .replace(/{jumlah_cicilan}/g, data.jumlah)
    .replace(/{jumlah}/g, data.jumlah)
    .replace(/{total_terkumpul}/g, data.total)
    .replace(/{target}/g, data.target)
    .replace(/{progress}/g, data.progress.toString());
}

async function runCicilanReminders(): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };
  const settings = await getCicilanSettings();
  if (!settings.auto_enabled) { result.details.push("Auto-reminder cicilan tidak aktif"); return result; }

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + settings.reminder_days);

  const plans = await dbQuery(
    `SELECT sp.id, sp.customer_id, sp.target_amount, sp.installment_amount, sp.next_payment_date,
            p.full_name, p.phone
     FROM savings_plans sp
     LEFT JOIN profiles p ON p.id = sp.customer_id
     WHERE sp.status IN ('active','dp_paid')
       AND sp.next_payment_date BETWEEN $1 AND $2
     LIMIT 200`,
    [today.toISOString().slice(0, 10), cutoff.toISOString().slice(0, 10)]
  );

  for (const plan of plans) {
    const phone: string = plan.phone || "";
    const name: string = plan.full_name || "Bapak/Ibu";
    if (!phone) { result.skipped++; continue; }

    const nextDate = plan.next_payment_date ? new Date(plan.next_payment_date) : null;
    const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : null;
    if (daysUntil === null || daysUntil < 0) { result.skipped++; continue; }

    const message = buildCicilanMessage(settings.reminder_template, {
      nama: name, hari: daysUntil,
      tanggal: nextDate ? formatDate(nextDate) : "—",
      jumlah: formatCurrency(plan.installment_amount || 0),
      total: formatCurrency(0),
      target: formatCurrency(plan.target_amount || 0),
      progress: 0,
    });

    const res = await sendWA(phone, message);
    await logWA({ recipient_phone: phone, recipient_name: name, trigger_type: "cicilan_reminder", message_content: message, status: res.success ? "sent" : "failed", error_message: res.error });
    if (res.success) { result.sent++; result.details.push(`✅ ${name} (${phone.slice(0, 4)}***) — H-${daysUntil}`); }
    else { result.failed++; result.details.push(`❌ ${name} — ${res.error}`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return result;
}

// ─── Payment Deadline Reminders ──────────────────────────────────────────────

async function runPaymentReminders(): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 3);

  const deadlines = await dbQuery(
    `SELECT pdr.id, pdr.booking_id, pdr.deadline_date,
            c.full_name, c.phone
     FROM payment_deadline_reminders pdr
     LEFT JOIN bookings b ON b.id = pdr.booking_id
     LEFT JOIN customers c ON c.id = b.customer_id
     WHERE pdr.deadline_date BETWEEN $1 AND $2
       AND pdr.sent = false
     LIMIT 100`,
    [today.toISOString().slice(0, 10), cutoff.toISOString().slice(0, 10)]
  );

  for (const item of deadlines) {
    const phone: string = item.phone || "";
    const name: string = item.full_name || "Bapak/Ibu";
    if (!phone) { result.skipped++; continue; }

    const deadlineDate = new Date(item.deadline_date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / 86400000);
    const message = `Assalamu'alaikum *${name}*,\n\n⏰ *Pengingat Batas Pembayaran*\n\nBatas waktu pembayaran booking Anda adalah *${formatDate(deadlineDate)}* (${daysUntil} hari lagi).\n\nSegera lakukan pembayaran agar booking Anda tidak dibatalkan.\n\nBarakallahu fiikum 🤲\n_Tim Vinstour Travel_`;

    const res = await sendWA(phone, message);
    await logWA({ recipient_phone: phone, recipient_name: name, trigger_type: "payment_deadline", message_content: message, status: res.success ? "sent" : "failed", error_message: res.error });

    if (res.success) {
      result.sent++;
      result.details.push(`✅ ${name} — batas ${formatDate(deadlineDate)}`);
      await dbExec(`UPDATE payment_deadline_reminders SET sent = true, sent_at = NOW() WHERE id = $1`, [item.id]);
    } else {
      result.failed++;
      result.details.push(`❌ ${name} — ${res.error}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return result;
}

// ─── H-7 / H-1 Departure Reminders ──────────────────────────────────────────

const DEFAULT_H7_TEMPLATE = `Assalamu'alaikum *{nama}*,

✈️ *Pengingat — Keberangkatan H-7!*

Keberangkatan Anda ke Tanah Suci tinggal *7 hari lagi* pada *{tanggal_berangkat}*.

📦 Paket: *{paket}*
📋 Kode Booking: *{kode_booking}*

📋 *Persiapan yang perlu dilakukan:*
• ✅ Pastikan paspor masih berlaku min. 6 bulan
• ✅ Siapkan: KTP, buku nikah/KK, suntik meningitis
• ✅ Lunasi sisa pembayaran (jika ada)
• ✅ Packing sesuai kuota bagasi
• ✅ Unduh aplikasi & akses portal jamaah

Informasi lebih lanjut, hubungi kami.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

const DEFAULT_H1_TEMPLATE = `Assalamu'alaikum *{nama}*,

🕋 *Besok Hari Keberangkatan!*

Alhamdulillah, besok Anda akan menjalani perjalanan ibadah yang mulia. Semoga menjadi haji/umroh yang mabrur.

📦 Paket: *{paket}*
📋 Kode Booking: *{kode_booking}*
📅 Keberangkatan: *{tanggal_berangkat}*

Bawa semua dokumen perjalanan dan pastikan kondisi fisik prima.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

async function runDepartureReminders(days: 7 | 1 = 7): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };
  const FONNTE_TOKEN = await getFonnteToken();
  if (!FONNTE_TOKEN) { result.details.push("Konfigurasi WhatsApp belum diatur"); return result; }

  const triggerId = days === 7 ? "h7_departure" : "h1_departure";
  const triggers = await getWAOtomatisTriggers();
  if (!triggers[triggerId]) { result.details.push(`Trigger "${triggerId}" tidak aktif — skip`); return result; }

  const defaultTemplate = days === 7 ? DEFAULT_H7_TEMPLATE : DEFAULT_H1_TEMPLATE;
  const template = await getWATemplate(`wa_template_${triggerId}`, defaultTemplate);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const dateStr = targetDate.toISOString().split("T")[0];
  const tanggalBerangkat = formatDate(targetDate);

  const rows = await dbQuery(
    `SELECT d.id AS departure_id, pkg.name AS package_name,
            b.id AS booking_id, b.booking_code, b.booking_status,
            c.full_name, c.phone
     FROM departures d
     LEFT JOIN packages pkg ON pkg.id = d.package_id
     INNER JOIN bookings b ON b.departure_id = d.id
     INNER JOIN customers c ON c.id = b.customer_id
     WHERE d.departure_date = $1 
       AND b.booking_status NOT IN ('cancelled', 'refunded')
     LIMIT 200`,
    [dateStr]
  );

  for (const row of rows) {
    if (!["confirmed", "active", "paid"].includes(row.booking_status)) { result.skipped++; continue; }
    const phone: string = row.phone || "";
    const name: string = row.full_name || "Bapak/Ibu";
    if (!phone) { result.skipped++; continue; }

    const message = template
      .replace(/{nama}/g, name)
      .replace(/{paket}/g, row.package_name || "—")
      .replace(/{kode_booking}/g, row.booking_code || "—")
      .replace(/{tanggal_berangkat}/g, tanggalBerangkat)
      .replace(/\{[a-zA-Z_]\w*\}/g, "");

    const res = await sendWA(phone, message);
    await logWA({ recipient_phone: phone, recipient_name: name, trigger_type: triggerId, message_content: message, status: res.success ? "sent" : "failed", error_message: res.error });

    if (res.success) { result.sent++; result.details.push(`✅ ${name} — H-${days} dari ${tanggalBerangkat}`); }
    else { result.failed++; result.details.push(`❌ ${name} — ${res.error}`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return result;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/run", async (req, res) => {
  const type = (req.body?.type as string) || "all";
  logger.info({ type }, "Running reminder job");
  const summary: Record<string, any> = {};
  try {
    if (type === "cicilan" || type === "all") summary.cicilan = await runCicilanReminders();
    if (type === "payment" || type === "all") summary.payment = await runPaymentReminders();
    if (type === "departure" || type === "all") summary.departure_h7 = await runDepartureReminders(7);
    if (type === "departure_h1") summary.departure_h1 = await runDepartureReminders(1);
    if (type === "doc_deadline_h3" || type === "all") summary.doc_deadline_h3 = await runDocumentDeadlineReminders(3);
    if (type === "doc_deadline_h1") summary.doc_deadline_h1 = await runDocumentDeadlineReminders(1);
    logger.info({ summary }, "Reminder job complete");
    return res.json({ success: true, summary, ran_at: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err }, "Reminder job failed");
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/status", async (_req, res) => {
  try {
    const settings = await getCicilanSettings();
    const triggers = await getWAOtomatisTriggers();
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + settings.reminder_days);

    const plans = await dbQuery(
      `SELECT id FROM savings_plans WHERE status IN ('active','dp_paid') AND next_payment_date BETWEEN $1 AND $2 LIMIT 200`,
      [today.toISOString().slice(0, 10), cutoff.toISOString().slice(0, 10)]
    );
    const h7Date = new Date(today); h7Date.setDate(h7Date.getDate() + 7);
    const h7Departures = await dbQuery(`SELECT id FROM departures WHERE departure_date = $1 LIMIT 50`, [h7Date.toISOString().slice(0, 10)]);
    const h1Date = new Date(today); h1Date.setDate(h1Date.getDate() + 1);
    const h1Departures = await dbQuery(`SELECT id FROM departures WHERE departure_date = $1 LIMIT 50`, [h1Date.toISOString().slice(0, 10)]);

    const h3Deadline = new Date(today); h3Deadline.setDate(h3Deadline.getDate() + 3);
    const h1Deadline = new Date(today); h1Deadline.setDate(h1Deadline.getDate() + 1);
    const deadlineH3 = await dbQuery(
      `SELECT id FROM departures WHERE document_deadline IS NOT NULL AND DATE(document_deadline AT TIME ZONE 'Asia/Jakarta') = $1 LIMIT 50`,
      [h3Deadline.toISOString().slice(0, 10)]
    );
    const deadlineH1 = await dbQuery(
      `SELECT id FROM departures WHERE document_deadline IS NOT NULL AND DATE(document_deadline AT TIME ZONE 'Asia/Jakarta') = $1 LIMIT 50`,
      [h1Deadline.toISOString().slice(0, 10)]
    );

    return res.json({
      cicilan_settings: settings,
      triggers,
      upcoming: {
        cicilan: plans.length,
        departure_h7: h7Departures.length,
        departure_h1: h1Departures.length,
        doc_deadline_h3: deadlineH3.length,
        doc_deadline_h1: deadlineH1.length,
      },
      next_run: "08:00 WIB (harian)",
      configured: !!(await getFonnteToken()),
      fonnte_token_set: !!(await getFonnteToken()),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/trigger-doc-deadline", async (req, res) => {
  const days = Number(req.body?.days) === 1 ? 1 : 3;
  logger.info({ days }, "Manual doc deadline reminder trigger");
  try {
    const result = await runDocumentDeadlineReminders(days as 3 | 1);
    return res.json({ success: true, result, ran_at: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err }, "Doc deadline reminder trigger failed");
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/trigger-departure", async (req, res) => {
  const days = Number(req.body?.days) === 1 ? 1 : 7;
  logger.info({ days }, "Manual departure reminder trigger");
  try {
    const result = await runDepartureReminders(days as 7 | 1);
    return res.json({ success: true, result, ran_at: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Document Deadline Reminders (H-3 / H-1) ─────────────────────────────────

const DEFAULT_DOC_DEADLINE_H3_TEMPLATE = `Assalamu'alaikum *{nama}*,

📄 *Pengingat — Batas Upload Dokumen H-3!*

Batas waktu pengumpulan dokumen perjalanan Anda untuk paket *{paket}* tinggal *3 hari lagi* pada *{deadline}*.

📋 Kode Booking: *{kode_booking}*

Dokumen yang perlu disiapkan:
• ✅ Paspor (scan halaman data diri)
• ✅ KTP / KK / Akta Lahir
• ✅ Foto 4x6 background putih
• ✅ Suntik meningitis (jika ada)
• ✅ Buku nikah / surat mahram (jika diperlukan)

Segera upload dokumen melalui portal jamaah atau hubungi agen Anda.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

const DEFAULT_DOC_DEADLINE_H1_TEMPLATE = `Assalamu'alaikum *{nama}*,

⚠️ *SEGERA — Batas Upload Dokumen Besok!*

Batas pengumpulan dokumen perjalanan Anda untuk paket *{paket}* adalah *besok, {deadline}*.

📋 Kode Booking: *{kode_booking}*

Harap segera melengkapi dan mengupload dokumen Anda agar proses perjalanan ibadah tidak terganggu. Hubungi agen Anda jika membutuhkan bantuan.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

async function runDocumentDeadlineReminders(
  daysBeforeDeadline: 3 | 1
): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };

  const triggerId = daysBeforeDeadline === 3 ? "doc_deadline_h3" : "doc_deadline_h1";
  const triggers = await getWAOtomatisTriggers();
  if (!triggers[triggerId]) {
    result.details.push(`Trigger "${triggerId}" tidak aktif — skip`);
    return result;
  }

  const FONNTE_TOKEN = await getFonnteToken();
  if (!FONNTE_TOKEN) {
    result.details.push("Konfigurasi WhatsApp belum diatur");
    return result;
  }

  const defaultTemplate =
    daysBeforeDeadline === 3 ? DEFAULT_DOC_DEADLINE_H3_TEMPLATE : DEFAULT_DOC_DEADLINE_H1_TEMPLATE;
  const template = await getWATemplate(`wa_template_${triggerId}`, defaultTemplate);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Ambil departures yang document_deadline-nya jatuh pada hari H-{daysBeforeDeadline}
  const departures = await dbQuery(
    `SELECT d.id, d.document_deadline, pkg.name AS package_name
     FROM departures d
     LEFT JOIN packages pkg ON pkg.id = d.package_id
     WHERE d.document_deadline IS NOT NULL
       AND DATE(d.document_deadline AT TIME ZONE 'Asia/Jakarta')
           = CURRENT_DATE + INTERVAL '${daysBeforeDeadline} days'`,
    []
  );

  if (departures.length === 0) {
    result.details.push(`Tidak ada keberangkatan dengan deadline H-${daysBeforeDeadline} hari lagi`);
    return result;
  }

  for (const dep of departures) {
    // Cek dedup — jangan kirim ulang di hari yang sama untuk departure + days_before yang sama
    const alreadySent = await dbQueryOne(
      `SELECT id FROM doc_deadline_reminder_log
       WHERE departure_id = $1 AND days_before = $2 AND sent_date = $3`,
      [dep.id, daysBeforeDeadline, todayStr]
    );
    if (alreadySent) {
      result.details.push(`⏭️ Departure ${dep.package_name || dep.id} — sudah dikirim hari ini, skip`);
      result.skipped++;
      continue;
    }

    // Ambil semua booking aktif untuk departure ini yang belum lengkap dokumennya
    const bookings = await dbQuery(
      `SELECT b.id AS booking_id, b.booking_code, c.full_name, c.phone,
              (SELECT COUNT(*) FROM customer_documents cd
               WHERE cd.customer_id = c.id AND cd.status IN ('approved','verified')) AS doc_count
       FROM bookings b
       INNER JOIN customers c ON c.id = b.customer_id
       WHERE b.departure_id = $1
         AND b.booking_status NOT IN ('cancelled', 'refunded')
         AND c.phone IS NOT NULL`,
      [dep.id]
    );

    const deadlineDate = dep.document_deadline ? new Date(dep.document_deadline) : null;
    const deadlineStr = deadlineDate
      ? deadlineDate.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

    let sentThisDep = 0;

    for (const b of bookings) {
      const phone: string = b.phone || "";
      const name: string = b.full_name || "Bapak/Ibu";
      if (!phone) { result.skipped++; continue; }

      const message = template
        .replace(/{nama}/g, name)
        .replace(/{paket}/g, dep.package_name || "—")
        .replace(/{kode_booking}/g, b.booking_code || "—")
        .replace(/{deadline}/g, deadlineStr)
        .replace(/\{[a-zA-Z_]\w*\}/g, "");

      const res = await sendWA(phone, message);
      await logWA({
        recipient_phone: phone,
        recipient_name: name,
        trigger_type: triggerId,
        message_content: message,
        status: res.success ? "sent" : "failed",
        error_message: res.error,
      });

      if (res.success) {
        result.sent++;
        sentThisDep++;
        result.details.push(`✅ ${name} — deadline ${deadlineStr} (H-${daysBeforeDeadline})`);
      } else {
        result.failed++;
        result.details.push(`❌ ${name} — ${res.error}`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    // Catat di log dedup
    await dbExec(
      `INSERT INTO doc_deadline_reminder_log (departure_id, days_before, sent_date, sent_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (departure_id, days_before, sent_date) DO UPDATE
         SET sent_count = doc_deadline_reminder_log.sent_count + $4, updated_at = NOW()`,
      [dep.id, daysBeforeDeadline, todayStr, sentThisDep]
    );
  }

  return result;
}

// ── F-06: Reminder kadaluarsa paspor/visa via WhatsApp ──────────────────
router.post("/document-expiry", async (req, res) => {
  const threshold = Math.min(Math.max(Number(req.body?.threshold) || 90, 1), 365);
  const docType: string = req.body?.type || "all";

  logger.info({ threshold, docType }, "Document expiry reminder triggered");

  // Fetch company name for WA message
  const companyRow = await dbQueryOne(
    `SELECT name, city FROM company_info LIMIT 1`
  );
  const companyName = companyRow?.name || "Tim Travel";

  const sent: string[] = [];
  const failed: string[] = [];
  let total = 0;

  // Helper to send one reminder
  async function sendReminder(
    name: string,
    phone: string,
    docLabel: string,
    expiryDate: string,
    daysLeft: number
  ) {
    const humanDate = (() => {
      try {
        return new Date(expiryDate).toLocaleDateString("id-ID", {
          day: "numeric", month: "long", year: "numeric",
        });
      } catch { return expiryDate; }
    })();
    const urgencyWord = daysLeft <= 30 ? "segera" : daysLeft <= 60 ? "dalam waktu dekat" : "mendekati";
    const message =
      `Assalamu'alaikum, Bapak/Ibu *${name}*,\n\n` +
      `Kami inforkan bahwa *${docLabel}* Anda akan berakhir masa berlakunya pada *${humanDate}* ` +
      `(${urgencyWord} *${daysLeft} hari* lagi).\n\n` +
      `Harap segera memperpanjang dokumen perjalanan Anda agar ibadah berjalan lancar. ` +
      `Hubungi kami jika memerlukan bantuan pengurusan.\n\n` +
      `Jazakallahu Khairan,\n${companyName}`;
    total++;
    const result = await sendWA(phone, message);
    await logWA({
      recipient_phone: phone,
      recipient_name: name,
      trigger_type: `document_expiry_${docLabel.toLowerCase().replace(/\s/g, "_")}`,
      message_content: message,
      status: result.success ? "sent" : "failed",
      error_message: result.error,
    });
    if (result.success) sent.push(name);
    else failed.push(`${name} (${result.error})`);
  }

  try {
    // Paspor reminder
    if (docType === "passport" || docType === "all") {
      const rows = await dbQuery(
        `SELECT c.full_name, c.phone, c.passport_expiry,
                (c.passport_expiry::date - CURRENT_DATE) AS days_left
         FROM customers c
         WHERE c.passport_expiry IS NOT NULL
           AND c.phone IS NOT NULL
           AND c.passport_expiry::date - CURRENT_DATE BETWEEN 0 AND $1
         ORDER BY c.passport_expiry ASC`,
        [threshold]
      );
      for (const row of rows) {
        await sendReminder(row.full_name, row.phone, "Paspor", row.passport_expiry, Number(row.days_left));
      }
    }

    // Visa reminder
    if (docType === "visa" || docType === "all") {
      const rows = await dbQuery(
        `SELECT DISTINCT ON (va.customer_id)
                c.full_name, c.phone, va.visa_expiry,
                (va.visa_expiry::date - CURRENT_DATE) AS days_left
         FROM visa_applications va
         JOIN customers c ON c.id = va.customer_id
         WHERE va.visa_expiry IS NOT NULL
           AND c.phone IS NOT NULL
           AND va.visa_expiry::date - CURRENT_DATE BETWEEN 0 AND $1
         ORDER BY va.customer_id, va.visa_expiry ASC`,
        [threshold]
      );
      for (const row of rows) {
        await sendReminder(row.full_name, row.phone, "Visa", row.visa_expiry, Number(row.days_left));
      }
    }

    logger.info({ sent: sent.length, failed: failed.length, total }, "Document expiry reminders sent");
    return res.json({
      success: true,
      total,
      sent: sent.length,
      failed: failed.length,
      failed_names: failed,
      ran_at: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, "Document expiry reminder failed");
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
