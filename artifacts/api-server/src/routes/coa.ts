import { Router } from "express";
import { pool } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const pg = await pool.connect();
    try {
      const { rows } = await pg.query(`
        SELECT id, code, name, parent_code, category_key, description, is_active, sort_order, created_at, updated_at
        FROM coa_categories
        ORDER BY sort_order ASC, code ASC
      `);
      res.json({ data: rows });
    } finally {
      pg.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { code, name, parent_code, category_key, description, is_active = true, sort_order = 0 } = req.body;
  if (!code || !name) return res.status(400).json({ error: "code dan name wajib diisi" });
  const pg = await pool.connect();
  try {
    const { rows } = await pg.query(
      `INSERT INTO coa_categories (code, name, parent_code, category_key, description, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code, name, parent_code || null, category_key || null, description || null, is_active, sort_order]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  } finally {
    pg.release();
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { code, name, parent_code, category_key, description, is_active, sort_order } = req.body;
  const pg = await pool.connect();
  try {
    const { rows } = await pg.query(
      `UPDATE coa_categories
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           parent_code = $3,
           category_key = $4,
           description = $5,
           is_active = COALESCE($6, is_active),
           sort_order = COALESCE($7, sort_order),
           updated_at = now()
       WHERE id = $8
       RETURNING *`,
      [code, name, parent_code ?? null, category_key ?? null, description ?? null, is_active, sort_order, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Akun tidak ditemukan" });
    res.json({ data: rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  } finally {
    pg.release();
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const pg = await pool.connect();
  try {
    const { rows } = await pg.query(
      `UPDATE coa_categories SET is_active = false, updated_at = now() WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Akun tidak ditemukan" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    pg.release();
  }
});

export default router;
