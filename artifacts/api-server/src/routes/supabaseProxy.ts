/**
 * Supabase-compatible proxy routes.
 *
 * Mounted at the ROOT level (not under /api) so the Supabase JS client can
 * hit them using the same origin as the frontend (via Vite proxy).
 *
 * Auth routes  → /auth/v1/*
 * REST routes  → /rest/v1/:table
 *
 * The PostgREST subset implemented here covers the patterns used in this
 * codebase: select, eq/neq/gt/lt/gte/lte/is/in/like/ilike filters, order,
 * limit, offset, single, and insert/update/delete with Prefer: return=…
 */

import { Router } from "express";
import { pool } from "../lib/db.js";
import {
  getUserByEmail,
  getUserById,
  getUserRoles,
  createUser,
  verifyPassword,
  signToken,
  verifyRequestToken,
} from "../lib/auth.js";
import { logger } from "../lib/logger.js";

export const supabaseProxyRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

/** Safe identifier quoting (column / table names). */
const qi = (name: string) => `"${name.replace(/"/g, '')}"`;

type FilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "is" | "in" | "like" | "ilike" | "cs" | "cd";

interface Filter { col: string; op: FilterOp; raw: string }

const RESERVED_PARAMS = new Set([
  "select", "order", "limit", "offset", "on_conflict",
]);

/**
 * Tables that are scoped to a single branch when the caller is a branch_manager.
 * For these tables the proxy automatically injects a branch_id = JWT.branch_id filter.
 */
const BRANCH_SCOPED_TABLES = new Set([
  "bookings",
  "agents",
  "discount_requests",
  "branch_commissions",
]);

function parseFilters(query: Record<string, string>): Filter[] {
  const out: Filter[] = [];
  for (const [col, expr] of Object.entries(query)) {
    if (RESERVED_PARAMS.has(col)) continue;
    const dot = expr.indexOf(".");
    if (dot === -1) continue;
    const op = expr.slice(0, dot) as FilterOp;
    const raw = expr.slice(dot + 1);
    out.push({ col, op, raw });
  }
  return out;
}

function buildWhere(filters: Filter[], params: unknown[]): string {
  if (!filters.length) return "";
  const parts = filters.map(({ col, op, raw }) => {
    const pi = () => { params.push(raw); return `$${params.length}`; };
    switch (op) {
      case "eq":  return raw === "null" ? `${qi(col)} IS NULL`     : `${qi(col)} = ${pi()}`;
      case "neq": return raw === "null" ? `${qi(col)} IS NOT NULL` : `${qi(col)} != ${pi()}`;
      case "gt":  params.push(raw); return `${qi(col)} > $${params.length}`;
      case "gte": params.push(raw); return `${qi(col)} >= $${params.length}`;
      case "lt":  params.push(raw); return `${qi(col)} < $${params.length}`;
      case "lte": params.push(raw); return `${qi(col)} <= $${params.length}`;
      case "is":  return raw === "null" ? `${qi(col)} IS NULL` : `${qi(col)} IS NOT NULL`;
      case "like":  params.push(raw); return `${qi(col)} LIKE $${params.length}`;
      case "ilike": params.push(raw); return `${qi(col)} ILIKE $${params.length}`;
      case "in": {
        const items = raw.replace(/^\(|\)$/g, "").split(",").map((v) => v.trim());
        const phs = items.map((v) => { params.push(v); return `$${params.length}`; });
        return `${qi(col)} IN (${phs.join(", ")})`;
      }
      default:
        params.push(raw);
        return `${qi(col)} = $${params.length}`;
    }
  });
  return "WHERE " + parts.join(" AND ");
}

function buildOrder(orderStr?: string): string {
  if (!orderStr) return "";
  const clauses = orderStr.split(",").map((part) => {
    const segs = part.trim().split(".");
    const col = segs[0];
    const dir = segs[1]?.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const nulls =
      segs[2] === "nullslast" ? "NULLS LAST" :
      segs[2] === "nullsfirst" ? "NULLS FIRST" : "";
    return `${qi(col)} ${dir} ${nulls}`.trim();
  });
  return "ORDER BY " + clauses.join(", ");
}

