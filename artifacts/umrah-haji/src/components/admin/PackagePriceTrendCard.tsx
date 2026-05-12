import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TrendingUp, AlertCircle, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PackagePriceTrendCardProps {
  packageId: string;
  departures?: any[];
}

const ROOM_COLORS: Record<string, string> = {
  quad: "#16a34a",
  triple: "#2563eb",
  double: "#d97706",
  single: "#dc2626",
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

export function PackagePriceTrendCard({ packageId, departures }: PackagePriceTrendCardProps) {
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const db = supabase as any;

  const { data: history, isLoading, error } = useQuery({
    queryKey: ["package-price-history", packageId],
    queryFn: async () => {
      const { data, error } = await db
        .from("departure_price_history")
        .select("*")
        .eq("package_id", packageId)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    retry: false,
    enabled: !!packageId,
  });

  const tableNotExist =
    error &&
    (String((error as any).message).includes("does not exist") ||
      String((error as any).code) === "42P01");

  // Build chart data: group by date, take lowest price per room type per date
  const chartData = (history || []).map((row: any) => ({
    label: format(parseISO(row.changed_at), "dd MMM yy", { locale: idLocale }),
    quad: row.price_quad,
    triple: row.price_triple,
    double: row.price_double,
    single: row.price_single,
  }));

  // Compute current min/max across all linked departures
  const allPrices = departures?.flatMap((d: any) => [
    d.price_quad, d.price_triple, d.price_double, d.price_single
  ]).filter((p: number) => p && p > 0) || [];
  const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
  const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : null;

  if (isLoading) return null;
  if (tableNotExist) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tren Harga Paket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 text-sm">Tabel belum dibuat</p>
                <p className="text-xs text-amber-700 mt-1">
                  Fitur riwayat harga memerlukan tabel{" "}
                  <code className="bg-amber-100 px-1 rounded">departure_price_history</code> di Supabase.
                  Buka salah satu halaman detail keberangkatan → tab "Riwayat Harga" untuk panduan setup.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setIsSqlOpen(true)}
            >
              Lihat SQL
            </Button>
          </div>
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
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tren Harga Paket
          <Badge variant="secondary">{history.length} catatan</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price range summary */}
        {lowestPrice && highestPrice && (
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Harga terendah saat ini: </span>
              <span className="font-semibold text-green-700">{formatCurrency(lowestPrice)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Harga tertinggi: </span>
              <span className="font-semibold text-slate-700">{formatCurrency(highestPrice)}</span>
            </div>
          </div>
        )}

        {/* Chart */}
        {history.length >= 2 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={formatMillions} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="quad" name="Quad" stroke={ROOM_COLORS.quad} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="triple" name="Triple" stroke={ROOM_COLORS.triple} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="double" name="Double" stroke={ROOM_COLORS.double} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="single" name="Single" stroke={ROOM_COLORS.single} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {history.length === 1 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Baru 1 catatan harga. Chart akan muncul setelah ada 2+ catatan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
