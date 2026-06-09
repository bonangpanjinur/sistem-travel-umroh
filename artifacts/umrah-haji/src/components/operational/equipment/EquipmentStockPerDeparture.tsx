/**
 * EquipmentStockPerDeparture — B10: Laporan Stok Per Keberangkatan
 *
 * Shows item-level stock summary for a specific departure:
 * distributed, confirmed, returned, and remaining.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Package, CheckCircle2, RotateCcw, Archive, TrendingDown, ListChecks } from "lucide-react";

interface Props {
  departureId: string;
  departureName?: string;
}

interface StockRow {
  equipment_id: string;
  name: string;
  category: string;
  global_stock: number;
  queued: number;
  distributed: number;
  confirmed: number;
  returned: number;
  remaining_in_stock: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  general:     "Umum",
  male_only:   "Laki-laki",
  female_only: "Perempuan",
  child_only:  "Anak",
};

function fmt(n: number) {
  return n.toLocaleString("id-ID");
}

export function EquipmentStockPerDeparture({ departureId, departureName }: Props) {
  const { data: rows = [], isLoading } = useQuery<StockRow[]>({
    queryKey: ["equipment-stock-per-departure", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      // Get all equipment items with their current global stock
      const { data: items, error: itemErr } = await supabase
        .from("equipment_items")
        .select("id, name, category, stock_quantity")
        .order("name");
      if (itemErr) throw itemErr;

      // Get distributions for this departure (all statuses)
      const { data: dists, error: distErr } = await supabase
        .from("equipment_distributions")
        .select("equipment_id, status, quantity, confirmed_by_jamaah")
        .eq("departure_id", departureId);
      if (distErr) throw distErr;

      // Build per-item summary
      const result: StockRow[] = (items || []).map((item: any) => {
        const itemDists = (dists || []).filter((d: any) => d.equipment_id === item.id);
        const distributed = itemDists.filter((d: any) => d.status === "distributed").reduce(
          (s: number, d: any) => s + (d.quantity || 1), 0,
        );
        const queued = itemDists.filter((d: any) => d.status === "queued").reduce(
          (s: number, d: any) => s + (d.quantity || 1), 0,
        );
        const confirmed = itemDists.filter((d: any) => d.status === "distributed" && d.confirmed_by_jamaah).reduce(
          (s: number, d: any) => s + (d.quantity || 1), 0,
        );
        const returned = itemDists.filter((d: any) => d.status === "returned").reduce(
          (s: number, d: any) => s + (d.quantity || 1), 0,
        );
        return {
          equipment_id: item.id,
          name: item.name,
          category: item.category || "general",
          global_stock: item.stock_quantity || 0,
          distributed,
          queued,
          confirmed,
          returned,
          remaining_in_stock: item.stock_quantity || 0,
        };
      }).filter((r: StockRow) => r.distributed > 0 || r.returned > 0 || r.queued > 0);

      return result;
    },
  });

  const totalDistributed = rows.reduce((s, r) => s + r.distributed, 0);
  const totalQueued      = rows.reduce((s, r) => s + r.queued, 0);
  const totalConfirmed   = rows.reduce((s, r) => s + r.confirmed, 0);
  const totalReturned    = rows.reduce((s, r) => s + r.returned, 0);
  const totalItems       = rows.length;
  const confirmPct       = totalDistributed > 0 ? Math.round((totalConfirmed / totalDistributed) * 100) : 0;

  if (!departureId) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Pilih keberangkatan untuk melihat laporan stok.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-base">Laporan Stok Perlengkapan</h3>
        {departureName && <p className="text-sm text-muted-foreground">{departureName}</p>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Jenis Item</p>
            </div>
          </CardContent>
        </Card>
        {totalQueued > 0 && (
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg"><ListChecks className="h-4 w-4 text-purple-600" /></div>
              <div>
                <p className="text-xl font-bold text-purple-700">{fmt(totalQueued)}</p>
                <p className="text-xs text-muted-foreground">Antrian</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg"><Archive className="h-4 w-4 text-green-600" /></div>
            <div>
              <p className="text-xl font-bold">{fmt(totalDistributed)}</p>
              <p className="text-xs text-muted-foreground">Terdistribusi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
            <div>
              <p className="text-xl font-bold">{fmt(totalConfirmed)}</p>
              <p className="text-xs text-muted-foreground">Dikonfirmasi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg"><RotateCcw className="h-4 w-4 text-orange-600" /></div>
            <div>
              <p className="text-xl font-bold">{fmt(totalReturned)}</p>
              <p className="text-xs text-muted-foreground">Dikembalikan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation progress */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Tingkat Konfirmasi Penerimaan</span>
            <span className="text-muted-foreground">{totalConfirmed}/{totalDistributed} item</span>
          </div>
          <Progress value={confirmPct} className="h-2.5" />
          <p className="text-xs text-muted-foreground text-right">{confirmPct}%</p>
        </CardContent>
      </Card>

      {/* Detail table */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Memuat laporan...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Belum ada perlengkapan yang didistribusikan untuk keberangkatan ini.
        </div>
      ) : (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Detail Per Item
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Antrian</TableHead>
                <TableHead className="text-center">Distribusi</TableHead>
                <TableHead className="text-center">Konfirmasi</TableHead>
                <TableHead className="text-center">Retur</TableHead>
                <TableHead className="text-center">Sisa Global</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => {
                const rowConfirmPct = row.distributed > 0
                  ? Math.round((row.confirmed / row.distributed) * 100) : 0;
                return (
                  <TableRow key={row.equipment_id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABEL[row.category] || row.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.queued > 0 ? (
                        <span className="text-purple-600 font-medium">{fmt(row.queued)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">{fmt(row.distributed)}</TableCell>
                    <TableCell className="text-center">
                      <span className={row.confirmed === row.distributed ? "text-green-600 font-medium" : ""}>
                        {fmt(row.confirmed)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.returned > 0 ? (
                        <span className="text-orange-600">{fmt(row.returned)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={row.global_stock === 0 ? "text-red-600 font-medium" : ""}>
                        {fmt(row.global_stock)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.confirmed === row.distributed && row.distributed > 0 ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Lengkap</Badge>
                      ) : rowConfirmPct > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{rowConfirmPct}%</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Belum</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
