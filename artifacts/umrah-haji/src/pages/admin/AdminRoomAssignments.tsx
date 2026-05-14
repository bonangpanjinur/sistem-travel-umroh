import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Users, UserPlus, BedDouble, Search, X, UserCog, UsersRound, Wand2, FileSpreadsheet, FileText } from "lucide-react";
import { ROOM_TYPE_LABELS, GENDER_LABELS } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";
import { Database } from "@/integrations/supabase/types";
import {
  exportRoomingListExcel,
  exportRoomingListPDF,
  type RoomingExportData,
  type RoomingPassenger,
  type RoomTypeDB,
} from "@/lib/rooming-list-exporter";

type RoomType = Database["public"]["Enums"]["room_type"];

interface Passenger {
  id: string;
  room_preference: RoomType | null;
  passenger_type: string | null;
  room_number: string | null;
  room_group_id: string | null;
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

const MAX_ROOM_SIZE = 4;

const getRoomTypeBySize = (size: number): RoomType => {
  if (size === 1) return "single";
  if (size === 2) return "double";
  if (size === 3) return "triple";
  return "quad";
};

const getRoomTypeLabel = (size: number) =>
  ROOM_TYPE_LABELS[getRoomTypeBySize(size)] || `${size} orang`;

export default function AdminRoomAssignmentsImproved() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [roomStatusFilter, setRoomStatusFilter] = useState("all");

  // "New group" dialog state
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [anchorPassenger, setAnchorPassenger] = useState<Passenger | null>(null);
  const [selectedMateIds, setSelectedMateIds] = useState<Set<string>>(new Set());

  // "Edit group" dialog state
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [addMateIds, setAddMateIds] = useState<Set<string>>(new Set());

