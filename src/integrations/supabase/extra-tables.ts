/**
 * Typed wrapper for tables that are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts`. Use `fromExtra(<table>)` instead of
 * `(supabase as any).from(<table>)` to keep proper TypeScript types at call
 * sites.
 *
 * When the real tables are added to the database and the generated types are
 * regenerated, callers can switch back to plain `supabase.from(<table>)`
 * without changing their query logic.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { ExtraTables, ExtraTableName } from '@/types/dashboard-tables';

// Build a synthetic Database shape that exposes ONLY the extra tables.
// We use a separate client typing so it does not collide with the generated
// `Database` typing on the real `supabase` client.
type ExtraDatabase = {
  public: {
    Tables: ExtraTables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Reuse the runtime client; only the type is reinterpreted.
const extraClient = supabase as unknown as SupabaseClient<ExtraDatabase>;

/** Strongly-typed `.from()` for tables not yet in generated types. */
export function fromExtra<T extends ExtraTableName>(table: T) {
  return extraClient.from(table);
}

export type { ExtraTables, ExtraTableName } from '@/types/dashboard-tables';
