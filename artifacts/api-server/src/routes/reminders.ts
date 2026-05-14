import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
const FONNTE_TOKEN = process.env["FONNTE_TOKEN"] || "";

function supaRest(path: string, opts: RequestInit = {}): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return Promise.resolve([]);
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  }).then(async (r) => {
    if (!r.ok) return [];
    const text = await r.text();
    if (!text) return [];
    return JSON.parse(text);
  }).catch(() => []);
}

async function supaRestOne(path: string, opts: RequestInit = {}): Promise<any | null> {
  const rows = await supaRest(path, opts);
  return rows?.[0] ?? null;
}

async function supaRestVoid(path: string, opts: RequestInit = {}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(opts.headers ?? {}),
    },
  }).catch(() => {});
}

async function sendWA(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!FONNTE_TOKEN) return { success: false, error: "FONNTE_TOKEN tidak dikonfigurasi" };
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
  await supaRestVoid("/whatsapp_logs", {
    method: "POST",
    body: JSON.stringify({
      ...opts,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }),
    headers: { Prefer: "return=minimal" },
  });
}

async function getWAOtomatisTriggers(): Promise<Record<string, boolean>> {
  const row = await supaRestOne(`/app_settings?key=eq.wa_otomatis_triggers&select=value&limit=1`);
  if (!row) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

async function getWATemplate(key: string, fallback: string): Promise<string> {
  const row = await supaRestOne(`/app_settings?key=eq.${key}&select=value&limit=1`);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ─── Cicilan Reminders ──────────────────────────────────────────────────────

async function getCicilanSettings(): Promise<{
  reminder_days: number;
  auto_enabled: boolean;
  reminder_template: string;
}> {
  const defaults = {
    reminder_days: 3,
    auto_enabled: false,
    reminder_template: `Assalamu'alaikum *{nama}*,\n\n💰 *Pengingat Setoran Tabungan Umroh*\n\nSetoran Anda jatuh tempo dalam *{hari} hari* pada *{tanggal}*.\n\n• Jumlah: *{jumlah}*\n• Progress: *{progress}%*\n\nBarakallahu fiikum 🤲\n_Tim Vinstour Travel_`,
  };
  const row = await supaRestOne(`/app_settings?key=eq.cicilan_reminder_settings&select=value&limit=1`);
  if (!row) return defaults;
  try { return { ...defaults, ...JSON.parse(row.value) }; } catch { return defaults; }
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { result.details.push("Supabase belum dikonfigurasi"); return result; }

  const settings = await getCicilanSettings();
  if (!settings.auto_enabled) { result.details.push("Auto-reminder cicilan tidak aktif"); return result; }

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + settings.reminder_days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const plans = await supaRest(
    `/savings_plans?status=in.(active,dp_paid)&next_payment_date=lte.${cutoffStr}&next_payment_date=gte.${todayStr}&select=id,customer_id,target_amount,installment_amount,next_payment_date,customer:profiles(full_name,phone)&limit=200`,
  );

  for (const plan of plans) {
    const phone: string = plan.customer?.phone || "";
    const name: string = plan.customer?.full_name || "Bapak/Ibu";
    if (!phone) { result.skipped++; continue; }

    const nextDate = plan.next_payment_date ? new Date(plan.next_payment_date) : null;
    const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : null;
    if (daysUntil === null || daysUntil < 0) { result.skipped++; continue; }

    const message = buildCicilanMessage(settings.reminder_template, {
      nama: name,
      hari: daysUntil,
      tanggal: nextDate ? formatDate(nextDate) : "—",
      jumlah: formatCurrency(plan.installment_amount || 0),
      total: formatCurrency(0),
      target: formatCurrency(plan.target_amount || 0),
      progress: 0,
    });

    const res = await sendWA(phone, message);
    await logWA({
      recipient_phone: phone,
      recipient_name: name,
      trigger_type: "cicilan_reminder",
      message_content: message,
      status: res.success ? "sent" : "failed",
      error_message: res.error,
    });
    if (res.success) {
      result.sent++;
      result.details.push(`✅ ${name} (${phone.slice(0, 4)}***) — H-${daysUntil}`);
    } else {
      result.failed++;
      result.details.push(`❌ ${name} — ${res.error}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return result;
}

// ─── Payment Deadline Reminders ─────────────────────────────────────────────

async function runPaymentReminders(): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { result.details.push("Supabase belum dikonfigurasi"); return result; }

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 3);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const deadlines = await supaRest(
    `/payment_deadline_reminders?deadline_date=gte.${todayStr}&deadline_date=lte.${cutoffStr}&sent=eq.false&select=id,booking_id,deadline_date,booking:bookings(id,customer:customers(full_name,phone))&limit=100`,
  );

  for (const item of deadlines) {
    const phone: string = item.booking?.customer?.phone || "";
    const name: string = item.booking?.customer?.full_name || "Bapak/Ibu";
    if (!phone) { result.skipped++; continue; }

    const deadlineDate = new Date(item.deadline_date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / 86400000);
    const message = `Assalamu'alaikum *${name}*,\n\n⏰ *Pengingat Batas Pembayaran*\n\nBatas waktu pembayaran booking Anda adalah *${formatDate(deadlineDate)}* (${daysUntil} hari lagi).\n\nSegera lakukan pembayaran agar booking Anda tidak dibatalkan.\n\nBarakallahu fiikum 🤲\n_Tim Vinstour Travel_`;

    const res = await sendWA(phone, message);
    await logWA({ recipient_phone: phone, recipient_name: name, trigger_type: "payment_deadline", message_content: message, status: res.success ? "sent" : "failed", error_message: res.error });

    if (res.success) {
      result.sent++;
      result.details.push(`✅ ${name} — batas ${formatDate(deadlineDate)}`);
      await supaRestVoid(`/payment_deadline_reminders?id=eq.${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sent: true, sent_at: new Date().toISOString() }),
      });
    } else {
      result.failed++;
      result.details.push(`❌ ${name} — ${res.error}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return result;
}

// ─── H-7 / H-1 Departure Reminders ─────────────────────────────────────────

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { result.details.push("Supabase belum dikonfigurasi"); return result; }
  if (!FONNTE_TOKEN) { result.details.push("FONNTE_TOKEN belum dikonfigurasi"); return result; }

  const triggerId = days === 7 ? "h7_departure" : "h1_departure";
  const triggers = await getWAOtomatisTriggers();

  if (!triggers[triggerId]) {
    result.details.push(`Trigger "${triggerId}" tidak aktif — skip`);
    return result;
  }

  const defaultTemplate = days === 7 ? DEFAULT_H7_TEMPLATE : DEFAULT_H1_TEMPLATE;
  const template = await getWATemplate(`wa_template_${triggerId}`, defaultTemplate);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const dateStr = targetDate.toISOString().split("T")[0];

  // Query departures on target date, with nested bookings
  const departures = await supaRest(
    `/departures?departure_date=eq.${dateStr}&select=id,departure_date,package:packages(name),bookings(id,booking_code,booking_status,customer:customers(full_name,phone))&limit=50`,
  );

  const tanggalBerangkat = formatDate(targetDate);

  for (const departure of departures) {
    const packageName: string = departure.package?.name || "—";
    const bookings: any[] = departure.bookings || [];

    for (const booking of bookings) {
      if (!["confirmed", "active", "paid"].includes(booking.booking_status)) {
        result.skipped++;
        continue;
      }
      const phone: string = booking.customer?.phone || "";
      const name: string = booking.customer?.full_name || "Bapak/Ibu";
      if (!phone) { result.skipped++; continue; }

      const message = template
        .replace(/{nama}/g, name)
        .replace(/{paket}/g, packageName)
        .replace(/{kode_booking}/g, booking.booking_code || "—")
        .replace(/{tanggal_berangkat}/g, tanggalBerangkat)
        .replace(/\{[a-zA-Z_]\w*\}/g, ""); // strip unresolved vars

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
        result.details.push(`✅ ${name} — H-${days} dari ${tanggalBerangkat}`);
      } else {
        result.failed++;
        result.details.push(`❌ ${name} — ${res.error}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return result;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/reminders/run
 * Body: { type?: 'cicilan' | 'payment' | 'departure' | 'departure_h1' | 'all' }
 */
router.post("/run", async (req, res) => {
  const type = (req.body?.type as string) || "all";
  logger.info({ type }, "Running reminder job");

  const summary: Record<string, any> = {};
  try {
    if (type === "cicilan" || type === "all") summary.cicilan = await runCicilanReminders();
    if (type === "payment" || type === "all") summary.payment = await runPaymentReminders();
    if (type === "departure" || type === "all") summary.departure_h7 = await runDepartureReminders(7);
    if (type === "departure_h1") summary.departure_h1 = await runDepartureReminders(1);

    logger.info({ summary }, "Reminder job complete");
    return res.json({ success: true, summary, ran_at: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err }, "Reminder job failed");
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reminders/status
 * Returns reminder settings and upcoming counts.
 */
router.get("/status", async (_req, res) => {
  try {
    const settings = await getCicilanSettings();
    const triggers = await getWAOtomatisTriggers();

    const today = new Date();

    // Upcoming cicilan
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + settings.reminder_days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    const plans = await supaRest(
      `/savings_plans?status=in.(active,dp_paid)&next_payment_date=gte.${todayStr}&next_payment_date=lte.${cutoffStr}&select=id&limit=200`,
    );

    // Upcoming H-7 departures
    const h7Date = new Date(today);
    h7Date.setDate(h7Date.getDate() + 7);
    const h7Str = h7Date.toISOString().split("T")[0];
    const h7Departures = await supaRest(`/departures?departure_date=eq.${h7Str}&select=id,bookings(id)&limit=50`);
    const h7BookingCount = h7Departures.reduce((s: number, d: any) => s + (d.bookings?.length || 0), 0);

    // Upcoming H-1 departures
    const h1Date = new Date(today);
    h1Date.setDate(h1Date.getDate() + 1);
    const h1Str = h1Date.toISOString().split("T")[0];
    const h1Departures = await supaRest(`/departures?departure_date=eq.${h1Str}&select=id,bookings(id)&limit=50`);
    const h1BookingCount = h1Departures.reduce((s: number, d: any) => s + (d.bookings?.length || 0), 0);

    return res.json({
      cicilan_settings: settings,
      triggers,
      upcoming: {
        cicilan: plans.length,
        departure_h7: h7BookingCount,
        departure_h1: h1BookingCount,
      },
      next_run: "08:00 WIB (harian)",
      configured: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY && FONNTE_TOKEN),
      fonnte_token_set: !!FONNTE_TOKEN,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reminders/trigger-departure
 * Manual trigger for departure reminders (admin use).
 * Body: { days: 7 | 1 }
 */
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

export default router;
