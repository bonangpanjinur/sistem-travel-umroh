/**
 * GET  /api/admin/migrations        — list all SQL files + applied status
 * POST /api/admin/migrations/:name/run — run a specific migration (super_admin only)
 *
 * Protected: requires a valid Bearer token with role = super_admin.
 */

import { Router } from "express";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../lib/db.js";
import { verifyRequestToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const _dir =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

function sqlDir(): string {
  return resolve(_dir, "sql");
}

// ── Auth guard: super_admin only ──────────────────────────────────────────────
async function requireSuperAdmin(req: any, res: any): Promise<boolean> {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Autentikasi diperlukan" });
    return false;
  }
  if (payload.role !== "super_admin") {
    res.status(403).json({ error: "Hanya super_admin yang dapat menjalankan migrasi" });
    return false;
  }
  return true;
}

// ── SQL statement splitter (mirrors runMigrations.ts logic) ──────────────────
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

// ── Helpers: _schema_migrations tracker ──────────────────────────────────────
async function getAppliedMigrations(): Promise<Map<string, string>> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ name: string; applied_at: string }>(
      `SELECT name, applied_at FROM _schema_migrations ORDER BY applied_at`,
    );
    const map = new Map<string, string>();
    for (const row of result.rows) {
      map.set(row.name, row.applied_at);
    }
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

// ── GET /api/admin/migrations ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!(await requireSuperAdmin(req, res))) return;

  try {
    const dir = sqlDir();
    if (!existsSync(dir)) {
      res.json({ migrations: [] });
      return;
    }

    const files = readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    const applied = await getAppliedMigrations();

    const migrations = files.map(filename => {
      const name = filename.replace(/\.sql$/, "");
      const appliedAt = applied.get(name) ?? null;
      return {
        filename,
        name,
        applied: applied.has(name),
        appliedAt,
      };
    });

    res.json({ migrations });
  } catch (err: any) {
    logger.error({ err }, "migrations: list error");
    res.status(500).json({ error: "Gagal memuat daftar migrasi" });
  }
});

// ── POST /api/admin/migrations/:name/run ─────────────────────────────────────
router.post("/:name/run", async (req, res) => {
  if (!(await requireSuperAdmin(req, res))) return;

  const { name } = req.params;

  // Validate name — only allow safe filenames (no path traversal)
  if (!/^[\w.-]+$/.test(name)) {
    res.status(400).json({ error: "Nama migrasi tidak valid" });
    return;
  }

  const filepath = resolve(sqlDir(), `${name}.sql`);
  if (!existsSync(filepath)) {
    res.status(404).json({ error: `File tidak ditemukan: ${name}.sql` });
    return;
  }

  const client = await pool.connect();
  const messages: string[] = [];
  let ok = 0;
  let errors = 0;

  try {
    const sql = readFileSync(filepath, "utf8");
    const stmts = splitStatements(sql);

    logger.info({ name, statements: stmts.length }, "migrations: running");

    for (const stmt of stmts) {
      try {
        const result = await client.query(stmt);
        ok++;
        // Capture SELECT results as summary messages
        if (result.rows?.length > 0 && result.command === "SELECT") {
          const preview = result.rows
            .slice(0, 20)
            .map(r => Object.values(r).join(" | "))
            .join("\n");
          messages.push(`[SELECT ${result.rowCount} rows]\n${preview}`);
        }
      } catch (err: any) {
        errors++;
        const msg: string = err?.message ?? "";
        const isDuplicate = msg.includes("already exists") || msg.includes("duplicate key");
        const logMsg = isDuplicate
          ? `[SKIP] ${stmt.slice(0, 80).trim()}… — ${msg}`
          : `[ERROR] ${stmt.slice(0, 120).trim()}… — ${msg}`;
        messages.push(logMsg);
        if (!isDuplicate) {
          logger.warn({ err: msg, stmt: stmt.slice(0, 200) }, `migrations: ${name} — statement error`);
        }
      }
    }

    // Mark as applied (even with some errors — idempotent migrations are safe)
    await markApplied(client, name);

    logger.info({ name, ok, errors }, "migrations: complete");
    res.json({ ok, errors, messages, applied: true });
  } catch (err: any) {
    logger.error({ err }, `migrations: ${name} — unexpected error`);
    res.status(500).json({ error: err?.message ?? "Error tidak diketahui", ok, errors, messages });
  } finally {
    client.release();
  }
});

export default router;
