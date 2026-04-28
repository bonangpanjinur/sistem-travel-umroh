/**
 * E2E test that hits the live Supabase REST/RPC endpoints to verify
 * check_user_permission and get_user_effective_permissions behave
 * according to the priority spec:
 *   1. super_admin → always allow (and effective = ALL keys)
 *   2. user override (grant/revoke) → wins over role default
 *   3. role default → allow if any user role enables it
 *   4. otherwise → deny
 *
 * The test uses synthetic user_ids (random UUIDs) and seeds data via
 * service_role REST so it never relies on a real auth session. All
 * seeded rows are cleaned up at the end.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

function uuid() {
  return crypto.randomUUID();
}

/** Create a real auth user via admin API and return its id. Cleaned up later. */
async function createAuthUser(): Promise<string> {
  const email = `rbac-e2e-${crypto.randomUUID()}@example.test`;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: crypto.randomUUID(), email_confirm: true }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth create user ${r.status}: ${text}`);
  const u = JSON.parse(text);
  cleanupTags.push(async () => {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers,
    }).then((r) => r.text());
  });
  return u.id;
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} rpc ${fn}: ${text}`);
  return text ? JSON.parse(text) : (null as T);
}

/* -------- Setup: pick 2 existing permission keys we can safely use. -------- */
const permissionsList = await rest("permissions_list?select=key&limit=5") as Array<{ key: string }>;
if (permissionsList.length < 2) {
  throw new Error("Need at least 2 rows in permissions_list to run E2E");
}
const KEY_A = permissionsList[0].key; // role grants this
const KEY_B = permissionsList[1].key; // role does NOT grant this (we'll user-override it)

const cleanupTags: Array<() => Promise<void>> = [];

const TEST_ROLE = "sales"; // existing app_role
const userId = await createAuthUser();
const otherUserId = await createAuthUser();

// Ensure clean baseline: role allows KEY_A, role does NOT allow KEY_B.
// seedRolePerm patches+restores existing rows automatically.
await seedRolePerm(TEST_ROLE, KEY_A, true);
await seedRolePerm(TEST_ROLE, KEY_B, false);

async function seedRolePerm(role: string, key: string, enabled: boolean) {
  // Use upsert to avoid clashing with existing rows for that role/key.
  // If a row exists we'll temporarily flip it and restore afterwards.
  const existing = await rest(
    `role_permissions?select=id,is_enabled&role=eq.${role}&permission_key=eq.${encodeURIComponent(key)}`,
  ) as Array<{ id: string; is_enabled: boolean }>;

  if (existing.length) {
    const original = existing[0];
    await rest(`role_permissions?id=eq.${original.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_enabled: enabled }),
    });
    cleanupTags.push(async () => {
      await rest(`role_permissions?id=eq.${original.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: original.is_enabled }),
      });
    });
  } else {
    const inserted = await rest(`role_permissions`, {
      method: "POST",
      body: JSON.stringify({ role, permission_key: key, is_enabled: enabled }),
    }) as Array<{ id: string }>;
    const id = inserted[0].id;
    cleanupTags.push(async () => {
      await rest(`role_permissions?id=eq.${id}`, { method: "DELETE" });
    });
  }
}

async function seedUserRole(uid: string, role: string) {
  const inserted = await rest(`user_roles`, {
    method: "POST",
    body: JSON.stringify({ user_id: uid, role }),
  }) as Array<{ id: string }>;
  const id = inserted[0].id;
  cleanupTags.push(async () => {
    await rest(`user_roles?id=eq.${id}`, { method: "DELETE" });
  });
}

async function seedUserOverride(uid: string, key: string, enabled: boolean) {
  const inserted = await rest(`user_permissions`, {
    method: "POST",
    body: JSON.stringify({ user_id: uid, permission_key: key, is_enabled: enabled }),
  }) as Array<{ id: string }>;
  const id = inserted[0].id;
  cleanupTags.push(async () => {
    await rest(`user_permissions?id=eq.${id}`, { method: "DELETE" });
  });
}

/* -------- Tests -------- */

Deno.test("RBAC E2E: role default ALLOW grants access", async () => {
  await seedUserRole(userId, TEST_ROLE);

  const allowed = await rpc<boolean>("check_user_permission", {
    _user_id: userId,
    _permission_key: KEY_A,
  });
  assertEquals(allowed, true, `expected role default ALLOW for ${KEY_A}`);
});

Deno.test("RBAC E2E: no role grant + no override → DENY", async () => {
  const denied = await rpc<boolean>("check_user_permission", {
    _user_id: userId,
    _permission_key: KEY_B,
  });
  assertEquals(denied, false, `expected DENY for ungranted key ${KEY_B}`);
});

Deno.test("RBAC E2E: user override GRANT outranks missing role default", async () => {
  await seedUserOverride(userId, KEY_B, true);
  const allowed = await rpc<boolean>("check_user_permission", {
    _user_id: userId,
    _permission_key: KEY_B,
  });
  assertEquals(allowed, true, "user override grant must win over default deny");
});

Deno.test("RBAC E2E: user override REVOKE outranks role default ALLOW", async () => {
  await seedUserOverride(userId, KEY_A, false);
  const denied = await rpc<boolean>("check_user_permission", {
    _user_id: userId,
    _permission_key: KEY_A,
  });
  assertEquals(denied, false, "user override revoke must win over role allow");
});

Deno.test("RBAC E2E: get_user_effective_permissions reflects merged result", async () => {
  const rows = await rpc<Array<{ permission_key: string }>>(
    "get_user_effective_permissions",
    { _user_id: userId },
  );
  const keys = new Set(rows.map((r) => r.permission_key));
  // KEY_A revoked via override → must NOT appear
  assertEquals(keys.has(KEY_A), false, "revoked key should be excluded");
  // KEY_B granted via override → must appear
  assertEquals(keys.has(KEY_B), true, "granted override key should appear");
});

Deno.test("RBAC E2E: super_admin bypass returns ALL permission keys", async () => {
  const adminId = await createAuthUser();
  await seedUserRole(adminId, "super_admin");

  const single = await rpc<boolean>("check_user_permission", {
    _user_id: adminId,
    _permission_key: "any.random.key.that.does.not.exist",
  });
  assertEquals(single, true, "super_admin must be allowed for any key");

  const rows = await rpc<Array<{ permission_key: string }>>(
    "get_user_effective_permissions",
    { _user_id: adminId },
  );
  const totalRows = await rest("permissions_list?select=key") as Array<{ key: string }>;
  assertEquals(
    rows.length,
    totalRows.length,
    "super_admin effective permissions count must equal permissions_list count",
  );
});

Deno.test("RBAC E2E: another user's overrides do not leak", async () => {
  await seedUserOverride(otherUserId, KEY_A, true);
  // otherUserId has no user_role and only override on KEY_A
  const a = await rpc<boolean>("check_user_permission", {
    _user_id: otherUserId,
    _permission_key: KEY_A,
  });
  const b = await rpc<boolean>("check_user_permission", {
    _user_id: otherUserId,
    _permission_key: KEY_B,
  });
  assertEquals(a, true, "other user's own grant should apply to themselves");
  assertEquals(b, false, "other user must not inherit our override");
});

Deno.test("RBAC E2E: cleanup all seeded rows", async () => {
  // run cleanups in reverse order
  for (const fn of cleanupTags.reverse()) {
    try { await fn(); } catch (e) { console.error("cleanup failed:", e); }
  }
});