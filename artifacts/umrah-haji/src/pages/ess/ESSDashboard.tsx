import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText, CalendarOff, TrendingUp, User, Clock, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function formatCurrency(n: number) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export default function ESSDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => setEmployee(data));
  }, [user]);

  const empId = employee?.id;

  const { data: recentLeaves = [] } = useQuery({
    queryKey: ["ess-leaves-recent", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("leave_requests")
        .select("*")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: recentSlips = [] } = useQuery({
    queryKey: ["ess-slips-recent", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_slips")
        .select("*")
        .eq("employee_id", empId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(3);
      return (data as any[]) || [];
    },
  });

  const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const leaveStatusIcon = (s: string) =>
    s === "approved" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
    s === "rejected" ? <XCircle className="w-4 h-4 text-red-500" /> :
    <Clock className="w-4 h-4 text-amber-500" />;

  const leaveStatusBadge = (s: string) => {
    const map: Record<string, string> = { approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", pending: "bg-yellow-100 text-yellow-800" };
    const labels: Record<string, string> = { approved: "Disetujui", rejected: "Ditolak", pending: "Menunggu" };
    return <Badge className={`text-xs ${map[s] || "bg-gray-100 text-gray-700"}`}>{labels[s] || s}</Badge>;
  };

  const masa_kerja = employee?.hire_date
    ? (() => {
        const d = differenceInDays(new Date(), new Date(employee.hire_date));
        const y = Math.floor(d / 365);
        const m = Math.floor((d % 365) / 30);
        return y > 0 ? `${y} thn ${m} bln` : `${m} bulan`;
      })()
    : "-";

  const cards = [
    { label: "Slip Gaji", desc: "Lihat riwayat payroll", icon: FileText, color: "text-emerald-600 bg-emerald-50", href: "/ess/payroll" },
    { label: "Cuti & Izin", desc: "Ajukan & cek status", icon: CalendarOff, color: "text-blue-600 bg-blue-50", href: "/ess/cuti" },
    { label: "Riwayat Karir", desc: "Jejak karir Anda", icon: TrendingUp, color: "text-violet-600 bg-violet-50", href: "/ess/karir" },
    { label: "Profil Saya", desc: "Data diri karyawan", icon: User, color: "text-orange-600 bg-orange-50", href: "/ess/profil" },
  ];

  return (
    <ESSLayout title="Beranda">
      <div className="space-y-6 max-w-4xl">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow">
          <p className="text-emerald-100 text-sm">Selamat datang,</p>
          <h2 className="text-xl font-bold mt-0.5">{employee?.full_name || "Karyawan"} 👋</h2>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-100">
              <User className="w-3.5 h-3.5" />
              {employee?.position || "-"} · {employee?.department || "-"}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-100">
              <Clock className="w-3.5 h-3.5" />
              Masa kerja: {masa_kerja}
            </span>
            {employee?.employee_code && (
              <span className="text-emerald-200 font-mono text-xs bg-emerald-800/40 px-2 py-0.5 rounded">
                {employee.employee_code}
              </span>
            )}
          </div>
        </div>

        {/* Quick menu */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(({ label, desc, icon: Icon, color, href }) => (
            <Link key={href} to={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent slip gaji */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Slip Gaji Terakhir
              </CardTitle>
              <Link to="/ess/payroll" className="text-xs text-emerald-600 hover:underline">Lihat semua</Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {recentSlips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada slip gaji</p>
              ) : recentSlips.map((slip: any) => (
                <div key={slip.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{MONTH_NAMES[slip.period_month]} {slip.period_year}</p>
                    <p className="text-xs text-slate-400">{slip.status === "paid" ? "Sudah dibayar" : slip.status === "processed" ? "Diproses" : "Draft"}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">{formatCurrency(slip.net_salary)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent leave requests */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-blue-600" /> Pengajuan Cuti
              </CardTitle>
              <Link to="/ess/cuti" className="text-xs text-emerald-600 hover:underline">Lihat semua</Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {recentLeaves.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada pengajuan</p>
              ) : recentLeaves.map((leave: any) => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {leaveStatusIcon(leave.status)}
                    <div>
                      <p className="text-sm font-medium capitalize">{leave.leave_type?.replace("_", " ")}</p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(leave.start_date), "dd MMM", { locale: idLocale })} —{" "}
                        {format(new Date(leave.end_date), "dd MMM yyyy", { locale: idLocale })}
                      </p>
                    </div>
                  </div>
                  {leaveStatusBadge(leave.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Gaji pokok */}
        {employee?.salary && (
          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Gaji Pokok Anda</p>
                  <p className="text-xs text-slate-400">Data dari sistem HR — bersifat rahasia</p>
                </div>
              </div>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(employee.salary)}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ESSLayout>
  );
}
