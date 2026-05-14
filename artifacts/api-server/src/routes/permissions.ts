import { Router } from "express";

const router = Router();

// ─── Canonical permission list dari kode (source of truth) ───────────────────
// Ini adalah daftar semua permission yang digunakan di aplikasi (dari permissions.ts frontend).
// RBAC-P4: Script sync deteksi diff antara kode dan DB.

const CODE_PERMISSIONS = [
  // Dashboard
  "dashboard", "dashboard-branch", "dashboard-agent",
  // Booking
  "bookings", "bookings-create", "bookings-edit", "bookings-delete", "bookings-approve",
  // Customers
  "customers", "customers-create", "customers-edit", "customers-delete",
  // Packages
  "packages", "packages-create", "packages-edit", "packages-delete",
  // Departures
  "departures", "departures-create", "departures-edit", "departures-delete",
  // Payments
  "payments", "payments-approve", "payments-export",
  // Agents
  "agents", "agents-create", "agents-edit", "agents-delete", "agents-commissions",
  // HR
  "hr", "hr-employees", "hr-attendance", "hr-payroll", "hr-leave",
  // Finance
  "finance", "finance-cash", "finance-ar", "finance-reports", "finance-payroll",
  // Operations
  "operations", "operations-manifest", "operations-documents", "operations-rooming",
  "operations-visa", "operations-baggage",
  // Branches
  "branches", "branches-create", "branches-edit", "branches-delete",
  "branches-comparison", "branches-kpi",
  // Marketing
  "marketing", "marketing-leads", "marketing-blog", "marketing-testimonials",
  // Reports
  "reports", "reports-advanced", "reports-scheduled",
  // Store
  "store", "store-products", "store-orders", "store-categories",
  // Loyalty
  "loyalty", "loyalty-points", "loyalty-rewards", "loyalty-tier-benefits",
  // Settings
  "settings", "settings-website", "settings-pwa", "settings-rbac",
  "settings-integrations", "settings-webhooks",
  // RBAC
  "rbac", "rbac-roles", "rbac-permissions", "rbac-access-simulator",
  // Exchange rates
  "exchange-rates",
  // Savings
  "savings", "savings-plans",
  // Misc
  "pwa-settings", "analytics", "ai-features",
  "commission-calculator", "booking-transfers",
] as const;

// ─── GET /api/permissions/list — Daftar semua permission di kode ──────────────
router.get("/list", (_req, res) => {
  res.json({ permissions: CODE_PERMISSIONS, total: CODE_PERMISSIONS.length });
});

// ─── GET /api/permissions/sync-diff — Diff antara kode dan DB ────────────────
// RBAC-P4: Deteksi permission yang ada di kode tapi tidak ada di DB (atau sebaliknya)
router.get("/sync-diff", async (_req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ error: "Supabase belum dikonfigurasi" });
    return;
  }

  try {
    // Ambil semua permission yang ada di DB (tabel permissions_list atau role_permissions)
    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/permissions_list?select=permission_key&limit=500`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    let dbPermissions: string[] = [];
    if (dbRes.ok) {
      const rows = await dbRes.json() as Array<{ permission_key: string }>;
      dbPermissions = rows.map((r) => r.permission_key);
    }

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

// ─── POST /api/permissions/sync — Auto-sync permission kode ke DB ─────────────
router.post("/sync", async (_req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ error: "Supabase belum dikonfigurasi" });
    return;
  }

  try {
    const toInsert = CODE_PERMISSIONS.map((key) => ({
      permission_key: key,
      label: key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Permission untuk fitur ${key}`,
      is_active: true,
    }));

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/permissions_list`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(toInsert),
      signal: AbortSignal.timeout(15000),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`DB error: ${insertRes.status} — ${errText}`);
    }

    res.json({
      success: true,
      message: `${toInsert.length} permission di-sync ke database (duplicates diabaikan)`,
      synced_count: toInsert.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
