import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Clock, LogIn, LogOut, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
  total_hari_kerja: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "-";
  }
}

function duration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "-";
  try {
    const diff = parseISO(checkOut).getTime() - parseISO(checkIn).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}j ${m}m`;
  } catch {
    return "-";
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hadir:    { label: "Hadir",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  terlambat:{ label: "Terlambat",color: "bg-amber-50 text-amber-700 border-amber-200",       icon: AlertCircle  },
  absen:    { label: "Absen",    color: "bg-red-50 text-red-700 border-red-200",             icon: XCircle      },
  izin:     { label: "Izin",     color: "bg-blue-50 text-blue-700 border-blue-200",          icon: Calendar     },
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "absen";
  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG["absen"];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: localeId }),
    });
  }
  return opts;
}

export default function ESSAbsensi() {
  const { user } = useAuth();
  const monthOptions = buildMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({ hadir: 0, terlambat: 0, absen: 0, izin: 0, total_hari_kerja: 0 });
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => setEmployeeId(data?.id ?? null));
  }, [user]);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
    const end   = format(endOfMonth(new Date(year, month - 1)),   "yyyy-MM-dd");

    (supabase as any)
      .from("attendance_records")
      .select("id, attendance_date, check_in_time, check_out_time, status, is_manual, notes")
      .eq("employee_id", employeeId)
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date", { ascending: false })
      .then(({ data }: any) => {
        const rows: AttendanceRecord[] = data ?? [];
        setRecords(rows);

        const s: MonthlySummary = { hadir: 0, terlambat: 0, absen: 0, izin: 0, total_hari_kerja: rows.length };
        rows.forEach(r => {
          const st = r.status ?? "absen";
          if (st === "hadir")     s.hadir++;
          else if (st === "terlambat") { s.hadir++; s.terlambat++; }
          else if (st === "izin") s.izin++;
          else                    s.absen++;
        });
        setSummary(s);
        setLoading(false);
      });
  }, [employeeId, selectedMonth]);

  const statCards = [
    { label: "Hari Hadir",   value: summary.hadir,          icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Terlambat",    value: summary.terlambat,       icon: AlertCircle,  color: "text-amber-600 bg-amber-50"   },
    { label: "Absen",        value: summary.absen,           icon: XCircle,      color: "text-red-600 bg-red-50"       },
    { label: "Izin/Sakit",   value: summary.izin,            icon: Calendar,     color: "text-blue-600 bg-blue-50"     },
  ];

  return (
    <ESSLayout title="Absensi">
      <div className="space-y-5">

        {/* Month picker */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Riwayat Kehadiran</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rekap check-in &amp; check-out bulanan Anda</p>
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

        {/* Summary cards */}
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
                    {records.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-medium text-slate-800">
                            {format(parseISO(r.attendance_date), "EEEE", { locale: localeId })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(parseISO(r.attendance_date), "dd MMM yyyy", { locale: localeId })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                          {formatTime(r.check_in_time)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                          {formatTime(r.check_out_time)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {duration(r.check_in_time, r.check_out_time)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                          {r.is_manual && (
                            <span className="ml-1 text-[10px] text-slate-400">(manual)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">
                          {r.notes ?? "-"}
                        </td>
                      </tr>
                    ))}
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
