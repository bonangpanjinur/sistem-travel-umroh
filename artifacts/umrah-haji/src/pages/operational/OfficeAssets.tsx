import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  category: string;
  size_or_color: string | null;
  quantity: number;
  condition: string;
  location: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  notes: string | null;
  photo_url: string | null;
}

const EMPTY = { name: "", category: "lainnya", size_or_color: "", quantity: 1, condition: "good", location: "", purchase_date: "", purchase_price: 0, notes: "" };

export default function OfficeAssets() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({ category: "all", condition: "all" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["office-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("office_assets" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Asset[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        category: form.category,
        size_or_color: form.size_or_color || null,
        quantity: form.quantity,
        condition: form.condition,
        location: form.location || null,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price || 0,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("office_assets" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("office_assets" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Aset diperbarui" : "Aset ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["office-assets"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_assets" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aset dihapus");
      queryClient.invalidateQueries({ queryKey: ["office-assets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = (assets || []).filter((a) =>
    (filter.category === "all" || a.category === filter.category) &&
    (filter.condition === "all" || a.condition === filter.condition)
  );

  const totalValue = filtered.reduce((sum, a) => sum + (a.purchase_price || 0) * a.quantity, 0);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      name: a.name, category: a.category, size_or_color: a.size_or_color || "",
      quantity: a.quantity, condition: a.condition, location: a.location || "",
      purchase_date: a.purchase_date || "", purchase_price: a.purchase_price || 0,
      notes: a.notes || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Aset Kantor</h1>
          <p className="text-sm text-muted-foreground">Inventaris aset operasional kantor</p>
        </div>
        <Button onClick={openAdd} className="gap-1"><Plus className="h-4 w-4" /> Tambah Aset</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Aset</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Unit</p>
          <p className="text-2xl font-bold">{filtered.reduce((s, a) => s + a.quantity, 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Nilai Aset</p>
          <p className="text-2xl font-bold">Rp {totalValue.toLocaleString("id-ID")}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row gap-3 items-end flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Kategori</Label>
            <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="electronics">Elektronik</SelectItem>
                <SelectItem value="furniture">Furnitur</SelectItem>
                <SelectItem value="vehicle">Kendaraan</SelectItem>
                <SelectItem value="office_supply">ATK</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kondisi</Label>
            <Select value={filter.condition} onValueChange={(v) => setFilter({ ...filter, condition: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="good">Bagus</SelectItem>
                <SelectItem value="damaged">Rusak</SelectItem>
                <SelectItem value="under_repair">Diperbaiki</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ukuran/Warna</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                    <TableCell>{a.size_or_color || "-"}</TableCell>
                    <TableCell>{a.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={a.condition === "good" ? "default" : a.condition === "damaged" ? "destructive" : "secondary"}>{a.condition}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.location || "-"}</TableCell>
                    <TableCell>Rp {(a.purchase_price || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Hapus ${a.name}?`)) deleteMutation.mutate(a.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada aset</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Aset" : "Tambah Aset"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Elektronik</SelectItem>
                  <SelectItem value="furniture">Furnitur</SelectItem>
                  <SelectItem value="vehicle">Kendaraan</SelectItem>
                  <SelectItem value="office_supply">ATK</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kondisi</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Bagus</SelectItem>
                  <SelectItem value="damaged">Rusak</SelectItem>
                  <SelectItem value="under_repair">Diperbaiki</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Ukuran/Warna</Label><Input value={form.size_or_color} onChange={(e) => setForm({ ...form, size_or_color: e.target.value })} /></div>
            <div className="space-y-1"><Label>Jumlah</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} /></div>
            <div className="space-y-1"><Label>Lokasi</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tgl Beli</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Harga Beli (Rp)</Label><Input type="number" min={0} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-1 col-span-2"><Label>Catatan</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => { if (!form.name.trim()) { toast.error("Nama wajib"); return; } saveMutation.mutate(); }} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}