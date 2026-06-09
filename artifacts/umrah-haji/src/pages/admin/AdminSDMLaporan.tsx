
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, FileDown, FileSpreadsheet, Search, CalendarDays,
  TrendingDown, AlertCircle, CheckCircle2, Clock, BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
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
  annual:    { label: "Tahunan",      color: "#10b981" },
  sick:      { label: "Sakit",        color: "#f59e0b" },
  emergency: { label: "Darurat",      color: "#ef4444" },
  maternity: { label: "Melahirkan",   color: "#ec4899" },
  paternity: { label: "Ayah Baru",    color: "#8b5cf6" },
  unpaid:    { label: "Tanpa Gaji",   color: "#6b7280" },
  other:     { label: "Lainnya",      color: "#3b82f6" },
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
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const yearStart = format(startOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");
  const yearEnd   = format(endOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

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

  // ── Computed: employee leave stats ─────────────────────────────────────────
  const stats = useMemo((): EmployeeLeaveStats[] => {
    const countType = (empId: string, type: string) =>
      leaveRequests.filter(
        l => l.employee_id === empId && l.leave_type === type && l.status !== "rejected"
      ).reduce((sum, l) => sum + (l.total_days ?? 1), 0);

    return employees.map((emp): EmployeeLeaveStats => {
      const empLeaves = leaveRequests.filter(l => l.employee_id === emp.id && l.status !== "rejected");
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
        annual:        countType(emp.id, "annual"),
        sick:          countType(emp.id, "sick"),
        emergency:     countType(emp.id, "emergency"),
        maternity:     countType(emp.id, "maternity"),
        paternity:     countType(emp.id, "paternity"),
        unpaid:        countType(emp.id, "unpaid"),
        other:         countType(emp.id, "other"),
      };
    });
  }, [employees, leaveRequests]);

  // ── Filtered leave requests (for detail tab) ───────────────────────────────
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      const matchSearch = search === "" ||
        (emp?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (emp?.employee_code.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchDept = filterDept === "all" || emp?.department === filterDept;
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [leaveRequests, employees, search, filterDept, filterStatus]);

  // ── Filtered stats (for summary tab) ──────────────────────────────────────
  const filteredStats = useMemo(() =>
    stats.filter(s => {
      const matchSearch = search === "" ||
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_code.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || s.department === filterDept;
      return matchSearch && matchDept;
    }),
  [stats, search, filterDept]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[],
    [employees]
  );

  // ── Aggregate totals ───────────────────────────────────────────────────────
  const totals = useMemo(() => filteredStats.reduce(
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
    { total: 0, annual: 0, sick: 0, emergency: 0, maternity: 0, paternity: 0, unpaid: 0, other: 0 }
  ), [filteredStats]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const pieData = Object.entries(LEAVE_TYPES).map(([key, meta]) => ({
    name: meta.label,
    value: totals[key as keyof typeof totals],
  })).filter(d => d.value > 0);

  const barData = useMemo(() => {
    const byMonth: Record<number, number> = {};
    leaveRequests.filter(l => l.status !== "rejected").forEach(l => {
      const m = parseISO(l.start_date).getMonth();
      byMonth[m] = (byMonth[m] ?? 0) + (l.total_days ?? 1);
    });
    return Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i), "MMM", { locale: localeId }),
      hari: byMonth[i] ?? 0,
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
        "Gaji Harian":     dailyRate,
        "Biaya Cuti":      dailyRate * s.annual,
        "Biaya Sakit":     dailyRate * s.sick,
        "Biaya Darurat":   dailyRate * s.emergency,
        "Biaya Total":     dailyRate * (s.maternity + s.paternity + s.unpaid + s.other),
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
            <BarChart3 className="h-6 w-6 text-primary" /> Laporan SDM
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rekap cuti & izin karyawan tahun {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Export Excel

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Printer, Search, Filter, Users,
  DollarSign, Calendar, GraduationCap, ChevronDown,
  CheckCircle2, Clock, AlertCircle, RefreshCw, TrendingUp,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; full_name: string; employee_code: string;
  department: string | null; position: string | null; salary: number | null; is_active: boolean;
}
interface PayrollSlip {
  id: string; employee_id: string; period_year: number; period_month: number;
  basic_salary: number; gross_salary: number; net_salary: number;
  allowances: Record<string, number>; deductions: Record<string, number>; status: string;
}
interface LeaveRequest {
  id: string; employee_id: string; leave_type: string; status: string;
  start_date: string; end_date: string; total_days: number;
}
interface TrainingProgress {
  id: string; employee_id: string; module_id: string; status: string;
  due_date: string | null; completed_at: string | null;
}
interface TrainingModule { id: string; title: string; category: string; }

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2024, i, 1), "MMMM", { locale: localeId }),
}));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

