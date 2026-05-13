import { useState } from "react";
import { Link } from "react-router-dom";
import { useLowStockProducts, useUpdateMinStock } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, PackagePlus, ClipboardCheck, Save, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AdminStoreLowStock() {
  const { data = [], isLoading } = useLowStockProducts();
  const updateMin = useUpdateMinStock();
  const [edits, setEdits] = useState<Record<string, string>>({});

  const outOfStock = data.filter((p) => (p.current_stock ?? 0) <= 0).length;
  const lowStock = data.length - outOfStock;
  const totalValue = data.reduce(
    (s, p) => s + (p.current_stock ?? 0) * (Number(p.avg_cost) || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/store"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            Peringatan Stok Menipis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Produk dengan stok ≤ batas minimum. Atur ulang batas atau buat PO baru.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/store/stock-opname"><ClipboardCheck className="h-4 w-4 mr-1" />Opname</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/store/purchase-orders"><PackagePlus className="h-4 w-4 mr-1" />Buat PO</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="Stok Habis" value={outOfStock} tone="negative" />
        <Stat label="Stok Menipis" value={lowStock} tone="warning" />
        <Stat label="Nilai Stok Tersisa" value={formatCurrency(totalValue)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Memuat...</div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              🎉 Semua stok aman. Tidak ada produk di bawah batas minimum.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Produk</th>
                    <th className="text-right px-4 py-2">Stok</th>
                    <th className="text-right px-4 py-2">Min</th>
                    <th className="text-right px-4 py-2">Avg Cost</th>
                    <th className="text-left px-4 py-2 w-44">Status</th>
                    <th className="text-right px-4 py-2 w-44">Set Min Baru</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((p) => {
                    const stok = p.current_stock ?? 0;
                    const habis = stok <= 0;
                    return (
                      <tr key={p.id} className={habis ? "bg-red-50/40" : "bg-amber-50/30"}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{p.name}</div>
                          {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{stok}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.min_stock ?? 0}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(Number(p.avg_cost) || 0)}</td>
                        <td className="px-4 py-2">
                          {habis ? (
                            <Badge variant="destructive">Habis</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Menipis</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={edits[p.id] ?? ""}
                              onChange={(e) => setEdits((m) => ({ ...m, [p.id]: e.target.value }))}
                              placeholder={String(p.min_stock ?? 0)}
                              className="h-8 w-20 text-right"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                updateMin.isPending ||
                                edits[p.id] === undefined ||
                                edits[p.id] === "" ||
                                Number(edits[p.id]) === (p.min_stock ?? 0)
                              }
                              onClick={() =>
                                updateMin.mutate(
                                  { id: p.id, min_stock: Number(edits[p.id]) },
                                  { onSuccess: () => setEdits((m) => { const n = { ...m }; delete n[p.id]; return n; }) },
                                )
                              }
                            >
                              {updateMin.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "negative" | "warning" }) {
  const cls =
    tone === "negative" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}