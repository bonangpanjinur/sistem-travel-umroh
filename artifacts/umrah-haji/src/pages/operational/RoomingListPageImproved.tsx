import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BedDouble, Users, Plus, Trash2, UserPlus,
  Download, Hotel, Filter, GripVertical, Printer, FileSpreadsheet, FileText
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type DepartureRow = Database["public"]["Tables"]["departures"]["Row"];
type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type HotelRow = Database["public"]["Tables"]["hotels"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type RoomAssignmentRow = Database["public"]["Tables"]["room_assignments"]["Row"];
type RoomOccupantRow = Database["public"]["Tables"]["room_occupants"]["Row"];

interface ExtendedRoomAssignment extends RoomAssignmentRow {
  hotel?: Pick<HotelRow, "name" | "city"> | null;
  occupants?: (RoomOccupantRow & {
    customer?: Pick<CustomerRow, "id" | "full_name" | "gender"> | null;
  })[];
}

interface ExtendedDeparture extends DepartureRow {
  package: Pick<PackageRow, "name"> | null;
  hotel_makkah: Pick<HotelRow, "id" | "name" | "city"> | null;
  hotel_madinah: Pick<HotelRow, "id" | "name" | "city"> | null;
}

interface ExtendedDeparturePassenger {
  customer_id: string;
  customer: Pick<CustomerRow, "id" | "full_name" | "gender" | "mahram_name" | "mahram_relation"> | null;
  booking: { departure_id: string } | null;
}

// ============================================================
// IMPROVED ROOMING LIST PAGE WITH FLEXIBLE ROOM GROUPS
// ============================================================

const getRoomCapacity = (roomType: string): number => {
  switch (roomType) {
    case 'single': return 1;
    case 'double': return 2;
    case 'triple': return 3;
    case 'quad': return 4;
    default: return 4;
  }
};

const getRoomTypeLabel = (roomType: string): string => {
  const labels: Record<string, string> = {
    single: 'Single',
    double: 'Double',
    triple: 'Triple',
    quad: 'Quad',
  };
  return labels[roomType] || roomType;
};

export default function RoomingListPageImproved() {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [assignPassengerDialogOpen, setAssignPassengerDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ExtendedRoomAssignment | null>(null);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<Set<string>>(new Set());
  const [roomFormData, setRoomFormData] = useState({
    room_number: "",
    room_type: "quad",
    floor: "",
  });

  // Get upcoming departures
  const { data: departures } = useQuery<ExtendedDeparture[]>({
    queryKey: ["operational-departures-rooming-improved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          id,
          departure_date,
          package:packages(name),
          hotel_makkah_id,
          hotel_madinah_id,
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, city),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, city)
        `)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data as ExtendedDeparture[];
    },
  });

  // Get rooms for selected departure and hotel
  const { data: rooms, isLoading: loadingRooms } = useQuery<ExtendedRoomAssignment[]>({
    queryKey: ["room-assignments-improved", selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId || !selectedHotelId) return [];
      const { data, error } = await supabase
        .from("room_assignments")
        .select(`
          *,
          hotel:hotels(name, city),
          occupants:room_occupants(
            id,
            customer_id,
            bed_number,
            customer:customers(id, full_name, gender)
          )
        `)
        .eq("departure_id", selectedDepartureId)
        .eq("hotel_id", selectedHotelId)
        .order("room_number");
      if (error) throw error;
      return data as ExtendedRoomAssignment[];
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  // Get unassigned passengers for this departure (from booking_passengers with room_group_id)
  const { data: unassignedPassengers } = useQuery<ExtendedDeparturePassenger[]>({
    queryKey: ["unassigned-passengers-improved", selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      
      // Get all passengers in this departure
      const { data: passengers, error: pError } = await supabase
        .from("booking_passengers")
        .select(`
          customer_id,
          customer:customers(id, full_name, gender, mahram_name, mahram_relation),
          booking:bookings!inner(departure_id)
        `)
        .eq("booking.departure_id", selectedDepartureId);
      if (pError) throw pError;

      // Get assigned passengers from room_occupants
      const { data: assigned, error: aError } = await supabase
        .from("room_occupants")
        .select("customer_id, room:room_assignments!inner(departure_id, hotel_id)")
        .eq("room.departure_id", selectedDepartureId)
        .eq("room.hotel_id", selectedHotelId);
      if (aError) throw aError;

      const assignedIds = new Set(assigned?.map(a => a.customer_id) || []);
      return passengers?.filter(p => !assignedIds.has(p.customer_id)) as ExtendedDeparturePassenger[] || [];
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: typeof roomFormData) => {
      const capacity = getRoomCapacity(data.room_type);
      const { error } = await supabase
        .from("room_assignments")
        .insert({
          departure_id: selectedDepartureId,
          hotel_id: selectedHotelId,
          room_number: data.room_number,
          room_type: data.room_type as Database["public"]["Enums"]["room_type"],
          floor: data.floor || null,
          capacity,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      toast.success("✅ Kamar berhasil ditambahkan");
      setAddRoomDialogOpen(false);
      setRoomFormData({ room_number: "", room_type: "quad", floor: "" });
    },
    onError: (error: Error) => {
      toast.error("❌ Gagal menambah kamar: " + error.message);
    },
  });

  const assignPassengerMutation = useMutation({
    mutationFn: async ({ roomId, customerIds }: { roomId: string; customerIds: string[] }) => {
      // Validate capacity
      const room = rooms?.find(r => r.id === roomId);
      if (!room) throw new Error("Kamar tidak ditemukan");

      const currentOccupants = room.occupants?.length || 0;
      const capacity = room.capacity || 4;

      if (currentOccupants + customerIds.length > capacity) {
        throw new Error(
          `Kamar "${room.room_number}" sudah penuh. ` +
          `Sisa slot: ${capacity - currentOccupants}, dipilih: ${customerIds.length}`
        );
      }

      const rows = customerIds.map(cid => ({ room_assignment_id: roomId, customer_id: cid }));
      const { error } = await supabase.from("room_occupants").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers-improved"] });
      toast.success(`✅ ${variables.customerIds.length} jamaah berhasil ditempatkan`);
      setSelectedPassengerIds(new Set());
    },
    onError: (error: Error) => {
      toast.error("❌ Gagal menempatkan jamaah: " + error.message);
    },
  });

  const removeOccupantMutation = useMutation({
    mutationFn: async (occupantId: string) => {
      const { error } = await supabase
        .from("room_occupants")
        .delete()
        .eq("id", occupantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers-improved"] });
      toast.success("✅ Jamaah dipindahkan dari kamar");
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("room_assignments")
        .delete()
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      toast.success("✅ Kamar berhasil dihapus");
    },
  });

  const selectedDeparture = departures?.find(d => d.id === selectedDepartureId);
  const hotels = selectedDeparture ? [
    selectedDeparture.hotel_makkah,
    selectedDeparture.hotel_madinah,
  ].filter(Boolean) : [];

  const totalRooms = rooms?.length || 0;
  const totalOccupied = rooms?.reduce((sum, r) => sum + (r.occupants?.length || 0), 0) || 0;
  const totalCapacity = rooms?.reduce((sum, r) => sum + (r.capacity || 0), 0) || 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Penempatan Kamar (Flexible Rooming)</h1>
        <p className="text-muted-foreground">Kelola penempatan jamaah ke kamar dengan multi-select teman sekamar</p>
      </div>

      {/* Departure & Hotel Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Keberangkatan & Hotel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="departure">Keberangkatan</Label>
            <Select value={selectedDepartureId} onValueChange={(v) => { setSelectedDepartureId(v); setSelectedHotelId(""); }}>
              <SelectTrigger id="departure">
                <SelectValue placeholder="Pilih Keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                {departures?.map((dep) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })} - {dep.package?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hotel">Hotel</Label>
            <Select
              value={selectedHotelId}
              onValueChange={setSelectedHotelId}
              disabled={!selectedDepartureId || hotels.length === 0}
            >
              <SelectTrigger id="hotel">
                <SelectValue placeholder="Pilih Hotel" />
              </SelectTrigger>
              <SelectContent>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel?.id} value={hotel?.id || ""}>
                    {hotel?.name} ({hotel?.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDepartureId && selectedHotelId && (
        <>
          {/* Room Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                Total Kamar
              </CardTitle>
              <Button size="sm" onClick={() => setAddRoomDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Kamar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRooms}</div>
              <p className="text-xs text-muted-foreground">
                {totalOccupied} terisi dari {totalCapacity} kapasitas
              </p>
            </CardContent>
          </Card>

          {/* Rooms Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[250px] w-full" />
              ))
            ) : rooms?.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Belum ada kamar yang ditambahkan untuk hotel ini.
              </p>
            ) : (
              rooms?.map((room) => (
                <Card key={room.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BedDouble className="h-5 w-5" />
                      Kamar {room.room_number}
                    </CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {getRoomTypeLabel(room.room_type)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground">Lantai: {room.floor || "-"}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Kapasitas: {room.occupants?.length || 0}/{room.capacity}
                    </p>
                    
                    {/* Occupants List */}
                    <div className="flex-1 mb-4">
                      <h4 className="text-sm font-semibold mb-2">Penghuni</h4>
                      <ScrollArea className="h-[100px] pr-4">
                        {room.occupants?.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Belum ada penghuni.</p>
                        ) : (
                          <ul className="space-y-1">
                            {room.occupants?.map((occupant) => (
                              <li key={occupant.id} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1">
                                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                                  {occupant.customer?.full_name} ({occupant.customer?.gender === "male" ? "L" : "P"})
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOccupantMutation.mutate(occupant.id)}
                                  disabled={removeOccupantMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </ScrollArea>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedRoom(room);
                          setAssignPassengerDialogOpen(true);
                        }}
                        disabled={(room.occupants?.length || 0) >= (room.capacity ?? 0)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" /> Tambah
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => deleteRoomMutation.mutate(room.id)}
                        disabled={deleteRoomMutation.isPending || (room.occupants?.length || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Room Dialog */}
      <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kamar Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room_number" className="text-right">No. Kamar</Label>
              <Input
                id="room_number"
                value={roomFormData.room_number}
                onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room_type" className="text-right">Tipe Kamar</Label>
              <Select
                value={roomFormData.room_type}
                onValueChange={(value) => setRoomFormData({ ...roomFormData, room_type: value })}
              >
                <SelectTrigger id="room_type" className="col-span-3">
                  <SelectValue placeholder="Pilih Tipe Kamar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single (1 orang)</SelectItem>
                  <SelectItem value="double">Double (2 orang)</SelectItem>
                  <SelectItem value="triple">Triple (3 orang)</SelectItem>
                  <SelectItem value="quad">Quad (4 orang)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floor" className="text-right">Lantai</Label>
              <Input
                id="floor"
                value={roomFormData.floor}
                onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => addRoomMutation.mutate(roomFormData)}
              disabled={addRoomMutation.isPending || !roomFormData.room_number}
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Passenger Dialog */}
      <Dialog open={assignPassengerDialogOpen} onOpenChange={(open) => { setAssignPassengerDialogOpen(open); if (!open) setSelectedPassengerIds(new Set()); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Jamaah ke Kamar {selectedRoom?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {/* Capacity Info */}
            {selectedRoom && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                <Users className="h-3.5 w-3.5" />
                <span>
                  Kapasitas: {selectedRoom.capacity} orang · Terisi: {selectedRoom.occupants?.length || 0} · 
                  Sisa: {(selectedRoom.capacity || 0) - (selectedRoom.occupants?.length || 0)}
                </span>
              </div>
            )}

            <h4 className="text-sm font-semibold mb-2">Pilih Jamaah (multi-pilih)</h4>
            <ScrollArea className="h-[260px] pr-2">
              {!unassignedPassengers || unassignedPassengers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Semua jamaah sudah ditempatkan.</p>
              ) : (
                <div className="space-y-1.5">
                  {unassignedPassengers.map((p) => {
                    const isChecked = selectedPassengerIds.has(p.customer_id);
                    return (
                      <div
                        key={p.customer_id}
                        className={`rounded-lg border transition-colors ${isChecked ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted/50'}`}
                      >
                        <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer w-full">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedPassengerIds);
                              if (checked) next.add(p.customer_id);
                              else next.delete(p.customer_id);
                              setSelectedPassengerIds(next);
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium leading-tight">{p.customer?.full_name || '-'}</span>
                              {p.customer?.gender && (
                                <Badge variant={p.customer.gender === 'male' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                                  {p.customer.gender === 'male' ? 'L' : 'P'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            {selectedPassengerIds.size > 0 && (
              <p className="text-xs text-primary mt-2 font-medium">✅ {selectedPassengerIds.size} jamaah dipilih</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setAssignPassengerDialogOpen(false); setSelectedPassengerIds(new Set()); }}>
              Batal
            </Button>
            <Button
              onClick={() => selectedRoom && selectedPassengerIds.size > 0 && assignPassengerMutation.mutate({ roomId: selectedRoom.id, customerIds: Array.from(selectedPassengerIds) })}
              disabled={assignPassengerMutation.isPending || selectedPassengerIds.size === 0 || !selectedRoom}
            >
              {assignPassengerMutation.isPending ? 'Menyimpan...' : `Tempatkan (${selectedPassengerIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
