import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Calculator, Info, RotateCcw,
  Coins, Heart, Wheat, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { cn } from "@/lib/utils";

const NISAB_EMAS_GRAM = 85;
const NISAB_PERAK_GRAM = 595;
const HARGA_EMAS_PER_GRAM = 1_580_000;
const HARGA_PERAK_PER_GRAM = 12_000;
const NISAB_IDR = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;

const HARGA_BERAS_PER_KG = 14_000;
const SATU_SHA = 2.5;

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function InputRupiah({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-9"
          placeholder="0"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResultCard({ label, amount, highlight, note }: { label: string; amount: number; highlight?: boolean; note?: string }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      highlight ? "bg-primary/5 border-primary/30" : "bg-gray-50 border-gray-200"
    )}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", highlight ? "text-primary" : "text-gray-800")}>
        {formatIDR(amount)}
      </p>
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );
}

function NisabInfo({ open, toggle }: { open: boolean; toggle: () => void }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={toggle} className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Info Nisab Saat Ini</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 bg-blue-50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nisab Emas (85 gr)</span>
            <span className="font-medium">{formatIDR(NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nisab Perak (595 gr)</span>
            <span className="font-medium">{formatIDR(NISAB_PERAK_GRAM * HARGA_PERAK_PER_GRAM)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Harga Emas/gram</span>
            <span className="font-medium">{formatIDR(HARGA_EMAS_PER_GRAM)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">* Harga bersifat estimasi. Cek harga emas terkini untuk perhitungan akurat.</p>
        </div>
      )}
    </div>
  );
}

// ─── Zakat Fitrah ──────────────────────────────────────────────────────────
function ZakatFitrah() {
  const [jiwa, setJiwa] = useState("1");
  const [jenisZakat, setJenisZakat] = useState<"beras" | "uang">("uang");
  const [infoOpen, setInfoOpen] = useState(false);

  const jumlahJiwa = parseInt(jiwa) || 1;
  const berasKg = SATU_SHA * jumlahJiwa;
  const nilaiUang = berasKg * HARGA_BERAS_PER_KG;

  const handleCopy = () => {
    const text = jenisZakat === "uang"
      ? `Zakat Fitrah ${jumlahJiwa} jiwa = ${formatIDR(nilaiUang)}`
      : `Zakat Fitrah ${jumlahJiwa} jiwa = ${berasKg.toFixed(2)} kg beras`;
    navigator.clipboard.writeText(text);
    toast.success("Hasil disalin!");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
        <p className="text-sm text-green-800">
          <strong>Zakat Fitrah</strong> wajib dikeluarkan setiap muslim yang mampu, sebelum shalat Idul Fitri.
          Besarnya 1 sha' (≈2,5 kg) bahan makanan pokok per jiwa.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Jumlah Jiwa (Tanggungan)</Label>
        <Input
          type="number"
          min="1"
          value={jiwa}
          onChange={e => setJiwa(e.target.value)}
          placeholder="1"
        />
        <p className="text-xs text-muted-foreground">Termasuk diri sendiri + istri + anak-anak yang menjadi tanggungan</p>
      </div>

      <div className="space-y-1.5">
        <Label>Bentuk Zakat</Label>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: "uang", l: "Uang" }, { v: "beras", l: "Beras" }].map(opt => (
            <button
              key={opt.v}
              onClick={() => setJenisZakat(opt.v as any)}
              className={cn(
                "py-2 rounded-lg border text-sm font-medium transition-all",
                jenisZakat === opt.v ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <ResultCard label="Beras yang Harus Dikeluarkan" amount={0} note={`${berasKg.toFixed(2)} kg (${jumlahJiwa} jiwa × 2,5 kg)`} />
        <ResultCard label="Setara Uang" amount={nilaiUang} highlight note={`Berdasarkan harga beras ${formatIDR(HARGA_BERAS_PER_KG)}/kg`} />
      </div>

      <NisabInfo open={infoOpen} toggle={() => setInfoOpen(!infoOpen)} />

      <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
        Salin Hasil Perhitungan
      </Button>
    </div>
  );
}

// ─── Zakat Maal ────────────────────────────────────────────────────────────
function ZakatMaal() {
  const [uangTunai, setUangTunai] = useState("");
  const [tabungan, setTabungan] = useState("");
  const [investasi, setInvestasi] = useState("");
  const [emas, setEmas] = useState("");
  const [hutang, setHutang] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  const totalHarta = useMemo(() => {
    return (parseFloat(uangTunai) || 0) + (parseFloat(tabungan) || 0) +
      (parseFloat(investasi) || 0) + ((parseFloat(emas) || 0) * HARGA_EMAS_PER_GRAM);
  }, [uangTunai, tabungan, investasi, emas]);

  const totalHutang = parseFloat(hutang) || 0;
  const hartaBersih = Math.max(0, totalHarta - totalHutang);
  const wajibZakat = hartaBersih >= NISAB_IDR;
  const zakatMaal = wajibZakat ? hartaBersih * 0.025 : 0;

  const handleReset = () => {
    setUangTunai(""); setTabungan(""); setInvestasi(""); setEmas(""); setHutang("");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>Zakat Maal</strong> dikeluarkan sebesar 2,5% dari harta bersih yang sudah mencapai nisab
          dan dimiliki selama 1 tahun (haul).
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Harta yang Dimiliki</p>
        <InputRupiah label="Uang Tunai (di rumah/dompet)" value={uangTunai} onChange={setUangTunai} />
        <InputRupiah label="Tabungan & Deposito" value={tabungan} onChange={setTabungan} />
        <InputRupiah label="Investasi & Saham" value={investasi} onChange={setInvestasi} />
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Emas (gram)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">gr</span>
            <Input type="number" value={emas} onChange={e => setEmas(e.target.value)} className="pl-9" placeholder="0" />
          </div>
          {emas && <p className="text-xs text-muted-foreground">≈ {formatIDR((parseFloat(emas) || 0) * HARGA_EMAS_PER_GRAM)}</p>}
        </div>
      </div>

      <Separator />
      <InputRupiah label="Total Hutang / Cicilan Jangka Pendek" value={hutang} onChange={setHutang}
        hint="Hutang yang jatuh tempo dalam tahun ini" />

      <Separator />

      <div className="space-y-3">
        <ResultCard label="Total Harta Kotor" amount={totalHarta} />
        <ResultCard label="Total Hutang" amount={totalHutang} />
        <ResultCard label="Harta Bersih" amount={hartaBersih} />
        <div className={cn(
          "p-3 rounded-xl border text-sm font-medium flex items-center gap-2",
          wajibZakat ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {wajibZakat
            ? `✅ Harta Anda sudah mencapai nisab (${formatIDR(NISAB_IDR)}), wajib zakat maal.`
            : `⏳ Harta belum mencapai nisab (${formatIDR(NISAB_IDR)}), belum wajib zakat maal.`}
        </div>
        {wajibZakat && <ResultCard label="Zakat Maal yang Harus Dibayar (2,5%)" amount={zakatMaal} highlight />}
      </div>

      <NisabInfo open={infoOpen} toggle={() => setInfoOpen(!infoOpen)} />

      <Button onClick={handleReset} variant="outline" className="w-full gap-2">
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
}

// ─── Fidyah ────────────────────────────────────────────────────────────────
function ZakatFidyah() {
  const [hariTidakPuasa, setHariTidakPuasa] = useState("");
  const [jiwa, setJiwa] = useState("1");
  const [infoOpen, setInfoOpen] = useState(false);

  const hari = parseInt(hariTidakPuasa) || 0;
  const jml = parseInt(jiwa) || 1;
  const berasTotal = hari * jml * SATU_SHA;
  const nilaiUang = berasTotal * HARGA_BERAS_PER_KG;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
        <p className="text-sm text-rose-800">
          <strong>Fidyah</strong> adalah denda bagi orang yang tidak mampu berpuasa Ramadan karena sakit,
          usia lanjut, atau kondisi tertentu. Besarnya 1 mud (± ¾ liter / 0,6 kg) per hari, atau lebih aman
          menggunakan 1 sha' (2,5 kg) per hari.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Jumlah Hari Tidak Puasa</Label>
        <Input type="number" min="1" max="30" value={hariTidakPuasa}
          onChange={e => setHariTidakPuasa(e.target.value)} placeholder="0" />
      </div>

      <div className="space-y-1.5">
        <Label>Jumlah Orang (jika mewakili)</Label>
        <Input type="number" min="1" value={jiwa} onChange={e => setJiwa(e.target.value)} placeholder="1" />
      </div>

      <Separator />

      <div className="space-y-3">
        <ResultCard label="Total Beras / Makanan" amount={0} note={`${berasTotal.toFixed(2)} kg (${hari} hari × ${jml} orang × 2,5 kg)`} />
        <ResultCard label="Setara Uang" amount={nilaiUang} highlight
          note={`Berdasarkan harga beras ${formatIDR(HARGA_BERAS_PER_KG)}/kg`} />
      </div>

      <NisabInfo open={infoOpen} toggle={() => setInfoOpen(!infoOpen)} />

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <strong>Catatan:</strong> Fidyah bisa diberikan dalam bentuk makanan pokok atau uang kepada fakir miskin.
        Konsultasikan dengan ulama setempat untuk kepastian hukumnya.
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function JamaahKalkulatorZakat() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Kalkulator Zakat</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Fitrah, Maal & Fidyah</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs">
            2025/1446H
          </Badge>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="fitrah">
          <TabsList className="grid grid-cols-3 mb-4 w-full">
            <TabsTrigger value="fitrah" className="gap-1.5 text-xs">
              <Wheat className="h-3.5 w-3.5" /> Fitrah
            </TabsTrigger>
            <TabsTrigger value="maal" className="gap-1.5 text-xs">
              <Coins className="h-3.5 w-3.5" /> Maal
            </TabsTrigger>
            <TabsTrigger value="fidyah" className="gap-1.5 text-xs">
              <Heart className="h-3.5 w-3.5" /> Fidyah
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fitrah">
            <Card><CardContent className="pt-5 pb-5"><ZakatFitrah /></CardContent></Card>
          </TabsContent>
          <TabsContent value="maal">
            <Card><CardContent className="pt-5 pb-5"><ZakatMaal /></CardContent></Card>
          </TabsContent>
          <TabsContent value="fidyah">
            <Card><CardContent className="pt-5 pb-5"><ZakatFidyah /></CardContent></Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-4 bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <BookOpen className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
              Perhitungan ini bersifat informatif dan menggunakan harga estimasi. Untuk kepastian hukum
              zakat, konsultasikan dengan ulama atau lembaga amil zakat setempat.
            </p>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
