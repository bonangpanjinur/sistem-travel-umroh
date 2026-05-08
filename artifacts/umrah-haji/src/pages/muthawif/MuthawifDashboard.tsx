import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, MapPin, MessageSquare, CheckCircle2, Phone,
  CalendarDays, Clock, AlertCircle, Search, Star, User,
  Navigation, RefreshCcw
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function MuthawifDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Get muthawif profile by user email
  const { data: muthawif } = useQuery({
    queryKey: ["muthawif-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawifs")
        .select("*")
        .eq("email", user!.email)
        .maybeSingle();
      return data;
    },
  });

  // Upcoming / active departures for this muthawif
  const { data: departures = [], isLoading: loadingDep, refetch } = useQuery({
    queryKey: ["muthawif-departures", muthawif?.id],
    enabled: !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, flight_number, status,
          package:packages(name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
          bookings:bookings(id, booking_status, customer:profiles(full_name, phone, gender))
        `)
        .eq("muthawif_id", muthawif.id)
        .order("departure_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const activeDeparture = departures.find((d: any) => d.status === "ongoing" || d.status === "scheduled") as any;

  // Passengers for active departure
  const passengers = activeDeparture?.bookings?.filter((b: any) => b.booking_status !== "cancelled") || [];

  const filteredPassengers = passengers.filter((b: any) =>
    !search || b.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.customer?.phone?.includes(search)
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Dashboard Muthawif</h1>
            <p className="text-xs text-muted-foreground">{muthawif?.name || "..."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={muthawif?.is_active ? "default" : "secondary"} className="text-[10px]">
              {muthawif?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Profile card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20 flex-shrink-0">
                {muthawif?.name?.charAt(0) || "M"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{muthawif?.name || "-"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {muthawif?.experience_years || 0} tahun pengalaman
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{muthawif?.phone || muthawif?.email || "-"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Keberangkatan</p>
                <p className="text-2xl font-bold">{departures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active departure */}
        {loadingDep ? (
          <Skeleton className="h-32 w-full" />
        ) : activeDeparture ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Keberangkatan Aktif
                </CardTitle>
                <Badge className={
                  activeDeparture.status === "ongoing" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                  "bg-blue-100 text-blue-800 border border-blue-200"
                }>
                  {activeDeparture.status === "ongoing" ? "Sedang Berlangsung" : "Terjadwal"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{activeDeparture.package?.name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Berangkat</p>
                  <p className="font-medium">
                    {activeDeparture.departure_date
                      ? format(parseISO(activeDeparture.departure_date), "dd MMM yyyy", { locale: idLocale })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kembali</p>
                  <p className="font-medium">
                    {activeDeparture.return_date
                      ? format(parseISO(activeDeparture.return_date), "dd MMM yyyy", { locale: idLocale })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Penerbangan</p>
                  <p className="font-medium font-mono">{activeDeparture.flight_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hotel Makkah</p>
                  <p className="font-medium">{activeDeparture.hotel_makkah?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Jamaah</p>
                  <p className="font-medium">{passengers.length} orang</p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/admin/absensi">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Absensi
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to={`/admin/manifest`}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Manifest
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/jamaah/chat">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/admin/wa-blast">
                    <Navigation className="h-3.5 w-3.5 mr-1.5" /> Broadcast WA
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada keberangkatan aktif</p>
            </CardContent>
          </Card>
        )}

        {/* Jamaah list */}
        {activeDeparture && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daftar Jamaah ({passengers.length})</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau nomor HP..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPassengers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Tidak ada hasil</div>
              ) : (
                <div className="divide-y">
                  {filteredPassengers.map((b: any, i: number) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{b.customer?.full_name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{b.customer?.phone || "No HP tidak tersedia"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${b.customer?.gender === "male" || b.customer?.gender === "laki-laki" ? "border-blue-300 text-blue-700" : "border-pink-300 text-pink-700"}`}>
                          {b.customer?.gender === "male" || b.customer?.gender === "laki-laki" ? "L" : "P"}
                        </Badge>
                        {b.customer?.phone && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                            <a href={`https://wa.me/${b.customer.phone.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noopener noreferrer">
                              <Phone className="h-3.5 w-3.5 text-green-600" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All departures history */}
        {departures.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riwayat Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jamaah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures.map((dep: any) => (
                    <TableRow key={dep.id}>
                      <TableCell className="text-sm font-medium">{dep.package?.name || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {dep.departure_date ? format(parseISO(dep.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${
                          dep.status === "completed" ? "bg-gray-100 text-gray-600 border-gray-200" :
                          dep.status === "ongoing" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                          dep.status === "cancelled" ? "bg-red-100 text-red-700 border-red-200" :
                          "bg-blue-100 text-blue-700 border-blue-200"
                        }`}>
                          {dep.status || "Terjadwal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{dep.bookings?.filter((b: any) => b.booking_status !== "cancelled").length || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
