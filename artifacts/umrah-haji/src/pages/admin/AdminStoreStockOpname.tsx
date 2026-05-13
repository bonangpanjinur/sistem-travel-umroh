import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStoreProducts } from "@/hooks/useStore";
import { useSaveOpnameDraft, useSubmitOpname } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Search, ArrowLeft, Save, Send, Loader2, ListChecks } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AdminStoreStockOpname() {
  const nav = useNavigate();
  const { data: products = [], isLoading } = useStoreProducts();
  const saveDraft = useSaveOpnameDraft();
  const submit = useSubmitOpname();

  const [q, setQ] = useState("");
  const [notes, setNotes] = useState("");
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => p.is_active)
      .filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s));
  }, [products, q]);

  const lines = Object.entries(physical)
    .map(([product_id, val]) => {
      const n = Number(val);
      if (val === "" || Number.isNaN(n) || n < 0) return null;
      const p: any = products.find((x) => x.id === product_id);
      if (!p) return null;
      return {
        product_id,
        physical_qty: n,
        system_qty: p.current_stock ?? 0,
        unit_cost: Number(p.avg_cost) || 0,
        line_notes: lineNotes[product_id],
      };
    })
    .filter(Boolean) as any[];

  const summary = useMemo(() => {
    let plus = 0, minus = 0, value = 0, diffCount = 0;
    lines.forEach((l) => {
      const diff = l.physical_qty - l.system_qty;
      if (diff > 0) plus += diff;
      else if (diff < 0) minus += -diff;
      if (diff !== 0) diffCount++;
      value += diff * (l.unit_cost || 0);
    });
    return { plus, minus, value, diffCount, total: lines.length };
  }, [lines]);

  const handleSave = async (alsoSubmit: boolean) => {
    if (!lines.length) return;
    const id = await saveDraft.mutateAsync({ notes, lines });
    if (alsoSubmit) await submit.mutateAsync(id);
    nav(`/admin/store/opname/${id}`);
  };

  const busy = saveDraft.isPending || submit.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/store"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Stock Opname Baru
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hitung stok fisik. Simpan sebagai draft, lalu ajukan untuk persetujuan sebelum diterapkan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/store/opname"><ListChecks className="h-4 w-4 mr-1" />Daftar Sesi</Link>
          </Button>
          <Button variant="outline" disabled={!lines.length || busy} onClick={() => handleSave(false)}>
            {saveDraft.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Draft
          </Button>
          <Button disabled={!lines.length || busy} onClick={() => handleSave(true)}>
            {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Ajukan Persetujuan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Item Diperiksa" value={summary.total} />
        <Stat label="Selisih" value={summary.diffCount} />
        <Stat label="Stok +/-" value={`+${summary.plus} / -${summary.minus}`} />
        <Stat label="Nilai Selisih" value={formatCurrency(summary.value)}
              tone={summary.value >= 0 ? "positive" : "negative"} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catatan Sesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Konteks opname (misal: stock take akhir bulan, gudang utama)..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Daftar Produk</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / SKU..." className="pl-9" />
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
                    <th className="text-right px-4 py-2">Sistem</th>
                    <th className="text-right px-4 py-2 w-32">Fisik</th>
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
                          <Input type="number" min={0} value={phyStr}
                            onChange={(e) => setPhysical((m) => ({ ...m, [p.id]: e.target.value }))}
                            className="h-8 text-right" placeholder={String(sys)} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {diff === null ? <span className="text-muted-foreground">—</span>
                            : diff === 0 ? <Badge variant="secondary">Cocok</Badge>
                            : diff > 0 ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">+{diff}</Badge>
                            : <Badge variant="destructive">{diff}</Badge>}
                        </td>
                        <td className="px-4 py-2">
                          <Input value={lineNotes[p.id] ?? ""}
                            onChange={(e) => setLineNotes((m) => ({ ...m, [p.id]: e.target.value }))}
                            placeholder="Opsional" className="h-8" />
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

      <p className="text-xs text-muted-foreground">
        Penyesuaian baru terjadi setelah sesi <strong>disetujui</strong> oleh admin yang berwenang.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "positive" | "negative" }) {
  const cls = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "";
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
    </CardContent></Card>
  );
}
