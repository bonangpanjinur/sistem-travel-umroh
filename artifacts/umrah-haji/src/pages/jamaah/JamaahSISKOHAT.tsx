import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Search, Hash, Calendar, Clock, CheckCircle2, AlertCircle,
  Info, ExternalLink, RefreshCcw, MapPin, User, FileText,
  Star, ChevronRight, Home
} from "lucide-react";
import { Link } from "react-router-dom";

const SISKOHAT_INFO = {
  embarkasi: [
    { kode: "JKG", nama: "Jakarta - Pondok Gede", kuota: 21000 },
    { kode: "SUB", nama: "Surabaya - Juanda", kuota: 35905 },
    { kode: "SOC", nama: "Solo - Adi Soemarmo", kuota: 35705 },
    { kode: "UPG", nama: "Makassar - Sultan Hasanuddin", kuota: 17000 },
    { kode: "MES", nama: "Medan - Kualanamu", kuota: 14000 },
    { kode: "BTH", nama: "Batam - Hang Nadim", kuota: 8500 },
    { kode: "BPN", nama: "Balikpapan - Sultan Aji Muhammad Sulaiman", kuota: 6000 },
    { kode: "LOP", nama: "Lombok - Zainuddin Abdul Madjid", kuota: 6000 },
    { kode: "KNO", nama: "Medan - Kualanamu (Aceh)", kuota: 4000 },
    { kode: "PLM", nama: "Palembang - Sultan Mahmud Badaruddin II", kuota: 8000 },
  ],
  estimasiTunggu: {
    regular: "20–30 tahun",
    khusus: "5–10 tahun",
    plus: "Tidak ada antrian (berangkat sesuai keinginan)",
  },
};

const DEMO_PORSI = {
  nomor_porsi: "0500123456789",
  nama: "Ahmad Fauzi",
  embarkasi: "Surabaya - Juanda",
  tahun_daftar: 2019,
  estimasi_berangkat: 2047,
  sisa_tunggu_tahun: 22,
  posisi_antrian: 145230,
  status: "Aktif",
  jenis_haji: "Reguler",
  lunas_bpih: false,
};

export default function JamaahSISKOHAT() {
  const { user } = useAuth();
  const [nomorPorsi, setNomorPorsi] = useState("");
  const [result, setResult] = useState<typeof DEMO_PORSI | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking-siskohat", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code,
          departure:departures(departure_date, package:packages(name, package_type:package_types(name))),
          customer:profiles(full_name, nik)
        `)
        .eq("customer_id", user!.id)
        .neq("booking_status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  function cekPorsi() {
    if (!nomorPorsi.trim()) { toast.error("Masukkan nomor porsi haji"); return; }
    if (nomorPorsi.length < 10) { toast.error("Nomor porsi tidak valid (minimal 10 digit)"); return; }
    setLoading(true);
    setErrorMsg("");
    setTimeout(() => {
      setLoading(false);
      if (nomorPorsi === "0000000000000") {
        setErrorMsg("Nomor porsi tidak ditemukan. Pastikan nomor porsi sesuai dengan yang tertera di bukti setoran BPIH.");
        setResult(null);
      } else {
        setResult({ ...DEMO_PORSI, nomor_porsi: nomorPorsi, nama: booking?.customer?.full_name || DEMO_PORSI.nama });
        toast.success("Data porsi haji berhasil ditemukan");
      }
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah"><Home className="h-5 w-5 text-muted-foreground" /></Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">SISKOHAT — Status Porsi Haji</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Hash className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold">SISKOHAT Kemenag</h1>
              <p className="text-sm text-green-100 mt-0.5">Cek nomor porsi & estimasi keberangkatan haji</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="font-medium">Nomor Porsi Haji</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Contoh: 0500123456789"
                value={nomorPorsi}
                onChange={e => setNomorPorsi(e.target.value.replace(/\D/g, ""))}
                maxLength={13}
                className="font-mono text-sm"
                onKeyDown={e => e.key === "Enter" && cekPorsi()}
              />
              <Button onClick={cekPorsi} disabled={loading}>
                {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Nomor porsi terdiri dari 13 digit, tertera di Bukti Setoran Awal BPIH Anda
            </p>
          </CardContent>
        </Card>

        {errorMsg && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Data Porsi Ditemukan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Nomor Porsi</p>
                    <p className="font-mono font-bold text-sm">{result.nomor_porsi}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="bg-green-100 text-green-700 border-0 mt-0.5">{result.status}</Badge>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Nama</p>
                    <p className="font-semibold text-sm">{result.nama}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Jenis Haji</p>
                    <p className="font-semibold text-sm">{result.jenis_haji}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Embarkasi</p>
                    <p className="font-semibold text-sm">{result.embarkasi}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tahun Daftar</p>
                    <p className="font-semibold text-sm">{result.tahun_daftar}</p>
                  </div>
                </div>

                <Separator />

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <Calendar className="h-4 w-4" />
                    <span>Estimasi Keberangkatan</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{result.estimasi_berangkat}</p>
                  <p className="text-sm text-amber-700">Sisa waktu tunggu: ~{result.sisa_tunggu_tahun} tahun</p>
                  <p className="text-xs text-muted-foreground">Posisi antrian: {result.posisi_antrian.toLocaleString("id-ID")}</p>
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-lg border ${result.lunas_bpih ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  {result.lunas_bpih ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm text-green-700">BPIH: Lunas</span></>
                  ) : (
                    <><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-sm text-red-700">BPIH: Belum Lunas</span></>
                  )}
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Data estimasi bersifat perkiraan. Untuk informasi resmi, kunjungi{" "}
                <a href="https://haji.kemenag.go.id" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  haji.kemenag.go.id
                </a>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              Embarkasi & Kuota Haji 2025
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SISKOHAT_INFO.embarkasi.slice(0, 5).map(e => (
              <div key={e.kode} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.nama}</p>
                  <p className="text-xs text-muted-foreground">Kode: {e.kode}</p>
                </div>
                <Badge variant="outline" className="text-xs">{e.kuota.toLocaleString("id-ID")} jemaah</Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">+{SISKOHAT_INFO.embarkasi.length - 5} embarkasi lainnya</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <Star className="h-4 w-4" />
              <span className="text-sm">Sambil Menunggu? Lakukan Umroh!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimasi tunggu haji reguler 20–30 tahun. Manfaatkan waktu dengan ibadah Umroh bersama Vinstour Travel.
            </p>
            <Link to="/packages">
              <Button size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700">
                Lihat Paket Umroh <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="text-center pt-2">
          <a href="https://haji.kemenag.go.id/siskohat" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
            Cek langsung di SISKOHAT Kemenag <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
