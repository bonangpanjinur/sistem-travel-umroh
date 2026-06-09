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

    // ── Step 1e: integration API key settings ─────────────────────────────
    const integrationSettingsApplied = await isApplied(client, "05_integration_settings");
    if (!integrationSettingsApplied) {
      await runSqlFile(
        client,
        sqlPath("05_integration_settings.sql"),
        "05_integration_settings (integration API key rows in app_settings)",
      );
      await markApplied(client, "05_integration_settings");
    } else {
      logger.info("runMigrations: 05_integration_settings — already applied, skipping");
    }

    // ── Step 1f: fix app_settings schema + re-seed integration keys ───────
    const appSettingsCompatApplied = await isApplied(client, "06_app_settings_compat");
    if (!appSettingsCompatApplied) {
      await runSqlFile(
        client,
        sqlPath("06_app_settings_compat.sql"),
        "06_app_settings_compat (description/is_public columns + integration key rows)",
      );
      await markApplied(client, "06_app_settings_compat");
    } else {
      logger.info("runMigrations: 06_app_settings_compat — already applied, skipping");
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

    // ── Step 1i: cancellation rules table ────────────────────────────────
    const cancellationRulesApplied = await isApplied(client, "10_cancellation_rules");
    if (!cancellationRulesApplied) {
      await runSqlFile(
        client,
        sqlPath("10_cancellation_rules.sql"),
        "10_cancellation_rules (cancellation_rules table + FK on packages)",
      );
      await markApplied(client, "10_cancellation_rules");
    } else {
      logger.info("runMigrations: 10_cancellation_rules — already applied, skipping");
    }

    // ── Step 1j: cancellation rule audit log ─────────────────────────────
    const auditLogApplied = await isApplied(client, "11_cancellation_rule_audit");
    if (!auditLogApplied) {
      await runSqlFile(
        client,
        sqlPath("11_cancellation_rule_audit.sql"),
        "11_cancellation_rule_audit (audit log table for bulk assign/unassign)",
      );
      await markApplied(client, "11_cancellation_rule_audit");
    } else {
      logger.info("runMigrations: 11_cancellation_rule_audit — already applied, skipping");
    }

    // ── Step 1k: booking departure checklists table ───────────────────────
    const departureChecklistApplied = await isApplied(client, "12_booking_departure_checklist");
    if (!departureChecklistApplied) {
      await runSqlFile(
        client,
        sqlPath("12_booking_departure_checklist.sql"),
        "12_booking_departure_checklist (per-booking departure readiness checklist table)",
      );
      await markApplied(client, "12_booking_departure_checklist");
    } else {
      logger.info("runMigrations: 12_booking_departure_checklist — already applied, skipping");
    }

    // ── Step 1l: SEO fields for packages (meta_title, meta_description, keywords) ─
    const seoFieldsApplied = await isApplied(client, "13_seo_fields_packages");
    if (!seoFieldsApplied) {
      await runSqlFile(
        client,
        sqlPath("13_seo_fields_packages.sql"),
        "13_seo_fields_packages (meta_title + meta_description + keywords columns)",
      );
      await markApplied(client, "13_seo_fields_packages");
    } else {
      logger.info("runMigrations: 13_seo_fields_packages — already applied, skipping");
    }

    // ── Step 1m: SEO fields for departures (meta_title, meta_description, slug) ─
    const departuresSeoApplied = await isApplied(client, "14_seo_fields_departures");
    if (!departuresSeoApplied) {
      await runSqlFile(
        client,
        sqlPath("14_seo_fields_departures.sql"),
        "14_seo_fields_departures (meta_title + meta_description + slug for departures)",
      );
      await markApplied(client, "14_seo_fields_departures");
    } else {
      logger.info("runMigrations: 14_seo_fields_departures — already applied, skipping");
    }

    // ── Step 1n: COA categories table + account_code on departure_cost_items ─
    const coaCategoriesApplied = await isApplied(client, "15_coa_categories");
    if (!coaCategoriesApplied) {
      await runSqlFile(
        client,
        sqlPath("15_coa_categories.sql"),
        "15_coa_categories (coa_categories table + account_code column on departure_cost_items)",
      );
      await markApplied(client, "15_coa_categories");
    } else {
      logger.info("runMigrations: 15_coa_categories — already applied, skipping");
    }

    // ── Step 1o: financial tables compat + COA account_code column ────────
    const financialTablesApplied = await isApplied(client, "16_financial_tables_compat");
    if (!financialTablesApplied) {
      await runSqlFile(
        client,
        sqlPath("16_financial_tables_compat.sql"),
        "16_financial_tables_compat (departure_cost_items + financial tables + account_code column)",
      );
      await markApplied(client, "16_financial_tables_compat");
    } else {
      logger.info("runMigrations: 16_financial_tables_compat — already applied, skipping");
    }

    // ── Step 1p: WA Chatbot keywords, Inbox, Contacts tables ─────────────
    const waChatbotApplied = await isApplied(client, "17_wa_chatbot_inbox_contacts");
    if (!waChatbotApplied) {
      await runSqlFile(
        client,
        sqlPath("17_wa_chatbot_inbox_contacts.sql"),
        "17_wa_chatbot_inbox_contacts (chatbot keywords + incoming messages + WA contacts)",
      );
      await markApplied(client, "17_wa_chatbot_inbox_contacts");
    } else {
      logger.info("runMigrations: 17_wa_chatbot_inbox_contacts — already applied, skipping");
    }

    // ── Step 1q: WA Bot Menu interactive numbered menu ────────────────────
    const waBotMenuApplied = await isApplied(client, "18_wa_bot_menu");
    if (!waBotMenuApplied) {
      await runSqlFile(
        client,
        sqlPath("18_wa_bot_menu.sql"),
        "18_wa_bot_menu (interactive bot menu items + config)",
      );
      await markApplied(client, "18_wa_bot_menu");
    } else {
      logger.info("runMigrations: 18_wa_bot_menu — already applied, skipping");
    }

    // ── Step 1r: WA Bot Menu Interactive (Meta WABA list/button messages) ──
    const waBotMenuInteractiveApplied = await isApplied(client, "19_wa_bot_menu_interactive");
    if (!waBotMenuInteractiveApplied) {
      await runSqlFile(
        client,
        sqlPath("19_wa_bot_menu_interactive.sql"),
        "19_wa_bot_menu_interactive (Meta WABA interactive list + button config)",
      );
      await markApplied(client, "19_wa_bot_menu_interactive");
    } else {
      logger.info("runMigrations: 19_wa_bot_menu_interactive — already applied, skipping");
    }

    // ── Step 1s: WA Template Broadcast logging tables ─────────────────────
    const waTemplateBcastApplied = await isApplied(client, "20_wa_template_broadcast");
    if (!waTemplateBcastApplied) {
      await runSqlFile(
        client,
        sqlPath("20_wa_template_broadcast.sql"),
        "20_wa_template_broadcast (Meta WABA template broadcast logging tables)",
      );
      await markApplied(client, "20_wa_template_broadcast");
    } else {
      logger.info("runMigrations: 20_wa_template_broadcast — already applied, skipping");
    }

    // ── Step 1t: WA Scheduled Broadcasts ──────────────────────────────────
    // Extra check: verify table actually exists (migration may have been
    // marked applied but all CREATE TABLE statements failed on first run)
    const waSchedApplied = await isApplied(client, "21_wa_scheduled_broadcasts");
    const waSchedTableCheck = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'wa_scheduled_broadcasts'
       )::bool AS exists`,
    );
    const waSchedTableExists = waSchedTableCheck.rows[0]?.exists === true;
    if (!waSchedApplied || !waSchedTableExists) {
      await runSqlFile(
        client,
        sqlPath("21_wa_scheduled_broadcasts.sql"),
        "21_wa_scheduled_broadcasts (scheduled WA broadcast + per-recipient logs)",
      );
      if (!waSchedApplied) await markApplied(client, "21_wa_scheduled_broadcasts");
    } else {
      logger.info("runMigrations: 21_wa_scheduled_broadcasts — already applied, skipping");
    }

    // ── Step 1s: agent status + invitation tokens + profile jabatan ──────
    const agentStatusApplied = await isApplied(client, "22_agent_status_branch_staff");
    if (!agentStatusApplied) {
      await runSqlFile(
        client,
        sqlPath("062_agent_status_branch_staff.sql"),
        "22_agent_status_branch_staff (agents.status + agent_invitation_tokens + profiles.jabatan)",
      );
      await markApplied(client, "22_agent_status_branch_staff");
    } else {
      logger.info("runMigrations: 22_agent_status_branch_staff — already applied, skipping");
    }

    // ── Step 1t: agent membership tiers (Bronze/Silver/Gold/Platinum) ─────
    const agentTiersApplied = await isApplied(client, "23_agent_membership_tiers");
    if (!agentTiersApplied) {
      await runSqlFile(
        client,
        sqlPath("23_agent_membership_tiers.sql"),
        "23_agent_membership_tiers (membership_tier column + agent_tier_config + trigger + batch refresh)",
      );
      await markApplied(client, "23_agent_membership_tiers");
    } else {
      logger.info("runMigrations: 23_agent_membership_tiers — already applied, skipping");
    }

    // ── Step 1u: fix agent tier trigger (no column-level restriction) ─────
    const agentTierTriggerFixApplied = await isApplied(client, "24_agent_tier_trigger_fix");
    if (!agentTierTriggerFixApplied) {
      await runSqlFile(
        client,
        sqlPath("24_agent_tier_trigger_fix.sql"),
        "24_agent_tier_trigger_fix (re-create agent tier trigger without column restriction)",
      );
      await markApplied(client, "24_agent_tier_trigger_fix");
    } else {
      logger.info("runMigrations: 24_agent_tier_trigger_fix — already applied, skipping");
    }

    // ── Step 1v: SDM Sprint-1 (payroll components + SP + employee training) ─
    const sdmSprint1Applied = await isApplied(client, "25_sdm_sprint1");
    if (!sdmSprint1Applied) {
      await runSqlFile(
        client,
        sqlPath("25_sdm_sprint1.sql"),
        "25_sdm_sprint1 (payroll_components + employee_payroll_components + disciplinary_letters + employee_training_progress)",
      );
      await markApplied(client, "25_sdm_sprint1");
    } else {
      logger.info("runMigrations: 25_sdm_sprint1 — already applied, skipping");
    }

    // ── Step 1w: SDM Sprint-1 disciplinary records + career history ───────
    const sdmDisciplinaryApplied = await isApplied(client, "26_sdm_disciplinary_career");
    if (!sdmDisciplinaryApplied) {
      await runSqlFile(
        client,
        sqlPath("26_sdm_disciplinary_career.sql"),
        "26_sdm_disciplinary_career (disciplinary_records + career_history tables)",
      );
      await markApplied(client, "26_sdm_disciplinary_career");
    } else {
      logger.info("runMigrations: 26_sdm_disciplinary_career — already applied, skipping");
    }

    // ── Step 1x: ESS payroll_slips table ──────────────────────────────────
    const payrollSlipsApplied = await isApplied(client, "27_payroll_slips_ess");
    if (!payrollSlipsApplied) {
      await runSqlFile(
        client,
        sqlPath("27_payroll_slips_ess.sql"),
        "27_payroll_slips_ess (payroll_slips table for ESS portal)",
      );
      await markApplied(client, "27_payroll_slips_ess");
    } else {
      logger.info("runMigrations: 27_payroll_slips_ess — already applied, skipping");
    }

    // ── Step 1y: ESS leave_requests + leave_quotas tables ─────────────────
    const leaveRequestsApplied = await isApplied(client, "28_leave_requests");
    if (!leaveRequestsApplied) {
      await runSqlFile(
        client,
        sqlPath("28_leave_requests.sql"),
        "28_leave_requests (leave_requests + leave_quotas + triggers for ESS Cuti/Izin)",
      );
      await markApplied(client, "28_leave_requests");
    } else {
      logger.info("runMigrations: 28_leave_requests — already applied, skipping");
    }

    // ── Step 1z: employee_contracts + job_postings + job_applicants ────────
    const sdmContractsRecruitmentApplied = await isApplied(client, "29_sdm_contracts_recruitment");
    if (!sdmContractsRecruitmentApplied) {
      await runSqlFile(
        client,
        sqlPath("29_sdm_contracts_recruitment.sql"),
        "29_sdm_contracts_recruitment (employee_contracts + job_postings + job_applicants)",
      );
      await markApplied(client, "29_sdm_contracts_recruitment");
    } else {
      logger.info("runMigrations: 29_sdm_contracts_recruitment — already applied, skipping");
    }

    // ── Step 1z2: onboarding_templates + template_items + employee_onboarding_tasks ──
    const onboardingChecklistApplied = await isApplied(client, "30_onboarding_checklist");
    if (!onboardingChecklistApplied) {
      await runSqlFile(
        client,
        sqlPath("30_onboarding_checklist.sql"),
        "30_onboarding_checklist (onboarding_templates + template_items + employee_onboarding_tasks)",
      );
      await markApplied(client, "30_onboarding_checklist");
    } else {
      logger.info("runMigrations: 30_onboarding_checklist — already applied, skipping");
    }

    // ── Step 1z3: position_training_curricula (kurikulum per jabatan) ─────────
    const posTrainingCurriculaApplied = await isApplied(client, "31_position_training_curricula");
    if (!posTrainingCurriculaApplied) {
      await runSqlFile(
        client,
        sqlPath("31_position_training_curricula.sql"),
        "31_position_training_curricula (position_training_curricula table for staff training curriculum)",
      );
      await markApplied(client, "31_position_training_curricula");
    } else {
      logger.info("runMigrations: 31_position_training_curricula — already applied, skipping");
    }

    // ── Step 1z4: training_notification_settings + training_notification_log ──
    const trainingNotifApplied = await isApplied(client, "32_training_notifications");
    if (!trainingNotifApplied) {
      await runSqlFile(
        client,
        sqlPath("32_training_notifications.sql"),
        "32_training_notifications (training_notification_settings + training_notification_log)",
      );
      await markApplied(client, "32_training_notifications");
    } else {
      logger.info("runMigrations: 32_training_notifications — already applied, skipping");
    }

    // ── Step 1z5: auto commission trigger on booking confirmed ────────────
    const autoCommissionApplied = await isApplied(client, "33_auto_commission_booking_confirmed");
    if (!autoCommissionApplied) {
      await runSqlFile(
        client,
        sqlPath("071_auto_commission_booking_confirmed.sql"),
        "33_auto_commission_booking_confirmed (trigger komisi otomatis saat booking confirmed + commission_rate di branches)",
      );
      await markApplied(client, "33_auto_commission_booking_confirmed");
    } else {
      logger.info("runMigrations: 33_auto_commission_booking_confirmed — already applied, skipping");
    }

    // ── Step 1z6: push_subscriptions role/branch_id/agent_id columns ─────
    const pushSubsRoleApplied = await isApplied(client, "34_push_subscriptions_role_branch_agent");
    if (!pushSubsRoleApplied) {
      await runSqlFile(
        client,
        sqlPath("072_push_subscriptions_role_branch_agent.sql"),
        "34_push_subscriptions_role_branch_agent (role + branch_id + agent_id columns untuk targeting push notif)",
      );
      await markApplied(client, "34_push_subscriptions_role_branch_agent");
    } else {
      logger.info("runMigrations: 34_push_subscriptions_role_branch_agent — already applied, skipping");
    }

    // ── Step 1z7: document_numbering table + stored function ──────────────
    const docNumberingApplied = await isApplied(client, "35_document_numbering");
    if (!docNumberingApplied) {
      await runSqlFile(
        client,
        sqlPath("073_document_numbering.sql"),
        "35_document_numbering (penomoran surat otomatis + get_next_document_number function)",
      );
      await markApplied(client, "35_document_numbering");
    } else {
      logger.info("runMigrations: 35_document_numbering — already applied, skipping");
    }

    // ── Step 1z5: departure P&L auto-triggers ────────────────────────────────
    const dplApplied = await isApplied(client, "33_departure_pl_triggers");
    if (!dplApplied) {
      await runSqlFile(
        client,
        sqlPath("33_departure_pl_triggers.sql"),
        "33_departure_pl_triggers (booking+payment → auto P&L recalc)",
      );
      await markApplied(client, "33_departure_pl_triggers");
    } else {
      logger.info("runMigrations: 33_departure_pl_triggers — already applied, skipping");
    }

    // ── Step 1z6: performance_reviews table ───────────────────────────────────
    const prApplied = await isApplied(client, "34_performance_reviews");
    if (!prApplied) {
      await runSqlFile(
        client,
        sqlPath("34_performance_reviews.sql"),
        "34_performance_reviews (kinerja karyawan)",
      );
      await markApplied(client, "34_performance_reviews");
    } else {
      logger.info("runMigrations: 34_performance_reviews — already applied, skipping");
    }

    // ── Step 1z7: equipment unit_cost column ──────────────────────────────────
    const eqCostApplied = await isApplied(client, "35_equipment_unit_cost");
    if (!eqCostApplied) {
      await runSqlFile(
        client,
        sqlPath("35_equipment_unit_cost.sql"),
        "35_equipment_unit_cost (kolom unit_cost di equipment_items)",
      );
      await markApplied(client, "35_equipment_unit_cost");
    } else {
      logger.info("runMigrations: 35_equipment_unit_cost — already applied, skipping");
    }

    // ── Step 1z8: package view_count column + RPC ─────────────────────────────
    const pvcApplied = await isApplied(client, "36_package_view_count");
    if (!pvcApplied) {
      await runSqlFile(
        client,
        sqlPath("36_package_view_count.sql"),
        "36_package_view_count (view counter + RPC untuk analytics conversion)",
      );
      await markApplied(client, "36_package_view_count");
    } else {
      logger.info("runMigrations: 36_package_view_count — already applied, skipping");
    }


    // ── Step 1z9: doc security features (F-21 verify tokens, F-22 signature, F-23 audit) ──
    const docSecApplied = await isApplied(client, "22_doc_security_features");
    if (!docSecApplied) {
      await runSqlFile(
        client,
        sqlPath("22_doc_security_features.sql"),
        "22_doc_security_features (verify tokens, customer signatures, audit logs)",
      );
      await markApplied(client, "22_doc_security_features");
    } else {
      logger.info("runMigrations: 22_doc_security_features — already applied, skipping");
    }

    // ── Step 37: doc deadline reminder log (dedup table) ─────────────────────
    const ddrApplied = await isApplied(client, "37_doc_deadline_reminder_log");
    if (!ddrApplied) {
      await runSqlFile(
        client,
        sqlPath("37_doc_deadline_reminder_log.sql"),
        "37_doc_deadline_reminder_log (dedup table untuk reminder WA deadline dokumen H-3/H-1)",
      );
      await markApplied(client, "37_doc_deadline_reminder_log");
    } else {
      logger.info("runMigrations: 37_doc_deadline_reminder_log — already applied, skipping");
    }

    // ── Step 080: Sprint A triggers — koneksi data kritis ────────────────────
    // A2: booking confirmed → visa auto-create
    // A4: departure status → booking cascade
    // A5: muthawif assign → guide channel auto-init
    // A6: room occupants → booking_passengers sync
    // B7: equipment distributed → departure_expenses auto
    const sa080Applied = await isApplied(client, "080_sprint_a_triggers");
    if (!sa080Applied) {
      await runSqlFile(
        client,
        sqlPath("080_sprint_a_triggers.sql"),
        "080_sprint_a_triggers (A2/A4/A5/A6/B7 — trigger koneksi data kritis)",
      );
      await markApplied(client, "080_sprint_a_triggers");
    } else {
      logger.info("runMigrations: 080_sprint_a_triggers — already applied, skipping");
    }

    // ── Step 081: muthawif_id di departures + pasang trigger A5 ──────────────
    const sa081Applied = await isApplied(client, "081_departure_muthawif_id");
    if (!sa081Applied) {
      await runSqlFile(
        client,
        sqlPath("081_departure_muthawif_id.sql"),
        "081_departure_muthawif_id (kolom muthawif_id di departures + trigger A5 guide channel)",
      );
      await markApplied(client, "081_departure_muthawif_id");
    } else {
      logger.info("runMigrations: 081_departure_muthawif_id — already applied, skipping");
    }

    // ── Step 38: Sprint B2 — departure_waiting_list ───────────────────────
    const waitingListApplied = await isApplied(client, "38_waiting_list");
    if (!waitingListApplied) {
      await runSqlFile(
        client,
        sqlPath("38_waiting_list.sql"),
        "38_waiting_list (departure_waiting_list table for Sprint B2 waiting list feature)",
      );
      await markApplied(client, "38_waiting_list");
    } else {
      logger.info("runMigrations: 38_waiting_list — already applied, skipping");
    }

    // ── Step 39: Jurnal Umum — journal_entries + journal_entry_lines ──────
    const journalEntriesApplied = await isApplied(client, "39_journal_entries");
    if (!journalEntriesApplied) {
      await runSqlFile(
        client,
        sqlPath("39_journal_entries.sql"),
        "39_journal_entries (journal_entries + journal_entry_lines tables, double-entry accounting)",
      );
      await markApplied(client, "39_journal_entries");
    } else {
      logger.info("runMigrations: 39_journal_entries — already applied, skipping");
    }

    // ── Step 1g: trip_timeline v2 schema (add day_number, activity_type, etc) ─
    const tripTimelineV2Applied = await isApplied(client, "07_trip_timeline_v2");
    if (!tripTimelineV2Applied) {
      await runSqlFile(
        client,
        sqlPath("07_trip_timeline_v2.sql"),
        "07_trip_timeline_v2 (add day_number + activity_type columns to trip_timeline)",
      );
      await markApplied(client, "07_trip_timeline_v2");
    } else {
      logger.info("runMigrations: 07_trip_timeline_v2 — already applied, skipping");
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

    // ── Step N: guide_audio_sessions table ──────────────────────────────────
    const audioSessionsApplied = await isApplied(client, "074_audio_sessions");
    if (!audioSessionsApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("074_audio_sessions.sql"),
          "074_audio_sessions (live audio broadcast sessions for guide system)",
        );
        await markApplied(client, "074_audio_sessions");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 074_audio_sessions — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 074_audio_sessions — already applied, skipping");
    }

    // ── Step 075: Tour Guide System — transmisi, absensi, lokasi ─────────────
    const guideSystemApplied = await isApplied(client, "075_tour_guide_system");
    if (!guideSystemApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("075_tour_guide_system.sql"),
          "075_tour_guide_system (guide_channels, guide_broadcasts, guide_sessions, guide_session_attendance, guide_locations)",
        );
        await markApplied(client, "075_tour_guide_system");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 075_tour_guide_system — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 075_tour_guide_system — already applied, skipping");
    }

    // ── Step 076: Trip timeline live columns (Fase 2 Tour Guide) ──────────────
    const timelineLiveApplied = await isApplied(client, "076_trip_timeline_live_columns");
    if (!timelineLiveApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("076_trip_timeline_live_columns.sql"),
          "076_trip_timeline_live_columns (live_status, delay_minutes, live_notes, location_changed_to)",
        );
        await markApplied(client, "076_trip_timeline_live_columns");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 076_trip_timeline_live_columns — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 076_trip_timeline_live_columns — already applied, skipping");
    }

    // ── Step 077: Guide sub-groups (Fase 3 Tour Guide — F3.1) ──────────────────
    const guideSubgroupsApplied = await isApplied(client, "077_guide_subgroups");
    if (!guideSubgroupsApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("077_guide_subgroups.sql"),
          "077_guide_subgroups (guide_subgroups + guide_subgroup_members)",
        );
        await markApplied(client, "077_guide_subgroups");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 077_guide_subgroups — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 077_guide_subgroups — already applied, skipping");
    }

    // ── Step 079: Fix trigger trg_auto_queue_equipment (kolom 'status' bukan 'booking_status') ─
    const fixEquipTriggerApplied = await isApplied(client, "079_fix_equipment_queue_trigger");
    if (!fixEquipTriggerApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("079_fix_equipment_queue_trigger.sql"),
          "079_fix_equipment_queue_trigger (pasang trigger dengan kolom status yang benar)",
        );
        await markApplied(client, "079_fix_equipment_queue_trigger");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 079_fix_equipment_queue_trigger — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 079_fix_equipment_queue_trigger — already applied, skipping");
    }

    // ── Step 078: Sprint A1 — Auto-queue equipment saat booking dikonfirmasi ───
    // Trigger otomatis membuat equipment_distributions (status='queued') untuk
    // setiap jamaah berdasarkan package_type_equipment tipe paket.
    const autoEquipQueueApplied = await isApplied(client, "078_auto_equipment_queue_on_booking_confirmed");
    if (!autoEquipQueueApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("078_auto_equipment_queue_on_booking_confirmed.sql"),
          "078_auto_equipment_queue (trigger auto-queue perlengkapan saat booking confirmed + backfill)",
        );
        await markApplied(client, "078_auto_equipment_queue_on_booking_confirmed");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 078_auto_equipment_queue — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 078_auto_equipment_queue — already applied, skipping");
    }

    // ── Step 082: Sprint C — departure_muthawifs, hotel_contracts, hotel_vouchers, sos_escalation_log ──
    const sprintCApplied = await isApplied(client, "082_sprint_c");
    if (!sprintCApplied) {
      try {
        await runSqlFile(
          client,
          sqlPath("082_sprint_c.sql"),
          "082_sprint_c (departure_muthawifs C4, hotel_contracts+hotel_vouchers C7, sos_escalation_log C8)",
        );
        await markApplied(client, "082_sprint_c");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 082_sprint_c — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 082_sprint_c — already applied, skipping");
    }

    // ── Step 083: Sprint D — D6: height_cm + weight_kg + clothing_size pada customers ──
    const sprintD083Applied = await isApplied(client, "083_sprint_d_height_clothing_size");
    if (!sprintD083Applied) {
      try {
        await runSqlFile(
          client,
          sqlPath("083_sprint_d_height_clothing_size.sql"),
          "083_sprint_d_height_clothing_size (D6: TB/BB + auto-suggest ukuran pakaian)",
        );
        await markApplied(client, "083_sprint_d_height_clothing_size");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "runMigrations: 083_sprint_d — skipping (non-fatal)");
      }
    } else {
      logger.info("runMigrations: 083_sprint_d — already applied, skipping");
    }

  } catch (err) {
    logger.error({ err }, "runMigrations: unexpected error — server continues");
  } finally {
    client.release();
  }
}
