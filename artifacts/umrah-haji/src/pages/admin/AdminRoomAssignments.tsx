import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import {
  Users,
  UserPlus,
  BedDouble,
  Search,
  X,
  UserCog,
  UsersRound,
  Wand2,
  FileSpreadsheet,
  FileText,
  Hotel,
  Hash,
  Pencil,
  Check,
} from "lucide-react";
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
  room_number_makkah: string | null;
  room_number_madinah: string | null;
  room_hotel_notes: string | null;
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

interface HotelRoomFormData {
  room_number_makkah: string;
  room_number_madinah: string;
  room_hotel_notes: string;
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

  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [anchorPassenger, setAnchorPassenger] = useState<Passenger | null>(
    null,
  );
  const [selectedMateIds, setSelectedMateIds] = useState<Set<string>>(
    new Set(),
  );

  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [addMateIds, setAddMateIds] = useState<Set<string>>(new Set());

  // ── Hotel Room Number dialog state ─────────────────────────────────────────
  const [roomNumberDialogOpen, setRoomNumberDialogOpen] = useState(false);
  const [roomNumberGroupId, setRoomNumberGroupId] = useState<string | null>(
    null,
  );
  const [hotelNames, setHotelNames] = useState<{
    makkah: string;
    madinah: string;
  }>({
    makkah: "Hotel Makkah",
    madinah: "Hotel Madinah",
  });
  const [hotelRoomForm, setHotelRoomForm] = useState<HotelRoomFormData>({
    room_number_makkah: "",
    room_number_madinah: "",
    room_hotel_notes: "",
  });

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
          `id, room_preference, passenger_type, room_number,
           room_number_makkah, room_number_madinah, room_hotel_notes,
           room_group_id, roommate_id, booking_id,
           customer:customers(id, full_name, gender, phone, birth_date, passport_number, passport_expiry),
           booking:bookings!inner(id, booking_code, room_type, departure_id, booking_status)`,
        )
        .eq("booking.departure_id", selectedDeparture)
        .in("booking.booking_status", ["confirmed", "pending"]);
      if (error) throw error;
      return data as unknown as Passenger[];
    },
  });

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
           hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, city)`,
        )
        .eq("id", selectedDeparture)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Update hotel names when departure meta loads
  useEffect(() => {
    if (departureMeta) {
      setHotelNames({
        makkah: departureMeta.hotel_makkah?.name || "Hotel Makkah",
        madinah: departureMeta.hotel_madinah?.name || "Hotel Madinah",
      });
    }
  }, [departureMeta]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getGroupMembers = (groupId: string | null): Passenger[] => {
    if (!groupId || !passengers) return [];
    return passengers.filter((p) => p.room_group_id === groupId);
  };

  const getUngroupedCandidates = (excludeId: string): Passenger[] =>
    (passengers || []).filter((p) => p.id !== excludeId && !p.room_group_id);

  const filteredPassengers = (passengers || []).filter((p) => {
    if (genderFilter !== "all" && p.customer?.gender !== genderFilter)
      return false;
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
    withRoomNumber:
      passengers?.filter(
        (p) =>
          p.room_group_id && (p.room_number_makkah || p.room_number_madinah),
      ).length || 0,
  };

  const groupsMap = new Map<string, Passenger[]>();
  for (const p of passengers || []) {
    if (p.room_group_id) {
      if (!groupsMap.has(p.room_group_id)) groupsMap.set(p.room_group_id, []);
      groupsMap.get(p.room_group_id)!.push(p);
    }
  }

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
          .eq("id", id),
      );
      const results = await Promise.all(updates);
      results.forEach((r) => {
        if (r.error) throw r.error;
      });
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
          `Grup sudah ${currentMembers.length} orang, tidak bisa tambah ${idsToAdd.length} lagi (maks ${MAX_ROOM_SIZE})`,
        );

      const newRoomType = getRoomTypeBySize(newSize);
      const firstMember = currentMembers[0];

      const newUpdates = idsToAdd.map((id) =>
        supabase
          .from("booking_passengers")
          .update({
            room_group_id: groupId,
            room_preference: newRoomType,
            room_number_makkah: firstMember?.room_number_makkah || null,
            room_number_madinah: firstMember?.room_number_madinah || null,
            room_hotel_notes: firstMember?.room_hotel_notes || null,
          } as any)
          .eq("id", id),
      );
      const existingUpdates = currentMembers.map((m) =>
        supabase
          .from("booking_passengers")
          .update({ room_preference: newRoomType } as any)
          .eq("id", m.id),
      );

      const results = await Promise.all([...newUpdates, ...existingUpdates]);
      results.forEach((r) => {
        if (r.error) throw r.error;
      });
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
        (m) => m.id !== passengerId,
      );
      const newRoomType =
        remaining.length > 0 ? getRoomTypeBySize(remaining.length) : "quad";

      const { error } = await supabase
        .from("booking_passengers")
        .update({
          room_group_id: null,
          room_preference: "quad",
          room_number_makkah: null,
          room_number_madinah: null,
          room_hotel_notes: null,
        } as any)
        .eq("id", passengerId);
      if (error) throw error;

      if (remaining.length > 0) {
        const updates = remaining.map((m) =>
          supabase
            .from("booking_passengers")
            .update({ room_preference: newRoomType } as any)
            .eq("id", m.id),
        );
        const results = await Promise.all(updates);
        results.forEach((r) => {
          if (r.error) throw r.error;
        });
      }
    },
    onSuccess: () => {
      toast.success("✅ Dikeluarkan dari grup");
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // ── Hotel Room Number mutation ─────────────────────────────────────────────
  const setRoomNumberMutation = useMutation({
    mutationFn: async ({
      groupId,
      form,
    }: {
      groupId: string;
      form: HotelRoomFormData;
    }) => {
      const members = getGroupMembers(groupId);
      if (members.length === 0) throw new Error("Grup tidak ditemukan");

      const updates = members.map((m) =>
        supabase
          .from("booking_passengers")
          .update({
            room_number_makkah: form.room_number_makkah.trim() || null,
            room_number_madinah: form.room_number_madinah.trim() || null,
            room_hotel_notes: form.room_hotel_notes.trim() || null,
          } as any)
          .eq("id", m.id),
      );
      const results = await Promise.all(updates);
      results.forEach((r) => {
        if (r.error) throw r.error;
      });
    },
    onSuccess: () => {
      toast.success("✅ Nomor kamar hotel berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
      setRoomNumberDialogOpen(false);
      setRoomNumberGroupId(null);
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // ── Auto-arrange ─────────────────────────────────────────────────────────
  const autoArrangeMutation = useMutation({
    mutationFn: async () => {
      if (!passengers || passengers.length === 0) return { created: 0 };
      const ungrouped = passengers.filter((p) => !p.room_group_id);
      if (ungrouped.length === 0) return { created: 0 };

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
                .update({
                  room_group_id: groupId,
                  room_preference: finalType,
                } as any)
                .eq("id", m.id)
                .select() as unknown as Promise<any>,
            );
          }
          created++;
        }
      }
      const results = await Promise.all(updates);
      results.forEach((r) => {
        if (r.error) throw r.error;
      });
      return { created };
    },
    onSuccess: ({ created }) => {
      if (created > 0) {
        toast.success(
          `✅ ${created} grup kamar dibuat otomatis sesuai pesanan`,
        );
      } else {
        toast.info("Tidak ada jamaah ungrouped untuk disusun");
      }
      queryClient.invalidateQueries({ queryKey: ["room-passengers-improved"] });
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

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
      room_number: p.room_number_makkah || p.room_number || null,
      roommate_id: p.room_group_id || p.roommate_id,
      booking_id: p.booking?.id || "",
      booking_room_type: (p.booking?.room_type || "quad") as RoomTypeDB,
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

  const openRoomNumberDialog = (groupId: string) => {
    const members = getGroupMembers(groupId);
    const first = members[0];
    setRoomNumberGroupId(groupId);
    setHotelRoomForm({
      room_number_makkah: first?.room_number_makkah || "",
      room_number_madinah: first?.room_number_madinah || "",
      room_hotel_notes: first?.room_hotel_notes || "",
    });
    setRoomNumberDialogOpen(true);
  };

  const totalSlots = anchorPassenger ? MAX_ROOM_SIZE - 1 : 0;
  const newGroupSize = 1 + selectedMateIds.size;
  const newGroupType = getRoomTypeLabel(newGroupSize);

  const editGroupMembers = editGroupId ? getGroupMembers(editGroupId) : [];
  const editGroupRemainingSlots = MAX_ROOM_SIZE - editGroupMembers.length;
  const editGroupCandidates = (passengers || []).filter(
    (p) => !p.room_group_id,
  );

  const roomNumberGroupMembers = roomNumberGroupId
    ? getGroupMembers(roomNumberGroupId)
    : [];

  const groupsWithRoomCount = Array.from(groupsMap.values()).filter(
    (members) =>
      members[0]?.room_number_makkah || members[0]?.room_number_madinah,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Kamar</h1>
        <p className="text-muted-foreground text-sm">
          Kelompokkan jamaah ke grup kamar, lalu tetapkan nomor kamar hotel
          spesifik per grup
        </p>
      </div>

      {/* Package & Departure Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Paket
              </Label>
              <Select
                value={selectedPackage}
                onValueChange={(v) => {
                  setSelectedPackage(v);
                  setSelectedDeparture("");
                }}
              >
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
              <Label className="text-sm text-muted-foreground mb-2 block">
                Keberangkatan
              </Label>
              <Select
                value={selectedDeparture}
                onValueChange={setSelectedDeparture}
                disabled={!selectedPackage}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedPackage ? "Pilih..." : "Pilih paket dulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {formatDate(dep.departure_date)} —{" "}
                      {formatDate(dep.return_date)}
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
              {autoArrangeMutation.isPending
                ? "Menyusun..."
                : "Susun Otomatis Sesuai Pesanan"}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleExportExcel}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleExportPDF}
              >
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Hotel info banner */}
          {departureMeta &&
            (departureMeta.hotel_makkah || departureMeta.hotel_madinah) && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                    <Hotel className="h-3.5 w-3.5" /> Hotel Keberangkatan
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {departureMeta.hotel_makkah && (
                      <div className="text-sm">
                        <span className="text-muted-foreground text-xs">
                          Makkah:{" "}
                        </span>
                        <span className="font-medium">
                          {departureMeta.hotel_makkah.name}
                        </span>
                      </div>
                    )}
                    {departureMeta.hotel_madinah && (
                      <div className="text-sm">
                        <span className="text-muted-foreground text-xs">
                          Madinah:{" "}
                        </span>
                        <span className="font-medium">
                          {departureMeta.hotel_madinah.name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                      {ROOM_TYPE_LABELS[t] || t}:{" "}
                      <span className="font-semibold">{n} jamaah</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Jamaah
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-green-600">
                  {stats.grouped}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sudah Dikelompokkan
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-amber-600">
                  {stats.ungrouped}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Belum Dikelompokkan
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-blue-600">
                  {groupsWithRoomCount}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grup Sudah Ada Nomor Kamar
                </p>
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
                  {Array.from(groupsMap.entries()).map(([gid, members]) => {
                    const first = members[0];
                    const hasMakkah = !!first?.room_number_makkah;
                    const hasMadinah = !!first?.room_number_madinah;
                    const hasRoomNumber = hasMakkah || hasMadinah;

                    return (
                      <div
                        key={gid}
                        className={`border rounded-lg px-4 py-3 flex flex-col gap-2 ${
                          hasRoomNumber
                            ? "bg-green-50/60 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                            : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <BedDouble className="h-3 w-3 mr-1" />
                            {
                              ROOM_TYPE_LABELS[
                                getRoomTypeBySize(members.length)
                              ]
                            }{" "}
                            ({members.length}/{MAX_ROOM_SIZE})
                          </Badge>
                          <div className="flex gap-1">
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
                            <Button
                              size="sm"
                              variant={hasRoomNumber ? "secondary" : "default"}
                              className="h-7 text-xs px-2 gap-1"
                              onClick={() => openRoomNumberDialog(gid)}
                            >
                              <Hash className="h-3 w-3" />
                              {hasRoomNumber
                                ? "Edit No. Kamar"
                                : "Set No. Kamar"}
                            </Button>
                          </div>
                        </div>

                        {/* Hotel room numbers display */}
                        {hasRoomNumber && (
                          <div className="rounded-md bg-white dark:bg-background border px-3 py-2 space-y-1">
                            {hasMakkah && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Hotel className="h-3 w-3 text-green-600 shrink-0" />
                                <span className="text-muted-foreground">
                                  {hotelNames.makkah}:
                                </span>
                                <span className="font-semibold text-green-700 dark:text-green-400">
                                  Kamar {first.room_number_makkah}
                                </span>
                              </div>
                            )}
                            {hasMadinah && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Hotel className="h-3 w-3 text-blue-600 shrink-0" />
                                <span className="text-muted-foreground">
                                  {hotelNames.madinah}:
                                </span>
                                <span className="font-semibold text-blue-700 dark:text-blue-400">
                                  Kamar {first.room_number_madinah}
                                </span>
                              </div>
                            )}
                            {first?.room_hotel_notes && (
                              <div className="text-xs text-muted-foreground italic mt-1">
                                {first.room_hotel_notes}
                              </div>
                            )}
                          </div>
                        )}

                        <ul className="space-y-1">
                          {members.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate flex-1">
                                {m.customer?.full_name}
                              </span>
                              <Badge
                                variant={
                                  m.customer?.gender === "male"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px] h-4 px-1.5 ml-1 shrink-0"
                              >
                                {m.customer?.gender === "male" ? "L" : "P"}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
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
                  variant={
                    roomStatusFilter === item.key ? "secondary" : "ghost"
                  }
                  onClick={() => setRoomStatusFilter(item.key)}
                  className="text-xs"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Global auto-assign button (visible in all/non-double tabs) */}
          {selectedRoomType !== "double" && (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => autoAssignMutation.mutate()}
                disabled={autoAssignMutation.isPending}
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Auto-Kelompokkan Semua Tipe Kamar
              </Button>
              <span className="text-xs text-muted-foreground">
                Kelompokkan jamaah berdasarkan tipe kamar & gender
              </span>
            </div>
          )}

          {/* Double: pairing section */}
          {selectedRoomType === "double" && (
            <div className="space-y-4">
              {/* Auto-assign button */}
              {unpairedDoubleList.length >= 2 && (
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => autoAssignMutation.mutate()}
                    disabled={autoAssignMutation.isPending}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Auto-Pasangkan ({unpairedDoubleList.length} belum)
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Dipasangkan berdasarkan gender yang sama
                  </span>
                </div>
              )}

              {/* Unpaired */}
              {unpairedDoubleList.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
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
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpairedDoubleList.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.customer?.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.customer?.gender === "male"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {GENDER_LABELS[p.customer?.gender || ""] || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.customer?.phone || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPairing(p)}
                              >
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
                    <CardTitle className="text-base text-green-600">
                      Sudah Dipasangkan ({pairedGroups.length} kamar)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pairedGroups.map((group, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <BedDouble className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm font-medium">
                              {group[0].room_number || `#${idx + 1}`}
                            </span>
                            <span className="text-sm">—</span>
                            {group
                              .map((p) => (
                                <span key={p.id} className="text-sm">
                                  {p.customer?.full_name}
                                </span>
                              ))
                              .reduce(
                                (prev, curr, i) =>
                                  i === 0
                                    ? [curr]
                                    : [
                                        ...prev,
                                        <span
                                          key={`sep-${i}`}
                                          className="text-muted-foreground"
                                        >
                                          &
                                        </span>,
                                        curr,
                                      ],
                                [] as any,
                              )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUnpairTarget(group[0].id);
                              setUnpairReason("");
                              setUnpairReasonOpen(true);
                            }}
                            disabled={unpairMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {doublePassengers?.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Belum ada jamaah Double.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Other tabs: grouped-by-room view for triple/quad/single */}
          {selectedRoomType !== "double" && (
            <GroupedRoomView
              passengers={withAdditionalFilters}
              allPassengers={passengers || []}
              loading={loadingPassengers}
              onSaveRoom={(passengerId, val) =>
                updateRoomMutation.mutate({ passengerId, roomNumber: val })
              }
              onPair={(passengerId, roommateId, roomNumber) =>
                pairMutation.mutate({ passengerId, roommateId, roomNumber })
              }
              onUnpair={(passengerId) => {
                setUnpairTarget(passengerId);
                setUnpairReason("");
                setUnpairReasonOpen(true);
              }}
            />
          )}

          {/* Passengers Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Memuat data jamaah...
                </p>
              ) : filteredPassengers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Tidak ada jamaah ditemukan.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Tipe Pesanan</TableHead>
                        <TableHead>Status Grup</TableHead>
                        <TableHead>No. Kamar Hotel</TableHead>
                        <TableHead>Teman Sekamar</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p) => {
                        const group = getGroupMembers(p.room_group_id);
                        const mates = group.filter((m) => m.id !== p.id);
                        const hasMakkah = !!p.room_number_makkah;
                        const hasMadinah = !!p.room_number_madinah;

                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.customer?.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.customer?.gender === "male"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {GENDER_LABELS[p.customer?.gender || ""] || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.booking?.booking_code}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <BedDouble className="h-3 w-3" />
                                {ROOM_TYPE_LABELS[
                                  p.booking?.room_type || "quad"
                                ] ||
                                  p.booking?.room_type ||
                                  "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.room_group_id ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <BedDouble className="h-3 w-3 mr-1" />
                                  {
                                    ROOM_TYPE_LABELS[
                                      getRoomTypeBySize(group.length)
                                    ]
                                  }{" "}
                                  ({group.length} org)
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Belum ada grup
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasMakkah || hasMadinah ? (
                                <div className="space-y-0.5">
                                  {hasMakkah && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <Hotel className="h-3 w-3 text-green-600 shrink-0" />
                                      <span className="font-medium text-green-700 dark:text-green-400">
                                        {p.room_number_makkah}
                                      </span>
                                      <span className="text-muted-foreground">
                                        (Makkah)
                                      </span>
                                    </div>
                                  )}
                                  {hasMadinah && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <Hotel className="h-3 w-3 text-blue-600 shrink-0" />
                                      <span className="font-medium text-blue-700 dark:text-blue-400">
                                        {p.room_number_madinah}
                                      </span>
                                      <span className="text-muted-foreground">
                                        (Madinah)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  {p.room_group_id ? "— belum diisi —" : "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              {mates.length > 0 ? (
                                <span className="truncate block">
                                  {mates
                                    .map((m) => m.customer?.full_name)
                                    .join(", ")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {p.room_group_id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2 gap-1"
                                      onClick={() =>
                                        openRoomNumberDialog(p.room_group_id!)
                                      }
                                    >
                                      <Hash className="h-3 w-3" />
                                      {hasMakkah || hasMadinah
                                        ? "Edit"
                                        : "No. Kamar"}
                                    </Button>
                                    {group.length < MAX_ROOM_SIZE && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1 text-xs"
                                        onClick={() =>
                                          openEditGroup(p.room_group_id!)
                                        }
                                      >
                                        <UserCog className="h-3.5 w-3.5" /> Edit
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        removeFromGroupMutation.mutate(p.id)
                                      }
                                      disabled={
                                        removeFromGroupMutation.isPending
                                      }
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => openNewGroup(p)}
                                  >
                                    <UserPlus className="h-3.5 w-3.5" /> Pilih
                                    Teman
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Hotel Room Number Dialog ───────────────────────────────────────── */}
      <Dialog
        open={roomNumberDialogOpen}
        onOpenChange={(open) => {
          setRoomNumberDialogOpen(open);
          if (!open) setRoomNumberGroupId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Nomor Kamar Hotel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group members preview */}
            {roomNumberGroupMembers.length > 0 && (
              <div className="rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground font-semibold mb-2">
                  {
                    ROOM_TYPE_LABELS[
                      getRoomTypeBySize(roomNumberGroupMembers.length)
                    ]
                  }{" "}
                  — {roomNumberGroupMembers.length} jamaah
                </p>
                <div className="space-y-1">
                  {roomNumberGroupMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <Badge
                        variant={
                          m.customer?.gender === "male"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px] h-4 px-1.5 shrink-0"
                      >
                        {m.customer?.gender === "male" ? "L" : "P"}
                      </Badge>
                      <span className="truncate">{m.customer?.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Makkah Room Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 font-semibold">
                <Hotel className="h-4 w-4 text-green-600" />
                Nomor Kamar — {hotelNames.makkah}
              </Label>
              <Input
                placeholder="Contoh: 301, 14-A, Suite 202..."
                value={hotelRoomForm.room_number_makkah}
                onChange={(e) =>
                  setHotelRoomForm((prev) => ({
                    ...prev,
                    room_number_makkah: e.target.value,
                  }))
                }
              />
              {hotelRoomForm.room_number_makkah && (
                <p className="text-xs text-green-600 font-medium">
                  → Kamar {hotelRoomForm.room_number_makkah} ·{" "}
                  {hotelNames.makkah}
                </p>
              )}
            </div>

            {/* Madinah Room Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 font-semibold">
                <Hotel className="h-4 w-4 text-blue-600" />
                Nomor Kamar — {hotelNames.madinah}
              </Label>
              <Input
                placeholder="Contoh: 205, 8-B, Deluxe 110..."
                value={hotelRoomForm.room_number_madinah}
                onChange={(e) =>
                  setHotelRoomForm((prev) => ({
                    ...prev,
                    room_number_madinah: e.target.value,
                  }))
                }
              />
              {hotelRoomForm.room_number_madinah && (
                <p className="text-xs text-blue-600 font-medium">
                  → Kamar {hotelRoomForm.room_number_madinah} ·{" "}
                  {hotelNames.madinah}
                </p>
              )}
            </div>

            {/* Optional notes */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Catatan tambahan (opsional)
              </Label>
              <Textarea
                placeholder="Misal: Hotel transit Dubai kamar 501, kamar VIP, dll."
                value={hotelRoomForm.room_hotel_notes}
                onChange={(e) =>
                  setHotelRoomForm((prev) => ({
                    ...prev,
                    room_hotel_notes: e.target.value,
                  }))
                }
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Nomor kamar akan disimpan untuk semua{" "}
              {roomNumberGroupMembers.length} anggota grup ini sekaligus.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRoomNumberDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              disabled={setRoomNumberMutation.isPending}
              onClick={() =>
                setRoomNumberMutation.mutate({
                  groupId: roomNumberGroupId!,
                  form: hotelRoomForm,
                })
              }
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {setRoomNumberMutation.isPending
                ? "Menyimpan..."
                : "Simpan Nomor Kamar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Group Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={newGroupDialogOpen}
        onOpenChange={(open) => {
          setNewGroupDialogOpen(open);
          if (!open) {
            setAnchorPassenger(null);
            setSelectedMateIds(new Set());
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Teman Sekamar</DialogTitle>
          </DialogHeader>

          {anchorPassenger && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                <p className="text-sm font-semibold">
                  {anchorPassenger.customer?.full_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {anchorPassenger.booking?.booking_code} ·{" "}
                  {anchorPassenger.customer?.gender === "male"
                    ? "Laki-laki"
                    : "Perempuan"}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tipe kamar hasil pilihan
                  </p>
                  <p className="text-sm font-semibold">
                    <BedDouble className="inline h-4 w-4 mr-1 text-amber-600" />
                    {newGroupType} ({newGroupSize} orang)
                  </p>
                </div>
                <Badge variant="outline">
                  {selectedMateIds.size}/{totalSlots} teman
                </Badge>
              </div>

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
                              <p className="text-sm font-medium leading-tight">
                                {c.customer?.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {c.booking?.booking_code} ·{" "}
                                {c.customer?.gender === "male"
                                  ? "👨 L"
                                  : "👩 P"}
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
              onClick={() => {
                setNewGroupDialogOpen(false);
                setSelectedMateIds(new Set());
              }}
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
          if (!open) {
            setEditGroupId(null);
            setAddMateIds(new Set());
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Grup Kamar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                      <p className="text-sm font-medium">
                        {m.customer?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.booking?.booking_code} ·{" "}
                        {m.customer?.gender === "male" ? "L" : "P"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeFromGroupMutation.mutate(m.id);
                        if (editGroupMembers.length <= 1)
                          setEditGroupDialogOpen(false);
                      }}
                      disabled={removeFromGroupMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

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
                        !isChecked &&
                        addMateIds.size >= editGroupRemainingSlots;
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
                            <p className="text-sm font-medium leading-tight">
                              {c.customer?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.booking?.booking_code} ·{" "}
                              {c.customer?.gender === "male" ? "👨 L" : "👩 P"}
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

// --- Sub-components ---

function PairingDialog({
  open,
  onOpenChange,
  selectedPassenger,
  unpairedPassengers,
  searchQuery,
  onSearchChange,
  onPair,
  isPairing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedPassenger: Passenger | null;
  unpairedPassengers: Passenger[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPair: (id: string, room?: string, reason?: string) => void;
  isPairing: boolean;
}) {
  const [selectedRoommate, setSelectedRoommate] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [reason, setReason] = useState("");
  const sameGender = unpairedPassengers.filter(
    (p) => p.customer?.gender === selectedPassenger?.customer?.gender,
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
              <p className="text-sm text-muted-foreground">Jamaah:</p>
              <p className="font-medium">
                {selectedPassenger.customer?.full_name}
              </p>
              <p className="text-sm">
                {GENDER_LABELS[selectedPassenger.customer?.gender || ""] || "-"}
              </p>
            </div>
            <div>
              <Label>Nomor Kamar (opsional)</Label>
              <Input
                placeholder="301"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Alasan (opsional)</Label>
              <Textarea
                placeholder="Contoh: Permintaan jamaah"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {sameGender.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Tidak ada jamaah dengan gender yang sama.
                </p>
              ) : (
                sameGender.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoommate === p.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                    onClick={() => setSelectedRoommate(p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedRoommate === p.id} />
                      <div>
                        <p className="font-medium">{p.customer?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.booking?.booking_code}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              if (selectedRoommate)
                onPair(selectedRoommate, roomNumber, reason);
            }}
            disabled={!selectedRoommate || isPairing}
          >
            Pasangkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── GroupedRoomView: shows passengers grouped by room_number for triple/quad/single ──
// Mahram = same booking_id (family). For triple/quad, multiple roommates share same room_number.
interface GroupedRoomViewProps {
  passengers: Passenger[];
  allPassengers: Passenger[];
  loading: boolean;
  onSaveRoom: (passengerId: string, val: string) => void;
  onPair: (
    passengerId: string,
    roommateId: string,
    roomNumber?: string,
  ) => void;
  onUnpair: (passengerId: string) => void;
}

function GroupedRoomView({
  passengers,
  allPassengers,
  loading,
  onSaveRoom,
  onPair,
  onUnpair,
}: GroupedRoomViewProps) {
  const [addingRoomForId, setAddingRoomForId] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState("");

  if (loading)
    return <p className="text-muted-foreground py-8 text-center">Memuat...</p>;
  if (passengers.length === 0)
    return (
      <p className="text-center text-muted-foreground py-8">
        Belum ada jamaah.
      </p>
    );

  // Group by room_number; those without room_number go into "unassigned"
  const roomGroups = new Map<string, Passenger[]>();
  const unassigned: Passenger[] = [];

  passengers.forEach((p) => {
    if (p.room_number) {
      const group = roomGroups.get(p.room_number) || [];
      group.push(p);
      roomGroups.set(p.room_number, group);
    } else {
      unassigned.push(p);
    }
  });

  // Capacity per type
  const capacityMap: Record<string, number> = {
    quad: 4,
    triple: 3,
    double: 2,
    single: 1,
  };

  // Check if two passengers are mahram (same booking or married couple)
  const isMahram = (a: Passenger, b: Passenger) => {
    const sameBooking =
      a.booking?.id && b.booking?.id && a.booking.id === b.booking.id;
    if (sameBooking) return true;
    if (
      a.customer?.marital_status === "married" &&
      b.customer?.marital_status === "married"
    ) {
      const aFirst = a.customer?.full_name?.split(" ")[0]?.toLowerCase() || "";
      const bFirst = b.customer?.full_name?.split(" ")[0]?.toLowerCase() || "";
      const aSpouse = a.customer?.spouse_name?.toLowerCase() || "";
      const bSpouse = b.customer?.spouse_name?.toLowerCase() || "";
      return aSpouse.includes(bFirst) || bSpouse.includes(aFirst);
    }
    return false;
  };

  const existingRoomNumbers = Array.from(roomGroups.keys());

  return (
    <div className="space-y-6">
      {/* Assigned groups */}
      {roomGroups.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
            <Check className="h-4 w-4" />
            Sudah Dikelompokkan ({roomGroups.size} kamar)
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(roomGroups.entries()).map(([roomNum, group]) => {
              const roomType = group[0]?.room_preference || "triple";
              const capacity = capacityMap[roomType] || 3;
              const isFull = group.length >= capacity;
              const bookingIds = new Set(
                group.map((p) => p.booking?.id).filter(Boolean),
              );
              const isAllFamily = bookingIds.size === 1 && group.length > 1;

              return (
                <Card
                  key={roomNum}
                  className={`border-2 ${isFull ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/30"}`}
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm ${isFull ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}
                        >
                          {roomNum}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {ROOM_TYPE_LABELS[roomType] || roomType}
                        </Badge>
                        {isAllFamily && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                            Keluarga / Mahram
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {group.length}/{capacity}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1.5">
                    {group.map((p, idx) => {
                      const mahramPartners = group.filter(
                        (other) => other.id !== p.id && isMahram(p, other),
                      );
                      const isSpouse = group.some(
                        (other) =>
                          other.id !== p.id &&
                          p.customer?.marital_status === "married" &&
                          other.customer?.marital_status === "married" &&
                          (
                            p.customer?.spouse_name?.toLowerCase() || ""
                          ).includes(
                            other.customer?.full_name
                              ?.split(" ")[0]
                              ?.toLowerCase() || "",
                          ),
                      );
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 text-xs bg-background rounded-md px-2 py-1.5 border"
                        >
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${p.customer?.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {p.customer?.full_name || "-"}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              <span className="text-muted-foreground">
                                {GENDER_LABELS[p.customer?.gender || ""] || "-"}
                              </span>
                              {isSpouse && (
                                <Badge className="text-[10px] px-1 py-0 h-4 bg-rose-100 text-rose-700 border-rose-200">
                                  Pasangan
                                </Badge>
                              )}
                              {!isSpouse && mahramPartners.length > 0 && (
                                <Badge className="text-[10px] px-1 py-0 h-4 bg-purple-100 text-purple-700 border-purple-200">
                                  Mahram
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                {p.booking?.booking_code}
                              </Badge>
                            </div>
                          </div>
                          <button
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Keluarkan dari kamar ini"
                            onClick={() => onSaveRoom(p.id, "")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Empty slots */}
                    {!isFull &&
                      Array.from({ length: capacity - group.length }).map(
                        (_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5 border border-dashed border-muted-foreground/30"
                          >
                            <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" />
                            <span className="text-muted-foreground italic">
                              Slot kosong
                            </span>
                          </div>
                        ),
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
            <X className="h-4 w-4" />
            Belum Punya Nomor Kamar ({unassigned.length})
          </h4>
          <Card className="border-amber-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Tipe Kamar</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Isi No. Kamar</TableHead>
                    <TableHead>Mahram / Keluarga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassigned.map((p) => {
                    // Find family members (same booking) = potential mahram
                    const familyMembers = allPassengers.filter(
                      (x) =>
                        x.id !== p.id &&
                        x.booking?.id &&
                        p.booking?.id &&
                        x.booking.id === p.booking.id,
                    );
                    const marriagePartner = allPassengers.find(
                      (x) =>
                        x.id !== p.id &&
                        p.customer?.marital_status === "married" &&
                        x.customer?.marital_status === "married" &&
                        (p.customer?.spouse_name?.toLowerCase() || "").includes(
                          x.customer?.full_name?.split(" ")[0]?.toLowerCase() ||
                            "",
                        ),
                    );

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.customer?.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.customer?.gender === "male"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {GENDER_LABELS[p.customer?.gender || ""] || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ROOM_TYPE_LABELS[p.room_preference || ""] || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {p.booking?.booking_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {addingRoomForId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 w-20 text-sm"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    onSaveRoom(p.id, roomInput);
                                    setAddingRoomForId(null);
                                    setRoomInput("");
                                  }
                                  if (e.key === "Escape") {
                                    setAddingRoomForId(null);
                                    setRoomInput("");
                                  }
                                }}
                                autoFocus
                                placeholder="301"
                                list="existing-rooms"
                              />
                              <datalist id="existing-rooms">
                                {existingRoomNumbers.map((r) => (
                                  <option key={r} value={r} />
                                ))}
                              </datalist>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  onSaveRoom(p.id, roomInput);
                                  setAddingRoomForId(null);
                                  setRoomInput("");
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAddingRoomForId(p.id);
                                setRoomInput("");
                              }}
                            >
                              + Isi Kamar
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {marriagePartner && (
                            <Badge className="text-[10px] bg-rose-100 text-rose-700 border-rose-200 mr-1">
                              Pasangan:{" "}
                              {
                                marriagePartner.customer?.full_name?.split(
                                  " ",
                                )[0]
                              }
                            </Badge>
                          )}
                          {familyMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {familyMembers.map((fm) => (
                                <Badge
                                  key={fm.id}
                                  className="text-[10px] bg-purple-100 text-purple-700 border-purple-200"
                                >
                                  Mahram:{" "}
                                  {fm.customer?.full_name?.split(" ")[0]}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {!marriagePartner && familyMembers.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function RoomNumberInput({
  passengerId,
  currentValue,
  onSave,
}: {
  passengerId: string;
  currentValue: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  // Sync with external data changes
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  if (!editing) {
    return (
      <button
        className="text-left hover:bg-muted px-2 py-1 rounded cursor-pointer min-w-[60px] text-sm"
        onClick={() => {
          setValue(currentValue);
          setEditing(true);
        }}
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
          if (e.key === "Enter") {
            onSave(value);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        placeholder="301"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => {
          onSave(value);
          setEditing(false);
        }}
      >
        <Check className="h-3 w-3" />
      </Button>
    </div>
  );
}
