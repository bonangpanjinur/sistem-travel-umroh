import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Edit, Trash2, AlertCircle,
  CheckCircle2, Clock, Calendar, DollarSign, RefreshCcw, ExternalLink
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const CONTRACT_STATUS: Record<string, { label: string; variant: any; color: string }> = {
  draft:      { label: "Draft",    variant: "outline",      color: "text-gray-600" },
  active:     { label: "Aktif",    variant: "secondary",    color: "text-green-600" },
  expired:    { label: "Expired",  variant: "destructive",  color: "text-red-600" },
  terminated: { label: "Dihentikan", variant: "destructive", color: "text-red-800" },
};

const SERVICE_TYPES = [
  "Hotel Mekkah", "Hotel Madinah", "Tiket Pesawat", "Visa", "Katering",
  "Transportasi / Bus", "Handling", "Asuransi", "Lainnya",
];

function daysUntilExpiry(endDate: string) {
  return differenceInDays(parseISO(endDate), new Date());
}

function getExpiryBadge(days: number, status: string) {
  if (status !== "active") return null;
  if (days < 0)   return { label: "Expired", color: "bg-red-100 text-red-800 border-red-300" };
  if (days <= 30)  return { label: `${days} hari lagi`, color: "bg-red-100 text-red-800 border-red-300" };
  if (days <= 90)  return { label: `${days} hari lagi`, color: "bg-amber-100 text-amber-800 border-amber-300" };
  return null;
}

const EMPTY_FORM = {
  vendor_id: "", contract_number: "", service_type: "", start_date: "", end_date: "",
  value: "", currency: "IDR", payment_terms: "", auto_renew: false, document_url: "", notes: "", status: "draft",
};

export default function AdminVendorContracts() {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-for-contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, name, vendor_type").order("name");
      return data || [];
    },
  });

  const { data: contracts = [], isLoading, refetch } = useQuery({
    queryKey: ["vendor-contracts", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("vendor_contracts")
        .select("*, vendor:vendors(id, name, vendor_type)")
        .order("end_date");
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        vendor_id:      form.vendor_id,
        contract_number: form.contract_number,
        service_type:   form.service_type,
        start_date:     form.start_date,
        end_date:       form.end_date,
        value:          form.value ? parseFloat(form.value) : null,
        currency:       form.currency,
        payment_terms:  form.payment_terms || null,
        auto_renew:     form.auto_renew,
        document_url:   form.document_url || null,
        notes:          form.notes || null,
        status:         form.status,
      };
      if (editingId) {
        const { error } = await supabase.from("vendor_contracts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendor_contracts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-contracts"] });
      setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM });
      toast.success(editingId ? "Kontrak diperbarui" : "Kontrak baru ditambahkan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-contracts"] });
      setDeleteId(null);
      toast.success("Kontrak dihapus");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const filtered = contracts.filter((c: any) =>
    (!search || c.vendor?.name?.toLowerCase().includes(search.toLowerCase()) || c.contract_number?.includes(search)) &&
    (statusFilter === "all" || c.status === statusFilter)
  );

  const expiringSoon = contracts.filter((c: any) => {
    if (c.status !== "active") return false;
    const days = daysUntilExpiry(c.end_date);
    return days >= 0 && days <= 30;
  }).length;

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      vendor_id: c.vendor_id, contract_number: c.contract_number,
      service_type: c.service_type, start_date: c.start_date, end_date: c.end_date,
      value: c.value?.toString() || "", currency: c.currency || "IDR",
      payment_terms: c.payment_terms || "", auto_renew: c.auto_renew || false,
      document_url: c.document_url || "", notes: c.notes || "", status: c.status,
    });
    setDialogOpen(true);
  };

  const activeContracts  = contracts.filter((c: any) => c.status === "active").length;
  const expiredContracts = contracts.filter((c: any) => c.status === "expired").length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kontrak Vendor</h1>
            <p className="text-muted-foreground text-sm">Kelola kontrak dengan semua mitra vendor beserta masa berlakunya</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Kontrak
        </Button>
      </div>

      {expiringSoon > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{expiringSoon} kontrak</strong> akan berakhir dalam 30 hari ke depan — segera perbarui atau perpanjang!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Kontrak",  value: contracts.length, icon: FileText,    color: "text-slate-600" },
          { label: "Aktif",          value: activeContracts,  icon: CheckCircle2, color: "text-green-600" },
          { label: "Akan Expired",   value: expiringSoon,     icon: Clock,        color: "text-amber-600", alert: expiringSoon > 0 },
          { label: "Expired",        value: expiredContracts, icon: AlertCircle,  color: "text-red-600" },
        ].map(s => (
          <Card key={s.label} className={(s as any).alert ? "border-amber-300 bg-amber-50" : ""}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari vendor / nomor kontrak..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(CONTRACT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>No. Kontrak</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada kontrak. Pastikan tabel vendor_contracts sudah dibuat di Supabase.
                  </TableCell>
                </TableRow>
              ) : filtered.map((c: any) => {
                const days  = daysUntilExpiry(c.end_date);
                const badge = getExpiryBadge(days, c.status);
                return (
                  <TableRow key={c.id} className={c.status === "active" && days <= 30 && days >= 0 ? "bg-amber-50/50" : ""}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.vendor?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.vendor?.vendor_type || ""}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                    <TableCell className="text-sm">{c.service_type}</TableCell>
                    <TableCell className="text-xs">
                      <p>{format(parseISO(c.start_date), "dd MMM yyyy")}</p>
                      <p className="text-muted-foreground">s/d {format(parseISO(c.end_date), "dd MMM yyyy")}</p>
                      {badge && <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{c.value ? formatCurrency(c.value) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={CONTRACT_STATUS[c.status]?.variant || "outline"} className="text-xs">
                        {CONTRACT_STATUS[c.status]?.label || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Kontrak" : "Tambah Kontrak Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vendor *</Label>
              <Select value={form.vendor_id} onValueChange={v => setForm(f => ({ ...f, vendor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih vendor" /></SelectTrigger>
                <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>No. Kontrak *</Label><Input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CONTRACT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Jenis Layanan *</Label>
              <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih layanan" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Tanggal Berakhir *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Nilai Kontrak</Label><Input type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div>
                <Label>Mata Uang</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Syarat Pembayaran</Label><Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="NET 30, 50% DP, dll." /></div>
            <div><Label>URL Dokumen Kontrak</Label><Input value={form.document_url} onChange={e => setForm(f => ({ ...f, document_url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.auto_renew} onCheckedChange={v => setForm(f => ({ ...f, auto_renew: v }))} />
              <Label>Perpanjang Otomatis</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.vendor_id || !form.contract_number || !form.service_type || !form.start_date || !form.end_date}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Kontrak?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
