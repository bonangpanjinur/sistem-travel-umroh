import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Users, UserPlus, BedDouble, Search, Check, X, Download, FileSpreadsheet, FileText, Wand2 } from "lucide-react";
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

const ROOM_TYPES = ['quad', 'triple', 'double', 'single'] as const;

export default function AdminRoomAssignments() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: packages } = useQuery({
    queryKey: ['packages-for-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: departures } = useQuery({
    queryKey: ['departures-for-rooms', selectedPackage],
    enabled: !!selectedPackage,
    queryFn: async () => {
      const { data, error } = await supabase.from('departures').select('id, departure_date, return_date, status').eq('package_id', selectedPackage).order('departure_date');
      if (error) throw error;
      return data;
    },
  });

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);
    setSelectedDeparture("");
  };

  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ['room-passengers', selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`id, room_preference, passenger_type, room_number, roommate_id, customer:customers(id, full_name, gender, phone), booking:bookings!inner(id, booking_code, departure_id, booking_status)`)
        .eq('booking.departure_id', selectedDeparture)
        .in('booking.booking_status', ['confirmed', 'pending']);
      if (error) throw error;
      return data as unknown as Passenger[];
    },
  });

  const roomTypeGroups = {
    quad: passengers?.filter(p => p.room_preference === 'quad') || [],
    triple: passengers?.filter(p => p.room_preference === 'triple') || [],
    double: passengers?.filter(p => p.room_preference === 'double') || [],
    single: passengers?.filter(p => p.room_preference === 'single') || [],
  };

  const filteredPassengers = selectedRoomType === 'all'
    ? passengers || []
    : roomTypeGroups[selectedRoomType as keyof typeof roomTypeGroups] || [];

  const doublePassengers = roomTypeGroups.double;

  const pairMutation = useMutation({
    mutationFn: async ({ passengerId, roommateId, roomNumber }: { passengerId: string; roommateId: string; roomNumber?: string }) => {
      const results = await Promise.all([
        supabase.from('booking_passengers').update({ roommate_id: roommateId, room_number: roomNumber || null }).eq('id', passengerId),
        supabase.from('booking_passengers').update({ roommate_id: passengerId, room_number: roomNumber || null }).eq('id', roommateId),
      ]);
      results.forEach(r => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("Berhasil memasangkan jamaah!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
      setPairingDialogOpen(false);
      setSelectedPassenger(null);
    },
    onError: (error) => toast.error("Gagal: " + error.message),
  });

  const unpairMutation = useMutation({
    mutationFn: async (passengerId: string) => {
      const passenger = passengers?.find(p => p.id === passengerId);
      if (!passenger?.roommate_id) return;
      const results = await Promise.all([
        supabase.from('booking_passengers').update({ roommate_id: null, room_number: null }).eq('id', passengerId),
        supabase.from('booking_passengers').update({ roommate_id: null, room_number: null }).eq('id', passenger.roommate_id),
      ]);
      results.forEach(r => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("Pasangan dibatalkan!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ passengerId, roomNumber }: { passengerId: string; roomNumber: string }) => {
      // Update the passenger's room number
      const { error } = await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', passengerId);
      if (error) throw error;

      // Auto-sync: if this passenger has a roommate, update roommate's room number too
      const passenger = passengers?.find(p => p.id === passengerId);
      if (passenger?.roommate_id) {
        await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', passenger.roommate_id);
      }

      // Also sync any passengers that have this passenger as their roommate
      const linkedPassengers = passengers?.filter(p => p.roommate_id === passengerId && p.id !== passengerId) || [];
      for (const linked of linkedPassengers) {
        await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', linked.id);
      }
    },
    onSuccess: () => {
      toast.success("Nomor kamar diperbarui (termasuk teman sekamar)!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
    },
    onError: (error) => toast.error("Gagal: " + error.message),
  });

  // Auto-assign: pair/group unpaired passengers by gender for all room types
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      let paired = 0;

      // Process each room type
      for (const roomType of ROOM_TYPES) {
        const groupSize = roomType === 'quad' ? 4 : roomType === 'triple' ? 3 : roomType === 'double' ? 2 : 1;
        if (groupSize <= 1) continue; // Single rooms don't need pairing

        const unpairedOfType = (roomTypeGroups[roomType] || []).filter(p => !p.roommate_id);
        const males = unpairedOfType.filter(p => p.customer?.gender === 'male');
        const females = unpairedOfType.filter(p => p.customer?.gender === 'female');

        for (const group of [males, females]) {
          // Group passengers in chunks of groupSize
          for (let i = 0; i + groupSize - 1 < group.length; i += groupSize) {
            const chunk = group.slice(i, i + groupSize);
            // Link all members to each other (using first member as the "anchor")
            const anchorId = chunk[0].id;
            for (const member of chunk) {
              // Each member points to the anchor (or for double, they point to each other)
              const roommateId = groupSize === 2 
                ? (member.id === chunk[0].id ? chunk[1].id : chunk[0].id)
                : anchorId;
              await supabase.from('booking_passengers').update({ roommate_id: roommateId }).eq('id', member.id);
            }
            // For double, also set the anchor's roommate
            if (groupSize === 2) {
              await supabase.from('booking_passengers').update({ roommate_id: chunk[1].id }).eq('id', chunk[0].id);
              await supabase.from('booking_passengers').update({ roommate_id: chunk[0].id }).eq('id', chunk[1].id);
            }
            paired++;
          }
        }
      }
      return paired;
    },
    onSuccess: (count) => {
      toast.success(`✅ ${count} grup berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
    },
    onError: (err) => toast.error("Gagal: " + err.message),
  });

  // Paired groups
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

  const handleOpenPairing = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setSearchQuery("");
    setPairingDialogOpen(true);
  };

  // Stats
  const totalPassengers = passengers?.length || 0;
  const withRoom = passengers?.filter(p => p.room_number).length || 0;
  const paired = pairedGroups.length * 2;

  // Export
  const exportColumns = [
    { header: 'Nama', accessor: (r: Passenger) => r.customer?.full_name || '-', width: 25 },
    { header: 'Gender', accessor: (r: Passenger) => GENDER_LABELS[r.customer?.gender || ''] || '-', width: 12 },
    { header: 'Tipe Kamar', accessor: (r: Passenger) => ROOM_TYPE_LABELS[r.room_preference || ''] || '-', width: 18 },
    { header: 'No. Kamar', accessor: (r: Passenger) => r.room_number || '-', width: 12 },
    { header: 'Teman Sekamar', accessor: (r: Passenger) => {
      if (!r.roommate_id) return '-';
      return passengers?.find(p => p.id === r.roommate_id)?.customer?.full_name || '-';
    }, width: 25 },
    { header: 'Kode Booking', accessor: (r: Passenger) => r.booking?.booking_code || '-', width: 18 },
  ];

  const handleExportExcel = () => {
    if (!filteredPassengers.length) return toast.error('Tidak ada data');
    exportToExcel(filteredPassengers, exportColumns, `kamar-${selectedDeparture}`, 'Data Kamar');
  };

  const handleExportPDF = () => {
    if (!filteredPassengers.length) return toast.error('Tidak ada data');
    const pkg = packages?.find(p => p.id === selectedPackage);
    const dep = departures?.find(d => d.id === selectedDeparture);
    exportToPDF(filteredPassengers, exportColumns, `kamar-${selectedDeparture}`, 'Data Kamar', `${pkg?.name || ''} - ${dep ? formatDate(dep.departure_date) : ''}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Kamar</h1>
          <p className="text-muted-foreground">Atur penempatan kamar jamaah per keberangkatan</p>
        </div>
        {selectedDeparture && passengers && passengers.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Paket</Label>
              <Select value={selectedPackage} onValueChange={handlePackageChange}>
                <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                <SelectContent>
                  {packages?.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Keberangkatan</Label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture} disabled={!selectedPackage}>
                <SelectTrigger><SelectValue placeholder={selectedPackage ? "Pilih..." : "Pilih paket dulu"} /></SelectTrigger>
                <SelectContent>
                  {departures?.map(dep => (
                    <SelectItem key={dep.id} value={dep.id}>{formatDate(dep.departure_date)} - {formatDate(dep.return_date)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          {/* Combined Stats + Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'Semua', count: totalPassengers },
              ...ROOM_TYPES.map(t => ({ key: t, label: ROOM_TYPE_LABELS[t], count: roomTypeGroups[t].length })),
            ].map(item => (
              <Button
                key={item.key}
                variant={selectedRoomType === item.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoomType(item.key)}
                className="gap-1.5"
              >
                {item.label}
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{item.count}</Badge>
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span>🛏️ {withRoom}/{totalPassengers} punya nomor kamar</span>
              <span>👥 {paired} terpasang</span>
            </div>
          </div>

          {/* Global auto-assign button (visible in all/non-double tabs) */}
          {selectedRoomType !== 'double' && (
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => autoAssignMutation.mutate()} disabled={autoAssignMutation.isPending}>
                <Wand2 className="h-4 w-4 mr-1" />
                Auto-Kelompokkan Semua Tipe Kamar
              </Button>
              <span className="text-xs text-muted-foreground">Kelompokkan jamaah berdasarkan tipe kamar & gender</span>
            </div>
          )

          {/* Double: pairing section */}
          {selectedRoomType === 'double' && (
            <div className="space-y-4">
              {/* Auto-assign button */}
              {unpairedDoubleList.length >= 2 && (
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={() => autoAssignMutation.mutate()} disabled={autoAssignMutation.isPending}>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Auto-Pasangkan ({unpairedDoubleList.length} belum)
                  </Button>
                  <span className="text-xs text-muted-foreground">Dipasangkan berdasarkan gender yang sama</span>
                </div>
              )}

              {/* Unpaired */}
              {unpairedDoubleList.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-orange-600">Belum Dipasangkan ({unpairedDoubleList.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>No. HP</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpairedDoubleList.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.customer?.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={p.customer?.gender === 'male' ? 'default' : 'secondary'}>
                                {GENDER_LABELS[p.customer?.gender || ''] || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.customer?.phone || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => handleOpenPairing(p)}>
                                <UserPlus className="h-4 w-4 mr-1" /> Pasangkan
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Paired */}
              {pairedGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-600">Sudah Dipasangkan ({pairedGroups.length} kamar)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pairedGroups.map((group, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <BedDouble className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm font-medium">{group[0].room_number || `#${idx + 1}`}</span>
                            <span className="text-sm">—</span>
                            {group.map(p => (
                              <span key={p.id} className="text-sm">{p.customer?.full_name}</span>
                            )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`} className="text-muted-foreground">&</span>, curr], [] as any)}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => unpairMutation.mutate(group[0].id)} disabled={unpairMutation.isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {doublePassengers?.length === 0 && (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada jamaah Double.</CardContent></Card>
              )}
            </div>
          )}

          {/* Other tabs: general table */}
          {selectedRoomType !== 'double' && (
            <Card>
              <CardContent className="pt-6">
                {loadingPassengers ? (
                  <p className="text-muted-foreground py-8 text-center">Memuat...</p>
                ) : filteredPassengers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada jamaah.</p>
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
                      {filteredPassengers.map(p => {
                        const roommate = p.roommate_id ? passengers?.find(x => x.id === p.roommate_id) : null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.customer?.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={p.customer?.gender === 'male' ? 'default' : 'secondary'}>
                                {GENDER_LABELS[p.customer?.gender || ''] || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell><Badge variant="outline">{ROOM_TYPE_LABELS[p.room_preference || ''] || '-'}</Badge></TableCell>
                            <TableCell>
                              <RoomNumberInput
                                passengerId={p.id}
                                currentValue={p.room_number || ''}
                                onSave={(val) => updateRoomMutation.mutate({ passengerId: p.id, roomNumber: val })}
                              />
                            </TableCell>
                            <TableCell>{roommate?.customer?.full_name || '-'}</TableCell>
                            <TableCell><Badge variant="outline">{p.booking?.booking_code}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pairing Dialog */}
      <PairingDialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        selectedPassenger={selectedPassenger}
        unpairedPassengers={doublePassengers?.filter(p => !p.roommate_id && p.id !== selectedPassenger?.id && p.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) || []}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPair={(roommateId, roomNumber) => {
          if (selectedPassenger) pairMutation.mutate({ passengerId: selectedPassenger.id, roommateId, roomNumber });
        }}
        isPairing={pairMutation.isPending}
      />
    </div>
  );
}

// --- Sub-components ---

function PairingDialog({ open, onOpenChange, selectedPassenger, unpairedPassengers, searchQuery, onSearchChange, onPair, isPairing }: {
  open: boolean; onOpenChange: (o: boolean) => void; selectedPassenger: Passenger | null;
  unpairedPassengers: Passenger[]; searchQuery: string; onSearchChange: (q: string) => void;
  onPair: (id: string, room?: string) => void; isPairing: boolean;
}) {
  const [selectedRoommate, setSelectedRoommate] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const sameGender = unpairedPassengers.filter(p => p.customer?.gender === selectedPassenger?.customer?.gender);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Pasangkan Jamaah</DialogTitle></DialogHeader>
        {selectedPassenger && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Jamaah:</p>
              <p className="font-medium">{selectedPassenger.customer?.full_name}</p>
              <p className="text-sm">{GENDER_LABELS[selectedPassenger.customer?.gender || ''] || '-'}</p>
            </div>
            <div>
              <Label>Nomor Kamar (opsional)</Label>
              <Input placeholder="301" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari..." className="pl-10" value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {sameGender.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Tidak ada jamaah dengan gender yang sama.</p>
              ) : sameGender.map(p => (
                <div key={p.id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoommate === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  onClick={() => setSelectedRoommate(p.id)}>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedRoommate === p.id} />
                    <div>
                      <p className="font-medium">{p.customer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{p.booking?.booking_code}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => { if (selectedRoommate) onPair(selectedRoommate, roomNumber); }} disabled={!selectedRoommate || isPairing}>Pasangkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomNumberInput({ passengerId, currentValue, onSave }: { passengerId: string; currentValue: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  // Sync with external data changes
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  if (!editing) {
    return (
      <button className="text-left hover:bg-muted px-2 py-1 rounded cursor-pointer min-w-[60px] text-sm"
        onClick={() => { setValue(currentValue); setEditing(true); }}>
        {currentValue || <span className="text-muted-foreground">—</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input className="h-7 w-20 text-sm" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(value); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        autoFocus placeholder="301" />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { onSave(value); setEditing(false); }}>
        <Check className="h-3 w-3" />
      </Button>
    </div>
  );
}
