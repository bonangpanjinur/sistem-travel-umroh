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
import { Users, UserPlus, BedDouble, Search, Check, X, Download, FileSpreadsheet, FileText, Wand2, History } from "lucide-react";
import { ROOM_TYPE_LABELS, GENDER_LABELS } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// IMPROVED ROOMING LOGIC WITH FLEXIBLE ROOM GROUPS
// ============================================================

interface Passenger {
  id: string;
  room_preference: string | null;
  passenger_type: string | null;
  room_number: string | null;
  room_group_id: string | null;
  roommate_id: string | null; // Keep for backward compatibility
  customer: {
    id: string;
    full_name: string;
    gender: string | null;
    phone: string | null;
    birth_date?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
    marital_status?: string | null;
    spouse_name?: string | null;
  };
  booking: {
    id: string;
    booking_code: string;
    room_type?: string | null;
  };
}

const ROOM_TYPES = ['quad', 'triple', 'double', 'single'] as const;

// Helper: Get room capacity based on type
const getRoomCapacity = (roomType: string): number => {
  switch (roomType) {
    case 'single': return 1;
    case 'double': return 2;
    case 'triple': return 3;
    case 'quad': return 4;
    default: return 4;
  }
};

// Helper: Get room type based on group size
const getRoomTypeBySize = (size: number): string => {
  if (size === 1) return 'single';
  if (size === 2) return 'double';
  if (size === 3) return 'triple';
  return 'quad';
};

