import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plane, Users, CheckCircle2, Clock, XCircle, RefreshCcw,
  MapPin, Search, Radio, AlertCircle, QrCode, Luggage, Navigation
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const CHECKIN_STATUS: Record<string, { label: string; color: string; variant: any }> = {
  not_checked: { label: "Belum", color: "text-slate-400", variant: "secondary" },
  checked_in: { label: "Hadir", color: "text-emerald-600", variant: "default" },
  absent: { label: "Absen", color: "text-red-500", variant: "destructive" },
  delayed: { label: "Terlambat", color: "text-amber-500", variant: "outline" },
};

const FLIGHT_STATUS = [
  { value: "scheduled", label: "Terjadwal", color: "bg-blue-100 text-blue-800" },
  { value: "boarding", label: "Boarding", color: "bg-amber-100 text-amber-800" },
  { value: "departed", label: "Berangkat", color: "bg-green-100 text-green-800" },
  { value: "arrived", label: "Tiba", color: "bg-emerald-100 text-emerald-800" },
  { value: "delayed", label: "Delay", color: "bg-red-100 text-red-800" },
  { value: "cancelled", label: "Dibatalkan", color: "bg-red-200 text-red-900" },
];

export default function AdminDepartureTracking() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [search, setSearch] = useState("");
  const [checkinFilter, setCheckinFilter] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [flightStatus, setFlightStatus] = useState("scheduled");

  const { data: departures = [] } = useQuery({
    queryKey: ["departures-tracking"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, flight_number, package:packages(name), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const departure = departures.find((d: any) => d.id === selectedDeparture) as any;

  const { data: passengers = [], isLoading: loadingPassengers, refetch } = useQuery({
    queryKey: ["tracking-passengers", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, seat_number, room_number,
          customer:customers(id, full_name, phone, passport_number, passport_expiry),
          booking:bookings!inner(
            id, booking_code, booking_status, payment_status, total_price, paid_amount,
            departure_id, agent:agents(company_name)
          )
        `)
        .eq("booking.departure_id" as any, selectedDeparture)
        .neq("booking.booking_status" as any, "cancelled");
      if (error) throw error;

      const seen = new Set<string>();
      const list: any[] = [];
      (data || []).forEach((row: any) => {
        const key = `${row.booking?.id}-${row.customer?.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            ...row,
            checkin_status: "not_checked",
          });
        }
      });
      return list;
    },
  });

  const autoRefresh = useEffect(() => {
    if (!selectedDeparture) return;
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDeparture, refetch]);

  const filtered = passengers.filter((p: any) => {
    const matchSearch = !search ||
      p.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.passport_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.booking?.booking_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = checkinFilter === "all" || p.checkin_status === checkinFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: passengers.length,
    checkedIn: passengers.filter((p: any) => p.checkin_status === "checked_in").length,
    absent: passengers.filter((p: any) => p.checkin_status === "absent").length,
    notChecked: passengers.filter((p: any) => p.checkin_status === "not_checked").length,
    paidFull: passengers.filter((p: any) => p.booking?.payment_status === "paid").length,
  };

  const checkinProgress = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  const daysUntil = departure?.departure_date
    ? differenceInDays(new Date(departure.departure_date), new Date())
    : null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Navigation className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tracking Keberangkatan</h1>
            <p className="text-muted-foreground text-sm">Monitor real-time status kehadiran & keberangkatan jamaah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedDeparture && (
            <p className="text-xs text-muted-foreground">
              Refresh otomatis tiap 30 detik · Terakhir: {format(lastRefresh, "HH:mm:ss")}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={() => { refetch(); setLastRefresh(new Date()); }}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Departure Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
                <SelectContent>
                  {departures.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.package?.name} — {format(new Date(d.departure_date), "dd MMM yyyy", { locale: idLocale })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {departure && (
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md">
                  <Plane className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{departure.flight_number || "No Flight"}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span>{departure.hotel_makkah?.name || "Hotel TBD"}</span>
                </div>
                {daysUntil !== null && (
                  <Badge variant={daysUntil < 0 ? "default" : daysUntil <= 3 ? "destructive" : "secondary"}>
                    {daysUntil < 0 ? `Sudah ${Math.abs(daysUntil)} hari lalu` : daysUntil === 0 ? "Hari ini!" : `${daysUntil} hari lagi`}
                  </Badge>
                )}

                <Select value={flightStatus} onValueChange={setFlightStatus}>
                  <SelectTrigger className="w-[160px] h-9">
                    <Radio className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLIGHT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Jamaah", value: stats.total, icon: Users, color: "text-primary" },
              { label: "Hadir", value: stats.checkedIn, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Belum Check-in", value: stats.notChecked, icon: Clock, color: "text-amber-500" },
              { label: "Absen", value: stats.absent, icon: XCircle, color: "text-red-500" },
              { label: "Lunas Bayar", value: stats.paidFull, icon: Luggage, color: "text-blue-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <s.icon className={`h-6 w-6 ${s.color} flex-shrink-0`} />
                    <div>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Check-in Progress */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress Check-in</span>
                <span className="text-muted-foreground">{stats.checkedIn}/{stats.total} jamaah</span>
              </div>
              <Progress value={checkinProgress} className="h-3" />
              <p className="text-xs text-muted-foreground">{checkinProgress}% jamaah sudah check-in</p>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Cari nama / paspor / booking..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={checkinFilter} onValueChange={setCheckinFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(CHECKIN_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Passenger Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nama Jamaah</TableHead>
                    <TableHead>No. Paspor</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Agen</TableHead>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Bayar</TableHead>
                    <TableHead>Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPassengers ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">Memuat data jamaah...</TableCell></TableRow>
                  ) : !filtered.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada data jamaah</TableCell></TableRow>
                  ) : filtered.map((p: any, i: number) => (
                    <TableRow key={p.id} className={p.checkin_status === "absent" ? "bg-red-50/50" : p.checkin_status === "checked_in" ? "bg-emerald-50/50" : ""}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.customer?.phone || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.customer?.passport_number || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.booking?.booking_code || "-"}</TableCell>
                      <TableCell className="text-sm">{p.booking?.agent?.company_name || "Pusat"}</TableCell>
                      <TableCell className="text-sm">{p.room_number || p.seat_number || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={p.booking?.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                          {p.booking?.payment_status === "paid" ? "Lunas" : "Belum Lunas"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={CHECKIN_STATUS[p.checkin_status]?.variant || "secondary"} className="text-xs">
                          {CHECKIN_STATUS[p.checkin_status]?.label || "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDeparture && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Pilih Keberangkatan</h3>
            <p className="text-muted-foreground text-sm max-w-md">Pilih jadwal keberangkatan dari dropdown di atas untuk melihat status real-time jamaah.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
