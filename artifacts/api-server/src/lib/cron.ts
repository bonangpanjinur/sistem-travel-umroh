import cron from "node-cron";
import { logger } from "./logger.js";

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

  logger.info("Cron jobs registered: cicilan+payment @08:00 WIB, H-7 @07:00 WIB, H-1 @06:00 WIB");
}
