import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Plus, ArrowUp, ArrowDown, Minus, History, AlertCircle, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

interface PriceHistoryCardProps {
  departureId: string;
  packageId?: string | null;
  currentPrices?: {
    price_quad: number;
    price_triple: number;
    price_double: number;
    price_single: number;
  };
}

const ROOM_COLORS: Record<string, string> = {
  quad: "#16a34a",
  triple: "#2563eb",
  double: "#d97706",
  single: "#dc2626",
};

const ROOM_LABELS: Record<string, string> = {
  price_quad: "Quad",
  price_triple: "Triple",
  price_double: "Double",
  price_single: "Single",
};

const SQL_SETUP = `-- Jalankan di Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS departure_price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  package_id uuid REFERENCES packages(id),
  changed_at timestamptz DEFAULT now(),
  price_quad numeric DEFAULT 0,
  price_triple numeric DEFAULT 0,
  price_double numeric DEFAULT 0,
  price_single numeric DEFAULT 0,
  keterangan text,
  changed_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dph_departure_id ON departure_price_history(departure_id);
CREATE INDEX IF NOT EXISTS idx_dph_changed_at ON departure_price_history(changed_at);`;

function formatMillions(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
  return `${val}`;
}

function PriceDiff({ prev, curr }: { prev: number; curr: number }) {
  if (!prev || prev === curr) return <Minus className="h-3 w-3 text-muted-foreground inline" />;
  const diff = curr - prev;
  const pct = Math.abs(Math.round((diff / prev) * 100));
  if (diff > 0)
    return (
      <span className="text-red-600 text-xs flex items-center gap-0.5">
        <ArrowUp className="h-3 w-3" />+{pct}%
      </span>
    );
  return (
    <span className="text-green-600 text-xs flex items-center gap-0.5">
      <ArrowDown className="h-3 w-3" />-{pct}%
    </span>
  );
}

