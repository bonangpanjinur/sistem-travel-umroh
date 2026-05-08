import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  CheckCircle, XCircle, Clock, Search, Plane,
  FileText, BedDouble, Package, Wallet, AlertTriangle, Download
} from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

type ReadinessStatus = 'ready' | 'partial' | 'missing';

interface JamaahReadiness {
  customer_id: string;
  full_name: string;
  gender: string;
  phone: string;
  passport_number: string;
  booking_code: string;
  room_type: string;
  payment_status: string;
  paid_amount: number;
  total_price: number;
  remaining_amount: number;
  has_room: boolean;
  has_equipment: boolean;
  has_verified_doc: boolean;
  doc_count: number;
  equipment_count: number;
}

export default function DepartureReadinessPage() {
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: departures } = useQuery({
    queryKey: ['readiness-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, return_date, quota, booked_count, package:packages(name)')
        .gte('departure_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
        .order('departure_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: readinessData, isLoading } = useQuery({
    queryKey: ['departure-readiness', selectedDepartureId],
    enabled: !!selectedDepartureId,
    queryFn: async () => {
      const [
        { data: bookingPassengers },
        { data: roomOccupants },
        { data: equipmentDists },
        { data: customerDocs },
      ] = await Promise.all([
        supabase
          .from('booking_passengers')
          .select(`
            customer_id,
            customer:customers(id, full_name, gender, phone, passport_number),
            booking:bookings!inner(
              id, booking_code, room_type, payment_status,
              paid_amount, total_price, remaining_amount, departure_id
            )
          `)
          .eq('booking.departure_id', selectedDepartureId)
          .neq('booking.booking_status', 'cancelled'),

        supabase
          .from('room_occupants')
          .select('customer_id, room:room_assignments!inner(departure_id)')
          .eq('room.departure_id', selectedDepartureId),

        supabase
          .from('equipment_distributions')
          .select('customer_id, departure_id')
          .eq('departure_id', selectedDepartureId),

        supabase
          .from('customer_documents')
          .select('customer_id, verification_status')
          .eq('verification_status', 'verified'),
      ]);

      const roomCustomerIds = new Set(roomOccupants?.map(r => r.customer_id) || []);
      const equipmentCustomerIds = new Map<string, number>();
      equipmentDists?.forEach(e => {
        equipmentCustomerIds.set(e.customer_id, (equipmentCustomerIds.get(e.customer_id) || 0) + 1);
      });
      const verifiedDocIds = new Map<string, number>();
      customerDocs?.forEach(d => {
        verifiedDocIds.set(d.customer_id, (verifiedDocIds.get(d.customer_id) || 0) + 1);
      });

      return bookingPassengers?.map(bp => {
        const customer = bp.customer as any;
        const booking = bp.booking as any;
        return {
          customer_id: customer?.id,
          full_name: customer?.full_name || '-',
          gender: customer?.gender || 'unknown',
          phone: customer?.phone || '-',
          passport_number: customer?.passport_number || '-',
          booking_code: booking?.booking_code || '-',
          room_type: booking?.room_type || '-',
          payment_status: booking?.payment_status || 'pending',
          paid_amount: booking?.paid_amount || 0,
          total_price: booking?.total_price || 0,
          remaining_amount: booking?.remaining_amount || 0,
          has_room: roomCustomerIds.has(customer?.id),
          has_equipment: (equipmentCustomerIds.get(customer?.id) || 0) > 0,
          has_verified_doc: (verifiedDocIds.get(customer?.id) || 0) > 0,
          doc_count: verifiedDocIds.get(customer?.id) || 0,
          equipment_count: equipmentCustomerIds.get(customer?.id) || 0,
        } as JamaahReadiness;
      }) || [];
    },
  });

  const getOverallStatus = (j: JamaahReadiness): ReadinessStatus => {
    const allReady = j.payment_status === 'paid' && j.has_room && j.has_equipment && j.has_verified_doc;
    if (allReady) return 'ready';
    const anyReady = j.payment_status === 'partial' || j.has_room || j.has_equipment || j.has_verified_doc;
    if (anyReady) return 'partial';
    return 'missing';
  };

  const filteredData = useMemo(() => {
    if (!readinessData) return [];
    return readinessData.filter(j => {
      const matchSearch = !searchQuery ||
        j.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.booking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.passport_number.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getOverallStatus(j);
      const matchTab = activeTab === 'all' || activeTab === status;
      return matchSearch && matchTab;
    });
  }, [readinessData, searchQuery, activeTab]);

  const summary = useMemo(() => {
    if (!readinessData) return null;
    const total = readinessData.length;
    const ready = readinessData.filter(j => getOverallStatus(j) === 'ready').length;
    const partial = readinessData.filter(j => getOverallStatus(j) === 'partial').length;
    const missing = readinessData.filter(j => getOverallStatus(j) === 'missing').length;
    const paid = readinessData.filter(j => j.payment_status === 'paid').length;
    const hasRoom = readinessData.filter(j => j.has_room).length;
    const hasEquip = readinessData.filter(j => j.has_equipment).length;
    const hasDoc = readinessData.filter(j => j.has_verified_doc).length;
    return { total, ready, partial, missing, paid, hasRoom, hasEquip, hasDoc };
  }, [readinessData]);

  const exportExcel = () => {
    if (!filteredData.length) return;
    const dep = departures?.find(d => d.id === selectedDepartureId);
    const rows = filteredData.map((j, idx) => ({
      'No': idx + 1,
      'Nama': j.full_name,
      'L/P': j.gender === 'male' ? 'L' : 'P',
      'Telepon': j.phone,
      'No. Paspor': j.passport_number,
      'Kode Booking': j.booking_code,
      'Tipe Kamar': j.room_type.toUpperCase(),
      'Pembayaran': j.payment_status === 'paid' ? 'LUNAS' : j.payment_status === 'partial' ? 'DP' : 'BELUM',
      'Sudah Bayar': j.paid_amount,
      'Sisa': j.remaining_amount,
      'Kamar': j.has_room ? 'Ya' : 'BELUM',
      'Perlengkapan': j.has_equipment ? 'Ya' : 'BELUM',
      'Dokumen Terverifikasi': j.has_verified_doc ? 'Ya' : 'BELUM',
      'Status Keseluruhan': getOverallStatus(j) === 'ready' ? 'SIAP' : getOverallStatus(j) === 'partial' ? 'SEBAGIAN' : 'BELUM SIAP',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [5, 30, 5, 15, 16, 14, 10, 10, 14, 14, 10, 12, 22, 16].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kesiapan');
    XLSX.writeFile(wb, `Kesiapan-${(dep?.package as any)?.name || 'Keberangkatan'}-${selectedDepartureId}.xlsx`);
    toast.success('Data kesiapan berhasil di-export');
  };

  const StatusIcon = ({ ok, partial: isPartial }: { ok: boolean; partial?: boolean }) => {
    if (ok) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (isPartial) return <Clock className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  const selectedDep = departures?.find(d => d.id === selectedDepartureId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklist Kesiapan Keberangkatan</h1>
          <p className="text-muted-foreground">Pantau status setiap jamaah — pembayaran, kamar, perlengkapan, dan dokumen</p>
        </div>
        {readinessData?.length ? (
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">Pilih Keberangkatan</Label>
          <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih keberangkatan..." />
            </SelectTrigger>
            <SelectContent>
              {departures?.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5" />
                    {(d.package as any)?.name} — {format(new Date(d.departure_date), "dd MMM yyyy", { locale: id })}
                    <Badge variant="outline" className="text-xs">{d.booked_count}/{d.quota} pax</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDep && (
            <p className="text-xs text-muted-foreground mt-2">
              Kembali: {format(new Date(selectedDep.return_date), "dd MMM yyyy", { locale: id })}
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      )}

      {summary && !isLoading && (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Siap Berangkat", value: summary.ready, total: summary.total, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200", icon: CheckCircle },
              { label: "Sebagian Siap", value: summary.partial, total: summary.total, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200", icon: Clock },
              { label: "Belum Siap", value: summary.missing, total: summary.total, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200", icon: AlertTriangle },
              { label: "Total Jamaah", value: summary.total, total: summary.total, color: "text-primary", bgColor: "", icon: Plane },
            ].map(s => (
              <Card key={s.label} className={s.bgColor}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  {s.total > 0 && (
                    <Progress value={Math.round((s.value / s.total) * 100)} className="h-1 mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Pembayaran Lunas", value: summary.paid, icon: Wallet, color: "text-green-600" },
              { label: "Kamar Assigned", value: summary.hasRoom, icon: BedDouble, color: "text-blue-600" },
              { label: "Perlengkapan Diterima", value: summary.hasEquip, icon: Package, color: "text-purple-600" },
              { label: "Dokumen Terverifikasi", value: summary.hasDoc, icon: FileText, color: "text-teal-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}<span className="text-sm font-normal text-muted-foreground">/{summary.total}</span></p>
                  <Progress value={summary.total > 0 ? Math.round((s.value / summary.total) * 100) : 0} className="h-1 mt-1.5" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base">Detail Per Jamaah</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, booking, paspor..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="px-4 pb-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs h-7">Semua ({summary.total})</TabsTrigger>
                    <TabsTrigger value="ready" className="text-xs h-7 text-green-700">Siap ({summary.ready})</TabsTrigger>
                    <TabsTrigger value="partial" className="text-xs h-7 text-amber-700">Sebagian ({summary.partial})</TabsTrigger>
                    <TabsTrigger value="missing" className="text-xs h-7 text-red-700">Belum ({summary.missing})</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value={activeTab} className="mt-0">
                  {!filteredData.length ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">Tidak ada data</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kode Booking</TableHead>
                            <TableHead className="text-center">Bayar</TableHead>
                            <TableHead className="text-center">Kamar</TableHead>
                            <TableHead className="text-center">Perlengkapan</TableHead>
                            <TableHead className="text-center">Dokumen</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((j, idx) => {
                            const overall = getOverallStatus(j);
                            return (
                              <TableRow key={j.customer_id} className={overall === 'ready' ? 'bg-green-50/30 dark:bg-green-950/10' : overall === 'missing' ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{j.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{j.phone}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{j.booking_code}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <StatusIcon ok={j.payment_status === 'paid'} partial={j.payment_status === 'partial'} />
                                    <span className="text-[10px] text-muted-foreground">
                                      {j.payment_status === 'paid' ? 'Lunas' : j.payment_status === 'partial' ? 'DP' : 'Belum'}
                                    </span>
                                    {j.remaining_amount > 0 && (
                                      <span className="text-[10px] text-red-600">Sisa {formatCurrency(j.remaining_amount)}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <StatusIcon ok={j.has_room} />
                                    <span className="text-[10px] text-muted-foreground">{j.has_room ? j.room_type.toUpperCase() : 'Belum'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <StatusIcon ok={j.has_equipment} />
                                    <span className="text-[10px] text-muted-foreground">{j.has_equipment ? `${j.equipment_count} item` : 'Belum'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <StatusIcon ok={j.has_verified_doc} />
                                    <span className="text-[10px] text-muted-foreground">{j.has_verified_doc ? `${j.doc_count} dok` : 'Belum'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {overall === 'ready' ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">Siap</Badge>
                                  ) : overall === 'partial' ? (
                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">Sebagian</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">Belum</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDepartureId && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan untuk melihat checklist kesiapan</p>
            <p className="text-sm mt-1">Status pembayaran, kamar, perlengkapan, dan dokumen setiap jamaah</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className || ''}`}>{children}</label>;
}
