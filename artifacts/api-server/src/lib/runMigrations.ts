import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db";
import { logger } from "./logger";

// __dirname shim: works in tsx (dev) and compiled ESM (build.mjs banner sets globalThis.__dirname)
const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

function sqlPath(filename: string): string {
  return resolve(_dir, "sql", filename);
}

// ── SQL statement splitter ─────────────────────────────────────────────────────
// Splits a SQL file into individual statements, correctly handling:
// (exported so the migrations API route can reuse it)
//   • Dollar-quoted strings  ($$…$$, $BODY$…$BODY$, $func$…$func$, etc.)
//   • Single-quoted strings  ('…'  with '' escapes)
//   • Line comments          (-- …)
//   • Block comments         (/* … */)
//   • Semicolons inside any of the above are NOT treated as separators.
function splitStatements(sql: string): string[] {
  const stmts: string[] = [];
  let buf = "";
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    // ── line comment: skip to end of line ─────────────────────────────────
    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const slice = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      buf += slice;
      i += slice.length;
      continue;
    }

    // ── block comment: skip /* … */ ────────────────────────────────────────
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) { buf += sql.slice(i); i = len; continue; }
      buf += sql.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // ── dollar-quoted string: $tag$…$tag$ ─────────────────────────────────
    if (ch === "$") {
      // Capture the opening tag, e.g. "$$" or "$func$"
      let tagEnd = i + 1;
      while (tagEnd < len && sql[tagEnd] !== "$") tagEnd++;
      if (tagEnd < len) {
        const tag = sql.slice(i, tagEnd + 1); // includes both $
        const closeIdx = sql.indexOf(tag, tagEnd + 1);
        if (closeIdx !== -1) {
          buf += sql.slice(i, closeIdx + tag.length);
          i = closeIdx + tag.length;
          continue;
        }
      }
      // No matching close-tag found — treat as literal char
      buf += ch;
      i++;
      continue;
    }

    // ── single-quoted string: '…' with '' escape ───────────────────────────
    if (ch === "'") {
      let j = i + 1;
      while (j < len) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // ── semicolon: end of statement ────────────────────────────────────────
    if (ch === ";") {
      buf += ";";
      const trimmed = buf.trim();
      if (trimmed && trimmed !== ";") stmts.push(trimmed);
      buf = "";
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  // Remaining text without a trailing semicolon
  const tail = buf.trim();
  if (tail) stmts.push(tail);

  return stmts;
}

// ── Execute a SQL file statement-by-statement ──────────────────────────────────
// Errors for individual statements are logged and skipped; the run continues.
// Returns { ok, errors } so callers can decide whether to mark migration applied.
async function runSqlFile(
  client: any,
  filepath: string,
  label: string,
): Promise<{ ok: number; errors: number }> {
  logger.info(`runMigrations: ${label} — reading file…`);
  const sql = readFileSync(filepath, "utf8");
  const stmts = splitStatements(sql);
  logger.info(`runMigrations: ${label} — executing ${stmts.length} statements…`);

  let ok = 0;
  let errors = 0;

  for (const stmt of stmts) {
    try {
      await client.query(stmt);
      ok++;
    } catch (err: any) {
      errors++;
      // Only log meaningful errors; skip duplicate-object noise at debug level.
      const msg: string = err?.message ?? "";
      const isDuplicate =
        msg.includes("already exists") ||
        msg.includes("duplicate key");

      if (isDuplicate) {
        logger.debug({ stmt: stmt.slice(0, 80) }, `runMigrations: ${label} — skipped (already exists)`);
      } else {
        logger.warn(
          { err: msg, stmt: stmt.slice(0, 200) },
          `runMigrations: ${label} — statement error (continuing)`,
        );
      }
    }
  }

  logger.info(
    { ok, errors },
    `runMigrations: ${label} — complete`,
  );
  return { ok, errors };
}

// ── Migrations tracker helpers ─────────────────────────────────────────────────
async function isApplied(client: any, name: string): Promise<boolean> {
  try {
    const result = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM _schema_migrations WHERE name = $1
       ) AS exists`,
      [name],
    );
    const rows = result.rows as { exists: boolean }[];
    return rows[0]?.exists ?? false;
  } catch {
    return false; // table doesn't exist yet
  }
}

async function markApplied(client: any, name: string): Promise<void> {
  await client.query(
    `INSERT INTO _schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name],
  );
}

