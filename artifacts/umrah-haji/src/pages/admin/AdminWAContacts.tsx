import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Users, RefreshCw, Search, Download, Phone, UserCheck,
  Ban, Pencil, Trash2, RotateCcw, MessageSquarePlus
} from "lucide-react";

const API = "/api/v1/whatsapp";

interface WAContact {
  id: string;
  phone: string;
  name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  tags: string[];
  notes: string | null;
  opt_out: boolean;
  last_sent_at: string | null;
  last_reply_at: string | null;
  message_count: number;
  updated_at: string;
}

export default function AdminWAContacts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editContact, setEditContact] = useState<WAContact | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; notes: string; tags: string }>({ name: "", notes: "", tags: "" });

  const { data, isLoading, refetch } = useQuery<{ total: number; contacts: WAContact[] }>({
    queryKey: ["wa-contacts", search, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (search) p.set("search", search);
      return fetch(`${API}/contacts?${p}`).then(r => r.json());
    },
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const pageSize = 50;

  const syncMut = useMutation({
    mutationFn: () =>
      fetch(`${API}/contacts/sync`, { method: "POST" }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal sinkronisasi");
        return d;
      }),
    onSuccess: (d) => {
      toast.success(`Sinkronisasi selesai: ${d.synced} kontak disinkronkan`);
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`${API}/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Kontak diperbarui");
      setEditContact(null);
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/contacts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Kontak dihapus");
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
  });

  function openEdit(c: WAContact) {
    setEditContact(c);
    setEditForm({ name: c.name || "", notes: c.notes || "", tags: (c.tags || []).join(", ") });
  }

  function saveEdit() {
    if (!editContact) return;
    const tags = editForm.tags.split(",").map(t => t.trim()).filter(Boolean);
    patchMut.mutate({ id: editContact.id, data: { name: editForm.name, notes: editForm.notes, tags } });
  }

  const optOutTotal = contacts.filter(c => c.opt_out).length;
  const withCustomer = contacts.filter(c => c.customer_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            Kontak WA Jamaah
          </h1>
          <p className="text-muted-foreground mt-1">Kelola daftar kontak WhatsApp jamaah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <RotateCcw className={`h-4 w-4 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />
            {syncMut.isPending ? "Menyinkronkan..." : "Sinkron dari Data Jamaah"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-600">{total}</div>
            <div className="text-sm text-muted-foreground">Total Kontak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{withCustomer}</div>
            <div className="text-sm text-muted-foreground">Terhubung Jamaah</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{total - optOutTotal}</div>
            <div className="text-sm text-muted-foreground">Aktif (Opt-in)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{optOutTotal}</div>
            <div className="text-sm text-muted-foreground">Opt-Out</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nomor atau nama..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <p className="text-sm text-muted-foreground self-center">
          {total} kontak ditemukan
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Daftar Kontak
          </CardTitle>
          <CardDescription>
            Gunakan "Sinkron dari Data Jamaah" untuk mengimpor otomatis nomor dari data booking
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat kontak...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Belum ada kontak. Klik "Sinkron dari Data Jamaah" untuk mengisi otomatis.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor WA</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status Jamaah</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Pesan</TableHead>
                  <TableHead>Terakhir Aktif</TableHead>
                  <TableHead>Opt-Out</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(c => (
                  <TableRow key={c.id} className={c.opt_out ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        +{c.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name || <span className="text-muted-foreground italic">Tanpa nama</span>}</div>
                      {c.customer_name && c.customer_name !== c.name && (
                        <div className="text-xs text-muted-foreground">{c.customer_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.customer_id ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs">
                          <UserCheck className="h-3 w-3 mr-1" />Jamaah
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">Umum</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).length > 0
                          ? c.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <MessageSquarePlus className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{c.message_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_reply_at
                        ? format(parseISO(c.last_reply_at), "dd MMM HH:mm", { locale: idLocale })
                        : c.last_sent_at
                          ? format(parseISO(c.last_sent_at), "dd MMM HH:mm", { locale: idLocale })
                          : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.opt_out}
                        onCheckedChange={v => patchMut.mutate({ id: c.id, data: { opt_out: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm("Hapus kontak ini?")) deleteMut.mutate(c.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
            Sebelumnya
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            Halaman {page + 1} dari {Math.ceil(total / pageSize)}
          </span>
          <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={v => { if (!v) setEditContact(null); }}>
        {editContact && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Kontak</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nomor WA</Label>
                <Input value={`+${editContact.phone}`} disabled className="font-mono" />
              </div>
              <div>
                <Label>Nama</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama kontak"
                />
              </div>
              <div>
                <Label>Tags (pisahkan dengan koma)</Label>
                <Input
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="cth: vip, leads, jamaah_2025"
                />
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan internal..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditContact(null)}>Batal</Button>
              <Button onClick={saveEdit} disabled={patchMut.isPending} className="bg-teal-600 hover:bg-teal-700">
                {patchMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
