import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

const CURRENCY_OPTIONS = ["USD", "SAR", "EUR", "MYR", "SGD"];

/** PAK-F4 / CUR-1..3 — Manajemen Kurs Mata Uang Harian */
export default function AdminExchangeRates() {
  const qc = useQueryClient();
  const [currencyFrom, setCurrencyFrom] = useState("USD");
  const [rate, setRate] = useState<number>(16500);
  const [notes, setNotes] = useState("");

  const { data: rates, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!rate || rate <= 0) throw new Error("Kurs harus lebih dari 0");
      // Deactivate older rates for this pair so the latest is used
      await supabase
        .from("exchange_rates")
        .update({ is_active: false })
        .eq("currency_from", currencyFrom)
        .eq("currency_to", "IDR");

      const { error } = await supabase.from("exchange_rates").insert({
        currency_from: currencyFrom,
        currency_to: "IDR",
        rate,
        source: "manual",
        notes,
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
  (rates || []).forEach((r: any) => {
    if (r.is_active && !activeMap[r.currency_from]) activeMap[r.currency_from] = r;
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Kurs Mata Uang
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kurs aktif dipakai oleh booking wizard untuk paket Haji USD/SAR. Kurs dikunci ke
          booking saat checkout—perubahan kurs di sini tidak mengubah booking yang sudah ada.
        </p>
      </div>

      {/* Active rates summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CURRENCY_OPTIONS.map((c) => {
          const r = activeMap[c];
          return (
            <Card key={c}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{c} → IDR</div>
                <div className="text-xl font-bold">
                  {r ? formatCurrency(Number(r.rate), "IDR") : "—"}
                </div>
                {r && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.fetched_at).toLocaleDateString("id-ID")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah / Update Kurs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border rounded px-3 py-2 bg-background"
            value={currencyFrom}
            onChange={(e) => setCurrencyFrom(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Input
            type="number"
            step="0.01"
            placeholder="Kurs (IDR)"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <Input
            placeholder="→ IDR (target)"
            value="IDR"
            disabled
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Save className="h-4 w-4 mr-1" />
            Simpan & Aktifkan
          </Button>
          <Textarea
            className="md:col-span-4"
            placeholder="Catatan (sumber kurs, mis. Bank Indonesia 13 Mei 2026)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
          {(rates || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border rounded p-3">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {r.currency_from} → {r.currency_to}
                  {r.is_active && <Badge variant="default">Aktif</Badge>}
                  {r.source === "seed" && <Badge variant="outline">Seed</Badge>}
                </div>
                <div className="text-sm">
                  1 {r.currency_from} = {formatCurrency(Number(r.rate), r.currency_to)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.fetched_at).toLocaleString("id-ID")}
                  {r.notes ? ` • ${r.notes}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggle.mutate(r)} title="Aktif/Nonaktif">
                  <Power className={`h-4 w-4 ${r.is_active ? "text-green-600" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}