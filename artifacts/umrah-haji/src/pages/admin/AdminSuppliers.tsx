import { useState } from "react";
import { useSuppliers, useSupplierMutations, type Supplier } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Phone, Mail, Truck } from "lucide-react";

export default function AdminSuppliers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { upsert, remove } = useSupplierMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);

  const openNew = () => { setEditing({ is_active: true }); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setOpen(true); };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" /> Supplier Toko</h1>
          <p className="text-sm text-muted-foreground">Kelola data supplier untuk pembelian (procurement) produk toko.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Tambah Supplier</Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Daftar Supplier ({suppliers.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Telepon / Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada supplier.</TableCell></TableRow>
              ) : suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                      {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Hapus ${s.name}?`)) remove.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama *</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kontak</Label><Input value={editing?.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></div>
              <div><Label>Telepon</Label><Input value={editing?.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={editing?.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div><Label>Alamat</Label><Textarea value={editing?.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            <div><Label>Catatan</Label><Textarea value={editing?.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={!editing?.name || upsert.isPending} onClick={async () => { await upsert.mutateAsync(editing!); setOpen(false); }}>
              {upsert.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
