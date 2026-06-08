import { Router } from "express";
import nodemailer from "nodemailer";
import { pool } from "../../lib/db.js";
import { sendWA } from "../../lib/whatsapp.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// ─── Email helper ─────────────────────────────────────────────────────────────
function buildTransporter() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] || "587");
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}
const EMAIL_FROM = process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "noreply@vinstour.com";

// ─── Settings ─────────────────────────────────────────────────────────────────
async function getSettings(client: any) {
  try {
    const { rows } = await client.query(`SELECT * FROM training_notification_settings LIMIT 1`);
    return rows[0] ?? defaultSettings();
  } catch {
    return defaultSettings();
  }
}
function defaultSettings() {
  return { channels: ["whatsapp"], notify_on_assignment: true, reminder_days_before: [3, 1], notify_on_overdue: true, overdue_repeat_days: 3, is_active: true };
}

// ─── Message builders ─────────────────────────────────────────────────────────
const WA_MESSAGES: Record<string, (name: string, module: string) => string> = {
  new_assignment: (n, m) =>
    `Halo *${n}* 👋\n\nAnda mendapat *modul training baru*:\n📚 *${m}*\n\nSilakan selesaikan sesuai jadwal. Login ke Portal Karyawan untuk mulai belajar 🎯`,
  deadline_3d: (n, m) =>
    `Halo *${n}* 👋\n\n⏰ *Pengingat Training*\n\nDeadline modul *${m}* tinggal *3 hari lagi*.\n\nYuk segera selesaikan! Portal Karyawan → Training Saya 📱`,
  deadline_1d: (n, m) =>
    `Halo *${n}* 👋\n\n⚠️ *Deadline Training Besok!*\n\nModul *${m}* harus diselesaikan *besok*.\n\nSegera buka Portal Karyawan dan selesaikan training Anda 🚀`,
  overdue: (n, m) =>
    `Halo *${n}* 👋\n\n🔴 *Training Melewati Deadline*\n\nModul *${m}* sudah melewati tenggat waktu.\n\nHubungi HR atau atasan Anda untuk informasi lebih lanjut.`,
};

const EMAIL_SUBJECTS: Record<string, (m: string) => string> = {
  new_assignment: (m) => `📚 Modul Training Baru Ditugaskan: ${m}`,
  deadline_3d:    (m) => `⏰ Deadline Training 3 Hari Lagi: ${m}`,
  deadline_1d:    (m) => `⚠️ Deadline Training Besok: ${m}`,
  overdue:        (m) => `🔴 Training Melewati Deadline: ${m}`,
};

const EMAIL_COLORS: Record<string, string> = {
  new_assignment: "#3b82f6", deadline_3d: "#f59e0b", deadline_1d: "#ef4444", overdue: "#dc2626",
};

