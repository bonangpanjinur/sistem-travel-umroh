import { useState } from "react";
import { useStockMovements } from "@/hooks/useProcurement";
import { useStoreProducts } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  purchase_in:  { label: "Penerimaan PO", color: "bg-green-100 text-green-700" },
  sale_out:     { label: "Penjualan",     color: "bg-blue-100 text-blue-700" },
  adjustment:   { label: "Penyesuaian",   color: "bg-yellow-100 text-yellow-700" },
  return_in:    { label: "Retur Masuk",   color: "bg-emerald-100 text-emerald-700" },
  transfer_out: { label: "Transfer Keluar", color: "bg-orange-100 text-orange-700" },
};

export default function AdminStoreStockMovements() {
  const [productId, setProductId] = useState<string>("");
  const { data: rows = [], isLoading } = useStockMovements(productId || undefined);
  const { data: products = [] } = useStoreProducts();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowDownUp className="h-6 w-6" /> Mutasi Stok</h1>
        <p className="text-sm text-muted-foreground">Riwayat seluruh pergerakan stok produk toko.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="max-w-sm">
            <Select value={productId || "all"} onValueChange={(v) => setProductId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Semua produk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua produk</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Mutasi ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tanggal</TableHead><TableHead>Produk</TableHead><TableHead>Jenis</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Harga Pokok</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada mutasi.</TableCell></TableRow>
              ) : rows.map((m) => {
                const t = TYPE_LABEL[m.type] ?? { label: m.type, color: "bg-gray-100" };
                const positive = m.qty > 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{format(new Date(m.created_at), "dd MMM yy HH:mm")}</TableCell>
                    <TableCell>{m.product?.name ?? "—"}</TableCell>
                    <TableCell><Badge className={t.color} variant="secondary">{t.label}</Badge></TableCell>
                    <TableCell className={`text-right font-semibold flex items-center justify-end gap-1 ${positive ? "text-green-600" : "text-red-600"}`}>
                      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(m.qty)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{m.unit_cost ? formatCurrency(m.unit_cost) : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.notes ?? "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
