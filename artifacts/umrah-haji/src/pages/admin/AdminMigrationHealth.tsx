import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  Database, Zap, Shield, ChevronDown, ChevronUp, Table2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface HealthSection {
  expected: number;
  found: number;
  missing: string[];
}

interface HealthResult {
  tables: HealthSection;
  functions: HealthSection;
  rls: { required: number; active: number; inactive: string[] };
  enums: { app_role: boolean };
  overall: "ok" | "warning" | "error";
  checked_at: string;
}

// ── Expected lists (mirrors 999_postflight_verify.sql) ────────────────────────
const EXPECTED_TABLES = [
  "profiles","user_roles","staff_invitations","permissions_list","role_permissions",
  "user_2fa_settings","user_permission_overrides","rbac_audit_trail",
  "branches","departments","company_settings","company_features",
  "agents","agent_commission_tiers","agent_commissions","agent_wallets","agent_wallet_transactions",
  "referral_codes","referral_usages",
  "employees","employee_contracts","attendance_records","leave_requests","leave_quotas",
  "performance_reviews","warning_letters","training_sessions","training_participants",
  "payroll","payroll_components","payroll_slips",
  "customers","customer_accounts","customer_documents","customer_family_relations","customer_mahrams",
  "packages","package_labels","package_groups","package_hpp_templates","package_type_equipment",
  "departures","departure_waiting_list","departure_financial_summary","departure_cost_items",
  "departure_expenses","departure_other_revenues","departure_hotels","departure_multi_hotels",
  "departure_itineraries","departure_checklists","cancellation_policies",
  "bookings","booking_passengers","booking_line_items","booking_access_tokens",
  "booking_installment_schedules","booking_document_logs","booking_status_history",
  "booking_seat_locks","booking_transfers",
  "payments","virtual_accounts","bank_accounts","invoice_templates",
  "withdrawal_requests","payment_deadline_reminders","ar_reminder_log",
  "savings_plans","savings_deposits","savings_schedules",
  "coupons","loyalty_points","loyalty_transactions","loyalty_rewards","loyalty_point_expiry",
  "airlines","airports","hotels","hotel_room_capacities","vendors","muthawifs","membership_plans",
  "equipment_items","equipment_distributions","equipment_categories","equipment_variants",
  "equipment_photos","equipment_stock_history","equipment_stock_opname","equipment_opname_items",
  "equipment_notification_settings","baggage_reference_items",
  "visa_applications","room_assignments","manasik_sessions","ibadah_progress",
  "jamaah_badges","jamaah_ibadah_targets","jamaah_jurnal","jamaah_live_locations",
  "jamaah_qr_codes","luggage",
  "haji_registrations","haji_waiting_progress","siskohat_registrations","siskohat_sync_logs",
  "bus_providers","bus_assignments","bus_passengers","manifests",
  "chart_of_accounts","journal_entries","journal_lines","cashflow_entries","cash_transactions",
  "commissions","vendor_invoices","vendor_contracts","scheduled_reports",
  "office_assets","office_asset_maintenance",
  "leads","contact_messages","marketing_campaigns","marketing_materials",
  "marketing_material_downloads",
  "notifications","notification_templates","email_templates","email_logs",
  "whatsapp_config","wa_templates","wa_broadcast_campaigns","wa_broadcast_logs",
  "wa_send_logs","push_subscriptions","push_outbox","midtrans_webhook_logs","otp_codes",
  "website_settings","faqs","testimonials","banners","announcements","gallery_items",
  "menu_items","landing_pages","blog_posts","blog_categories","blog_tags","blog_post_tags",
  "media_gallery","hero_stats","about_page_content","contact_page_content",
  "sos_alerts","chatbot_conversations","chatbot_messages","approval_configs","approval_requests",
  "audit_logs","activity_logs","login_attempts","access_policies",
  "dashboard_access_config","dashboard_access_audit_log",
  "job_openings","job_applications","support_tickets","support_messages","trip_timeline",
];

const EXPECTED_FUNCTIONS = [
  "has_role","has_any_role","is_staff","is_admin_or_above","get_user_primary_role",
  "set_updated_at","handle_new_user","sync_booking_paid_amount",
  "sync_departure_available_seats","init_agent_wallet",
  "update_agent_wallet_on_commission","validate_journal_balance",
  "generate_booking_code","generate_payment_code","generate_savings_payment_code",
  "validate_registration_context","create_customer_account",
  "convert_savings_to_booking","recalculate_departure_financial_summary",
  "increment_package_view_count","list_users_with_emails",
  "bulk_distribute_equipment","confirm_equipment_receipt",
  "setup_superadmin","write_audit_log","log_booking_status_change",
  "fn_generate_ticket_number",
];