  const { data: packages } = useQuery({
    queryKey: ["packages-for-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: departures } = useQuery({
    queryKey: ["departures-for-rooms", selectedPackage],
    enabled: !!selectedPackage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, status")
        .eq("package_id", selectedPackage)
        .order("departure_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: passengers, isLoading } = useQuery({
    queryKey: ["room-passengers-improved", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(
          `id, room_preference, passenger_type, room_number, room_group_id, roommate_id, booking_id,
           customer:customers(id, full_name, gender, phone, birth_date, passport_number, passport_expiry),
           booking:bookings!inner(id, booking_code, room_type, departure_id, booking_status)`
        )
        .eq("booking.departure_id", selectedDeparture)
        .in("booking.booking_status", ["confirmed", "pending"]);
      if (error) throw error;
      return data as unknown as Passenger[];
    },
  });

  // Departure metadata for export (package, hotels, airline, flight info)
  const { data: departureMeta } = useQuery({
    queryKey: ["departure-meta-rooming", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(
          `id, departure_date, return_date, flight_number, departure_time,
           package:packages(name, duration_days),
           airline:airlines(name, code),
           hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, city),
           hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, city)`
        )
        .eq("id", selectedDeparture)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getGroupMembers = (groupId: string | null): Passenger[] => {
    if (!groupId || !passengers) return [];
    return passengers.filter((p) => p.room_group_id === groupId);
  };

  /** All ungrouped passengers EXCEPT self, regardless of room_preference.
   *  Gender is kept as soft info but NOT filtered — admin can decide. */
  const getUngroupedCandidates = (excludeId: string): Passenger[] =>
    (passengers || []).filter(
      (p) => p.id !== excludeId && !p.room_group_id
    );

  const filteredPassengers = (passengers || []).filter((p) => {
    if (genderFilter !== "all" && p.customer?.gender !== genderFilter) return false;
    if (roomStatusFilter === "grouped" && !p.room_group_id) return false;
    if (roomStatusFilter === "ungrouped" && p.room_group_id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !p.customer?.full_name?.toLowerCase().includes(q) &&
        !p.customer?.phone?.includes(q) &&
        !p.booking?.booking_code?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const stats = {
    total: passengers?.length || 0,
    grouped: passengers?.filter((p) => p.room_group_id).length || 0,
    ungrouped: passengers?.filter((p) => !p.room_group_id).length || 0,
  };

  // Build unique groups list for the groups view
  const groupsMap = new Map<string, Passenger[]>();
  for (const p of passengers || []) {
    if (p.room_group_id) {
      if (!groupsMap.has(p.room_group_id)) groupsMap.set(p.room_group_id, []);
      groupsMap.get(p.room_group_id)!.push(p);
    }
  }

  // Tally booking room_type counts (apa yang dipesan jamaah)
  const bookingTypeCounts: Record<string, number> = {};
  for (const p of passengers || []) {
    const t = (p.booking?.room_type || "quad") as string;
    bookingTypeCounts[t] = (bookingTypeCounts[t] || 0) + 1;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createGroupMutation = useMutation({
    mutationFn: async ({
      anchorId,
      mateIds,
    }: {
      anchorId: string;
      mateIds: string[];
    }) => {
      const allIds = [anchorId, ...mateIds];
      if (allIds.length > MAX_ROOM_SIZE)
        throw new Error(`Maksimal ${MAX_ROOM_SIZE} orang per kamar`);

      const groupId = uuidv4();
      const roomType = getRoomTypeBySize(allIds.length);

      const updates = allIds.map((id) =>
        supabase
          .from("booking_passengers")
          .update({ room_group_id: groupId, room_preference: roomType } as any)
          .eq("id", id)
      );
      const results = await Promise.all(updates);
      results.forEach((r) => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("✅ Grup kamar berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
      setNewGroupDialogOpen(false);
      setAnchorPassenger(null);
      setSelectedMateIds(new Set());
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  /** Add more ungrouped passengers to an existing group */
  const addToGroupMutation = useMutation({
    mutationFn: async ({
      groupId,
      idsToAdd,
    }: {
      groupId: string;
      idsToAdd: string[];
    }) => {
      const currentMembers = getGroupMembers(groupId);
      const newSize = currentMembers.length + idsToAdd.length;
      if (newSize > MAX_ROOM_SIZE)
        throw new Error(
          `Grup sudah ${currentMembers.length} orang, tidak bisa tambah ${idsToAdd.length} lagi (maks ${MAX_ROOM_SIZE})`
        );

      const newRoomType = getRoomTypeBySize(newSize);

      // Update new members
      const newUpdates = idsToAdd.map((id) =>
        supabase
          .from("booking_passengers")
          .update({ room_group_id: groupId, room_preference: newRoomType } as any)
          .eq("id", id)
      );
      // Update existing members room_preference
      const existingUpdates = currentMembers.map((m) =>
        supabase
          .from("booking_passengers")
          .update({ room_preference: newRoomType } as any)
          .eq("id", m.id)
      );

      const results = await Promise.all([...newUpdates, ...existingUpdates]);
      results.forEach((r) => { if (r.error) throw r.error; });
    },
    onSuccess: () => {
      toast.success("✅ Anggota berhasil ditambahkan ke grup");
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
      setEditGroupDialogOpen(false);
      setEditGroupId(null);
      setAddMateIds(new Set());
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async (passengerId: string) => {
      const passenger = passengers?.find((p) => p.id === passengerId);
      if (!passenger?.room_group_id) throw new Error("Tidak ada dalam grup");

      const remaining = getGroupMembers(passenger.room_group_id).filter(
        (m) => m.id !== passengerId
      );
      const newRoomType = remaining.length > 0 ? getRoomTypeBySize(remaining.length) : "quad";

      // Remove from group
      const { error } = await supabase
        .from("booking_passengers")
        .update({ room_group_id: null, room_preference: "quad" } as any)
        .eq("id", passengerId);
      if (error) throw error;

      // Recalculate remaining members room type
      if (remaining.length > 0) {
        const updates = remaining.map((m) =>
          supabase
            .from("booking_passengers")
            .update({ room_preference: newRoomType } as any)
            .eq("id", m.id)
        );
        const results = await Promise.all(updates);
        results.forEach((r) => { if (r.error) throw r.error; });
      }
    },
    onSuccess: () => {
      toast.success("✅ Dikeluarkan dari grup");
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // ── Auto-arrange by booking room_type ────────────────────────────────────
  // Kelompokkan jamaah ungrouped berdasarkan (booking_id + room_type pesanan)
  // dipotong sesuai kapasitas tipe kamar.
  const autoArrangeMutation = useMutation({
    mutationFn: async () => {
      if (!passengers || passengers.length === 0) return { created: 0 };
      const ungrouped = passengers.filter((p) => !p.room_group_id);
      if (ungrouped.length === 0) return { created: 0 };

      // Bucket by booking_id + room_type
      const buckets = new Map<string, Passenger[]>();
      for (const p of ungrouped) {
        const rt = (p.booking?.room_type || "quad") as RoomType;
        const key = `${p.booking?.id}::${rt}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(p);
      }

      let created = 0;
      const updates: Promise<any>[] = [];
      for (const [key, members] of buckets.entries()) {
        const rt = (key.split("::")[1] || "quad") as RoomType;
        const cap =
          rt === "single" ? 1 : rt === "double" ? 2 : rt === "triple" ? 3 : 4;
        for (let i = 0; i < members.length; i += cap) {
          const chunk = members.slice(i, i + cap);
          const groupId = uuidv4();
          const finalType = getRoomTypeBySize(chunk.length);
          for (const m of chunk) {
            updates.push(
              supabase
                .from("booking_passengers")
                .update({ room_group_id: groupId, room_preference: finalType } as any)
                .eq("id", m.id)
                .select() as unknown as Promise<any>
            );
          }
          created++;
        }
      }
      const results = await Promise.all(updates);
      results.forEach((r) => { if (r.error) throw r.error; });
      return { created };
    },
    onSuccess: ({ created }) => {
      if (created > 0) {
        toast.success(`✅ ${created} grup kamar dibuat otomatis sesuai pesanan`);
      } else {
        toast.info("Tidak ada jamaah ungrouped untuk disusun");
      }
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // Auto-trigger sekali ketika pertama kali memuat keberangkatan dan
  // semua jamaah masih ungrouped.
  const autoArrangedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedDeparture || !passengers || passengers.length === 0) return;
    if (autoArrangedRef.current === selectedDeparture) return;
    const allUngrouped = passengers.every((p) => !p.room_group_id);
    if (allUngrouped) {
      autoArrangedRef.current = selectedDeparture;
      autoArrangeMutation.mutate();
    } else {
      autoArrangedRef.current = selectedDeparture;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeparture, passengers]);

  // ── Export helpers ───────────────────────────────────────────────────────
  const buildExportData = (): RoomingExportData | null => {
    if (!passengers || passengers.length === 0 || !departureMeta) {
      toast.error("Data belum lengkap untuk diekspor");
      return null;
    }
    const expPassengers: RoomingPassenger[] = passengers.map((p) => ({
      id: p.id,
      passenger_type: p.passenger_type,
      room_number: p.room_number,
      roommate_id: p.room_group_id || p.roommate_id, // pakai group_id agar exporter mengelompokkan benar
      booking_id: p.booking?.id || "",
      booking_room_type: ((p.booking?.room_type || "quad") as RoomTypeDB),
      customer: {
        full_name: p.customer?.full_name || "",
        gender: p.customer?.gender,
        birth_date: p.customer?.birth_date,
        passport_number: p.customer?.passport_number,
        passport_expiry: p.customer?.passport_expiry,
      },
    }));
    const hotels = [departureMeta.hotel_makkah, departureMeta.hotel_madinah]
      .filter(Boolean)
      .map((h: any) => ({ name: h.name, city: h.city }));
    return {
      departureDate: departureMeta.departure_date,
      returnDate: departureMeta.return_date,
      airlineName: departureMeta.airline?.name || "",
      airlineCode: departureMeta.airline?.code || null,
      flightNumber: departureMeta.flight_number || null,
      departureTime: departureMeta.departure_time || null,
      packageName: departureMeta.package?.name || "",
      durationDays: departureMeta.package?.duration_days || null,
      welcomeBoard: departureMeta.package?.name || "",
      timeLimit: "-",
      tourLeaderName: null,
      tourLeaderPhone: null,
      hotels,
      passengers: expPassengers,
    };
  };

  const handleExportExcel = () => {
    const data = buildExportData();
    if (data) exportRoomingListExcel(data);
  };
  const handleExportPDF = () => {
    const data = buildExportData();
    if (data) exportRoomingListPDF(data);
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openNewGroup = (p: Passenger) => {
    setAnchorPassenger(p);
    setSelectedMateIds(new Set());
    setNewGroupDialogOpen(true);
  };

  const openEditGroup = (groupId: string) => {
    setEditGroupId(groupId);
    setAddMateIds(new Set());
    setEditGroupDialogOpen(true);
  };

  const totalSlots = anchorPassenger
    ? MAX_ROOM_SIZE - 1
    : 0;
  const newGroupSize = 1 + selectedMateIds.size;
  const newGroupType = getRoomTypeLabel(newGroupSize);

  const editGroupMembers = editGroupId ? getGroupMembers(editGroupId) : [];
  const editGroupRemainingSlots = MAX_ROOM_SIZE - editGroupMembers.length;
  const editGroupCandidates = (passengers || []).filter(
    (p) => !p.room_group_id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Kamar</h1>
        <p className="text-muted-foreground text-sm">
          Kelompokkan jamaah ke grup kamar secara bebas — tipe kamar ditentukan otomatis dari jumlah anggota
        </p>
      </div>

      {/* Package & Departure Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Paket</Label>
              <Select
                value={selectedPackage}
                onValueChange={(v) => { setSelectedPackage(v); setSelectedDeparture(""); }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Keberangkatan</Label>
              <Select
                value={selectedDeparture}
                onValueChange={setSelectedDeparture}
                disabled={!selectedPackage}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPackage ? "Pilih..." : "Pilih paket dulu"} />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {formatDate(dep.departure_date)} — {formatDate(dep.return_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => autoArrangeMutation.mutate()}
              disabled={autoArrangeMutation.isPending || !passengers?.length}
            >
              <Wand2 className="h-4 w-4" />
              {autoArrangeMutation.isPending ? "Menyusun..." : "Susun Otomatis Sesuai Pesanan"}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportPDF}>
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Booking room-type tally */}
          {Object.keys(bookingTypeCounts).length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">
                  Tipe Kamar yang Dipesan
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(bookingTypeCounts).map(([t, n]) => (
                    <Badge key={t} variant="outline" className="gap-1 text-xs">
                      <BedDouble className="h-3 w-3" />
                      {ROOM_TYPE_LABELS[t] || t}: <span className="font-semibold">{n} jamaah</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Total Jamaah</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-green-600">{stats.grouped}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Sudah Dikelompokkan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-amber-600">{stats.ungrouped}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Belum Dikelompokkan</p>
              </CardContent>
            </Card>
          </div>

          {/* Groups overview */}
          {groupsMap.size > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-primary" />
                  Grup Kamar yang Sudah Terbentuk ({groupsMap.size} grup)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(groupsMap.entries()).map(([gid, members]) => (
                    <div
                      key={gid}
                      className="border rounded-lg px-4 py-3 flex flex-col gap-2 bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs">
                          <BedDouble className="h-3 w-3 mr-1" />
                          {ROOM_TYPE_LABELS[getRoomTypeBySize(members.length)]} ({members.length}/{MAX_ROOM_SIZE})
                        </Badge>
                        {members.length < MAX_ROOM_SIZE && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1"
                            onClick={() => openEditGroup(gid)}
                          >
                            <UserPlus className="h-3 w-3" /> Tambah
                          </Button>
                        )}
                      </div>
                      <ul className="space-y-1">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{m.customer?.full_name}</span>
                            <Badge
                              variant={m.customer?.gender === "male" ? "default" : "secondary"}
                              className="text-[10px] h-4 px-1.5 ml-1 shrink-0"
                            >
                              {m.customer?.gender === "male" ? "L" : "P"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, HP, atau kode booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Semua Gender" },
                { key: "male", label: "👨 Laki-laki" },
                { key: "female", label: "👩 Perempuan" },
              ].map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={genderFilter === item.key ? "secondary" : "ghost"}
                  onClick={() => setGenderFilter(item.key)}
                  className="text-xs"
                >
                  {item.label}
                </Button>
              ))}
              {[
                { key: "all", label: "Semua Status" },
                { key: "grouped", label: "✅ Sudah Grup" },
                { key: "ungrouped", label: "⚠️ Belum Grup" },
              ].map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={roomStatusFilter === item.key ? "secondary" : "ghost"}
                  onClick={() => setRoomStatusFilter(item.key)}
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
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Memuat data jamaah...</p>
              ) : filteredPassengers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Tidak ada jamaah ditemukan.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Booking</TableHead>
                    <TableHead>Tipe Pesanan</TableHead>
                      <TableHead>Status Grup</TableHead>
                      <TableHead>Teman Sekamar</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPassengers.map((p) => {
                      const group = getGroupMembers(p.room_group_id);
                      const mates = group.filter((m) => m.id !== p.id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.customer?.full_name}</TableCell>
                          <TableCell>
                            <Badge variant={p.customer?.gender === "male" ? "default" : "secondary"}>
                              {GENDER_LABELS[p.customer?.gender || ""] || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.booking?.booking_code}
                          </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs gap-1">
                            <BedDouble className="h-3 w-3" />
                            {ROOM_TYPE_LABELS[p.booking?.room_type || "quad"] || p.booking?.room_type || "-"}
                          </Badge>
                        </TableCell>
                          <TableCell>
                            {p.room_group_id ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <BedDouble className="h-3 w-3 mr-1" />
                                {ROOM_TYPE_LABELS[getRoomTypeBySize(group.length)]} ({group.length} org)
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Belum ada grup</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[220px]">
                            {mates.length > 0 ? (
                              <span className="truncate block">
                                {mates.map((m) => m.customer?.full_name).join(", ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {p.room_group_id ? (
                                <>
                                  {group.length < MAX_ROOM_SIZE && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 text-xs"
                                      onClick={() => openEditGroup(p.room_group_id!)}
                                    >
                                      <UserCog className="h-3.5 w-3.5" /> Edit Grup
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => removeFromGroupMutation.mutate(p.id)}
                                    disabled={removeFromGroupMutation.isPending}
                                  >
                                    <X className="h-3.5 w-3.5" /> Keluarkan
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => openNewGroup(p)}
                                >
                                  <UserPlus className="h-3.5 w-3.5" /> Pilih Teman
                                </Button>
                              )}
                            </div>
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

      {/* ── New Group Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={newGroupDialogOpen}
        onOpenChange={(open) => {
          setNewGroupDialogOpen(open);
          if (!open) { setAnchorPassenger(null); setSelectedMateIds(new Set()); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Teman Sekamar</DialogTitle>
          </DialogHeader>

          {anchorPassenger && (
            <div className="space-y-4">
              {/* Anchor info */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                <p className="text-sm font-semibold">{anchorPassenger.customer?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {anchorPassenger.booking?.booking_code} ·{" "}
                  {anchorPassenger.customer?.gender === "male" ? "Laki-laki" : "Perempuan"}
                </p>
              </div>

              {/* Live preview of room type */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tipe kamar hasil pilihan</p>
                  <p className="text-sm font-semibold">
                    <BedDouble className="inline h-4 w-4 mr-1 text-amber-600" />
                    {newGroupType} ({newGroupSize} orang)
                  </p>
                </div>
                <Badge variant="outline">{selectedMateIds.size}/{totalSlots} teman</Badge>
              </div>

              {/* Candidate list — all ungrouped passengers shown with checkboxes */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Pilih teman sekamar (bisa lebih dari satu)
                </Label>
                <ScrollArea className="h-[280px] pr-2">
                  {getUngroupedCandidates(anchorPassenger.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Tidak ada jamaah lain yang belum memiliki grup.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {getUngroupedCandidates(anchorPassenger.id).map((c) => {
                        const isChecked = selectedMateIds.has(c.id);
                        const wouldExceed =
                          !isChecked && selectedMateIds.size >= totalSlots;
                        return (
                          <label
                            key={c.id}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-primary/5 border-primary/40"
                                : wouldExceed
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={wouldExceed}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedMateIds);
                                if (checked) next.add(c.id);
                                else next.delete(c.id);
                                setSelectedMateIds(next);
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{c.customer?.full_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {c.booking?.booking_code} ·{" "}
                                {c.customer?.gender === "male" ? "👨 L" : "👩 P"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setNewGroupDialogOpen(false); setSelectedMateIds(new Set()); }}
            >
              Batal
            </Button>
            <Button
              disabled={createGroupMutation.isPending}
              onClick={() =>
                createGroupMutation.mutate({
                  anchorId: anchorPassenger!.id,
                  mateIds: Array.from(selectedMateIds),
                })
              }
            >
              {createGroupMutation.isPending
                ? "Menyimpan..."
                : selectedMateIds.size === 0
                ? "Simpan (1 orang)"
                : `Simpan Grup (${1 + selectedMateIds.size} orang)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Group Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={editGroupDialogOpen}
        onOpenChange={(open) => {
          setEditGroupDialogOpen(open);
          if (!open) { setEditGroupId(null); setAddMateIds(new Set()); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Grup Kamar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current members */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Anggota saat ini ({editGroupMembers.length}/{MAX_ROOM_SIZE})
              </Label>
              <div className="space-y-1.5">
                {editGroupMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.customer?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.booking?.booking_code} · {m.customer?.gender === "male" ? "L" : "P"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeFromGroupMutation.mutate(m.id);
                        // Optimistically close if last member removed
                        if (editGroupMembers.length <= 1) setEditGroupDialogOpen(false);
                      }}
                      disabled={removeFromGroupMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add more members */}
            {editGroupRemainingSlots > 0 && editGroupCandidates.length > 0 && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Tambah Anggota (sisa {editGroupRemainingSlots} slot)
                </Label>
                <ScrollArea className="h-[220px] pr-2">
                  <div className="space-y-1.5">
                    {editGroupCandidates.map((c) => {
                      const isChecked = addMateIds.has(c.id);
                      const wouldExceed =
                        !isChecked && addMateIds.size >= editGroupRemainingSlots;
                      return (
                        <label
                          key={c.id}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-primary/5 border-primary/40"
                              : wouldExceed
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={wouldExceed}
                            onCheckedChange={(checked) => {
                              const next = new Set(addMateIds);
                              if (checked) next.add(c.id);
                              else next.delete(c.id);
                              setAddMateIds(next);
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{c.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.booking?.booking_code} · {c.customer?.gender === "male" ? "👨 L" : "👩 P"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {editGroupRemainingSlots <= 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Kamar sudah penuh ({MAX_ROOM_SIZE}/{MAX_ROOM_SIZE}).
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditGroupDialogOpen(false)}
            >
              Tutup
            </Button>
            {addMateIds.size > 0 && (
              <Button
                disabled={addToGroupMutation.isPending}
                onClick={() =>
                  addToGroupMutation.mutate({
                    groupId: editGroupId!,
                    idsToAdd: Array.from(addMateIds),
                  })
                }
              >
                {addToGroupMutation.isPending
                  ? "Menyimpan..."
                  : `Tambah ${addMateIds.size} Anggota`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
