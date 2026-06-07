import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingDown, DollarSign, CalendarOff, GraduationCap,
  AlertTriangle, FileWarning, UserCheck, Briefcase, Clock, BarChart3,
  TrendingUp, Building2, UserX,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const DEPT_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

export default function AdminHRAnalytics() {
  const now = new Date();

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["hr-analytics-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, department, position, branch_id, salary, joined_at, employment_status, is_active, created_at")
        .order("joined_at", { ascending: false });
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: leavesData = [] } = useQuery({
    queryKey: ["hr-analytics-leaves"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("id, employee_id, leave_type, status, start_date, end_date, created_at")
        .gte("created_at", format(subMonths(now, 6), "yyyy-MM-dd"));
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ["hr-analytics-payroll"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_runs")
        .select("id, month_key, total_gross, total_net, employee_count, status, created_at")
        .order("month_key", { ascending: false })
        .limit(12);
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["hr-analytics-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_contracts")
        .select("id, employee_id, contract_type, start_date, end_date, status, reminder_sent")
        .eq("status", "active");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: disciplinary = [] } = useQuery({
    queryKey: ["hr-analytics-disciplinary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("disciplinary_records")
        .select("id, employee_id, type, violation_date, created_at")
        .gte("created_at", format(subMonths(now, 12), "yyyy-MM-dd"));
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: empProgress = [] } = useQuery({
    queryKey: ["hr-analytics-training"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_training_progress")
        .select("id, employee_id, status, completed_at");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const analytics = useMemo(() => {
    const active = (employees as any[]).filter(e => e.is_active !== false);
    const inactive = (employees as any[]).filter(e => e.is_active === false);

    const deptCount: Record<string, number> = {};
    active.forEach((e: any) => {
      const dept = e.department || "Tidak Ada";
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    const deptData = Object.entries(deptCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalSalary = active.reduce((s: number, e: any) => s + (e.salary || 0), 0);
    const avgSalary = active.length ? totalSalary / active.length : 0;

    const joinedByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      joinedByMonth[format(m, "MMM yyyy", { locale: idLocale })] = 0;
    }
    (employees as any[]).forEach((e: any) => {
      if (!e.joined_at) return;
      const key = format(parseISO(e.joined_at), "MMM yyyy", { locale: idLocale });
      if (key in joinedByMonth) joinedByMonth[key]++;
    });
    const headcountTrend = Object.entries(joinedByMonth).map(([month, joined]) => ({ month, joined }));

    const contractExpiringSoon = (contracts as any[]).filter((c: any) => {
      if (!c.end_date) return false;
      const days = differenceInDays(parseISO(c.end_date), now);
      return days >= 0 && days <= 30;
    });
    const contractExpired = (contracts as any[]).filter((c: any) => {
      if (!c.end_date) return false;
      return differenceInDays(parseISO(c.end_date), now) < 0;
    });

    const leaveApproved = (leavesData as any[]).filter((l: any) => l.status === "approved");
    const leavePending = (leavesData as any[]).filter((l: any) => l.status === "pending");

    const payrollMonthly = [...(payrollRuns as any[])]
      .reverse()
      .slice(-6)
      .map((r: any) => ({
        month: r.month_key,
        gross: r.total_gross || 0,
        net: r.total_net || 0,
        count: r.employee_count || 0,
      }));

    const trainingCompleted = (empProgress as any[]).filter((p: any) => p.status === "completed").length;
    const trainingTotal = (empProgress as any[]).length;

    const spCount: Record<string, number> = { sp1: 0, sp2: 0, sp3: 0 };
    (disciplinary as any[]).forEach((d: any) => {
      if (d.type in spCount) spCount[d.type]++;
    });

    return {
      totalActive: active.length,
      totalInactive: inactive.length,
      totalSalary,
      avgSalary,
      deptData,
      headcountTrend,
      contractExpiringSoon,
      contractExpired,
      leaveApproved: leaveApproved.length,
      leavePending: leavePending.length,
      payrollMonthly,
      trainingCompleted,
      trainingTotal,
      trainingRate: trainingTotal ? Math.round(trainingCompleted / trainingTotal * 100) : 0,
      spCount,
      totalSP: Object.values(spCount).reduce((a, b) => a + b, 0),
    };
  }, [employees, leavesData, payrollRuns, contracts, disciplinary, empProgress]);

  if (loadingEmp) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-500/10 rounded-xl">
          <BarChart3 className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard Analitik SDM</h1>
          <p className="text-muted-foreground text-sm">Ringkasan metrik sumber daya manusia — headcount, payroll, turnover, kontrak</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Karyawan Aktif", value: analytics.totalActive, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Total Beban Gaji/Bln", value: formatCurrency(analytics.totalSalary), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Rata-rata Gaji", value: formatCurrency(analytics.avgSalary), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "SP Bulan Ini", value: analytics.totalSP, icon: FileWarning, color: analytics.totalSP > 0 ? "text-red-600" : "text-muted-foreground", bg: analytics.totalSP > 0 ? "bg-red-50 dark:bg-red-950/30" : "" },
          { label: "Cuti Disetujui (6 Bln)", value: analytics.leaveApproved, icon: CalendarOff, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
          { label: "Cuti Menunggu", value: analytics.leavePending, icon: Clock, color: analytics.leavePending > 0 ? "text-orange-600" : "text-muted-foreground", bg: analytics.leavePending > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "" },
          { label: "Progress Training", value: `${analytics.trainingRate}%`, icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Kontrak Segera Habis", value: analytics.contractExpiringSoon.length, icon: AlertTriangle, color: analytics.contractExpiringSoon.length > 0 ? "text-red-600" : "text-muted-foreground", bg: analytics.contractExpiringSoon.length > 0 ? "bg-red-50 dark:bg-red-950/30" : "" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`border-none shadow-sm ${bg}`}>
            <CardContent className="pt-4 pb-3 flex items-start gap-3">
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {(analytics.contractExpiringSoon.length > 0 || analytics.contractExpired.length > 0 || analytics.leavePending > 0) && (
        <div className="space-y-2">
          {analytics.contractExpiringSoon.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {analytics.contractExpiringSoon.length} kontrak karyawan akan berakhir dalam 30 hari — perlu diperbarui
              </span>
            </div>
          )}
          {analytics.contractExpired.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-medium text-red-800 dark:text-red-200">
                {analytics.contractExpired.length} kontrak sudah berakhir dan belum diperbarui
              </span>
            </div>
          )}
          {analytics.leavePending > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              <CalendarOff className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                {analytics.leavePending} pengajuan cuti menunggu persetujuan
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount per Departemen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Headcount per Departemen
            </CardTitle>
            <CardDescription>Distribusi karyawan aktif per departemen</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.deptData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data departemen
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.deptData} margin={{ top: 5, right: 5, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip
                    formatter={(v: any) => [`${v} karyawan`, "Jumlah"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.deptData.map((_: any, i: number) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Beban Payroll 6 Bulan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Beban Payroll 6 Bulan Terakhir
            </CardTitle>
            <CardDescription>Total bruto vs. net per periode penggajian</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.payrollMonthly.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data penggajian
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.payrollMonthly} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}jt`}
                    width={42}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === "gross" ? "Bruto" : "Net",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend formatter={(v: string) => v === "gross" ? "Bruto" : "Net"} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tren Perekrutan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-teal-500" />
              Tren Perekrutan (6 Bulan)
            </CardTitle>
            <CardDescription>Jumlah karyawan baru bergabung per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.headcountTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={24} />
                <Tooltip formatter={(v: any) => [`${v} karyawan baru`, "Bergabung"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="joined" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SP & Training */}
        <div className="space-y-4">
          {/* Surat Peringatan */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-orange-500" />
                Surat Peringatan (12 Bulan Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: "SP 1", key: "sp1", color: "text-yellow-700 bg-yellow-100" },
                  { type: "SP 2", key: "sp2", color: "text-orange-700 bg-orange-100" },
                  { type: "SP 3", key: "sp3", color: "text-red-700 bg-red-100" },
                ].map(({ type, key, color }) => (
                  <div key={key} className={`rounded-xl p-4 text-center ${color}`}>
                    <p className="text-2xl font-black">{analytics.spCount[key]}</p>
                    <p className="text-xs font-bold mt-1">{type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress Training */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-500" />
                Training Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <ResponsiveContainer width={96} height={96}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Selesai", value: analytics.trainingCompleted },
                          { name: "Belum", value: Math.max(0, analytics.trainingTotal - analytics.trainingCompleted) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={42}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        <Cell fill="#8b5cf6" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-violet-600">{analytics.trainingRate}%</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                    <span className="text-muted-foreground">Selesai: <strong>{analytics.trainingCompleted}</strong> sesi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
                    <span className="text-muted-foreground">Belum: <strong>{analytics.trainingTotal - analytics.trainingCompleted}</strong> sesi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-muted-foreground">Total: <strong>{analytics.trainingTotal}</strong> sesi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kontrak Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Status Kontrak Karyawan
          </CardTitle>
          <CardDescription>Pantau kontrak yang mendekati atau sudah melewati tanggal berakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.contractExpiringSoon.length === 0 && analytics.contractExpired.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Tidak ada kontrak bermasalah saat ini
            </div>
          ) : (
            <div className="space-y-2">
              {[...analytics.contractExpired.map((c: any) => ({ ...c, _alert: "expired" })),
                ...analytics.contractExpiringSoon.map((c: any) => ({ ...c, _alert: "soon" }))
              ].map((c: any) => {
                const daysLeft = c.end_date ? differenceInDays(parseISO(c.end_date), now) : null;
                return (
                  <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border ${c._alert === "expired" ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className={`h-4 w-4 ${c._alert === "expired" ? "text-red-500" : "text-amber-500"}`} />
                      <span className="font-medium">{c.contract_type?.toUpperCase()}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-muted-foreground">
                        Berakhir: {c.end_date ? format(parseISO(c.end_date), "dd MMM yyyy", { locale: idLocale }) : "—"}
                      </span>
                    </div>
                    <Badge variant={c._alert === "expired" ? "destructive" : "outline"} className="text-xs">
                      {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)} hari lalu` : `${daysLeft} hari lagi`) : "—"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
