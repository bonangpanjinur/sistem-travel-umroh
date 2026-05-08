import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, ArrowLeftRight, TrendingUp,
  DollarSign, Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const COMMON_SAR = [1, 5, 10, 50, 100, 500, 1000];
const COMMON_IDR = [50000, 100000, 500000, 1000000, 5000000, 10000000];

const FALLBACK_RATE = 4450;

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSAR(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function JamaahKalkulatorKurs() {
  const [sarRate, setSarRate] = useState<number>(FALLBACK_RATE);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [mode, setMode] = useState<"sar-to-idr" | "idr-to-sar">("sar-to-idr");
  const [inputValue, setInputValue] = useState("");
  const [isLive, setIsLive] = useState(false);

  const fetchRate = useCallback(async () => {
    setLoadingRate(true);
    try {
      const cached = sessionStorage.getItem("sar-idr-rate");
      const cachedTime = sessionStorage.getItem("sar-idr-time");
      if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime);
        if (age < 30 * 60 * 1000) {
          setSarRate(Number(cached));
          setLastUpdated(new Date(Number(cachedTime)));
          setIsLive(true);
          setLoadingRate(false);
          return;
        }
      }
      const res = await fetch("https://open.er-api.com/v6/latest/SAR", { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const rate = data?.rates?.IDR;
      if (!rate || typeof rate !== "number") throw new Error("Invalid rate");
      setSarRate(rate);
      setLastUpdated(new Date());
      setIsLive(true);
      sessionStorage.setItem("sar-idr-rate", String(rate));
      sessionStorage.setItem("sar-idr-time", String(Date.now()));
    } catch {
      setSarRate(FALLBACK_RATE);
      setLastUpdated(null);
      setIsLive(false);
    } finally {
      setLoadingRate(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const inputNum = parseFloat(inputValue.replace(/[^0-9.]/g, "")) || 0;
  const result = mode === "sar-to-idr"
    ? inputNum * sarRate
    : inputNum / sarRate;

  const resultFormatted = mode === "sar-to-idr"
    ? formatIDR(result)
    : `SAR ${result.toFixed(2)}`;

  const handleQuickAmount = (amount: number) => {
    setInputValue(String(amount));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Kalkulator Kurs</h1>
              <p className="text-xs opacity-80">SAR ↔ IDR</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={fetchRate}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Rate Card */}
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm opacity-80">Kurs Saat Ini</p>
              {isLive ? (
                <Badge className="bg-white/20 text-white text-xs border-0">
                  <TrendingUp className="h-3 w-3 mr-1" /> Live
                </Badge>
              ) : (
                <Badge className="bg-white/20 text-white text-xs border-0">Estimasi</Badge>
              )}
            </div>
            {loadingRate ? (
              <Skeleton className="h-8 w-48 bg-white/20" />
            ) : (
              <>
                <p className="text-3xl font-bold">
                  1 SAR = {formatIDR(sarRate)}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {lastUpdated
                    ? `Diperbarui: ${format(lastUpdated, "d MMM yyyy, HH:mm", { locale: id })}`
                    : "Menggunakan kurs estimasi"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => { setMode("sar-to-idr"); setInputValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === "sar-to-idr"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            🇸🇦 SAR → 🇮🇩 IDR
          </button>
          <button
            onClick={() => { setMode("idr-to-sar"); setInputValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === "idr-to-sar"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            🇮🇩 IDR → 🇸🇦 SAR
          </button>
        </div>

        {/* Calculator */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                {mode === "sar-to-idr" ? "Jumlah Riyal (SAR)" : "Jumlah Rupiah (IDR)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  {mode === "sar-to-idr" ? "SAR" : "IDR"}
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pl-14 text-lg font-bold h-12"
                  min={0}
                />
              </div>
            </div>

            {inputNum > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Hasil Konversi</p>
                <p className="text-2xl font-bold text-primary">{resultFormatted}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode === "sar-to-idr"
                    ? `${inputNum} SAR × ${formatIDR(sarRate)}/SAR`
                    : `${formatIDR(inputNum)} ÷ ${sarRate.toFixed(0)}`}
                </p>
              </div>
            )}

            {/* Quick amounts */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Jumlah Cepat</p>
              <div className="flex flex-wrap gap-2">
                {(mode === "sar-to-idr" ? COMMON_SAR : COMMON_IDR).map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      inputNum === amount
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground/30 hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    {mode === "sar-to-idr"
                      ? `${amount} SAR`
                      : new Intl.NumberFormat("id-ID", { notation: "compact" }).format(amount)}
                  </button>
                ))}
              </div>
            </div>

            {inputNum > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setInputValue("")}
              >
                Reset
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Common Conversion Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Tabel Konversi Umum
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRate ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {COMMON_SAR.map((sar) => (
                  <div
                    key={sar}
                    className="flex justify-between items-center py-1.5 border-b border-muted last:border-0"
                  >
                    <span className="text-sm font-medium">{sar} SAR</span>
                    <span className="text-sm text-primary font-semibold">{formatIDR(sar * sarRate)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-xs text-amber-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Informasi Kurs</p>
                <p className="mt-1 text-amber-700">
                  Kurs yang ditampilkan adalah kurs referensi dan dapat berbeda dengan kurs bank/money changer.
                  Selalu konfirmasi kurs terkini di tempat penukaran resmi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
