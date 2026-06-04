import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";

interface RateData {
  currency: string;
  code: string;
  flag: string;
  rateToIDR: number;
  change?: number;
  label: string;
  desc: string;
}

const CURRENCIES = ["SAR", "USD", "EUR", "MYR", "SGD", "GBP"];

const META: Record<string, { flag: string; label: string; desc: string }> = {
  SAR: { flag: "🇸🇦", label: "Riyal Saudi Arabia",  desc: "Mata uang resmi Arab Saudi" },
  USD: { flag: "🇺🇸", label: "Dolar Amerika",       desc: "Mata uang cadangan dunia" },
  EUR: { flag: "🇪🇺", label: "Euro",                desc: "Mata uang kawasan Eropa" },
  MYR: { flag: "🇲🇾", label: "Ringgit Malaysia",   desc: "Mata uang Malaysia" },
  SGD: { flag: "🇸🇬", label: "Dolar Singapura",    desc: "Mata uang Singapura" },
  GBP: { flag: "🇬🇧", label: "Poundsterling",      desc: "Mata uang Inggris" },
};

function formatIDR(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
}

export default function KursPage() {
  const [rates, setRates] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string>("SAR");
  const [amount, setAmount] = useState<string>("1");

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Proxy melalui API server kita (menghindari CORS di browser)
      const res = await fetch("/api/v1/kurs");
      if (!res.ok) throw new Error("Gagal mengambil data kurs");
      const data = await res.json();

      // data.rates adalah: { SAR: 0.000XXX } (1 IDR = X SAR)
      // Kita ingin 1 SAR = Y IDR, jadi: rateToIDR = 1 / data.rates[code]
      const parsed: RateData[] = CURRENCIES.map((code) => {
        const inverseRate = data.rates[code]; // 1 IDR = inverseRate [code]
        const rateToIDR = inverseRate ? 1 / inverseRate : 0;
        return {
          currency: code,
          code,
          flag: META[code]?.flag ?? "🏳️",
          rateToIDR,
          label: META[code]?.label ?? code,
          desc: META[code]?.desc ?? "",
        };
      });

      setRates(parsed);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Tidak dapat memuat data kurs saat ini. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const selectedRate = rates.find((r) => r.code === selected);
  const amountNum = parseFloat(amount) || 0;
  const converted = selectedRate ? amountNum * selectedRate.rateToIDR : 0;
  const convertedReverse = selectedRate && selectedRate.rateToIDR > 0
    ? amountNum / selectedRate.rateToIDR
    : 0;

  return (
    <DynamicPublicLayout>
    <div className="min-h-screen bg-background">
      <AppPageHeader
        title="Nilai Tukar Mata Uang"
        subtitle={lastUpdated ? `Diperbarui: ${lastUpdated.toLocaleTimeString("id-ID")}` : "Kurs real-time SAR, USD, EUR & lainnya"}
        backTo="/"
        right={
          <Button variant="ghost" size="icon" onClick={fetchRates} disabled={loading} className="h-9 w-9 rounded-full text-muted-foreground">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Rate Cards */}
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            : rates.map((rate) => (
                <button
                  key={rate.code}
                  onClick={() => setSelected(rate.code)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all",
                    selected === rate.code
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rate.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{rate.code}</span>
                          <span className="text-xs text-muted-foreground">{rate.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{rate.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base">{formatIDR(rate.rateToIDR)}</p>
                      <p className="text-xs text-muted-foreground">per 1 {rate.code}</p>
                    </div>
                  </div>
                </button>
              ))}
        </div>

        {/* Kalkulator Konversi */}
        {selectedRate && (
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{selectedRate.flag}</span>
                Konversi {selectedRate.code} ↔ IDR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IDR ke mata uang asing */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Jumlah IDR</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm font-medium">IDR</div>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-l-none"
                    min={0}
                  />
                </div>
                <p className="text-sm font-semibold text-primary">
                  = {amountNum.toLocaleString("id-ID")} IDR → <span className="text-foreground">{convertedReverse.toFixed(4)} {selectedRate.code}</span>
                </p>
              </div>

              <div className="border-t" />

              {/* Mata uang asing ke IDR */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Jumlah {selectedRate.code}</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm font-medium">{selectedRate.code}</div>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-l-none"
                    min={0}
                  />
                </div>
                <p className="text-sm font-semibold text-primary">
                  = {amountNum} {selectedRate.code} → <span className="text-foreground">{formatIDR(converted)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Umroh */}
        <Card className="rounded-xl bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
              🕌 Tips Biaya Umroh
            </p>
            <ul className="text-xs text-green-700 dark:text-green-400 space-y-1.5">
              <li>• Paket umroh umumnya dipatok dalam <strong>SAR atau USD</strong></li>
              <li>• Harga bisa berbeda tergantung kurs saat pelunasan</li>
              <li>• Disarankan cicil lebih awal saat kurs sedang baik</li>
              <li>• Gunakan kalkulator di halaman <a href="/kalkulator" className="underline font-semibold">Kalkulator Biaya</a> untuk estimasi total</li>
            </ul>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sumber: Frankfurter (European Central Bank) · Untuk referensi saja, bukan kurs resmi bank.
        </p>
      </div>
    </div>
    </DynamicPublicLayout>
  );
}