function buildEmailHTML(type: string, name: string, module: string): string {
  const bodies: Record<string, string> = {
    new_assignment: `Anda mendapatkan modul training baru: <strong>${module}</strong>.<br>Silakan selesaikan sesuai jadwal yang ditentukan.`,
    deadline_3d:    `Deadline modul <strong>${module}</strong> tinggal <strong>3 hari lagi</strong>.<br>Pastikan Anda menyelesaikan training tepat waktu.`,
    deadline_1d:    `Deadline modul <strong>${module}</strong> adalah <strong>besok</strong>.<br>Segera login ke Portal Karyawan dan selesaikan training Anda.`,
    overdue:        `Modul <strong>${module}</strong> sudah melewati tenggat waktu dan belum diselesaikan.<br>Segera hubungi atasan atau HR Anda.`,
  };
  const color = EMAIL_COLORS[type] ?? "#6b7280";
  const subject = EMAIL_SUBJECTS[type]?.(module) ?? `Pengingat Training: ${module}`;
  const body = bodies[type] ?? `Pengingat training: ${module}`;
  const appUrl = process.env["APP_URL"] ?? "";
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:${color};margin-bottom:16px">${subject}</h2>
  <p>Assalamu'alaikum <strong>${name}</strong>,</p>
  <p style="line-height:1.6">${body}</p>
  ${appUrl ? `<p><a href="${appUrl}/ess/training" style="background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Buka Portal Karyawan</a></p>` : ""}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">Salam hangat,<br><em>Tim HR Vinstour Travel</em></p>
</div>`;
}

// ─── Duplicate check ──────────────────────────────────────────────────────────
async function alreadyNotifiedToday(client: any, empId: string, moduleId: string, type: string): Promise<boolean> {
  try {
    const { rows } = await client.query(
      `SELECT 1 FROM training_notification_log
       WHERE employee_id=$1 AND module_id=$2 AND notification_type=$3
         AND status='sent' AND DATE(sent_at) = CURRENT_DATE LIMIT 1`,
      [empId, moduleId, type],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ─── Log entry ────────────────────────────────────────────────────────────────
async function logEntry(client: any, opts: {
  employee_id: string; module_id: string; notification_type: string; channel: string;
  status: string; recipient_phone?: string | null; recipient_email?: string | null;
  message_preview?: string; error_message?: string;
}) {
  try {
    await client.query(
      `INSERT INTO training_notification_log
         (employee_id,module_id,notification_type,channel,status,recipient_phone,recipient_email,message_preview,error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [opts.employee_id, opts.module_id, opts.notification_type, opts.channel, opts.status,
       opts.recipient_phone ?? null, opts.recipient_email ?? null,
       opts.message_preview ? opts.message_preview.slice(0, 250) : null,
       opts.error_message ?? null],
    );
  } catch (e: any) {
    logger.warn({ err: e.message }, "training-notif: log insert failed");
  }
}

