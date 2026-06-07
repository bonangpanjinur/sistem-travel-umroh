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

async function triggerDepartureReminder(days: 7 | 1) {
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

  // Setiap hari jam 07:00 WIB (00:00 UTC) — H-7 departure reminder
  cron.schedule("0 0 * * *", () => {
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

  logger.info(
    "Cron jobs registered: cicilan+payment @08:00 WIB, H-7 @07:00 WIB, H-1 @06:00 WIB, integration-health @every hour, wa-scheduled @every 5min, agent-tier-refresh @02:00 WIB",
  );
}
