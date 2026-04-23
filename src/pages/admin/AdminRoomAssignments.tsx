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
import { exportRoomingListExcel, exportRoomingListPDF, type RoomingExportData, type RoomingPassenger, type RoomTypeDB } from "@/lib/rooming-list-exporter";
import { ROOM_TYPE_LABELS, GENDER_LABELS } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";

// --- Audit logging helpers ---
type RoomAuditAction = 'pair' | 'unpair' | 'update_room_number' | 'auto_assign';
interface RoomAuditPayload {
  passenger_id: string;
  departure_id?: string | null;
  action: RoomAuditAction;
  old_room_number?: string | null;
  new_room_number?: string | null;
  old_roommate_id?: string | null;
  new_roommate_id?: string | null;
  reason?: string | null;
}
async function logRoomAudit(entries: RoomAuditPayload | RoomAuditPayload[]) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;
    const list = Array.isArray(entries) ? entries : [entries];
    const rows = list.map(e => ({ ...e, changed_by: uid }));
    await (supabase as any).from('room_assignment_audit').insert(rows);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

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
    birth_date?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
  };
  booking: {
    id: string;
    booking_code: string;
    room_type?: string | null;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unpairReasonOpen, setUnpairReasonOpen] = useState(false);
  const [unpairTarget, setUnpairTarget] = useState<string | null>(null);
  const [unpairReason, setUnpairReason] = useState("");
  // Audit filter state
  const [auditDateFrom, setAuditDateFrom] = useState<string>("");
  const [auditDateTo, setAuditDateTo] = useState<string>("");
  const [auditAction, setAuditAction] = useState<string>("all");
  const [auditBranch, setAuditBranch] = useState<string>("current");

  const { data: branches } = useQuery({
    queryKey: ['branches-for-audit-filter'],
    enabled: historyOpen,
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

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
        .select(`id, room_preference, passenger_type, room_number, roommate_id, customer:customers(id, full_name, gender, phone, birth_date, passport_number, passport_expiry), booking:bookings!inner(id, booking_code, room_type, departure_id, booking_status)`)
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
    mutationFn: async ({ passengerId, roommateId, roomNumber, reason }: { passengerId: string; roommateId: string; roomNumber?: string; reason?: string }) => {
      const passengerA = passengers?.find(p => p.id === passengerId);
      const passengerB = passengers?.find(p => p.id === roommateId);
      const results = await Promise.all([
        supabase.from('booking_passengers').update({ roommate_id: roommateId, room_number: roomNumber || null }).eq('id', passengerId),
        supabase.from('booking_passengers').update({ roommate_id: passengerId, room_number: roomNumber || null }).eq('id', roommateId),
      ]);
      results.forEach(r => { if (r.error) throw r.error; });
      await logRoomAudit([
        { passenger_id: passengerId, departure_id: selectedDeparture, action: 'pair',
          old_room_number: passengerA?.room_number || null, new_room_number: roomNumber || null,
          old_roommate_id: passengerA?.roommate_id || null, new_roommate_id: roommateId, reason: reason || null },
        { passenger_id: roommateId, departure_id: selectedDeparture, action: 'pair',
          old_room_number: passengerB?.room_number || null, new_room_number: roomNumber || null,
          old_roommate_id: passengerB?.roommate_id || null, new_roommate_id: passengerId, reason: reason || null },
      ]);
    },
    onSuccess: () => {
      toast.success("Berhasil memasangkan jamaah!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
      queryClient.invalidateQueries({ queryKey: ['room-assignment-audit'] });
      setPairingDialogOpen(false);
      setSelectedPassenger(null);
    },
    onError: (error) => toast.error("Gagal: " + error.message),
  });

  const unpairMutation = useMutation({
    mutationFn: async ({ passengerId, reason }: { passengerId: string; reason?: string }) => {
      const passenger = passengers?.find(p => p.id === passengerId);
      if (!passenger?.roommate_id) return;
      const roommate = passengers?.find(p => p.id === passenger.roommate_id);
      const results = await Promise.all([
        supabase.from('booking_passengers').update({ roommate_id: null, room_number: null }).eq('id', passengerId),
        supabase.from('booking_passengers').update({ roommate_id: null, room_number: null }).eq('id', passenger.roommate_id),
      ]);
      results.forEach(r => { if (r.error) throw r.error; });
      await logRoomAudit([
        { passenger_id: passengerId, departure_id: selectedDeparture, action: 'unpair',
          old_room_number: passenger.room_number || null, new_room_number: null,
          old_roommate_id: passenger.roommate_id, new_roommate_id: null, reason: reason || null },
        { passenger_id: passenger.roommate_id, departure_id: selectedDeparture, action: 'unpair',
          old_room_number: roommate?.room_number || null, new_room_number: null,
          old_roommate_id: passengerId, new_roommate_id: null, reason: reason || null },
      ]);
    },
    onSuccess: () => {
      toast.success("Pasangan dibatalkan!");
      queryClient.invalidateQueries({ queryKey: ['room-passengers'] });
      queryClient.invalidateQueries({ queryKey: ['room-assignment-audit'] });
      setUnpairReasonOpen(false);
      setUnpairTarget(null);
      setUnpairReason("");
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ passengerId, roomNumber }: { passengerId: string; roomNumber: string }) => {
      const passenger = passengers?.find(p => p.id === passengerId);
      const oldRoom = passenger?.room_number || null;

      // Capacity validation
      if (roomNumber && passenger?.room_preference) {
        const capacityMap: Record<string, number> = { quad: 4, triple: 3, double: 2, single: 1 };
        const cap = capacityMap[passenger.room_preference] ?? 99;
        const sameRoom = passengers?.filter(
          p => p.room_number === roomNumber && p.id !== passengerId
        ) || [];
        const mismatched = sameRoom.find(p => p.room_preference !== passenger.room_preference);
        if (mismatched) {
          throw new Error(`Nomor kamar "${roomNumber}" sudah dipakai untuk tipe ${mismatched.room_preference?.toUpperCase()}. Gunakan nomor berbeda.`);
        }
        if (sameRoom.length + 1 > cap) {
          throw new Error(`Kamar tipe ${passenger.room_preference.toUpperCase()} maksimal ${cap} orang per nomor kamar. Saat ini sudah ${sameRoom.length} orang di kamar "${roomNumber}".`);
        }
      }

      const { error } = await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', passengerId);
      if (error) throw error;

      await logRoomAudit({
        passenger_id: passengerId, departure_id: selectedDeparture, action: 'update_room_number',
        old_room_number: oldRoom, new_room_number: roomNumber || null,
        old_roommate_id: passenger?.roommate_id || null, new_roommate_id: passenger?.roommate_id || null,
      });

      // Auto-sync roommate
      if (passenger?.roommate_id) {
        const mate = passengers?.find(p => p.id === passenger.roommate_id);
        await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', passenger.roommate_id);
        await logRoomAudit({
          passenger_id: passenger.roommate_id, departure_id: selectedDeparture, action: 'update_room_number',
          old_room_number: mate?.room_number || null, new_room_number: roomNumber || null,
          reason: 'Sinkron otomatis dengan pasangan',
        });
      }
      const linkedPassengers = passengers?.filter(p => p.roommate_id === passengerId && p.id !== passengerId) || [];
      for (const linked of linkedPassengers) {
        await supabase.from('booking_passengers').update({ room_number: roomNumber || null }).eq('id', linked.id);
        await logRoomAudit({
          passenger_id: linked.id, departure_id: selectedDeparture, action: 'update_room_number',
          old_room_number: linked.room_number || null, new_room_number: roomNumber || null,
          reason: 'Sinkron otomatis dengan anggota grup',
        });
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
              const roommateId = groupSize === 2 
                ? (member.id === chunk[0].id ? chunk[1].id : chunk[0].id)
                : anchorId;
              await supabase.from('booking_passengers').update({ roommate_id: roommateId }).eq('id', member.id);
              await logRoomAudit({
                passenger_id: member.id, departure_id: selectedDeparture, action: 'auto_assign',
                old_room_number: member.room_number || null, new_room_number: member.room_number || null,
                old_roommate_id: member.roommate_id || null, new_roommate_id: roommateId,
                reason: `Auto-kelompokkan tipe ${roomType.toUpperCase()} berdasarkan gender`,
              });
            }
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
      queryClient.invalidateQueries({ queryKey: ['room-assignment-audit'] });
    },
    onError: (err) => toast.error("Gagal: " + err.message),
  });

  // Audit log query (with filters)
  const { data: auditLogs } = useQuery({
    queryKey: ['room-assignment-audit', selectedDeparture, auditBranch, auditAction, auditDateFrom, auditDateTo],
    enabled: historyOpen && (auditBranch !== 'current' || !!selectedDeparture),
    queryFn: async () => {
      // Resolve which departure_ids to include
      let departureIds: string[] | null = null;
      if (auditBranch === 'current') {
        departureIds = selectedDeparture ? [selectedDeparture] : [];
      } else if (auditBranch !== 'all') {
        // Filter by branch: get all departures via packages.branch_id OR via bookings.branch_id
        const { data: depsViaPkg } = await supabase
          .from('departures')
          .select('id, package:packages!inner(branch_id)')
          .eq('package.branch_id', auditBranch);
        departureIds = (depsViaPkg || []).map((d: any) => d.id);
      }

      let q = (supabase as any)
        .from('room_assignment_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (departureIds) {
        if (departureIds.length === 0) return [];
        q = q.in('departure_id', departureIds);
      }
      if (auditAction !== 'all') q = q.eq('action', auditAction);
      if (auditDateFrom) q = q.gte('created_at', `${auditDateFrom}T00:00:00`);
      if (auditDateTo) q = q.lte('created_at', `${auditDateTo}T23:59:59`);

      const { data, error } = await q;
      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((r: any) => r.changed_by).filter(Boolean)));
      const passengerIds = Array.from(new Set((data || []).flatMap((r: any) => [r.passenger_id, r.old_roommate_id, r.new_roommate_id]).filter(Boolean)));
      const depIds = Array.from(new Set((data || []).map((r: any) => r.departure_id).filter(Boolean)));

      const [profilesRes, passengersRes, depsRes] = await Promise.all([
        userIds.length ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds as string[]) : Promise.resolve({ data: [] as any[] }),
        passengerIds.length ? supabase.from('booking_passengers').select('id, customer:customers(full_name)').in('id', passengerIds as string[]) : Promise.resolve({ data: [] as any[] }),
        depIds.length ? supabase.from('departures').select('id, departure_date, package:packages(name, code, branch:branches(name))').in('id', depIds as string[]) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name]));
      const paxMap = new Map((passengersRes.data || []).map((p: any) => [p.id, p.customer?.full_name || '-']));
      const depMap = new Map((depsRes.data || []).map((d: any) => [d.id, d]));

      return (data || []).map((r: any) => {
        const dep: any = depMap.get(r.departure_id);
        return {
          ...r,
          changed_by_name: r.changed_by ? (profileMap.get(r.changed_by) || 'Unknown') : 'System',
          passenger_name: paxMap.get(r.passenger_id) || '-',
          old_roommate_name: r.old_roommate_id ? paxMap.get(r.old_roommate_id) || '-' : null,
          new_roommate_name: r.new_roommate_id ? paxMap.get(r.new_roommate_id) || '-' : null,
          package_name: dep?.package?.name || '-',
          package_code: dep?.package?.code || '-',
          branch_name: dep?.package?.branch?.name || '-',
          departure_date: dep?.departure_date || null,
        };
      });
    },
  });

  const handleExportAuditCSV = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast.error('Tidak ada data riwayat untuk diekspor');
      return;
    }
    const actionLabel: Record<string, string> = {
      pair: 'Pasangkan',
      unpair: 'Batalkan Pasangan',
      update_room_number: 'Ubah Nomor Kamar',
      auto_assign: 'Auto-Kelompokkan',
    };
    const headers = [
      'Waktu', 'Aksi', 'Jamaah', 'No Kamar Lama', 'No Kamar Baru',
      'Pasangan Lama', 'Pasangan Baru', 'Diubah Oleh', 'Alasan',
      'Cabang', 'Paket', 'Tanggal Berangkat',
    ];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = auditLogs.map((log: any) => [
      new Date(log.created_at).toLocaleString('id-ID'),
      actionLabel[log.action] || log.action,
      log.passenger_name,
      log.old_room_number || '',
      log.new_room_number || '',
      log.old_roommate_name || '',
      log.new_roommate_name || '',
      log.changed_by_name,
      log.reason || '',
      log.branch_name,
      `${log.package_name} (${log.package_code})`,
      log.departure_date || '',
    ].map(escape).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-kamar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Berhasil ekspor ${auditLogs.length} baris riwayat`);
  };



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
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4 mr-1" /> Riwayat
            </Button>
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
          )}

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
                          <Button variant="ghost" size="sm" onClick={() => { setUnpairTarget(group[0].id); setUnpairReason(""); setUnpairReasonOpen(true); }} disabled={unpairMutation.isPending}>
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
        onPair={(roommateId, roomNumber, reason) => {
          if (selectedPassenger) pairMutation.mutate({ passengerId: selectedPassenger.id, roommateId, roomNumber, reason });
        }}
        isPairing={pairMutation.isPending}
      />

      {/* Unpair Reason Dialog */}
      <Dialog open={unpairReasonOpen} onOpenChange={setUnpairReasonOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Batalkan Pasangan Kamar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Catat alasan pembatalan pasangan ini untuk audit trail.</p>
            <div>
              <Label>Alasan (opsional)</Label>
              <Textarea
                value={unpairReason}
                onChange={e => setUnpairReason(e.target.value)}
                placeholder="Contoh: Permintaan jamaah ingin pindah pasangan"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpairReasonOpen(false)}>Batal</Button>
            <Button onClick={() => { if (unpairTarget) unpairMutation.mutate({ passengerId: unpairTarget, reason: unpairReason }); }} disabled={unpairMutation.isPending}>
              Konfirmasi Pembatalan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Riwayat Perubahan Kamar
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-xs">Cabang</Label>
              <Select value={auditBranch} onValueChange={setAuditBranch}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Keberangkatan Aktif</SelectItem>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Aksi</Label>
              <Select value={auditAction} onValueChange={setAuditAction}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  <SelectItem value="pair">Pasangkan</SelectItem>
                  <SelectItem value="unpair">Batalkan Pasangan</SelectItem>
                  <SelectItem value="update_room_number">Ubah Nomor Kamar</SelectItem>
                  <SelectItem value="auto_assign">Auto-Kelompokkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" className="h-9" value={auditDateFrom} onChange={e => setAuditDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" className="h-9" value={auditDateTo} onChange={e => setAuditDateTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={() => { setAuditAction('all'); setAuditDateFrom(''); setAuditDateTo(''); setAuditBranch('current'); }}>
                Reset
              </Button>
              <Button size="sm" className="h-9" onClick={handleExportAuditCSV} disabled={!auditLogs?.length}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Menampilkan <span className="font-medium text-foreground">{auditLogs?.length || 0}</span> baris riwayat
            {auditBranch === 'current' && !selectedDeparture && ' — pilih keberangkatan terlebih dahulu atau ubah filter Cabang'}
          </div>

          {!auditLogs || auditLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada riwayat sesuai filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Jamaah</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Pasangan</TableHead>
                  {auditBranch !== 'current' && <TableHead>Cabang / Paket</TableHead>}
                  <TableHead>Diubah Oleh</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any) => {
                  const actionLabel: Record<string, string> = {
                    pair: 'Pasangkan',
                    unpair: 'Batalkan Pasangan',
                    update_room_number: 'Ubah Nomor',
                    auto_assign: 'Auto-Kelompokkan',
                  };
                  const actionVariant: Record<string, any> = {
                    pair: 'default', unpair: 'destructive', update_room_number: 'secondary', auto_assign: 'outline',
                  };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('id-ID')}</TableCell>
                      <TableCell><Badge variant={actionVariant[log.action] || 'outline'}>{actionLabel[log.action] || log.action}</Badge></TableCell>
                      <TableCell className="font-medium">{log.passenger_name}</TableCell>
                      <TableCell className="text-xs">
                        {log.old_room_number || '—'} → <span className="font-medium">{log.new_room_number || '—'}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.old_roommate_name || '—'} → <span className="font-medium">{log.new_roommate_name || '—'}</span>
                      </TableCell>
                      {auditBranch !== 'current' && (
                        <TableCell className="text-xs">
                          <div className="font-medium">{log.branch_name}</div>
                          <div className="text-muted-foreground">{log.package_code}</div>
                        </TableCell>
                      )}
                      <TableCell className="text-xs">{log.changed_by_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{log.reason || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---

function PairingDialog({ open, onOpenChange, selectedPassenger, unpairedPassengers, searchQuery, onSearchChange, onPair, isPairing }: {
  open: boolean; onOpenChange: (o: boolean) => void; selectedPassenger: Passenger | null;
  unpairedPassengers: Passenger[]; searchQuery: string; onSearchChange: (q: string) => void;
  onPair: (id: string, room?: string, reason?: string) => void; isPairing: boolean;
}) {
  const [selectedRoommate, setSelectedRoommate] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [reason, setReason] = useState("");
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
            <div>
              <Label>Alasan (opsional)</Label>
              <Textarea placeholder="Contoh: Permintaan jamaah" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
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
          <Button onClick={() => { if (selectedRoommate) onPair(selectedRoommate, roomNumber, reason); }} disabled={!selectedRoommate || isPairing}>Pasangkan</Button>
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
