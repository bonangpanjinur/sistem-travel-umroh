import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, FileSpreadsheet, Search, CalendarDays,
  TrendingDown, AlertCircle, CheckCircle2, Clock, BarChart3, FileDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
  department: string | null;
  position: string | null;
  salary: number | null;
  is_active: boolean;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number | null;
  status: string | null;
  reason: string | null;
}

interface EmployeeLeaveStats {
  id: string;
  full_name: string;
  employee_code: string;
  department: string | null;
  position: string | null;
  salary: number | null;
  is_active: boolean;
  total: number;
  hasLeave: boolean;
  annual: number;
  sick: number;
  emergency: number;
  maternity: number;
  paternity: number;
  unpaid: number;
  other: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES: Record<string, { label: string; color: string }> = {
  annual:    { label: "Tahunan",    color: "#10b981" },
  sick:      { label: "Sakit",      color: "#f59e0b" },
  emergency: { label: "Darurat",    color: "#ef4444" },
  maternity: { label: "Melahirkan", color: "#ec4899" },
  paternity: { label: "Ayah Baru",  color: "#8b5cf6" },
  unpaid:    { label: "Tanpa Gaji", color: "#6b7280" },
  other:     { label: "Lainnya",    color: "#3b82f6" },
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  pending:  "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Disetujui",
  pending:  "Menunggu",
  rejected: "Ditolak",
};

const PIE_COLORS = ["#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#6b7280","#3b82f6"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSDMLaporan() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch]           = useState("");
  const [filterDept, setFilterDept]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const yearStart = format(startOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");
  const yearEnd   = format(endOfYear(new Date(selectedYear, 0)),   "yyyy-MM-dd");
  const years     = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["sdm-laporan-employees"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id,full_name,employee_code,department,position,salary,is_active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: leaveRequests = [], isLoading: loadingLeave } = useQuery({
    queryKey: ["sdm-laporan-leaves", selectedYear],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .select("id,employee_id,leave_type,start_date,end_date,total_days,status,reason")
        .gte("start_date", yearStart)
        .lte("start_date", yearEnd)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequest[];
    },
  });

  const isLoading = loadingEmp || loadingLeave;

  // ── Computed: per-employee leave stats ─────────────────────────────────────

  const stats = useMemo((): EmployeeLeaveStats[] => {
    const countDays = (empId: string, type: string) =>
      leaveRequests
        .filter(l => l.employee_id === empId && l.leave_type === type && l.status !== "rejected")
        .reduce((s, l) => s + (l.total_days ?? 1), 0);

    return employees.map((emp): EmployeeLeaveStats => {
      const empLeaves = leaveRequests.filter(
        l => l.employee_id === emp.id && l.status !== "rejected",
      );
      return {
        id:            emp.id,
        full_name:     emp.full_name,
        employee_code: emp.employee_code,
        department:    emp.department,
        position:      emp.position,
        salary:        emp.salary,
        is_active:     emp.is_active,
        total:         empLeaves.reduce((s, l) => s + (l.total_days ?? 1), 0),
        hasLeave:      empLeaves.length > 0,
        annual:        countDays(emp.id, "annual"),
        sick:          countDays(emp.id, "sick"),
        emergency:     countDays(emp.id, "emergency"),
        maternity:     countDays(emp.id, "maternity"),
        paternity:     countDays(emp.id, "paternity"),
        unpaid:        countDays(emp.id, "unpaid"),
        other:         countDays(emp.id, "other"),
      };
    });
  }, [employees, leaveRequests]);

  // ── Filtered leave requests (detail tab) ───────────────────────────────────

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      const matchSearch =
        search === "" ||
        (emp?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (emp?.employee_code.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchDept   = filterDept   === "all" || emp?.department === filterDept;
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [leaveRequests, employees, search, filterDept, filterStatus]);

  // ── Filtered stats (summary tab) ──────────────────────────────────────────

  const filteredStats = useMemo(
    () => stats.filter(s => {
      const matchSearch =
        search === "" ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_code.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || s.department === filterDept;
      return matchSearch && matchDept;
    }),
    [stats, search, filterDept],
  );

  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[],
    [employees],
  );

  // ── Aggregate totals ───────────────────────────────────────────────────────

  const totals = useMemo(
    () => filteredStats.reduce(
      (acc, s) => ({
        total:     acc.total     + s.total,
        annual:    acc.annual    + s.annual,
        sick:      acc.sick      + s.sick,
        emergency: acc.emergency + s.emergency,
        maternity: acc.maternity + s.maternity,
        paternity: acc.paternity + s.paternity,
        unpaid:    acc.unpaid    + s.unpaid,
        other:     acc.other     + s.other,
      }),
      { total: 0, annual: 0, sick: 0, emergency: 0, maternity: 0, paternity: 0, unpaid: 0, other: 0 },
    ),
    [filteredStats],
  );

  // ── Chart data ─────────────────────────────────────────────────────────────

  const pieData = Object.entries(LEAVE_TYPES)
    .map(([key, meta]) => ({ name: meta.label, value: totals[key as keyof typeof totals] }))
    .filter(d => d.value > 0);

