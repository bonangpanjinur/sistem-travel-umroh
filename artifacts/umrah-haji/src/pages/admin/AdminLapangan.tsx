import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Radio, Users, AlertTriangle, Megaphone, MapPin,
  RefreshCw, ChevronRight, Activity, CheckCircle2, Clock
} from "lucide-react";

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  open:     { label: "Buka",          color: "text-blue-700",   dot: "bg-blue-500" },
  active:   { label: "Aktif",         color: "text-emerald-700",dot: "bg-emerald-500" },
  departed: { label: "Berangkat",     color: "text-purple-700", dot: "bg-purple-500" },
  full:     { label: "Penuh",         color: "text-amber-700",  dot: "bg-amber-500" },
  closed:   { label: "Ditutup",       color: "text-slate-500",  dot: "bg-slate-400" },
};

const MSG_TYPE_COLOR: Record<string, string> = {
  emergency:      "text-red-600",
  warning:        "text-amber-600",
  program_update: "text-emerald-600",
  info:           "text-blue-600",
};

export default function AdminLapangan() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-lapangan-overview"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/v1/guide/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat data lapangan");
      return res.json();
    },
  });

  const departures: any[] = data?.departures || [];

  const totalSOS = departures.reduce((sum, d) => sum + Number(d.active_sos || 0), 0);
  const totalBerangkat = departures.filter(d => d.status === "departed").length;
  const totalAktif = departures.filter(d => d.status === "active").length;
  const totalJamaah = departures.reduce((sum, d) => sum + Number(d.booked_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-emerald-600" />
            Monitor Lapangan
          </h1>
          <p className="text-muted-foreground text-sm">Pantau semua rombongan aktif secara real-time</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Rombongan Aktif", value: departures.length,    icon: Activity,       color: "text-blue-600" },
          { label: "Sedang Jalan",    value: totalBerangkat,       icon: CheckCircle2,   color: "text-purple-600" },
          { label: "Total Jamaah",    value: totalJamaah,          icon: Users,          color: "text-emerald-600" },
          { label: "SOS Aktif",       value: totalSOS,             icon: AlertTriangle,  color: totalSOS > 0 ? "text-red-600" : "text-slate-400" },
        ].map(s => (
          <Card key={s.label} className={totalSOS > 0 && s.label === "SOS Aktif" ? "border-red-300 bg-red-50" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rombongan Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-40 bg-gray-50" /></Card>
          ))}
        </div>
      ) : departures.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Radio className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Tidak ada rombongan aktif saat ini</p>
            <p className="text-sm text-muted-foreground mt-1">Rombongan dengan status open/active/departed akan muncul di sini</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departures.map((dep: any) => {
            const sm = STATUS_META[dep.status] || STATUS_META.open;
            const hasSOS = Number(dep.active_sos) > 0;
            const hasGuide = Number(dep.active_guide_locations) > 0;
            const attPct = dep.last_session_attendance_pct != null ? Number(dep.last_session_attendance_pct) : null;

            return (
              <Card key={dep.id} className={`hover:shadow-md transition-shadow ${hasSOS ? "border-red-400 shadow-red-100" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{dep.package_name || "Paket tidak diketahui"}</p>
                      <p className="text-xs text-muted-foreground">
                        {dep.departure_date ? format(parseISO(dep.departure_date), "d MMM yyyy", { locale: idLocale }) : "—"}
                        {dep.return_date ? ` – ${format(parseISO(dep.return_date), "d MMM yyyy", { locale: idLocale })}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${sm.dot} animate-pulse`} />
                      <span className={`text-xs font-medium ${sm.color}`}>{sm.label}</span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <strong className="text-foreground">{dep.booked_count ?? 0}</strong> jamaah
                    </span>
                    {attPct !== null && (
                      <span className={`flex items-center gap-1 ${attPct < 70 ? "text-amber-600" : "text-emerald-600"}`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {attPct}% hadir
                      </span>
                    )}
                    {hasGuide && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <MapPin className="h-3 w-3" />
                        Guide online
                      </span>
                    )}
                  </div>

                  {/* Alerts */}
                  {hasSOS && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <strong>{dep.active_sos} SOS aktif!</strong>
                    </div>
                  )}

                  {/* Last Broadcast */}
                  {dep.last_broadcast_title && (
                    <div className="text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Megaphone className={`h-3 w-3 ${MSG_TYPE_COLOR[dep.last_broadcast_type] || "text-blue-600"}`} />
                        <span className="truncate max-w-[160px]">{dep.last_broadcast_title}</span>
                        {dep.last_broadcast_at && (
                          <span className="text-muted-foreground/60 flex-shrink-0">
                            · {formatDistanceToNow(parseISO(dep.last_broadcast_at), { locale: idLocale, addSuffix: true })}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <Link to={`/admin/lapangan/${dep.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8">
                      Detail Rombongan <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
