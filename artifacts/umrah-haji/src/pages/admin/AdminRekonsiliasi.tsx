import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, subMonths, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  RefreshCw, Plus, CheckCircle2, AlertCircle, XCircle,
  Landmark, Scale, Edit, Trash2
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return {
    label: format(d, "MMMM yyyy", { locale: localeId }),
    value: format(endOfMonth(d), "yyyy-MM-dd"),
    display: format(d, "MMM yyyy", { locale: localeId }),
  };
});

const STATUS_BADGE: Record<string, any> = {
  open: { label: "Open", icon: AlertCircle, cls: "bg-yellow-100 text-yellow-700" },
  reconciled: { label: "Reconciled", icon: CheckCircle2, cls: "bg-green-100 text-green-700" },
};

export default function AdminRekonsiliasi() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [activeRecId, setActiveRecId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    period_date: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    bank_balance: "",
    book_balance: "",
    notes: "",
  });

  const [itemForm, setItemForm] = useState({
    transaction_ref: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    is_reconciled: false,
  });

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["bank-reconciliations"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bank_reconciliations")
        .select("*, items:reconciliation_items(*)")
        .order("period_date", { ascending: false });
      return data || [];
    },
  });

  // Saldo buku dari cash_transactions
  const { data: bookBalance = 0 } = useQuery({
    queryKey: ["book-balance"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cash_transactions").select("amount, type");
      const arr = data || [];
      const inTotal = arr.filter((r: any) => r.type === "in").reduce((s: number, r: any) => s + r.amount, 0);
      const outTotal = arr.filter((r: any) => r.type === "out").reduce((s: number, r: any) => s + r.amount, 0);
      return inTotal - outTotal;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        period_date: form.period_date,
        bank_balance: parseFloat(form.bank_balance) || 0,
        book_balance: parseFloat(form.book_balance) || bookBalance,
        notes: form.notes,
        created_by: user?.id,
      };
      if (editing) {
        const { error } = await (supabase as any).from("bank_reconciliations").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("bank_reconciliations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Rekonsiliasi diperbarui" : "Rekonsiliasi dibuat");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ period_date: format(endOfMonth(new Date()), "yyyy-MM-dd"), bank_balance: "", book_balance: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markReconciledMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bank_reconciliations").update({ status: "reconciled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ditandai reconciled");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bank_reconciliations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rekonsiliasi dihapus");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("reconciliation_items").insert({
        reconciliation_id: activeRecId,
        ...itemForm,
        amount: parseFloat(itemForm.amount) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      setItemDialogOpen(false);
      setItemForm({ transaction_ref: "", transaction_date: format(new Date(), "yyyy-MM-dd"), description: "", amount: "", is_reconciled: false });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await (supabase as any).from("reconciliation_items").update({ is_reconciled: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] }),
  });

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      period_date: r.period_date,
      bank_balance: String(r.bank_balance),
      book_balance: String(r.book_balance),
      notes: r.notes || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6" /> Rekonsiliasi Bank</h1>
          <p className="text-muted-foreground">Sinkronisasi saldo buku vs saldo bank per periode</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setEditing(null); setForm({ period_date: format(endOfMonth(new Date()), "yyyy-MM-dd"), bank_balance: "", book_balance: String(bookBalance), notes: "" }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Buat Rekonsiliasi
          </Button>
        </div>
      </div>

      {/* Book Balance Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-center gap-4">
          <Scale className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-muted-foreground">Saldo Buku Saat Ini (dari transaksi kas)</p>
            <p className="text-2xl font-bold text-blue-700">{fmt(bookBalance)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rekonsiliasi List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : recs.length === 0 ? (
            <div className="p-12 text-center">
              <Landmark className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Belum ada rekonsiliasi</p>
              <p className="text-xs text-muted-foreground mt-1">Pastikan tabel bank_reconciliations sudah dibuat (jalankan migrasi SQL)</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Saldo Bank</TableHead>
                  <TableHead className="text-right">Saldo Buku</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recs.map((r: any) => {
                  const diff = r.bank_balance - r.book_balance;
                  const isOpen = expandedId === r.id;
                  const Ic = STATUS_BADGE[r.status]?.icon || AlertCircle;
                  const reconciledItems = (r.items || []).filter((it: any) => it.is_reconciled).length;
                  return [
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpandedId(isOpen ? null : r.id)}>
                      <TableCell className="font-medium">
                        {format(new Date(r.period_date), "d MMMM yyyy", { locale: localeId })}
                        {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right">{fmt(r.bank_balance)}</TableCell>
                      <TableCell className="text-right">{fmt(r.book_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${Math.abs(diff) < 1 ? "text-green-600" : "text-red-600"}`}>
                        {Math.abs(diff) < 1 ? "Balance" : fmt(diff)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${STATUS_BADGE[r.status]?.cls}`}>
                          <Ic className="h-3 w-3 mr-1" /> {STATUS_BADGE[r.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{reconciledItems}/{(r.items || []).length} reconciled</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === "open" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => markReconciledMutation.mutate(r.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Selesai
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                    isOpen && (
                      <TableRow key={`${r.id}-items`} className="bg-muted/20">
                        <TableCell colSpan={7} className="py-3 px-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">Item Rekonsiliasi</p>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setActiveRecId(r.id); setItemDialogOpen(true); }}>
                                <Plus className="h-3 w-3 mr-1" /> Tambah Item
                              </Button>
                            </div>
                            {(r.items || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Belum ada item</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Ref</TableHead>
                                    <TableHead className="text-xs">Tanggal</TableHead>
                                    <TableHead className="text-xs">Deskripsi</TableHead>
                                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(r.items || []).map((it: any) => (
                                    <TableRow key={it.id}>
                                      <TableCell className="text-xs font-mono">{it.transaction_ref || "-"}</TableCell>
                                      <TableCell className="text-xs">{it.transaction_date ? format(new Date(it.transaction_date), "d MMM yyyy", { locale: localeId }) : "-"}</TableCell>
                                      <TableCell className="text-xs">{it.description}</TableCell>
                                      <TableCell className="text-xs text-right">{fmt(it.amount)}</TableCell>
                                      <TableCell>
                                        <button
                                          className={`text-xs px-2 py-0.5 rounded-full border ${it.is_reconciled ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-600 border-gray-300"}`}
                                          onClick={() => toggleItemMutation.mutate({ id: it.id, val: !it.is_reconciled })}
                                        >
                                          {it.is_reconciled ? "✓ Cocok" : "Belum"}
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ];
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Rekonsiliasi */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rekonsiliasi" : "Buat Rekonsiliasi Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tanggal Rekonsiliasi (Akhir Bulan)</Label>
              <Select value={form.period_date} onValueChange={v => setForm(f => ({ ...f, period_date: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Saldo Bank (dari rekening koran)</Label>
              <Input type="number" value={form.bank_balance} onChange={e => setForm(f => ({ ...f, bank_balance: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Saldo Buku (otomatis dari kas)</Label>
              <Input type="number" value={form.book_balance || String(bookBalance)} onChange={e => setForm(f => ({ ...f, book_balance: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-0.5">Saldo kas buku saat ini: {fmt(bookBalance)}</p>
            </div>
            {form.bank_balance && (
              <div className={`p-3 rounded-lg ${Math.abs((parseFloat(form.bank_balance) || 0) - (parseFloat(form.book_balance) || bookBalance)) < 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                <p className="text-sm font-semibold">
                  Selisih: {fmt(Math.abs((parseFloat(form.bank_balance) || 0) - (parseFloat(form.book_balance) || bookBalance)))}
                  {Math.abs((parseFloat(form.bank_balance) || 0) - (parseFloat(form.book_balance) || bookBalance)) < 1 ? " — Balance!" : ""}
                </p>
              </div>
            )}
            <div>
              <Label>Catatan</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.bank_balance || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Item */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Item Rekonsiliasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nomor Referensi</Label>
                <Input value={itemForm.transaction_ref} onChange={e => setItemForm(f => ({ ...f, transaction_ref: e.target.value }))} placeholder="TRX-001" />
              </div>
              <div>
                <Label>Tanggal Transaksi</Label>
                <Input type="date" value={itemForm.transaction_date} onChange={e => setItemForm(f => ({ ...f, transaction_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Jumlah (Rp)</Label>
              <Input type="number" value={itemForm.amount} onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Batal</Button>
            <Button onClick={() => addItemMutation.mutate()} disabled={!itemForm.description || !itemForm.amount || addItemMutation.isPending}>
              {addItemMutation.isPending ? "Menambah…" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
