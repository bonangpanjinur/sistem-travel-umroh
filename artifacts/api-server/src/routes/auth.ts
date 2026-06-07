import { Router } from "express";
import { logger } from "../lib/logger.js";
import {
  getUserByEmail,
  getUserById,
  getUserRoles,
  createUser,
  verifyPassword,
  signToken,
  verifyRequestToken,
  hashPassword,
  getBranchIdForRole,
  getAgentByUserId,
} from "../lib/auth.js";
import { pool } from "../lib/db.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email dan password wajib diisi." });
    return;
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }

    const valid = await verifyPassword(password, user.encrypted_password);
    if (!valid) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }

    const roles = await getUserRoles(user.id);
    const primaryRole = roles[0]?.role ?? "customer";

    // Block suspended agents from logging in
    if (primaryRole === "agent" || primaryRole === "sub_agent") {
      const agentInfo = await getAgentByUserId(user.id);
      if (agentInfo?.status === "suspended") {
        res.status(403).json({
          error: "Akun agen Anda telah ditangguhkan. Hubungi admin untuk informasi lebih lanjut.",
        });
        return;
      }
    }

    // Inject branch_id into JWT for branch-scoped roles
    let branchId: string | null = roles[0]?.branch_id ?? null;
    if (!branchId && ["branch_manager", "operational", "sales", "finance", "marketing", "equipment"].includes(primaryRole)) {
      branchId = await getBranchIdForRole(user.id, primaryRole);
    }

    // Inject agent_id for agents
    let agentId: string | null = null;
    if (primaryRole === "agent" || primaryRole === "sub_agent") {
      const agentInfo = await getAgentByUserId(user.id);
      agentId = agentInfo?.id ?? null;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: primaryRole,
      branch_id: branchId,
      agent_id: agentId,
    });

    await pool.query(
      `UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const profile = await getUserById(user.id);

    res.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.raw_user_meta_data ?? {},
      },
      profile,
      roles,
    });
  } catch (err) {
    logger.error({ err }, "auth/login error");
    res.status(500).json({ error: "Terjadi kesalahan server." });
  }
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { email, password, options } = req.body as {
    email?: string;
    password?: string;
    options?: { data?: Record<string, any> };
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email dan password wajib diisi." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password minimal 6 karakter." });
    return;
  }

  const fullName = options?.data?.full_name ?? email.split("@")[0] ?? "User";
  const phone = options?.data?.phone ?? undefined;

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(422).json({ error: "User already registered" });
      return;
    }

    const user = await createUser(email, password, fullName, phone, options?.data ?? {});

    const roles = await getUserRoles(user.id);
    const primaryRole = roles[0]?.role ?? "customer";
    const token = signToken({ sub: user.id, email: user.email, role: primaryRole });

    res.status(201).json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: fullName, phone: phone ?? null, ...options?.data },
      },
    });
  } catch (err: any) {
    logger.error({ err }, "auth/signup error");
    if (err.code === "23505") {
      res.status(422).json({ error: "User already registered" });
      return;
    }
    res.status(500).json({ error: "Terjadi kesalahan server." });
  }
});

// GET /api/auth/user — return current user from JWT
router.get("/user", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const profile = await getUserById(payload.sub);
    if (!profile) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const roles = await getUserRoles(payload.sub);
    res.json({ user: profile, roles });
  } catch (err) {
    logger.error({ err }, "auth/user error");
    res.status(500).json({ error: "Terjadi kesalahan server." });
  }
});

// GET /api/auth/session — return session info from JWT
router.get("/session", async (req, res) => {
  const payload = await verifyRequestToken(req.headers["authorization"]);
  if (!payload) {
    res.json({ session: null });
    return;
  }
  try {
    const profile = await getUserById(payload.sub);
    const roles = await getUserRoles(payload.sub);
    res.json({
      session: {
        access_token: req.headers["authorization"]?.slice(7) ?? "",
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: profile?.raw_user_meta_data ?? {},
        },
      },
      profile,
      roles,
    });
  } catch (err) {
    logger.error({ err }, "auth/session error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/signout
router.post("/signout", async (_req, res) => {
  res.json({ success: true });
});

// POST /api/auth/reset-password-request
router.post("/reset-password-request", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email wajib diisi." });
    return;
  }
  res.json({ success: true, message: "Jika email terdaftar, instruksi reset password akan dikirim." });
});

// POST /api/auth/admin/users — create user (admin)
router.post("/admin/users", async (req, res) => {
  const {
    email, password, email_confirm, user_metadata,
  } = req.body as {
    email?: string;
    password?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email dan password wajib" });
    return;
  }

  const fullName = user_metadata?.full_name ?? email.split("@")[0] ?? "User";
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(422).json({ error: "User already registered" });
      return;
    }
    const user = await createUser(email, password, fullName, undefined, user_metadata ?? {});
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err: any) {
    logger.error({ err }, "admin/users create error");
    if (err.code === "23505") {
      res.status(422).json({ error: "User already registered" });
      return;
    }
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/auth/admin/users/:id — update user password
router.patch("/admin/users/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body as { password?: string };
  if (!id) {
    res.status(400).json({ error: "user id wajib" });
    return;
  }
  try {
    if (password) {
      const hash = await hashPassword(password);
      await pool.query(`UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`, [hash, id]);
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/users update error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
