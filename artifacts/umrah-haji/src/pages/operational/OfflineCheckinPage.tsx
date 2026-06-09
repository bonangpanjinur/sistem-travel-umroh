import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import {
  WifiOff, Wifi, Download, ScanLine, CheckCircle2, Clock,
  RefreshCcw, Trash2, Users, CloudUpload, Camera, X, Search, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  saveJamaahOffline, getJamaahByDeparture, findJamaahByCode,
  queueCheckin, getPendingQueue, markSynced, getMetaList, clearDepartureData,
  type OfflineJamaah, type OfflineCheckinEvent,
} from "@/lib/offlineCheckinDb";

const CHECKPOINTS = [
  { value: "airport_departure", label: "Bandara Keberangkatan" },
  { value: "airport_arrival",   label: "Bandara Kedatangan"   },
  { value: "hotel_makkah",      label: "Hotel Makkah"         },
  { value: "hotel_madinah",     label: "Hotel Madinah"        },
  { value: "bus",               label: "Bus"                  },
  { value: "manasik",           label: "Manasik"              },
];

const SCANNER_DIV = "offline-qr-reader";

export default function OfflineCheckinPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [checkpoint, setCheckpoint] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<OfflineJamaah | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [offlineJamaah, setOfflineJamaah] = useState<OfflineJamaah[]>([]);
  const [metaList, setMetaList] = useState<Awaited<ReturnType<typeof getMetaList>>>([]);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    getMetaList().then(setMetaList);
  }, []);

  useEffect(() => {
    if (!selectedDeparture) return;
    getJamaahByDeparture(selectedDeparture).then(setOfflineJamaah);
    getPendingQueue(selectedDeparture).then((q) => setPendingCount(q.length));
  }, [selectedDeparture]);

  const { data: departures } = useQuery({
    queryKey: ["offline-departures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .gte("departure_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isOnline,
  });

  const departureLabel = useCallback((dep: typeof departures extends (infer T)[] | undefined ? (infer T) : never) => {
    if (!dep) return "";
    return `${(dep as any).package?.name || "?"} — ${format(new Date((dep as any).departure_date), "d MMM yyyy", { locale: idLocale })}`;
  }, []);

  async function downloadOfflineData() {
    if (!selectedDeparture || !isOnline) return;
    setDownloading(true);
    try {
      const { data: passengers, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, customer_id,
          customer:customers(id, full_name, passport_number, phone, gender),
          booking:bookings!inner(departure_id, booking_code, booking_status),
          checkin_status
        `)
        .eq("booking.departure_id", selectedDeparture)
        .eq("booking.booking_status", "confirmed");
      if (error) throw error;

      const jamaahList: OfflineJamaah[] = (passengers || []).map((p: any) => ({
        id: p.id,
        customer_id: p.customer_id,
        full_name: p.customer?.full_name || "N/A",
        passport_number: p.customer?.passport_number || null,
        phone: p.customer?.phone || null,
        gender: p.customer?.gender || null,
        booking_code: p.booking?.booking_code || "",
        departure_id: selectedDeparture,
        checkin_status: p.checkin_status || null,
      }));

      const dep = departures?.find((d: any) => d.id === selectedDeparture);
      const label = dep ? departureLabel(dep) : selectedDeparture;
      await saveJamaahOffline(selectedDeparture, label, jamaahList);
      setOfflineJamaah(jamaahList);
      const newMeta = await getMetaList();
      setMetaList(newMeta);
      toast.success(`${jamaahList.length} data jamaah tersimpan offline`);
    } catch (e: any) {
      toast.error("Gagal download: " + e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleScannedCode(code: string) {
    const jamaah = await findJamaahByCode(selectedDeparture, code.trim());
    if (!jamaah) {
      toast.error(`Kode tidak ditemukan: ${code}`);
      return;
    }
    setLastScanned(jamaah);
    const event: Omit<OfflineCheckinEvent, "id"> = {
      passenger_id: jamaah.id,
      customer_id:  jamaah.customer_id,
      departure_id: selectedDeparture,
      checkpoint,
      scanned_at: new Date().toISOString(),
      synced: false,
      full_name: jamaah.full_name,
    };

    if (isOnline) {
      try {
        await supabase.from("attendance").insert({
          customer_id:  jamaah.customer_id,
          departure_id: selectedDeparture,
          checkpoint,
          checked_in_at: event.scanned_at,
          notes: "Scanned via offline scanner",
        });
        toast.success(`✅ ${jamaah.full_name} — check-in langsung`);
      } catch {
        await queueCheckin(event);
        const q = await getPendingQueue(selectedDeparture);
        setPendingCount(q.length);
        toast.success(`✅ ${jamaah.full_name} — antrian disimpan`);
      }
    } else {
      await queueCheckin(event);
      const q = await getPendingQueue(selectedDeparture);
      setPendingCount(q.length);
      toast.success(`📥 ${jamaah.full_name} — disimpan offline`);
    }
  }

  async function syncQueue() {
    if (!isOnline) { toast.error("Tidak ada koneksi internet"); return; }
    setSyncing(true);
    try {
      const pending = await getPendingQueue(selectedDeparture || undefined);
      if (!pending.length) { toast.info("Tidak ada antrian yang perlu disinkronkan"); return; }

      const rows = pending.map((e) => ({
        customer_id:   e.customer_id,
        departure_id:  e.departure_id,
        checkpoint:    e.checkpoint,
        checked_in_at: e.scanned_at,
        notes: "Synced from offline scanner",
      }));
      const { error } = await supabase.from("attendance").insert(rows);
      if (error) throw error;

      await markSynced(pending.map((e) => e.id));
      setPendingCount(0);
      qc.invalidateQueries({ queryKey: ["checkin-passengers"] });
      toast.success(`${pending.length} check-in berhasil disinkronkan`);
    } catch (e: any) {
      toast.error("Gagal sync: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function startScanner() {
    if (!checkpoint) { toast.error("Pilih checkpoint dulu"); return; }
    if (!selectedDeparture) { toast.error("Pilih keberangkatan dulu"); return; }
    if (offlineJamaah.length === 0) { toast.error("Download data offline dulu"); return; }
    setScannerOpen(true);
    setScannerReady(false);
    setScannerError(null);
    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) { setScannerError("Kamera tidak ditemukan"); return; }
        const scanner = new Html5Qrcode(SCANNER_DIV);
        scannerRef.current = scanner;
        await scanner.start(
          devices[devices.length - 1].id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (text) => {
            await handleScannedCode(text);
          },
          undefined
        );
        setScannerReady(true);
      } catch (e: any) {
        setScannerError(e.message || "Gagal memulai kamera");
      }
    }, 300);
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScannerOpen(false);
    setScannerReady(false);
  }

  async function handleManualLookup() {
    if (!manualCode.trim() || !selectedDeparture) return;
    await handleScannedCode(manualCode.trim());
    setManualCode("");
  }

  const currentMeta = metaList.find((m) => m.departure_id === selectedDeparture);

  return (
    <div className="space-y-4 p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-emerald-600" />
            Scanner Check-in Offline
          </h1>
          <p className="text-sm text-muted-foreground">Scan QR jamaah — bekerja tanpa internet</p>
        </div>
        <Badge className={isOnline ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {!isOnline && (
        <Alert className="border-amber-300 bg-amber-50">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Mode offline aktif. Check-in tersimpan di perangkat dan akan disinkronkan saat kembali online.
          </AlertDescription>
        </Alert>
      )}

      {/* Setup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Keberangkatan</label>
              {isOnline ? (
                <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih keberangkatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(departures || []).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {departureLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih dari data offline..." />
                  </SelectTrigger>
                  <SelectContent>
                    {metaList.map((m) => (
                      <SelectItem key={m.departure_id} value={m.departure_id}>
                        {m.departure_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Checkpoint</label>
              <Select value={checkpoint} onValueChange={setCheckpoint}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih checkpoint..." /></SelectTrigger>
                <SelectContent>
                  {CHECKPOINTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data offline status */}
          {selectedDeparture && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="text-sm">
                {currentMeta ? (
                  <>
                    <span className="font-medium text-emerald-700">
                      <Users className="inline h-3.5 w-3.5 mr-1" />
                      {currentMeta.count} jamaah tersimpan
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      — Sync: {format(new Date(currentMeta.synced_at), "dd/MM HH:mm")}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-600 text-xs">Data offline belum didownload</span>
                )}
              </div>
              <div className="flex gap-2">
                {isOnline && (
                  <Button
                    size="sm" variant="outline" onClick={downloadOfflineData}
                    disabled={downloading || !selectedDeparture}
                    className="h-8 text-xs"
                  >
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                    {currentMeta ? "Perbarui" : "Download"}
                  </Button>
                )}
                {currentMeta && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={async () => { await clearDepartureData(selectedDeparture); setOfflineJamaah([]); setMetaList(await getMetaList()); }}
                    className="h-8 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> Scanner QR
          </CardTitle>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              <Clock className="h-3 w-3 mr-1" />
              {pendingCount} antrian
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!scannerOpen ? (
            <Button
              onClick={startScanner}
              disabled={!selectedDeparture || !checkpoint || offlineJamaah.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Buka Kamera Scanner
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <div id={SCANNER_DIV} className="w-full rounded-lg overflow-hidden" />
                {!scannerReady && !scannerError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
                {scannerError && (
                  <Alert className="border-red-300 bg-red-50 mt-2">
                    <AlertDescription className="text-red-700 text-sm">{scannerError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button variant="outline" onClick={stopScanner} className="w-full">
                <X className="h-4 w-4 mr-2" /> Tutup Scanner
              </Button>
            </div>
          )}

          <Separator />

          {/* Manual lookup */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Input Manual (kode booking / nomor paspor)</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                placeholder="Scan atau ketik kode booking..."
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={handleManualLookup} className="h-9">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Last scanned result */}
          {lastScanned && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-900">{lastScanned.full_name}</div>
                <div className="text-xs text-emerald-700">
                  {lastScanned.booking_code}
                  {lastScanned.passport_number && ` · ${lastScanned.passport_number}`}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync */}
      {pendingCount > 0 && (
        <Card className="border-amber-300">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-amber-800">
                  <Clock className="inline h-4 w-4 mr-1" />
                  {pendingCount} check-in menunggu sinkronisasi
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Akan otomatis sync saat online. Atau klik manual di bawah.
                </div>
              </div>
              <Button
                size="sm"
                onClick={syncQueue}
                disabled={!isOnline || syncing}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {syncing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  : <CloudUpload className="h-4 w-4 mr-1" />
                }
                Sync Sekarang
              </Button>
            </div>
            {isOnline && !syncing && (
              <Progress value={undefined} className="h-1.5 mt-3 bg-amber-100 [&>div]:bg-amber-500" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Jamaah list */}
      {offlineJamaah.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Data Jamaah Offline ({offlineJamaah.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {offlineJamaah.slice(0, 50).map((j) => (
                <div key={j.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                  <div>
                    <div className="font-medium">{j.full_name}</div>
                    <div className="text-xs text-muted-foreground">{j.booking_code}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {j.gender === "female" ? "♀" : "♂"}
                  </Badge>
                </div>
              ))}
              {offlineJamaah.length > 50 && (
                <div className="text-xs text-center text-muted-foreground py-2">
                  +{offlineJamaah.length - 50} jamaah lainnya
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
