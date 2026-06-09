import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────
async function generateEntryNumber(pg: any): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await pg.query(
    `SELECT COUNT(*)::int AS cnt FROM journal_entries WHERE entry_number LIKE $1`,
    [`JU-${year}-%`]
  );
  const next = (rows[0].cnt ?? 0) + 1;
  return `JU-${year}-${String(next).padStart(4, "0")}`;
}

// ── GET /api/journal  — list entries (with line summary) ─────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { start, end, status, search, limit = "100", offset = "0" } = req.query as Record<string, string>;
  const params: any[] = [];
  const where: string[] = [];

  if (start) { params.push(start); where.push(`je.entry_date >= $${params.length}`); }
  if (end)   { params.push(end);   where.push(`je.entry_date <= $${params.length}`); }
  if (status && status !== "all") { params.push(status); where.push(`je.status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(je.entry_number ILIKE $${params.length} OR je.description ILIKE $${params.length} OR je.ref_code ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(parseInt(limit), parseInt(offset));

  const pg = await pool.connect();
  try {
    const [entriesResult, countResult] = await Promise.all([
      pg.query(
        `SELECT
           je.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id',           jel.id,
                 'line_number',  jel.line_number,
                 'account_code', jel.account_code,
                 'account_name', jel.account_name,
                 'description',  jel.description,
                 'debit',        jel.debit,
                 'credit',       jel.credit
               ) ORDER BY jel.line_number
             ) FILTER (WHERE jel.id IS NOT NULL),
             '[]'
           ) AS lines
         FROM journal_entries je
         LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id
         ${whereClause}
         GROUP BY je.id
         ORDER BY je.entry_date DESC, je.entry_number DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pg.query(
        `SELECT COUNT(*)::int AS total FROM journal_entries je ${whereClause}`,
        params.slice(0, params.length - 2)
      ),
    ]);

    res.json({ data: entriesResult.rows, total: countResult.rows[0].total });
  } finally {
    pg.release();
  }
});

// ── GET /api/journal/:id  — single entry with lines ──────────────────
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const pg = await pool.connect();
  try {
    const { rows } = await pg.query(
      `SELECT
         je.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',           jel.id,
               'line_number',  jel.line_number,
               'account_code', jel.account_code,
               'account_name', jel.account_name,
               'description',  jel.description,
               'debit',        jel.debit,
               'credit',       jel.credit
             ) ORDER BY jel.line_number
           ) FILTER (WHERE jel.id IS NOT NULL),
           '[]'
         ) AS lines
       FROM journal_entries je
       LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id
       WHERE je.id = $1
       GROUP BY je.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Jurnal tidak ditemukan" });
    res.json({ data: rows[0] });
  } finally {
    pg.release();
  }
});

// ── POST /api/journal  — create entry + lines ─────────────────────────
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { entry_date, description, ref_type, ref_id, ref_code, status = "posted", branch_id, lines } = req.body;
  const user = (req as any).user;

  if (!description) return res.status(400).json({ error: "Deskripsi jurnal wajib diisi" });
  if (!Array.isArray(lines) || lines.length < 2)
    return res.status(400).json({ error: "Jurnal wajib memiliki minimal 2 baris" });

  const totalDebit  = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01)
    return res.status(400).json({ error: `Jurnal tidak balance — Debit ${totalDebit.toLocaleString("id-ID")} ≠ Kredit ${totalCredit.toLocaleString("id-ID")}` });
  if (totalDebit === 0)
    return res.status(400).json({ error: "Total debit/kredit tidak boleh nol" });

  const pg = await pool.connect();
  try {
    await pg.query("BEGIN");

    const entryNumber = await generateEntryNumber(pg);
    const { rows: entryRows } = await pg.query(
      `INSERT INTO journal_entries
         (entry_number, entry_date, description, ref_type, ref_id, ref_code, status, branch_id, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        entryNumber,
        entry_date || new Date().toISOString().slice(0, 10),
        description,
        ref_type || "manual",
        ref_id || null,
        ref_code || null,
        status,
        branch_id || null,
        user?.id || null,
        user?.full_name || user?.email || null,
      ]
    );
    const entryId = entryRows[0].id;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.account_code) continue;
      await pg.query(
        `INSERT INTO journal_entry_lines
           (entry_id, line_number, account_code, account_name, description, debit, credit)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          entryId,
          i + 1,
          l.account_code,
          l.account_name || null,
          l.description || null,
          parseFloat(l.debit) || 0,
          parseFloat(l.credit) || 0,
        ]
      );
    }

    await pg.query("COMMIT");

    // Fetch final entry with lines
    const { rows } = await pg.query(
      `SELECT je.*, COALESCE(json_agg(jel ORDER BY jel.line_number) FILTER (WHERE jel.id IS NOT NULL), '[]') AS lines
       FROM journal_entries je LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id
       WHERE je.id = $1 GROUP BY je.id`,
      [entryId]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err: any) {
    await pg.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    pg.release();
  }
});

// ── PUT /api/journal/:id  — update (only draft entries) ──────────────
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { entry_date, description, ref_code, status, lines } = req.body;

  const pg = await pool.connect();
  try {
    const { rows: existing } = await pg.query(`SELECT * FROM journal_entries WHERE id = $1`, [id]);
    if (!existing[0]) return res.status(404).json({ error: "Jurnal tidak ditemukan" });
    if (existing[0].status === "voided") return res.status(400).json({ error: "Jurnal yang sudah divoid tidak bisa diedit" });

    if (lines) {
      const totalDebit  = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit)  || 0), 0);
      const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01)
        return res.status(400).json({ error: `Jurnal tidak balance — Debit ≠ Kredit` });
    }

    await pg.query("BEGIN");

    await pg.query(
      `UPDATE journal_entries SET
         entry_date  = COALESCE($1, entry_date),
         description = COALESCE($2, description),
         ref_code    = COALESCE($3, ref_code),
         status      = COALESCE($4, status),
         updated_at  = now()
       WHERE id = $5`,
      [entry_date, description, ref_code, status, id]
    );

    if (lines) {
      await pg.query(`DELETE FROM journal_entry_lines WHERE entry_id = $1`, [id]);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!l.account_code) continue;
        await pg.query(
          `INSERT INTO journal_entry_lines (entry_id, line_number, account_code, account_name, description, debit, credit)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, i + 1, l.account_code, l.account_name || null, l.description || null, parseFloat(l.debit) || 0, parseFloat(l.credit) || 0]
        );
      }
    }

    await pg.query("COMMIT");

    const { rows } = await pg.query(
      `SELECT je.*, COALESCE(json_agg(jel ORDER BY jel.line_number) FILTER (WHERE jel.id IS NOT NULL), '[]') AS lines
       FROM journal_entries je LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id
       WHERE je.id = $1 GROUP BY je.id`,
      [id]
    );
    res.json({ data: rows[0] });
  } catch (err: any) {
    await pg.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    pg.release();
  }
});

// ── DELETE /api/journal/:id  — void entry ────────────────────────────
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { reason } = req.body;
  const pg = await pool.connect();
  try {
    const { rows } = await pg.query(
      `UPDATE journal_entries
       SET status = 'voided', voided_at = now(), voided_reason = $1, updated_at = now()
       WHERE id = $2 AND status != 'voided'
       RETURNING id, entry_number`,
      [reason || "Dibatalkan oleh pengguna", req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Jurnal tidak ditemukan atau sudah divoid" });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    pg.release();
  }
});

export default router;
