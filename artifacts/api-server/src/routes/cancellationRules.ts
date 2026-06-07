/**
 * /api/cancellation-rules
 *
 * CRUD untuk aturan pembatalan (cancellation_rules).
 * Tabel: cancellation_rules { id, name, is_default, sections[], created_at, updated_at }
 * Packages memiliki FK: cancellation_rule_id → cancellation_rules.id
 *
 * Endpoints:
 *   GET    /api/cancellation-rules            — daftar semua aturan
 *   GET    /api/cancellation-rules/default     — aturan yang is_default = true (jika ada)
 *   POST   /api/cancellation-rules            — buat aturan baru
 *   PUT    /api/cancellation-rules/:id        — update aturan
 *   DELETE /api/cancellation-rules/:id        — hapus aturan (jika tidak ada paket yang memakai)
 *   PUT    /api/cancellation-rules/:id/set-default — jadikan default
 *   GET    /api/cancellation-rules/:id/packages   — daftar paket yang memakai aturan ini
 *   PUT    /api/packages/:id/cancellation-rule     — kaitkan aturan ke paket
 *   DELETE /api/packages/:id/cancellation-rule     — lepas keterkaitan
 */

import { Router } from "express";
import { pool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

function err500(res: any, err: any, context = "") {
  logger.error({ err }, `cancellation-rules: ${context}`);
  res.status(500).json({ error: err?.message ?? "Terjadi kesalahan" });
}

// ── GET /api/cancellation-rules ───────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        cr.id,
        cr.name,
        cr.is_default,
        cr.sections,
        cr.created_at,
        cr.updated_at,
        COUNT(p.id)::int AS package_count
      FROM cancellation_rules cr
      LEFT JOIN packages p ON p.cancellation_rule_id = cr.id
      GROUP BY cr.id
      ORDER BY cr.is_default DESC, cr.name ASC
    `);
    res.json({ data: rows });
  } catch (err: any) {
    err500(res, err, "list");
  }
});

// ── GET /api/cancellation-rules/default ───────────────────────────────────────
router.get("/default", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, is_default, sections, created_at, updated_at
      FROM cancellation_rules
      WHERE is_default = TRUE
      LIMIT 1
    `);
    res.json({ data: rows[0] ?? null });
  } catch (err: any) {
    err500(res, err, "get-default");
  }
});

