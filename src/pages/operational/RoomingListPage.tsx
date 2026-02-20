import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  BedDouble, Users, Plus, Trash2, UserPlus, 
  Download, Hotel, Filter, GripVertical, Printer
} from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RoomAssignment {
  id: string;
  departure_id: string;
  hotel_id: string;
  room_number: string;
  room_type: string;
  floor: string | null;
  capacity: number;
  hotel?: { name: string; city: string };
  occupants?: RoomOccupant[];
}

interface RoomOccupant {
  id: string;
  room_assignment_id?: string;
  customer_id: string;
  bed_number: number | null;
  customer?: { full_name: string; gender: string | null };
}

interface DeparturePassenger {
  customer_id: string;
  customer: { id: string; full_name: string; gender: string | null };
}

export default function RoomingListPage() {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [assignPassengerDialogOpen, setAssignPassengerDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomAssignment | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    room_number: "",
    room_type: "quad",
    floor: "",
  });

  // Get upcoming departures
  const { data: departures } = useQuery({
    queryKey: ['operational-departures-rooming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          package:packages(name),
          hotel_makkah_id,
          hotel_madinah_id,
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, city),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, city)
        `)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date');
      if (error) throw error;
      return data;
    },
  });

  // Get rooms for selected departure and hotel
  const { data: rooms, isLoading: loadingRooms } = useQuery({
    queryKey: ['room-assignments', selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId || !selectedHotelId) return [];
      const { data, error } = await supabase
        .from('room_assignments')
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
        .eq('departure_id', selectedDepartureId)
        .eq('hotel_id', selectedHotelId)
        .order('room_number');
      if (error) throw error;
      return data as RoomAssignment[];
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  // Get unassigned passengers for this departure
  const { data: unassignedPassengers } = useQuery({
    queryKey: ['unassigned-passengers', selectedDepartureId, selectedHotelId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      
      // Get all passengers in this departure
      const { data: passengers, error: pError } = await supabase
        .from('booking_passengers')
        .select(`
          customer_id,
          customer:customers(id, full_name, gender),
          booking:bookings!inner(departure_id)
        `)
        .eq('booking.departure_id', selectedDepartureId);
      if (pError) throw pError;

      // Get assigned passengers
      const { data: assigned, error: aError } = await supabase
        .from('room_occupants')
        .select('customer_id, room:room_assignments!inner(departure_id, hotel_id)')
        .eq('room.departure_id', selectedDepartureId)
        .eq('room.hotel_id', selectedHotelId);
      if (aError) throw aError;

      const assignedIds = new Set(assigned?.map(a => a.customer_id) || []);
      return passengers?.filter(p => !assignedIds.has(p.customer_id)) || [];
    },
    enabled: !!selectedDepartureId && !!selectedHotelId,
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: typeof roomFormData) => {
      const capacity = data.room_type === 'single' ? 1 : data.room_type === 'double' ? 2 : data.room_type === 'triple' ? 3 : 4;
      const { error } = await supabase
        .from('room_assignments')
        .insert({
          departure_id: selectedDepartureId,
          hotel_id: selectedHotelId,
          room_number: data.room_number,
          room_type: data.room_type,
          floor: data.floor || null,
          capacity,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
      toast.success('Kamar berhasil ditambahkan');
      setAddRoomDialogOpen(false);
      setRoomFormData({ room_number: "", room_type: "quad", floor: "" });
    },
    onError: (error: any) => {
      toast.error('Gagal menambah kamar: ' + error.message);
    },
  });

  const assignPassengerMutation = useMutation({
    mutationFn: async ({ roomId, customerId }: { roomId: string; customerId: string }) => {
      const { error } = await supabase
        .from('room_occupants')
        .insert({
          room_assignment_id: roomId,
          customer_id: customerId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-passengers'] });
      toast.success('Jamaah berhasil ditempatkan');
    },
    onError: (error: any) => {
      toast.error('Gagal menempatkan jamaah: ' + error.message);
    },
  });

  const removeOccupantMutation = useMutation({
    mutationFn: async (occupantId: string) => {
      const { error } = await supabase
        .from('room_occupants')
        .delete()
        .eq('id', occupantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-passengers'] });
      toast.success('Jamaah dipindahkan dari kamar');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from('room_assignments')
        .delete()
        .eq('id', roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
      toast.success('Kamar berhasil dihapus');
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
      single: 'Single (1)',
      double: 'Double (2)',
      triple: 'Triple (3)',
      quad: 'Quad (4)',
    };
    return labels[type] || type;
  };

  const exportRoomingPDF = () => {
    if (!rooms || rooms.length === 0) return;
    const doc = new jsPDF();
    const hotelName = (rooms[0]?.hotel as any)?.name || 'Hotel';
    const depData = selectedDeparture;
    const pkgName = (depData?.package as any)?.name || '';
    const depDate = depData ? format(new Date(depData.departure_date), "dd MMMM yyyy", { locale: localeId }) : '';

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rooming List - ${hotelName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paket: ${pkgName} | Berangkat: ${depDate}`, 14, 28);
    doc.text(`Total Kamar: ${totalRooms} | Terisi: ${totalOccupied}/${totalCapacity}`, 14, 34);

    const tableRows: string[][] = [];
    rooms.forEach(room => {
      if (room.occupants && room.occupants.length > 0) {
        room.occupants.forEach((occ, idx) => {
          tableRows.push([
            idx === 0 ? room.room_number : '',
            idx === 0 ? getRoomTypeLabel(room.room_type) : '',
            idx === 0 ? (room.floor || '-') : '',
            (occ.customer as any)?.full_name || '-',
            (occ.customer as any)?.gender === 'male' ? 'L' : 'P',
          ]);
        });
      } else {
        tableRows.push([room.room_number, getRoomTypeLabel(room.room_type), room.floor || '-', '(Kosong)', '-']);
      }
    });

    autoTable(doc, {
      startY: 42,
      head: [['No. Kamar', 'Tipe', 'Lantai', 'Nama Jamaah', 'L/P']],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`RoomingList-${hotelName}-${depData?.departure_date || 'export'}.pdf`);
    toast.success('Rooming List PDF berhasil di-download');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rooming List</h1>
        <p className="text-muted-foreground">Atur penempatan kamar jamaah per keberangkatan</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm">Keberangkatan</Label>
              <Select value={selectedDepartureId} onValueChange={(v) => {
                setSelectedDepartureId(v);
                setSelectedHotelId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.package as any)?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm">Hotel</Label>
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId} disabled={!selectedDepartureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDepartureId && selectedHotelId && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BedDouble className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalRooms}</p>
                    <p className="text-sm text-muted-foreground">Total Kamar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{totalOccupied}/{totalCapacity}</p>
                    <p className="text-sm text-muted-foreground">Terisi/Kapasitas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{unassignedPassengers?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Belum Ditempatkan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex items-center justify-center gap-2 p-4">
              <Button onClick={() => setAddRoomDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kamar
              </Button>
              <Button variant="outline" onClick={exportRoomingPDF} disabled={!rooms || rooms.length === 0}>
                <Printer className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Room Cards */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hotel className="h-5 w-5" />
                    Daftar Kamar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingRooms ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : rooms?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada kamar. Klik "Tambah Kamar" untuk memulai.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {rooms?.map((room) => (
                        <Card key={room.id} className="overflow-hidden">
                          <div className="p-3 bg-muted/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BedDouble className="h-4 w-4" />
                              <span className="font-semibold">Kamar {room.room_number}</span>
                              {room.floor && <Badge variant="outline" className="text-xs">Lt. {room.floor}</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {getRoomTypeLabel(room.room_type)}
                              </Badge>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6"
                                onClick={() => {
                                  if (confirm('Hapus kamar ini?')) {
                                    deleteRoomMutation.mutate(room.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              {room.occupants?.map((occ) => (
                                <div 
                                  key={occ.id}
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${(occ.customer as any)?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                    <span className="text-sm">{(occ.customer as any)?.full_name}</span>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => removeOccupantMutation.mutate(occ.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {(room.occupants?.length || 0) < room.capacity && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    setAssignPassengerDialogOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Tambah Jamaah ({room.capacity - (room.occupants?.length || 0)} slot)
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Unassigned Passengers */}
            <div>
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Belum Ditempatkan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {unassignedPassengers?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Semua jamaah sudah ditempatkan
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {unassignedPassengers?.map((p: any) => (
                          <div 
                            key={p.customer_id}
                            className="flex items-center gap-2 p-2 bg-muted/30 rounded cursor-move"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className={`w-2 h-2 rounded-full ${p.customer?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                            <span className="text-sm flex-1">{p.customer?.full_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Add Room Dialog */}
      <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kamar</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            addRoomMutation.mutate(roomFormData);
          }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nomor Kamar *</Label>
                <Input
                  value={roomFormData.room_number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                  placeholder="Contoh: 301"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe Kamar *</Label>
                  <Select 
                    value={roomFormData.room_type} 
                    onValueChange={(v) => setRoomFormData({ ...roomFormData, room_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    value={roomFormData.floor}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                    placeholder="Contoh: 3"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddRoomDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={addRoomMutation.isPending}>
                {addRoomMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Passenger Dialog */}
      <Dialog open={assignPassengerDialogOpen} onOpenChange={setAssignPassengerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Jamaah untuk Kamar {selectedRoom?.room_number}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 p-1">
              {unassignedPassengers?.map((p: any) => (
                <div 
                  key={p.customer_id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    if (selectedRoom) {
                      assignPassengerMutation.mutate({
                        roomId: selectedRoom.id,
                        customerId: p.customer_id,
                      });
                      setAssignPassengerDialogOpen(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${p.customer?.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                    <span>{p.customer?.full_name}</span>
                  </div>
                  <Badge variant="outline">{p.customer?.gender === 'male' ? 'L' : 'P'}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
