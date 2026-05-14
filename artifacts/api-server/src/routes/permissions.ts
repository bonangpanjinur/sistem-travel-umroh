import { Router } from "express";
import { db } from "../lib/db.js";
import { sql } from "drizzle-orm";

const router = Router();

const CODE_PERMISSIONS = [
  "dashboard", "dashboard-branch", "dashboard-agent",
  "bookings", "bookings-create", "bookings-edit", "bookings-delete", "bookings-approve",
  "customers", "customers-create", "customers-edit", "customers-delete",
  "packages", "packages-create", "packages-edit", "packages-delete",
  "departures", "departures-create", "departures-edit", "departures-delete",
  "payments", "payments-approve", "payments-export",
  "agents", "agents-create", "agents-edit", "agents-delete", "agents-commissions",
  "hr", "hr-employees", "hr-attendance", "hr-payroll", "hr-leave",
  "finance", "finance-cash", "finance-ar", "finance-reports", "finance-payroll",
  "operations", "operations-manifest", "operations-documents", "operations-rooming",
  "operations-visa", "operations-baggage",
  "branches", "branches-create", "branches-edit", "branches-delete",
  "branches-comparison", "branches-kpi",
  "marketing", "marketing-leads", "marketing-blog", "marketing-testimonials",
  "reports", "reports-advanced", "reports-scheduled",
  "store", "store-products", "store-orders", "store-categories",
  "loyalty", "loyalty-points", "loyalty-rewards", "loyalty-tier-benefits",
  "settings", "settings-website", "settings-pwa", "settings-rbac",
  "settings-integrations", "settings-webhooks",
  "rbac", "rbac-roles", "rbac-permissions", "rbac-access-simulator",
  "exchange-rates",
  "savings", "savings-plans",
  "pwa-settings", "analytics", "ai-features",
  "commission-calculator", "booking-transfers",
] as const;

// ── Ensure permissions_list table exists ──────────────────────────────────────
async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS permissions_list (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      permission_key TEXT NOT NULL UNIQUE,
      label       TEXT,
      description TEXT,
      group_name  TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ── GET /api/permissions/list ─────────────────────────────────────────────────
router.get("/list", (_req, res) => {
  res.json({ permissions: CODE_PERMISSIONS, total: CODE_PERMISSIONS.length });
});

// ── GET /api/permissions/sync-diff ───────────────────────────────────────────
// RBAC-P4: Deteksi diff antara kode dan Replit Postgres permissions_list
router.get("/sync-diff", async (_req, res) => {
  try {
    await ensureTable();
    const rows = await db.execute(
      sql`SELECT permission_key FROM permissions_list WHERE is_active = TRUE LIMIT 500`
    );
    const dbPermissions: string[] = (rows.rows as any[]).map((r) => r.permission_key);

    const codeSet = new Set(CODE_PERMISSIONS as readonly string[]);
    const dbSet = new Set(dbPermissions);

    const inCodeNotDb = [...codeSet].filter((p) => !dbSet.has(p));
    const inDbNotCode = dbPermissions.filter((p) => !codeSet.has(p));
    const synced = [...codeSet].filter((p) => dbSet.has(p));

    res.json({
      status: inCodeNotDb.length === 0 && inDbNotCode.length === 0 ? "synced" : "out_of_sync",
      summary: {
        total_code: CODE_PERMISSIONS.length,
        total_db: dbPermissions.length,
        synced: synced.length,
        missing_in_db: inCodeNotDb.length,
        extra_in_db: inDbNotCode.length,
      },
      missing_in_db: inCodeNotDb,
      extra_in_db: inDbNotCode,
      synced_permissions: synced,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/permissions/sync ────────────────────────────────────────────────
// RBAC-P4: Auto-sync permission kode → Replit Postgres permissions_list
router.post("/sync", async (_req, res) => {
  try {
    await ensureTable();

    for (const key of CODE_PERMISSIONS) {
      const label = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const groupName = key.split("-")[0];
      await db.execute(sql`
        INSERT INTO permissions_list (permission_key, label, description, group_name, is_active)
        VALUES (
          ${key},
          ${label},
          ${"Permission untuk fitur " + key},
          ${groupName},
          TRUE
        )
        ON CONFLICT (permission_key) DO UPDATE
          SET label = EXCLUDED.label,
              group_name = EXCLUDED.group_name,
              is_active = TRUE
      `);
    }

    res.json({
      success: true,
      message: `${CODE_PERMISSIONS.length} permission di-sync ke Replit Postgres (duplicates diperbarui)`,
      synced_count: CODE_PERMISSIONS.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
