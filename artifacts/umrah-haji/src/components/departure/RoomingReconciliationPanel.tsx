import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCcw,
  BedDouble, Users, Zap, Info
} from "lucide-react";

interface Props {
  departureId: string;
}

interface PassengerRoomState {
  customer_id: string;
  full_name: string;
  gender: string | null;
  room_number_makkah: string | null;
  room_number_madinah: string | null;
  assignment_makkah: string | null;
  assignment_madinah: string | null;
  status: "synced" | "mismatch_makkah" | "mismatch_madinah" | "no_assignment" | "no_booking_room";
}

function statusConfig(s: PassengerRoomState["status"]) {
  switch (s) {
    case "synced":
      return { label: "Sinkron", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, iconClass: "text-emerald-600" };
    case "mismatch_makkah":
    case "mismatch_madinah":
      return { label: "Tidak Sinkron", color: "bg-amber-100 text-amber-800", icon: AlertTriangle, iconClass: "text-amber-600" };
    case "no_assignment":
      return { label: "Belum Assign", color: "bg-blue-100 text-blue-800", icon: BedDouble, iconClass: "text-blue-500" };
    case "no_booking_room":
      return { label: "Di Room, Tanpa Booking", color: "bg-purple-100 text-purple-800", icon: Info, iconClass: "text-purple-500" };
  }
}