// ── GET /api/cancellation-rules/all-packages ─────────────────────────────────
// Returns all packages with their current cancellation_rule_id (for bulk-assign UI)
router.get("/all-packages", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, type, is_active, cancellation_rule_id
      FROM packages
      ORDER BY name ASC
    `);
    res.json({ data: rows });
  } catch (err: any) {
    err500(res, err, "all-packages");
  }
});

// ── GET /api/cancellation-rules/audit-logs ───────────────────────────────────
// Returns recent audit log entries (bulk assign / unassign history).
router.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 50, 200);
    const action = req.query["action"] as string | undefined;

    const conditions: string[] = [];
    const vals: unknown[] = [];
    if (action && ["bulk_assign", "bulk_unassign"].includes(action)) {
      conditions.push(`action = $${vals.length + 1}`);
      vals.push(action);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(limit);

    const { rows } = await pool.query(
      `SELECT id, action, actor_name, actor_email, rule_id, rule_name,
              package_count, package_names, created_at
       FROM cancellation_rule_audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${vals.length}`,
      vals
    );
    res.json({ data: rows });
  } catch (err: any) {
    err500(res, err, "audit-logs");
  }
});

// ── PUT /api/cancellation-rules/bulk-unassign ────────────────────────────────
// Clears cancellation_rule_id for the given package IDs.
// Body: { package_ids: string[], actor_name?: string, actor_email?: string }
router.put("/bulk-unassign", async (req, res) => {
  try {
    const { package_ids, actor_name, actor_email } = req.body as {
      package_ids: string[];
      actor_name?: string;
      actor_email?: string;
    };

    if (!Array.isArray(package_ids) || package_ids.length === 0) {
      res.status(400).json({ error: "package_ids harus berupa array yang tidak kosong" });
      return;
    }

    const placeholders = package_ids.map((_, i) => `$${i + 1}`).join(", ");

    // Snapshot package names before clearing
    const { rows: pkgRows } = await pool.query(
      `SELECT name FROM packages WHERE id IN (${placeholders}) ORDER BY name`,
      package_ids
    );
    const packageNames = pkgRows.map((r: any) => r.name as string);

    const { rowCount } = await pool.query(
      `UPDATE packages SET cancellation_rule_id = NULL, updated_at = NOW()
       WHERE id IN (${placeholders})`,
      package_ids
    );

    // Insert audit record
    await pool.query(
      `INSERT INTO cancellation_rule_audit_logs
         (action, actor_name, actor_email, rule_id, rule_name, package_count, package_names)
       VALUES ('bulk_unassign', $1, $2, NULL, NULL, $3, $4)`,
      [actor_name ?? null, actor_email ?? null, package_ids.length, packageNames]
    );

    res.json({ success: true, updated: rowCount ?? 0 });
  } catch (err: any) {
    err500(res, err, "bulk-unassign");
  }
});

// ── GET /api/cancellation-rules/for-package/:packageId ───────────────────────
// Single-source-of-truth resolver: returns the effective cancellation rule for
// a package. If the package has a specific cancellation_rule_id → return that.
// Otherwise fall back to the is_default = TRUE rule.
// Response: { data: { ...rule, is_using_default: boolean } | null }
router.get("/for-package/:packageId", async (req, res) => {
  try {
    const { packageId } = req.params;

    // Step 1: check if package exists and has a specific rule
    const { rows: pkgRows } = await pool.query(
      `SELECT cancellation_rule_id FROM packages WHERE id = $1`,
      [packageId]
    );

    if (!pkgRows.length) {
      res.status(404).json({ error: "Paket tidak ditemukan" });
      return;
    }

    const specificRuleId = pkgRows[0].cancellation_rule_id as string | null;

    if (specificRuleId) {
      // Package has its own rule
      const { rows } = await pool.query(
        `SELECT id, name, is_default, sections FROM cancellation_rules WHERE id = $1`,
        [specificRuleId]
      );
      if (rows.length) {
        res.json({ data: { ...rows[0], is_using_default: false } });
        return;
      }
      // Rule id set but deleted — fall through to default
    }

    // Step 2: fall back to the global default rule
    const { rows: defRows } = await pool.query(
      `SELECT id, name, is_default, sections FROM cancellation_rules WHERE is_default = TRUE LIMIT 1`
    );

    res.json({ data: defRows.length ? { ...defRows[0], is_using_default: true } : null });
  } catch (err: any) {
    err500(res, err, "for-package");
  }
});

// ── GET /api/cancellation-rules/:id ───────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, is_default, sections, created_at, updated_at
       FROM cancellation_rules WHERE id = $1`,
      [id]
    );
    if (!rows.length) {
      res.status(404).json({ error: "Aturan tidak ditemukan" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err: any) {
    err500(res, err, "get-one");
  }
});

// ── GET /api/cancellation-rules/:id/packages ──────────────────────────────────
router.get("/:id/packages", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, type, is_active FROM packages
       WHERE cancellation_rule_id = $1 ORDER BY name`,
      [id]
    );
    res.json({ data: rows });
  } catch (err: any) {
    err500(res, err, "get-packages");
  }
});

// ── POST /api/cancellation-rules ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, is_default = false, sections = [] } = req.body as {
      name: string;
      is_default?: boolean;
      sections?: unknown[];
    };

    if (!name?.trim()) {
      res.status(400).json({ error: "Nama aturan wajib diisi" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (is_default) {
        await client.query(
          `UPDATE cancellation_rules SET is_default = FALSE, updated_at = NOW()
           WHERE is_default = TRUE`
        );
      }

      const { rows } = await client.query(
        `INSERT INTO cancellation_rules (name, is_default, sections)
         VALUES ($1, $2, $3)
         RETURNING id, name, is_default, sections, created_at, updated_at`,
        [name.trim(), is_default, JSON.stringify(sections)]
      );

      await client.query("COMMIT");
      res.status(201).json({ data: rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    err500(res, err, "create");
  }
});

// ── PUT /api/cancellation-rules/:id ──────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_default, sections } = req.body as {
      name?: string;
      is_default?: boolean;
      sections?: unknown[];
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: existing } = await client.query(
        `SELECT id FROM cancellation_rules WHERE id = $1`,
        [id]
      );
      if (!existing.length) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Aturan tidak ditemukan" });
        return;
      }

      if (is_default === true) {
        await client.query(
          `UPDATE cancellation_rules SET is_default = FALSE, updated_at = NOW()
           WHERE is_default = TRUE AND id <> $1`,
          [id]
        );
      }

      const updates: string[] = ["updated_at = NOW()"];
      const vals: unknown[] = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx++}`); vals.push(name.trim()); }
      if (is_default !== undefined) { updates.push(`is_default = $${idx++}`); vals.push(is_default); }
      if (sections !== undefined) { updates.push(`sections = $${idx++}`); vals.push(JSON.stringify(sections)); }

      vals.push(id);
      const { rows } = await client.query(
        `UPDATE cancellation_rules SET ${updates.join(", ")}
         WHERE id = $${idx}
         RETURNING id, name, is_default, sections, created_at, updated_at`,
        vals
      );

      await client.query("COMMIT");
      res.json({ data: rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    err500(res, err, "update");
  }
});

