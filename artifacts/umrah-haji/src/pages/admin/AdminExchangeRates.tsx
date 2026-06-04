import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Save,
  Trash2,
  Power,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

const CURRENCY_OPTIONS = [
  { code: "USD", name: "Dolar Amerika", flag: "🇺🇸" },
  { code: "SAR", name: "Riyal Saudi Arabia", flag: "🇸🇦" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "MYR", name: "Ringgit Malaysia", flag: "🇲🇾" },
  { code: "SGD", name: "Dolar Singapura", flag: "🇸🇬" },
];

function pctChange(newVal: number, oldVal: number): number | null {
  if (!oldVal || oldVal === 0) return null;
  return ((newVal - oldVal) / oldVal) * 100;
}

/** PAK-F4 / CUR-1..3 — Manajemen Kurs Mata Uang Harian */
export default function AdminExchangeRates() {
  const qc = useQueryClient();
  const [currencyFrom, setCurrencyFrom] = useState("USD");
  const [rate, setRate] = useState<number>(16500);
  const [notes, setNotes] = useState("");
  const [fetchingApi, setFetchingApi] = useState(false);
  const [lastApiFetch, setLastApiFetch] = useState<string | null>(null);
  const [apiRates, setApiRates] = useState<Record<string, number>>({});

  const { data: rates, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async ({ from, r, n }: { from: string; r: number; n: string }) => {
      if (!r || r <= 0) throw new Error("Kurs harus lebih dari 0");
      await supabase
        .from("exchange_rates")
        .update({ is_active: false })
        .eq("currency_from", from)
        .eq("currency_to", "IDR");

      const { error } = await supabase.from("exchange_rates").insert({
        currency_from: from,
        currency_to: "IDR",
        rate: r,
        source: "manual",
        notes: n,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      qc.invalidateQueries({ queryKey: ["active-exchange-rate"] });
      setNotes("");
      toast.success("Kurs tersimpan & menjadi kurs aktif");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("exchange_rates")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exchange-rates"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exchange_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exchange-rates"] }),
  });

  // Group active rates per currency
  const activeMap: Record<string, any> = {};
  const prevMap: Record<string, any> = {};
  (rates || []).forEach((r: any) => {
    if (r.is_active && !activeMap[r.currency_from]) {
      activeMap[r.currency_from] = r;
    } else if (!r.is_active && !prevMap[r.currency_from]) {
      prevMap[r.currency_from] = r;
    }
  });

  const handleFetchFromApi = async () => {
    setFetchingApi(true);
    try {
      const res = await fetch("/api/v1/kurs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // json.rates = { USD: 0.0000X, EUR: ..., SAR: ... } — "1 IDR = X currency"
      // Invert to get "1 currency = Y IDR"
      const inverted: Record<string, number> = {};
      Object.entries(json.rates as Record<string, number>).forEach(([cur, ratePerIdr]) => {
        inverted[cur] = Math.round(1 / ratePerIdr);
      });
      setApiRates(inverted);
      setLastApiFetch(new Date().toLocaleTimeString("id-ID"));
      toast.success("Data kurs dari API berhasil diambil. Periksa dan klik Simpan untuk mengaktifkan.");
    } catch (err: any) {
      toast.error(`Gagal ambil kurs dari API: ${err.message}`);
    } finally {
      setFetchingApi(false);
    }
  };

  const handleApplyApiRate = (cur: string) => {
    const r = apiRates[cur];
    if (!r) return;
    setCurrencyFrom(cur);
    setRate(r);
    setNotes(`Otomatis dari API Frankfurter/ECB — ${new Date().toLocaleDateString("id-ID")}`);
    toast.info(`Kurs ${cur}/IDR = ${r.toLocaleString("id-ID")} dimuat. Klik "Simpan & Aktifkan" untuk menyimpan.`);
  };

  const handleSaveAllFromApi = async () => {
    if (Object.keys(apiRates).length === 0) {
      toast.error("Ambil data dari API terlebih dahulu.");
      return;
    }
    const n = `Otomatis dari API Frankfurter/ECB — ${new Date().toLocaleDateString("id-ID")}`;
    for (const [cur, r] of Object.entries(apiRates)) {
      if (CURRENCY_OPTIONS.find((c) => c.code === cur)) {
        await create.mutateAsync({ from: cur, r, n }).catch(() => {});
      }
    }
    toast.success("Semua kurs dari API berhasil disimpan & diaktifkan");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Kurs Mata Uang Harian
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kurs aktif dipakai wizard booking untuk paket Haji USD/SAR. Kurs <strong>dikunci ke
          booking saat checkout</strong> — perubahan kurs tidak mengubah booking yang sudah ada.
        </p>
      </div>

      {/* Active rates summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {CURRENCY_OPTIONS.map(({ code, name, flag }) => {
          const active = activeMap[code];
          const prev = prevMap[code];
          const pct = active && prev ? pctChange(Number(active.rate), Number(prev.rate)) : null;
          const apiR = apiRates[code];

          return (
            <Card
              key={code}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currencyFrom === code ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                setCurrencyFrom(code);
                if (active) setRate(Number(active.rate));
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <span>{flag}</span>
                  <span className="font-semibold text-foreground">{code}</span>
                </div>
                <div className="text-lg font-bold leading-tight">
                  {active ? formatCurrency(Number(active.rate), "IDR") : <span className="text-muted-foreground">—</span>}
                </div>
                {pct !== null && (
                  <div className={`flex items-center gap-0.5 text-xs mt-1 ${
                    pct > 0 ? "text-red-600" : pct < 0 ? "text-green-600" : "text-muted-foreground"
                  }`}>
                    {pct > 0 ? <TrendingUp className="h-3 w-3" /> : pct < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(pct).toFixed(2)}%
                    {Math.abs(pct) > 1 && <AlertTriangle className="h-3 w-3 ml-0.5" />}
                  </div>
                )}
                {apiR && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    API: {apiR.toLocaleString("id-ID")}
                  </div>
                )}
                {active && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(active.fetched_at).toLocaleDateString("id-ID")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* API Auto-fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Ambil Kurs dari API Otomatis
          </CardTitle>
          <CardDescription>
            Ambil data real-time dari Frankfurter (European Central Bank). SAR dihitung dari
            peg tetap USD (1 USD = 3.75 SAR).
            {lastApiFetch && (
              <span className="ml-2 text-green-600 font-medium">Terakhir diambil: {lastApiFetch}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleFetchFromApi}
              disabled={fetchingApi}
              className="flex items-center gap-2"
            >
              {fetchingApi ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {fetchingApi ? "Mengambil data..." : "Ambil dari API"}
            </Button>

            {Object.keys(apiRates).length > 0 && (
              <Button
                onClick={handleSaveAllFromApi}
                disabled={create.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Simpan Semua dari API
              </Button>
            )}
          </div>

          {Object.keys(apiRates).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {CURRENCY_OPTIONS.filter((c) => apiRates[c.code]).map(({ code, flag }) => {
                const apiR = apiRates[code];
                const active = activeMap[code];
                const pct = active ? pctChange(apiR, Number(active.rate)) : null;

                return (
                  <div key={code} className="border rounded-lg p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">
                      {flag} {code} → IDR
                    </div>
                    <div className="font-semibold">{apiR.toLocaleString("id-ID")}</div>
                    {pct !== null && (
                      <div className={`flex items-center gap-0.5 text-xs ${
                        pct > 0 ? "text-red-600" : pct < 0 ? "text-green-600" : "text-muted-foreground"
                      }`}>
                        {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {pct > 0 ? "+" : ""}{pct.toFixed(2)}% dari kurs aktif
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2 h-7 text-xs"
                      onClick={() => handleApplyApiRate(code)}
                    >
                      Muat ke form
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(apiRates).length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded p-3 bg-muted/30">
              <Info className="h-4 w-4 flex-shrink-0" />
              Klik "Ambil dari API" untuk menarik data kurs terkini. Data di-cache 1 jam di server.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input Kurs Manual</CardTitle>
          <CardDescription>
            Klik kartu mata uang di atas untuk memuat kurs aktifnya, atau isi manual.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border rounded px-3 py-2 bg-background text-sm"
            value={currencyFrom}
            onChange={(e) => {
              setCurrencyFrom(e.target.value);
              const active = activeMap[e.target.value];
              if (active) setRate(Number(active.rate));
            }}
          >
            {CURRENCY_OPTIONS.map(({ code, flag, name }) => (
              <option key={code} value={code}>
                {flag} {code} — {name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            step="1"
            placeholder="Kurs (IDR)"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <Input placeholder="→ IDR (target)" value="IDR" disabled />
          <Button
            onClick={() => create.mutate({ from: currencyFrom, r: rate, n: notes })}
            disabled={create.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Simpan & Aktifkan
          </Button>
          <Textarea
            className="md:col-span-4"
            placeholder="Catatan (sumber kurs, mis. Bank Indonesia 14 Mei 2026)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Kurs</CardTitle>
          <CardDescription>
            Kurs dengan badge <strong>Aktif</strong> digunakan di wizard booking saat ini.
            Toggle untuk mengaktifkan/menonaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-4 text-center">Memuat…</div>
          )}
          {!isLoading && (rates || []).length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Belum ada data kurs. Tambahkan kurs pertama di atas.
            </div>
          )}
          {(rates || []).map((r: any) => {
            const prev = (rates || []).find(
              (x: any) => x.currency_from === r.currency_from && x.id !== r.id && !x.is_active && x.fetched_at < r.fetched_at
            );
            const pct = prev ? pctChange(Number(r.rate), Number(prev.rate)) : null;

            return (
              <div
                key={r.id}
                className={`flex items-center justify-between border rounded p-3 gap-3 ${
                  r.is_active ? "bg-primary/5 border-primary/20" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    <span>{CURRENCY_OPTIONS.find((c) => c.code === r.currency_from)?.flag ?? ""} {r.currency_from} → {r.currency_to}</span>
                    {r.is_active && <Badge variant="default" className="text-xs">Aktif</Badge>}
                    {r.source === "manual" && <Badge variant="outline" className="text-xs">Manual</Badge>}
                    {r.source === "api" && <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">API</Badge>}
                    {r.source === "seed" && <Badge variant="outline" className="text-xs">Seed</Badge>}
                  </div>
                  <div className="text-sm">
                    1 {r.currency_from} = {formatCurrency(Number(r.rate), "IDR")}
                    {pct !== null && (
                      <span className={`ml-2 text-xs ${pct > 0 ? "text-red-600" : "text-green-600"}`}>
                        ({pct > 0 ? "+" : ""}{pct.toFixed(2)}% dari kurs sebelumnya)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.fetched_at).toLocaleString("id-ID")}
                    {r.notes ? ` • ${r.notes}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggle.mutate(r)}
                    title={r.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <Power
                      className={`h-4 w-4 ${
                        r.is_active ? "text-green-600" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Hapus entri kurs ini?")) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
