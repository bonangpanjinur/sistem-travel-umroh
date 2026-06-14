/**
 * GET  /api/admin/migrations           — list all SQL files + applied status
 * POST /api/admin/migrations/:name/run — run a specific migration (super_admin only)
 * GET  /api/admin/migrations/audit     — fetch audit log (super_admin only)
 *
 * Protected: all endpoints require a valid Bearer token with role = super_admin.
 */

import { Router } from "express";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../lib/db.js";
import { verifyRequestToken, type JWTPayload } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

function sqlDir(): string {
  if (process.env["MIGRATION_SQL_DIR"]) return resolve(process.env["MIGRATION_SQL_DIR"]);
  const candidates = [
    resolve(_dir, "../../../../supabase_clean_migration/new"), // from src/routes/
    resolve(_dir, "../../../supabase_clean_migration/new"),    // from dist/
    resolve(_dir, "sql"),                                      // legacy fallback
  ];
  return candidates.find(p => existsSync(p)) ?? candidates[candidates.length - 1];
}

// ── Auth guard: super_admin only ──────────────────────────────────────────────
// Returns the verified JWT payload on success, or sends a 401/403 and returns null.
async function requireSuperAdmin(
  req: any,
  res: any,
): Promise<JWTPayload | null> {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Autentikasi diperlukan" });
    return null;
  }
  if (payload.role !== "super_admin") {
    res.status(403).json({ error: "Hanya super_admin yang dapat mengakses fitur ini" });
    return null;
  }
  return payload;
}

// ── Client IP helper ─────────────────────────────────────────────────────────
function clientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? req.ip ?? "unknown";
}

// ── SQL statement splitter ────────────────────────────────────────────────────
function splitStatements(sql: string): string[] {
  const stmts: string[] = [];
  let buf = "";
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const slice = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      buf += slice;
      i += slice.length;
      continue;
    }

    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) { buf += sql.slice(i); i = len; continue; }
      buf += sql.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    if (ch === "$") {
      let tagEnd = i + 1;
      while (tagEnd < len && sql[tagEnd] !== "$") tagEnd++;
      if (tagEnd < len) {
        const tag = sql.slice(i, tagEnd + 1);
        const closeIdx = sql.indexOf(tag, tagEnd + 1);
        if (closeIdx !== -1) {
          buf += sql.slice(i, closeIdx + tag.length);
          i = closeIdx + tag.length;
          continue;
        }
      }
      buf += ch;
      i++;
      continue;
    }

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

  const tail = buf.trim();
  if (tail) stmts.push(tail);
  return stmts;
}

// ── _schema_migrations helpers ────────────────────────────────────────────────
async function getAppliedMigrations(): Promise<Map<string, string>> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ name: string; applied_at: string }>(
      `SELECT name, applied_at FROM _schema_migrations ORDER BY applied_at`,
    );
    const map = new Map<string, string>();
    for (const row of result.rows) map.set(row.name, row.applied_at);
    return map;
  } catch {
    return new Map();
  } finally {
    client.release();
  }
}