// ── PUT /api/cancellation-rules/:id/set-default ──────────────────────────────
router.put("/:id/set-default", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE cancellation_rules SET is_default = FALSE, updated_at = NOW()
         WHERE is_default = TRUE`
      );
      const { rows } = await client.query(
        `UPDATE cancellation_rules SET is_default = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, is_default, sections, created_at, updated_at`,
        [id]
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Aturan tidak ditemukan" });
        return;
      }
      await client.query("COMMIT");
      res.json({ data: rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    err500(res, err, "set-default");
  }
});

// ── PUT /api/cancellation-rules/:id/bulk-assign ──────────────────────────────
// Assigns a cancellation rule to many packages at once.
// Body: { package_ids: string[], actor_name?: string, actor_email?: string }
router.put("/:id/bulk-assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { package_ids, actor_name, actor_email } = req.body as {
      package_ids: string[];
      actor_name?: string;
      actor_email?: string;
    };

    if (!Array.isArray(package_ids) || package_ids.length === 0) {
      res.status(400).json({ error: "package_ids harus berupa array yang tidak kosong" });
      return;
    }

    // Verify the rule exists and get its name
    const { rows: ruleRows } = await pool.query(
      `SELECT id, name FROM cancellation_rules WHERE id = $1`,
      [id]
    );
    if (!ruleRows.length) {
      res.status(404).json({ error: "Aturan tidak ditemukan" });
      return;
    }
    const ruleName = ruleRows[0].name as string;

    // Snapshot package names before assigning
    const pkgPlaceholders = package_ids.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: pkgRows } = await pool.query(
      `SELECT name FROM packages WHERE id IN (${pkgPlaceholders}) ORDER BY name`,
      package_ids
    );
    const packageNames = pkgRows.map((r: any) => r.name as string);

    // Update packages
    const { rowCount } = await pool.query(
      `UPDATE packages SET cancellation_rule_id = $1, updated_at = NOW()
       WHERE id IN (${pkgPlaceholders})`,
      [id, ...package_ids]
    );

    // Insert audit record
    await pool.query(
      `INSERT INTO cancellation_rule_audit_logs
         (action, actor_name, actor_email, rule_id, rule_name, package_count, package_names)
       VALUES ('bulk_assign', $1, $2, $3, $4, $5, $6)`,
      [actor_name ?? null, actor_email ?? null, id, ruleName, package_ids.length, packageNames]
    );

    res.json({ success: true, updated: rowCount ?? 0 });
  } catch (err: any) {
    err500(res, err, "bulk-assign");
  }
});

// ── DELETE /api/cancellation-rules/:id ───────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: usedBy } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM packages WHERE cancellation_rule_id = $1`,
      [id]
    );
    if (usedBy[0].count > 0) {
      res.status(409).json({
        error: `Aturan ini masih digunakan oleh ${usedBy[0].count} paket. Lepas keterkaitan terlebih dahulu sebelum menghapus.`,
      });
      return;
    }

    const { rowCount } = await pool.query(
      `DELETE FROM cancellation_rules WHERE id = $1`,
      [id]
    );
    if (!rowCount) {
      res.status(404).json({ error: "Aturan tidak ditemukan" });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    err500(res, err, "delete");
  }
});

// ── PUT /api/packages/:id/cancellation-rule ───────────────────────────────────
// (mounted at /api/packages/:id/cancellation-rule via the packages sub-path)
// We expose these as standalone routes and mount them from index.ts
router.put("/packages/:packageId/cancellation-rule", async (req, res) => {
  try {
    const { packageId } = req.params;
    const { cancellation_rule_id } = req.body as { cancellation_rule_id: string | null };

    if (cancellation_rule_id) {
      const { rows } = await pool.query(
        `SELECT id FROM cancellation_rules WHERE id = $1`,
        [cancellation_rule_id]
      );
      if (!rows.length) {
        res.status(404).json({ error: "Aturan pembatalan tidak ditemukan" });
        return;
      }
    }

    const { rows } = await pool.query(
      `UPDATE packages SET cancellation_rule_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, cancellation_rule_id`,
      [cancellation_rule_id ?? null, packageId]
    );
    if (!rows.length) {
      res.status(404).json({ error: "Paket tidak ditemukan" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err: any) {
    err500(res, err, "assign-to-package");
  }
});

export default router;
