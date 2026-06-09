import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus, Search, Edit, Trash2, BookOpen, ChevronRight,
  ChevronDown, RefreshCw, FileText, Layers
} from "lucide-react";

const CATEGORY_KEY_OPTIONS = [
  { value: "airline", label: "Penerbangan" },
  { value: "hotel", label: "Hotel & Akomodasi" },
  { value: "land_transport", label: "Transportasi Darat" },
  { value: "visa", label: "Visa & Dokumen" },
  { value: "insurance", label: "Asuransi" },
  { value: "handling", label: "Handling & Porter" },
  { value: "muthawif", label: "Muthawif / Guide" },
  { value: "equipment", label: "Perlengkapan Jamaah" },
  { value: "manasik", label: "Manasik & Edukasi" },
  { value: "marketing", label: "Marketing & Promosi" },
  { value: "pic_fee", label: "Komisi PIC / Agen" },
  { value: "overhead", label: "Overhead Kantor" },
  { value: "salary", label: "Gaji & Upah" },
  { value: "operational", label: "Operasional Umum" },
  { value: "other", label: "Lain-lain" },
];

interface CoacCategory {
  id: string;
  code: string;
  name: string;
  parent_code: string | null;
  category_key: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  code: "",
  name: "",
  parent_code: "",
  category_key: "",
  description: "",
  is_active: true,
  sort_order: 0,
};

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function AdminCOA() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("super_admin") || hasRole("owner") || hasRole("finance");

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CoacCategory | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: accounts = [], isLoading, refetch } = useQuery<CoacCategory[]>({
    queryKey: ["coa-accounts"],
    queryFn: async () => {
      const res = await apiFetch("/api/coa");
      return res.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof emptyForm) => apiFetch("/api/coa", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Akun COA berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["coa-accounts"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof emptyForm }) =>
      apiFetch(`/api/coa/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Akun COA berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["coa-accounts"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/coa/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Akun COA dinonaktifkan");
      queryClient.invalidateQueries({ queryKey: ["coa-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: CoacCategory) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      parent_code: item.parent_code ?? "",
      category_key: item.category_key ?? "",
      description: item.description ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const body = {
      ...form,
      parent_code: form.parent_code || undefined,
      category_key: form.category_key || undefined,
      description: form.description || undefined,
      sort_order: Number(form.sort_order),
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch =
        !search ||
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.category_key ?? "").toLowerCase().includes(search.toLowerCase());
      const matchActive =
        filterActive === "all" ||
        (filterActive === "active" && a.is_active) ||
        (filterActive === "inactive" && !a.is_active);
      return matchSearch && matchActive;
    });
  }, [accounts, search, filterActive]);

  const roots = filtered.filter(a => !a.parent_code);
  const childrenOf = (code: string) => filtered.filter(a => a.parent_code === code);

  const totalActive = accounts.filter(a => a.is_active).length;
  const totalInactive = accounts.filter(a => !a.is_active).length;

  const renderRow = (item: CoacCategory, depth = 0) => {
    const children = childrenOf(item.code);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCodes.has(item.code);
    const catLabel = CATEGORY_KEY_OPTIONS.find(o => o.value === item.category_key)?.label;

    return [
      <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
        <TableCell>
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleExpand(item.code)} className="text-muted-foreground hover:text-foreground">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-mono text-sm font-semibold">{item.code}</span>
          </div>
        </TableCell>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{catLabel ?? item.category_key ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{item.description ?? "—"}</TableCell>
        <TableCell>
          <Badge variant={item.is_active ? "default" : "secondary"}>
            {item.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {canEdit && (
            <div className="flex items-center justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Nonaktifkan akun ${item.code} — ${item.name}?`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>,
      ...(isExpanded ? children.flatMap(child => renderRow(child, depth + 1)) : []),
    ];
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Chart of Accounts (COA)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola struktur akun untuk kategorisasi biaya HPP keberangkatan
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Akun
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Akun", value: accounts.length, icon: Layers, color: "blue" },
          { label: "Akun Aktif", value: totalActive, icon: BookOpen, color: "green" },
          { label: "Nonaktif", value: totalInactive, icon: FileText, color: "red" },
          { label: "Akun Root", value: accounts.filter(a => !a.parent_code).length, icon: ChevronRight, color: "purple" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode, nama, atau kategori..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada akun ditemukan</p>
              {search && <p className="text-sm mt-1">Coba kata kunci lain</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Kode Akun</TableHead>
                    <TableHead>Nama Akun</TableHead>
                    <TableHead className="w-44">Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roots.flatMap(root => renderRow(root, 0))}
                  {filtered.filter(a => a.parent_code && !accounts.find(p => p.code === a.parent_code)).flatMap(orphan => renderRow(orphan, 0))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Akun COA" : "Tambah Akun COA Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode Akun *</Label>
                <Input
                  placeholder="mis. 5100"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Akun *</Label>
              <Input
                placeholder="mis. Tiket Penerbangan"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Akun Induk (Parent)</Label>
              <Select value={form.parent_code || "__none__"} onValueChange={v => setForm(f => ({ ...f, parent_code: v === "__none__" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="— Tidak ada (akun root) —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak ada (akun root) —</SelectItem>
                  {accounts
                    .filter(a => a.id !== editingItem?.id && a.is_active)
                    .map(a => (
                      <SelectItem key={a.id} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kategori Biaya</Label>
              <Select value={form.category_key || "__none__"} onValueChange={v => setForm(f => ({ ...f, category_key: v === "__none__" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="— Pilih kategori —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak dikategorikan —</SelectItem>
                  {CATEGORY_KEY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Textarea
                placeholder="Deskripsi akun ini..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
              <Label>Akun Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.code || !form.name}>
              {isSaving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
