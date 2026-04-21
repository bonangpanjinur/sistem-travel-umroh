/**
 * Typed wrapper for tables that are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts`. Use `fromExtra(<table>)` instead of
 * `(supabase as any).from(<table>)` to keep proper TypeScript types at call
 * sites.
 */
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

// Map table name -> Row type
type RowOf<T extends ExtraTableName> = ExtraTables[T]['Row'];

// We bypass the generated Database types entirely with `any` for the runtime
// call, then re-attach the proper Row type via the return signature so call
// sites get full typing on `.select()` / `.insert()` / `.update()` data.
export function fromExtra<T extends ExtraTableName>(table: T) {
  return (supabase as any).from(table) as ReturnType<
    ReturnType<typeof makeTypedFrom<RowOf<T>, ExtraTables[T]['Insert'], ExtraTables[T]['Update']>>
  >;
}

// Helper to derive the proper PostgrestQueryBuilder shape for a given row.
// Using a thunk so we can extract its return type via ReturnType<>.
import type { SupabaseClient } from '@supabase/supabase-js';
function makeTypedFrom<Row, Insert, Update>() {
  type DB = {
    public: {
      Tables: {
        __t: { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
      };
      Views: Record<string, never>;
      Functions: Record<string, never>;
      Enums: Record<string, never>;
      CompositeTypes: Record<string, never>;
    };
  };
  return (client: SupabaseClient<DB>) => client.from('__t');
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