async function markApplied(client: any, name: string): Promise<void> {
  await client.query(
    `INSERT INTO _schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name],
  );
}

// ── _migration_audit helpers ─────────────────────────────────────────────────
async function ensureAuditTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migration_audit (
      id           BIGSERIAL    PRIMARY KEY,
      migration    TEXT         NOT NULL,
      run_by_id    TEXT,
      run_by_email TEXT,
      ip_address   TEXT,
      ok_count     INT          NOT NULL DEFAULT 0,
      error_count  INT          NOT NULL DEFAULT 0,
      ran_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

async function writeAuditEntry(
  client: any,
  opts: {
    migration: string;
    userId: string;
    email: string;
    ip: string;
    ok: number;
    errors: number;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO _migration_audit
       (migration, run_by_id, run_by_email, ip_address, ok_count, error_count)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [opts.migration, opts.userId, opts.email, opts.ip, opts.ok, opts.errors],
  );
}

// ── GET /api/admin/migrations ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!(await requireSuperAdmin(req, res))) return;

  try {
    const dir = sqlDir();
    if (!existsSync(dir)) { res.json({ migrations: [] }); return; }

    const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
    const applied = await getAppliedMigrations();

    const migrations = files.map(filename => {
      const name = filename.replace(/\.sql$/, "");
      return {
        filename,
        name,
        applied: applied.has(name),
        appliedAt: applied.get(name) ?? null,
      };
    });

    res.json({ migrations });
  } catch (err: any) {
    logger.error({ err }, "migrations: list error");
    res.status(500).json({ error: "Gagal memuat daftar migrasi" });
  }
});

// ── GET /api/admin/migrations/audit ──────────────────────────────────────────
// Must be declared BEFORE /:name/run so Express doesn't treat "audit" as :name.
router.get("/audit", async (req, res) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);

  const client = await pool.connect();
  try {
    await ensureAuditTable(client);
    const result = await client.query<{
      id: string;
      migration: string;
      run_by_id: string;
      run_by_email: string;
      ip_address: string;
      ok_count: number;
      error_count: number;
      ran_at: string;
    }>(
      `SELECT id, migration, run_by_id, run_by_email, ip_address,
              ok_count, error_count, ran_at
       FROM _migration_audit
       ORDER BY ran_at DESC
       LIMIT $1`,
      [limit],
    );
    res.json({ entries: result.rows });
  } catch (err: any) {
    logger.error({ err }, "migrations: audit fetch error");
    res.status(500).json({ error: "Gagal memuat audit log" });
  } finally {
    client.release();
  }
});

// ── POST /api/admin/migrations/:name/run ─────────────────────────────────────
router.post("/:name/run", async (req, res) => {
  const payload = await requireSuperAdmin(req, res);
  if (!payload) return;

  const { name } = req.params;

  if (!/^[\w.-]+$/.test(name)) {
    res.status(400).json({ error: "Nama migrasi tidak valid" });
    return;
  }

  const filepath = resolve(sqlDir(), `${name}.sql`);
  if (!existsSync(filepath)) {
    res.status(404).json({ error: `File tidak ditemukan: ${name}.sql` });
    return;
  }

  const ip = clientIp(req);
  const client = await pool.connect();
  const messages: string[] = [];
  let ok = 0;
  let errors = 0;

  try {
    // Ensure audit table exists before we try to write to it
    await ensureAuditTable(client);

    const sql = readFileSync(filepath, "utf8");
    const stmts = splitStatements(sql);

    logger.info(
      { name, statements: stmts.length, user: payload.email, ip },
      "migrations: running",
    );

    for (const stmt of stmts) {
      try {
        const result = await client.query(stmt);
        ok++;
        if (result.rows?.length > 0 && result.command === "SELECT") {
          const preview = result.rows
            .slice(0, 20)
            .map((r: any) => Object.values(r).join(" | "))
            .join("\n");
          messages.push(`[SELECT ${result.rowCount} rows]\n${preview}`);
        }
      } catch (err: any) {
        errors++;
        const msg: string = err?.message ?? "";
        const isDuplicate =
          msg.includes("already exists") || msg.includes("duplicate key");
        messages.push(
          isDuplicate
            ? `[SKIP] ${stmt.slice(0, 80).trim()}… — ${msg}`
            : `[ERROR] ${stmt.slice(0, 120).trim()}… — ${msg}`,
        );
        if (!isDuplicate) {
          logger.warn(
            { err: msg, stmt: stmt.slice(0, 200) },
            `migrations: ${name} — statement error`,
          );
        }
      }
    }

    await markApplied(client, name);

    // Write audit entry — non-fatal if it fails
    try {
      await writeAuditEntry(client, {
        migration: name,
        userId: payload.sub,
        email: payload.email,
        ip,
        ok,
        errors,
      });
    } catch (auditErr: any) {
      logger.warn({ err: auditErr?.message }, "migrations: audit write failed (non-fatal)");
    }

    logger.info({ name, ok, errors, user: payload.email, ip }, "migrations: complete");
    res.json({ ok, errors, messages, applied: true });
  } catch (err: any) {
    logger.error({ err }, `migrations: ${name} — unexpected error`);
    res.status(500).json({ error: err?.message ?? "Error tidak diketahui", ok, errors, messages });
  } finally {
    client.release();
  }
});

export default router;
