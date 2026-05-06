import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, FileCheck, Clock, CheckCircle2, XCircle, Send, Search } from "lucide-react";

const VISA_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Menunggu", variant: "outline" },
  documents_collected: { label: "Dokumen Lengkap", variant: "secondary" },
  submitted: { label: "Diajukan", variant: "default" },
  processing: { label: "Diproses", variant: "default" },
  approved: { label: "Disetujui", variant: "secondary" },
  rejected: { label: "Ditolak", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
};

export default function AdminVisaManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ customer_id: "", departure_id: "", visa_type: "umrah", notes: "" });
  const [statusForm, setStatusForm] = useState({ status: "", visa_number: "", visa_expiry: "", rejection_reason: "" });

  const { data: customers } = useQuery({
    queryKey: ["customers-for-visa"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name, passport_number, passport_expiry").order("full_name");
      return data || [];
    },
  });

  const { data: departures } = useQuery({
    queryKey: ["departures-for-visa"],
    queryFn: async () => {
      const { data } = await supabase.from("departures").select("id, departure_date, package:packages(name)").order("departure_date", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: visas, isLoading } = useQuery({
    queryKey: ["visa-applications", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("visa_applications")
        .select("*, customer:customers(full_name, passport_number, passport_expiry), departure:departures(departure_date, package:packages(name))")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const customer = customers?.find(c => c.id === form.customer_id);
      const { error } = await supabase.from("visa_applications").insert({
        customer_id: form.customer_id,
        departure_id: form.departure_id || null,
        visa_type: form.visa_type,
        passport_number: customer?.passport_number || null,
        passport_expiry: customer?.passport_expiry || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-applications"] });
      setDialogOpen(false);
      setForm({ customer_id: "", departure_id: "", visa_type: "umrah", notes: "" });
      toast({ title: "Pengajuan visa berhasil dibuat" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const updates: any = { status: statusForm.status, updated_at: new Date().toISOString() };
      if (statusForm.status === "submitted") updates.submitted_at = new Date().toISOString();
      if (statusForm.status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.visa_number = statusForm.visa_number || null;
        updates.visa_expiry = statusForm.visa_expiry || null;
      }
      if (statusForm.status === "rejected") {
        updates.rejected_at = new Date().toISOString();
        updates.rejection_reason = statusForm.rejection_reason || null;
      }
      const { error } = await supabase.from("visa_applications").update(updates).eq("id", selectedVisa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-applications"] });
      setStatusDialogOpen(false);
      toast({ title: "Status visa diperbarui" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const filteredVisas = visas?.filter((v: any) =>
    !search || v.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.passport_number?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: visas?.length || 0,
    pending: visas?.filter((v: any) => v.status === "pending" || v.status === "documents_collected").length || 0,
    processing: visas?.filter((v: any) => v.status === "submitted" || v.status === "processing").length || 0,
    approved: visas?.filter((v: any) => v.status === "approved").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Visa</h1>
          <p className="text-muted-foreground">Kelola pengajuan dan tracking visa jamaah</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Tambah Pengajuan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Pengajuan Visa Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Jamaah *</Label>
                <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jamaah" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name} {c.passport_number ? `(${c.passport_number})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Keberangkatan</Label>
                <Select value={form.departure_id} onValueChange={v => setForm(f => ({ ...f, departure_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih keberangkatan" /></SelectTrigger>
                  <SelectContent>
                    {departures?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.package?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipe Visa</Label>
                <Select value={form.visa_type} onValueChange={v => setForm(f => ({ ...f, visa_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umrah">Umrah</SelectItem>
                    <SelectItem value="haji">Haji</SelectItem>
                    <SelectItem value="transit">Transit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.customer_id || createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Buat Pengajuan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Pengajuan", value: stats.total, icon: FileCheck, color: "text-primary" },
          { label: "Menunggu", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "Diproses", value: stats.processing, icon: Send, color: "text-blue-500" },
          { label: "Disetujui", value: stats.approved, icon: CheckCircle2, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama/paspor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(VISA_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jamaah</TableHead>
                <TableHead>Paspor</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Keberangkatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>No. Visa</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !filteredVisas?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data visa</TableCell></TableRow>
              ) : filteredVisas.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.customer?.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">{v.passport_number || "-"}</TableCell>
                  <TableCell className="capitalize">{v.visa_type}</TableCell>
                  <TableCell className="text-sm">{v.departure ? `${(v.departure as any)?.package?.name} (${format(new Date(v.departure.departure_date), "dd/MM/yy")})` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={VISA_STATUS[v.status]?.variant || "outline"}>
                      {VISA_STATUS[v.status]?.label || v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{v.visa_number || "-"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedVisa(v);
                      setStatusForm({ status: v.status, visa_number: v.visa_number || "", visa_expiry: v.visa_expiry || "", rejection_reason: v.rejection_reason || "" });
                      setStatusDialogOpen(true);
                    }}>
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status Visa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium">{selectedVisa?.customer?.full_name}</p>
            <div>
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISA_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusForm.status === "approved" && (
              <>
                <div><Label>Nomor Visa</Label><Input value={statusForm.visa_number} onChange={e => setStatusForm(f => ({ ...f, visa_number: e.target.value }))} /></div>
                <div><Label>Masa Berlaku Visa</Label><Input type="date" value={statusForm.visa_expiry} onChange={e => setStatusForm(f => ({ ...f, visa_expiry: e.target.value }))} /></div>
              </>
            )}
            {statusForm.status === "rejected" && (
              <div><Label>Alasan Penolakan</Label><Textarea value={statusForm.rejection_reason} onChange={e => setStatusForm(f => ({ ...f, rejection_reason: e.target.value }))} /></div>
            )}
            <Button className="w-full" onClick={() => updateStatusMutation.mutate()} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
