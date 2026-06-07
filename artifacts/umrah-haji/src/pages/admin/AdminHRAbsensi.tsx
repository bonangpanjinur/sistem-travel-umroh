import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users, CheckCircle2, AlertCircle, XCircle, Clock,
  LogIn, LogOut, RefreshCw, Search, ChevronLeft,
  Loader2, CalendarDays, Timer, FileDown, FileSpreadsheet, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type Employee = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "full_name" | "employee_code" | "department" | "position" | "photo_url" | "is_active"
>;

type AttendanceRecord = Pick<
  Database["public"]["Tables"]["attendance_records"]["Row"],
  "id" | "employee_id" | "check_in_time" | "check_out_time" | "status"
>;

interface EmployeeRow {
  employee: Employee;
  record: AttendanceRecord | null;
  state: "hadir" | "terlambat" | "belum";
}

const LATE_HOUR = 9;
const REFRESH_SECS = 30;

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "-";
  try { return format(parseISO(iso), "HH:mm"); } catch { return "-"; }
}

function workDuration(cin: string | null | undefined, cout: string | null | undefined): string {
  if (!cin || !cout) return "-";
  try {
    const diff = parseISO(cout).getTime() - parseISO(cin).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}j ${m}m`;
  } catch { return "-"; }
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const STATE_CFG = {
  hadir:    { label: "Hadir",       color: "bg-emerald-50 text-emerald-700 border-emerald-200", row: "hover:bg-emerald-50/40" },
  terlambat:{ label: "Terlambat",   color: "bg-amber-50 text-amber-700 border-amber-200",       row: "hover:bg-amber-50/40"   },
  belum:    { label: "Belum Absen", color: "bg-red-50 text-red-700 border-red-200",             row: "hover:bg-red-50/30"     },
};

function StateBadge({ state }: { state: EmployeeRow["state"] }) {
  const cfg = STATE_CFG[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>
      {state === "hadir"     && <CheckCircle2 className="w-3 h-3" />}
      {state === "terlambat" && <AlertCircle  className="w-3 h-3" />}
      {state === "belum"     && <XCircle      className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function AdminHRAbsensi() {
  const queryClient = useQueryClient();
  const now = useNow();
  const todayStr = format(now, "yyyy-MM-dd");

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterState, setFilterState] = useState<"all" | "hadir" | "terlambat" | "belum">("all");
  const [countdown, setCountdown] = useState(REFRESH_SECS);
  const [manualTarget, setManualTarget] = useState<EmployeeRow | null>(null);
  const [manualType, setManualType] = useState<"in" | "out">("in");

  /* ── data fetching ── */
  const { data: employees = [], isFetching: fetchingEmp } = useQuery({
    queryKey: ["hr-absensi-employees"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id, full_name, employee_code, department, position, photo_url, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: records = [], isFetching: fetchingRec, refetch: refetchRecords } = useQuery({
    queryKey: ["hr-absensi-records", todayStr],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("id, employee_id, check_in_time, check_out_time, status")
        .eq("attendance_date", todayStr);
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
    refetchInterval: REFRESH_SECS * 1000,
  });

  const isLoading = fetchingEmp || fetchingRec;

  /* ── auto-refresh countdown ── */
  useEffect(() => {
    setCountdown(REFRESH_SECS);
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { return REFRESH_SECS; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [records]);

  /* ── build merged rows ── */
  const rows: EmployeeRow[] = employees.map(emp => {
    const record = records.find(r => r.employee_id === emp.id) ?? null;
    let state: EmployeeRow["state"] = "belum";
    if (record?.check_in_time) {
      const cinHour = parseISO(record.check_in_time).getHours();
      state = cinHour >= LATE_HOUR ? "terlambat" : "hadir";
    }
    return { employee: emp, record, state };
  });

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  const filtered = rows.filter(r => {
    const matchSearch = search === "" ||
      r.employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || r.employee.department === filterDept;
    const matchState = filterState === "all" || r.state === filterState;
    return matchSearch && matchDept && matchState;
  });

  const stats = {
    total:     rows.length,
    hadir:     rows.filter(r => r.state === "hadir").length,
    terlambat: rows.filter(r => r.state === "terlambat").length,
    belum:     rows.filter(r => r.state === "belum").length,
  };

  /* ── manual clock in/out ── */
  const manualMutation = useMutation({
    mutationFn: async ({ row, type }: { row: EmployeeRow; type: "in" | "out" }) => {
      const nowTs = new Date().toISOString();
      if (type === "in") {
        const cinHour = new Date().getHours();
        const status = cinHour >= LATE_HOUR ? "terlambat" : "hadir";
        if (row.record) {
          const { error } = await (supabase as any)
            .from("attendance_records")
            .update({ check_in_time: nowTs, status })
            .eq("id", row.record.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("attendance_records")
            .insert({ employee_id: row.employee.id, attendance_date: todayStr, check_in_time: nowTs, status, is_manual: true });
          if (error) throw error;
        }
      } else {
        if (!row.record) throw new Error("Belum ada record clock-in");
        const { error } = await (supabase as any)
          .from("attendance_records")
          .update({ check_out_time: nowTs })
          .eq("id", row.record.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { row, type }) => {
      toast.success(`${type === "in" ? "Clock in" : "Clock out"} berhasil untuk ${row.employee.full_name}`);
      setManualTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-absensi-records", todayStr] });
    },
    onError: (err: Error) => toast.error("Gagal: " + err.message),
  });

  const openManual = (row: EmployeeRow, type: "in" | "out") => {
    setManualTarget(row);
    setManualType(type);
  };

  /* ── export helpers ── */
  const buildExportRows = (source: EmployeeRow[]) =>
    source.map((r, i) => ({
      "No":             i + 1,
      "Nama Karyawan":  r.employee.full_name,
      "Kode Karyawan":  r.employee.employee_code,
      "Departemen":     r.employee.department ?? "-",
      "Jabatan":        r.employee.position   ?? "-",
      "Status":         STATE_CFG[r.state].label,
      "Jam Masuk":      formatTs(r.record?.check_in_time),
      "Jam Keluar":     formatTs(r.record?.check_out_time),
      "Durasi Kerja":   workDuration(r.record?.check_in_time, r.record?.check_out_time),
    }));

  const exportToExcel = (all: boolean) => {
    const source = all ? rows : filtered;
    const label  = all ? "Semua" : "Filter";
    const data   = buildExportRows(source);
    const ws     = XLSX.utils.json_to_sheet(data);
    const wb     = XLSX.utils.book_new();

    /* column widths */
    ws["!cols"] = [
      { wch: 4 }, { wch: 28 }, { wch: 14 }, { wch: 18 },
      { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    const filename = `Absensi_${todayStr}_${label}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`File "${filename}" berhasil diunduh`);
  };

  const exportToCSV = (all: boolean) => {
    const source = all ? rows : filtered;
    const label  = all ? "Semua" : "Filter";
    const data   = buildExportRows(source);
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
    a.download = `Absensi_${todayStr}_${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`File CSV berhasil diunduh`);
  };

  const statCards = [
    { label: "Total Karyawan", value: stats.total,     icon: Users,        color: "text-slate-600 bg-slate-100" },
    { label: "Sudah Hadir",    value: stats.hadir,     icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Terlambat",      value: stats.terlambat, icon: AlertCircle,  color: "text-amber-600 bg-amber-50"    },
    { label: "Belum Absen",    value: stats.belum,     icon: XCircle,      color: "text-red-600 bg-red-50"        },
  ];

  return (
    <div className="space-y-5 p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/hr" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dashboard Absensi Hari Ini</h1>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(now, "EEEE, dd MMMM yyyy", { locale: localeId })}
              <span className="font-mono ml-1">{format(now, "HH:mm:ss")}</span>
            </p>
          </div>
        </div>

        {/* Refresh + Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Timer className="w-3.5 h-3.5" />
            Refresh dalam <span className="font-mono font-semibold text-slate-600 w-5 text-center">{countdown}s</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { refetchRecords(); setCountdown(REFRESH_SECS); }}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileDown className="w-3.5 h-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Tampilan saat ini ({filtered.length} karyawan)
              </div>
              <DropdownMenuItem onClick={() => exportToExcel(false)} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Download Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(false)} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-blue-500" />
                Download CSV
              </DropdownMenuItem>
              <div className="my-1 border-t border-slate-100" />
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Semua karyawan ({rows.length})
              </div>
              <DropdownMenuItem onClick={() => exportToExcel(true)} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Download Excel (semua)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(true)} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-blue-500" />
                Download CSV (semua)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
            <span>Tingkat Kehadiran Hari Ini</span>
            <span className="font-semibold text-slate-700">
              {stats.total > 0 ? Math.round(((stats.hadir + stats.terlambat) / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: stats.total > 0 ? `${(stats.hadir / stats.total) * 100}%` : "0%" }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: stats.total > 0 ? `${(stats.terlambat / stats.total) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Hadir tepat waktu</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Terlambat</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />Belum absen</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode karyawan..."
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Semua Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterState} onValueChange={v => setFilterState(v as typeof filterState)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="hadir">Hadir</SelectItem>
            <SelectItem value="terlambat">Terlambat</SelectItem>
            <SelectItem value="belum">Belum Absen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Kehadiran Karyawan
          </CardTitle>
          <span className="text-xs text-slate-400">{filtered.length} karyawan ditampilkan</span>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Tidak ada karyawan yang sesuai filter
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Karyawan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Departemen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1"><LogIn className="w-3 h-3" />Masuk</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1"><LogOut className="w-3 h-3" />Keluar</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Durasi</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Aksi HR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(row => {
                  const { employee: emp, record, state } = row;
                  const canIn  = !record?.check_in_time;
                  const canOut = !!record?.check_in_time && !record?.check_out_time;
                  return (
                    <tr key={emp.id} className={cn("transition-colors", STATE_CFG[state].row)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className={cn(
                              "text-xs font-semibold",
                              state === "hadir"     ? "bg-emerald-100 text-emerald-700"
                              : state === "terlambat" ? "bg-amber-100 text-amber-700"
                              :                        "bg-slate-100 text-slate-500"
                            )}>
                              {initials(emp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-800 text-xs leading-tight">{emp.full_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {emp.department || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {record?.check_in_time
                          ? <span className="text-emerald-700 font-semibold">{formatTs(record.check_in_time)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {record?.check_out_time
                          ? <span className="text-rose-600 font-semibold">{formatTs(record.check_out_time)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {workDuration(record?.check_in_time, record?.check_out_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StateBadge state={state} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canIn && (
                            <button
                              onClick={() => openManual(row, "in")}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition-colors"
                            >
                              <LogIn className="w-3 h-3" />In
                            </button>
                          )}
                          {canOut && (
                            <button
                              onClick={() => openManual(row, "out")}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded transition-colors"
                            >
                              <LogOut className="w-3 h-3" />Out
                            </button>
                          )}
                          {!canIn && !canOut && (
                            <span className="text-[11px] text-slate-300 select-none">selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ── Manual clock dialog ── */}
      <Dialog open={!!manualTarget} onOpenChange={open => { if (!open) setManualTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {manualType === "in"
                ? <><LogIn className="w-4 h-4 text-emerald-600" />Clock In Manual</>
                : <><LogOut className="w-4 h-4 text-rose-500" />Clock Out Manual</>}
            </DialogTitle>
            <DialogDescription>
              {manualType === "in"
                ? `Catat jam masuk untuk ${manualTarget?.employee.full_name} pada pukul ${format(now, "HH:mm")} WIB.`
                : `Catat jam keluar untuk ${manualTarget?.employee.full_name} pada pukul ${format(now, "HH:mm")} WIB.`}
              {manualType === "in" && now.getHours() >= LATE_HOUR && (
                <span className="block mt-1 text-amber-600">⚠ Waktu melebihi 09:00 — akan tercatat sebagai terlambat.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {manualTarget && (
            <div className="flex items-center gap-3 py-2">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold text-sm">
                  {initials(manualTarget.employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{manualTarget.employee.full_name}</p>
                <p className="text-xs text-slate-400 font-mono">{manualTarget.employee.employee_code}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold font-mono text-slate-800">{format(now, "HH:mm")}</p>
                <p className="text-[11px] text-slate-400">{format(now, "dd MMM yyyy", { locale: localeId })}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setManualTarget(null)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => manualTarget && manualMutation.mutate({ row: manualTarget, type: manualType })}
              disabled={manualMutation.isPending}
              className={manualType === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-500 hover:bg-rose-600"}
            >
              {manualMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                : manualType === "in" ? <LogIn className="w-3.5 h-3.5 mr-1" /> : <LogOut className="w-3.5 h-3.5 mr-1" />}
              Konfirmasi {manualType === "in" ? "Clock In" : "Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
