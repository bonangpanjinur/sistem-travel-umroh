import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, BookOpen, Moon, Heart, Coins, PiggyBank, CreditCard } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { formatCurrency } from "@/lib/format";

const NISAB_EMAS_GRAM = 85;
const HARGA_EMAS_PER_GRAM = 1_500_000;
const NISAB_RUPIAH = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;
const ZAKAT_MAAL_RATE = 0.025;
const FIDYAH_PER_HARI = 15_000;

type CalcType = "zakat" | "fidyah" | "qadha" | "khatam" | "tabungan" | "cicilan";

const CALC_MENU = [
  { id: "zakat" as CalcType, label: "Zakat Maal", icon: Coins, emoji: "💰", color: "from-yellow-600 to-amber-600" },
  { id: "fidyah" as CalcType, label: "Fidyah", icon: Heart, emoji: "🤲", color: "from-rose-600 to-pink-600" },
  { id: "qadha" as CalcType, label: "Qadha Puasa", icon: Moon, emoji: "🌙", color: "from-indigo-600 to-blue-600" },
  { id: "khatam" as CalcType, label: "Khatam Quran", icon: BookOpen, emoji: "📖", color: "from-emerald-600 to-teal-600" },
  { id: "tabungan" as CalcType, label: "Tabungan Umroh", icon: PiggyBank, emoji: "🕋", color: "from-violet-600 to-purple-600" },
  { id: "cicilan" as CalcType, label: "Cicilan Syariah", icon: CreditCard, emoji: "📋", color: "from-orange-600 to-red-600" },
];

