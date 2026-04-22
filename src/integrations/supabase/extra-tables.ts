/**
 * Typed wrapper for tables that are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts`. Use `fromExtra(<table>)` instead of
 * `(supabase as any).from(<table>)` to keep proper TypeScript types at call
 * sites.
 *
 * Implementation notes:
 * - We use `PostgrestQueryBuilder` directly from `@supabase/postgrest-js` and
 *   inject our manually-defined Row/Insert/Update so TS keeps full intellisense
 *   on `.select()`, `.insert()`, `.update()`, `.upsert()`.
 * - The runtime call still goes through the regular supabase client; we only
 *   bypass the generated `Database` types via a single `as any` cast at the
 *   client level.
 */
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  ExtraTables,
  ExtraTableName,
  DashboardAccessConfigRow,
  DashboardAccessAuditLogRow,
  DashboardStatsRow,
  FinancialSummaryRow,
  TransactionRow,
  ExpenseRow,
  MarketingCampaignRow,
  MarketingMetricsRow,
  MarketingConversionRow,
  EquipmentRow,
  EquipmentMaintenanceRow,
  EquipmentDamageRow,
  SalesTargetRow,
} from '@/types/dashboard-tables';

type ExtraSchema<T extends ExtraTableName> = {
  Row: ExtraTables[T]['Row'];
  Insert: ExtraTables[T]['Insert'];
  Update: ExtraTables[T]['Update'];
  Relationships: [];
};

export function fromExtra<T extends ExtraTableName>(
  table: T,
): PostgrestQueryBuilder<any, ExtraSchema<T>, T> {
  // Cast through `any` to bypass the generated Database types, then re-attach
  // the proper schema via the return type so call sites get full typing.
  return (supabase as any).from(table) as PostgrestQueryBuilder<any, ExtraSchema<T>, T>;
}

export type {
  ExtraTables,
  ExtraTableName,
  DashboardAccessConfigRow,
  DashboardAccessAuditLogRow,
  DashboardStatsRow,
  FinancialSummaryRow,
  TransactionRow,
  ExpenseRow,
  MarketingCampaignRow,
  MarketingMetricsRow,
  MarketingConversionRow,
  EquipmentRow,
  EquipmentMaintenanceRow,
  EquipmentDamageRow,
  SalesTargetRow,
};
