/**
 * Typed wrapper for tables that are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts`. Use `fromExtra(<table>)` instead of
 * `(supabase as any).from(<table>)` to keep proper TypeScript types at call
 * sites.
 *
 * Implementation:
 * - We construct a synthetic `Database`-shaped type (`ExtraDatabase`) whose
 *   `public.Tables` map matches our manually-defined Row/Insert/Update.
 * - We cast the supabase client to `SupabaseClient<ExtraDatabase>` so
 *   `.from(table)` returns a properly typed query builder for those tables.
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

// Build a synthetic Database that exposes our manually-typed tables.
type ExtraTablesShape = {
  [K in ExtraTableName]: {
    Row: ExtraTables[K]['Row'];
    Insert: ExtraTables[K]['Insert'];
    Update: ExtraTables[K]['Update'];
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

// Cast the existing client to a typed view that exposes the extra tables.
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
