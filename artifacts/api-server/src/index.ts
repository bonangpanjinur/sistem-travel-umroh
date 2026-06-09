import { createServer } from 'http';
import app from "./app";
import { logger } from "./lib/logger";
import { startCronJobs } from "./lib/cron.js";
import { runMigrations } from "./lib/runMigrations";
import { attachAudioRelay } from "./lib/audioRelay.js";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Use http.createServer so we can attach the WebSocket audio relay
// to the same port as Express (no separate WS port needed).
const httpServer = createServer(app);

attachAudioRelay(httpServer);

httpServer.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await runMigrations();
  startCronJobs();
});
