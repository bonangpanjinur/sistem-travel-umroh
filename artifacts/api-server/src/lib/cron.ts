import cron from "node-cron";
import { logger } from "./logger.js";
import { pool } from "./db.js";
import { runIntegrationHealthCheck } from "./integrationHealthCheck.js";

const API_BASE = `http://localhost:${process.env["PORT"] || "8080"}`;

// ── S18-08: Schedule push notifications for each prayer time today ─────────
// Fetches Makkah prayer times from aladhan.com, then uses setTimeout to
// trigger /api/push/prayer-reminder at the exact moment of each prayer.
// Called once daily at 10:00 WIB (03:00 UTC); also called at server startup
// so that prayers that haven't passed yet today are still scheduled.
async function scheduleTodayPrayerNotifications() {
  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=Makkah&country=SA&method=4&date=${dateStr}`,
    );
    if (!res.ok) throw new Error(`Aladhan API ${res.status}`);
    const json = (await res.json()) as any;
    const timings = json?.data?.timings;
    if (!timings) throw new Error("No timings in response");

    const PRAYER_MAP = [
      { key: "Fajr",    label: "subuh"   },
      { key: "Dhuhr",   label: "dzuhur"  },
      { key: "Asr",     label: "ashar"   },
      { key: "Maghrib", label: "maghrib" },
      { key: "Isha",    label: "isya"    },
    ];

    const now = Date.now();
    let scheduled = 0;

    for (const { key, label } of PRAYER_MAP) {
      const timeStr: string | undefined = timings[key];
      if (!timeStr) continue;

      const [h, m] = timeStr.split(":").map(Number);

      // Makkah is UTC+3 → subtract 3 h to convert to UTC timestamp
      const prayerDate = new Date(today);
      prayerDate.setUTCHours(h - 3, m, 30, 0); // +30s buffer after adhan

      const msUntil = prayerDate.getTime() - now;
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        const capturedLabel = label;
        setTimeout(async () => {
          try {
            const r = await fetch(`${API_BASE}/api/push/prayer-reminder`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prayer: capturedLabel }),
            });
            const d: any = await r.json();
            logger.info({ prayer: capturedLabel, sent: d.sent }, "S18-08: Prayer push notif sent");
          } catch (err: any) {
            logger.error({ err, prayer: capturedLabel }, "S18-08: Prayer push notif failed");
          }
        }, msUntil);

        scheduled++;
        logger.info(
          { prayer: label, at: prayerDate.toISOString(), inMin: Math.round(msUntil / 60000) },
          "S18-08: Prayer notification queued",
        );
      }
    }

    logger.info({ scheduled, date: dateStr }, "S18-08: Prayer notifications scheduled for today");
  } catch (err: any) {
    logger.error({ err }, "S18-08: Failed to schedule prayer notifications — will retry tomorrow");
  }
}

async function triggerReminders(type: string) {
  try {
    const res = await fetch(`${API_BASE}/api/reminders/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data: any = await res.json();
    logger.info({ type, summary: data.summary }, "Cron reminder complete");
  } catch (err: any) {
    logger.error({ err, type }, "Cron reminder failed");
  }
}

