import app from "./app";
import { logger } from "./lib/logger";
import { isSupabaseConfigured } from "./lib/supabase";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
  logger.warn(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set. API key authentication is disabled. " +
    "Set these environment variables in Replit Secrets before deploying to production."
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
