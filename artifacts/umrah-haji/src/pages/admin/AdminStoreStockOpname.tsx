import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreProducts } from "@/hooks/useStore";
import { useStockAdjust } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Search, ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AdminStoreStockOpname() {
  const { data: products = [], isLoading } = useStoreProducts();
  const adjust = useStockAdjust();
  const [q, setQ] = useState("");
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => p.is_active)
      .filter((p) =>
        !s ||
        p.name.toLowerCase().includes(s) ||
        (p.sku ?? "").toLowerCase().includes(s),
      );
  }, [products, q]);

  const lines = Object.entries(physical)
    .map(([product_id, val]) => {
      const n = Number(val);
      if (val === "" || Number.isNaN(n) || n < 0) return null;
      return { product_id, physical_qty: n, notes: notes[product_id] };
    })
    .filter(Boolean) as { product_id: string; physical_qty: number; notes?: string }[];

  const summary = useMemo(() => {
    let plus = 0, minus = 0, value = 0;
    lines.forEach((l) => {
      const p: any = products.find((x) => x.id === l.product_id);
      if (!p) return;
      const sys = p.current_stock ?? 0;
      const diff = l.physical_qty - sys;
      if (diff > 0) plus += diff;
      else if (diff < 0) minus += -diff;
      value += diff * (Number(p.avg_cost) || 0);
    });
    return { plus, minus, value, count: lines.length };
  }, [lines, products]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/store"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Stock Opname
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hitung fisik vs sistem. Selisih dicatat sebagai mutasi <em>adjustment</em>.
          </p>
        </div>
        <Button
          size="lg"
          disabled={summary.count === 0 || adjust.isPending}
          onClick={() => adjust.mutate(lines, { onSuccess: () => { setPhysical({}); setNotes({}); } })}
        >
          {adjust.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan Penyesuaian
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Item Diperiksa" value={summary.count} />
        <StatCard label="Stok Bertambah" value={`+${summary.plus}`} tone="positive" />
        <StatCard label="Stok Berkurang" value={`-${summary.minus}`} tone="negative" />
        <StatCard
          label="Nilai Selisih"
          value={formatCurrency(summary.value)}
          tone={summary.value >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Daftar Produk</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama / SKU..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Tidak ada produk</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Produk</th>
                    <th className="text-right px-4 py-2">Stok Sistem</th>
                    <th className="text-right px-4 py-2 w-32">Stok Fisik</th>
                    <th className="text-right px-4 py-2">Selisih</th>
                    <th className="text-left px-4 py-2 w-56">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p: any) => {
                    const sys = p.current_stock ?? 0;
                    const phyStr = physical[p.id] ?? "";
                    const phy = phyStr === "" ? null : Number(phyStr);
                    const diff = phy === null || Number.isNaN(phy) ? null : phy - sys;
                    return (
                      <tr key={p.id} className={diff !== null && diff !== 0 ? "bg-amber-50/50" : ""}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{p.name}</div>
                          {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{sys}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={phyStr}
                            onChange={(e) => setPhysical((m) => ({ ...m, [p.id]: e.target.value }))}
                            className="h-8 text-right"
                            placeholder={String(sys)}
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {diff === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : diff === 0 ? (
                            <Badge variant="secondary">Cocok</Badge>
                          ) : diff > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">+{diff}</Badge>
                          ) : (
                            <Badge variant="destructive">{diff}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={notes[p.id] ?? ""}
                            onChange={(e) => setNotes((m) => ({ ...m, [p.id]: e.target.value }))}
                            placeholder="Opsional"
                            className="h-8"
                          />
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

      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        Selisih akan menyesuaikan <code>current_stock</code> melalui mutasi adjustment dan tidak mengubah avg_cost.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: { label: string; value: string | number; tone?: "positive" | "negative" }) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}