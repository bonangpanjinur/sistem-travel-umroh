import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { BedDouble, Users, ExternalLink, Hotel, UserCheck, UserX, AlertTriangle } from "lucide-react";

const ROOM_TYPE_LABELS: Record<string, string> = {
  quad: "Quad (4 org)",
  triple: "Triple (3 org)",
  double: "Double (2 org)",
  single: "Single (1 org)",
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  quad: "bg-blue-100 text-blue-800 border-blue-200",
  triple: "bg-green-100 text-green-800 border-green-200",
  double: "bg-purple-100 text-purple-800 border-purple-200",
  single: "bg-orange-100 text-orange-800 border-orange-200",
};

interface Props {
  departureId: string;
  packageId?: string;
}

export function DepartureRoomingTab({ departureId, packageId }: Props) {
  const { data: roomData, isLoading } = useQuery({
    queryKey: ["departure-room-assignments", departureId],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from("room_assignments")
        .select(`
          id, room_number, room_type, capacity, notes,
          hotel:hotels(id, name, city),
          occupants:room_occupants(
            id, customer_id,
            customer:customers(id, full_name, gender, phone, passport_number)
          )
        `)
        .eq("departure_id", departureId)
        .order("room_number");
      if (error) throw error;
      return assignments || [];
    },
    enabled: !!departureId,
  });

  const { data: unassignedPassengers } = useQuery({
    queryKey: ["departure-unassigned-passengers", departureId],
    queryFn: async () => {
      const assignedCustomerIds: string[] = [];
      if (roomData) {
        roomData.forEach((r: any) => {
          (r.occupants || []).forEach((o: any) => {
            if (o.customer_id) assignedCustomerIds.push(o.customer_id);
          });
        });
      }

      const { data: passengers, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, passenger_type, room_preference,
          customer:customers(id, full_name, gender, phone),
          booking:bookings!inner(id, booking_code, departure_id)
        `)
        .eq("booking.departure_id", departureId);
      if (error) throw error;

      const all = passengers || [];
      if (assignedCustomerIds.length === 0) return all;
      return all.filter((p: any) => !assignedCustomerIds.includes(p.customer?.id));
    },
    enabled: !!departureId && !!roomData,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const grouped = (roomData || []).reduce((acc: Record<string, any[]>, room: any) => {
    const hotelName = room.hotel?.name || "Hotel Tidak Diketahui";
    if (!acc[hotelName]) acc[hotelName] = [];
    acc[hotelName].push(room);
    return acc;
  }, {});

  const totalRooms = roomData?.length || 0;
  const totalAssigned = (roomData || []).reduce(
    (sum: number, r: any) => sum + (r.occupants?.length || 0),
    0
  );
  const totalUnassigned = unassignedPassengers?.length || 0;

  const roomingUrl = packageId
    ? `/admin/room-assignments?package=${packageId}&departure=${departureId}`
    : `/admin/room-assignments`;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Data Kamar Keberangkatan Ini
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Data dari tabel room_assignments — sumber kebenaran kamar hotel
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={roomingUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Kelola di Kamar &amp; Rooming
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <BedDouble className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-black">{totalRooms}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Kamar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-black text-emerald-700">{totalAssigned}</p>
              <p className="text-xs text-muted-foreground font-medium">Sudah Ditempatkan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-black text-amber-700">{totalUnassigned}</p>
              <p className="text-xs text-muted-foreground font-medium">Belum Ditempatkan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned warning */}
      {totalUnassigned > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                {totalUnassigned} jamaah belum ditempatkan di kamar
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Gunakan menu Kamar &amp; Rooming untuk mengatur penempatan kamar hotel.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(unassignedPassengers || []).slice(0, 8).map((p: any) => (
                  <Badge key={p.id} variant="outline" className="border-amber-300 bg-white text-amber-700 text-xs">
                    {p.customer?.full_name || "-"}
                  </Badge>
                ))}
                {totalUnassigned > 8 && (
                  <Badge variant="outline" className="border-amber-300 bg-white text-amber-700 text-xs">
                    +{totalUnassigned - 8} lainnya
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No rooms yet */}
      {totalRooms === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada kamar yang dibuat</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buat kamar dan tempatkan jamaah lewat menu Kamar &amp; Rooming.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to={roomingUrl}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka Kamar &amp; Rooming
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Per hotel sections */}
      {Object.entries(grouped).map(([hotelName, rooms]: [string, any[]]) => (
        <div key={hotelName} className="space-y-3">
          <div className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold">{hotelName}</h4>
            <Badge variant="secondary">{rooms.length} kamar</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room: any) => {
              const occupants = room.occupants || [];
              const capacity = room.capacity || 1;
              const isFull = occupants.length >= capacity;
              const isEmpty = occupants.length === 0;

              return (
                <Card
                  key={room.id}
                  className={`border-2 transition-all ${
                    isEmpty
                      ? "border-dashed border-muted-foreground/30 bg-muted/10"
                      : isFull
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-amber-200 bg-amber-50/30"
                  }`}
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm ${
                            isEmpty
                              ? "bg-muted text-muted-foreground"
                              : isFull
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {room.room_number || "?"}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${ROOM_TYPE_COLORS[room.room_type] || ""}`}
                        >
                          {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {occupants.length}/{capacity}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {isEmpty ? (
                      <p className="text-xs text-muted-foreground italic">Kamar kosong</p>
                    ) : (
                      <div className="space-y-1.5">
                        {occupants.map((o: any, idx: number) => (
                          <div
                            key={o.id}
                            className="flex items-center gap-2 text-xs bg-background rounded-md px-2 py-1.5 border"
                          >
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                o.customer?.gender === "male"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-pink-100 text-pink-700"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span className="font-medium truncate flex-1">
                              {o.customer?.full_name || "-"}
                            </span>
                            <span className="text-muted-foreground shrink-0">
                              {o.customer?.gender === "male" ? "L" : "P"}
                            </span>
                          </div>
                        ))}
                        {/* Empty slots */}
                        {Array.from({ length: Math.max(0, capacity - occupants.length) }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5 border border-dashed border-muted-foreground/30 bg-muted/20"
                          >
                            <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" />
                            <span className="text-muted-foreground italic">Slot kosong</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {room.notes && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic border-t pt-1">
                        {room.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer CTA */}
      {totalRooms > 0 && (
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to={roomingUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka Halaman Lengkap Kamar &amp; Rooming
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