/** Very basic select parser: strips joins / computed columns to plain col names. */
function parseSelect(selectStr?: string): string {
  if (!selectStr || selectStr === "*") return "*";
  // If there are join expansions like "*, profiles(*)" just return *
  if (selectStr.includes("(")) return "*";
  const cols = selectStr.split(",").map((c) => {
    const name = c.trim().split(":")[0].trim(); // strip aliases
    return name === "*" ? "*" : qi(name);
  });
  return cols.join(", ");
}

// ── Auth compatibility (/auth/v1/*) ──────────────────────────────────────────

/**
 * POST /auth/v1/token?grant_type=password
 * Supabase JS calls this for signInWithPassword.
 */
supabaseProxyRouter.post("/auth/v1/token", async (req, res) => {
  const { grant_type } = req.query as Record<string, string>;

  if (grant_type === "refresh_token") {
    // Validate the refresh token (we reuse access token as refresh token)
    const refreshToken = req.body?.refresh_token as string | undefined;
    if (!refreshToken) {
      res.status(400).json({ error: "invalid_grant", message: "Refresh token missing" });
      return;
    }
    const payload = await verifyRequestToken(`Bearer ${refreshToken}`);
    if (!payload) {
      res.status(400).json({ error: "invalid_grant", message: "Invalid refresh token" });
      return;
    }
    const newToken = signToken({ sub: payload.sub, email: payload.email, role: payload.role });
    const user = await getUserById(payload.sub);
    res.json({
      access_token: newToken,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: newToken,
      user: {
        id: payload.sub,
        email: payload.email,
        user_metadata: user?.raw_user_meta_data ?? {},
        app_metadata: { role: payload.role },
        aud: "authenticated",
        role: "authenticated",
      },
    });
    return;
  }

  if (grant_type !== "password") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "invalid_grant", message: "Email dan password wajib diisi." });
    return;
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(400).json({ error: "invalid_grant", message: "Email atau password salah." });
      return;
    }
    const valid = await verifyPassword(password, user.encrypted_password);
    if (!valid) {
      res.status(400).json({ error: "invalid_grant", message: "Email atau password salah." });
      return;
    }

    const roles = await getUserRoles(user.id);
    const primaryRole = roles[0]?.role ?? "customer";
    const token = signToken({ sub: user.id, email: user.email, role: primaryRole });

    await pool.query(
      `UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = $1`,
      [user.id],
    );

    res.json({
      access_token: token,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: token,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.raw_user_meta_data ?? {},
        app_metadata: { provider: "email", role: primaryRole },
        aud: "authenticated",
        role: "authenticated",
        created_at: user.created_at,
        last_sign_in_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, "supabase-proxy: auth/token error");
    res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

/**
 * POST /auth/v1/signup
 * Supabase JS calls this for signUp.
 */
supabaseProxyRouter.post("/auth/v1/signup", async (req, res) => {
  const { email, password, data: userData } = req.body as {
    email?: string;
    password?: string;
    data?: Record<string, any>;
  };

  if (!email || !password) {
    res.status(400).json({ error: "validation_failed", message: "Email dan password wajib diisi." });
    return;
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(422).json({ error: "user_already_exists", message: "User already registered" });
      return;
    }

    const fullName = userData?.full_name ?? email.split("@")[0] ?? "User";
    const phone = userData?.phone;
    const user = await createUser(email, password, fullName, phone, userData ?? {});
    const roles = await getUserRoles(user.id);
    const primaryRole = roles[0]?.role ?? "customer";
    const token = signToken({ sub: user.id, email: user.email, role: primaryRole });

    res.status(200).json({
      access_token: token,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: token,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: userData ?? {},
        app_metadata: { provider: "email", role: primaryRole },
        aud: "authenticated",
        role: "authenticated",
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "supabase-proxy: auth/signup error");
    if (err.code === "23505") {
      res.status(422).json({ error: "user_already_exists", message: "User already registered" });
      return;
    }
    res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

/**
 * POST /auth/v1/logout
 * Supabase JS calls this for signOut.
 */
supabaseProxyRouter.post("/auth/v1/logout", (_req, res) => {
  res.status(204).send();
});

/**
 * GET /auth/v1/user
 * Returns the currently authenticated user.
 */
supabaseProxyRouter.get("/auth/v1/user", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }
  try {
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      user_metadata: user.raw_user_meta_data ?? {},
      app_metadata: { role: payload.role },
      aud: "authenticated",
      role: "authenticated",
      created_at: user.created_at,
    });
  } catch (err) {
    logger.error({ err }, "supabase-proxy: auth/user error");
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /auth/v1/user
 * Update user metadata (used for profile updates).
 */
supabaseProxyRouter.put("/auth/v1/user", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) { res.status(401).json({ message: "Unauthorized" }); return; }
  const { data } = req.body as { data?: Record<string, any> };
  try {
    if (data) {
      await pool.query(
        `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(data), payload.sub],
      );
    }
    const user = await getUserById(payload.sub);
    res.json({ id: user?.id, email: user?.email, user_metadata: user?.raw_user_meta_data ?? {} });
  } catch (err) {
    logger.error({ err }, "supabase-proxy: auth/user PUT error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── REST / PostgREST compatibility (/rest/v1/:table) ─────────────────────────

/**
 * Auth guard: returns the user payload or null.
 * Allows anonymous access (returns null) — callers decide how to handle it.
 */
async function getCallerPayload(authHeader?: string) {
  if (!authHeader) return null;
  return verifyRequestToken(authHeader);
}

/** GET /rest/v1/:table — SELECT */
supabaseProxyRouter.get("/rest/v1/:table", async (req, res) => {
  const { table } = req.params;
  const q = req.query as Record<string, string>;
  const prefer = (req.headers["prefer"] as string) ?? "";

  // Block dangerous system tables
  if (table.includes("pg_") || table.includes("information_schema")) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  const params: unknown[] = [];
  const selectCols = parseSelect(q.select);
  const filters = parseFilters(q);

  // Branch data scoping: branch_manager can only see their own branch's data
  const caller = await getCallerPayload(req.headers["authorization"]);
  if (caller?.role === "branch_manager" && caller?.branch_id && BRANCH_SCOPED_TABLES.has(table)) {
    // Inject branch_id filter — overrides any existing branch_id sent by the client
    const idx = filters.findIndex((f) => f.col === "branch_id");
    if (idx >= 0) filters.splice(idx, 1);
    filters.push({ col: "branch_id", op: "eq", raw: caller.branch_id as string });
  }

  const where = buildWhere(filters, params);
  const order = buildOrder(q.order);
  const limitVal = q.limit ? Math.min(parseInt(q.limit, 10), 1000) : 1000;
  const offsetVal = q.offset ? parseInt(q.offset, 10) : 0;

  try {
    const countExact = prefer.includes("count=exact");

    let sql = `SELECT ${selectCols} FROM ${qi(table)} ${where} ${order} LIMIT ${limitVal} OFFSET ${offsetVal}`;

    const result = await pool.query(sql, params);

    if (countExact) {
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS n FROM ${qi(table)} ${where}`,
        params,
      );
      const total = countRes.rows[0]?.n ?? 0;
      res.setHeader("Content-Range", `0-${result.rowCount ?? 0}/${total}`);
    }

    // Supabase returns array; single/maybeSingle is handled client-side
    res.json(result.rows);
  } catch (err: any) {
    // Return empty array for missing tables — the client handles gracefully
    if (err.message?.includes("does not exist") || err.code === "42P01") {
      logger.debug({ table }, "supabase-proxy: table not found, returning []");
      res.json([]);
      return;
    }
    logger.warn({ err: err.message, table, q }, "supabase-proxy: GET error");
    res.status(400).json({ message: err.message, details: err.detail ?? "" });
  }
});

/** POST /rest/v1/:table — INSERT */
supabaseProxyRouter.post("/rest/v1/:table", async (req, res) => {
  const { table } = req.params;
  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const body = req.body;
  const rows = Array.isArray(body) ? body : [body];

  if (!rows.length || !rows[0]) {
    res.json(returning ? [] : {});
    return;
  }

  const cols = Object.keys(rows[0]);
  if (!cols.length) { res.json({}); return; }

  // Handle upsert via on_conflict
  const onConflict = (req.query.on_conflict as string) ?? "";

  try {
    const inserted: unknown[] = [];

    for (const row of rows) {
      const vals = cols.map((c) => row[c]);
      const colsSql = cols.map(qi).join(", ");
      const phsSql = cols.map((_, i) => `$${i + 1}`).join(", ");
      let sql = `INSERT INTO ${qi(table)} (${colsSql}) VALUES (${phsSql})`;

      if (onConflict) {
        const conflictCols = onConflict.split(",").map((c) => qi(c.trim())).join(", ");
        const updateCols = cols.filter((c) => !onConflict.includes(c));
        if (updateCols.length) {
          const updateSql = updateCols.map((c) => `${qi(c)} = EXCLUDED.${qi(c)}`).join(", ");
          sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateSql}`;
        } else {
          sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
        }
      }

      if (returning) sql += " RETURNING *";

      const result = await pool.query(sql, vals);
      if (returning && result.rows[0]) inserted.push(result.rows[0]);
    }

    if (returning) {
      res.status(201).json(Array.isArray(body) ? inserted : (inserted[0] ?? {}));
    } else {
      res.status(201).json({});
    }
  } catch (err: any) {
    logger.warn({ err: err.message, table }, "supabase-proxy: POST error");
    res.status(400).json({ message: err.message, details: err.detail ?? "" });
  }
});

/** PATCH /rest/v1/:table — UPDATE */
supabaseProxyRouter.patch("/rest/v1/:table", async (req, res) => {
  const { table } = req.params;
  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const body = req.body as Record<string, unknown>;
  const cols = Object.keys(body ?? {});

  if (!cols.length) {
    res.json(returning ? [] : {});
    return;
  }

  const params: unknown[] = cols.map((c) => body[c]);
  const setSql = cols.map((c, i) => `${qi(c)} = $${i + 1}`).join(", ");
  const filters = parseFilters(req.query as Record<string, string>);
  const where = buildWhere(filters, params);

  let sql = `UPDATE ${qi(table)} SET ${setSql} ${where}`;
  if (returning) sql += " RETURNING *";

  try {
    const result = await pool.query(sql, params);
    if (returning) {
      res.json(result.rows);
    } else {
      res.status(204).send();
    }
  } catch (err: any) {
    logger.warn({ err: err.message, table }, "supabase-proxy: PATCH error");
    res.status(400).json({ message: err.message, details: err.detail ?? "" });
  }
});

/** DELETE /rest/v1/:table — DELETE */
supabaseProxyRouter.delete("/rest/v1/:table", async (req, res) => {
  const { table } = req.params;
  const prefer = (req.headers["prefer"] as string) ?? "";
  const returning = prefer.includes("return=representation");

  const params: unknown[] = [];
  const filters = parseFilters(req.query as Record<string, string>);

  if (!filters.length) {
    // Safety guard: refuse full-table deletes
    res.status(400).json({ message: "DELETE without filters is not allowed" });
    return;
  }

  const where = buildWhere(filters, params);
  let sql = `DELETE FROM ${qi(table)} ${where}`;
  if (returning) sql += " RETURNING *";

  try {
    const result = await pool.query(sql, params);
    if (returning) {
      res.json(result.rows);
    } else {
      res.status(204).send();
    }
  } catch (err: any) {
    logger.warn({ err: err.message, table }, "supabase-proxy: DELETE error");
    res.status(400).json({ message: err.message, details: err.detail ?? "" });
  }
});

// OPTIONS / CORS preflight is handled globally by the cors() middleware in app.ts.
// No per-route OPTIONS handler needed here.
