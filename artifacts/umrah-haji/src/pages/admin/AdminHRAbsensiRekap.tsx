import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users, ChevronLeft, CalendarDays, FileDown, FileSpreadsheet,
  FileText, Search, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type Employee = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "full_name" | "employee_code" | "department" | "position" | "is_active"
>;

type AttendanceRecord = Pick<
  Database["public"]["Tables"]["attendance_records"]["Row"],
  "employee_id" | "attendance_date" | "status"
>;

interface EmpSummary {
  employee: Employee;
  hadir: number;
  terlambat: number;
  cuti: number;
  alpha: number;
  total: number;
}

function workingDaysInMonth(year: number, month: number): number {
  const days = getDaysInMonth(new Date(year, month - 1));
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = getDay(new Date(year, month - 1, d));
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export default function AdminHRAbsensiRekap() {
  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [search,        setSearch]        = useState("");
  const [filterDept,    setFilterDept]    = useState("all");

  const monthStart = format(startOfMonth(new Date(selectedYear, selectedMonth - 1)), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)),   "yyyy-MM-dd");
  const monthLabel = format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: localeId });
  const wDays      = workingDaysInMonth(selectedYear, selectedMonth);

  const years  = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i), "MMMM", { locale: localeId }),
  }));

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["hr-rekap-employees"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id, full_name, employee_code, department, position, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: records = [], isLoading: loadingRec } = useQuery({
    queryKey: ["hr-rekap-records", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("employee_id, attendance_date, status")
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd);
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
  });

  const isLoading = loadingEmp || loadingRec;

  const summaries: EmpSummary[] = useMemo(() => {
    return employees.map(emp => {
      const empRecs   = records.filter(r => r.employee_id === emp.id);
      const hadir     = empRecs.filter(r => r.status === "hadir").length;
      const terlambat = empRecs.filter(r => r.status === "terlambat").length;
      const cuti      = empRecs.filter(r => r.status === "cuti" || r.status === "izin").length;
      const alpha     = empRecs.filter(r => r.status === "alpha" || (!r.status && r.attendance_date)).length;
      return { employee: emp, hadir, terlambat, cuti, alpha, total: empRecs.length };
    });
  }, [employees, records]);

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  const filtered = summaries.filter(s => {
    const matchSearch = search === "" ||
      s.employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.employee.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || s.employee.department === filterDept;
    return matchSearch && matchDept;
  });

  const totals = filtered.reduce(
    (acc, s) => ({
      hadir:     acc.hadir     + s.hadir,
      terlambat: acc.terlambat + s.terlambat,
      cuti:      acc.cuti      + s.cuti,
      alpha:     acc.alpha     + s.alpha,
    }),
    { hadir: 0, terlambat: 0, cuti: 0, alpha: 0 }
  );

  /* ── export ── */
  const buildRows = (source: EmpSummary[]) =>
    source.map((s, i) => {
      const rate = wDays ? Math.round(((s.hadir + s.terlambat) / wDays) * 100) : 0;
      return {
        "No":             i + 1,
        "Nama Karyawan":  s.employee.full_name,
        "Kode Karyawan":  s.employee.employee_code,
        "Departemen":     s.employee.department ?? "-",
        "Jabatan":        s.employee.position   ?? "-",
        "Hadir":          s.hadir,
        "Terlambat":      s.terlambat,
        "Cuti/Izin":      s.cuti,
        "Alpha":          s.alpha,
        "Total Tercatat": s.total,
        "Hari Kerja":     wDays,
        "Kehadiran %":    `${rate}%`,
      };
    });

  const exportToExcel = () => {
    const data = buildRows(filtered);
    const ws   = XLSX.utils.json_to_sheet(data);
    const wb   = XLSX.utils.book_new();
    ws["!cols"] = [
      { wch: 4 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 20 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    const filename = `Rekap_Absensi_${format(new Date(selectedYear, selectedMonth - 1), "yyyy-MM")}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`File "${filename}" berhasil diunduh`);
  };

  const exportToCSV = () => {
    const data    = buildRows(filtered);
    const headers = Object.keys(data[0] ?? {});
    const csvRows = [
      headers.join(","),
      ...data.map(row =>
        headers.map(h => `"${String((row as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `Rekap_Absensi_${format(new Date(selectedYear, selectedMonth - 1), "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File CSV berhasil diunduh");
  };

  return (
    <div className="space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/hr/absensi" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Rekap Absensi Bulanan</h1>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {monthLabel} · {wDays} hari kerja
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileDown className="w-3.5 h-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Download Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4 text-blue-500" />
              Download CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter bar ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium shrink-0">Bulan:</span>
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-xs capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium shrink-0">Tahun:</span>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 border-l border-slate-200 mx-0.5 hidden sm:block" />

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Cari nama / kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Semua departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Departemen</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Hadir",    value: totals.hadir,     cls: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Total Terlambat",value: totals.terlambat, cls: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
          { label: "Total Cuti/Izin",value: totals.cuti,      cls: "text-blue-700",    bg: "bg-blue-50 border-blue-200"       },
          { label: "Total Alpha",    value: totals.alpha,     cls: "text-red-700",     bg: "bg-red-50 border-red-200"         },
        ].map(({ label, value, cls, bg }) => (
          <Card key={label} className={cn("border shadow-sm", bg)}>
            <CardContent className="p-4 text-center">
              <div className={cn("text-2xl font-bold mb-0.5", cls)}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">dari {filtered.length} karyawan</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Table ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Detail Rekap Per Karyawan
            <Badge variant="secondary" className="ml-auto text-xs">{filtered.length} karyawan</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-slate-400 text-sm gap-2">
              <span className="inline-block animate-spin text-base">⟳</span> Memuat rekap...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-sm">Tidak ada data ditemukan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="text-xs font-semibold text-slate-400 px-4 py-3 w-10">#</th>
                    <th className="text-xs font-semibold text-slate-500 px-3 py-3">Karyawan</th>
                    <th className="text-xs font-semibold text-slate-500 px-3 py-3 hidden md:table-cell">Departemen</th>
                    <th className="text-xs font-semibold text-emerald-600 px-3 py-3 text-center">Hadir</th>
                    <th className="text-xs font-semibold text-amber-600  px-3 py-3 text-center">Terlambat</th>
                    <th className="text-xs font-semibold text-blue-600   px-3 py-3 text-center">Cuti/Izin</th>
                    <th className="text-xs font-semibold text-red-600    px-3 py-3 text-center">Alpha</th>
                    <th className="text-xs font-semibold text-slate-500  px-3 py-3 text-center">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((s, i) => {
                    const rate = wDays ? Math.round(((s.hadir + s.terlambat) / wDays) * 100) : 0;
                    const rateColor =
                      rate >= 90 ? "text-emerald-600" :
                      rate >= 75 ? "text-amber-600"   : "text-red-600";
                    const barColor  =
                      rate >= 90 ? "bg-emerald-500" :
                      rate >= 75 ? "bg-amber-400"   : "bg-red-400";
                    return (
                      <tr key={s.employee.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-800 text-sm leading-tight">{s.employee.full_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{s.employee.employee_code}</div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <div className="text-xs text-slate-600">{s.employee.department ?? "-"}</div>
                          <div className="text-xs text-slate-400">{s.employee.position ?? ""}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Pill value={s.hadir} color="emerald" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Pill value={s.terlambat} color="amber" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Pill value={s.cuti} color="blue" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Pill value={s.alpha} color={s.alpha > 0 ? "red" : "slate"} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn("text-xs font-bold tabular-nums", rateColor)}>{rate}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-300", barColor)}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                      Total ({filtered.length} karyawan)
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-emerald-700">{totals.hadir}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-amber-700">{totals.terlambat}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-blue-700">{totals.cuti}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-red-700">{totals.alpha}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Pill({ value, color }: { value: number; color: "emerald" | "amber" | "blue" | "red" | "slate" }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50  text-amber-700",
    blue:    "bg-blue-50   text-blue-700",
    red:     "bg-red-50    text-red-700",
    slate:   "bg-slate-100 text-slate-400",
  }[color];
  return (
    <span className={cn("inline-block min-w-[1.75rem] rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", cls)}>
      {value}
    </span>
  );
}