async function triggerDepartureReminder(days: number) {
  try {
    const res = await fetch(`${API_BASE}/api/reminders/trigger-departure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    const data: any = await res.json();
    logger.info({ days, result: data.result }, `Cron H-${days} departure reminder complete`);
  } catch (err: any) {
    logger.error({ err, days }, `Cron H-${days} departure reminder failed`);
  }
}

async function runHealthCheck() {
  try {
    await runIntegrationHealthCheck(pool);
  } catch (err: any) {
    logger.error({ err }, "Cron integration health check failed");
  }
}

export function startCronJobs() {
  // Setiap hari jam 08:00 WIB (01:00 UTC) — cicilan + payment deadlines
  cron.schedule("0 1 * * *", () => {
    logger.info("Cron: running cicilan + payment deadline reminders");
    triggerReminders("cicilan");
    triggerReminders("payment");
  }, { timezone: "UTC" });

  // Setiap hari jam 09:00 WIB (02:00 UTC) — doc deadline H-3 reminder
  cron.schedule("0 2 * * *", () => {
    logger.info("Cron: running doc deadline H-3 reminder");
    triggerReminders("doc_deadline_h3");
  }, { timezone: "UTC" });

  // Setiap hari jam 07:00 WIB (00:00 UTC) — doc deadline H-1 reminder
  cron.schedule("30 23 * * *", () => {
    logger.info("Cron: running doc deadline H-1 reminder");
    triggerReminders("doc_deadline_h1");
  }, { timezone: "UTC" });

  // Setiap hari jam 07:00 WIB (00:00 UTC) — H-60 departure reminder
  cron.schedule("0 0 * * *", () => {
    logger.info("Cron: running H-60 departure reminder");
    triggerDepartureReminder(60);
  }, { timezone: "UTC" });

  // Setiap hari jam 07:05 WIB (00:05 UTC) — H-45 departure reminder
  cron.schedule("5 0 * * *", () => {
    logger.info("Cron: running H-45 departure reminder");
    triggerDepartureReminder(45);
  }, { timezone: "UTC" });

  // Setiap hari jam 07:10 WIB (00:10 UTC) — H-30 departure reminder
  cron.schedule("10 0 * * *", () => {
    logger.info("Cron: running H-30 departure reminder");
    triggerDepartureReminder(30);
  }, { timezone: "UTC" });

  // Setiap hari jam 07:15 WIB (00:15 UTC) — H-14 departure reminder
  cron.schedule("15 0 * * *", () => {
    logger.info("Cron: running H-14 departure reminder");
    triggerDepartureReminder(14);
  }, { timezone: "UTC" });

  // Setiap hari jam 07:20 WIB (00:20 UTC) — H-7 departure reminder
  cron.schedule("20 0 * * *", () => {
    logger.info("Cron: running H-7 departure reminder");
    triggerDepartureReminder(7);
  }, { timezone: "UTC" });

  // Setiap hari jam 06:00 WIB (23:00 UTC hari sebelumnya) — H-1 departure reminder
  cron.schedule("0 23 * * *", () => {
    logger.info("Cron: running H-1 departure reminder");
    triggerDepartureReminder(1);
  }, { timezone: "UTC" });

  // Setiap jam — integration health check (cek Gemini, Midtrans, dll)
  cron.schedule("0 * * * *", () => {
    logger.info("Cron: running integration health check");
    runHealthCheck();
  }, { timezone: "UTC" });

  // Setiap 5 menit — jalankan WA scheduled broadcasts yang sudah jatuh tempo
  cron.schedule("*/5 * * * *", async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/whatsapp/scheduled-broadcasts/run-due`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data: any = await res.json();
      if (data.ran > 0) {
        logger.info({ ran: data.ran, results: data.results }, "Cron: WA scheduled broadcasts executed");
      }
    } catch (err: any) {
      logger.error({ err }, "Cron: WA scheduled broadcasts runner failed");
    }
  }, { timezone: "UTC" });

  // Setiap hari jam 09:00 WIB (02:00 UTC) — pengingat training karyawan
  cron.schedule("0 2 * * *", () => {
    logger.info("Cron: running training notification reminders");
    fetch(`${API_BASE}/api/v1/training/run-notifications`, { method: "POST", headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((d: any) => logger.info({ sent: d.sent, candidates: d.candidates }, "Cron: training notifications complete"))
      .catch((err: any) => logger.error({ err }, "Cron: training notifications failed"));
  }, { timezone: "UTC" });

  // Setiap malam jam 02:00 WIB (19:00 UTC) — refresh membership tier agen
  cron.schedule("0 19 * * *", async () => {
    logger.info("Cron: running nightly agent membership tier refresh");
    try {
      const result = await pool.query(`SELECT * FROM refresh_agent_membership_tiers()`);
      const upgrades = result.rows.filter((r: any) => r.old_tier !== r.new_tier);
      logger.info(
        { total: result.rowCount, upgraded: upgrades.length, changes: upgrades },
        "Cron: agent tier refresh complete",
      );
    } catch (err: any) {
      logger.error({ err }, "Cron: agent tier refresh failed");
    }
  }, { timezone: "UTC" });

  // Setiap hari jam 09:30 WIB (02:30 UTC) — AR overdue reminder otomatis
  cron.schedule("30 2 * * *", () => {
    logger.info("Cron: running AR overdue reminders");
    triggerReminders("ar_overdue");
  }, { timezone: "UTC" });

  // S18-08: Setiap hari jam 10:00 WIB (03:00 UTC) — jadwalkan push notif waktu sholat hari ini
  // Fetches today's Makkah prayer times from aladhan.com, queues a setTimeout
  // per prayer so the notification fires at the exact adhan time.
  cron.schedule("0 3 * * *", () => {
    logger.info("Cron: scheduling today's prayer-time push notifications (S18-08)");
    scheduleTodayPrayerNotifications();
  }, { timezone: "UTC" });

  // S18-08: Also run once on startup for prayers that haven't passed yet today
  scheduleTodayPrayerNotifications();

  logger.info(
    "Cron jobs registered: cicilan+payment @08:00 WIB, doc-deadline-H3 @09:00 WIB, doc-deadline-H1 @06:30 WIB, H-60/45/30/14/7 @07:00-07:20 WIB, H-1 @06:00 WIB, integration-health @every hour, wa-scheduled @every 5min, agent-tier-refresh @02:00 WIB, training-notif @09:00 WIB, AR-overdue @09:30 WIB, prayer-notif @10:00 WIB (S18-08)",
  );
}
