import { useState } from "react";
import {
  usePurchaseOrders, useCreatePurchaseOrder, useReceivePurchaseOrder, useUpdatePOStatus,
  useSuppliers, type PurchaseOrder,
} from "@/hooks/useProcurement";
import { useStoreProducts } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Package, FileText, ChevronDown, ChevronUp, CheckCircle2, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "Draft",      color: "bg-gray-100 text-gray-700" },
  ordered:   { label: "Dipesan",    color: "bg-blue-100 text-blue-700" },
  partial:   { label: "Sebagian",   color: "bg-yellow-100 text-yellow-700" },
  received:  { label: "Diterima",   color: "bg-green-100 text-green-700" },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-700" },
};

type DraftItem = { product_id: string; qty_ordered: number; unit_cost: number };

export default function AdminPurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: pos = [], isLoading } = usePurchaseOrders(statusFilter);
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useStoreProducts();
  const createPO = useCreatePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();
  const updateStatus = useUpdatePOStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{
    supplier_id: string | null; order_date: string; expected_date: string; notes: string;
    tax: number; shipping_cost: number; items: DraftItem[];
  }>({
    supplier_id: null,
    order_date: format(new Date(), "yyyy-MM-dd"),
    expected_date: "",
    notes: "",
    tax: 0,
    shipping_cost: 0,
    items: [],
  });

  const [receiveOpen, setReceiveOpen] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const draftSubtotal = draft.items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);
  const draftTotal = draftSubtotal + draft.tax + draft.shipping_cost;

  const submitCreate = async () => {
    if (!draft.items.length) return;
    await createPO.mutateAsync({
      ...draft,
      expected_date: draft.expected_date || null,
      items: draft.items.filter((i) => i.product_id && i.qty_ordered > 0),
    });
    setCreateOpen(false);
    setDraft({ ...draft, items: [], notes: "", tax: 0, shipping_cost: 0 });
  };

  const submitReceive = async () => {
    if (!receiveOpen) return;
    const items = Object.entries(receiveQty)
      .filter(([, q]) => q > 0)
      .map(([item_id, qty]) => ({ item_id, qty }));
    if (!items.length) return;
    await receivePO.mutateAsync({ po_id: receiveOpen.id, items });
    setReceiveOpen(null);
    setReceiveQty({});
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Kelola pembelian barang dari supplier (procurement / restock).</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Buat PO</Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="ordered">Dipesan</TabsTrigger>
          <TabsTrigger value="partial">Sebagian</TabsTrigger>
          <TabsTrigger value="received">Diterima</TabsTrigger>
          <TabsTrigger value="cancelled">Batal</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Daftar PO ({pos.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : pos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada PO.</TableCell></TableRow>
              ) : pos.map((po) => {
                const s = STATUS_LABEL[po.status] ?? { label: po.status, color: "bg-gray-100" };
                const isOpen = expanded.has(po.id);
                return (
                  <>
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                      <TableCell>{po.supplier?.name || "-"}</TableCell>
                      <TableCell>{format(new Date(po.order_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(po.total)}</TableCell>
                      <TableCell><Badge className={s.color} variant="secondary">{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          const next = new Set(expanded); isOpen ? next.delete(po.id) : next.add(po.id); setExpanded(next);
                        }}>
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        {(po.status === "ordered" || po.status === "partial") && (
                          <Button size="sm" variant="default" className="ml-1" onClick={() => {
                            setReceiveOpen(po);
                            const init: Record<string, number> = {};
                            po.items?.forEach((it) => { init[it.id] = Math.max(0, it.qty_ordered - it.qty_received); });
                            setReceiveQty(init);
                          }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Terima
                          </Button>
                        )}
                        {po.status !== "cancelled" && po.status !== "received" && (
                          <Button size="icon" variant="ghost" className="ml-1" title="Batalkan"
                            onClick={() => { if (confirm(`Batalkan PO ${po.po_number}?`)) updateStatus.mutate({ id: po.id, status: "cancelled" }); }}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={po.id + "-d"}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Item</div>
                          <Table>
                            <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty Pesan</TableHead><TableHead className="text-right">Diterima</TableHead><TableHead className="text-right">Harga Satuan</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {po.items?.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell>{it.product?.name ?? it.product_id}</TableCell>
                                  <TableCell className="text-right">{it.qty_ordered}</TableCell>
                                  <TableCell className="text-right">{it.qty_received}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(it.unit_cost)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(it.subtotal)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {po.notes && <p className="mt-2 text-xs text-muted-foreground">Catatan: {po.notes}</p>}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Buat Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Select value={draft.supplier_id ?? ""} onValueChange={(v) => setDraft({ ...draft, supplier_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter((s) => s.is_active).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tanggal Pesan</Label>
                <Input type="date" value={draft.order_date} onChange={(e) => setDraft({ ...draft, order_date: e.target.value })} />
              </div>
              <div>
                <Label>Estimasi Tiba</Label>
                <Input type="date" value={draft.expected_date} onChange={(e) => setDraft({ ...draft, expected_date: e.target.value })} />
              </div>
              <div>
                <Label>Pajak (Rp)</Label>
                <Input type="number" min={0} value={draft.tax} onChange={(e) => setDraft({ ...draft, tax: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Ongkir (Rp)</Label>
                <Input type="number" min={0} value={draft.shipping_cost} onChange={(e) => setDraft({ ...draft, shipping_cost: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1"><Package className="h-4 w-4" /> Item Pembelian</span>
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, items: [...draft.items, { product_id: "", qty_ordered: 1, unit_cost: 0 }] })}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Item
                </Button>
              </div>
              {draft.items.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">Belum ada item.</p>}
              {draft.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    {idx === 0 && <Label>Produk</Label>}
                    <Select value={it.product_id} onValueChange={(v) => {
                      const next = [...draft.items];
                      const prod = products.find((p) => p.id === v);
                      next[idx] = { ...it, product_id: v, unit_cost: it.unit_cost || (prod as any)?.avg_cost || 0 };
                      setDraft({ ...draft, items: next });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label>Qty</Label>}
                    <Input type="number" min={1} value={it.qty_ordered} onChange={(e) => {
                      const next = [...draft.items]; next[idx] = { ...it, qty_ordered: Number(e.target.value) || 0 }; setDraft({ ...draft, items: next });
                    }} />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <Label>Harga Satuan</Label>}
                    <Input type="number" min={0} value={it.unit_cost} onChange={(e) => {
                      const next = [...draft.items]; next[idx] = { ...it, unit_cost: Number(e.target.value) || 0 }; setDraft({ ...draft, items: next });
                    }} />
                  </div>
                  <div className="col-span-1">
                    <Button size="icon" variant="ghost" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(draftSubtotal)}</span></div>
                <div className="flex justify-between"><span>Pajak</span><span>{formatCurrency(draft.tax)}</span></div>
                <div className="flex justify-between"><span>Ongkir</span><span>{formatCurrency(draft.shipping_cost)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{formatCurrency(draftTotal)}</span></div>
              </div>
            </div>

            <div><Label>Catatan</Label><Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button disabled={!draft.items.length || createPO.isPending} onClick={submitCreate}>
              {createPO.isPending ? "Menyimpan…" : "Buat PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!receiveOpen} onOpenChange={(o) => { if (!o) setReceiveOpen(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Penerimaan Barang — {receiveOpen?.po_number}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Pesan</TableHead><TableHead className="text-right">Sudah</TableHead><TableHead className="text-right w-32">Terima</TableHead></TableRow></TableHeader>
              <TableBody>
                {receiveOpen?.items?.map((it) => {
                  const remaining = it.qty_ordered - it.qty_received;
                  return (
                    <TableRow key={it.id}>
                      <TableCell>{it.product?.name ?? it.product_id}</TableCell>
                      <TableCell className="text-right">{it.qty_ordered}</TableCell>
                      <TableCell className="text-right">{it.qty_received}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} max={remaining} value={receiveQty[it.id] ?? 0}
                          onChange={(e) => setReceiveQty({ ...receiveQty, [it.id]: Math.min(remaining, Math.max(0, Number(e.target.value) || 0)) })}
                          className="text-right" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">Stok produk &amp; <em>average cost</em> otomatis terupdate setelah penerimaan tersimpan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(null)}>Batal</Button>
            <Button disabled={receivePO.isPending} onClick={submitReceive}>
              {receivePO.isPending ? "Memproses…" : "Simpan Penerimaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
