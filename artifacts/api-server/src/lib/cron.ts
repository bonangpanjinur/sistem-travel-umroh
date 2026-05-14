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

export function startCronJobs() {
  // Setiap hari jam 08:00 WIB (01:00 UTC) — cicilan + payment reminders
  cron.schedule("0 1 * * *", () => {
    logger.info("Cron: running daily reminders");
    triggerReminders("all");
  }, { timezone: "UTC" });

  logger.info("Cron jobs registered: daily reminders at 08:00 WIB");
}
