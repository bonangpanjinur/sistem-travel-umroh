import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Users, UserPlus, BedDouble, Search, Check, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { ROOM_TYPE_LABELS, GENDER_LABELS } from "@/lib/constants";

interface Passenger {
  id: string;
  room_preference: string | null;
  passenger_type: string | null;
  room_number: string | null;
  roommate_id: string | null;
  customer: {
    id: string;
    full_name: string;
    gender: string | null;
    phone: string | null;
  };
  booking: {
    id: string;
    booking_code: string;
  };
}

export default function AdminRoomAssignments() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch packages that have departures
  const { data: packages } = useQuery({
    queryKey: ['packages-for-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch departures for selected package
  const { data: departures } = useQuery({
    queryKey: ['departures-for-rooms', selectedPackage],
    enabled: !!selectedPackage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, return_date, status')
        .eq('package_id', selectedPackage)
        .order('departure_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);
    setSelectedDeparture("");
  };

  // Fetch ALL passengers (no room_preference filter)
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ['room-passengers', selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`
          id,
          room_preference,
          passenger_type,
          room_number,
          roommate_id,
          customer:customers(id, full_name, gender, phone),
          booking:bookings!inner(id, booking_code, departure_id, booking_status)
        `)
        .eq('booking.departure_id', selectedDeparture)
        .in('booking.booking_status', ['confirmed', 'pending']);

      if (error) throw error;
      return data as unknown as Passenger[];
    },
  });

  // Group passengers by room type
  const roomTypeGroups = {
    quad: passengers?.filter(p => p.room_preference === 'quad') || [],
    triple: passengers?.filter(p => p.room_preference === 'triple') || [],
    double: passengers?.filter(p => p.room_preference === 'double') || [],
    single: passengers?.filter(p => p.room_preference === 'single') || [],
  };

  const filteredPassengers = selectedRoomType === 'all' 
    ? passengers || [] 
    : roomTypeGroups[selectedRoomType as keyof typeof roomTypeGroups] || [];

  // Pairing logic (only for double)
  const doublePassengers = roomTypeGroups.double;

  const pairMutation = useMutation({
    mutationFn: async ({ passengerId, roommateId, roomNumber }: { 
      passengerId: string; roommateId: string; roomNumber?: string;
    }) => {
      const updates = [
        supabase.from('booking_passengers')
          .update({ roommate_id: roommateId, room_number: roomNumber || null })
          .eq('id', passengerId),
        supabase.from('booking_passengers')
          .update({ roommate_id: passengerId, room_number: roomNumber || null })
          .eq('id', roommateId),
      ];
      const results = await Promise.all(updates);
      results.forEach(r => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("Berhasil memasangkan jamaah!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
      setPairingDialogOpen(false);
      setSelectedPassenger(null);
    },
    onError: (error) => {
      toast.error("Gagal memasangkan: " + error.message);
    },
  });

  const unpairMutation = useMutation({
    mutationFn: async (passengerId: string) => {
      const passenger = passengers?.find(p => p.id === passengerId);
      if (!passenger?.roommate_id) return;
      const updates = [
        supabase.from('booking_passengers')
          .update({ roommate_id: null, room_number: null })
          .eq('id', passengerId),
        supabase.from('booking_passengers')
          .update({ roommate_id: null, room_number: null })
          .eq('id', passenger.roommate_id),
      ];
      const results = await Promise.all(updates);
      results.forEach(r => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("Berhasil membatalkan pasangan kamar!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
    },
  });

  // Update room number for any passenger
  const updateRoomMutation = useMutation({
    mutationFn: async ({ passengerId, roomNumber }: { passengerId: string; roomNumber: string }) => {
      const { error } = await supabase.from('booking_passengers')
        .update({ room_number: roomNumber || null })
        .eq('id', passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nomor kamar diperbarui!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
    },
    onError: (error) => {
      toast.error("Gagal update: " + error.message);
    },
  });

  // Paired groups for double
  const pairedGroups: Passenger[][] = [];
  const processedIds = new Set<string>();
  doublePassengers?.forEach(p => {
    if (p.roommate_id && !processedIds.has(p.id)) {
      const roommate = doublePassengers.find(r => r.id === p.roommate_id);
      if (roommate) {
        pairedGroups.push([p, roommate]);
        processedIds.add(p.id);
        processedIds.add(roommate.id);
      }
    }
  });
  const unpairedDoubleList = doublePassengers?.filter(p => !p.roommate_id) || [];

  const unpairedPassengersForDialog = doublePassengers?.filter(p => 
    !p.roommate_id && 
    p.id !== selectedPassenger?.id &&
    p.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleOpenPairing = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setSearchQuery("");
    setPairingDialogOpen(true);
  };

  // Export functions
  const exportColumns = [
    { header: 'Nama Jamaah', accessor: (r: Passenger) => r.customer?.full_name || '-', width: 25 },
    { header: 'Gender', accessor: (r: Passenger) => GENDER_LABELS[r.customer?.gender || ''] || '-', width: 12 },
    { header: 'Tipe Kamar', accessor: (r: Passenger) => ROOM_TYPE_LABELS[r.room_preference || ''] || '-', width: 18 },
    { header: 'No. Kamar', accessor: (r: Passenger) => r.room_number || '-', width: 12 },
    { header: 'Teman Sekamar', accessor: (r: Passenger) => {
      if (!r.roommate_id) return '-';
      const roommate = passengers?.find(p => p.id === r.roommate_id);
      return roommate?.customer?.full_name || '-';
    }, width: 25 },
    { header: 'Kode Booking', accessor: (r: Passenger) => r.booking?.booking_code || '-', width: 18 },
    { header: 'No. HP', accessor: (r: Passenger) => r.customer?.phone || '-', width: 15 },
  ];

  const handleExportExcel = () => {
    if (!filteredPassengers.length) return toast.error('Tidak ada data untuk di-export');
    exportToExcel(filteredPassengers, exportColumns, `data-kamar-${selectedDeparture}`, 'Data Kamar');
    toast.success('Export Excel berhasil!');
  };

  const handleExportPDF = () => {
    if (!filteredPassengers.length) return toast.error('Tidak ada data untuk di-export');
    const selectedPkg = packages?.find(p => p.id === selectedPackage);
    const selectedDep = departures?.find(d => d.id === selectedDeparture);
    const subtitle = `${selectedPkg?.name || ''} - ${selectedDep ? formatDate(selectedDep.departure_date) : ''}`;
    exportToPDF(filteredPassengers, exportColumns, `data-kamar-${selectedDeparture}`, 'Data Penempatan Kamar', subtitle);
    toast.success('Export PDF berhasil!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Kamar</h1>
          <p className="text-muted-foreground">
            Atur penempatan kamar jamaah per keberangkatan
          </p>
        </div>
        {selectedDeparture && passengers && passengers.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Departure Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            Pilih Keberangkatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">1. Pilih Paket</Label>
              <Select value={selectedPackage} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket..." />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">2. Pilih Keberangkatan</Label>
              <Select 
                value={selectedDeparture} 
                onValueChange={setSelectedDeparture}
                disabled={!selectedPackage}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPackage ? "Pilih keberangkatan..." : "Pilih paket terlebih dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {departures?.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Tidak ada keberangkatan untuk paket ini
                    </div>
                  ) : (
                    departures?.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {formatDate(dep.departure_date)} - {formatDate(dep.return_date)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          {/* Room Type Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedRoomType('all')}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{passengers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Semua</p>
              </CardContent>
            </Card>
            {(['quad', 'triple', 'double', 'single'] as const).map(type => (
              <Card 
                key={type} 
                className={`cursor-pointer hover:border-primary transition-colors ${selectedRoomType === type ? 'border-primary' : ''}`}
                onClick={() => setSelectedRoomType(type)}
              >
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold">{roomTypeGroups[type].length}</p>
                  <p className="text-sm text-muted-foreground">{ROOM_TYPE_LABELS[type]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={selectedRoomType} onValueChange={setSelectedRoomType}>
            <TabsList>
              <TabsTrigger value="all">Semua ({passengers?.length || 0})</TabsTrigger>
              <TabsTrigger value="quad">Quad ({roomTypeGroups.quad.length})</TabsTrigger>
              <TabsTrigger value="triple">Triple ({roomTypeGroups.triple.length})</TabsTrigger>
              <TabsTrigger value="double">Double ({roomTypeGroups.double.length})</TabsTrigger>
              <TabsTrigger value="single">Single ({roomTypeGroups.single.length})</TabsTrigger>
            </TabsList>

            {/* Double tab: show pairing UI */}
            <TabsContent value="double" className="space-y-4">
              {/* Pairing Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{doublePassengers?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Double</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-green-500/10">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pairedGroups.length * 2}</p>
                        <p className="text-sm text-muted-foreground">Sudah Dipasangkan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-orange-500/10">
                        <X className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{unpairedDoubleList.length}</p>
                        <p className="text-sm text-muted-foreground">Belum Dipasangkan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Unpaired Double */}
              {unpairedDoubleList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-orange-600">
                      Belum Dipasangkan ({unpairedDoubleList.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>No. HP</TableHead>
                          <TableHead>Kode Booking</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpairedDoubleList.map((passenger) => (
                          <TableRow key={passenger.id}>
                            <TableCell className="font-medium">{passenger.customer?.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={passenger.customer?.gender === 'male' ? 'default' : 'secondary'}>
                                {GENDER_LABELS[passenger.customer?.gender || ''] || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>{passenger.customer?.phone || '-'}</TableCell>
                            <TableCell><Badge variant="outline">{passenger.booking?.booking_code}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => handleOpenPairing(passenger)}>
                                <UserPlus className="h-4 w-4 mr-1" />
                                Pasangkan
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Paired Double */}
              {pairedGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-green-600">
                      Sudah Dipasangkan ({pairedGroups.length} kamar)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pairedGroups.map((group, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BedDouble className="h-5 w-5 text-green-600" />
                              <span className="font-medium">Kamar {group[0].room_number || `#${idx + 1}`}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => unpairMutation.mutate(group[0].id)} disabled={unpairMutation.isPending}>
                              <X className="h-4 w-4 mr-1" />
                              Batalkan
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.map((p) => (
                              <div key={p.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="font-semibold text-primary">{p.customer?.full_name?.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="font-medium">{p.customer?.full_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {GENDER_LABELS[p.customer?.gender || ''] || '-'} • {p.booking?.booking_code}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {doublePassengers?.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Belum ada jamaah dengan tipe kamar Double/Sharing untuk keberangkatan ini.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* All / Quad / Triple / Single: show table */}
            {['all', 'quad', 'triple', 'single'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Daftar Jamaah {tabValue === 'all' ? 'Semua Tipe' : ROOM_TYPE_LABELS[tabValue] || tabValue}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingPassengers ? (
                      <p className="text-muted-foreground">Memuat data...</p>
                    ) : filteredPassengers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Belum ada jamaah {tabValue !== 'all' ? `dengan tipe kamar ${ROOM_TYPE_LABELS[tabValue] || tabValue}` : ''} untuk keberangkatan ini.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Tipe Kamar</TableHead>
                            <TableHead>No. Kamar</TableHead>
                            <TableHead>Teman Sekamar</TableHead>
                            <TableHead>Kode Booking</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(tabValue === 'all' ? (passengers || []) : roomTypeGroups[tabValue as keyof typeof roomTypeGroups] || []).map((passenger) => {
                            const roommate = passenger.roommate_id 
                              ? passengers?.find(p => p.id === passenger.roommate_id) 
                              : null;
                            return (
                              <TableRow key={passenger.id}>
                                <TableCell className="font-medium">{passenger.customer?.full_name}</TableCell>
                                <TableCell>
                                  <Badge variant={passenger.customer?.gender === 'male' ? 'default' : 'secondary'}>
                                    {GENDER_LABELS[passenger.customer?.gender || ''] || '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{ROOM_TYPE_LABELS[passenger.room_preference || ''] || '-'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <RoomNumberInput 
                                    passengerId={passenger.id} 
                                    currentValue={passenger.room_number || ''} 
                                    onSave={(val) => updateRoomMutation.mutate({ passengerId: passenger.id, roomNumber: val })}
                                  />
                                </TableCell>
                                <TableCell>{roommate?.customer?.full_name || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{passenger.booking?.booking_code}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Pairing Dialog */}
      <PairingDialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        selectedPassenger={selectedPassenger}
        unpairedPassengers={unpairedPassengersForDialog}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPair={(roommateId, roomNumber) => {
          if (selectedPassenger) {
            pairMutation.mutate({
              passengerId: selectedPassenger.id,
              roommateId,
              roomNumber,
            });
          }
        }}
        isPairing={pairMutation.isPending}
      />
    </div>
  );
}

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPassenger: Passenger | null;
  unpairedPassengers: Passenger[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPair: (roommateId: string, roomNumber?: string) => void;
  isPairing: boolean;
}

function PairingDialog({
  open, onOpenChange, selectedPassenger, unpairedPassengers,
  searchQuery, onSearchChange, onPair, isPairing,
}: PairingDialogProps) {
  const [selectedRoommate, setSelectedRoommate] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState("");

  const handlePair = () => {
    if (selectedRoommate) {
      onPair(selectedRoommate, roomNumber);
    }
  };

  const sameGenderPassengers = unpairedPassengers.filter(
    p => p.customer?.gender === selectedPassenger?.customer?.gender
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pasangkan Jamaah</DialogTitle>
        </DialogHeader>

        {selectedPassenger && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Jamaah yang dipilih:</p>
              <p className="font-medium">{selectedPassenger.customer?.full_name}</p>
              <p className="text-sm">
                {GENDER_LABELS[selectedPassenger.customer?.gender || ''] || '-'}
              </p>
            </div>

            <div>
              <Label>Nomor Kamar (opsional)</Label>
              <Input placeholder="Contoh: 301" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari jamaah..." className="pl-10" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {sameGenderPassengers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Tidak ada jamaah dengan gender yang sama.
                </p>
              ) : (
                sameGenderPassengers.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRoommate === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedRoommate(p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedRoommate === p.id} />
                      <div>
                        <p className="font-medium">{p.customer?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.booking?.booking_code} • {p.customer?.phone || 'Tanpa HP'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handlePair} disabled={!selectedRoommate || isPairing}>Pasangkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomNumberInput({ passengerId, currentValue, onSave }: { 
  passengerId: string; currentValue: string; onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  if (!editing) {
    return (
      <button 
        className="text-left hover:bg-muted px-2 py-1 rounded cursor-pointer min-w-[60px] text-sm"
        onClick={() => { setValue(currentValue); setEditing(true); }}
      >
        {currentValue || <span className="text-muted-foreground">—</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input 
        className="h-7 w-20 text-sm" 
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(value); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
        placeholder="301"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { onSave(value); setEditing(false); }}>
        <Check className="h-3 w-3" />
      </Button>
    </div>
  );
}
