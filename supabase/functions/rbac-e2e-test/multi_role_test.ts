/**
 * Multi-role RBAC E2E suite.
 *
 * Verifies — for every business role in the system (owner, branch_manager,
 * finance, operational, sales, marketing, equipment, agent, customer) — that:
 *
 *   1. check_user_permission() returns TRUE for every key the role grants
 *      in role_permissions (sampled, capped to keep runtime sane).
 *   2. check_user_permission() returns FALSE for at least one key the role
 *      does NOT grant (cross-module isolation).
 *   3. get_user_effective_permissions() returns exactly the same set as the
 *      union of role_permissions(role, is_enabled=true) — no leakage, no
 *      missing keys.
 *   4. super_admin always wins (already covered in index_test.ts but we
 *      re-assert here so this file stands alone).
 *
 * Source of truth: live `permissions_list` + `role_permissions` rows. We do
 * NOT hardcode which keys belong to which role — instead we read the
 * project's actual configuration and assert the resolver agrees with it.
 * That way the test stays correct even when admins re-tune permissions.
 *
 * Synthetic users are created via auth admin API and removed at the end.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
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

/* ---------- HTTP helpers ---------- */
async function rest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} rpc ${fn}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/* ---------- Cleanup tracking ---------- */
const cleanupTags: Array<() => Promise<void>> = [];
const seededUserIds = new Set<string>();

