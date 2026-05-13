import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, MapPin, CheckCircle2, XCircle, AlertCircle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUSES = ["hadir", "sakit", "izin", "hilang"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_BADGE: Record<Status, { label: string; cls: string; Icon: any }> = {
  hadir:  { label: "Hadir",  cls: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  sakit:  { label: "Sakit",  cls: "bg-amber-100 text-amber-800",     Icon: AlertCircle },
  izin:   { label: "Izin",   cls: "bg-blue-100 text-blue-800",        Icon: AlertCircle },
  hilang: { label: "Hilang", cls: "bg-red-100 text-red-800",          Icon: XCircle },
};

/**
 * KEP-FIX5 — Absensi Harian Jamaah di Tanah Suci
 * Daily roll-call selama keberangkatan (per tanggal).
 */
export default function AdminAbsensiHarianTanahSuci() {
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [location, setLocation] = useState("Mekkah");

  const { data: departures = [] } = useQuery({
    queryKey: ["active-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, status, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: jamaahList = [], isLoading } = useQuery({
    queryKey: ["jamaah-of-departure", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, customer:customers(id, full_name, phone)")
        .eq("departure_id", departureId)
        .not("booking_status", "in", "(cancelled,refunded)");
      const customers = (bookings || []).map((b: any) => b.customer).filter(Boolean);
      // dedupe
      const map = new Map<string, any>();
      customers.forEach((c: any) => map.set(c.id, c));
      return Array.from(map.values());
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["daily-attendance", departureId, date],
    enabled: !!departureId && !!date,
    queryFn: async () => {
      const { data } = await supabase
        .from("jamaah_daily_attendance")
        .select("*")
        .eq("departure_id", departureId)
        .eq("attendance_date", date);
      return data || [];
    },
  });

  const existingMap = useMemo(() => {
    const m = new Map<string, any>();
    existing.forEach((e: any) => m.set(e.customer_id, e));
    return m;
  }, [existing]);

  const upsert = useMutation({
    mutationFn: async ({ customer_id, status }: { customer_id: string; status: Status }) => {
      const { error } = await supabase.from("jamaah_daily_attendance").upsert(
        {
          departure_id: departureId,
          customer_id,
          attendance_date: date,
          status,
          location,
        },
        { onConflict: "departure_id,customer_id,attendance_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Absensi disimpan");
      qc.invalidateQueries({ queryKey: ["daily-attendance", departureId, date] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan"),
  });

  const stats = useMemo(() => {
    const counts: Record<string, number> = { hadir: 0, sakit: 0, izin: 0, hilang: 0 };
    existing.forEach((e: any) => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return { ...counts, total: jamaahList.length, recorded: existing.length };
  }, [existing, jamaahList.length]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Absensi Harian Tanah Suci
        </h1>
        <p className="text-muted-foreground text-sm">
          Roll-call jamaah per tanggal selama keberangkatan.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Keberangkatan</label>
            <Select value={departureId} onValueChange={setDepartureId}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>
                {departures.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.package?.name || "Paket"} — {d.departure_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tanggal</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Lokasi
            </label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mekkah">Mekkah</SelectItem>
                <SelectItem value="Madinah">Madinah</SelectItem>
                <SelectItem value="Mina">Mina</SelectItem>
                <SelectItem value="Arafah">Arafah</SelectItem>
                <SelectItem value="Muzdalifah">Muzdalifah</SelectItem>
                <SelectItem value="Jeddah">Jeddah</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 inline mr-1" />
              Tercatat: {stats.recorded}/{stats.total}
            </div>
          </div>
        </CardContent>
      </Card>

      {departureId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUSES.map((s) => {
            const cfg = STATUS_BADGE[s];
            return (
              <Card key={s}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <cfg.Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">{cfg.label}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats[s] || 0}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Daftar Jamaah</CardTitle></CardHeader>
        <CardContent>
          {!departureId ? (
            <p className="text-center text-muted-foreground py-12">Pilih keberangkatan terlebih dahulu.</p>
          ) : isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : jamaahList.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Tidak ada jamaah.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Status Saat Ini</TableHead>
                    <TableHead className="text-right">Tandai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jamaahList.map((c: any) => {
                    const cur = existingMap.get(c.id);
                    const curStatus = (cur?.status || null) as Status | null;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone || "-"}</TableCell>
                        <TableCell>
                          {curStatus ? (
                            <Badge className={STATUS_BADGE[curStatus].cls}>
                              {STATUS_BADGE[curStatus].label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {STATUSES.map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={curStatus === s ? "default" : "outline"}
                                disabled={upsert.isPending}
                                onClick={() => upsert.mutate({ customer_id: c.id, status: s })}
                              >
                                {STATUS_BADGE[s].label}
                              </Button>
                            ))}
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
    </div>
  );
}