const RLS_REQUIRED = [
  "profiles","user_roles","staff_invitations","permissions_list","role_permissions",
  "user_2fa_settings","user_permission_overrides","rbac_audit_trail",
  "agents","agent_commissions","agent_wallets","agent_wallet_transactions",
  "employees","leave_requests","performance_reviews","warning_letters","payroll","payroll_slips",
  "customers","customer_accounts","customer_documents",
  "bookings","booking_passengers","booking_line_items","booking_access_tokens",
  "booking_installment_schedules","booking_document_logs","booking_status_history",
  "payments","virtual_accounts","withdrawal_requests",
  "savings_plans","savings_deposits",
  "leads","audit_logs","activity_logs",
  "notifications","whatsapp_config","wa_broadcast_campaigns",
  "journal_entries","journal_lines","chart_of_accounts","cashflow_entries","vendor_invoices",
  "equipment_items","equipment_distributions",
  "visa_applications","haji_registrations",
  "sos_alerts","support_tickets","support_messages",
  "company_settings","dashboard_access_config",
];

// ── Run health check via Supabase RPC / raw queries ───────────────────────────
async function runHealthCheck(): Promise<HealthResult> {
  // 1. Tables
  const { data: tableRows } = await supabase
    .from("information_schema.tables" as never)
    .select("table_name")
    .eq("table_schema", "public")
    .eq("table_type", "BASE TABLE");

  const existingTables = new Set<string>(
    (tableRows as { table_name: string }[] | null ?? []).map(r => r.table_name)
  );
  const missingTables = EXPECTED_TABLES.filter(t => !existingTables.has(t));

  // 2. Functions — use pg_proc via rpc (needs a helper) or fallback query
  const { data: fnRows } = await supabase.rpc("list_public_functions" as never).catch(() => ({ data: null }));
  let existingFns: Set<string>;
  if (fnRows && Array.isArray(fnRows)) {
    existingFns = new Set<string>((fnRows as { proname: string }[]).map((r: { proname: string }) => r.proname));
  } else {
    // fallback: try information_schema.routines
    const { data: routineRows } = await supabase
      .from("information_schema.routines" as never)
      .select("routine_name")
      .eq("routine_schema", "public");
    existingFns = new Set<string>(
      (routineRows as { routine_name: string }[] | null ?? []).map(r => r.routine_name)
    );
  }
  const missingFns = EXPECTED_FUNCTIONS.filter(f => !existingFns.has(f));

  // 3. RLS — query pg_class
  const { data: rlsRows } = await supabase
    .from("pg_class" as never)
    .select("relname, relrowsecurity")
    .in("relname", RLS_REQUIRED);

  const rlsMap = new Map<string, boolean>();
  (rlsRows as { relname: string; relrowsecurity: boolean }[] | null ?? []).forEach(r => {
    rlsMap.set(r.relname, r.relrowsecurity);
  });
  const rlsInactive = RLS_REQUIRED.filter(t => rlsMap.has(t) && !rlsMap.get(t));

  // 4. Enum
  const { data: enumRows } = await supabase
    .from("pg_type" as never)
    .select("typname")
    .eq("typname", "app_role")
    .limit(1);
  const hasAppRole = (enumRows as { typname: string }[] | null ?? []).length > 0;

  // Overall status
  const hasErrors = missingTables.length > 0 || missingFns.length > 0;
  const hasWarnings = rlsInactive.length > 0 || !hasAppRole;
  const overall: HealthResult["overall"] = hasErrors ? "error" : hasWarnings ? "warning" : "ok";

  return {
    tables: { expected: EXPECTED_TABLES.length, found: EXPECTED_TABLES.length - missingTables.length, missing: missingTables },
    functions: { expected: EXPECTED_FUNCTIONS.length, found: EXPECTED_FUNCTIONS.length - missingFns.length, missing: missingFns },
    rls: { required: RLS_REQUIRED.length, active: RLS_REQUIRED.length - rlsInactive.length, inactive: rlsInactive },
    enums: { app_role: hasAppRole },
    overall,
    checked_at: new Date().toISOString(),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: HealthResult["overall"] }) {
  if (status === "ok")      return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Semua OK</Badge>;
  if (status === "warning") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><AlertTriangle className="h-3 w-3" />Perlu Perhatian</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Ada Masalah</Badge>;
}

