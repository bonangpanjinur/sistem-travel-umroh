import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env["APP_JWT_SECRET"] || process.env["JWT_SECRET"] || "vinstour-default-secret-change-me";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  branch_id?: string | null;
  agent_id?: string | null;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserById(userId: string): Promise<any | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.id, u.email, u.raw_user_meta_data,
              p.full_name, p.avatar_url, p.phone, p.role as profile_role,
              p.totp_secret, p.totp_enabled, p.totp_verified_at
       FROM auth.users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );
    return rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email: string): Promise<any | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.id, u.email, u.encrypted_password, u.raw_user_meta_data
       FROM auth.users u
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email.toLowerCase().trim()]
    );
    return rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function getUserRoles(userId: string): Promise<{ role: string; branch_id: string | null }[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT role, branch_id FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Get branch_id for a specific user+role combo.
 * Used when building JWT claims.
 */
export async function getBranchIdForRole(userId: string, role: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT branch_id FROM user_roles WHERE user_id = $1 AND role = $2 LIMIT 1`,
      [userId, role]
    );
    return rows[0]?.branch_id ?? null;
  } finally {
    client.release();
  }
}

/**
 * Get agent record for a user_id.
 * Returns agent id and status.
 */
export async function getAgentByUserId(userId: string): Promise<{ id: string; status: string } | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, status FROM agents WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  metadata?: Record<string, any>
): Promise<{ id: string; email: string; created_at: string }> {
  const hash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ id: string; email: string; created_at: string }>(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, created_at`,
      [
        email.toLowerCase().trim(),
        hash,
        JSON.stringify({ full_name: fullName, phone: phone ?? null, ...metadata }),
      ]
    );
    const user = rows[0]!;

    await client.query(
      `INSERT INTO profiles (id, full_name, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, fullName, email.toLowerCase().trim(), phone ?? null]
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'customer')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function verifyRequestToken(authHeader: string | undefined): Promise<JWTPayload | null> {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Express middleware: require valid JWT.
 * Attaches decoded payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = verifyToken(extractBearerToken(req.headers["authorization"]) ?? "");
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = payload;
  next();
}

/**
 * Express middleware: require role is one of the allowed set.
 * Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Akses ditolak." });
      return;
    }
    next();
  };
}
