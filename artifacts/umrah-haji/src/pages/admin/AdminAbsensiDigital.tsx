import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Clock, Users, Search, RefreshCcw,
  Plane, FileSpreadsheet, UserCheck, AlertCircle, CalendarDays
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const SESSION_TYPES = [
  { value: "keberangkatan", label: "Check-in Keberangkatan" },
  { value: "kedatangan", label: "Tiba di Hotel" },
  { value: "sholat_berjamaah", label: "Sholat Berjamaah" },
  { value: "ziarah", label: "Ziarah & City Tour" },
  { value: "manasik", label: "Manasik" },
  { value: "makan", label: "Makan Bersama" },
  { value: "bus", label: "Naik Bus" },
  { value: "lainnya", label: "Sesi Lainnya" },
];

type AttendanceStatus = "hadir" | "absen" | "terlambat" | "izin";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; cls: string; icon: any }> = {
  hadir:     { label: "Hadir",     cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  absen:     { label: "Absen",     cls: "bg-red-100 text-red-800 border-red-200",             icon: XCircle },
  terlambat: { label: "Terlambat", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: Clock },
  izin:      { label: "Izin",      cls: "bg-blue-100 text-blue-800 border-blue-200",          icon: AlertCircle },
};

export default function AdminAbsensiDigital() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [sessionType, setSessionType] = useState("keberangkatan");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Departures
  const { data: departures = [] } = useQuery({
    queryKey: ["absensi-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  // Passengers for this departure
  const { data: passengers = [], isLoading: loadingPassengers, refetch } = useQuery({
    queryKey: ["absensi-passengers", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status,
          customer:profiles(id, full_name, phone, gender)
        `)
        .eq("departure_id", selectedDeparture)
        .not("booking_status", "eq", "cancelled");
      if (error) throw error;
      return (data || []).map((b: any) => ({
        bookingId: b.id,
        bookingCode: b.booking_code,
        customerId: b.customer?.id,
        fullName: b.customer?.full_name || "-",
        phone: b.customer?.phone || null,
        gender: b.customer?.gender || null,
      }));
    },
  });

  // Attendance records for this session
  const { data: attendanceRecords = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["absensi-records", selectedDeparture, sessionType, sessionDate],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, customer_id, status, notes, checked_at")
        .eq("departure_id", selectedDeparture)
        .eq("session_type", sessionType)
        .eq("attendance_date", sessionDate);
      if (error) return [];
      return data || [];
    },
  });

  // Build combined list
  const combined = useMemo(() => {
    return (passengers as any[]).map((p: any) => {
      const rec = (attendanceRecords as any[]).find((r: any) => r.customer_id === p.customerId);
      return { ...p, attendance: rec || null, status: rec?.status as AttendanceStatus | null };
    }).filter((p: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.fullName.toLowerCase().includes(q) || p.bookingCode?.toLowerCase().includes(q);
    });
  }, [passengers, attendanceRecords, search]);

  // Summary
  const summary = useMemo(() => {
    const total = combined.length;
    const hadir = combined.filter((p: any) => p.status === "hadir").length;
    const absen = combined.filter((p: any) => p.status === "absen").length;
    const terlambat = combined.filter((p: any) => p.status === "terlambat").length;
    const izin = combined.filter((p: any) => p.status === "izin").length;
    const belum = total - hadir - absen - terlambat - izin;
    return { total, hadir, absen, terlambat, izin, belum };
  }, [combined]);

  // Update / create attendance
  async function setAttendance(customerId: string, departureId: string, status: AttendanceStatus) {
    setUpdatingId(customerId);
    try {
      const existing = (attendanceRecords as any[]).find(r => r.customer_id === customerId);
      if (existing) {
        const { error } = await supabase
          .from("attendance")
          .update({ status, checked_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("attendance")
          .insert({
            customer_id: customerId,
            departure_id: departureId,
            session_type: sessionType,
            attendance_date: sessionDate,
            status,
            checked_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["absensi-records", selectedDeparture, sessionType, sessionDate] });
    } catch (err: any) {
      toast.error("Gagal update absensi");
    } finally {
      setUpdatingId(null);
    }
  }

  // Bulk mark all hadir
  async function markAllHadir() {
    const toMark = combined.filter(p => p.status !== "hadir");
    if (!toMark.length) { toast.info("Semua sudah hadir"); return; }
    let updated = 0;
    for (const p of toMark) {
      if (p.customerId) {
        await setAttendance(p.customerId, selectedDeparture, "hadir");
        updated++;
      }
    }
    toast.success(`${updated} jamaah ditandai hadir`);
  }

  function exportExcel() {
    const rows = combined.map((p: any, i: number) => ({
      "No": i + 1,
      "Nama": p.fullName,
      "Kode Booking": p.bookingCode || "-",
      "Status": p.status ? STATUS_CONFIG[p.status as AttendanceStatus]?.label : "Belum Diisi",
      "Waktu Checkin": (p.attendance as any)?.checked_at ? format(parseISO((p.attendance as any).checked_at), "HH:mm dd/MM/yyyy") : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `absensi-${sessionType}-${sessionDate}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  const isLoading = loadingPassengers || loadingAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Absensi Digital</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Presensi jamaah per sesi — keberangkatan, sholat, ziarah, dan lainnya</p>
        </div>
        <div className="flex gap-2">
          {selectedDeparture && (
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
          )}
        </div>
      </div>

      {/* Session config */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.package?.name} — {d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy", { locale: idLocale }) : "TBD"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Jenis Sesi</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tanggal Sesi</label>
              <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedDeparture ? (
        <div className="py-20 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Pilih keberangkatan untuk memulai absensi</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {!isLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: "Total", value: summary.total, cls: "" },
                { label: "Hadir", value: summary.hadir, cls: "text-emerald-600" },
                { label: "Terlambat", value: summary.terlambat, cls: "text-amber-600" },
                { label: "Izin", value: summary.izin, cls: "text-blue-600" },
                { label: "Absen", value: summary.absen, cls: "text-red-600" },
                { label: "Belum", value: summary.belum, cls: "text-muted-foreground" },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Progress */}
          {!isLoading && summary.total > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={(summary.hadir / summary.total) * 100} className="flex-1 h-2.5" />
              <span className="text-sm font-semibold whitespace-nowrap">
                {summary.hadir}/{summary.total} hadir ({((summary.hadir / summary.total) * 100).toFixed(0)}%)
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau kode booking..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Button size="sm" variant="outline" onClick={markAllHadir} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Tandai Semua Hadir
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : combined.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Tidak ada jamaah ditemukan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Nama Jamaah</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead className="text-center min-w-64">Aksi Cepat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combined.map((p: any, i: number) => {
                        const status = p.status as AttendanceStatus | null;
                        const cfg = status ? STATUS_CONFIG[status] : null;
                        const isUpdating = updatingId === p.customerId;
                        return (
                          <TableRow key={p.bookingId} className={isUpdating ? "opacity-50" : ""}>
                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{p.fullName}</TableCell>
                            <TableCell className="font-mono text-xs">{p.bookingCode || "-"}</TableCell>
                            <TableCell>
                              {cfg ? (
                                <Badge className={`${cfg.cls} border text-[10px] font-medium`}>
                                  <cfg.icon className="h-3 w-3 mr-0.5" />{cfg.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Belum Diisi</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {(p.attendance as any)?.checked_at
                                ? format(parseISO((p.attendance as any).checked_at), "HH:mm", { locale: idLocale })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5 justify-center">
                                {(["hadir", "terlambat", "izin", "absen"] as AttendanceStatus[]).map(s => {
                                  const c = STATUS_CONFIG[s];
                                  const isActive = status === s;
                                  return (
                                    <Button
                                      key={s}
                                      size="sm"
                                      variant={isActive ? "default" : "outline"}
                                      className={`h-7 text-[11px] px-2 ${isActive ? "" : "hover:bg-muted"}`}
                                      onClick={() => p.customerId && setAttendance(p.customerId, selectedDeparture, s)}
                                      disabled={isUpdating}
                                    >
                                      {c.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