function SectionCard({
  icon: Icon, title, found, total, missing, color,
}: {
  icon: React.ElementType;
  title: string;
  found: number;
  total: number;
  missing: string[];
  color: "green" | "red" | "amber";
}) {
  const [open, setOpen] = useState(false);
  const pct = total > 0 ? Math.round((found / total) * 100) : 100;
  const colorMap = {
    green: { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    red:   { bar: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50",   border: "border-red-200"   },
    amber: { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  };
  const cls = colorMap[color];

  return (
    <Card className={missing.length > 0 ? `border ${cls.border}` : "border border-green-200"}>
      <CardHeader className="py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cls.bg}`}>
              <Icon className={`h-5 w-5 ${cls.text}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{found}</span>/{total} ditemukan
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${missing.length === 0 ? "text-green-600" : cls.text}`}>{pct}%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${missing.length === 0 ? "bg-green-500" : cls.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>

      {missing.length > 0 && (
        <CardContent className="px-5 pb-4 pt-0">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {missing.length} hilang — klik untuk lihat
          </button>
          {open && (
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {missing.map(name => (
                <code key={name} className={`text-xs px-2 py-0.5 rounded ${cls.bg} ${cls.text} font-mono`}>
                  {name}
                </code>
              ))}
            </div>
          )}
        </CardContent>
      )}

      {missing.length === 0 && (
        <CardContent className="px-5 pb-4 pt-0">
          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Lengkap
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminMigrationHealth() {
  const [result, setResult]     = useState<HealthResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runHealthCheck();
      setResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan saat memeriksa database";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kesehatan Migration Database</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verifikasi bahwa semua tabel, fungsi RBAC, dan kebijakan RLS sudah aktif setelah migration dijalankan.
          </p>
        </div>
        <Button onClick={check} disabled={loading} variant="outline" className="gap-2 shrink-0">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Memeriksa…</>
            : <><RefreshCw className="h-4 w-4" />Periksa Ulang</>
          }
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">Gagal terhubung ke database</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              Pastikan Supabase sudah dikonfigurasi dan migration sudah dijalankan.
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Overall status banner */}
          <div className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
            result.overall === "ok"      ? "border-green-200 bg-green-50" :
            result.overall === "warning" ? "border-amber-200 bg-amber-50" :
                                          "border-red-200 bg-red-50"
          }`}>
            <div className="flex items-center gap-3">
              {result.overall === "ok"
                ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                : result.overall === "warning"
                ? <AlertTriangle className="h-6 w-6 text-amber-600" />
                : <XCircle className="h-6 w-6 text-red-600" />
              }
              <div>
                <p className={`font-semibold text-sm ${
                  result.overall === "ok" ? "text-green-800" :
                  result.overall === "warning" ? "text-amber-800" : "text-red-800"
                }`}>
                  {result.overall === "ok"
                    ? "Migration lengkap — semua komponen terverifikasi"
                    : result.overall === "warning"
                    ? "Migration berjalan dengan peringatan"
                    : "Migration tidak lengkap — ada komponen yang hilang"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Diperiksa: {new Date(result.checked_at).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            <StatusBadge status={result.overall} />
          </div>

          {/* Metric cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard
              icon={Table2}
              title="Tabel Database"
              found={result.tables.found}
              total={result.tables.expected}
              missing={result.tables.missing}
              color={result.tables.missing.length === 0 ? "green" : "red"}
            />
            <SectionCard
              icon={Zap}
              title="Fungsi & RBAC"
              found={result.functions.found}
              total={result.functions.expected}
              missing={result.functions.missing}
              color={result.functions.missing.length === 0 ? "green" : "red"}
            />
            <SectionCard
              icon={Shield}
              title="Row Level Security"
              found={result.rls.active}
              total={result.rls.required}
              missing={result.rls.inactive}
              color={result.rls.inactive.length === 0 ? "green" : "amber"}
            />
          </div>

          {/* Enum & extras */}
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-sm">Komponen Tambahan</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  result.enums.app_role
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {result.enums.app_role
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <XCircle className="h-4 w-4" />
                  }
                  <span className="font-mono text-xs">public.app_role</span>
                  <span className="text-xs">{result.enums.app_role ? "✓ Ada" : "✗ Tidak ada"}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-muted px-3 py-2 text-sm text-muted-foreground">
                  <Database className="h-4 w-4" />
                  <span className="text-xs">
                    {result.tables.found} dari {result.tables.expected} tabel aktif
                  </span>
                </div>
              </div>

              {!result.enums.app_role && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  ⚠ Enum <code className="font-mono">public.app_role</code> tidak ditemukan.
                  Pastikan file <code className="font-mono">002_enums.sql</code> sudah dijalankan.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action guide if not OK */}
          {result.overall !== "ok" && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Langkah Selanjutnya
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-0 text-sm text-amber-800 space-y-2">
                {result.tables.missing.length > 0 && (
                  <p>• Jalankan file migration yang hilang di <strong>Pengaturan → Migrasi Database</strong></p>
                )}
                {result.functions.missing.length > 0 && (
                  <p>• Jalankan ulang <code className="font-mono text-xs bg-amber-100 px-1 rounded">005_roles.sql</code> dan <code className="font-mono text-xs bg-amber-100 px-1 rounded">025_functions.sql</code></p>
                )}
                {result.rls.inactive.length > 0 && (
                  <p>• Jalankan ulang <code className="font-mono text-xs bg-amber-100 px-1 rounded">027_rls.sql</code> untuk mengaktifkan RLS yang hilang</p>
                )}
                {!result.enums.app_role && (
                  <p>• Jalankan ulang <code className="font-mono text-xs bg-amber-100 px-1 rounded">002_enums.sql</code> untuk membuat enum <code className="font-mono text-xs bg-amber-100 px-1 rounded">app_role</code></p>
                )}
                <p className="text-xs text-amber-700 pt-1">
                  Setelah menjalankan migration, klik <strong>Periksa Ulang</strong> untuk memperbarui status.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
