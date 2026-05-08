import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { QrCode, Search, CheckCircle, UserCheck, Camera, X, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Html5Qrcode } from "html5-qrcode";

const CHECKPOINTS = [
  { value: 'airport_departure', label: 'Bandara Keberangkatan' },
  { value: 'airport_arrival', label: 'Bandara Kedatangan' },
  { value: 'hotel_makkah', label: 'Hotel Makkah' },
  { value: 'hotel_madinah', label: 'Hotel Madinah' },
  { value: 'bus', label: 'Bus' },
  { value: 'manasik', label: 'Manasik' },
];

export default function CheckinPage() {
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [checkpoint, setCheckpoint] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader-checkin";
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: departures } = useQuery({
    queryKey: ['checkin-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`id, departure_date, package:packages(name)`)
        .gte('departure_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('departure_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: passengers, isLoading } = useQuery({
    queryKey: ['checkin-passengers', selectedDeparture, checkpoint],
    enabled: !!selectedDeparture && !!checkpoint,
    queryFn: async () => {
      const { data: bookingPassengers, error: passengersError } = await supabase
        .from('booking_passengers')
        .select(`
          id,
          customer:customers(id, full_name, phone, passport_number),
          booking:bookings!inner(departure_id, booking_status, booking_code)
        `)
        .eq('booking.departure_id', selectedDeparture)
        .eq('booking.booking_status', 'confirmed');
      if (passengersError) throw passengersError;

      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('customer_id, checked_in_at')
        .eq('departure_id', selectedDeparture)
        .eq('checkpoint', checkpoint);
      if (attendanceError) throw attendanceError;

      const attendanceMap = new Map(
        attendanceRecords?.map(a => [a.customer_id, a.checked_in_at])
      );

      return bookingPassengers?.map(p => ({
        ...p,
        checked_in_at: attendanceMap.get((p.customer as any)?.id) || null,
      }));
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const existing = await supabase
        .from('attendance')
        .select('id')
        .eq('customer_id', customerId)
        .eq('departure_id', selectedDeparture)
        .eq('checkpoint', checkpoint)
        .maybeSingle();

      if (existing.data) throw new Error("already_checked_in");

      const { error } = await supabase
        .from('attendance')
        .insert({
          customer_id: customerId,
          departure_id: selectedDeparture,
          checkpoint: checkpoint,
          checked_in_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in berhasil!");
      queryClient.invalidateQueries({ queryKey: ['checkin-passengers'] });
    },
    onError: (err: any) => {
      if (err?.message === "already_checked_in") {
        toast.info("Jamaah ini sudah check-in sebelumnya");
      } else {
        toast.error("Gagal melakukan check-in");
      }
    },
  });

  const handleCheckinByBookingCode = (code: string) => {
    const found = passengers?.find(p =>
      (p.booking as any)?.booking_code?.toLowerCase() === code.toLowerCase() ||
      (p.customer as any)?.passport_number?.toLowerCase() === code.toLowerCase()
    );
    if (!found) {
      toast.error(`Kode "${code}" tidak ditemukan di manifest ini`);
      return;
    }
    if (found.checked_in_at) {
      const cust = (found.customer as any)?.full_name;
      toast.info(`${cust} sudah check-in pukul ${format(new Date(found.checked_in_at), "HH:mm")}`);
      return;
    }
    checkinMutation.mutate((found.customer as any)?.id);
  };

  const startScanner = async () => {
    setScannerError(null);
    setScannerReady(false);
    setScannerOpen(true);
  };

  useEffect(() => {
    if (!scannerOpen) return;
    const timer = setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setScannerError("Kamera tidak ditemukan. Pastikan izin kamera sudah diberikan.");
          return;
        }

        const qrScanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = qrScanner;

        const cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id;

        await qrScanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleCheckinByBookingCode(decodedText.trim());
          },
          undefined
        );
        setScannerReady(true);
      } catch (err: any) {
        setScannerError(err?.message || "Gagal mengakses kamera. Periksa izin browser.");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [scannerOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (_) {}
    }
    setScannerOpen(false);
    setScannerReady(false);
    setScannerError(null);
  };

  const filteredPassengers = passengers?.filter(p =>
    (p.customer as any)?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.booking as any)?.booking_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInCount = passengers?.filter(p => p.checked_in_at).length || 0;
  const totalCount = passengers?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  const checkpointLabel = CHECKPOINTS.find(c => c.value === checkpoint)?.label;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-in Jamaah</h1>
          <p className="text-muted-foreground">Lakukan check-in jamaah di setiap checkpoint</p>
        </div>
        {selectedDeparture && checkpoint && (
          <Button onClick={startScanner} className="gap-2">
            <Camera className="h-4 w-4" />
            Scan QR Kamera
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.package as any)?.name} — {format(new Date(d.departure_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Checkpoint</label>
              <Select value={checkpoint} onValueChange={setCheckpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {CHECKPOINTS.map((cp) => (
                    <SelectItem key={cp.value} value={cp.value}>{cp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cari Jamaah / Kode Booking</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama atau kode booking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDeparture && checkpoint && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  Progress Check-in — {checkpointLabel}
                </span>
              </div>
              <span className="text-sm font-bold text-primary">
                {checkedInCount} / {totalCount} ({progressPct}%)
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="text-green-600 font-medium">✅ Check-in: {checkedInCount}</span>
              <span>⏳ Belum: {totalCount - checkedInCount}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDeparture && checkpoint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-5 w-5" />
              Daftar Jamaah
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !filteredPassengers?.length ? (
              <p className="text-muted-foreground text-center py-8">
                {passengers?.length === 0 ? "Tidak ada jamaah terkonfirmasi untuk keberangkatan ini" : "Tidak ada hasil pencarian"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Nama Jamaah</TableHead>
                      <TableHead>Kode Booking</TableHead>
                      <TableHead>No. Paspor</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPassengers?.map((p, idx) => (
                      <TableRow key={p.id} className={p.checked_in_at ? "bg-green-50/40 dark:bg-green-900/10" : ""}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{(p.customer as any)?.full_name}</TableCell>
                        <TableCell className="font-mono text-xs">{(p.booking as any)?.booking_code || '-'}</TableCell>
                        <TableCell className="text-sm">{(p.customer as any)?.passport_number || '-'}</TableCell>
                        <TableCell className="text-sm">{(p.customer as any)?.phone || '-'}</TableCell>
                        <TableCell>
                          {p.checked_in_at ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {format(new Date(p.checked_in_at), "HH:mm")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Belum</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={p.checked_in_at ? "secondary" : "default"}
                            disabled={!!p.checked_in_at || checkinMutation.isPending}
                            onClick={() => checkinMutation.mutate((p.customer as any)?.id)}
                          >
                            {p.checked_in_at ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Sudah
                              </>
                            ) : checkinMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Check-in"
                            )}
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
      )}

      {!selectedDeparture || !checkpoint ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <QrCode className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan dan checkpoint untuk memulai check-in</p>
            <p className="text-sm mt-1">Atau gunakan scanner QR kamera untuk check-in otomatis</p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) stopScanner(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan QR Jamaah
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Arahkan kamera ke QR Code / Barcode jamaah
            </p>

            {scannerError ? (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive text-center space-y-2">
                <p>{scannerError}</p>
                <Button size="sm" variant="outline" onClick={() => { setScannerError(null); startScanner(); }}>
                  Coba Lagi
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div
                  id={scannerDivId}
                  className="w-full rounded-xl overflow-hidden bg-muted"
                  style={{ minHeight: 250 }}
                />
                {!scannerReady && !scannerError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground">Memulai kamera...</p>
                    </div>
                  </div>
                )}
                {scannerReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-primary rounded-lg w-48 h-48 opacity-60" />
                  </div>
                )}
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground">
              Checkpoint: <strong>{checkpointLabel}</strong>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={stopScanner}>
              <X className="h-4 w-4" />
              Tutup Scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
