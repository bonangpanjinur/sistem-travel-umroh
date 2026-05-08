import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  Calculator, PiggyBank, Calendar, TrendingUp, Target,
  CheckCircle, ArrowRight, ChevronRight, AlertCircle, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, differenceInMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const PACKAGES_ESTIMATE = [
  { label: "Umroh Reguler (Quad)", price: 25_000_000 },
  { label: "Umroh Reguler (Double)", price: 32_000_000 },
  { label: "Umroh Plus (Quad)", price: 35_000_000 },
  { label: "Umroh Plus (Double)", price: 45_000_000 },
  { label: "Umroh Ramadhan (Quad)", price: 45_000_000 },
  { label: "Haji Plus", price: 150_000_000 },
  { label: "Custom (isi manual)", price: 0 },
];

function InfoCard({ icon: Icon, title, value, sub, color }: {
  icon: React.ElementType; title: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className={cn("p-4 rounded-2xl border-2 space-y-1", color || "border-muted bg-muted/20")}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color || "bg-primary")}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

export default function KalkulatorCicilan() {
  const [selectedPackageIdx, setSelectedPackageIdx] = useState(0);
  const [customPrice, setCustomPrice] = useState("");
  const [dpPercent, setDpPercent] = useState([20]);
  const [tenor, setTenor] = useState([12]);
  const [alreadySaved, setAlreadySaved] = useState("");
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = addMonths(new Date(), 12);
    return format(d, "yyyy-MM");
  });
  const [mode, setMode] = useState<"tenor" | "target">("tenor");

  const pkg = PACKAGES_ESTIMATE[selectedPackageIdx];
  const isCustom = pkg.price === 0;
  const targetPrice = isCustom
    ? (Number(customPrice.replace(/\D/g, "")) || 0)
    : pkg.price;

  const dpAmount = Math.round(targetPrice * (dpPercent[0] / 100));
  const remainder = Math.max(0, targetPrice - dpAmount);
  const savedAmount = Number(alreadySaved.replace(/\D/g, "")) || 0;

  const monthsFromTarget = useMemo(() => {
    if (mode !== "target") return 0;
    const now = new Date();
    const target = new Date(targetMonth + "-01");
    return Math.max(1, differenceInMonths(target, now));
  }, [targetMonth, mode]);

  const monthlyInstallment = useMemo(() => {
    const remaining = Math.max(0, remainder - savedAmount);
    if (mode === "tenor") {
      return tenor[0] > 0 ? Math.ceil(remaining / tenor[0]) : 0;
    } else {
      return monthsFromTarget > 0 ? Math.ceil(remaining / monthsFromTarget) : 0;
    }
  }, [remainder, savedAmount, tenor, mode, monthsFromTarget]);

  const effectiveTenor = mode === "tenor" ? tenor[0] : monthsFromTarget;
  const totalPayment = dpAmount + savedAmount + (monthlyInstallment * effectiveTenor);
  const savingsProgress = targetPrice > 0 ? Math.min(100, (savedAmount / targetPrice) * 100) : 0;
  const projectedDoneDate = format(addMonths(new Date(), effectiveTenor), "MMMM yyyy", { locale: idLocale });

  const handlePackageSelect = (val: string) => {
    setSelectedPackageIdx(Number(val));
    setCustomPrice("");
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
            <Calculator className="h-4 w-4" />
            Kalkulator Cicilan Tabungan
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Simulasi Tabungan<br />
            <span className="text-green-600 dark:text-green-400">Umroh & Haji Anda</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Rencanakan keberangkatan impian Anda. Masukkan target paket dan lihat berapa cicilan yang perlu disiapkan setiap bulan.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left: Input Form */}
          <div className="md:col-span-3 space-y-5">
            {/* Package Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-green-600" />
                  Target Paket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Paket</Label>
                  <Select value={String(selectedPackageIdx)} onValueChange={handlePackageSelect}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGES_ESTIMATE.map((p, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {p.label}{p.price > 0 ? ` — ${formatCurrency(p.price)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isCustom && (
                  <div className="space-y-2">
                    <Label htmlFor="customPrice">Harga Target (Rp)</Label>
                    <Input
                      id="customPrice"
                      placeholder="Contoh: 25000000"
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                )}

                {targetPrice > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
                    <p className="text-sm text-muted-foreground">Harga Target</p>
                    <p className="text-2xl font-extrabold text-green-600">{formatCurrency(targetPrice)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* DP */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Uang Muka (DP)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Slider
                    value={dpPercent}
                    onValueChange={setDpPercent}
                    min={0} max={70} step={5}
                    className="flex-1"
                  />
                  <div className="w-20 text-center">
                    <span className="text-2xl font-extrabold text-blue-600">{dpPercent[0]}%</span>
                    <p className="text-xs text-muted-foreground">{formatCurrency(dpAmount)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alreadySaved">Sudah Ditabung (Rp)</Label>
                  <Input
                    id="alreadySaved"
                    placeholder="0"
                    value={alreadySaved}
                    onChange={e => setAlreadySaved(e.target.value.replace(/\D/g, ""))}
                  />
                  {savedAmount > 0 && (
                    <div className="space-y-1">
                      <ProgressBar progress={savingsProgress} color="bg-amber-500" />
                      <p className="text-xs text-muted-foreground">{savingsProgress.toFixed(1)}% dari total target sudah tersimpan</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tenor / Target Month */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Rencana Waktu Menabung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex rounded-lg overflow-hidden border">
                  <button
                    onClick={() => setMode("tenor")}
                    className={cn(
                      "flex-1 py-2 text-sm font-semibold transition-colors",
                      mode === "tenor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    Atur Tenor
                  </button>
                  <button
                    onClick={() => setMode("target")}
                    className={cn(
                      "flex-1 py-2 text-sm font-semibold transition-colors",
                      mode === "target"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    Pilih Bulan Target
                  </button>
                </div>

                {mode === "tenor" ? (
                  <div className="space-y-3">
                    <Label>Tenor Cicilan</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={tenor}
                        onValueChange={setTenor}
                        min={1} max={60} step={1}
                        className="flex-1"
                      />
                      <div className="w-20 text-center">
                        <span className="text-2xl font-extrabold text-purple-600">{tenor[0]}</span>
                        <p className="text-xs text-muted-foreground">bulan</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[6, 12, 18, 24, 36].map(t => (
                        <button
                          key={t}
                          onClick={() => setTenor([t])}
                          className={cn(
                            "px-3 py-1 rounded-lg text-sm font-medium border transition-colors",
                            tenor[0] === t ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700" : "border-muted hover:border-purple-300"
                          )}
                        >
                          {t} bln
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="targetMonth">Target Bulan Keberangkatan</Label>
                    <Input
                      id="targetMonth"
                      type="month"
                      value={targetMonth}
                      min={format(addMonths(new Date(), 1), "yyyy-MM")}
                      onChange={e => setTargetMonth(e.target.value)}
                    />
                    {monthsFromTarget > 0 && (
                      <p className="text-sm text-muted-foreground">
                        = <span className="font-semibold text-purple-600">{monthsFromTarget} bulan</span> tersisa untuk menabung
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Result */}
          <div className="md:col-span-2">
            <div className="sticky top-24 space-y-4">
              <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl">
                <CardHeader className="bg-gradient-to-br from-green-600 to-teal-600 text-white rounded-t-xl pb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <CardTitle className="text-white text-base">Hasil Simulasi</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {targetPrice === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Masukkan target harga paket terlebih dahulu</p>
                    </div>
                  ) : (
                    <>
                      {/* Main metric */}
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-2xl">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cicilan Per Bulan</p>
                        <p className="text-4xl font-extrabold text-green-600">{formatCurrency(monthlyInstallment)}</p>
                        <p className="text-xs text-muted-foreground mt-1">selama {effectiveTenor} bulan</p>
                      </div>

                      <Separator />

                      {/* Breakdown */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Harga paket</span>
                          <span className="font-medium">{formatCurrency(targetPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">DP ({dpPercent[0]}%)</span>
                          <span className="font-medium text-blue-600">− {formatCurrency(dpAmount)}</span>
                        </div>
                        {savedAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tabungan saat ini</span>
                            <span className="font-medium text-amber-600">− {formatCurrency(savedAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Sisa yang dicicil</span>
                          <span className="text-green-600">{formatCurrency(Math.max(0, remainder - savedAmount))}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Timeline */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                            <span className="text-muted-foreground">Selesai pada</span>
                          </div>
                          <span className="font-semibold text-purple-600">{projectedDoneDate}</span>
                        </div>
                        <ProgressBar progress={savingsProgress} color="bg-amber-400" />
                        <p className="text-xs text-muted-foreground">{savingsProgress.toFixed(1)}% sudah terkumpul</p>
                      </div>

                      {/* Tips */}
                      {monthlyInstallment > 5_000_000 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>Cicilan cukup besar. Coba pilih paket yang lebih terjangkau atau perpanjang tenor.</span>
                        </div>
                      )}
                      {monthlyInstallment > 0 && monthlyInstallment <= 3_000_000 && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl text-xs text-green-700 dark:text-green-400">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>Simulasi ini sangat terjangkau! Yuk mulai menabung sekarang.</span>
                        </div>
                      )}

                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 mt-2" asChild>
                        <Link to="/savings">
                          Mulai Tabungan Sekarang
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" asChild>
                <Link to="/packages">
                  <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                  Lihat Paket Tersedia
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
