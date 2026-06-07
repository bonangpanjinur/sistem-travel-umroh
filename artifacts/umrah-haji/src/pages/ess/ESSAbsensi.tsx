import { useEffect, useRef, useState, useCallback } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck, Clock, LogIn, LogOut,
  CheckCircle2, XCircle, AlertCircle, Calendar,
  MapPin, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
  is_manual: boolean | null;
  notes: string | null;
}

interface MonthlySummary {
  hadir: number;
  terlambat: number;
  absen: number;
  izin: number;
}

const LATE_HOUR = 9;
const LATE_MINUTE = 0;

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  try { return format(parseISO(iso), "HH:mm"); } catch { return "-"; }
}

function workDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "-";
  try {
    const diff = parseISO(checkOut).getTime() - parseISO(checkIn).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}j ${m}m`;
  } catch { return "-"; }
}

function isLate(now: Date) {
  return now.getHours() > LATE_HOUR || (now.getHours() === LATE_HOUR && now.getMinutes() >= LATE_MINUTE);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hadir:     { label: "Hadir",     color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  terlambat: { label: "Terlambat", color: "bg-amber-50 text-amber-700 border-amber-200",       icon: AlertCircle  },
  absen:     { label: "Absen",     color: "bg-red-50 text-red-700 border-red-200",             icon: XCircle      },
  izin:      { label: "Izin",      color: "bg-blue-50 text-blue-700 border-blue-200",          icon: Calendar     },
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "absen";
  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG["absen"];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: localeId }) });
  }
  return opts;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function ESSAbsensi() {
  const { user } = useAuth();
  const now = useNow();
  const monthOptions = buildMonthOptions();

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({ hadir: 0, terlambat: 0, absen: 0, izin: 0 });
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  const todayStr = format(now, "yyyy-MM-dd");

  const fetchTodayRecord = useCallback(async (empId: string) => {
    const { data } = await (supabase as any)
      .from("attendance_records")
      .select("id, attendance_date, check_in_time, check_out_time, status, is_manual, notes")
      .eq("employee_id", empId)
      .eq("attendance_date", todayStr)
      .maybeSingle();
    setTodayRecord(data ?? null);
  }, [todayStr]);

  const fetchMonthRecords = useCallback(async (empId: string, month: string) => {
    setLoading(true);
    const [year, m] = month.split("-").map(Number);
    const start = format(startOfMonth(new Date(year, m - 1)), "yyyy-MM-dd");
    const end   = format(endOfMonth(new Date(year, m - 1)),   "yyyy-MM-dd");
    const { data } = await (supabase as any)
      .from("attendance_records")
      .select("id, attendance_date, check_in_time, check_out_time, status, is_manual, notes")
      .eq("employee_id", empId)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date", { ascending: false });
    const rows: AttendanceRecord[] = data ?? [];
    setRecords(rows);
    const s: MonthlySummary = { hadir: 0, terlambat: 0, absen: 0, izin: 0 };
    rows.forEach(r => {
      const st = r.status ?? "absen";
      if (st === "hadir")          s.hadir++;
      else if (st === "terlambat") { s.hadir++; s.terlambat++; }
      else if (st === "izin")      s.izin++;
      else                         s.absen++;
    });
    setSummary(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("employees").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => {
        if (data?.id) {
          setEmployeeId(data.id);
          fetchTodayRecord(data.id);
        }
      });
  }, [user, fetchTodayRecord]);

  useEffect(() => {
    if (!employeeId) return;
    fetchMonthRecords(employeeId, selectedMonth);
  }, [employeeId, selectedMonth, fetchMonthRecords]);

  const handleClockIn = async () => {
    if (!employeeId) return;
    setActionLoading(true);
    const nowTs = new Date().toISOString();
    const status = isLate(new Date()) ? "terlambat" : "hadir";
    const { data, error } = await (supabase as any)
      .from("attendance_records")
      .insert({
        employee_id: employeeId,
        attendance_date: todayStr,
        check_in_time: nowTs,
        status,
        is_manual: false,
      })
      .select("id, attendance_date, check_in_time, check_out_time, status, is_manual, notes")
      .single();
    setActionLoading(false);
    if (error) {
      toast.error("Gagal clock in. Silakan coba lagi.");
      return;
    }
    setTodayRecord(data);
    toast.success(`Clock in berhasil pukul ${format(new Date(nowTs), "HH:mm")}${status === "terlambat" ? " — tercatat terlambat" : ""}`);
    if (selectedMonth === monthOptions[0].value) fetchMonthRecords(employeeId, selectedMonth);
  };

  const handleClockOut = async () => {
    if (!employeeId || !todayRecord) return;
    setActionLoading(true);
    const nowTs = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from("attendance_records")
      .update({ check_out_time: nowTs })
      .eq("id", todayRecord.id)
      .select("id, attendance_date, check_in_time, check_out_time, status, is_manual, notes")
      .single();
    setActionLoading(false);
    if (error) {
      toast.error("Gagal clock out. Silakan coba lagi.");
      return;
    }
    setTodayRecord(data);
    toast.success(`Clock out berhasil pukul ${format(new Date(nowTs), "HH:mm")}`);
    if (selectedMonth === monthOptions[0].value) fetchMonthRecords(employeeId, selectedMonth);
  };

  const clockedIn  = !!todayRecord?.check_in_time;
  const clockedOut = !!todayRecord?.check_out_time;
  const canClockIn  = !clockedIn;
  const canClockOut = clockedIn && !clockedOut;
  const done        = clockedIn && clockedOut;

  const statCards = [
    { label: "Hari Hadir",  value: summary.hadir,     icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Terlambat",   value: summary.terlambat,  icon: AlertCircle,  color: "text-amber-600 bg-amber-50"    },
    { label: "Absen",       value: summary.absen,      icon: XCircle,      color: "text-red-600 bg-red-50"        },
    { label: "Izin/Sakit",  value: summary.izin,       icon: Calendar,     color: "text-blue-600 bg-blue-50"      },
  ];

  return (
    <ESSLayout title="Absensi">
      <div className="space-y-5">

        {/* ── Clock-in / Clock-out panel ── */}
        <Card className={cn(
          "border shadow-sm overflow-hidden",
          done        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
          : clockedIn ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          :             "border-slate-100 bg-gradient-to-br from-slate-50 to-white"
        )}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-5">

              {/* Live clock */}
              <div className="text-center shrink-0">
                <p className="text-4xl font-bold font-mono tracking-tight text-slate-800 tabular-nums">
                  {format(now, "HH:mm:ss")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {format(now, "EEEE, dd MMMM yyyy", { locale: localeId })}
                </p>
              </div>

              <div className="hidden sm:block w-px h-14 bg-slate-200 shrink-0" />

              {/* Today's status */}
              <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                {todayRecord === undefined ? (
                  <div className="flex justify-center sm:justify-start">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : done ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Hari ini sudah selesai
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-xs text-slate-500">
                      <span className="flex items-center gap-1"><LogIn className="w-3 h-3 text-emerald-500" />Masuk: <span className="font-mono font-medium text-slate-700">{formatTime(todayRecord.check_in_time)}</span></span>
                      <span className="flex items-center gap-1"><LogOut className="w-3 h-3 text-rose-400" />Keluar: <span className="font-mono font-medium text-slate-700">{formatTime(todayRecord.check_out_time)}</span></span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />Durasi: <span className="font-medium text-slate-700">{workDuration(todayRecord.check_in_time, todayRecord.check_out_time)}</span></span>
                    </div>
                    <StatusBadge status={todayRecord.status} />
                  </>
                ) : clockedIn ? (
                  <>
                    <p className="text-sm font-semibold text-amber-700 flex items-center justify-center sm:justify-start gap-1.5">
                      <Clock className="w-4 h-4 animate-pulse" /> Sedang bekerja
                    </p>
                    <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                      <LogIn className="w-3 h-3 text-emerald-500" />
                      Masuk pukul <span className="font-mono font-medium text-slate-700 ml-1">{formatTime(todayRecord!.check_in_time)}</span>
                    </p>
                    <StatusBadge status={todayRecord!.status} />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600">Belum absen hari ini</p>
                    <p className="text-xs text-slate-400">
                      Jam kerja mulai 09:00 — lewat dari itu tercatat terlambat.
                    </p>
                  </>
                )}
              </div>

              {/* Action button */}
              <div className="shrink-0">
                {done ? (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex flex-col items-center justify-center gap-1 border-2 border-emerald-300">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-700">Selesai</span>
                  </div>
                ) : canClockIn ? (
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className={cn(
                      "w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1.5 border-2 font-semibold transition-all select-none",
                      "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 active:scale-95 shadow-lg hover:shadow-emerald-200",
                      actionLoading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {actionLoading
                      ? <Loader2 className="w-7 h-7 animate-spin" />
                      : <LogIn className="w-7 h-7" />}
                    <span className="text-[11px]">Clock In</span>
                  </button>
                ) : canClockOut ? (
                  <button
                    onClick={handleClockOut}
                    disabled={actionLoading}
                    className={cn(
                      "w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1.5 border-2 font-semibold transition-all select-none",
                      "bg-rose-500 border-rose-400 text-white hover:bg-rose-600 active:scale-95 shadow-lg hover:shadow-rose-200",
                      actionLoading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {actionLoading
                      ? <Loader2 className="w-7 h-7 animate-spin" />
                      : <LogOut className="w-7 h-7" />}
                    <span className="text-[11px]">Clock Out</span>
                  </button>
                ) : null}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── Monthly summary + filter ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Riwayat Kehadiran</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rekap absensi per bulan</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Records table */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              Detail Kehadiran
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Belum ada data kehadiran untuk bulan ini
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Tanggal</th>
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map(r => {
                      const isToday = r.attendance_date === todayStr;
                      return (
                        <tr key={r.id} className={cn("transition-colors", isToday ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50/60")}>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="font-medium text-slate-800 flex items-center gap-1.5">
                              {format(parseISO(r.attendance_date), "EEEE", { locale: localeId })}
                              {isToday && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Hari ini</span>}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(parseISO(r.attendance_date), "dd MMM yyyy", { locale: localeId })}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">{formatTime(r.check_in_time)}</td>
                          <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">{formatTime(r.check_out_time)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{workDuration(r.check_in_time, r.check_out_time)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={r.status} />
                            {r.is_manual && <span className="ml-1 text-[10px] text-slate-400">(manual)</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">{r.notes ?? "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </ESSLayout>
  );
}