function ZakatCalc() {
  const [harta, setHarta] = useState("");
  const [hutang, setHutang] = useState("");
  const result = Math.max(0, Number(harta.replace(/\D/g, "")) - Number(hutang.replace(/\D/g, "")));
  const wajibZakat = result >= NISAB_RUPIAH;
  const zakat = wajibZakat ? result * ZAKAT_MAAL_RATE : 0;
  return (
    <div className="space-y-4">
      <div className="bg-amber-900/20 rounded-xl p-3 text-xs text-amber-300">
        Nisab: {NISAB_EMAS_GRAM}g emas ≈ {formatCurrency(NISAB_RUPIAH)} | Tarif: 2,5%
      </div>
      <div><Label className="text-gray-300">Total Harta (Rp)</Label>
        <Input placeholder="0" value={harta} onChange={e => setHarta(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Total Hutang (Rp)</Label>
        <Input placeholder="0" value={hutang} onChange={e => setHutang(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <Separator className="bg-white/10" />
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Harta Bersih</span><span className="text-white font-medium">{formatCurrency(result)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Status Nisab</span>
          <Badge className={wajibZakat ? "bg-emerald-600" : "bg-gray-700"}>{wajibZakat ? "✓ Wajib Zakat" : "Belum Nisab"}</Badge></div>
        {wajibZakat && <div className="flex justify-between text-lg font-bold"><span className="text-amber-300">Zakat Wajib</span><span className="text-amber-400">{formatCurrency(zakat)}</span></div>}
      </div>
    </div>
  );
}

function FidyahCalc() {
  const [hari, setHari] = useState("");
  const [tanggungan, setTanggungan] = useState("1");
  const total = Number(hari) * Number(tanggungan) * FIDYAH_PER_HARI;
  return (
    <div className="space-y-4">
      <div className="bg-rose-900/20 rounded-xl p-3 text-xs text-rose-300">
        Fidyah: 1 mud (±674g beras) per hari ≈ {formatCurrency(FIDYAH_PER_HARI)}
      </div>
      <div><Label className="text-gray-300">Hari Puasa yang Ditinggalkan</Label>
        <Input type="number" placeholder="0" value={hari} onChange={e => setHari(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Jumlah Tanggungan (orang)</Label>
        <Input type="number" min="1" value={tanggungan} onChange={e => setTanggungan(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <Separator className="bg-white/10" />
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Total Hari × Tanggungan</span><span className="text-white">{Number(hari) * Number(tanggungan)} hari</span></div>
        <div className="flex justify-between text-lg font-bold"><span className="text-rose-300">Total Fidyah</span><span className="text-rose-400">{formatCurrency(total)}</span></div>
      </div>
    </div>
  );
}

function QadhaCalc() {
  const [tahun, setTahun] = useState("");
  const [sudahQadha, setSudahQadha] = useState("");
  const total = Math.max(0, Number(tahun) * 30 - Number(sudahQadha));
  const estimasiSelesai = total > 0 ? Math.ceil(total / 30) : 0;
  return (
    <div className="space-y-4">
      <div className="bg-indigo-900/20 rounded-xl p-3 text-xs text-indigo-300">
        Kalkulator hutang puasa Ramadhan yang belum diqadha
      </div>
      <div><Label className="text-gray-300">Berapa Ramadhan yang Terlewat?</Label>
        <Input type="number" placeholder="0" value={tahun} onChange={e => setTahun(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Sudah Diqadha (hari)</Label>
        <Input type="number" placeholder="0" value={sudahQadha} onChange={e => setSudahQadha(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Total Hutang Puasa</span><span className="text-white">{Number(tahun) * 30} hari</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Sisa Hutang</span><span className="text-indigo-400 font-bold">{total} hari</span></div>
        {estimasiSelesai > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Estimasi Selesai</span><span className="text-white">±{estimasiSelesai} bulan</span></div>}
      </div>
    </div>
  );
}

function KhatamCalc() {
  const [targetDays, setTargetDays] = useState("30");
  const [sudahJuz, setSudahJuz] = useState("0");
  const totalJuz = 30, totalHalaman = 604;
  const sisaJuz = Math.max(0, totalJuz - Number(sudahJuz));
  const halamanPerHari = Number(targetDays) > 0 ? Math.ceil((sisaJuz / totalJuz * totalHalaman) / Number(targetDays)) : 0;
  const ayatPerHari = Number(targetDays) > 0 ? Math.ceil(6236 * (sisaJuz / totalJuz) / Number(targetDays)) : 0;
  return (
    <div className="space-y-4">
      <div><Label className="text-gray-300">Target Khatam dalam (hari)</Label>
        <Input type="number" min="1" value={targetDays} onChange={e => setTargetDays(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Sudah Selesai (juz)</Label>
        <Input type="number" min="0" max="30" value={sudahJuz} onChange={e => setSudahJuz(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Sisa Juz</span><span className="text-white">{sisaJuz} dari 30</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Target Per Hari</span><span className="text-emerald-400 font-bold">{halamanPerHari} halaman</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">≈ Ayat Per Hari</span><span className="text-white">{ayatPerHari} ayat</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">≈ Lembar Per Hari</span><span className="text-white">{Math.ceil(halamanPerHari / 2)} lembar</span></div>
      </div>
    </div>
  );
}

function TabunganCalc() {
  const [target, setTarget] = useState("35000000");
  const [tabunganAda, setTabunganAda] = useState("0");
  const [perBulan, setPerBulan] = useState("");
  const sisa = Math.max(0, Number(target) - Number(tabunganAda));
  const bulanNeeded = Number(perBulan) > 0 ? Math.ceil(sisa / Number(perBulan)) : 0;
  return (
    <div className="space-y-4">
      <div><Label className="text-gray-300">Target Biaya Umroh (Rp)</Label>
        <Input placeholder="35000000" value={target} onChange={e => setTarget(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Tabungan yang Sudah Ada (Rp)</Label>
        <Input placeholder="0" value={tabunganAda} onChange={e => setTabunganAda(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div><Label className="text-gray-300">Sanggup Nabung Per Bulan (Rp)</Label>
        <Input placeholder="0" value={perBulan} onChange={e => setPerBulan(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1" /></div>
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Kekurangan</span><span className="text-white">{formatCurrency(sisa)}</span></div>
        {bulanNeeded > 0 && <>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Lama Menabung</span><span className="text-violet-400 font-bold">{bulanNeeded} bulan ({(bulanNeeded/12).toFixed(1)} tahun)</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Perkiraan Berangkat</span><span className="text-white">{new Date(Date.now() + bulanNeeded*30*24*3600*1000).toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</span></div>
        </>}
      </div>
    </div>
  );
}

function CicilanCalc() {
  const [harga, setHarga] = useState("35000000");
  const [dp, setDp] = useState("5000000");
  const [tenor, setTenor] = useState("24");
  const [margin, setMargin] = useState("5");
  const pokok = Math.max(0, Number(harga) - Number(dp));
  const totalMargin = pokok * (Number(margin) / 100);
  const totalBayar = pokok + totalMargin;
  const angsuran = Number(tenor) > 0 ? Math.ceil(totalBayar / Number(tenor)) : 0;
  return (
    <div className="space-y-4">
      <div className="bg-orange-900/20 rounded-xl p-3 text-xs text-orange-300">
        Cicilan Murabahah — tidak ada bunga berbunga, margin tetap dari awal
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-gray-300 text-xs">Harga Paket (Rp)</Label>
          <Input value={harga} onChange={e => setHarga(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1 text-sm" /></div>
        <div><Label className="text-gray-300 text-xs">DP (Rp)</Label>
          <Input value={dp} onChange={e => setDp(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1 text-sm" /></div>
        <div><Label className="text-gray-300 text-xs">Tenor (Bulan)</Label>
          <Input type="number" value={tenor} onChange={e => setTenor(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1 text-sm" /></div>
        <div><Label className="text-gray-300 text-xs">Margin (%)</Label>
          <Input type="number" value={margin} onChange={e => setMargin(e.target.value)} className="bg-white/10 border-white/20 text-white mt-1 text-sm" /></div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Pokok Hutang</span><span className="text-white">{formatCurrency(pokok)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Margin ({margin}%)</span><span className="text-white">{formatCurrency(totalMargin)}</span></div>
        <Separator className="bg-white/10" />
        <div className="flex justify-between text-sm"><span className="text-gray-400">Total Bayar</span><span className="text-white">{formatCurrency(totalBayar)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span className="text-orange-300">Angsuran/Bulan</span><span className="text-orange-400">{formatCurrency(angsuran)}</span></div>
      </div>
    </div>
  );
}

export default function KalkulatorIslami() {
  const [active, setActive] = useState<CalcType>("zakat");

  const renderCalc = () => {
    switch (active) {
      case "zakat": return <ZakatCalc />;
      case "fidyah": return <FidyahCalc />;
      case "qadha": return <QadhaCalc />;
      case "khatam": return <KhatamCalc />;
      case "tabungan": return <TabunganCalc />;
      case "cicilan": return <CicilanCalc />;
    }
  };

  const activeMenu = CALC_MENU.find(m => m.id === active)!;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-gray-950 pb-16">
        <div className="bg-gradient-to-r from-slate-800 to-gray-800 py-10 px-4 text-center">
          <Badge className="mb-3 bg-white/20 text-white border-0">🔢 Kalkulator Islami</Badge>
          <h1 className="text-3xl font-bold text-white mb-2">Kalkulator Islami</h1>
          <p className="text-gray-400 text-sm">Zakat, Fidyah, Qadha Puasa, Khatam Quran & Keuangan Syariah</p>
        </div>

        <div className="max-w-xl mx-auto px-4 mt-6">
          {/* Menu Grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {CALC_MENU.map(({ id, label, emoji, color }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`p-3 rounded-xl text-center transition-all ${active === id ? `bg-gradient-to-br ${color} text-white shadow-lg scale-105` : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <p className="text-xs font-medium leading-tight">{label}</p>
              </button>
            ))}
          </div>

          {/* Calculator Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">{activeMenu.emoji}</span>
                {activeMenu.label}
              </CardTitle>
            </CardHeader>
            <CardContent>{renderCalc()}</CardContent>
          </Card>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
