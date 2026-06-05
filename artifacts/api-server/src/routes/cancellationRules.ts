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