// ─── POST /run-notifications ──────────────────────────────────────────────────
router.post("/run-notifications", async (req, res) => {
  const client = await pool.connect();
  try {
    const settings = await getSettings(client);

    if (!settings.is_active) {
      return res.json({ ok: true, message: "Notifikasi dinonaktifkan", sent: 0, candidates: 0 });
    }

    const channels: string[]    = settings.channels ?? ["whatsapp"];
    const reminderDays: number[] = (settings.reminder_days_before ?? [3, 1]).map(Number).sort((a: number, b: number) => b - a);
    const notifyAssign: boolean  = settings.notify_on_assignment ?? true;
    const notifyOverdue: boolean = settings.notify_on_overdue ?? true;

    // Fetch all incomplete training items with employee & curriculum context
    const { rows: candidates } = await client.query(`
      SELECT
        etp.employee_id,
        etp.module_id,
        etp.status,
        etp.created_at           AS assigned_at,
        e.full_name,
        e.phone,
        e.email,
        tm.title                 AS module_title,
        ptc.due_days,
        CASE WHEN ptc.due_days IS NOT NULL
          THEN etp.created_at + (ptc.due_days || ' days')::interval
          ELSE NULL
        END                      AS due_date
      FROM employee_training_progress etp
      JOIN employees e           ON etp.employee_id = e.id AND e.is_active = true
      JOIN training_modules tm   ON etp.module_id   = tm.id
      LEFT JOIN position_training_curricula ptc
        ON ptc.module_id = etp.module_id AND ptc.position_name = e.position
      WHERE etp.status != 'completed'
    `);

    const now = Date.now();
    const MS_DAY = 86_400_000;
    let sent = 0;
    const resultLog: any[] = [];
    const transporter = buildTransporter();

    for (const row of candidates) {
      const assignedMs  = new Date(row.assigned_at).getTime();
      const dueDateMs   = row.due_date ? new Date(row.due_date).getTime() : null;

      // Determine applicable notification types for today
      const types: string[] = [];

      if (notifyAssign && now - assignedMs < MS_DAY) {
        types.push("new_assignment");
      }

      if (dueDateMs !== null) {
        const msUntilDue = dueDateMs - now;
        const daysUntilDue = msUntilDue / MS_DAY;

        // Deadline reminders: in window [d-1, d+0.5) days before due
        for (const d of reminderDays) {
          if (daysUntilDue >= 0 && daysUntilDue < d && daysUntilDue >= (d - 1)) {
            types.push(`deadline_${d}d`);
          }
        }

        if (notifyOverdue && msUntilDue < 0) {
          types.push("overdue");
        }
      }

      for (const type of types) {
        if (await alreadyNotifiedToday(client, row.employee_id, row.module_id, type)) continue;

        for (const channel of channels) {
          const msgData = { name: row.full_name, module: row.module_title };

          if (channel === "whatsapp") {
            if (!row.phone) continue;
            const msg = WA_MESSAGES[type]?.(row.full_name, row.module_title) ?? `Pengingat training: ${row.module_title}`;
            const result = await sendWA(row.phone, msg);
            await logEntry(client, {
              employee_id: row.employee_id, module_id: row.module_id,
              notification_type: type, channel: "whatsapp",
              status: result.success ? "sent" : "failed",
              recipient_phone: row.phone, message_preview: msg,
              error_message: result.error,
            });
            if (result.success) sent++;
            resultLog.push({ type, channel: "whatsapp", employee: row.full_name, success: result.success, error: result.error });
          }

          if (channel === "email") {
            if (!row.email || !transporter) continue;
            const subj = EMAIL_SUBJECTS[type]?.(row.module_title) ?? `Pengingat Training: ${row.module_title}`;
            try {
              await transporter.sendMail({
                from: `"HR Vinstour" <${EMAIL_FROM}>`,
                to: row.email,
                subject: subj,
                html: buildEmailHTML(type, row.full_name, row.module_title),
              });
              await logEntry(client, {
                employee_id: row.employee_id, module_id: row.module_id,
                notification_type: type, channel: "email",
                status: "sent", recipient_email: row.email, message_preview: subj,
              });
              sent++;
              resultLog.push({ type, channel: "email", employee: row.full_name, success: true });
            } catch (e: any) {
              await logEntry(client, {
                employee_id: row.employee_id, module_id: row.module_id,
                notification_type: type, channel: "email",
                status: "failed", recipient_email: row.email, error_message: e.message,
              });
              resultLog.push({ type, channel: "email", employee: row.full_name, success: false, error: e.message });
            }
          }
        }
      }
    }

    logger.info({ sent, candidates: candidates.length }, "training-notif: run complete");
    return res.json({ ok: true, sent, candidates: candidates.length, results: resultLog });
  } catch (err: any) {
    logger.error({ err }, "training-notif: unexpected error");
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /notification-logs ───────────────────────────────────────────────────
router.get("/notification-logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT tnl.*, e.full_name AS employee_name, e.employee_code, tm.title AS module_title
      FROM   training_notification_log tnl
      LEFT JOIN employees      e  ON tnl.employee_id = e.id
      LEFT JOIN training_modules tm ON tnl.module_id  = tm.id
      ORDER  BY tnl.sent_at DESC
      LIMIT  $1
    `, [limit]);
    return res.json({ ok: true, logs: rows });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /notification-settings ──────────────────────────────────────────────
router.get("/notification-settings", async (req, res) => {
  const client = await pool.connect();
  try {
    return res.json({ ok: true, settings: await getSettings(client) });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── PUT /notification-settings ──────────────────────────────────────────────
router.put("/notification-settings", async (req, res) => {
  const { channels, notify_on_assignment, reminder_days_before, notify_on_overdue, overdue_repeat_days, is_active } = req.body;
  const client = await pool.connect();
  try {
    const existing = await getSettings(client);
    if (!existing?.id) {
      await client.query(
        `INSERT INTO training_notification_settings (channels,notify_on_assignment,reminder_days_before,notify_on_overdue,overdue_repeat_days,is_active,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [channels ?? ["whatsapp"], notify_on_assignment ?? true, reminder_days_before ?? [3,1], notify_on_overdue ?? true, overdue_repeat_days ?? 3, is_active ?? true],
      );
    } else {
      await client.query(
        `UPDATE training_notification_settings SET channels=$1,notify_on_assignment=$2,reminder_days_before=$3,notify_on_overdue=$4,overdue_repeat_days=$5,is_active=$6,updated_at=NOW()`,
        [channels ?? ["whatsapp"], notify_on_assignment ?? true, reminder_days_before ?? [3,1], notify_on_overdue ?? true, overdue_repeat_days ?? 3, is_active ?? true],
      );
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

export default router;
