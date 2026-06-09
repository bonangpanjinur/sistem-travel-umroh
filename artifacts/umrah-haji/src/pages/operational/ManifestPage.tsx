import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { FileDown, Eye, Plane, Printer, FileSpreadsheet, Search, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ManifestBusExport from "@/components/departure/ManifestBusExport";

export default function ManifestPage() {
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: departures, isLoading } = useQuery({
    queryKey: ['manifest-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, departure_date, return_date, quota, booked_count, status, flight_number,
          package:packages(name, code)
        `)
        .order('departure_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ['manifest-passengers-v2', selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`
          id, is_main_passenger, room_preference, passenger_type,
          customer:customers(
            id, full_name, gender, birth_date, birth_place,
            passport_number, passport_expiry, phone, nik, nationality
          ),
          booking:bookings!inner(
            id, booking_code, room_type, booking_status, payment_status,
            total_price, paid_amount, remaining_amount, departure_id
          )
        `)
        .eq('booking.departure_id', selectedDeparture ?? '')
        .neq('booking.booking_status', 'cancelled');
      if (error) throw error;
      return data;
    },
  });

  const generateManifest = useMutation({
    mutationFn: async (departureId: string) => {
      const { data, error } = await supabase
        .from('manifests')
        .insert({ departure_id: departureId, version: 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Manifest berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ['manifest-departures'] });
    },
    onError: () => toast.error("Gagal membuat manifest"),
  });

  const selectedDepartureData = departures?.find(d => d.id === selectedDeparture);

  const filteredPassengers = useMemo(() => {
    if (!passengers) return [];
    return passengers.filter(p => {
      const name = (p.customer as any)?.full_name?.toLowerCase() || '';
      const code = (p.booking as any)?.booking_code?.toLowerCase() || '';
      const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
      const payStatus = (p.booking as any)?.payment_status || '';
      const matchStatus = statusFilter === 'all' || payStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [passengers, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!passengers) return { total: 0, male: 0, female: 0, paid: 0, partial: 0, pending: 0 };
    return {
      total: passengers.length,
      male: passengers.filter(p => (p.customer as any)?.gender === 'male').length,
      female: passengers.filter(p => (p.customer as any)?.gender === 'female').length,
      paid: passengers.filter(p => (p.booking as any)?.payment_status === 'paid').length,
      partial: passengers.filter(p => (p.booking as any)?.payment_status === 'partial').length,
      pending: passengers.filter(p => (p.booking as any)?.payment_status === 'pending').length,
    };
  }, [passengers]);

  const exportManifestExcel = () => {
    if (!filteredPassengers.length || !selectedDepartureData) return;
    const pkgName = (selectedDepartureData.package as any)?.name || 'Manifest';
    const rows = filteredPassengers.map((p, idx) => ({
      'No': idx + 1,
      'Kode Booking': (p.booking as any)?.booking_code || '-',
      'Nama Lengkap': (p.customer as any)?.full_name || '-',
      'L/P': (p.customer as any)?.gender === 'male' ? 'L' : 'P',
      'NIK': (p.customer as any)?.nik || '-',
      'No. Paspor': (p.customer as any)?.passport_number || '-',
      'Tgl Lahir': (p.customer as any)?.birth_date ? format(new Date((p.customer as any).birth_date), 'dd/MM/yyyy') : '-',
      'Tempat Lahir': (p.customer as any)?.birth_place || '-',
      'Kewarganegaraan': (p.customer as any)?.nationality || 'Indonesia',
      'Exp. Paspor': (p.customer as any)?.passport_expiry ? format(new Date((p.customer as any).passport_expiry), 'dd/MM/yyyy') : '-',
      'Tipe Kamar': ((p.booking as any)?.room_type || '-').toUpperCase(),
      'Telepon': (p.customer as any)?.phone || '-',
      'Status Booking': (p.booking as any)?.booking_status || '-',
      'Status Bayar': (p.booking as any)?.payment_status === 'paid' ? 'LUNAS' : (p.booking as any)?.payment_status === 'partial' ? 'DP' : 'BELUM',
      'Total Harga': (p.booking as any)?.total_price || 0,
      'Sudah Dibayar': (p.booking as any)?.paid_amount || 0,
      'Sisa': (p.booking as any)?.remaining_amount || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [4, 16, 28, 4, 18, 16, 12, 18, 14, 12, 10, 16, 14, 12, 14, 14, 12];
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manifest');

    const infoRows = [
      ['Manifest Jamaah'],
      ['Paket', pkgName],
      ['Tanggal Berangkat', format(new Date(selectedDepartureData.departure_date), 'dd MMMM yyyy', { locale: id })],
      ['Tanggal Kembali', format(new Date(selectedDepartureData.return_date), 'dd MMMM yyyy', { locale: id })],
      ['No. Penerbangan', selectedDepartureData.flight_number || '-'],
      ['Total Jamaah', passengers?.length || 0],
      ['Filter Ditampilkan', filteredPassengers.length],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

    XLSX.writeFile(wb, `Manifest-${pkgName}-${selectedDepartureData.departure_date}.xlsx`);
    toast.success('Manifest Excel berhasil di-download');
  };

  const exportManifestPDF = () => {
    if (!filteredPassengers.length || !selectedDepartureData) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pkgName = (selectedDepartureData.package as any)?.name || 'Manifest';

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(`Manifest Jamaah — ${pkgName}`, 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Berangkat: ${format(new Date(selectedDepartureData.departure_date), "dd MMMM yyyy", { locale: id })} | Flight: ${selectedDepartureData.flight_number || '-'} | Total: ${filteredPassengers.length} jamaah`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [['No', 'Kode', 'Nama Lengkap', 'L/P', 'NIK', 'No. Paspor', 'Tgl Lahir', 'Exp. Paspor', 'Kamar', 'Telepon', 'Bayar']],
      body: filteredPassengers.map((p, idx) => [
        (idx + 1).toString(),
        (p.booking as any)?.booking_code || '-',
        (p.customer as any)?.full_name || '-',
        (p.customer as any)?.gender === 'male' ? 'L' : 'P',
        (p.customer as any)?.nik || '-',
        (p.customer as any)?.passport_number || '-',
        (p.customer as any)?.birth_date ? format(new Date((p.customer as any).birth_date), 'dd/MM/yy') : '-',
        (p.customer as any)?.passport_expiry ? format(new Date((p.customer as any).passport_expiry), 'dd/MM/yy') : '-',
        ((p.booking as any)?.room_type || '-').toUpperCase(),
        (p.customer as any)?.phone || '-',
        (p.booking as any)?.payment_status === 'paid' ? 'LUNAS' : (p.booking as any)?.payment_status === 'partial' ? 'DP' : 'BELUM',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 2: { cellWidth: 38 } },
    });

    doc.save(`Manifest-${pkgName}-${selectedDepartureData.departure_date}.pdf`);
    toast.success('Manifest PDF berhasil di-download');
  };

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Lunas</Badge>;
    if (status === 'partial') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs"><Clock className="h-3 w-3 mr-1" />DP</Badge>;
    return <Badge variant="outline" className="text-xs text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" />Belum</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manifest Jamaah</h1>
        <p className="text-muted-foreground">Kelola manifest keberangkatan dengan export PDF & Excel lengkap</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-5 w-5" />
            Pilih Keberangkatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures?.map((departure) => (
                    <TableRow key={departure.id} className={selectedDeparture === departure.id ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">{(departure.package as any)?.name}</TableCell>
                      <TableCell>{format(new Date(departure.departure_date), "dd MMM yyyy", { locale: id })}</TableCell>
                      <TableCell className="font-mono text-sm">{departure.flight_number || '-'}</TableCell>
                      <TableCell>{departure.booked_count}/{departure.quota}</TableCell>
                      <TableCell>
                        <Badge variant={departure.status === 'open' ? 'default' : 'secondary'}>{departure.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant={selectedDeparture === departure.id ? "default" : "outline"} onClick={() => setSelectedDeparture(departure.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {selectedDeparture === departure.id ? 'Dipilih' : 'Lihat'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => generateManifest.mutate(departure.id)} disabled={generateManifest.isPending}>
                          <FileDown className="h-3.5 w-3.5 mr-1" />
                          Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDeparture && (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
            {[
              { label: "Total", value: stats.total, color: "text-primary" },
              { label: "Laki-laki", value: stats.male, color: "text-blue-600" },
              { label: "Perempuan", value: stats.female, color: "text-pink-600" },
              { label: "Lunas", value: stats.paid, color: "text-green-600" },
              { label: "DP", value: stats.partial, color: "text-amber-600" },
              { label: "Belum Bayar", value: stats.pending, color: "text-red-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manifest — {(selectedDepartureData?.package as any)?.name}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {selectedDeparture && (
                    <ManifestBusExport
                      departureId={selectedDeparture}
                      departureName={(selectedDepartureData?.package as any)?.name || ""}
                      departureDate={selectedDepartureData?.departure_date}
                      flightNumber={selectedDepartureData?.flight_number || undefined}
                      passengers={(passengers || []).map(p => ({
                        customer_id: (p.customer as any)?.id || "",
                        full_name: (p.customer as any)?.full_name || "",
                        gender: (p.customer as any)?.gender === "male" ? "L" : "P",
                        nik: (p.customer as any)?.nik,
                        passport_number: (p.customer as any)?.passport_number,
                        passport_expiry: (p.customer as any)?.passport_expiry,
                        birth_date: (p.customer as any)?.birth_date,
                        phone: (p.customer as any)?.phone,
                        room_type: (p.booking as any)?.room_type,
                        booking_code: (p.booking as any)?.booking_code,
                        payment_status: (p.booking as any)?.payment_status,
                      }))}
                    />
                  )}
                  <Button size="sm" variant="outline" onClick={exportManifestExcel} disabled={!filteredPassengers.length}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                    Excel
                  </Button>
                  <Button size="sm" onClick={exportManifestPDF} disabled={!filteredPassengers.length}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    PDF
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Cari nama atau kode booking..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="paid">Lunas</SelectItem>
                    <SelectItem value="partial">DP</SelectItem>
                    <SelectItem value="pending">Belum Bayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPassengers ? (
                <div className="space-y-2 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !filteredPassengers.length ? (
                <p className="text-muted-foreground text-center py-10">
                  {passengers?.length === 0 ? "Belum ada jamaah untuk keberangkatan ini" : "Tidak ada hasil filter"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>No. Paspor</TableHead>
                        <TableHead>Exp. Paspor</TableHead>
                        <TableHead>Tgl Lahir</TableHead>
                        <TableHead>NIK</TableHead>
                        <TableHead>Kamar</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Pembayaran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p, idx) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {(p.customer as any)?.full_name}
                            {p.is_main_passenger && <Badge variant="outline" className="ml-1.5 text-[10px] h-4">PJ</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={(p.customer as any)?.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                              {(p.customer as any)?.gender === 'male' ? 'L' : 'P'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{(p.customer as any)?.passport_number || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {(p.customer as any)?.passport_expiry
                              ? format(new Date((p.customer as any).passport_expiry), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(p.customer as any)?.birth_date
                              ? format(new Date((p.customer as any).birth_date), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{(p.customer as any)?.nik || '-'}</TableCell>
                          <TableCell className="capitalize text-sm">{(p.booking as any)?.room_type || '-'}</TableCell>
                          <TableCell className="text-sm">{(p.customer as any)?.phone || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{(p.booking as any)?.booking_code || '-'}</TableCell>
                          <TableCell>{getPaymentBadge((p.booking as any)?.payment_status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