export function PriceHistoryCard({ departureId, packageId, currentPrices }: PriceHistoryCardProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const [form, setForm] = useState({
    changed_at: format(new Date(), "yyyy-MM-dd"),
    price_quad: String(currentPrices?.price_quad || 0),
    price_triple: String(currentPrices?.price_triple || 0),
    price_double: String(currentPrices?.price_double || 0),
    price_single: String(currentPrices?.price_single || 0),
    keterangan: "",
    changed_by: "",
  });

  const db = supabase as any;

  const { data: history, isLoading, error } = useQuery({
    queryKey: ["departure-price-history", departureId],
    queryFn: async () => {
      const { data, error } = await db
        .from("departure_price_history")
        .select("*")
        .eq("departure_id", departureId)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        departure_id: departureId,
        package_id: packageId || null,
        changed_at: form.changed_at,
        price_quad: Number(form.price_quad) || 0,
        price_triple: Number(form.price_triple) || 0,
        price_double: Number(form.price_double) || 0,
        price_single: Number(form.price_single) || 0,
        keterangan: form.keterangan || null,
        changed_by: form.changed_by || null,
      };
      const { error } = await db.from("departure_price_history").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Riwayat harga berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["departure-price-history", departureId] });
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan riwayat harga");
    },
  });

  const tableNotExist =
    error &&
    (String((error as any).message).includes("does not exist") ||
      String((error as any).code) === "42P01");

  const chartData = (history || []).map((row, i) => ({
    label: format(parseISO(row.changed_at), "dd MMM yy", { locale: idLocale }),
    quad: row.price_quad,
    triple: row.price_triple,
    double: row.price_double,
    single: row.price_single,
    keterangan: row.keterangan,
  }));

  const latest = history && history.length > 0 ? history[history.length - 1] : null;
  const prev = history && history.length > 1 ? history[history.length - 2] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Riwayat Harga
          {history && history.length > 0 && (
            <Badge variant="secondary">{history.length} catatan</Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Catatan
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Table not exist — setup required */}
        {tableNotExist && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 text-sm">Tabel belum dibuat</p>
                <p className="text-xs text-amber-700 mt-1">
                  Fitur riwayat harga memerlukan tabel <code className="bg-amber-100 px-1 rounded">departure_price_history</code> di Supabase.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setIsSqlOpen(true)}
            >
              Lihat SQL untuk Membuat Tabel
            </Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Memuat riwayat harga...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !tableNotExist && !error && (!history || history.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">Belum ada riwayat harga</p>
            <p className="text-xs">Klik "Tambah Catatan" untuk mencatat harga pertama, atau edit keberangkatan untuk merekam otomatis.</p>
          </div>
        )}

        {/* Current price summary */}
        {latest && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["price_quad", "price_triple", "price_double", "price_single"] as const).map((key) => {
              const shortKey = key.replace("price_", "") as "quad" | "triple" | "double" | "single";
              return (
                <div key={key} className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{ROOM_LABELS[key]}</p>
                  <p className="font-bold text-sm">{formatCurrency(latest[shortKey] || 0)}</p>
                  {prev && (
                    <PriceDiff prev={prev[shortKey] || 0} curr={latest[shortKey] || 0} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {history && history.length >= 2 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Tren Harga</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatMillions}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [formatCurrency(val), name]}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="quad" name="Quad" stroke={ROOM_COLORS.quad} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="triple" name="Triple" stroke={ROOM_COLORS.triple} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="double" name="Double" stroke={ROOM_COLORS.double} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="single" name="Single" stroke={ROOM_COLORS.single} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History table */}
        {history && history.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Detail Perubahan</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs text-right">Quad</TableHead>
                    <TableHead className="text-xs text-right">Triple</TableHead>
                    <TableHead className="text-xs text-right">Double</TableHead>
                    <TableHead className="text-xs text-right">Single</TableHead>
                    <TableHead className="text-xs">Keterangan</TableHead>
                    <TableHead className="text-xs">Diubah oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...history].reverse().map((row: any, idx: number) => {
                    const prevRow = [...history].reverse()[idx + 1];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          {format(parseISO(row.changed_at), "dd MMM yyyy", { locale: idLocale })}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{formatCurrency(row.price_quad || 0)}</div>
                          {prevRow && <PriceDiff prev={prevRow.price_quad || 0} curr={row.price_quad || 0} />}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{formatCurrency(row.price_triple || 0)}</div>
                          {prevRow && <PriceDiff prev={prevRow.price_triple || 0} curr={row.price_triple || 0} />}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{formatCurrency(row.price_double || 0)}</div>
                          {prevRow && <PriceDiff prev={prevRow.price_double || 0} curr={row.price_double || 0} />}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{formatCurrency(row.price_single || 0)}</div>
                          {prevRow && <PriceDiff prev={prevRow.price_single || 0} curr={row.price_single || 0} />}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {row.keterangan || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {row.changed_by || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Entry Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Catatan Harga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Tanggal Perubahan</label>
              <Input
                type="date"
                value={form.changed_at}
                onChange={(e) => setForm((f) => ({ ...f, changed_at: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["price_quad", "price_triple", "price_double", "price_single"] as const).map((key) => (
                <div key={key}>
                  <label className="text-sm font-medium">{ROOM_LABELS[key]}</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Keterangan</label>
              <Textarea
                placeholder="Contoh: Penyesuaian harga musim haji, promosi early bird, dll."
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Diubah oleh</label>
              <Input
                placeholder="Nama atau email admin"
                value={form.changed_by}
                onChange={(e) => setForm((f) => ({ ...f, changed_by: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SQL Setup Dialog */}
      <Dialog open={isSqlOpen} onOpenChange={setIsSqlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Setup Tabel Riwayat Harga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Jalankan SQL berikut di <strong>Supabase Dashboard → SQL Editor</strong>:
            </p>
            <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono border">
              {SQL_SETUP}
            </pre>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(SQL_SETUP);
                toast.success("SQL disalin ke clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Salin SQL
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSqlOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
