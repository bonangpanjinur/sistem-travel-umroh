import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { DepartureForm } from "@/components/admin/forms/DepartureForm";
import { LinkItineraryForm } from "@/components/admin/forms/LinkItineraryForm";
import { EquipmentRealizationTab } from "@/components/operational/equipment/EquipmentRealizationTab";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function AdminDepartureDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

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

  // Fetch passengers for this departure
  const { data: passengers, isLoading: passengersLoading } = useQuery({
    queryKey: ["departure-passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(
          `
          id,
          is_main_passenger,
          room_preference,
          passenger_type,
          customer:customers(
            id, full_name, gender, birth_date,
            passport_number, passport_expiry, phone
          ),
          booking:bookings!inner(
            id, booking_code, room_type, booking_status,
            departure_id
          )
        `
        )
        .eq("booking.departure_id", id)
        .eq("booking.booking_status", "confirmed");

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  const exportManifestPDF = () => {
    if (!passengers || !departure) return;
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
      `Flight: ${departure.flight_number || "-"} | Jumlah: ${passengers.length} jamaah`,
      14,
      34
    );

    autoTable(doc, {
      startY: 42,
      head: [
        [
          "No",
          "Nama Lengkap",
          "L/P",
          "No. Paspor",
          "Exp. Paspor",
          "Tipe Kamar",
          "Telepon",
        ],
      ],
      body: passengers.map((p, idx) => [
        (idx + 1).toString(),
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.customer?.passport_number || "-",
        p.customer?.passport_expiry
          ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy")
          : "-",
        (p.booking?.room_type || "-").toUpperCase(),
        p.customer?.phone || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`Manifest-${pkgName}-${departure.departure_date}.pdf`);
    toast.success("Manifest PDF berhasil di-download");
  };

  const exportRoomingListPDF = () => {
    if (!passengers || !departure) return;
    const doc = new jsPDF();
    const pkgName = departure.package?.name || "Rooming List";

    const roomGroups: { [key: string]: any[] } = {};
    passengers.forEach((p) => {
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

      const tableRows = pax.map((p, idx) => [
        (idx + 1).toString(),
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
      ]);

      autoTable(doc, {
        startY,
        head: [["No", "Nama Jamaah", "L/P"]],
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
                {formatDate(departure.departure_date)}
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
                      {formatDate(departure.return_date)}
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

            {/* Kuota & Jemaah */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Kuota & Jemaah
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kuota</p>
                  <p className="text-2xl font-bold">
                    {departure.booked_count || 0} / {departure.quota || 0}
                  </p>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{
                      width: `${Math.min(100, ((departure.booked_count || 0) / (departure.quota || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(((departure.booked_count || 0) / (departure.quota || 1)) * 100)}% Terisi
                </p>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar Jemaah ({passengers?.length || 0})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportManifestPDF}
                    disabled={!passengers || passengers.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Manifest
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportRoomingListPDF}
                    disabled={!passengers || passengers.length === 0}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Export Rooming List
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {passengersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : passengers && passengers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Paspor</TableHead>
                        <TableHead>Exp. Paspor</TableHead>
                        <TableHead>Kamar</TableHead>
                        <TableHead>Telepon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {passengers.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.customer?.full_name}
                          </TableCell>
                          <TableCell>
                            {p.customer?.gender === "male" ? "L" : "P"}
                          </TableCell>
                          <TableCell>{p.customer?.passport_number || "-"}</TableCell>
                          <TableCell>
                            {p.customer?.passport_expiry
                              ? format(
                                  new Date(p.customer.passport_expiry),
                                  "dd/MM/yyyy"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {(p.booking?.room_type || "-").toUpperCase()}
                          </TableCell>
                          <TableCell>{p.customer?.phone || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada jemaah terdaftar
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
    </div>
  );
}
