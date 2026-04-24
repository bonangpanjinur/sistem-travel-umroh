import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDate, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Plane,
  Users,
  Package,
  MapPin,
  Hotel,
  FileDown,
  Printer,
  Calendar,
  ScanLine,
  Bug,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { DepartureForm } from "@/components/admin/forms/DepartureForm";
import { LinkItineraryForm } from "@/components/admin/forms/LinkItineraryForm";
import { EquipmentRealizationTab } from "@/components/operational/equipment/EquipmentRealizationTab";
import { CheckinQRDialog } from "@/components/admin/departure/CheckinQRDialog";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function AdminDepartureDetail() {
  const { id } = useParams<{ id: string }>();
  
  // Debug: log the id and component render
  console.log("DepartureDetail - id from params:", id);
  console.log("DepartureDetail - component mounted, id:", id);

  // Debug: show current ID in UI
  const debugId = id;

  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [debugOpen, setDebugOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);

  // If no id, show error
  if (!id) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error: ID tidak ditemukan di URL</p>
        <p className="text-sm text-muted-foreground mt-2">Pastikan URL memiliki format: /admin/departures/[ID]</p>
        <p className="text-xs text-muted-foreground mt-4 font-mono bg-muted p-2 rounded">ID dari URL: {debugId || "KOSONG"}</p>
      </div>
    );
  }

  // Fetch departure detail
  const { data: departure, isLoading: departureLoading } = useQuery({
    queryKey: ["admin-departure-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(
          `
          *,
          package:packages(id, name, code),
          departure_airport:airports!departures_departure_airport_id_fkey(code, name, city),
          arrival_airport:airports!departures_arrival_airport_id_fkey(code, name, city),
          airline:airlines(code, name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
          muthawif:muthawifs(name),
          team_leader:customers!departures_team_leader_id_fkey(full_name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch passengers for this departure (refactored: two-step query to avoid PostgREST nested filter issues)
  const { data: passengers, isLoading: passengersLoading } = useQuery({
    queryKey: ["departure-passengers", id],
    queryFn: async () => {
      // Step 1: Fetch all active bookings for this departure
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, booking_code, room_type, booking_status, payment_status, customer_id")
        .eq("departure_id", id!);

      if (bookingsError) {
        console.error("Bookings error:", bookingsError);
        throw bookingsError;
      }
      if (!bookings || bookings.length === 0) {
        console.log("No bookings for departure:", id);
        return [];
      }
      console.log("Bookings found:", bookings.length, "IDs:", bookings.map(b => b.id));
      console.log("Bookings details:", JSON.stringify(bookings, null, 2));
      if (bookings.length > 90) {
        console.warn("⚠️ Close to 100 limit! Current bookings:", bookings.length);
      }

      const bookingIds = bookings.map((b) => b.id);
      const bookingMap = new Map(bookings.map((b) => [b.id, b]));
      console.log("Querying booking_passengers with booking_ids:", bookingIds);

      // Step 2: Fetch booking_passengers for these bookings
      const { data: bps, error: bpsError } = await supabase
        .from("booking_passengers")
        .select(
          `
          id,
          booking_id,
          is_main_passenger,
          room_preference,
          passenger_type,
          customer:customers(
            id, full_name, gender, birth_date,
            passport_number, passport_expiry, phone
          )
        `
        )
        .in("booking_id", bookingIds)
        .order("is_main_passenger", { ascending: false });

      if (bpsError) {
        console.error("booking_passengers error:", bpsError);
        throw bpsError;
      }
      console.log("booking_passengers found:", bps?.length || 0);
      if (bps?.length === 0) {
        console.warn("⚠️ No passengers found! Check RLS or data in booking_passengers table");
      }

      // Step 3: Identify bookings missing a main_passenger row → build virtual passenger from booking.customer_id
      const bookingsWithMain = new Set(
        (bps || [])
          .filter((p: any) => p.is_main_passenger)
          .map((p: any) => p.booking_id)
      );
      const missingMainBookings = bookings.filter(
        (b) => !bookingsWithMain.has(b.id) && b.customer_id
      );

      let virtualPassengers: any[] = [];
      if (missingMainBookings.length > 0) {
        const customerIds = missingMainBookings.map((b) => b.customer_id);
        const { data: customers } = await supabase
          .from("customers")
          .select("id, full_name, gender, birth_date, passport_number, passport_expiry, phone")
          .in("id", customerIds);

        const customerMap = new Map((customers || []).map((c) => [c.id, c]));
        virtualPassengers = missingMainBookings.map((b) => ({
          id: `virtual-${b.id}`,
          booking_id: b.id,
          is_main_passenger: true,
          room_preference: b.room_type,
          passenger_type: "adult",
          customer: customerMap.get(b.customer_id!) || null,
          _virtual: true,
        }));
      }

      // Step 4: Combine + attach booking info, sort by booking_code then main first
      const combined = [...(bps || []), ...virtualPassengers].map((p: any) => ({
        ...p,
        booking: bookingMap.get(p.booking_id) || null,
      }));

      combined.sort((a: any, b: any) => {
        const codeA = a.booking?.booking_code || "";
        const codeB = b.booking?.booking_code || "";
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        return (b.is_main_passenger ? 1 : 0) - (a.is_main_passenger ? 1 : 0);
      });

      return combined;
    },
    enabled: !!id,
  });

  // Fetch attendance records for this departure (real-time)
  const { data: attendance } = useQuery({
    queryKey: ["departure-attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, customer_id, checkpoint, checked_in_at")
        .eq("departure_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Realtime subscription for attendance updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`attendance-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `departure_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["departure-attendance", id],
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Map customer_id -> attendance record (latest checkpoint)
  const attendanceMap = useMemo(() => {
    const m = new Map<string, { checkpoint: string; checked_in_at: string }>();
    (attendance || []).forEach((a) => {
      if (a.customer_id) {
        m.set(a.customer_id, {
          checkpoint: a.checkpoint,
          checked_in_at: a.checked_in_at || "",
        });
      }
    });
    return m;
  }, [attendance]);

  // Filtered passengers based on UI filters
  const filteredPassengers = useMemo(() => {
    if (!passengers) return [];
    return passengers.filter((p: any) => {
      if (statusFilter !== "all") {
        const s = p.booking?.booking_status || p.booking?.payment_status;
        if (s !== statusFilter) return false;
      }
      if (typeFilter !== "all") {
        if ((p.passenger_type || "adult") !== typeFilter) return false;
      }
      return true;
    });
  }, [passengers, statusFilter, typeFilter]);

  const passengerStats = useMemo(() => {
    const stats = {
      total: passengers?.length || 0,
      confirmed: 0,
      pending: 0,
      paid: 0,
      adult: 0,
      child: 0,
      infant: 0,
      checkedIn: 0,
    };
    (passengers || []).forEach((p: any) => {
      const s = p.booking?.booking_status;
      const ps = p.booking?.payment_status;
      if (s === "confirmed" || s === "completed") stats.confirmed += 1;
      else if (s === "pending" || s === "processing") stats.pending += 1;
      if (ps === "paid") stats.paid += 1;
      const t = (p.passenger_type || "adult").toLowerCase();
      if (t === "child") stats.child += 1;
      else if (t === "infant") stats.infant += 1;
      else stats.adult += 1;
      if (p.customer?.id && attendanceMap.has(p.customer.id))
        stats.checkedIn += 1;
    });
    return stats;
  }, [passengers, attendanceMap]);

  // Debug data
  const debugData = useMemo(() => {
    const totalPassengers = passengers?.length || 0;
    const realRows = (passengers || []).filter((p: any) => !p._virtual).length;
    const virtualRows = (passengers || []).filter((p: any) => p._virtual);
    const bookingsSeen = new Set<string>();
    (passengers || []).forEach((p: any) => {
      if (p.booking_id) bookingsSeen.add(p.booking_id);
    });
    return {
      totalPassengers,
      realRows,
      virtualCount: virtualRows.length,
      bookingsCount: bookingsSeen.size,
      virtualBookings: virtualRows.map((v: any) => ({
        booking_code: v.booking?.booking_code,
        booking_id: v.booking_id,
        customer: v.customer?.full_name,
      })),
    };
  }, [passengers]);

  // Fetch itinerary for this departure
  const { data: itinerary } = useQuery({
    queryKey: ["departure-itinerary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_itineraries")
        .select(
          `
          *,
          itinerary_template:itinerary_templates(id, name, description, days)
        `
        )
        .eq("departure_id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">Buka</Badge>;
      case "closed":
        return <Badge variant="secondary">Tutup</Badge>;
      case "full":
        return <Badge variant="destructive">Penuh</Badge>;
      case "departed":
        return <Badge variant="outline">Berangkat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportManifestPDF = async () => {
    const sourceList = filteredPassengers.length > 0 ? filteredPassengers : passengers || [];
    if (sourceList.length === 0 || !departure) {
      toast.error("Tidak ada data jamaah untuk diekspor");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    const pkgName = departure.package?.name || "Manifest";

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Manifest Jamaah - ${pkgName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Tanggal Berangkat: ${format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })}`,
      14,
      28
    );
    doc.text(
      `Flight: ${departure.flight_number || "-"} | Jumlah: ${sourceList.length} jamaah`,
      14,
      34
    );

    const qrUrls = await Promise.all(
      sourceList.map(async (p: any) => {
        if (!p.customer?.id) return null;
        try {
          return await QRCode.toDataURL(`CUST:${p.customer.id}`, {
            width: 80,
            margin: 0,
          });
        } catch {
          return null;
        }
      })
    );

    autoTable(doc, {
      startY: 42,
      head: [
        [
          "No",
          "QR",
          "Nama Lengkap",
          "L/P",
          "No. Paspor",
          "Exp. Paspor",
          "Tipe Kamar",
          "Kamar",
          "Tipe Pax",
          "Telepon",
        ],
      ],
      body: sourceList.map((p: any, idx: number) => [
        (idx + 1).toString(),
        "",
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.customer?.passport_number || "-",
        p.customer?.passport_expiry
          ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
          : "-",
        (p.booking?.room_type || "-").toUpperCase(),
        p.room_number || "-",
        (p.passenger_type || "adult").toUpperCase(),
        p.customer?.phone || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 14 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { cellWidth: 14 } },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const url = qrUrls[data.row.index];
          if (url) {
            doc.addImage(url, "PNG", data.cell.x + 1, data.cell.y + 1, 12, 12);
          }
        }
      },
    });

    doc.save(`Manifest-${pkgName}-${departure.departure_date}.pdf`);
    toast.success("Manifest PDF berhasil di-download");
  };

  const exportRoomingListPDF = () => {
    const sourceList = filteredPassengers.length > 0 ? filteredPassengers : passengers || [];
    if (sourceList.length === 0 || !departure) {
      toast.error("Tidak ada data jamaah untuk diekspor");
      return;
    }
    const doc = new jsPDF();
    const pkgName = departure.package?.name || "Rooming List";

    const roomGroups: { [key: string]: any[] } = {};
    sourceList.forEach((p: any) => {
      const roomType = p.booking?.room_type || "unknown";
      if (!roomGroups[roomType]) roomGroups[roomType] = [];
      roomGroups[roomType].push(p);
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rooming List - ${pkgName}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Tanggal Berangkat: ${format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })}`,
      14,
      28
    );

    let startY = 36;
    Object.entries(roomGroups).forEach(([roomType, pax]) => {
      const roomsNeeded = Math.ceil(
        pax.length /
          (roomType === "single"
            ? 1
            : roomType === "double"
              ? 2
              : roomType === "triple"
                ? 3
                : 4)
      );

      doc.setFont("helvetica", "bold");
      doc.text(
        `${roomType.toUpperCase()} (${roomsNeeded} kamar untuk ${pax.length} jamaah)`,
        14,
        startY
      );
      startY += 6;

      const tableRows = pax.map((p: any, idx: number) => [
        (idx + 1).toString(),
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.room_number || "-",
        p.booking?.booking_code || "-",
        (p.passenger_type || "adult").toUpperCase(),
      ]);

      autoTable(doc, {
        startY,
        head: [["No", "Nama Jamaah", "L/P", "No. Kamar", "Booking", "Tipe"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 150, 200], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
    });

    doc.save(`RoomingList-${pkgName}-${departure.departure_date}.pdf`);
    toast.success("Rooming List PDF berhasil di-download");
  };


  if (departureLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!departure) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Keberangkatan tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/departures">Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/departures">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {departure.departure_date ? formatDate(departure.departure_date) : <span className="text-orange-500 text-lg">Tanggal belum diatur</span>}
              </h1>
              {getStatusBadge(departure.status)}
            </div>
            <p className="text-muted-foreground">
              {departure.package?.name || "Tanpa Paket"} •{" "}
              {departure.airline?.code || "-"} {departure.flight_number || "-"}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="jamaah">Jemaah</TabsTrigger>
          <TabsTrigger value="perlengkapan">Perlengkapan</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="operasional">Operasional</TabsTrigger>
        </TabsList>

        {/* Tab: Informasi */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Informasi Keberangkatan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informasi Keberangkatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tanggal Berangkat
                    </p>
                    <p className="font-semibold">
                      {formatDate(departure.departure_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tanggal Kembali
                    </p>
                    <p className="font-semibold">
                      {departure.return_date ? formatDate(departure.return_date) : <span className="text-muted-foreground">-</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-semibold">
                      {departure.package?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">{getStatusBadge(departure.status)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Penerbangan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Penerbangan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Maskapai</p>
                  <p className="font-semibold">
                    {departure.airline?.code} - {departure.airline?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Flight</p>
                  <p className="font-semibold">{departure.flight_number || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Keberangkatan</p>
                    <p className="font-semibold">
                      {departure.departure_airport?.code} -{" "}
                      {departure.departure_airport?.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kedatangan</p>
                    <p className="font-semibold">
                      {departure.arrival_airport?.code} -{" "}
                      {departure.arrival_airport?.city}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hotel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Hotel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Makkah</p>
                  <p className="font-semibold">
                    {departure.hotel_makkah?.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ★ {departure.hotel_makkah?.star_rating || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Madinah</p>
                  <p className="font-semibold">
                    {departure.hotel_madinah?.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ★ {departure.hotel_madinah?.star_rating || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kuota & Jemaah - sinkron dengan tabel jemaah (termasuk virtual) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Kuota & Jemaah
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Jamaah Aktif (sinkron tabel)
                  </p>
                  <p className="text-2xl font-bold">
                    {passengerStats.total} / {departure.quota || 0}
                  </p>
                  {departure.booked_count !== passengerStats.total && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      booked_count DB: {departure.booked_count || 0} (mismatch)
                    </p>
                  )}
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{
                      width: `${Math.min(100, (passengerStats.total / (departure.quota || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Adult</p>
                    <p className="font-semibold">{passengerStats.adult}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Child</p>
                    <p className="font-semibold">{passengerStats.child}</p>
                  </div>
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Infant</p>
                    <p className="font-semibold">{passengerStats.infant}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((passengerStats.total / (departure.quota || 1)) * 100)}% Terisi
                  </span>
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {passengerStats.checkedIn} check-in
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tim */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Muthawif</p>
                  <p className="font-semibold">{departure.muthawif?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team Leader</p>
                  <p className="font-semibold">
                    {departure.team_leader?.full_name || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Harga */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Harga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Single:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_single || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Double:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_double || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Triple:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_triple || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Quad:</span>
                  <span className="font-semibold">
                    {formatCurrency(departure.price_quad || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Jemaah */}
        <TabsContent value="jamaah" className="space-y-6">
          {/* Debug Panel */}
          <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full text-left flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Panel Debug</span>
                    <Badge variant="outline" className="text-[10px]">
                      {debugData.bookingsCount} booking · {debugData.realRows} pax · {debugData.virtualCount} virtual
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${debugOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Bookings (aktif)</p>
                      <p className="text-lg font-semibold">{debugData.bookingsCount}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Total Passenger</p>
                      <p className="text-lg font-semibold">{debugData.totalPassengers}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">Real Row (booking_passengers)</p>
                      <p className="text-lg font-semibold">{debugData.realRows}</p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                      <p className="text-amber-700">Virtual (kekurangan main)</p>
                      <p className="text-lg font-semibold text-amber-800">{debugData.virtualCount}</p>
                    </div>
                  </div>
                  {debugData.virtualBookings.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Booking yang kekurangan main passenger row:</p>
                      <div className="rounded-md border bg-background overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2">Booking Code</th>
                              <th className="text-left p-2">Customer (dari bookings.customer_id)</th>
                              <th className="text-left p-2 font-mono">booking_id</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debugData.virtualBookings.map((vb, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2 font-mono">{vb.booking_code || "-"}</td>
                                <td className="p-2">{vb.customer || "(tidak ada)"}</td>
                                <td className="p-2 font-mono text-[10px] text-muted-foreground">{vb.booking_id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    Attendance tercatat: <span className="font-semibold text-foreground">{attendance?.length || 0}</span> entri |
                    Sudah check-in: <span className="font-semibold text-foreground">{passengerStats.checkedIn}</span>
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar Jemaah ({filteredPassengers.length}
                  {filteredPassengers.length !== passengerStats.total && (
                    <span className="text-xs text-muted-foreground"> dari {passengerStats.total}</span>
                  )}
                  )
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue placeholder="Tipe Pax" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="adult">Adult ({passengerStats.adult})</SelectItem>
                      <SelectItem value="child">Child ({passengerStats.child})</SelectItem>
                      <SelectItem value="infant">Infant ({passengerStats.infant})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => setIsCheckinOpen(true)}
                    disabled={!passengers || passengers.length === 0}
                  >
                    <ScanLine className="h-4 w-4 mr-2" />
                    QR Check-in
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportManifestPDF}
                    disabled={filteredPassengers.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Manifest
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportRoomingListPDF}
                    disabled={filteredPassengers.length === 0}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Rooming List
                  </Button>
                </div>
              </div>
              {passengerStats.total > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {passengerStats.confirmed} confirmed
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {passengerStats.paid} paid
                  </Badge>
                  {passengerStats.pending > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {passengerStats.pending} pending
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {passengerStats.checkedIn}/{passengerStats.total} check-in
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {passengersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPassengers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Paspor</TableHead>
                        <TableHead>Exp. Paspor</TableHead>
                        <TableHead>Tipe Pax</TableHead>
                        <TableHead>Kamar</TableHead>
                        <TableHead>No. Kamar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Telepon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p: any) => {
                        const bookingStatus = p.booking?.booking_status as string | undefined;
                        const paymentStatus = p.booking?.payment_status as string | undefined;
                        const statusVariant =
                          bookingStatus === "confirmed" || bookingStatus === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : bookingStatus === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground";
                        const checkin = p.customer?.id
                          ? attendanceMap.get(p.customer.id)
                          : undefined;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">
                              <Link
                                to={`/admin/bookings/${p.booking_id}`}
                                className="text-primary hover:underline"
                              >
                                {p.booking?.booking_code || "-"}
                              </Link>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {p.customer?.id ? (
                                  <Link
                                    to={`/admin/customers/${p.customer.id}`}
                                    className="text-primary hover:underline cursor-pointer"
                                  >
                                    {p.customer.full_name}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {p.customer?.full_name || "-"}
                                  </span>
                                )}
                                {p.is_main_passenger && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    Utama
                                  </Badge>
                                )}
                                {p._virtual && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                    virtual
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {p.customer?.gender === "male" ? "L" : "P"}
                            </TableCell>
                            <TableCell>{p.customer?.passport_number || "-"}</TableCell>
                            <TableCell>
                              {p.customer?.passport_expiry
                                ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell className="capitalize">
                              {p.passenger_type || "adult"}
                            </TableCell>
                            <TableCell>
                              {(p.booking?.room_type || "-").toUpperCase()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.room_number || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className={`text-[10px] capitalize ${statusVariant}`}>
                                  {bookingStatus || "-"}
                                </Badge>
                                {paymentStatus && (
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    bayar: {paymentStatus}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {checkin ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {format(new Date(checkin.checked_in_at), "HH:mm")}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">belum</span>
                              )}
                            </TableCell>
                            <TableCell>{p.customer?.phone || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {passengers && passengers.length > 0
                    ? "Tidak ada jamaah cocok dengan filter saat ini"
                    : "Belum ada jemaah terdaftar"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Perlengkapan */}
        <TabsContent value="perlengkapan">
          <EquipmentRealizationTab selectedDeparture={id} />
        </TabsContent>

        {/* Tab: Itinerary */}
        <TabsContent value="itinerary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Itinerary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itinerary ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-semibold">
                      {itinerary.itinerary_template?.name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsItineraryOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Kelola Itinerary
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Belum ada itinerary terhubung
                  </p>
                  <Button onClick={() => setIsItineraryOpen(true)}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Hubungkan Itinerary
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Operasional */}
        <TabsContent value="operasional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fitur Operasional</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Fitur operasional dapat diakses melalui menu Operasional di sidebar
              </p>
              <div className="space-y-2 text-sm">
                <p>• Manifest Jamaah</p>
                <p>• Manajemen Perlengkapan</p>
                <p>• Penugasan Kamar</p>
                <p>• Manajemen Bus</p>
                <p>• Check-in</p>
                <p>• QR Code</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Departure Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Keberangkatan</DialogTitle>
          </DialogHeader>
          <DepartureForm
            departureData={departure}
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["admin-departure-detail", id],
              });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Itinerary Management Dialog */}
      <Dialog open={isItineraryOpen} onOpenChange={setIsItineraryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Itinerary</DialogTitle>
          </DialogHeader>
          <LinkItineraryForm
            departureId={id || ""}
            departureDate={departure.departure_date}
            onSuccess={() => {
              setIsItineraryOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["departure-itinerary", id],
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* QR Check-in Dialog */}
      <CheckinQRDialog
        open={isCheckinOpen}
        onOpenChange={setIsCheckinOpen}
        departureId={id || ""}
        passengers={(passengers || []) as any}
      />

      {/* Edit Passenger Dialog */}
      {editingPassenger && (
        <EditCustomerDialog
          customer={editingPassenger}
          onSuccess={() => {
            setEditingPassenger(null);
            queryClient.invalidateQueries({
              queryKey: ["departure-passengers", id],
            });
          }}
        />
      )}
    </div>
  );
}
