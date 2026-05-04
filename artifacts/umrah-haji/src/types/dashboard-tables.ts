/**
 * dashboard-tables.ts
 *
 * Manual TypeScript interfaces for "extra" dashboard-related tables that are
 * NOT yet present in the auto-generated `src/integrations/supabase/types.ts`.
 *
 * These shapes mirror the SQL definitions in
 *   src/lib/migrations/dashboard-access-config.sql
 * and the columns referenced from the dashboard UIs.
 *
 * When the actual tables are created in Supabase and the generated types are
 * regenerated, this file can be reduced to re-exports from the generated
 * Database type (see `ExtraTables` below).
 */
import type { AppRole } from './database';

/* ------------------------------------------------------------------ */
/* Dashboard access configuration                                     */
/* ------------------------------------------------------------------ */

export interface DashboardAccessConfigRow {
  id: string;
  role: AppRole | string;
  enabled_modules: string[];
  disabled_modules: string[];
  default_dashboard: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface DashboardAccessConfigInsert {
  id?: string;
  role: AppRole | string;
  enabled_modules?: string[];
  disabled_modules?: string[];
  default_dashboard: string;
  is_active?: boolean;
  updated_by?: string | null;
  updated_at?: string;
}

export interface DashboardAccessConfigUpdate {
  enabled_modules?: string[];
  disabled_modules?: string[];
  default_dashboard?: string;
  is_active?: boolean;
  updated_by?: string | null;
  updated_at?: string;
}

export interface DashboardAccessAuditLogRow {
  id: string;
  role: string;
  action: string;
  module_key: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  metadata: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/* Aggregate dashboard tables                                         */
/* ------------------------------------------------------------------ */

export interface DashboardStatsRow {
  id: string;
  branch_id: string | null;
  total_revenue: number;
  total_bookings: number;
  total_pax: number;
  total_outstanding: number;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Finance domain                                                     */
/* ------------------------------------------------------------------ */

export interface FinancialSummaryRow {
  id: string;
  total_revenue: number;
  total_expenses: number;
  total_outstanding: number;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  transaction_date: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Marketing domain                                                   */
/* ------------------------------------------------------------------ */

export interface MarketingCampaignRow {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
}

export interface MarketingMetricsRow {
  id: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface MarketingConversionRow {
  campaign_id: string;
  campaign_name: string;
  conversions: number;
  revenue: number;
}

/* ------------------------------------------------------------------ */
/* Equipment domain (extra ad-hoc tables)                             */
/* ------------------------------------------------------------------ */

export interface EquipmentRow {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'in_use' | 'maintenance' | 'damaged';
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'damaged';
}

export interface EquipmentMaintenanceRow {
  id: string;
  equipment_name: string;
  maintenance_date: string;
  maintenance_type: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface EquipmentDamageRow {
  id: string;
  equipment_name: string;
  damage_date: string;
  description: string;
  status: 'reported' | 'in_progress' | 'completed';
  severity: 'low' | 'high' | 'critical';
}

/* ------------------------------------------------------------------ */
/* Sales domain                                                       */
/* ------------------------------------------------------------------ */

export interface SalesTargetRow {
  id: string;
  user_id: string;
  target_amount: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Map: table name -> Row / Insert / Update                           */
/* ------------------------------------------------------------------ */

export interface ExtraTables {
  dashboard_access_config: {
    Row: DashboardAccessConfigRow;
    Insert: DashboardAccessConfigInsert;
    Update: DashboardAccessConfigUpdate;
  };
  dashboard_access_audit_log: {
    Row: DashboardAccessAuditLogRow;
    Insert: Omit<DashboardAccessAuditLogRow, 'id' | 'changed_at'> & {
      id?: string;
      changed_at?: string;
    };
    Update: Partial<DashboardAccessAuditLogRow>;
  };
  dashboard_stats: {
    Row: DashboardStatsRow;
    Insert: Partial<DashboardStatsRow>;
    Update: Partial<DashboardStatsRow>;
  };
  financial_summary: {
    Row: FinancialSummaryRow;
    Insert: Partial<FinancialSummaryRow>;
    Update: Partial<FinancialSummaryRow>;
  };
  transactions: {
    Row: TransactionRow;
    Insert: Partial<TransactionRow>;
    Update: Partial<TransactionRow>;
  };
  expenses: {
    Row: ExpenseRow;
    Insert: Partial<ExpenseRow>;
    Update: Partial<ExpenseRow>;
  };
  marketing_campaigns: {
    Row: MarketingCampaignRow;
    Insert: Partial<MarketingCampaignRow>;
    Update: Partial<MarketingCampaignRow>;
  };
  marketing_metrics: {
    Row: MarketingMetricsRow;
    Insert: Partial<MarketingMetricsRow>;
    Update: Partial<MarketingMetricsRow>;
  };
  marketing_conversions: {
    Row: MarketingConversionRow;
    Insert: Partial<MarketingConversionRow>;
    Update: Partial<MarketingConversionRow>;
  };
  equipment: {
    Row: EquipmentRow;
    Insert: Partial<EquipmentRow>;
    Update: Partial<EquipmentRow>;
  };
  equipment_maintenance: {
    Row: EquipmentMaintenanceRow;
    Insert: Partial<EquipmentMaintenanceRow>;
    Update: Partial<EquipmentMaintenanceRow>;
  };
  equipment_damage: {
    Row: EquipmentDamageRow;
    Insert: Partial<EquipmentDamageRow>;
    Update: Partial<EquipmentDamageRow>;
  };
  sales_targets: {
    Row: SalesTargetRow;
    Insert: Partial<SalesTargetRow>;
    Update: Partial<SalesTargetRow>;
  };
}

export type ExtraTableName = keyof ExtraTables;