export function RoomingReconciliationPanel({ departureId }: Props) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const { data: passengers, isLoading: loadingP } = useQuery({
    queryKey: ["rooming-recon-passengers", departureId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booking_passengers")
        .select(`
          customer_id,
          room_number_makkah,
          room_number_madinah,
          customer:customers(id, full_name, gender),
          booking:bookings!inner(departure_id)
        `)
        .eq("booking.departure_id", departureId);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: occupants, isLoading: loadingO } = useQuery({
    queryKey: ["rooming-recon-occupants", departureId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("room_occupants")
        .select(`
          customer_id,
          room:room_assignments!inner(
            departure_id, room_number,
            hotel:hotels(city)
          )
        `)
        .eq("room.departure_id", departureId);
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = loadingP || loadingO;

  const reconciled: PassengerRoomState[] = (() => {
    if (!passengers || !occupants) return [];

    const makkahMap = new Map<string, string>();
    const madinahMap = new Map<string, string>();
    occupants.forEach((o: any) => {
      const city = o.room?.hotel?.city?.toLowerCase() || "";
      if (city.includes("makkah") || city.includes("mekkah")) {
        makkahMap.set(o.customer_id, o.room?.room_number);
      } else {
        madinahMap.set(o.customer_id, o.room?.room_number);
      }
    });

    return passengers.map((p: any): PassengerRoomState => {
      const cid = p.customer_id;
      const assignMakkah  = makkahMap.get(cid) || null;
      const assignMadinah = madinahMap.get(cid) || null;
      const bookMakkah    = p.room_number_makkah  || null;
      const bookMadinah   = p.room_number_madinah || null;

      let status: PassengerRoomState["status"] = "synced";

      if (!assignMakkah && !assignMadinah) {
        status = "no_assignment";
      } else if (
        (assignMakkah  && bookMakkah  && assignMakkah  !== bookMakkah ) ||
        (assignMadinah && bookMadinah && assignMadinah !== bookMadinah)
      ) {
        status = assignMakkah !== bookMakkah ? "mismatch_makkah" : "mismatch_madinah";
      } else if (!bookMakkah && !bookMadinah && (assignMakkah || assignMadinah)) {
        status = "no_booking_room";
      }

      return {
        customer_id:       cid,
        full_name:         p.customer?.full_name || "N/A",
        gender:            p.customer?.gender || null,
        room_number_makkah:  bookMakkah,
        room_number_madinah: bookMadinah,
        assignment_makkah:   assignMakkah,
        assignment_madinah:  assignMadinah,
        status,
      };
    });
  })();

  const counts = {
    synced:      reconciled.filter((r) => r.status === "synced").length,
    mismatch:    reconciled.filter((r) => r.status.startsWith("mismatch")).length,
    no_assign:   reconciled.filter((r) => r.status === "no_assignment").length,
    no_booking:  reconciled.filter((r) => r.status === "no_booking_room").length,
  };

  const pct = reconciled.length
    ? Math.round((counts.synced / reconciled.length) * 100)
    : 0;

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const mismatches = reconciled.filter((r) => r.status.startsWith("mismatch"));
      const noBK       = reconciled.filter((r) => r.status === "no_booking_room");

      const updates = [...mismatches, ...noBK].map((r) => ({
        customer_id: r.customer_id,
        room_number_makkah:  r.assignment_makkah  || r.room_number_makkah,
        room_number_madinah: r.assignment_madinah || r.room_number_madinah,
      }));

      for (const upd of updates) {
        const { data: bps } = await (supabase as any)
          .from("booking_passengers")
          .select("id, booking:bookings!inner(departure_id)")
          .eq("customer_id", upd.customer_id)
          .eq("booking.departure_id", departureId);

        if (!bps?.length) continue;
        await (supabase as any)
          .from("booking_passengers")
          .update({
            room_number_makkah:  upd.room_number_makkah,
            room_number_madinah: upd.room_number_madinah,
          })
          .eq("id", bps[0].id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooming-recon-passengers", departureId] });
      toast.success("Rekonsiliasi selesai — semua kamar sudah sinkron");
    },
    onError: (e: any) => toast.error("Gagal rekonsiliasi: " + e.message),
  });

  const filtered = activeTab === "all"
    ? reconciled
    : activeTab === "mismatch"
    ? reconciled.filter((r) => r.status.startsWith("mismatch"))
    : activeTab === "no_assign"
    ? reconciled.filter((r) => r.status === "no_assignment")
    : reconciled.filter((r) => r.status === "synced");

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sinkron",       count: counts.synced,   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Tidak Sinkron", count: counts.mismatch, color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"   },
          { label: "Belum Assign",  count: counts.no_assign,color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"     },
          { label: "Total",         count: reconciled.length, color: "text-gray-700",  bg: "bg-gray-50 border-gray-200"     },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border`}>
            <CardContent className="pt-3 pb-2 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Sinkronisasi Kamar</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Reconcile action */}
      {(counts.mismatch > 0 || counts.no_booking > 0) && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 text-sm">
              {counts.mismatch} kamar tidak sinkron antara dua sistem. Klik "Rekonsiliasi" untuk menyamakan data.
            </span>
            <Button
              size="sm"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              className="ml-3 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {reconcileMutation.isPending
                ? <RefreshCcw className="h-3.5 w-3.5 animate-spin mr-1" />
                : <Zap className="h-3.5 w-3.5 mr-1" />
              }
              Rekonsiliasi Otomatis
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {counts.mismatch === 0 && counts.no_assign === 0 && reconciled.length > 0 && (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 text-sm">
            Semua data kamar sudah sinkron antara kedua sistem ✅
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="all"       className="text-xs h-7">Semua ({reconciled.length})</TabsTrigger>
          <TabsTrigger value="mismatch"  className="text-xs h-7">Tidak Sinkron ({counts.mismatch})</TabsTrigger>
          <TabsTrigger value="no_assign" className="text-xs h-7">Belum Assign ({counts.no_assign})</TabsTrigger>
          <TabsTrigger value="synced"    className="text-xs h-7">Sinkron ({counts.synced})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-3">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">Jamaah</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Makkah (BP)</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Makkah (RA)</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Madinah (BP)</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Madinah (RA)</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const cfg = statusConfig(r.status);
                    const Icon = cfg.icon;
                    return (
                      <tr key={r.customer_id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.gender === "female" ? "Perempuan" : "Laki-laki"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {r.room_number_makkah || "—"}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <code className={`text-xs px-1.5 py-0.5 rounded ${
                            r.assignment_makkah && r.room_number_makkah && r.assignment_makkah !== r.room_number_makkah
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted"
                          }`}>
                            {r.assignment_makkah || "—"}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {r.room_number_madinah || "—"}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <code className={`text-xs px-1.5 py-0.5 rounded ${
                            r.assignment_madinah && r.room_number_madinah && r.assignment_madinah !== r.room_number_madinah
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted"
                          }`}>
                            {r.assignment_madinah || "—"}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={`${cfg.color} border-0 text-xs`}>
                            <Icon className={`h-3 w-3 mr-1 ${cfg.iconClass}`} />
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            BP = booking_passengers.room_number · RA = room_assignments/room_occupants
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