  const barData = useMemo(() => {
    const byMonth: Record<number, number> = {};
    leaveRequests
      .filter(l => l.status !== "rejected")
      .forEach(l => {
        const m = parseISO(l.start_date).getMonth();
        byMonth[m] = (byMonth[m] ?? 0) + (l.total_days ?? 1);
      });
    return Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i), "MMM", { locale: localeId }),
      hari:  byMonth[i] ?? 0,
    }));
  }, [leaveRequests, selectedYear]);

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportExcel = () => {
    const rows = filteredStats.map((s, i) => {
      const dailyRate = s.salary ? s.salary / 22 : 0;
      return {
        "No":              i + 1,
        "Nama":            s.full_name,
        "Kode":            s.employee_code,
        "Departemen":      s.department ?? "-",
        "Jabatan":         s.position   ?? "-",
        "Tahunan (hari)":  s.annual,
        "Sakit (hari)":    s.sick,
        "Darurat (hari)":  s.emergency,
        "Khusus (hari)":   s.maternity + s.paternity + s.unpaid + s.other,
        "Total Cuti":      s.total,
        "Biaya Cuti":      dailyRate * s.annual,
        "Biaya Sakit":     dailyRate * s.sick,
        "Biaya Darurat":   dailyRate * s.emergency,
        "Biaya Khusus":    dailyRate * (s.maternity + s.paternity + s.unpaid + s.other),
        "Biaya Total":     dailyRate * s.total,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan SDM");
    const fn = `Laporan_SDM_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fn);
    toast.success(`File "${fn}" berhasil diunduh`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Laporan SDM
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rekap cuti &amp; izin karyawan tahun {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Hari Cuti",  value: totals.total,     icon: CalendarDays,  color: "text-primary" },
          { label: "Cuti Tahunan",     value: totals.annual,    icon: CheckCircle2,  color: "text-emerald-600" },
          { label: "Cuti Sakit",       value: totals.sick,      icon: AlertCircle,   color: "text-amber-600" },
          { label: "Cuti Darurat",     value: totals.emergency, icon: TrendingDown,  color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                  <p className="text-[11px] text-muted-foreground">hari</p>
                </div>
                <Icon className={`h-8 w-8 ${color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tren Cuti per Bulan ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} hari`, "Hari Cuti"]} />
                <Bar dataKey="hari" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Distribusi Jenis Cuti</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Belum ada data cuti
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} hari`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama / kode karyawan…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <Users className="h-4 w-4 mr-1.5" />
            Ringkasan per Karyawan
          </TabsTrigger>
          <TabsTrigger value="detail">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Detail Pengajuan
          </TabsTrigger>
        </TabsList>

        {/* Summary tab */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead className="text-center">Tahunan</TableHead>
                      <TableHead className="text-center">Sakit</TableHead>
                      <TableHead className="text-center">Darurat</TableHead>
                      <TableHead className="text-center">Khusus</TableHead>
                      <TableHead className="text-center font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Memuat data…
                        </TableCell>
                      </TableRow>
                    ) : filteredStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          Tidak ada data karyawan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {filteredStats.map(s => (
                          <TableRow key={s.id} className={!s.hasLeave ? "opacity-50" : undefined}>
                            <TableCell>
                              <p className="font-medium text-sm">{s.full_name}</p>
                              <p className="text-xs text-muted-foreground">{s.employee_code}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {s.department ?? "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={s.annual > 0 ? "font-semibold text-emerald-700" : "text-muted-foreground"}>
                                {s.annual}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={s.sick > 0 ? "font-semibold text-amber-700" : "text-muted-foreground"}>
                                {s.sick}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={s.emergency > 0 ? "font-semibold text-red-700" : "text-muted-foreground"}>
                                {s.emergency}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {s.maternity + s.paternity + s.unpaid + s.other}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={s.total > 12 ? "destructive" : s.total > 6 ? "secondary" : "outline"}
                              >
                                {s.total} hr
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-bold">
                          <TableCell colSpan={2}>
                            Total ({filteredStats.length} karyawan)
                          </TableCell>
                          <TableCell className="text-center">{totals.annual}</TableCell>
                          <TableCell className="text-center">{totals.sick}</TableCell>
                          <TableCell className="text-center">{totals.emergency}</TableCell>
                          <TableCell className="text-center">
                            {totals.maternity + totals.paternity + totals.unpaid + totals.other}
                          </TableCell>
                          <TableCell className="text-center">{totals.total}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detail tab */}
        <TabsContent value="detail">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Jenis Cuti</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Tanggal Selesai</TableHead>
                      <TableHead className="text-center">Hari</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Memuat data…
                        </TableCell>
                      </TableRow>
                    ) : filteredLeaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          Tidak ada pengajuan cuti ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeaves.map(l => {
                        const emp       = employees.find(e => e.id === l.employee_id);
                        const leaveInfo = LEAVE_TYPES[l.leave_type];
                        return (
                          <TableRow key={l.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{emp?.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: leaveInfo?.color, color: leaveInfo?.color }}
                              >
                                {leaveInfo?.label ?? l.leave_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(l.start_date), "d MMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(l.end_date), "d MMM yyyy", { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {l.total_days ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {l.reason ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-xs ${STATUS_COLORS[l.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}
                              >
                                {STATUS_LABELS[l.status ?? ""] ?? l.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Estimasi Biaya Cuti */}
      {filteredStats.some(s => s.salary && s.total > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Estimasi Biaya Cuti (gaji pokok / 22 hari)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead className="text-right">Tahunan</TableHead>
                    <TableHead className="text-right">Sakit</TableHead>
                    <TableHead className="text-right">Darurat</TableHead>
                    <TableHead className="text-right">Khusus</TableHead>
                    <TableHead className="text-right font-bold">Total Biaya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats
                    .filter(s => s.salary && s.total > 0)
                    .map(s => {
                      const dailyRate = (s.salary ?? 0) / 22;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.department ?? "—"}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(s.salary ?? 0)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(dailyRate * s.annual)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(dailyRate * s.sick)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(dailyRate * s.emergency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(dailyRate * (s.maternity + s.paternity + s.unpaid + s.other))}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(dailyRate * s.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
