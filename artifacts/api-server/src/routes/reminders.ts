import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
const FONNTE_TOKEN = process.env["FONNTE_TOKEN"] || "";

function supaRest(path: string, opts: RequestInit = {}): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return Promise.resolve([]);
  }
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

async function sendWA(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!FONNTE_TOKEN) return { success: false, error: "FONNTE_TOKEN tidak dikonfigurasi" };
  const digits = phone.replace(/\D/g, "");
  const target = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : "62" + digits;
  try {
    const form = new FormData();
    form.append("target", target);
    form.append("message", message);
    form.append("countryCode", "62");
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

async function getReminderSettings(): Promise<{
  reminder_days: number;
  auto_enabled: boolean;
  reminder_template: string;
}> {
  const defaults = {
    reminder_days: 3,
    auto_enabled: false,
    reminder_template: `Assalamu'alaikum *{nama}*,\n\n💰 *Pengingat Setoran Tabungan Umroh*\n\nSetoran Anda jatuh tempo dalam *{hari} hari* pada *{tanggal}*.\n\n• Jumlah: *{jumlah}*\n• Progress: *{progress}%*\n\nBarakallahu fiikum 🤲\n_Tim Vinstour Travel_`,
  };
  const rows = await supaRest(`/app_settings?key=eq.cicilan_reminder_settings&select=value&limit=1`);
  if (!rows.length) return defaults;
  try {
    const val = JSON.parse(rows[0].value ?? "{}");
    return { ...defaults, ...val };
  } catch {
    return defaults;
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function buildMessage(template: string, data: {
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    result.details.push("Supabase belum dikonfigurasi");
    return result;
  }

  const settings = await getReminderSettings();
  if (!settings.auto_enabled) {
    result.details.push(`Auto-reminder tidak aktif (auto_enabled=false)`);
    return result;
  }

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

    const message = buildMessage(settings.reminder_template, {
      nama: name,
      hari: daysUntil,
      tanggal: nextDate ? formatDate(nextDate) : "—",
      jumlah: formatCurrency(plan.installment_amount || 0),
      total: formatCurrency(0),
      target: formatCurrency(plan.target_amount || 0),
      progress: 0,
    });

    const res = await sendWA(phone, message);
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

async function runPaymentReminders(): Promise<{ sent: number; failed: number; skipped: number; details: string[] }> {
  const result = { sent: 0, failed: 0, skipped: 0, details: [] as string[] };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    result.details.push("Supabase belum dikonfigurasi");
    return result;
  }

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
    if (res.success) {
      result.sent++;
      result.details.push(`✅ ${name} — batas ${formatDate(deadlineDate)}`);
      await supaRest(`/payment_deadline_reminders?id=eq.${item.id}`, {
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

/**
 * POST /api/reminders/run
 * Body: { type?: 'cicilan' | 'payment' | 'all' }
 * Runs the specified reminder type. Requires internal call (no auth needed for cron).
 */
router.post("/run", async (req, res) => {
  const type = (req.body?.type as string) || "all";
  logger.info({ type }, "Running reminder job");

  const summary: Record<string, any> = {};

  try {
    if (type === "cicilan" || type === "all") {
      summary.cicilan = await runCicilanReminders();
    }
    if (type === "payment" || type === "all") {
      summary.payment = await runPaymentReminders();
    }

    logger.info({ summary }, "Reminder job complete");
    return res.json({ success: true, summary, ran_at: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err }, "Reminder job failed");
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reminders/status
 * Returns reminder settings and count of upcoming reminders.
 */
router.get("/status", async (_req, res) => {
  try {
    const settings = await getReminderSettings();
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + settings.reminder_days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const plans = await supaRest(
      `/savings_plans?status=in.(active,dp_paid)&next_payment_date=gte.${todayStr}&next_payment_date=lte.${cutoffStr}&select=id&limit=200`,
    );

    return res.json({
      settings,
      upcoming_cicilan: plans.length,
      next_run: "08:00 WIB (harian)",
      configured: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY && FONNTE_TOKEN),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
