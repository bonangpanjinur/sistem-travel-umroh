import cron from "node-cron";
import { logger } from "./logger.js";
import { pool } from "./db.js";
import { runIntegrationHealthCheck } from "./integrationHealthCheck.js";

const API_BASE = `http://localhost:${process.env["PORT"] || "8080"}`;

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

  logger.info(
    "Cron jobs registered: cicilan+payment @08:00 WIB, doc-deadline-H3 @09:00 WIB, doc-deadline-H1 @06:30 WIB, H-60/45/30/14/7 @07:00-07:20 WIB, H-1 @06:00 WIB, integration-health @every hour, wa-scheduled @every 5min, agent-tier-refresh @02:00 WIB, training-notif @09:00 WIB, AR-overdue @09:30 WIB",
  );
}
