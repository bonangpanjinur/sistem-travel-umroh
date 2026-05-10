import { db } from "./db.js";
import { apiKeys } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// isSupabaseConfigured is kept for backward compatibility — always returns true
// now that we use the Replit Postgres database directly.
export function isSupabaseConfigured(): boolean {
  return true;
}

// supabaseFetch is kept only for any legacy callers that might still reference it.
// All new code should use Drizzle ORM via ./db.ts instead.
export async function supabaseFetch(_path: string, _options: RequestInit = {}): Promise<never> {
  throw new Error(
    "supabaseFetch is deprecated. Use Drizzle ORM via lib/db instead.",
  );
}

export async function validateApiKey(
  rawKey: string,
): Promise<{ valid: boolean; permissions: string[] }> {
  try {
    const rows = await db
      .select({ id: apiKeys.id, permissions: apiKeys.permissions })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, rawKey), eq(apiKeys.isActive, true)))
      .limit(1);

    if (rows.length === 0) return { valid: false, permissions: [] };

    // Update last_used_at asynchronously (fire-and-forget)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, rows[0].id))
      .catch(() => {});

    const permissions = Array.isArray(rows[0].permissions)
      ? (rows[0].permissions as string[])
      : [];
    return { valid: true, permissions };
  } catch {
    return { valid: false, permissions: [] };
  }
}
