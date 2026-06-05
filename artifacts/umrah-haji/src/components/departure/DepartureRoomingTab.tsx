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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  BedDouble, Users, Plus, Trash2, UserPlus, Hotel, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

interface HotelInfo {
  id: string;
  name: string;
  city: string | null;
}

interface DepartureRoomingTabProps {
  departureId: string;
  hotelMakkah: HotelInfo | null;
  hotelMadinah: HotelInfo | null;
}

interface RoomOccupant {
  id: string;
  customer_id: string;
  bed_number: number | null;
  customer: { id: string; full_name: string; gender: string | null } | null;
}

interface RoomAssignment {
  id: string;
  room_number: string;
  room_type: string;
  floor: string | null;
  capacity: number | null;
  hotel: { name: string; city: string | null } | null;
  occupants: RoomOccupant[];
}

interface UnassignedPassenger {
  customer_id: string;
  passenger_type: string;
  customer: { id: string; full_name: string; gender: string | null } | null;
  mahrams: { mahram_name: string; mahram_relation: string }[];
}

export function DepartureRoomingTab({ departureId, hotelMakkah, hotelMadinah }: DepartureRoomingTabProps) {
  const queryClient = useQueryClient();
  const hotels = [hotelMakkah, hotelMadinah].filter(Boolean) as HotelInfo[];
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotels[0]?.id || "");
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomAssignment | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [roomFormData, setRoomFormData] = useState({ room_number: "", room_type: "quad", floor: "" });

  const { data: rooms, isLoading: loadingRooms } = useQuery<RoomAssignment[]>({
    queryKey: ["departure-rooming-rooms", departureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedHotelId) return [];
      const { data, error } = await supabase
        .from("room_assignments")
        .select(`*, hotel:hotels(name, city), occupants:room_occupants(id, customer_id, bed_number, customer:customers(id, full_name, gender))`)
        .eq("departure_id", departureId)
        .eq("hotel_id", selectedHotelId)
        .order("room_number");
      if (error) throw error;
      return data as RoomAssignment[];
    },
    enabled: !!selectedHotelId,
  });

  const { data: unassignedPassengers } = useQuery<UnassignedPassenger[]>({
    queryKey: ["departure-rooming-unassigned", departureId, selectedHotelId],
    queryFn: async () => {
      const { data: passengers, error: pError } = await supabase
        .from("booking_passengers")
        .select(`customer_id, passenger_type, customer:customers(id, full_name, gender), booking:bookings!inner(departure_id)`)
        .eq("booking.departure_id", departureId);
      if (pError) throw pError;

      const { data: assigned, error: aError } = await supabase
        .from("room_occupants")
        .select("customer_id, room:room_assignments!inner(departure_id, hotel_id)")
        .eq("room.departure_id", departureId)
        .eq("room.hotel_id", selectedHotelId);
      if (aError) throw aError;

      const assignedIds = new Set(assigned?.map((a: any) => a.customer_id) || []);
      const unassigned = (passengers || []).filter((p: any) => !assignedIds.has(p.customer_id));

      const customerIds = unassigned.map((p: any) => p.customer_id).filter(Boolean);
      const mahramMap = new Map<string, { mahram_name: string; mahram_relation: string }[]>();
      if (customerIds.length > 0) {
        const { data: mahrams } = await supabase
          .from("customer_mahrams" as any)
          .select("customer_id, mahram_name, mahram_relation")
          .in("customer_id", customerIds);
        (mahrams || []).forEach((m: any) => {
          if (!mahramMap.has(m.customer_id)) mahramMap.set(m.customer_id, []);
          mahramMap.get(m.customer_id)!.push({ mahram_name: m.mahram_name, mahram_relation: m.mahram_relation });
        });
      }

      return unassigned.map((p: any) => ({
        ...p,
        mahrams: mahramMap.get(p.customer_id) || [],
      }));
    },
    enabled: !!selectedHotelId,
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: typeof roomFormData) => {
      const capacity = data.room_type === "single" ? 1 : data.room_type === "double" ? 2 : data.room_type === "triple" ? 3 : 4;
      const { error } = await supabase.from("room_assignments").insert({
        departure_id: departureId,
        hotel_id: selectedHotelId,
        room_number: data.room_number,
        room_type: data.room_type as any,
        floor: data.floor || null,
        capacity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-rooms"] });
      toast.success("Kamar berhasil ditambahkan");
      setAddRoomDialogOpen(false);
      setRoomFormData({ room_number: "", room_type: "quad", floor: "" });
    },
    onError: (e: Error) => toast.error("Gagal tambah kamar: " + e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ roomId, customerIds }: { roomId: string; customerIds: string[] }) => {
      const targetRoom = rooms?.find((r) => r.id === roomId);
      const existingGenders = new Set(
        (targetRoom?.occupants || [])
          .map((o: any) => o.customer?.gender)
          .filter(Boolean)
      );
      const incomingGenders = new Set(
        (unassignedPassengers || [])
          .filter((p) => customerIds.includes(p.customer_id))
          .map((p) => p.customer?.gender)
          .filter(Boolean)
      );
      const allGenders = new Set([...existingGenders, ...incomingGenders]);
      if (allGenders.size > 1) {
        const proceed = window.confirm(
          "Peringatan: Kamar ini akan berisi jamaah dengan gender berbeda (Pria & Wanita). " +
          "Hal ini hanya diperbolehkan untuk pasangan mahram. Lanjutkan?"
        );
        if (!proceed) throw new Error("Penempatan dibatalkan oleh admin (validasi gender).");
      }
      const rows = customerIds.map(cid => ({ room_assignment_id: roomId, customer_id: cid }));
      const { error } = await supabase.from("room_occupants").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-unassigned"] });
      setSelectedCustomerIds([]);
      toast.success("Jamaah berhasil ditempatkan");
    },
    onError: (e: Error) => toast.error("Gagal menempatkan jamaah: " + e.message),
  });

  const removeOccupantMutation = useMutation({
    mutationFn: async (occupantId: string) => {
      const { error } = await supabase.from("room_occupants").delete().eq("id", occupantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-unassigned"] });
      toast.success("Jamaah dipindahkan dari kamar");
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("room_assignments").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-rooming-rooms"] });
      toast.success("Kamar berhasil dihapus");
    },
  });

  const totalRooms = rooms?.length || 0;
  const totalCapacity = rooms?.reduce((s, r) => s + (r.capacity ?? 0), 0) || 0;
  const totalOccupied = rooms?.reduce((s, r) => s + (r.occupants?.length || 0), 0) || 0;

  const getRoomTypeBadgeColor = (type: string) => {
    switch (type) {
      case "single": return "bg-purple-50 text-purple-700 border-purple-200";
      case "double": return "bg-blue-50 text-blue-700 border-blue-200";
      case "triple": return "bg-green-50 text-green-700 border-green-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = { single: "Single (1)", double: "Double (2)", triple: "Triple (3)", quad: "Quad (4)" };
    return labels[type] || type;
  };

  const getPassengerTypeLabel = (type: string) => {
    const labels: Record<string, string> = { adult: "Dewasa", child: "Anak", infant: "Bayi" };
    return labels[type] || type;
  };

  if (!hotelMakkah && !hotelMadinah) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Hotel className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p>Belum ada hotel yang dikonfigurasi untuk keberangkatan ini.</p>
        <p className="text-sm mt-1">Edit keberangkatan untuk menambahkan hotel Makkah/Madinah.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Kelola penempatan kamar untuk setiap hotel pada keberangkatan ini.
            Data disinkronkan dengan menu <Link to="/operational/rooming" className="text-primary hover:underline inline-flex items-center gap-1">Kamar &amp; Rooming <ExternalLink className="h-3 w-3" /></Link>.
          </p>
        </div>
      </div>

      {hotels.length > 1 ? (
        <Tabs value={selectedHotelId} onValueChange={setSelectedHotelId}>
          <TabsList>
            {hotels.map(h => (
              <TabsTrigger key={h.id} value={h.id}>
                <Hotel className="h-4 w-4 mr-2" />
                {h.name} <span className="text-muted-foreground ml-1 text-xs">({h.city})</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {hotels.map(h => (
            <TabsContent key={h.id} value={h.id}>
              <RoomContent
                rooms={rooms}
                loadingRooms={loadingRooms}
                totalRooms={totalRooms}
                totalCapacity={totalCapacity}
                totalOccupied={totalOccupied}
                unassignedCount={unassignedPassengers?.length || 0}
                onAddRoom={() => setAddRoomDialogOpen(true)}
                onOpenAssign={(room) => { setSelectedRoom(room); setSelectedCustomerIds([]); setAssignDialogOpen(true); }}
                onRemoveOccupant={(id) => removeOccupantMutation.mutate(id)}
                onDeleteRoom={(id) => deleteRoomMutation.mutate(id)}
                deleteLoading={deleteRoomMutation.isPending}
                removeLoading={removeOccupantMutation.isPending}
                getRoomTypeLabel={getRoomTypeLabel}
                getRoomTypeBadgeColor={getRoomTypeBadgeColor}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <RoomContent
          rooms={rooms}
          loadingRooms={loadingRooms}
          totalRooms={totalRooms}
          totalCapacity={totalCapacity}
          totalOccupied={totalOccupied}
          unassignedCount={unassignedPassengers?.length || 0}
          onAddRoom={() => setAddRoomDialogOpen(true)}
          onOpenAssign={(room) => { setSelectedRoom(room); setSelectedCustomerIds([]); setAssignDialogOpen(true); }}
          onRemoveOccupant={(id) => removeOccupantMutation.mutate(id)}
          onDeleteRoom={(id) => deleteRoomMutation.mutate(id)}
          deleteLoading={deleteRoomMutation.isPending}
          removeLoading={removeOccupantMutation.isPending}
          getRoomTypeLabel={getRoomTypeLabel}
          getRoomTypeBadgeColor={getRoomTypeBadgeColor}
        />
      )}

      {/* Add Room Dialog */}
      <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kamar Baru</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>No. Kamar</Label>
              <Input value={roomFormData.room_number} onChange={e => setRoomFormData(p => ({ ...p, room_number: e.target.value }))} placeholder="cth: 101, 202A" />
            </div>
            <div className="space-y-2">
              <Label>Tipe Kamar</Label>
              <Select value={roomFormData.room_type} onValueChange={v => setRoomFormData(p => ({ ...p, room_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single (1 orang)</SelectItem>
                  <SelectItem value="double">Double (2 orang)</SelectItem>
                  <SelectItem value="triple">Triple (3 orang)</SelectItem>
                  <SelectItem value="quad">Quad (4 orang)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lantai</Label>
              <Input value={roomFormData.floor} onChange={e => setRoomFormData(p => ({ ...p, floor: e.target.value }))} placeholder="cth: 3, G, B1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoomDialogOpen(false)}>Batal</Button>
            <Button onClick={() => addRoomMutation.mutate(roomFormData)} disabled={addRoomMutation.isPending || !roomFormData.room_number}>
              Tambah Kamar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Passenger Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Kamar {selectedRoom?.room_number} — {getRoomTypeLabel(selectedRoom?.room_type || "")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kapasitas terisi: {selectedRoom?.occupants?.length || 0}/{selectedRoom?.capacity || 0}</span>
              {selectedCustomerIds.length > 0 && (
                <Badge variant="secondary">{selectedCustomerIds.length} dipilih</Badge>
              )}
            </div>
            {(unassignedPassengers?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Semua jamaah sudah terassign atau tidak ada jamaah untuk keberangkatan ini.</p>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {unassignedPassengers?.map(p => {
                    const isSelected = selectedCustomerIds.includes(p.customer_id);
                    const slotsLeft = (selectedRoom?.capacity ?? 0) - (selectedRoom?.occupants?.length ?? 0);
                    const wouldExceed = !isSelected && selectedCustomerIds.length >= slotsLeft;
                    return (
                      <label
                        key={p.customer_id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border-primary/30" : wouldExceed ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={wouldExceed}
                          onCheckedChange={checked => {
                            setSelectedCustomerIds(prev =>
                              checked ? [...prev, p.customer_id] : prev.filter(id => id !== p.customer_id)
                            );
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{p.customer?.full_name}</span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {p.customer?.gender === "male" ? "L" : "P"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {getPassengerTypeLabel(p.passenger_type)}
                            </Badge>
                          </div>
                          {p.mahrams.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Mahram: {p.mahrams.map(m => `${m.mahram_name} (${m.mahram_relation})`).join(", ")}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Tutup</Button>
            <Button
              onClick={() => {
                if (selectedRoom && selectedCustomerIds.length > 0) {
                  assignMutation.mutate({ roomId: selectedRoom.id, customerIds: selectedCustomerIds });
                  setAssignDialogOpen(false);
                }
              }}
              disabled={assignMutation.isPending || selectedCustomerIds.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Tempatkan {selectedCustomerIds.length > 0 ? `(${selectedCustomerIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RoomContentProps {
  rooms: RoomAssignment[] | undefined;
  loadingRooms: boolean;
  totalRooms: number;
  totalCapacity: number;
  totalOccupied: number;
  unassignedCount: number;
  onAddRoom: () => void;
  onOpenAssign: (room: RoomAssignment) => void;
  onRemoveOccupant: (id: string) => void;
  onDeleteRoom: (id: string) => void;
  deleteLoading: boolean;
  removeLoading: boolean;
  getRoomTypeLabel: (t: string) => string;
  getRoomTypeBadgeColor: (t: string) => string;
}

const ROOM_TYPES = ["single", "double", "triple", "quad"] as const;

const ROOM_TYPE_CONFIG: Record<string, { label: string; capacity: number; bar: string; bg: string; text: string; border: string }> = {
  single: { label: "Single",  capacity: 1, bar: "bg-purple-500", bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  double: { label: "Double",  capacity: 2, bar: "bg-blue-500",   bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  triple: { label: "Triple",  capacity: 3, bar: "bg-green-500",  bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  quad:   { label: "Quad",    capacity: 4, bar: "bg-amber-500",  bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
};

function OccupancySummary({ rooms }: { rooms: RoomAssignment[] | undefined }) {
  const stats = ROOM_TYPES.map((type) => {
    const typeRooms = (rooms || []).filter((r) => r.room_type === type);
    if (typeRooms.length === 0) return null;
    const totalBeds  = typeRooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
    const filledBeds = typeRooms.reduce((s, r) => s + (r.occupants?.length || 0), 0);
    const available  = totalBeds - filledBeds;
    const pct        = totalBeds > 0 ? Math.round((filledBeds / totalBeds) * 100) : 0;
    const cfg        = ROOM_TYPE_CONFIG[type];
    return { type, ...cfg, rooms: typeRooms.length, totalBeds, filledBeds, available, pct };
  }).filter(Boolean) as NonNullable<ReturnType<typeof ROOM_TYPES["map"]>[number]>[];

  // Gender split across all rooms
  const allOccupants = (rooms || []).flatMap((r) => r.occupants || []);
  const maleCount   = allOccupants.filter((o) => o.customer?.gender === "male").length;
  const femaleCount = allOccupants.filter((o) => o.customer?.gender === "female").length;
  const totalOccupants = allOccupants.length;

  if (stats.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ringkasan Hunian</p>

      {/* Per-type breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(stats as any[]).map((s: any) => (
          <div key={s.type} className={`rounded-lg border p-3 space-y-2 ${s.bg} ${s.border}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
              <span className={`text-[11px] font-semibold ${s.text}`}>{s.rooms} kamar</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-white/70 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.bar}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium">
              <span className={s.text}>{s.filledBeds} terisi</span>
              <span className="text-muted-foreground">{s.available} kosong</span>
            </div>
            <p className={`text-[10px] ${s.text} opacity-80`}>{s.totalBeds} tempat tidur · {s.pct}% penuh</p>
          </div>
        ))}
      </div>

      {/* Gender split */}
      {totalOccupants > 0 && (
        <div className="border-t pt-3 flex items-center gap-6 flex-wrap">
          <p className="text-xs text-muted-foreground font-medium">Komposisi Jamaah:</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs">Laki-laki: <strong>{maleCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-400" />
            <span className="text-xs">Perempuan: <strong>{femaleCount}</strong></span>
          </div>
          {totalOccupants - maleCount - femaleCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="text-xs">Tidak diketahui: <strong>{totalOccupants - maleCount - femaleCount}</strong></span>
            </div>
          )}
          {/* Gender mismatch warning */}
          {maleCount !== femaleCount && totalOccupants > 1 && (
            <span className="ml-auto text-[11px] text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              ⚠ Jumlah L/P tidak seimbang — periksa penempatan mahram
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RoomContent({
  rooms, loadingRooms, totalRooms, totalCapacity, totalOccupied, unassignedCount,
  onAddRoom, onOpenAssign, onRemoveOccupant, onDeleteRoom,
  deleteLoading, removeLoading, getRoomTypeLabel, getRoomTypeBadgeColor,
}: RoomContentProps) {
  const fillPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top stats bar */}
      <div className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Total Kamar</p>
            <p className="text-2xl font-bold">{totalRooms}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Terisi / Kapasitas</p>
            <p className="text-2xl font-bold">
              {totalOccupied}
              <span className="text-muted-foreground font-normal text-lg">/{totalCapacity}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tingkat Hunian</p>
            <p className={`text-2xl font-bold ${fillPct >= 90 ? "text-emerald-600" : fillPct >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>
              {fillPct}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Belum Assign</p>
            <p className={`text-2xl font-bold ${unassignedCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{unassignedCount}</p>
          </div>
        </div>
        <Button onClick={onAddRoom} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Tambah Kamar
        </Button>
      </div>

      {/* Occupancy summary card */}
      {!loadingRooms && <OccupancySummary rooms={rooms} />}

      {loadingRooms ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[200px]" />)}
        </div>
      ) : !rooms || rooms.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <BedDouble className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Belum ada kamar yang ditambahkan.</p>
          <Button variant="outline" onClick={onAddRoom} className="mt-4">
            <Plus className="h-4 w-4 mr-2" /> Tambah Kamar Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => {
            const occupiedSlots = room.occupants?.length || 0;
            const cap = room.capacity ?? 0;
            const isFull = occupiedSlots >= cap;
            return (
              <Card key={room.id} className={`overflow-hidden ${isFull ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BedDouble className="h-5 w-5 text-muted-foreground" />
                      Kamar {room.room_number}
                    </CardTitle>
                    {room.floor && <p className="text-xs text-muted-foreground mt-0.5">Lantai {room.floor}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={`text-[10px] ${getRoomTypeBadgeColor(room.room_type)}`}>
                      {getRoomTypeLabel(room.room_type)}
                    </Badge>
                    <span className={`text-xs font-semibold ${isFull ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {occupiedSlots}/{cap}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all ${isFull ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (occupiedSlots / (cap || 1)) * 100)}%` }}
                    />
                  </div>
                  <ScrollArea className="h-[100px] pr-2">
                    {room.occupants?.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Belum ada penghuni</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {room.occupants?.map(occ => (
                          <li key={occ.id} className="flex items-center justify-between text-xs bg-background border rounded px-2 py-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${occ.customer?.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                                {occ.customer?.gender === "male" ? "L" : "P"}
                              </span>
                              {occ.customer?.full_name || "-"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:bg-destructive/10"
                              onClick={() => onRemoveOccupant(occ.id)}
                              disabled={removeLoading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => onOpenAssign(room)}
                      disabled={isFull}
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Tambah Jamaah
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteRoom(room.id)}
                      disabled={deleteLoading || occupiedSlots > 0}
                      title={occupiedSlots > 0 ? "Kosongkan kamar dulu sebelum menghapus" : "Hapus kamar"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
