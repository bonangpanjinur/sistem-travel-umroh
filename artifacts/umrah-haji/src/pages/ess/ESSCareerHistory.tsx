import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function formatCurrency(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

const CHANGE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  hire:          { label: "Bergabung",          color: "bg-green-100 text-green-800",   icon: "🟢" },
  promotion:     { label: "Promosi",             color: "bg-blue-100 text-blue-800",     icon: "⬆️" },
  demotion:      { label: "Demosi",              color: "bg-orange-100 text-orange-800", icon: "⬇️" },
  transfer:      { label: "Mutasi",              color: "bg-violet-100 text-violet-800", icon: "↔️" },
  salary_change: { label: "Perubahan Gaji",      color: "bg-amber-100 text-amber-800",   icon: "💰" },
  resign:        { label: "Mengundurkan Diri",   color: "bg-gray-100 text-gray-700",     icon: "🚪" },
  terminate:     { label: "PHK",                 color: "bg-red-100 text-red-800",       icon: "❌" },
};

export default function ESSCareerHistory() {
  const { user } = useAuth();
  const [empId, setEmpId] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("employees").select("id, full_name, position, department, hire_date, salary").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { setEmpId(data?.id); setEmployee(data); });
  }, [user]);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["ess-career-history", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("career_history")
        .select("*")
        .eq("employee_id", empId)
        .order("effective_date", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data as any[]) || [];
    },
  });

  return (
    <ESSLayout title="Riwayat Karir">
      <div className="max-w-2xl space-y-5">
        {/* Status saat ini */}
        {employee && (
          <Card className="bg-gradient-to-r from-violet-600 to-violet-700 border-0 text-white">
            <CardContent className="p-5">
              <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-2">Posisi Saat Ini</p>
              <p className="text-xl font-bold">{employee.position || "-"}</p>
              <p className="text-violet-200 text-sm mt-0.5">{employee.department || "Tanpa Departemen"}</p>
              <div className="mt-3 flex gap-4 text-sm">
                {employee.hire_date && (
                  <span className="text-violet-200">
                    Bergabung: {format(new Date(employee.hire_date), "dd MMMM yyyy", { locale: idLocale })}
                  </span>
                )}
                {employee.salary && (
                  <span className="text-violet-200">Gaji: {formatCurrency(employee.salary)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline Karir ({history.length} perubahan)</h3>

          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Belum ada riwayat karir</p>
                <p className="text-sm text-slate-400 mt-1">Riwayat akan muncul saat ada perubahan jabatan, mutasi, atau kenaikan gaji</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {history.map((item: any, idx: number) => {
                  const cfg = CHANGE_CONFIG[item.change_type] || { label: item.change_type, color: "bg-gray-100 text-gray-700", icon: "📌" };
                  return (
                    <div key={item.id} className="relative flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0 z-10 text-base">
                        {cfg.icon}
                      </div>
                      <Card className="flex-1">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                            <span className="text-xs text-slate-400">
                              {format(new Date(item.effective_date), "dd MMM yyyy", { locale: idLocale })}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-sm">
                            {(item.old_position || item.new_position) && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-xs font-medium w-14 shrink-0">Jabatan</span>
                                <span>{item.old_position || "-"}</span>
                                <span className="text-slate-300">→</span>
                                <span className="font-medium text-slate-800">{item.new_position || "-"}</span>
                              </div>
                            )}
                            {(item.old_department || item.new_department) && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-xs font-medium w-14 shrink-0">Dept.</span>
                                <span>{item.old_department || "-"}</span>
                                <span className="text-slate-300">→</span>
                                <span className="font-medium text-slate-800">{item.new_department || "-"}</span>
                              </div>
                            )}
                            {(item.old_salary || item.new_salary) && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-xs font-medium w-14 shrink-0">Gaji</span>
                                <span>{item.old_salary ? formatCurrency(item.old_salary) : "-"}</span>
                                <span className="text-slate-300">→</span>
                                <span className="font-medium text-emerald-700">{item.new_salary ? formatCurrency(item.new_salary) : "-"}</span>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-slate-500 italic text-xs mt-1">"{item.notes}"</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ESSLayout>
  );
}