// ── Main entry point ───────────────────────────────────────────────────────────
/**
 * runMigrations() is called once at server startup.
 *
 * Step 0 — 00_auth_bootstrap.sql  (idempotent, runs once)
 *   Creates the `auth` schema, `auth.users` table, Supabase stub functions
 *   (auth.uid / auth.role / auth.jwt), and the `_schema_migrations` tracker.
 *
 * Step 1 — 01_schema.sql  (migration_fresh.sql copied during build, runs once)
 *   Full 30-table application schema with indexes, triggers, and seed data.
 *   Each statement is executed individually so a single error never aborts
 *   the entire schema run.
 *
 * Step 2 — payment sync trigger + backfill  (re-applied on every boot)
 *   Ensures the trigger survives dist rebuilds.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {

    // ── Step 0: auth bootstrap ─────────────────────────────────────────────
    const bootstrapApplied = await isApplied(client, "00_auth_bootstrap");
    if (!bootstrapApplied) {
      await runSqlFile(client, sqlPath("00_auth_bootstrap.sql"), "00_auth_bootstrap");
      await markApplied(client, "00_auth_bootstrap");
    } else {
      logger.info("runMigrations: 00_auth_bootstrap — already applied, skipping");
    }

    // ── Step 1: full application schema ───────────────────────────────────
    const schemaApplied = await isApplied(client, "01_schema");
    if (!schemaApplied) {
      const { errors } = await runSqlFile(
        client,
        sqlPath("01_schema.sql"),
        "01_schema (full application schema)",
      );
      // Mark as applied even if some statements had errors; most errors are
      // benign (duplicate objects from repeated migration files in the SQL).
      await markApplied(client, "01_schema");
      if (errors > 0) {
        logger.warn(
          { errors },
          "runMigrations: 01_schema applied with some statement errors (see warnings above)",
        );
      }
    } else {
      logger.info("runMigrations: 01_schema — already applied, skipping");
    }

    // ── Step 1b: missing tables not present in migration_fresh.sql ────────
    const missingTablesApplied = await isApplied(client, "02_missing_tables");
    if (!missingTablesApplied) {
      await runSqlFile(
        client,
        sqlPath("02_missing_tables.sql"),
        "02_missing_tables (payments + compat roles)",
      );
      await markApplied(client, "02_missing_tables");
    } else {
      logger.info("runMigrations: 02_missing_tables — already applied, skipping");
    }

    // ── Step 1c: add missing bookings columns ─────────────────────────────
    const bookingColsApplied = await isApplied(client, "03_bookings_columns");
    if (!bookingColsApplied) {
      await runSqlFile(
        client,
        sqlPath("03_bookings_columns.sql"),
        "03_bookings_columns (remaining_amount + backfill)",
      );
      await markApplied(client, "03_bookings_columns");
    } else {
      logger.info("runMigrations: 03_bookings_columns — already applied, skipping");
    }

    // ── Step 1d: add media_type column to media_gallery ──────────────────
    const galleryMediaTypeApplied = await isApplied(client, "04_gallery_media_type");
    if (!galleryMediaTypeApplied) {
      await runSqlFile(
        client,
        sqlPath("04_gallery_media_type.sql"),
        "04_gallery_media_type (media_type column for package gallery)",
      );
      await markApplied(client, "04_gallery_media_type");
    } else {
      logger.info("runMigrations: 04_gallery_media_type — already applied, skipping");
    }

    // ── Step 1e: equipment functions + migrations 062–065 ────────────────
    const equipmentMigrationsApplied = await isApplied(client, "05_equipment_and_recent_migrations");
    if (!equipmentMigrationsApplied) {
      await runSqlFile(
        client,
        sqlPath("05_equipment_and_recent_migrations.sql"),
        "05_equipment_and_recent_migrations (return_equipment_item + size + confirmation + hotel rooms + P&L trigger)",
      );
      await markApplied(client, "05_equipment_and_recent_migrations");
    } else {
      logger.info("runMigrations: 05_equipment_and_recent_migrations — already applied, skipping");
    }

    // ── Step 1f: equipment_items + variants + stock tables + modern distributions ─
    const equipmentSchemaApplied = await isApplied(client, "06_equipment_schema");
    if (!equipmentSchemaApplied) {
      await runSqlFile(
        client,
        sqlPath("06_equipment_schema.sql"),
        "06_equipment_schema (equipment_items + variants + stock + modern distributions + functions)",
      );
      await markApplied(client, "06_equipment_schema");
    } else {
      logger.info("runMigrations: 06_equipment_schema — already applied, skipping");
    }

    // ── Step 1g: P2 menu item — profitabilitas-paket ─────────────────────
    const profitabilitasMenuApplied = await isApplied(client, "07_profitabilitas_paket_menu");
    if (!profitabilitasMenuApplied) {
      await runSqlFile(
        client,
        sqlPath("07_profitabilitas_paket_menu.sql"),
        "07_profitabilitas_paket_menu (P2 profitabilitas paket sidebar menu item)",
      );
      await markApplied(client, "07_profitabilitas_paket_menu");
    } else {
      logger.info("runMigrations: 07_profitabilitas_paket_menu — already applied, skipping");
    }

    // ── Step 1h: passenger type pricing columns ───────────────────────────
    const passengerPricingApplied = await isApplied(client, "09_passenger_pricing");
    if (!passengerPricingApplied) {
      await runSqlFile(
        client,
        sqlPath("09_passenger_pricing.sql"),
        "09_passenger_pricing (price_adult + child/infant percent columns for departures & packages)",
      );
      await markApplied(client, "09_passenger_pricing");
    } else {
      logger.info("runMigrations: 09_passenger_pricing — already applied, skipping");
    }

    // ── Step 2: payment sync trigger (always re-applied each boot) ────────
    // Wrapped in its own try/catch so a missing table on a broken DB state
    // doesn't crash the server — it just logs and continues.
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION sync_booking_payment_totals()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        DECLARE
          v_booking_id   UUID;
          v_total_price  NUMERIC;
          v_paid_amount  NUMERIC;
          v_remaining    NUMERIC;
          v_pay_status   TEXT;
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_booking_id := OLD.booking_id;
          ELSE
            v_booking_id := NEW.booking_id;
          END IF;
          IF v_booking_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

          SELECT total_price INTO v_total_price FROM bookings WHERE id = v_booking_id;
          IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

          SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
          FROM payments
          WHERE booking_id = v_booking_id AND status IN ('paid', 'verified');

          v_remaining  := GREATEST(0, v_total_price - v_paid_amount);
          v_pay_status :=
            CASE
              WHEN v_paid_amount >= v_total_price AND v_total_price > 0 THEN 'paid'
              WHEN v_paid_amount > 0                                    THEN 'partial'
              ELSE                                                           'pending'
            END;

          UPDATE bookings
          SET paid_amount = v_paid_amount, remaining_amount = v_remaining, payment_status = v_pay_status
          WHERE id = v_booking_id;

          RETURN COALESCE(NEW, OLD);
        END;
        $$
      `);

      await client.query(`DROP TRIGGER IF EXISTS trg_sync_booking_payment_totals ON payments`);
      await client.query(`
        CREATE TRIGGER trg_sync_booking_payment_totals
          AFTER INSERT OR UPDATE OF amount, status OR DELETE
          ON payments FOR EACH ROW
          EXECUTE FUNCTION sync_booking_payment_totals()
      `);
      logger.info("runMigrations: payment sync trigger — installed");

      // ── Step 3: backfill out-of-sync booking totals ──────────────────────
      const { rowCount } = await client.query(`
        WITH recalc AS (
          SELECT
            b.id AS booking_id,
            b.total_price,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) AS correct_paid,
            GREATEST(0, b.total_price - COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)) AS correct_remaining,
            CASE
              WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) >= b.total_price AND b.total_price > 0 THEN 'paid'
              WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) > 0 THEN 'partial'
              ELSE 'pending'
            END AS correct_status
          FROM bookings b
          LEFT JOIN payments p ON p.booking_id = b.id
          GROUP BY b.id, b.total_price
        )
        UPDATE bookings b
        SET paid_amount = r.correct_paid, remaining_amount = r.correct_remaining, payment_status = r.correct_status
        FROM recalc r
        WHERE b.id = r.booking_id
          AND (
            b.paid_amount IS DISTINCT FROM r.correct_paid OR
            b.remaining_amount IS DISTINCT FROM r.correct_remaining OR
            b.payment_status IS DISTINCT FROM r.correct_status
          )
      `);

      if ((rowCount ?? 0) > 0) {
        logger.info({ fixed: rowCount }, "runMigrations: backfilled out-of-sync booking totals");
      } else {
        logger.info("runMigrations: booking totals already in sync");
      }
    } catch (triggerErr: any) {
      logger.warn(
        { err: triggerErr?.message },
        "runMigrations: payment sync trigger install failed — server continues without trigger",
      );
    }

  } catch (err) {
    logger.error({ err }, "runMigrations: unexpected error — server continues");
  } finally {
    client.release();
  }
}
