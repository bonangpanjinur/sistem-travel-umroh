import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  QrCode, Scan, Users, UtensilsCrossed, Bus, 
  Hotel, CheckCircle2, Search, RefreshCw, Download
} from "lucide-react";

const SCAN_TYPES = [
  { value: 'MEAL_BREAKFAST', label: 'Sarapan', icon: UtensilsCrossed },
  { value: 'MEAL_LUNCH', label: 'Makan Siang', icon: UtensilsCrossed },
  { value: 'MEAL_DINNER', label: 'Makan Malam', icon: UtensilsCrossed },
  { value: 'BUS_BOARDING', label: 'Naik Bus', icon: Bus },
  { value: 'HOTEL_CHECKIN', label: 'Check-in Hotel', icon: Hotel },
  { value: 'CUSTOM', label: 'Lainnya', icon: CheckCircle2 },
];

interface JamaahQRCode {
  id: string;
  customer_id: string;
  departure_id: string;
  qr_code_data: string;
  is_active: boolean;
  customer?: { full_name: string; phone: string | null };
}

interface QRScan {
  id: string;
  qr_code_id: string;
  scan_type: string;
  location: string | null;
  scanned_at: string;
  qr_code?: { customer?: { full_name: string } };
}

export default function QRCodePage() {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [scanMode, setScanMode] = useState(false);
  const [scanType, setScanType] = useState("BUS_BOARDING");
  const [scanLocation, setScanLocation] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Get departures
  const { data: departures } = useQuery({
    queryKey: ['operational-departures-qr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          package:packages(name)
        `)
        .gte('departure_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('departure_date');
      if (error) throw error;
      return data;
    },
  });

  // Get QR codes for departure
  const { data: qrCodes, isLoading: loadingQR } = useQuery({
    queryKey: ['jamaah-qr-codes', selectedDepartureId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      const { data, error } = await supabase
        .from('jamaah_qr_codes')
        .select(`
          *,
          customer:customers(full_name, phone)
        `)
        .eq('departure_id', selectedDepartureId)
        .order('created_at');
      if (error) throw error;
      return data as JamaahQRCode[];
    },
    enabled: !!selectedDepartureId,
  });

  // Get recent scans
  const { data: recentScans } = useQuery({
    queryKey: ['qr-scans', selectedDepartureId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      const { data, error } = await supabase
        .from('qr_scans')
        .select(`
          *,
          qr_code:jamaah_qr_codes!inner(
            departure_id,
            customer:customers(full_name)
          )
        `)
        .eq('qr_code.departure_id', selectedDepartureId)
        .order('scanned_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as QRScan[];
    },
    enabled: !!selectedDepartureId,
  });

  // Generate QR codes for all passengers
  const generateQRMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDepartureId) throw new Error('Pilih keberangkatan terlebih dahulu');
      
      // Get all passengers in this departure
      const { data: passengers, error: pError } = await supabase
        .from('booking_passengers')
        .select(`
          customer_id,
          booking:bookings!inner(departure_id)
        `)
        .eq('booking.departure_id', selectedDepartureId);
      if (pError) throw pError;

      // Get existing QR codes
      const { data: existing } = await supabase
        .from('jamaah_qr_codes')
        .select('customer_id')
        .eq('departure_id', selectedDepartureId);

      const existingIds = new Set(existing?.map(e => e.customer_id) || []);
      const newPassengers = passengers?.filter(p => !existingIds.has(p.customer_id)) || [];

      if (newPassengers.length === 0) {
        throw new Error('Semua jamaah sudah memiliki QR code');
      }

      // Generate QR codes
      const qrInserts = newPassengers.map(p => ({
        customer_id: p.customer_id,
        departure_id: selectedDepartureId,
        qr_code_data: `UMR-${selectedDepartureId.slice(0, 8)}-${p.customer_id.slice(0, 8)}-${Date.now()}`,
      }));

      const { error: insertError } = await supabase
        .from('jamaah_qr_codes')
        .insert(qrInserts);
      if (insertError) throw insertError;

      return newPassengers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['jamaah-qr-codes'] });
      toast.success(`${count} QR code berhasil di-generate`);
    },
    onError: (error: any) => {
      toast.error('Gagal generate QR: ' + error.message);
    },
  });

  // Scan QR code
  const scanMutation = useMutation({
    mutationFn: async (qrData: string) => {
      // Find QR code
      const { data: qrCode, error: qrError } = await supabase
        .from('jamaah_qr_codes')
        .select('id, customer:customers(full_name)')
        .eq('qr_code_data', qrData)
        .eq('is_active', true)
        .single();
      
      if (qrError || !qrCode) throw new Error('QR code tidak valid atau tidak aktif');

      const { data: { user } } = await supabase.auth.getUser();

      // Record scan
      const { error: scanError } = await supabase
        .from('qr_scans')
        .insert({
          qr_code_id: qrCode.id,
          scan_type: scanType,
          location: scanLocation || null,
          scanned_by: user?.id,
        });
      if (scanError) throw scanError;

      return (qrCode.customer as any)?.full_name || 'Jamaah';
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['qr-scans'] });
      toast.success(`✓ ${name} - ${SCAN_TYPES.find(s => s.value === scanType)?.label}`);
      setManualCode("");
    },
    onError: (error: any) => {
      toast.error('Scan gagal: ' + error.message);
    },
  });

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      scanMutation.mutate(manualCode.trim());
    }
  };

  const filteredQRCodes = qrCodes?.filter(qr =>
    (qr.customer as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQR = qrCodes?.length || 0;
  const todayScans = recentScans?.filter(s => 
    new Date(s.scanned_at).toDateString() === new Date().toDateString()
  ).length || 0;

  const getScanTypeLabel = (type: string) => {
    return SCAN_TYPES.find(s => s.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Code & Validasi</h1>
        <p className="text-muted-foreground">Generate dan scan QR code jamaah</p>
      </div>

      {/* Departure Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <Label className="text-sm">Keberangkatan</Label>
              <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.package as any)?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDepartureId && (
              <Button onClick={() => generateQRMutation.mutate()} disabled={generateQRMutation.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generateQRMutation.isPending ? 'animate-spin' : ''}`} />
                Generate QR Codes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDepartureId && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <QrCode className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalQR}</p>
                    <p className="text-sm text-muted-foreground">Total QR Code</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Scan className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{todayScans}</p>
                    <p className="text-sm text-muted-foreground">Scan Hari Ini</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex items-center justify-center p-4">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => setScanMode(!scanMode)}
              >
                <Scan className="h-5 w-5 mr-2" />
                {scanMode ? 'Tutup Scanner' : 'Buka Scanner'}
              </Button>
            </Card>
          </div>

          {/* Scanner Mode */}
          {scanMode && (
            <Card className="border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Mode Scanner Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipe Validasi</Label>
                      <Select value={scanType} onValueChange={setScanType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCAN_TYPES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lokasi (opsional)</Label>
                      <Input
                        value={scanLocation}
                        onChange={(e) => setScanLocation(e.target.value)}
                        placeholder="Contoh: Bus 1, Meja 3"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <form onSubmit={handleManualScan} className="space-y-2">
                      <Label>Input Manual / Scan Result</Label>
                      <div className="flex gap-2">
                        <Input
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Masukkan atau scan kode QR"
                          autoFocus
                        />
                        <Button type="submit" disabled={scanMutation.isPending}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arahkan scanner ke QR code jamaah
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="qrcodes">
            <TabsList>
              <TabsTrigger value="qrcodes">Daftar QR Code</TabsTrigger>
              <TabsTrigger value="scans">Riwayat Scan</TabsTrigger>
            </TabsList>

            <TabsContent value="qrcodes" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>QR Code Jamaah</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari jamaah..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingQR ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jamaah</TableHead>
                          <TableHead>QR Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQRCodes?.map((qr) => (
                          <TableRow key={qr.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{(qr.customer as any)?.full_name}</p>
                                <p className="text-sm text-muted-foreground">{(qr.customer as any)?.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {qr.qr_code_data.slice(0, 20)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant={qr.is_active ? "default" : "secondary"}>
                                {qr.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scans" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Scan Hari Ini</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Jamaah</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Lokasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentScans?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Belum ada scan
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentScans?.map((scan) => (
                          <TableRow key={scan.id}>
                            <TableCell className="text-sm">
                              {formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true, locale: localeId })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {(scan.qr_code as any)?.customer?.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getScanTypeLabel(scan.scan_type)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {scan.location || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