// ─── CSV Export helper ────────────────────────────────────────────────────────
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printReport(title: string) {
  const style = document.createElement("style");
  style.id = "__sdm_print";
  style.textContent = `
    @media print {
      body > *:not(#sdm-print-area) { display: none !important; }
      #sdm-print-area { display: block !important; }
      #sdm-print-area .no-print { display: none !important; }
    }
  `;
  const existing = document.getElementById("__sdm_print");
  if (existing) existing.remove();
  document.head.appendChild(style);

  const area = document.getElementById("sdm-print-area");
  const titleEl = document.getElementById("sdm-print-title");
  if (titleEl) titleEl.textContent = title;
  if (area) area.style.display = "block";
  window.print();
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSDMLaporan() {
  const now = new Date();
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [dept, setDept]   = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("payroll");

  const periodLabel = `${MONTHS.find(m => m.value === month)?.label ?? month} ${year}`;

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: employees = [], isLoading: loadingEmp } = useQuery<Employee[]>({
    queryKey: ["sdm-laporan-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees")
        .select("id,full_name,employee_code,department,position,salary,is_active")
        .eq("is_active", true).order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: payrollSlips = [], isLoading: loadingPayroll } = useQuery<PayrollSlip[]>({
    queryKey: ["sdm-laporan-payroll", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_slips")
        .select("id,employee_id,period_year,period_month,basic_salary,gross_salary,net_salary,allowances,deductions,status")
        .eq("period_year", Number(year)).eq("period_month", Number(month));
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: leaveRequests = [], isLoading: loadingLeave } = useQuery<LeaveRequest[]>({
    queryKey: ["sdm-laporan-leaves", year, month],
    queryFn: async () => {
      const startDate = `${year}-${month}-01`;
      const endOfMonth = new Date(Number(year), Number(month), 0);
      const endDate = format(endOfMonth, "yyyy-MM-dd");
      const { data, error } = await supabase.from("leave_requests")
        .select("id,employee_id,leave_type,status,start_date,end_date,total_days")
        .eq("status", "approved")
        .gte("start_date", startDate).lte("start_date", endDate);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: trainingProgress = [], isLoading: loadingTraining } = useQuery<TrainingProgress[]>({
    queryKey: ["sdm-laporan-training"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_training_progress")
        .select("id,employee_id,module_id,status,due_date,completed_at");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: trainingModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["sdm-laporan-modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_modules").select("id,title,category");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // ─── Derived ─────────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean) as string[])].sort();
    return depts;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchDept   = dept === "all" || e.department === dept;
      const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_code.toLowerCase().includes(search.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [employees, dept, search]);

  // Payroll rows
  const payrollRows = useMemo(() => {
    const slipMap = new Map(payrollSlips.map(s => [s.employee_id, s]));
    return filteredEmployees.map(emp => {
      const slip = slipMap.get(emp.id);
      const allowanceTotal = slip ? Object.values(slip.allowances ?? {}).reduce((a: number, v: any) => a + (Number(v) || 0), 0) : 0;
      const deductionTotal = slip ? Object.values(slip.deductions ?? {}).reduce((a: number, v: any) => a + (Number(v) || 0), 0) : 0;
      return {
        ...emp,
        basic_salary: slip?.basic_salary ?? emp.salary ?? 0,
        allowances: allowanceTotal,
        deductions: deductionTotal,
        gross_salary: slip?.gross_salary ?? 0,
        net_salary: slip?.net_salary ?? 0,
        status: slip?.status ?? "—",
        has_slip: !!slip,
      };
    });
  }, [filteredEmployees, payrollSlips]);

  const payrollTotals = useMemo(() => ({
    gross: payrollRows.reduce((a, r) => a + r.gross_salary, 0),
    net:   payrollRows.reduce((a, r) => a + r.net_salary, 0),
    count: payrollRows.filter(r => r.has_slip).length,
  }), [payrollRows]);

  // Leave rows
  const leaveRows = useMemo(() => {
    const TYPES = ["annual","sick","emergency","maternity","paternity","unpaid","other"];
    return filteredEmployees.map(emp => {
      const empLeaves = leaveRequests.filter(l => l.employee_id === emp.id);
      const byType: Record<string, number> = {};
      TYPES.forEach(t => { byType[t] = empLeaves.filter(l => l.leave_type === t).reduce((a, l) => a + (l.total_days ?? 0), 0); });
      const total = Object.values(byType).reduce((a, v) => a + v, 0);
      return { ...emp, ...byType, total, hasLeave: total > 0 };
    });
  }, [filteredEmployees, leaveRequests]);

  const leaveTotals = useMemo(() => ({
    annual:    leaveRows.reduce((a, r) => a + (r.annual ?? 0), 0),
    sick:      leaveRows.reduce((a, r) => a + (r.sick ?? 0), 0),
    emergency: leaveRows.reduce((a, r) => a + (r.emergency ?? 0), 0),
    other:     leaveRows.reduce((a, r) => a + ((r.maternity ?? 0) + (r.paternity ?? 0) + (r.unpaid ?? 0) + (r.other ?? 0)), 0),
    total:     leaveRows.reduce((a, r) => a + r.total, 0),
    employees: leaveRows.filter(r => r.hasLeave).length,
  }), [leaveRows]);

  // Training rows
  const moduleMap = useMemo(() => new Map(trainingModules.map(m => [m.id, m])), [trainingModules]);
  const today = new Date();

  const trainingRows = useMemo(() => {
    return filteredEmployees.map(emp => {
      const progList = trainingProgress.filter(p => p.employee_id === emp.id);
      const total = progList.length;
      const completed = progList.filter(p => p.status === "completed").length;
      const inProgress = progList.filter(p => p.status === "in_progress").length;
      const overdue = progList.filter(p =>
        p.status !== "completed" && p.due_date && new Date(p.due_date) < today
      ).length;
      const notStarted = total - completed - inProgress;
      const rate = total ? Math.round((completed / total) * 100) : 0;
      return { ...emp, total, completed, inProgress, notStarted: Math.max(0, notStarted), overdue, rate };
    }).filter(r => r.total > 0 || dept !== "all" || search);
  }, [filteredEmployees, trainingProgress, today]);

  const trainingTotals = useMemo(() => ({
    employees: trainingRows.filter(r => r.total > 0).length,
    completed: trainingRows.reduce((a, r) => a + r.completed, 0),
    overdue:   trainingRows.reduce((a, r) => a + r.overdue, 0),
    avgRate:   trainingRows.length ? Math.round(trainingRows.reduce((a, r) => a + r.rate, 0) / Math.max(trainingRows.length, 1)) : 0,
  }), [trainingRows]);

  // ─── Export handlers ─────────────────────────────────────────────────────
  const exportPayrollCSV = useCallback(() => {
    const header = ["Kode", "Nama", "Departemen", "Jabatan", "Gaji Pokok", "Tunjangan", "Potongan", "Gaji Kotor", "Gaji Bersih", "Status"];
    const rows = payrollRows.map(r => [r.employee_code, r.full_name, r.department ?? "—", r.position ?? "—", r.basic_salary, r.allowances, r.deductions, r.gross_salary, r.net_salary, r.status]);
    rows.push(["", "TOTAL", "", "", "", "", "", payrollTotals.gross, payrollTotals.net, ""]);
    downloadCSV([header, ...rows], `Payroll_${periodLabel.replace(" ", "_")}`);
  }, [payrollRows, payrollTotals, periodLabel]);

  const exportLeaveCSV = useCallback(() => {
    const header = ["Kode", "Nama", "Departemen", "Tahunan", "Sakit", "Darurat", "Lainnya", "Total Hari"];
    const rows = leaveRows.filter(r => r.hasLeave).map(r => [r.employee_code, r.full_name, r.department ?? "—", r.annual ?? 0, r.sick ?? 0, r.emergency ?? 0, (r.maternity ?? 0) + (r.paternity ?? 0) + (r.unpaid ?? 0) + (r.other ?? 0), r.total]);
    downloadCSV([header, ...rows], `Cuti_${periodLabel.replace(" ", "_")}`);
  }, [leaveRows, periodLabel]);

  const exportTrainingCSV = useCallback(() => {
    const header = ["Kode", "Nama", "Departemen", "Total Modul", "Selesai", "Sedang Berjalan", "Belum Mulai", "Terlambat", "Progress %"];
    const rows = trainingRows.filter(r => r.total > 0).map(r => [r.employee_code, r.full_name, r.department ?? "—", r.total, r.completed, r.inProgress, r.notStarted, r.overdue, `${r.rate}%`]);
    downloadCSV([header, ...rows], `Training_${year}`);
  }, [trainingRows, year]);

  const isLoading = loadingEmp || loadingPayroll || loadingLeave || loadingTraining;

  // ─── Status badge ─────────────────────────────────────────────────────────
  function payrollStatusBadge(status: string) {
    if (status === "paid")      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Dibayar</Badge>;
    if (status === "processed") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Diproses</Badge>;
    if (status === "draft")     return <Badge variant="secondary" className="text-xs">Draft</Badge>;
    return <Badge variant="outline" className="text-xs text-muted-foreground">—</Badge>;
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div id="sdm-print-area" className="space-y-5 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Laporan Komprehensif SDM
          </h1>
          <p id="sdm-print-title" className="text-sm text-muted-foreground mt-0.5">
            Rekap Payroll, Cuti, dan Progress Training — {periodLabel}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button
            size="sm" variant="outline"
            onClick={() => printReport(`Laporan SDM — ${periodLabel}`)}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />Cetak PDF
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => tab === "payroll" ? exportPayrollCSV() : tab === "leave" ? exportLeaveCSV() : exportTrainingCSV()}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />Export Excel

          </Button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Hari Cuti",  value: totals.total,     icon: CalendarDays, color: "text-primary" },
          { label: "Cuti Tahunan",     value: totals.annual,    icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Cuti Sakit",       value: totals.sick,      icon: AlertCircle,  color: "text-amber-600" },
          { label: "Cuti Darurat",     value: totals.emergency, icon: TrendingDown, color: "text-red-600" },
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
                <Bar dataKey="hari" fill="#10b981" radius={[3,3,0,0]} />
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
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
            <Users className="h-4 w-4 mr-1.5" /> Ringkasan per Karyawan
          </TabsTrigger>
          <TabsTrigger value="detail">
            <CalendarDays className="h-4 w-4 mr-1.5" /> Detail Pengajuan
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
                    ) : filteredStats.map(s => (
                      <TableRow key={s.id} className={!s.hasLeave ? "opacity-50" : undefined}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.employee_code}</p>
                          </div>
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
                          <Badge variant={s.total > 12 ? "destructive" : s.total > 6 ? "secondary" : "outline"}>
                            {s.total} hr
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStats.length > 0 && (
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>Total ({filteredStats.length} karyawan)</TableCell>
                        <TableCell className="text-center">{totals.annual}</TableCell>
                        <TableCell className="text-center">{totals.sick}</TableCell>
                        <TableCell className="text-center">{totals.emergency}</TableCell>
                        <TableCell className="text-center">
                          {totals.maternity + totals.paternity + totals.unpaid + totals.other}
                        </TableCell>
                        <TableCell className="text-center">{totals.total}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Card className="no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Semua Dept." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari karyawan..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4 text-blue-600" />}      color="bg-blue-100"   label="Total Karyawan Aktif"  value={filteredEmployees.length}        sub={dept !== "all" ? dept : "Seluruh departemen"} />
        <StatCard icon={<DollarSign className="h-4 w-4 text-green-600" />} color="bg-green-100"  label="Total Gaji Bersih"     value={formatCurrency(payrollTotals.net)} sub={`${payrollTotals.count} slip ${periodLabel}`} />
        <StatCard icon={<Calendar className="h-4 w-4 text-amber-600" />}   color="bg-amber-100"  label="Total Hari Cuti/Izin"  value={leaveTotals.total}               sub={`${leaveTotals.employees} karyawan`} />
        <StatCard icon={<GraduationCap className="h-4 w-4 text-violet-600" />} color="bg-violet-100" label="Rata-rata Progress Training" value={`${trainingTotals.avgRate}%`} sub={`${trainingTotals.overdue} modul terlambat`} />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print">
          <TabsTrigger value="payroll"><DollarSign className="h-4 w-4 mr-1" />Payroll</TabsTrigger>
          <TabsTrigger value="leave"><Calendar className="h-4 w-4 mr-1" />Cuti & Izin</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="h-4 w-4 mr-1" />Training</TabsTrigger>
        </TabsList>

        {/* ── Tab Payroll ─────────────────────────────────────────────────── */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rekap Payroll — {periodLabel}</CardTitle>
              <Button size="sm" variant="outline" onClick={exportPayrollCSV} className="gap-1.5 no-print">
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayroll || loadingEmp ? (
                <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="text-right">Gaji Pokok</TableHead>
                        <TableHead className="text-right">Tunjangan</TableHead>
                        <TableHead className="text-right">Potongan</TableHead>
                        <TableHead className="text-right">Gaji Kotor</TableHead>
                        <TableHead className="text-right font-semibold">Gaji Bersih</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRows.map(row => (
                        <TableRow key={row.id} className={row.has_slip ? "" : "text-muted-foreground"}>
                          <TableCell>
                            <p className="font-medium text-sm">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.employee_code}</p>
                          </TableCell>
                          <TableCell className="text-sm">{row.department ?? "—"}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{row.has_slip ? formatCurrency(row.basic_salary) : "—"}</TableCell>
                          <TableCell className="text-right text-sm font-mono text-green-700">{row.has_slip ? (row.allowances > 0 ? `+${formatCurrency(row.allowances)}` : "—") : "—"}</TableCell>
                          <TableCell className="text-right text-sm font-mono text-red-600">{row.has_slip ? (row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : "—") : "—"}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{row.has_slip ? formatCurrency(row.gross_salary) : "—"}</TableCell>
                          <TableCell className="text-right text-sm font-mono font-semibold">{row.has_slip ? formatCurrency(row.net_salary) : "—"}</TableCell>
                          <TableCell>{payrollStatusBadge(row.status)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      {payrollTotals.count > 0 && (
                        <TableRow className="bg-muted/60 font-bold border-t-2">
                          <TableCell colSpan={5} className="text-sm">Total ({payrollTotals.count} slip)</TableCell>
                          <TableCell className="text-right text-sm font-mono font-bold">{formatCurrency(payrollTotals.gross)}</TableCell>
                          <TableCell className="text-right text-sm font-mono font-bold">{formatCurrency(payrollTotals.net)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                      {payrollRows.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada data payroll untuk periode ini.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

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
                    ) : filteredLeaves.map(l => {
                      const emp = employees.find(e => e.id === l.employee_id);
                      const leaveInfo = LEAVE_TYPES[l.leave_type];
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{emp?.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
                            </div>
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
                            <Badge className={`text-xs ${STATUS_COLORS[l.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                              {STATUS_LABELS[l.status ?? ""] ?? l.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

        {/* ── Tab Cuti ────────────────────────────────────────────────────── */}
        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rekap Cuti & Izin — {periodLabel}</CardTitle>
              <Button size="sm" variant="outline" onClick={exportLeaveCSV} className="gap-1.5 no-print">
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLeave || loadingEmp ? (
                <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="text-center">Cuti Tahunan</TableHead>
                        <TableHead className="text-center">Sakit</TableHead>
                        <TableHead className="text-center">Darurat</TableHead>
                        <TableHead className="text-center">Lainnya</TableHead>
                        <TableHead className="text-center font-semibold">Total Hari</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRows.filter(r => r.hasLeave).map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.employee_code}</p>
                          </TableCell>
                          <TableCell className="text-sm">{row.department ?? "—"}</TableCell>
                          <TableCell className="text-center text-sm">{(row.annual as number) > 0 ? <Badge variant="secondary" className="text-xs">{row.annual as number} hr</Badge> : "—"}</TableCell>
                          <TableCell className="text-center text-sm">{(row.sick as number) > 0   ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">{row.sick as number} hr</Badge> : "—"}</TableCell>
                          <TableCell className="text-center text-sm">{(row.emergency as number) > 0 ? <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">{row.emergency as number} hr</Badge> : "—"}</TableCell>
                          <TableCell className="text-center text-sm">{((row.maternity as number ?? 0) + (row.paternity as number ?? 0) + (row.unpaid as number ?? 0) + (row.other as number ?? 0)) > 0 ? <Badge variant="outline" className="text-xs">{(row.maternity as number ?? 0) + (row.paternity as number ?? 0) + (row.unpaid as number ?? 0) + (row.other as number ?? 0)} hr</Badge> : "—"}</TableCell>
                          <TableCell className="text-center font-bold text-sm">{row.total}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals */}
                      {leaveTotals.employees > 0 && (
                        <TableRow className="bg-muted/60 font-bold border-t-2">
                          <TableCell colSpan={2} className="text-sm">Total ({leaveTotals.employees} karyawan)</TableCell>
                          <TableCell className="text-center text-sm">{leaveTotals.annual}</TableCell>
                          <TableCell className="text-center text-sm">{leaveTotals.sick}</TableCell>
                          <TableCell className="text-center text-sm">{leaveTotals.emergency}</TableCell>
                          <TableCell className="text-center text-sm">{leaveTotals.other}</TableCell>
                          <TableCell className="text-center font-bold text-sm">{leaveTotals.total}</TableCell>
                        </TableRow>
                      )}
                      {leaveRows.filter(r => r.hasLeave).length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada cuti/izin yang disetujui pada periode ini.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Training ─────────────────────────────────────────────────── */}
        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Progress Training Karyawan — {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={exportTrainingCSV} className="gap-1.5 no-print">
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTraining || loadingEmp ? (
                <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="text-center">Total Modul</TableHead>
                        <TableHead className="text-center">Selesai</TableHead>
                        <TableHead className="text-center">Berjalan</TableHead>
                        <TableHead className="text-center">Belum</TableHead>
                        <TableHead className="text-center">Terlambat</TableHead>
                        <TableHead className="w-40">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainingRows.filter(r => r.total > 0).map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.employee_code}</p>
                          </TableCell>
                          <TableCell className="text-sm">{row.department ?? "—"}</TableCell>
                          <TableCell className="text-center text-sm font-medium">{row.total}</TableCell>
                          <TableCell className="text-center">
                            {row.completed > 0
                              ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{row.completed}</span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.inProgress > 0
                              ? <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium"><RefreshCw className="h-3.5 w-3.5" />{row.inProgress}</span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.notStarted > 0
                              ? <span className="text-xs text-muted-foreground">{row.notStarted}</span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.overdue > 0
                              ? <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium"><AlertCircle className="h-3.5 w-3.5" />{row.overdue}</span>
                              : <span className="text-green-600 text-xs">✓</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={row.rate} className="h-2 flex-1" />
                              <span className="text-xs font-medium w-8 text-right">{row.rate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Summary row */}
                      {trainingTotals.employees > 0 && (
                        <TableRow className="bg-muted/60 border-t-2">
                          <TableCell colSpan={2} className="text-sm font-bold">Rata-rata ({trainingTotals.employees} karyawan)</TableCell>
                          <TableCell className="text-center text-sm font-bold">{trainingRows.reduce((a, r) => a + r.total, 0)}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-green-700">{trainingTotals.completed}</TableCell>
                          <TableCell className="text-center text-sm">{trainingRows.reduce((a, r) => a + r.inProgress, 0)}</TableCell>
                          <TableCell className="text-center text-sm">{trainingRows.reduce((a, r) => a + r.notStarted, 0)}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-red-600">{trainingTotals.overdue}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={trainingTotals.avgRate} className="h-2 flex-1" />
                              <span className="text-xs font-bold w-8 text-right">{trainingTotals.avgRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {trainingRows.filter(r => r.total > 0).length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Belum ada data progress training karyawan.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Biaya Cuti Summary */}
      {filteredStats.some(s => s.salary && s.total > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileDown className="h-4 w-4" /> Estimasi Biaya Cuti (hari gaji pokok / 22)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead className="text-right">Biaya Cuti Tahunan</TableHead>
                    <TableHead className="text-right">Biaya Sakit</TableHead>
                    <TableHead className="text-right">Biaya Darurat</TableHead>
                    <TableHead className="text-right">Biaya Khusus</TableHead>
                    <TableHead className="text-right font-bold">Total Biaya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.filter(s => s.salary && s.total > 0).map(s => {
                    const dailyRate = (s.salary ?? 0) / 22;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.department ?? "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(s.salary ?? 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(dailyRate * s.annual)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(dailyRate * s.sick)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(dailyRate * s.emergency)}</TableCell>
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

      {/* Print footer */}
      <div className="hidden print:block text-xs text-muted-foreground text-center border-t pt-3 mt-4">
        Laporan digenerate pada {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })} · Vinstour Travel — Sistem Manajemen SDM
      </div>

    </div>
  );
}