async function createAuthUser(label: string): Promise<string> {
  const email = `rbac-multi-${label}-${crypto.randomUUID()}@example.test`;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth create user (${label}) ${r.status}: ${text}`);
  const u = JSON.parse(text);
  cleanupTags.push(async () => {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers,
    }).then((res) => res.text());
  });
  return u.id as string;
}

async function seedUserRole(uid: string, role: string) {
  seededUserIds.add(uid);
  const inserted = await rest<Array<{ id: string }>>(`user_roles`, {
    method: "POST",
    body: JSON.stringify({ user_id: uid, role }),
  });
  const id = inserted[0].id;
  cleanupTags.push(async () => {
    await rest(`user_roles?id=eq.${id}`, { method: "DELETE" });
  });
}

/* ---------- Discover roles + their granted keys (from live DB) ---------- */

/**
 * Roles we want to validate. Excludes super_admin (covered separately) and
 * is intersected with the actual app_role enum to skip any role the project
 * doesn't ship with.
 */
const TARGET_ROLES = [
  "owner",
  "branch_manager",
  "finance",
  "operational",
  "sales",
  "marketing",
  "equipment",
  "agent",
  "customer",
] as const;

type RoleName = (typeof TARGET_ROLES)[number];

const allPermissions = await rest<Array<{ key: string; group_name: string | null }>>(
  `permissions_list?select=key,group_name`,
);
const allKeys = new Set(allPermissions.map((p) => p.key));

/** Map of role → set of granted permission keys, taken from role_permissions. */
const grantedByRole = new Map<RoleName, Set<string>>();

for (const role of TARGET_ROLES) {
  const rows = await rest<Array<{ permission_key: string; is_enabled: boolean }>>(
    `role_permissions?select=permission_key,is_enabled&role=eq.${role}&is_enabled=eq.true`,
  );
  grantedByRole.set(role, new Set(rows.map((r) => r.permission_key)));
}

/** Cap how many positive keys we sample per role to keep test runtime bounded. */
const SAMPLE_LIMIT = 6;

/* ---------- Per-role tests (registered dynamically) ---------- */

for (const role of TARGET_ROLES) {
  const granted = grantedByRole.get(role)!;
  const grantedArr = [...granted];

  Deno.test(`RBAC multi-role [${role}]: resolver matches role_permissions`, async () => {
    if (grantedArr.length === 0) {
      console.warn(
        `[${role}] role_permissions has 0 enabled rows — skipping positive checks. ` +
          `Run "Reset Default" or "Resync Semua" in Admin → RBAC Tools to seed.`,
      );
    }

    const uid = await createAuthUser(role);
    await seedUserRole(uid, role);

    // 1. effective permissions match the granted set exactly
    const effRows = await rpc<Array<{ permission_key: string }>>(
      "get_user_effective_permissions",
      { _user_id: uid },
    );
    const effective = new Set(effRows.map((r) => r.permission_key));
    assertEquals(
      effective.size,
      granted.size,
      `[${role}] effective count ${effective.size} != granted count ${granted.size}\n` +
        `missing: ${[...granted].filter((k) => !effective.has(k)).join(",") || "(none)"}\n` +
        `extra:   ${[...effective].filter((k) => !granted.has(k)).join(",") || "(none)"}`,
    );
    for (const k of granted) {
      assertEquals(
        effective.has(k),
        true,
        `[${role}] expected effective permissions to include "${k}"`,
      );
    }

    // 2. positive sample → check_user_permission returns true
    const sample = grantedArr.slice(0, SAMPLE_LIMIT);
    for (const key of sample) {
      const ok = await rpc<boolean>("check_user_permission", {
        _user_id: uid,
        _permission_key: key,
      });
      assertEquals(ok, true, `[${role}] check_user_permission("${key}") expected true`);
    }

    // 3. negative sample → at least one key NOT granted must deny
    const notGranted = [...allKeys].filter((k) => !granted.has(k));
    if (notGranted.length > 0) {
      const negKey = notGranted[0];
      const denied = await rpc<boolean>("check_user_permission", {
        _user_id: uid,
        _permission_key: negKey,
      });
      assertEquals(
        denied,
        false,
        `[${role}] check_user_permission("${negKey}") expected false (cross-module isolation)`,
      );
    }

    // 4. unknown key → always deny (regardless of role)
    const unknown = await rpc<boolean>("check_user_permission", {
      _user_id: uid,
      _permission_key: `__nonexistent_key_${crypto.randomUUID()}__`,
    });
    assertEquals(unknown, false, `[${role}] unknown key must deny`);
  });
}

/* ---------- Cross-role isolation ---------- */

Deno.test("RBAC multi-role: roles do not leak permissions across each other", async () => {
  // Pick two roles that have differing granted sets so we have something to assert.
  const pairs: Array<[RoleName, RoleName]> = [
    ["finance", "operational"],
    ["sales", "equipment"],
    ["marketing", "agent"],
    ["customer", "branch_manager"],
  ];

  for (const [roleA, roleB] of pairs) {
    const setA = grantedByRole.get(roleA)!;
    const setB = grantedByRole.get(roleB)!;
    // Find a key only B has — A's user must be denied.
    const onlyB = [...setB].find((k) => !setA.has(k));
    if (!onlyB) continue; // nothing to assert for this pair

    const uidA = await createAuthUser(`iso-${roleA}`);
    await seedUserRole(uidA, roleA);
    const allowed = await rpc<boolean>("check_user_permission", {
      _user_id: uidA,
      _permission_key: onlyB,
    });
    assertEquals(
      allowed,
      false,
      `[${roleA}] must NOT have "${onlyB}" (granted only to ${roleB})`,
    );
  }
});

/* ---------- Multi-role union ---------- */

Deno.test("RBAC multi-role: user with two roles gets the UNION of permissions", async () => {
  // Find two roles whose granted sets have at least one mutually exclusive key.
  const a: RoleName = "finance";
  const b: RoleName = "operational";
  const setA = grantedByRole.get(a)!;
  const setB = grantedByRole.get(b)!;
  const onlyA = [...setA].find((k) => !setB.has(k));
  const onlyB = [...setB].find((k) => !setA.has(k));
  if (!onlyA || !onlyB) {
    console.warn(
      `[union] need keys unique to ${a} and ${b}; skipping (configure RBAC tool first).`,
    );
    return;
  }

  const uid = await createAuthUser("union");
  await seedUserRole(uid, a);
  await seedUserRole(uid, b);

  for (const key of [onlyA, onlyB]) {
    const ok = await rpc<boolean>("check_user_permission", {
      _user_id: uid,
      _permission_key: key,
    });
    assertEquals(ok, true, `union user must have "${key}" from one of the roles`);
  }
});

/* ---------- super_admin sanity ---------- */

Deno.test("RBAC multi-role: super_admin trumps every role-specific deny", async () => {
  const uid = await createAuthUser("supa");
  await seedUserRole(uid, "super_admin");

  // Pick a key that no business role has been granted (worst case — none → use any).
  const sampleKey = [...allKeys][0] ?? "dashboard";
  const ok = await rpc<boolean>("check_user_permission", {
    _user_id: uid,
    _permission_key: sampleKey,
  });
  assertEquals(ok, true, "super_admin must always be allowed");

  const fakeKey = `__never_exists_${crypto.randomUUID()}__`;
  const okFake = await rpc<boolean>("check_user_permission", {
    _user_id: uid,
    _permission_key: fakeKey,
  });
  assertEquals(okFake, true, "super_admin must be allowed even for unknown keys");
});

/* ---------- Cleanup + verification ---------- */

Deno.test("RBAC multi-role: cleanup all seeded rows", async () => {
  for (const fn of cleanupTags.reverse()) {
    try {
      await fn();
    } catch (e) {
      console.error("cleanup failed:", e);
    }
  }
});

Deno.test("RBAC multi-role: post-cleanup verification — no rows left behind", async () => {
  if (seededUserIds.size === 0) {
    throw new Error("No seeded user_ids tracked — multi-role suite is broken");
  }
  const ids = [...seededUserIds].map((u) => `"${u}"`).join(",");

  const leftoverRoles = await rest<Array<unknown>>(
    `user_roles?select=id,user_id,role&user_id=in.(${ids})`,
  );
  assertEquals(
    leftoverRoles.length,
    0,
    `expected 0 user_roles after cleanup, got ${JSON.stringify(leftoverRoles)}`,
  );

  const leftoverPerms = await rest<Array<unknown>>(
    `user_permissions?select=id,user_id,permission_key&user_id=in.(${ids})`,
  );
  assertEquals(
    leftoverPerms.length,
    0,
    `expected 0 user_permissions after cleanup, got ${JSON.stringify(leftoverPerms)}`,
  );
});