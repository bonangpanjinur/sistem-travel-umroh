import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format";
import {
  Calculator, Plane, Hotel, Users, Package, CheckCircle,
  ChevronRight, Star, MessageCircle, Info, CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageType {
  id: string;
  label: string;
  description: string;
  basePriceQuad: number;
  icon: string;
}

const PACKAGE_TYPES: PackageType[] = [
  { id: "umroh_reguler", label: "Umroh Reguler", description: "Paket standar 9–12 hari", basePriceQuad: 25_000_000, icon: "🕌" },
  { id: "umroh_plus", label: "Umroh Plus", description: "Paket premium 12–15 hari + city tour", basePriceQuad: 35_000_000, icon: "⭐" },
  { id: "umroh_ramadhan", label: "Umroh Ramadhan", description: "Paket spesial bulan Ramadhan", basePriceQuad: 45_000_000, icon: "🌙" },
  { id: "haji_plus", label: "Haji Plus", description: "Haji ONH Plus (40 hari)", basePriceQuad: 150_000_000, icon: "🏔️" },
  { id: "haji_furoda", label: "Haji Furoda", description: "Haji Furoda visa khusus", basePriceQuad: 200_000_000, icon: "👑" },
];

const ROOM_TYPES = [
  { id: "quad", label: "Quad (4 Orang/Kamar)", multiplier: 1.0 },
  { id: "triple", label: "Triple (3 Orang/Kamar)", multiplier: 1.15 },
  { id: "double", label: "Double (2 Orang/Kamar)", multiplier: 1.3 },
  { id: "single", label: "Single (1 Orang/Kamar)", multiplier: 1.6 },
];

const ADDONS = [
  { id: "visa", label: "Biaya Visa", price: 2_500_000, icon: "📄" },
  { id: "manasik", label: "Manasik Intensif", price: 1_000_000, icon: "📚" },
  { id: "perlengkapan", label: "Perlengkapan Jamaah", price: 1_500_000, icon: "🎒" },
  { id: "asuransi", label: "Asuransi Perjalanan", price: 500_000, icon: "🛡️" },
  { id: "airport_transfer", label: "Antar-Jemput Bandara", price: 300_000, icon: "🚌" },
  { id: "handling_passport", label: "Pengurusan Paspor", price: 750_000, icon: "🛂" },
];

const DP_RATE = 0.30;
const CICILAN_OPTIONS = [3, 6, 12];

export default function KalkulatorBiaya() {
  const [selectedPackage, setSelectedPackage] = useState(PACKAGE_TYPES[0].id);
  const [roomType, setRoomType] = useState("quad");
  const [persons, setPersons] = useState([1]);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set(["visa", "manasik", "perlengkapan"]));

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings-wa'],
    queryFn: async () => {
      const supabaseRaw: any = supabase;
      const { data } = await supabaseRaw
        .from('company_settings')
        .select('whatsapp_number, dp_percentage')
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const waNumber = companySettings?.whatsapp_number || '628123456789';
  const dpRate = companySettings?.dp_percentage ? companySettings.dp_percentage / 100 : DP_RATE;

  const pkg = PACKAGE_TYPES.find(p => p.id === selectedPackage)!;
  const room = ROOM_TYPES.find(r => r.id === roomType)!;
  const personCount = persons[0];

  const calculation = useMemo(() => {
    const basePerPerson = Math.round(pkg.basePriceQuad * room.multiplier);
    const addonsTotal = ADDONS.filter(a => selectedAddons.has(a.id)).reduce((s, a) => s + a.price, 0);
    const perPersonTotal = basePerPerson + addonsTotal;
    const groupTotal = perPersonTotal * personCount;
    const addonsList = ADDONS.filter(a => selectedAddons.has(a.id));
    return { basePerPerson, addonsTotal, perPersonTotal, groupTotal, addonsList };
  }, [pkg, room, selectedAddons, personCount]);

  const referenceTotal = personCount > 1 ? calculation.groupTotal : calculation.perPersonTotal;
  const dpAmount = Math.round(referenceTotal * dpRate);
  const remainingAfterDp = referenceTotal - dpAmount;

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const waMessage = encodeURIComponent(
    `Halo Vinstour Travel, saya tertarik dengan paket ${pkg.label} untuk ${personCount} orang. Estimasi biaya: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(referenceTotal)}. Mohon informasi lebih lanjut.`
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-green-700 dark:text-green-400">
            <span className="text-xl">🕌</span>
            <span>Vinstour Travel</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/packages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Lihat Paket</Link>
            <Button size="sm" variant="outline" asChild>
              <Link to="/contact">Hubungi Kami</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            Kalkulator Biaya Umroh & Haji
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            Estimasi Biaya Perjalanan<br />
            <span className="text-green-600 dark:text-green-400">Umroh & Haji Anda</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pilih paket, tipe kamar, dan layanan tambahan untuk mendapatkan estimasi biaya secara instan.
            Harga bersifat estimasi — hubungi kami untuk penawaran resmi.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left: Configuration */}
          <div className="md:col-span-3 space-y-5">
            {/* Package Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Pilih Paket
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {PACKAGE_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPackage(p.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:border-green-400",
                      selectedPackage === p.id
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-muted hover:bg-muted/30"
                    )}
                  >
                    <span className="text-2xl flex-shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.label}</span>
                        {selectedPackage === p.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-muted-foreground">Mulai dari</span>
                      <div className="text-sm font-bold text-green-600">{formatCurrency(p.basePriceQuad)}</div>
                      <span className="text-[10px] text-muted-foreground">/orang (quad)</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Room Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-blue-600" />
                  Tipe Kamar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRoomType(r.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        roomType === r.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-muted hover:border-blue-300 hover:bg-muted/30"
                      )}
                    >
                      <div className="text-xs font-semibold">{r.label}</div>
                      {r.multiplier > 1 && (
                        <Badge variant="outline" className="text-[10px] mt-1 text-blue-600 border-blue-300">
                          +{Math.round((r.multiplier - 1) * 100)}%
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Number of Persons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Jumlah Jamaah
                </CardTitle>
                <CardDescription>Geser slider untuk mengubah jumlah peserta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Slider
                    value={persons}
                    onValueChange={setPersons}
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-center">
                    <span className="text-3xl font-extrabold text-purple-600">{personCount}</span>
                    <div className="text-xs text-muted-foreground">orang</div>
                  </div>
                </div>
                {personCount >= 10 && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
                    <Star className="h-4 w-4" />
                    <span>Rombongan ≥10 orang — hubungi kami untuk harga spesial grup!</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add-ons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-amber-600" />
                  Layanan Tambahan
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {ADDONS.map(addon => (
                  <div
                    key={addon.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                      selectedAddons.has(addon.id)
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                        : "border-muted hover:border-amber-300"
                    )}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{addon.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{addon.label}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(addon.price)}/orang</p>
                      </div>
                    </div>
                    <Switch
                      checked={selectedAddons.has(addon.id)}
                      onCheckedChange={() => toggleAddon(addon.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Result */}
          <div className="md:col-span-2">
            <div className="sticky top-24 space-y-4">
              <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl shadow-green-100 dark:shadow-green-900/20">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-xl pb-4">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calculator className="h-5 w-5" />
                    Hasil Estimasi
                  </CardTitle>
                  <CardDescription className="text-green-100">
                    {pkg.label} · {room.label.split(' ')[0]} · {personCount} orang
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Per Person */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Per Orang</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Harga paket ({roomType})</span>
                        <span className="font-medium">{formatCurrency(calculation.basePerPerson)}</span>
                      </div>
                      {calculation.addonsList.map(a => (
                        <div key={a.id} className="flex justify-between text-muted-foreground">
                          <span>{a.icon} {a.label}</span>
                          <span>{formatCurrency(a.price)}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between font-semibold">
                      <span>Total / orang</span>
                      <span className="text-green-600">{formatCurrency(calculation.perPersonTotal)}</span>
                    </div>
                  </div>

                  {/* Group Total */}
                  {personCount > 1 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Grup ({personCount} orang)</p>
                        <div className="text-3xl font-extrabold text-green-600">
                          {formatCurrency(calculation.groupTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Estimasi total biaya {personCount} jamaah</p>
                      </div>
                    </>
                  )}

                  {/* DP & Cicilan */}
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Skema Pembayaran
                    </p>
                    <div className="space-y-2">
                      {/* DP */}
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div>
                          <p className="text-xs font-semibold text-green-800 dark:text-green-300">DP ({Math.round(dpRate * 100)}%)</p>
                          <p className="text-[10px] text-green-600 dark:text-green-400">Untuk konfirmasi booking</p>
                        </div>
                        <p className="font-bold text-green-700 dark:text-green-300 text-sm">{formatCurrency(dpAmount)}</p>
                      </div>
                      {/* Cicilan */}
                      {CICILAN_OPTIONS.map(bulan => (
                        <div key={bulan} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                          <div>
                            <p className="text-xs font-semibold">{bulan} Bulan</p>
                            <p className="text-[10px] text-muted-foreground">Sisa {formatCurrency(remainingAfterDp)} ÷ {bulan}</p>
                          </div>
                          <p className="font-bold text-sm">{formatCurrency(Math.round(remainingAfterDp / bulan))}<span className="text-[10px] font-normal text-muted-foreground">/bln</span></p>
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground text-center">*Simulasi cicilan dari sisa setelah DP. Kondisi aktual sesuai kesepakatan.</p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Harga bersifat estimasi dan dapat berubah sesuai ketersediaan dan musim perjalanan. Hubungi kami untuk penawaran resmi.</span>
                  </div>

                  {/* CTA */}
                  <div className="space-y-2 pt-1">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2" asChild>
                      <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        Tanya via WhatsApp
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <Link to="/packages">
                        <Package className="h-4 w-4" />
                        Lihat Semua Paket
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Why Us */}
              <Card className="border-0 bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold">Mengapa Vinstour Travel?</p>
                  {[
                    "Pengalaman 10+ tahun memberangkatkan jamaah",
                    "Visa & dokumen diurus lengkap",
                    "Hotel bintang 5 di Makkah & Madinah",
                    "Pembimbing berpengalaman & profesional",
                  ].map(text => (
                    <div key={text} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white dark:bg-gray-900 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Vinstour Travel · Izin PPIU No. xxx/xxx/2023 ·{" "}
            <Link to="/contact" className="text-green-600 hover:underline">Hubungi Kami</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
