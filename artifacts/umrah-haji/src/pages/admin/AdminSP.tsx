import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  FileWarning, Plus, Edit, Trash2, Search, AlertTriangle,
  CheckCircle2, Clock, User, Calendar, ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const supabaseAny = supabase as any;

const LETTER_TYPES = [
  { value: "SP1",      label: "SP-1 (Pertama)",  color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "SP2",      label: "SP-2 (Kedua)",    color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "SP3",      label: "SP-3 (Ketiga)",   color: "bg-red-100 text-red-800 border-red-300" },
  { value: "SKORSING", label: "Skorsing",         color: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "PHK",      label: "PHK",              color: "bg-gray-100 text-gray-800 border-gray-300" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:  { label: "Aktif",     variant: "destructive" },
  expired: { label: "Kadaluarsa", variant: "secondary" },
  revoked: { label: "Dicabut",    variant: "outline" },
};

const EMPTY_FORM = {
  employee_id: "",
  letter_type: "SP1",
  letter_number: "",
  issued_date: format(new Date(), "yyyy-MM-dd"),
  violation: "",
  description: "",
  consequence: "",
  expires_at: "",
  status: "active",
};

export default function AdminSP() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("employees")
        .select("id, full_name, employee_code, position")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ["disciplinary-letters"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("disciplinary_letters")
        .select("*, employee:employees(id, full_name, employee_code, position)")
        .order("issued_date", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: form.employee_id,
        letter_type: form.letter_type,
        letter_number: form.letter_number,
        issued_date: form.issued_date,
        violation: form.violation,
        description: form.description || null,
        consequence: form.consequence || null,
        expires_at: form.expires_at || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabaseAny.from("disciplinary_letters").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.from("disciplinary_letters").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinary-letters"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      toast.success(editingId ? "Surat peringatan diperbarui" : "Surat peringatan berhasil dibuat");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from("disciplinary_letters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinary-letters"] });
      toast.success("Surat peringatan dihapus");
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (letter: any) => {
    setEditingId(letter.id);
    setForm({
      employee_id: letter.employee_id,
      letter_type: letter.letter_type,
      letter_number: letter.letter_number,
      issued_date: letter.issued_date,
      violation: letter.violation,
      description: letter.description || "",
      consequence: letter.consequence || "",
      expires_at: letter.expires_at || "",
      status: letter.status,
    });
    setDialogOpen(true);
  };

  const generateLetterNumber = () => {
    const now = new Date();
    const num = `SP/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Math.floor(Math.random() * 9000) + 1000}`;
    setForm(f => ({ ...f, letter_number: num }));
  };

  const filtered = letters.filter((l: any) => {
    const matchSearch =
      !search ||
      l.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.letter_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.violation?.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType === "all" || l.letter_type === filterType;
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: letters.length,
    active: letters.filter((l: any) => l.status === "active").length,
    sp3: letters.filter((l: any) => l.letter_type === "SP3" && l.status === "active").length,
    today: letters.filter((l: any) => l.issued_date === format(new Date(), "yyyy-MM-dd")).length,
  };

  const getLTColor = (type: string) => LETTER_TYPES.find(t => t.value === type)?.color ?? "";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-xl">
            <FileWarning className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Surat Peringatan (SP)</h1>
            <p className="text-muted-foreground text-sm">Manajemen surat peringatan dan tindakan disiplin karyawan</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Buat SP Baru
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SP",    value: stats.total,  icon: FileWarning,   color: "text-slate-600" },
          { label: "SP Aktif",    value: stats.active, icon: AlertTriangle, color: "text-red-600" },
          { label: "SP-3 Aktif", value: stats.sp3,    icon: ShieldAlert,   color: "text-red-700" },
          { label: "Hari Ini",   value: stats.today,  icon: Calendar,      color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Surat Peringatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama, nomor surat, atau pelanggaran..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Jenis SP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {LETTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="expired">Kadaluarsa</SelectItem>
                <SelectItem value="revoked">Dicabut</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>No. Surat</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Berlaku s/d</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                  </TableRow>
                ) : !filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <FileWarning className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Belum ada data surat peringatan
                    </TableCell>
                  </TableRow>
                ) : filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{l.employee?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{l.employee?.employee_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getLTColor(l.letter_type)}`}>
                        {l.letter_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.letter_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(l.issued_date), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm line-clamp-2">{l.violation}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[l.status]?.variant ?? "outline"} className="text-xs">
                        {STATUS_MAP[l.status]?.label ?? l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.expires_at ? format(new Date(l.expires_at), "dd MMM yyyy", { locale: localeId }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(l)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => {
                            if (confirm("Hapus surat peringatan ini?")) deleteMutation.mutate(l.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Surat Peringatan" : "Buat Surat Peringatan Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Karyawan *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name} — {e.employee_code} {e.position ? `(${e.position})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jenis SP *</Label>
                <Select value={form.letter_type} onValueChange={v => setForm(f => ({ ...f, letter_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nomor Surat *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.letter_number}
                    onChange={e => setForm(f => ({ ...f, letter_number: e.target.value }))}
                    placeholder="SP/2025/01/0001"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generateLetterNumber} className="shrink-0">
                    Auto
                  </Button>
                </div>
              </div>

              <div>
                <Label>Tanggal Terbit *</Label>
                <Input
                  type="date"
                  value={form.issued_date}
                  onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Berlaku s/d</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Bentuk Pelanggaran *</Label>
              <Input
                value={form.violation}
                onChange={e => setForm(f => ({ ...f, violation: e.target.value }))}
                placeholder="Contoh: Terlambat berulang kali, tidak hadir tanpa izin..."
              />
            </div>

            <div>
              <Label>Uraian / Detail Kejadian</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Jelaskan kronologi kejadian dan bukti yang ada..."
              />
            </div>

            <div>
              <Label>Konsekuensi / Sanksi</Label>
              <Textarea
                value={form.consequence}
                onChange={e => setForm(f => ({ ...f, consequence: e.target.value }))}
                rows={2}
                placeholder="Contoh: Pengurangan tunjangan, skorsing 3 hari..."
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="expired">Kadaluarsa</SelectItem>
                  <SelectItem value="revoked">Dicabut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.employee_id || !form.letter_number || !form.violation}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
