import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BedDouble, Users, Plus, Trash2, UserPlus,
  Hotel, Wand2, Loader2, Download, FileSpreadsheet
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import * as XLSX from 'xlsx';

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
  booking: { departure_id: string; room_type?: string } | null;
}

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
    single: 'Single', double: 'Double', triple: 'Triple', quad: 'Quad',
  };
  return labels[roomType] || roomType;
};

export default function RoomingListPageImproved() {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [assignPassengerDialogOpen, setAssignPassengerDialogOpen] = useState(false);
  const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ExtendedRoomAssignment | null>(null);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<Set<string>>(new Set());
  const [autoAssignMode, setAutoAssignMode] = useState<'gender' | 'booking'>('gender');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    room_number: "", room_type: "quad", floor: "",
  });

  const { data: departures } = useQuery<ExtendedDeparture[]>({
    queryKey: ["operational-departures-rooming-improved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          id, departure_date,
          package:packages(name),
          hotel_makkah_id, hotel_madinah_id,
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, city),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, city)
        `)
        .gte("departure_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data as ExtendedDeparture[];
    },
  });

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
            id, customer_id, bed_number,
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

  const { data: unassignedPassengers } = useQuery<ExtendedDeparturePassenger[]>({
    queryKey: ["unassigned-passengers-improved", selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      const { data: passengers, error: pError } = await supabase
        .from("booking_passengers")
        .select(`
          customer_id,
          customer:customers(id, full_name, gender, mahram_name, mahram_relation),
          booking:bookings!inner(departure_id, room_type)
        `)
        .eq("booking.departure_id", selectedDepartureId);
      if (pError) throw pError;

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
      toast.success("Kamar berhasil ditambahkan");
      setAddRoomDialogOpen(false);
      setRoomFormData({ room_number: "", room_type: "quad", floor: "" });
    },
    onError: (error: Error) => toast.error("Gagal menambah kamar: " + error.message),
  });

  const assignPassengerMutation = useMutation({
    mutationFn: async ({ roomId, customerIds }: { roomId: string; customerIds: string[] }) => {
      const room = rooms?.find(r => r.id === roomId);
      if (!room) throw new Error("Kamar tidak ditemukan");
      const currentOccupants = room.occupants?.length || 0;
      const capacity = room.capacity || 4;
      if (currentOccupants + customerIds.length > capacity) {
        throw new Error(`Kamar "${room.room_number}" penuh. Sisa slot: ${capacity - currentOccupants}, dipilih: ${customerIds.length}`);
      }
      const rows = customerIds.map(cid => ({ room_assignment_id: roomId, customer_id: cid }));
      const { error } = await supabase.from("room_occupants").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers-improved"] });
      toast.success(`${variables.customerIds.length} jamaah berhasil ditempatkan`);
      setSelectedPassengerIds(new Set());
      setAssignPassengerDialogOpen(false);
    },
    onError: (error: Error) => toast.error("Gagal menempatkan jamaah: " + error.message),
  });

  const removeOccupantMutation = useMutation({
    mutationFn: async (occupantId: string) => {
      const { error } = await supabase.from("room_occupants").delete().eq("id", occupantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers-improved"] });
      toast.success("Jamaah dipindahkan dari kamar");
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("room_assignments").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      toast.success("Kamar berhasil dihapus");
    },
  });

  const handleAutoAssign = async () => {
    if (!unassignedPassengers?.length) {
      toast.info("Semua jamaah sudah memiliki kamar");
      return;
    }
    if (!rooms?.length) {
      toast.error("Tambahkan kamar terlebih dahulu sebelum auto-assign");
      return;
    }

    setIsAutoAssigning(true);
    try {
      const availableRooms = rooms
        .filter(r => (r.occupants?.length || 0) < (r.capacity || 4))
        .map(r => ({
          ...r,
          remaining: (r.capacity || 4) - (r.occupants?.length || 0),
        }));

      if (!availableRooms.length) {
        toast.error("Tidak ada kamar yang tersedia (semua penuh)");
        setIsAutoAssigning(false);
        return;
      }

      let passengers = [...unassignedPassengers];

      if (autoAssignMode === 'gender') {
        passengers.sort((a, b) => {
          const gA = a.customer?.gender || 'unknown';
          const gB = b.customer?.gender || 'unknown';
          return gA.localeCompare(gB);
        });
      } else {
        passengers.sort((a, b) => {
          const rtA = (a.booking as any)?.room_type || 'quad';
          const rtB = (b.booking as any)?.room_type || 'quad';
          return rtA.localeCompare(rtB);
        });
      }

      const assignments: { roomId: string; customerIds: string[] }[] = [];
      let roomIdx = 0;
      let currentBatch: string[] = [];
      let currentCapacity = availableRooms[roomIdx]?.remaining || 0;
      let currentGender: string | null = null;

      for (const passenger of passengers) {
        if (roomIdx >= availableRooms.length) break;
        const room = availableRooms[roomIdx];
        const pGender = passenger.customer?.gender || 'unknown';

        if (autoAssignMode === 'gender' && currentGender && currentGender !== pGender && currentBatch.length > 0) {
          assignments.push({ roomId: room.id, customerIds: [...currentBatch] });
          currentBatch = [];
          roomIdx++;
          if (roomIdx >= availableRooms.length) break;
          currentCapacity = availableRooms[roomIdx].remaining;
          currentGender = null;
        }

        if (currentBatch.length === 0) currentGender = pGender;

        if (currentBatch.length < currentCapacity) {
          currentBatch.push(passenger.customer_id);
        } else {
          if (currentBatch.length > 0) {
            assignments.push({ roomId: room.id, customerIds: [...currentBatch] });
          }
          roomIdx++;
          if (roomIdx >= availableRooms.length) break;
          currentCapacity = availableRooms[roomIdx].remaining;
          currentBatch = [passenger.customer_id];
          currentGender = pGender;
        }
      }

      if (currentBatch.length > 0 && roomIdx < availableRooms.length) {
        assignments.push({ roomId: availableRooms[roomIdx].id, customerIds: currentBatch });
      }

      let totalAssigned = 0;
      for (const assignment of assignments) {
        const rows = assignment.customerIds.map(cid => ({
          room_assignment_id: assignment.roomId,
          customer_id: cid,
        }));
        const { error } = await supabase.from("room_occupants").insert(rows);
        if (!error) totalAssigned += assignment.customerIds.length;
      }

      queryClient.invalidateQueries({ queryKey: ["room-assignments-improved"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers-improved"] });
      toast.success(`Auto-assign selesai: ${totalAssigned} jamaah berhasil ditempatkan`);
      setAutoAssignDialogOpen(false);
    } catch (err: any) {
      toast.error("Gagal auto-assign: " + err?.message);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const exportRoomingExcel = () => {
    if (!rooms?.length || !selectedDeparture) return;
    const rows: any[] = [];
    rooms.forEach(room => {
      (room.occupants || []).forEach((occ, idx) => {
        rows.push({
          'No. Kamar': room.room_number,
          'Tipe': getRoomTypeLabel(room.room_type),
          'Lantai': room.floor || '-',
          'Hotel': (room.hotel as any)?.name || '-',
          'No': idx + 1,
          'Nama Jamaah': occ.customer?.full_name || '-',
          'L/P': occ.customer?.gender === 'male' ? 'L' : 'P',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [10, 10, 8, 22, 5, 30, 5].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rooming List');
    const dep = departures?.find(d => d.id === selectedDepartureId);
    XLSX.writeFile(wb, `RoomingList-${dep?.package?.name || 'Keberangkatan'}-${selectedDepartureId}.xlsx`);
    toast.success('Rooming List Excel berhasil di-download');
  };

  const selectedDeparture = departures?.find(d => d.id === selectedDepartureId);
  const hotels = selectedDeparture ? [
    selectedDeparture.hotel_makkah,
    selectedDeparture.hotel_madinah,
  ].filter(Boolean) : [];

  const totalRooms = rooms?.length || 0;
  const totalOccupied = rooms?.reduce((sum, r) => sum + (r.occupants?.length || 0), 0) || 0;
  const totalCapacity = rooms?.reduce((sum, r) => sum + (r.capacity || 0), 0) || 0;
  const unassignedCount = unassignedPassengers?.length || 0;
  const fillPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Penempatan Kamar (Rooming List)</h1>
        <p className="text-muted-foreground">Kelola penempatan jamaah ke kamar — manual atau auto-assign berdasarkan gender</p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Keberangkatan</Label>
            <Select value={selectedDepartureId} onValueChange={(v) => { setSelectedDepartureId(v); setSelectedHotelId(""); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pilih Keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                {departures?.map((dep) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })} — {dep.package?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hotel</Label>
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId} disabled={!selectedDepartureId || hotels.length === 0}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pilih Hotel" />
              </SelectTrigger>
              <SelectContent>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel?.id} value={hotel?.id || ""}>
                    <div className="flex items-center gap-2">
                      <Hotel className="h-3.5 w-3.5" />
                      {hotel?.name} ({hotel?.city})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDepartureId && selectedHotelId && (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Total Kamar", value: totalRooms, color: "text-primary" },
              { label: "Terisi", value: totalOccupied, color: "text-green-600" },
              { label: "Kapasitas", value: totalCapacity, color: "text-blue-600" },
              { label: "Belum Ditempatkan", value: unassignedCount, color: unassignedCount > 0 ? "text-amber-600" : "text-green-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Kapasitas Terisi</span>
                <span className="font-bold text-primary">{totalOccupied}/{totalCapacity} ({fillPct}%)</span>
              </div>
              <Progress value={fillPct} className="h-2" />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAddRoomDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Kamar
            </Button>
            {unassignedCount > 0 && (
              <Button variant="outline" onClick={() => setAutoAssignDialogOpen(true)}>
                <Wand2 className="h-4 w-4 mr-2" /> Auto-Assign ({unassignedCount} belum)
              </Button>
            )}
            {totalOccupied > 0 && (
              <Button variant="ghost" onClick={exportRoomingExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            )}
          </div>

          {unassignedCount > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                      {unassignedCount} jamaah belum mendapat kamar
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Gunakan Auto-Assign untuk menempatkan secara otomatis berdasarkan gender, atau assign manual per kamar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 w-full" />)
            ) : !rooms?.length ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Belum ada kamar. Klik "Tambah Kamar" untuk mulai.</p>
                </CardContent>
              </Card>
            ) : (
              rooms?.map((room) => {
                const occupancyPct = room.capacity ? Math.round(((room.occupants?.length || 0) / room.capacity) * 100) : 0;
                const isFull = (room.occupants?.length || 0) >= (room.capacity || 4);
                return (
                  <Card key={room.id} className={`flex flex-col ${isFull ? 'border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BedDouble className="h-4 w-4" />
                        Kamar {room.room_number}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {getRoomTypeLabel(room.room_type)}
                        </Badge>
                        {isFull && <Badge className="bg-green-100 text-green-800 text-xs">Penuh</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Lantai {room.floor || '-'}</span>
                          <span>{room.occupants?.length || 0}/{room.capacity} orang</span>
                        </div>
                        <Progress value={occupancyPct} className="h-1.5" />
                      </div>

                      <div className="flex-1">
                        <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">Penghuni</h4>
                        <ScrollArea className="h-24">
                          {!room.occupants?.length ? (
                            <p className="text-xs text-muted-foreground italic">Belum ada penghuni</p>
                          ) : (
                            <ul className="space-y-1">
                              {room.occupants?.map((occupant) => (
                                <li key={occupant.id} className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-1.5">
                                    <Badge variant={occupant.customer?.gender === 'male' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                                      {occupant.customer?.gender === 'male' ? 'L' : 'P'}
                                    </Badge>
                                    <span className="text-sm">{occupant.customer?.full_name}</span>
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                    onClick={() => removeOccupantMutation.mutate(occupant.id)}
                                    disabled={removeOccupantMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </ScrollArea>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => { setSelectedRoom(room); setAssignPassengerDialogOpen(true); }}
                          disabled={isFull}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              disabled={(room.occupants?.length || 0) > 0}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Kamar {room.room_number}?</AlertDialogTitle>
                              <AlertDialogDescription>Kamar akan dihapus permanen.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRoomMutation.mutate(room.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
            <div>
              <Label>No. Kamar</Label>
              <Input
                className="mt-1.5"
                value={roomFormData.room_number}
                onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                placeholder="101, 102A, ..."
              />
            </div>
            <div>
              <Label>Tipe Kamar</Label>
              <Select value={roomFormData.room_type} onValueChange={(v) => setRoomFormData({ ...roomFormData, room_type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single (1 orang)</SelectItem>
                  <SelectItem value="double">Double (2 orang)</SelectItem>
                  <SelectItem value="triple">Triple (3 orang)</SelectItem>
                  <SelectItem value="quad">Quad (4 orang)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lantai (opsional)</Label>
              <Input
                className="mt-1.5"
                value={roomFormData.floor}
                onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                placeholder="1, 2, 3, ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoomDialogOpen(false)}>Batal</Button>
            <Button onClick={() => addRoomMutation.mutate(roomFormData)} disabled={addRoomMutation.isPending || !roomFormData.room_number}>
              {addRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Dialog */}
      <Dialog open={autoAssignDialogOpen} onOpenChange={setAutoAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Auto-Assign Kamar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Sistem akan otomatis menempatkan <strong>{unassignedCount} jamaah</strong> yang belum memiliki kamar ke dalam kamar yang tersedia.
            </p>
            <div>
              <Label className="mb-2 block">Mode Auto-Assign</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'gender', label: 'Berdasarkan Gender', desc: 'Laki-laki & perempuan dipisahkan per kamar' },
                  { value: 'booking', label: 'Berdasarkan Tipe Kamar', desc: 'Sesuai tipe kamar yang dipesan (quad, triple, dll)' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setAutoAssignMode(opt.value as 'gender' | 'booking')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${autoAssignMode === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Catatan:</p>
              <p>• Jamaah ditempatkan secara berurutan sampai kamar penuh</p>
              <p>• Kamar yang sudah penuh akan dilewati</p>
              <p>• Anda masih bisa mengubah penempatan secara manual setelah ini</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoAssignDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAutoAssign} disabled={isAutoAssigning}>
              {isAutoAssigning ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Memproses...</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" />Jalankan Auto-Assign</>
              )}
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
            {selectedRoom && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                <Users className="h-3.5 w-3.5" />
                <span>
                  Kapasitas: {selectedRoom.capacity} · Terisi: {selectedRoom.occupants?.length || 0} ·
                  Sisa: {(selectedRoom.capacity || 0) - (selectedRoom.occupants?.length || 0)}
                </span>
              </div>
            )}
            <ScrollArea className="h-60 pr-2">
              {!unassignedPassengers?.length ? (
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
                        <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer w-full">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedPassengerIds);
                              if (checked) next.add(p.customer_id);
                              else next.delete(p.customer_id);
                              setSelectedPassengerIds(next);
                            }}
                          />
                          <span className="flex-1 text-sm font-medium">{p.customer?.full_name || '-'}</span>
                          {p.customer?.gender && (
                            <Badge variant={p.customer.gender === 'male' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                              {p.customer.gender === 'male' ? 'L' : 'P'}
                            </Badge>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            {selectedPassengerIds.size > 0 && (
              <p className="text-xs text-primary mt-2 font-medium">{selectedPassengerIds.size} jamaah dipilih</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignPassengerDialogOpen(false); setSelectedPassengerIds(new Set()); }}>Batal</Button>
            <Button
              onClick={() => selectedRoom && assignPassengerMutation.mutate({ roomId: selectedRoom.id, customerIds: Array.from(selectedPassengerIds) })}
              disabled={assignPassengerMutation.isPending || selectedPassengerIds.size === 0}
            >
              {assignPassengerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Tempatkan ({selectedPassengerIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
