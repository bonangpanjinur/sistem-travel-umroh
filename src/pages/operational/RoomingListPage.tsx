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
import {
  BedDouble, Users, Plus, Trash2, UserPlus,
  Download, Hotel, Filter, GripVertical, Printer, FileSpreadsheet, FileText
} from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from "@/integrations/supabase/types";
import { exportRoomingListExcel, exportRoomingListPDF, type RoomingExportData, type RoomingPassenger, type RoomTypeDB } from "@/lib/rooming-list-exporter";

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
  customer: Pick<CustomerRow, "id" | "full_name" | "gender"> | null;
  booking: { departure_id: string } | null;
}

export default function RoomingListPage() {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [assignPassengerDialogOpen, setAssignPassengerDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ExtendedRoomAssignment | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    room_number: "",
    room_type: "quad",
    floor: "",
  });

  // Get upcoming departures
  const { data: departures } = useQuery<ExtendedDeparture[]>({ // Added type annotation
    queryKey: ["operational-departures-rooming"],
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
      return data as ExtendedDeparture[]; // Explicit cast
    },
  });

  // Get rooms for selected departure and hotel
  const { data: rooms, isLoading: loadingRooms } = useQuery<ExtendedRoomAssignment[]>({ // Added type annotation
    queryKey: ["room-assignments", selectedDepartureId, selectedHotelId],
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
      return data as ExtendedRoomAssignment[]; // Explicit cast
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  // Get unassigned passengers for this departure
  const { data: unassignedPassengers } = useQuery<ExtendedDeparturePassenger[]>({ // Added type annotation
    queryKey: ["unassigned-passengers", selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      
      // Get all passengers in this departure
      const { data: passengers, error: pError } = await supabase
        .from("booking_passengers")
        .select(`
          customer_id,
          customer:customers(id, full_name, gender),
          booking:bookings!inner(departure_id)
        `)
        .eq("booking.departure_id", selectedDepartureId);
      if (pError) throw pError;

      // Get assigned passengers
      const { data: assigned, error: aError } = await supabase
        .from("room_occupants")
        .select("customer_id, room:room_assignments!inner(departure_id, hotel_id)")
        .eq("room.departure_id", selectedDepartureId)
        .eq("room.hotel_id", selectedHotelId);
      if (aError) throw aError;

      const assignedIds = new Set(assigned?.map(a => a.customer_id) || []);
      return passengers?.filter(p => !assignedIds.has(p.customer_id)) as ExtendedDeparturePassenger[] || []; // Explicit cast
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: typeof roomFormData) => {
      const capacity = data.room_type === "single" ? 1 : data.room_type === "double" ? 2 : data.room_type === "triple" ? 3 : 4;
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
      queryClient.invalidateQueries({ queryKey: ["room-assignments"] });
      toast.success("Kamar berhasil ditambahkan");
      setAddRoomDialogOpen(false);
      setRoomFormData({ room_number: "", room_type: "quad", floor: "" });
    },
    onError: (error: Error) => {
      toast.error("Gagal menambah kamar: " + error.message);
    },
  });

  const assignPassengerMutation = useMutation({
    mutationFn: async ({ roomId, customerId }: { roomId: string; customerId: string }) => {
      const { error } = await supabase
        .from("room_occupants")
        .insert({
          room_assignment_id: roomId,
          customer_id: customerId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers"] });
      toast.success("Jamaah berhasil ditempatkan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menempatkan jamaah: " + error.message);
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
      queryClient.invalidateQueries({ queryKey: ["room-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-passengers"] });
      toast.success("Jamaah dipindahkan dari kamar");
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
      queryClient.invalidateQueries({ queryKey: ["room-assignments"] });
      toast.success("Kamar berhasil dihapus");
    },
  });

  const selectedDeparture = departures?.find(d => d.id === selectedDepartureId);
  const hotels = selectedDeparture ? [
    selectedDeparture.hotel_makkah,
    selectedDeparture.hotel_madinah,
  ].filter(Boolean) : [];

  const totalRooms = rooms?.length || 0;
  const totalCapacity = rooms?.reduce((sum, r) => sum + r.capacity, 0) || 0;
  const totalOccupied = rooms?.reduce((sum, r) => sum + (r.occupants?.length || 0), 0) || 0;

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: "Single (1)",
      double: "Double (2)",
      triple: "Triple (3)",
      quad: "Quad (4)",
    };
    return labels[type] || type;
  };

  const exportRoomingPDF = () => {
    if (!rooms || rooms.length === 0) return;
    const doc = new jsPDF();
    const hotelName = rooms[0]?.hotel?.name || "Hotel"; // Removed as any
    const depData = selectedDeparture;
    const pkgName = depData?.package?.name || ""; // Removed as any
    const depDate = depData ? format(new Date(depData.departure_date), "dd MMMM yyyy", { locale: localeId }) : "";

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rooming List - ${hotelName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Paket: ${pkgName} | Berangkat: ${depDate}`, 14, 28);
    doc.text(`Total Kamar: ${totalRooms} | Terisi: ${totalOccupied}/${totalCapacity}`, 14, 34);

    const tableRows: string[][] = [];
    rooms.forEach(room => {
      if (room.occupants && room.occupants.length > 0) {
        room.occupants.forEach((occ, idx) => {
          tableRows.push([
            idx === 0 ? room.room_number : "",
            idx === 0 ? getRoomTypeLabel(room.room_type) : "",
            idx === 0 ? (room.floor || "-") : "",
            occ.customer?.full_name || "-", // Removed as any
            occ.customer?.gender === "male" ? "L" : "P", // Removed as any
          ]);
        });
      } else {
        tableRows.push([room.room_number, getRoomTypeLabel(room.room_type), room.floor || "-", "(Kosong)", "-"]);
      }
    });

    autoTable(doc, {
      startY: 42,
      head: [["No. Kamar", "Tipe", "Lantai", "Nama Jamaah", "L/P"]],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`RoomingList-${hotelName}-${depData?.departure_date || "export"}.pdf`);
    toast.success("Rooming List PDF berhasil di-download");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rooming List</h1>
        <p className="text-muted-foreground">Atur penempatan kamar jamaah per keberangkatan</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Pilih Keberangkatan & Hotel
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="departure">Keberangkatan</Label>
            <Select
              value={selectedDepartureId}
              onValueChange={setSelectedDepartureId}
            >
              <SelectTrigger id="departure">
                <SelectValue placeholder="Pilih Keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                {departures?.map((dep) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.package?.name} - {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })}
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
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={exportRoomingPDF} disabled={!rooms || rooms.length === 0}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Rooming List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDepartureId && selectedHotelId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingRooms ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full" />
            ))
          ) : rooms?.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Belum ada kamar yang ditambahkan untuk hotel ini.
            </p>
          ) : (
            rooms?.map((room) => (
              <Card key={room.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BedDouble className="h-5 w-5" />
                    Kamar {room.room_number}
                  </CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {getRoomTypeLabel(room.room_type)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Lantai: {room.floor || "-"}</p>
                  <p className="text-sm text-muted-foreground">Kapasitas: {room.capacity}</p>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Penghuni ({room.occupants?.length || 0}/{room.capacity})</h4>
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
                  <div className="mt-4 flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRoom(room);
                        setAssignPassengerDialogOpen(true);
                      }}
                      disabled={(room.occupants?.length || 0) >= room.capacity}
                    >
                      <UserPlus className="h-4 w-4 mr-2" /> Tambah Jamaah
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRoomMutation.mutate(room.id)}
                      disabled={deleteRoomMutation.isPending || (room.occupants?.length || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Hapus Kamar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                  <SelectItem value="quad">Quad</SelectItem>
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
      <Dialog open={assignPassengerDialogOpen} onOpenChange={setAssignPassengerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Jamaah ke Kamar {selectedRoom?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <h4 className="text-sm font-semibold mb-2">Jamaah Belum Terassign</h4>
            <ScrollArea className="h-[200px] pr-4">
              {unassignedPassengers?.length === 0 ? (
                <p className="text-xs text-muted-foreground">Semua jamaah sudah terassign atau tidak ada jamaah untuk keberangkatan ini.</p>
              ) : (
                <ul className="space-y-1">
                  {unassignedPassengers?.map((p) => (
                    <li key={p.customer_id} className="flex items-center justify-between text-sm">
                      <span>{p.customer?.full_name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedRoom && assignPassengerMutation.mutate({ roomId: selectedRoom.id, customerId: p.customer_id })}
                        disabled={assignPassengerMutation.isPending}
                      >
                        Assign
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPassengerDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
