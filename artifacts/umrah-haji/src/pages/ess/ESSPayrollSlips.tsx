import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown, ChevronUp, Banknote } from "lucide-react";

function formatCurrency(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

const MONTH_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const STATUS_BADGE: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  processed: "bg-blue-100 text-blue-800",
  draft:     "bg-gray-100 text-gray-700",
};
const STATUS_LABEL: Record<string, string> = { paid: "Dibayar", processed: "Diproses", draft: "Draft" };

function SlipCard({ slip }: { slip: any }) {
  const [open, setOpen] = useState(false);
  const allowances: Record<string, number> = slip.allowances || {};
  const deductions: Record<string, number> = slip.deductions || {};

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{MONTH_NAMES[slip.period_month]} {slip.period_year}</p>
            <p className="text-xs text-slate-400">Gaji Bersih: <span className="font-medium text-emerald-700">{formatCurrency(slip.net_salary)}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-xs ${STATUS_BADGE[slip.status] || "bg-gray-100 text-gray-700"}`}>
            {STATUS_LABEL[slip.status] || slip.status}
          </Badge>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-white">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Gaji Pokok</p>
              <p className="font-semibold text-sm">{formatCurrency(slip.basic_salary)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Gaji Kotor</p>
              <p className="font-semibold text-sm text-green-700">{formatCurrency(slip.gross_salary)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Gaji Bersih</p>
              <p className="font-bold text-sm text-emerald-700">{formatCurrency(slip.net_salary)}</p>
            </div>
          </div>

          {Object.keys(allowances).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tunjangan & Bonus</p>
              <div className="space-y-1">
                {Object.entries(allowances).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-green-600 font-medium">+ {formatCurrency(Number(v))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(deductions).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Potongan</p>
              <div className="space-y-1">
                {Object.entries(deductions).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-red-500 font-medium">- {formatCurrency(Number(v))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slip.notes && (
            <p className="text-xs text-slate-400 italic border-t pt-2">{slip.notes}</p>
          )}

          {slip.paid_at && (
            <p className="text-xs text-slate-400">Dibayar pada: {new Date(slip.paid_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ESSPayrollSlips() {
  const { user } = useAuth();
  const [empId, setEmpId] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("employees").select("id, full_name, salary, position").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { setEmpId(data?.id); setEmployee(data); });
  }, [user]);

  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["ess-payroll-slips", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_slips")
        .select("*")
        .eq("employee_id", empId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      return (data as any[]) || [];
    },
  });

  return (
    <ESSLayout title="Slip Gaji">
      <div className="max-w-2xl space-y-5">
        <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Gaji Pokok</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(employee?.salary || 0)}</p>
              <p className="text-emerald-200 text-xs mt-0.5">{employee?.position}</p>
            </div>
            <Banknote className="w-10 h-10 text-emerald-300 opacity-80" />
          </CardContent>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Riwayat Slip Gaji ({slips.length} data)</h3>
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Memuat slip gaji...</div>
          ) : slips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Belum ada slip gaji</p>
                <p className="text-sm text-slate-400 mt-1">Slip gaji akan muncul setelah HR memproses penggajian</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {slips.map((slip: any) => <SlipCard key={slip.id} slip={slip} />)}
            </div>
          )}
        </div>
      </div>
    </ESSLayout>
  );
}
