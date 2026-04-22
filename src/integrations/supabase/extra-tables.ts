/**
 * Typed wrapper for tables that are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts`. Use `fromExtra(<table>)` instead of
 * `(supabase as any).from(<table>)` to keep proper TypeScript types at call
 * sites.
 *
 * Implementation:
 * - We construct a synthetic `Database`-shaped type whose `public.Tables`
 *   satisfies Supabase's `GenericTable` constraint
 *   (Row/Insert/Update extend `Record<string, unknown>`).
 * - We cast the existing supabase client to `SupabaseClient<ExtraDatabase>`
 *   so `.from(table)` returns a properly typed query builder.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
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

// Widen each shape so it satisfies Supabase's GenericTable constraint
// (`Record<string, unknown>` index signature) without losing the original
// property names that downstream code uses.
type AsRecord<T> = T & Record<string, unknown>;

type ExtraTablesShape = {
  [K in ExtraTableName]: {
    Row: AsRecord<ExtraTables[K]['Row']>;
    Insert: AsRecord<ExtraTables[K]['Insert']>;
    Update: AsRecord<ExtraTables[K]['Update']>;
    Relationships: [];
  };
};

type ExtraDatabase = {
  public: {
    Tables: ExtraTablesShape;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const extraClient = supabase as unknown as SupabaseClient<ExtraDatabase>;

export function fromExtra<T extends ExtraTableName>(table: T) {
  return extraClient.from(table);
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