export default function AdminRoomAssignmentsImproved() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
  const [roommateSelectionOpen, setRoommateSelectionOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoommateIds, setSelectedRoommateIds] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>("all");

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

  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ['room-passengers-improved', selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`id, room_preference, passenger_type, room_number, room_group_id, roommate_id, customer:customers(id, full_name, gender, phone, birth_date, passport_number, passport_expiry, marital_status, spouse_name), booking:bookings!inner(id, booking_code, room_type, departure_id, booking_status)`)
        .eq('booking.departure_id', selectedDeparture)
        .in('booking.booking_status', ['confirmed', 'pending']);
      if (error) throw error;
      return data as unknown as Passenger[];
    },
  });

  // Group passengers by room_group_id
  const getGroupMembers = (groupId: string | null): Passenger[] => {
    if (!groupId) return [];
    return passengers?.filter(p => p.room_group_id === groupId) || [];
  };

  const roomTypeGroups = {
    quad: passengers?.filter(p => p.room_preference === 'quad') || [],
    triple: passengers?.filter(p => p.room_preference === 'triple') || [],
    double: passengers?.filter(p => p.room_preference === 'double') || [],
    single: passengers?.filter(p => p.room_preference === 'single') || [],
  };

  const filteredPassengers = selectedRoomType === 'all'
    ? passengers || []
    : roomTypeGroups[selectedRoomType as keyof typeof roomTypeGroups] || [];

  const withAdditionalFilters = filteredPassengers.filter(p => {
    if (genderFilter !== 'all' && p.customer?.gender !== genderFilter) return false;
    if (roomStatusFilter === 'assigned' && !p.room_number) return false;
    if (roomStatusFilter === 'unassigned' && p.room_number) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesName = p.customer?.full_name?.toLowerCase().includes(search);
      const matchesPhone = p.customer?.phone?.includes(search);
      if (!matchesName && !matchesPhone) return false;
    }
    return true;
  });

  // ============================================================
  // MUTATIONS FOR FLEXIBLE ROOMING
  // ============================================================

  const createRoomGroupMutation = useMutation({
    mutationFn: async ({ mainPassengerId, selectedMateIds, roomNumber, reason }: 
      { mainPassengerId: string; selectedMateIds: string[]; roomNumber?: string; reason?: string }) => {
      
      const mainPassenger = passengers?.find(p => p.id === mainPassengerId);
      if (!mainPassenger) throw new Error("Penumpang utama tidak ditemukan");

      // Validate: main passenger + selected mates
      const allMemberIds = [mainPassengerId, ...selectedMateIds];
      const groupSize = allMemberIds.length;

      // Check capacity
      const maxCapacity = getRoomCapacity(mainPassenger.room_preference || 'quad');
      if (groupSize > maxCapacity) {
        throw new Error(`Melebihi kapasitas kamar ${mainPassenger.room_preference} (maks ${maxCapacity} orang, dipilih ${groupSize})`);
      }

      // Check gender compatibility
      const mainGender = mainPassenger.customer?.gender;
      for (const mateId of selectedMateIds) {
        const mate = passengers?.find(p => p.id === mateId);
        if (mate?.customer?.gender !== mainGender) {
          // Allow if mahram (same booking) or spouse
          const isMahram = mate?.booking?.id === mainPassenger.booking?.id;
          const isSpouse = mainPassenger.customer?.marital_status === 'married' && 
            mate?.customer?.marital_status === 'married';
          if (!isMahram && !isSpouse) {
            throw new Error(`${mate?.customer?.full_name} berbeda gender dan bukan mahram`);
          }
        }
      }

      // Create new room_group_id
      const groupId = uuidv4();
      const newRoomType = getRoomTypeBySize(groupSize);

      // Update all members with the same room_group_id and room_type
      const updates = allMemberIds.map(memberId =>
        supabase.from('booking_passengers').update({
          room_group_id: groupId,
          room_preference: newRoomType,
          room_number: roomNumber || null,
        }).eq('id', memberId)
      );

      const results = await Promise.all(updates);
      results.forEach(r => { if (r.error) throw r.error; });

      // Log audit for each member
      for (const memberId of allMemberIds) {
        const member = passengers?.find(p => p.id === memberId);
        await supabase.from('room_group_audit').insert({
          room_group_id: groupId,
          passenger_id: memberId,
          action: 'add_to_group',
          old_room_type: member?.room_preference || null,
          new_room_type: newRoomType,
          old_room_number: member?.room_number || null,
          new_room_number: roomNumber || null,
          reason: reason || `Membuat grup kamar ${newRoomType} dengan ${groupSize} orang`,
          changed_by: (await supabase.auth.getUser()).data?.user?.id || null,
        });
      }
    },
    onSuccess: () => {
      toast.success("✅ Grup kamar berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers-improved'] });
      setRoommateSelectionOpen(false);
      setSelectedPassenger(null);
      setSelectedRoommateIds(new Set());
    },
    onError: (error: Error) => toast.error("❌ " + error.message),
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ passengerId, reason }: { passengerId: string; reason?: string }) => {
      const passenger = passengers?.find(p => p.id === passengerId);
      if (!passenger?.room_group_id) throw new Error("Penumpang tidak ada dalam grup");

      const groupMembers = getGroupMembers(passenger.room_group_id);
      const remainingMembers = groupMembers.filter(p => p.id !== passengerId);

      if (remainingMembers.length === 0) {
        // Delete the entire group
        await supabase.from('booking_passengers').update({
          room_group_id: null,
          room_number: null,
        }).eq('id', passengerId);

        await supabase.from('room_group_audit').insert({
          room_group_id: passenger.room_group_id,
          passenger_id: passengerId,
          action: 'delete_group',
          old_room_type: passenger.room_preference || null,
          new_room_type: null,
          old_room_number: passenger.room_number || null,
          new_room_number: null,
          reason: reason || 'Menghapus grup kamar',
          changed_by: (await supabase.auth.getUser()).data?.user?.id || null,
        });
      } else {
        // Recalculate room type based on remaining members
        const newRoomType = getRoomTypeBySize(remainingMembers.length);

        // Remove from group
        await supabase.from('booking_passengers').update({
          room_group_id: null,
          room_number: null,
          room_preference: 'quad', // Reset to default
        }).eq('id', passengerId);

        // Update remaining members with new room type
        for (const member of remainingMembers) {
          await supabase.from('booking_passengers').update({
            room_preference: newRoomType,
          }).eq('id', member.id);
        }

        // Log audit
        await supabase.from('room_group_audit').insert({
          room_group_id: passenger.room_group_id,
          passenger_id: passengerId,
          action: 'remove_from_group',
          old_room_type: passenger.room_preference || null,
          new_room_type: null,
          old_room_number: passenger.room_number || null,
          new_room_number: null,
          reason: reason || `Mengeluarkan dari grup (sisa ${remainingMembers.length} orang)`,
          changed_by: (await supabase.auth.getUser()).data?.user?.id || null,
        });

        for (const member of remainingMembers) {
          await supabase.from('room_group_audit').insert({
            room_group_id: passenger.room_group_id,
            passenger_id: member.id,
            action: 'update_room_type',
            old_room_type: member.room_preference || null,
            new_room_type: newRoomType,
            old_room_number: member.room_number || null,
            new_room_number: member.room_number || null,
            reason: `Tipe kamar otomatis berubah menjadi ${newRoomType} (${remainingMembers.length} orang)`,
            changed_by: (await supabase.auth.getUser()).data?.user?.id || null,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("✅ Penumpang dikeluarkan dari grup!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers-improved'] });
    },
    onError: (error: Error) => toast.error("❌ " + error.message),
  });

  const handleOpenRoommateSelection = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setSelectedRoommateIds(new Set());
    setRoommateSelectionOpen(true);
  };

  const handleConfirmRoommates = () => {
    if (!selectedPassenger) return;
    
    const roomCapacity = getRoomCapacity(selectedPassenger.room_preference || 'quad');
    const maxMates = roomCapacity - 1; // -1 for the main passenger

    if (selectedRoommateIds.size > maxMates) {
      toast.error(`Hanya bisa memilih maksimal ${maxMates} teman sekamar untuk tipe ${selectedPassenger.room_preference}`);
      return;
    }

    createRoomGroupMutation.mutate({
      mainPassengerId: selectedPassenger.id,
      selectedMateIds: Array.from(selectedRoommateIds),
    });
  };

  // Get available candidates for roommate selection
  const getAvailableCandidates = (passenger: Passenger): Passenger[] => {
    if (!passengers) return [];

    return passengers.filter(p => {
      // Can't select self
      if (p.id === passenger.id) return false;

      // Can't select if already in a group
      if (p.room_group_id) return false;

      // Can't select if already selected
      if (selectedRoommateIds.has(p.id)) return false;

      // Must have same room preference
      if (p.room_preference !== passenger.room_preference) return false;

      // Gender check: same gender OR mahram OR spouse
      const sameGender = p.customer?.gender === passenger.customer?.gender;
      const isMahram = p.booking?.id === passenger.booking?.id;
      const isSpouse = passenger.customer?.marital_status === 'married' && 
        p.customer?.marital_status === 'married';

      return sameGender || isMahram || isSpouse;
    });
  };

  const stats = {
    total: passengers?.length || 0,
    grouped: passengers?.filter(p => p.room_group_id).length || 0,
    ungrouped: passengers?.filter(p => !p.room_group_id).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Kamar (Fleksibel)</h1>
          <p className="text-muted-foreground">Atur penempatan kamar dengan multi-select teman sekamar</p>
        </div>
      </div>

      {/* Package & Departure Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Paket</Label>
              <Select value={selectedPackage} onValueChange={(v) => { setSelectedPackage(v); setSelectedDeparture(""); }}>
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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Penumpang</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.grouped}</div>
                <p className="text-xs text-muted-foreground">Sudah Dikelompokkan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{stats.ungrouped}</div>
                <p className="text-xs text-muted-foreground">Belum Dikelompokkan</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama atau nomor HP..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: 'Semua', count: stats.total },
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: '👫 Semua' },
                { key: 'male', label: '👨 Laki-laki' },
                { key: 'female', label: '👩 Perempuan' },
              ].map(item => (
                <Button
                  key={item.key}
                  variant={genderFilter === item.key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setGenderFilter(item.key)}
                  className="text-xs"
                >
                  {item.label}
                </Button>
              ))}

              {[
                { key: 'all', label: 'Semua Status' },
                { key: 'grouped', label: '✅ Sudah Grup' },
                { key: 'ungrouped', label: '❌ Belum Grup' },
              ].map(item => (
                <Button
                  key={item.key}
                  variant={roomStatusFilter === item.key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRoomStatusFilter(item.key === 'grouped' ? 'grouped' : item.key === 'ungrouped' ? 'ungrouped' : 'all')}
                  className="text-xs"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Passengers Table */}
          <Card>
            <CardContent className="pt-6">
              {loadingPassengers ? (
                <p className="text-muted-foreground py-8 text-center">Memuat...</p>
              ) : withAdditionalFilters.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada jamaah.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Tipe Kamar</TableHead>
                      <TableHead>Status Grup</TableHead>
                      <TableHead>Teman Sekamar</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withAdditionalFilters.map(p => {
                      const groupMembers = getGroupMembers(p.room_group_id);
                      const roommateNames = groupMembers
                        .filter(m => m.id !== p.id)
                        .map(m => m.customer?.full_name)
                        .join(", ");

                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.customer?.full_name}</TableCell>
                          <TableCell>
                            <Badge variant={p.customer?.gender === 'male' ? 'default' : 'secondary'}>
                              {GENDER_LABELS[p.customer?.gender || ''] || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ROOM_TYPE_LABELS[p.room_preference || ''] || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.room_group_id ? (
                              <Badge className="bg-green-100 text-green-800">✅ Grup ({groupMembers.length})</Badge>
                            ) : (
                              <Badge variant="secondary">❌ Belum</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {roommateNames || '-'}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            {p.room_group_id ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromGroupMutation.mutate({ passengerId: p.id })}
                                disabled={removeFromGroupMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" /> Keluarkan
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleOpenRoommateSelection(p)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> Pilih Teman
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Roommate Selection Dialog */}
      <Dialog open={roommateSelectionOpen} onOpenChange={setRoommateSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Teman Sekamar</DialogTitle>
          </DialogHeader>
          
          {selectedPassenger && (
            <div className="space-y-4">
              {/* Main Passenger Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-semibold">{selectedPassenger.customer?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Tipe: {ROOM_TYPE_LABELS[selectedPassenger.room_preference || '']}
                  ({getRoomCapacity(selectedPassenger.room_preference || 'quad')} orang)
                </p>
              </div>

              {/* Capacity Info */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-xs font-semibold">
                  Sisa Slot: {getRoomCapacity(selectedPassenger.room_preference || 'quad') - 1 - selectedRoommateIds.size} dari {getRoomCapacity(selectedPassenger.room_preference || 'quad') - 1}
                </p>
                {selectedRoommateIds.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ Dipilih: {selectedRoommateIds.size} orang
                  </p>
                )}
              </div>

              {/* Roommate Selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Pilih Teman Sekamar</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {getAvailableCandidates(selectedPassenger).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Tidak ada kandidat tersedia</p>
                  ) : (
                    getAvailableCandidates(selectedPassenger).map(candidate => (
                      <label key={candidate.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedRoommateIds.has(candidate.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedRoommateIds);
                            if (checked) next.add(candidate.id);
                            else next.delete(candidate.id);
                            setSelectedRoommateIds(next);
                          }}
                          disabled={selectedRoommateIds.size >= (getRoomCapacity(selectedPassenger.room_preference || 'quad') - 1) && !selectedRoommateIds.has(candidate.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{candidate.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {GENDER_LABELS[candidate.customer?.gender || '']} • {candidate.booking?.booking_code}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoommateSelectionOpen(false); setSelectedRoommateIds(new Set()); }}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmRoommates}
              disabled={selectedRoommateIds.size === 0 || createRoomGroupMutation.isPending}
            >
              {createRoomGroupMutation.isPending ? 'Menyimpan...' : `Konfirmasi (${selectedRoommateIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
