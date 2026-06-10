import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, FileCheck, Clock, CheckCircle2, XCircle, Send, Search, Wifi, WifiOff, History, RefreshCcw, Receipt, Info } from "lucide-react";
import { useVisaStatusUpdate } from "@/hooks/useVisaStatusUpdate";
import { useAuth } from "@/hooks/useAuth";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const VISA_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:              { label: "Menunggu",         variant: "outline" },
  documents_collected:  { label: "Dokumen Lengkap",  variant: "secondary" },
  submitted:            { label: "Diajukan",          variant: "default" },
  processing:           { label: "Diproses",          variant: "default" },
  approved:             { label: "Disetujui",         variant: "secondary" },
  rejected:             { label: "Ditolak",           variant: "destructive" },
  expired:              { label: "Expired",           variant: "destructive" },
};

export default function AdminVisaManagement() {
  const queryClient   = useQueryClient();
  const { user }      = useAuth();
  const [dialogOpen, setDialogOpen]           = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedVisa, setSelectedVisa]       = useState<any>(null);
  const [search, setSearch]                   = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [isLive, setIsLive]                   = useState(false);
  const [liveFlash, setLiveFlash]             = useState(false);
  const [form, setForm]                       = useState({ customer_id: "", departure_id: "", visa_type: "umrah", notes: "" });
  const [statusForm, setStatusForm]           = useState({ status: "", visa_number: "", visa_expiry: "", rejection_reason: "" });

  // Form biaya visa — diisi saat status → submitted, untuk auto-create vendor_cost (AP)
  const [visaCostForm, setVisaCostForm] = useState({
    vendor_id: "",
    amount: "",
    notes: "",
    createAP: true,
  });

  const visaStatusUpdate = useVisaStatusUpdate();

  const { data: customers } = useQuery({
    queryKey: ["customers-for-visa"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name, passport_number, passport_expiry").order("full_name");
      return data || [];
    },
  });

  // Vendors list — untuk pilih vendor saat auto-create AP
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-visa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, name, vendor_type")
        .eq("is_active", true)
        .order("name");
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

  const { data: visas, isLoading, refetch } = useQuery({
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

  const { data: visaHistory = [] } = useQuery({
    queryKey: ["visa-status-logs", selectedVisa?.id],
    queryFn: async () => {
      if (!selectedVisa?.customer?.id) return [];
      const { data, error } = await (supabase as any)
        .from("visa_status_logs")
        .select("*")
        .eq("customer_id", selectedVisa.customer.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data || [];
    },
    enabled: !!selectedVisa?.id && historyDialogOpen,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-visa-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visa_applications" }, () => {
        refetch();
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 2000);
      })
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const customer = customers?.find((c: any) => c.id === form.customer_id);
      const { error } = await supabase.from("visa_applications").insert({
        customer_id:     form.customer_id,
        departure_id:    form.departure_id || null,
        visa_type:       form.visa_type,
        passport_number: customer?.passport_number || null,
        passport_expiry: customer?.passport_expiry || null,
        notes:           form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-applications"] });
      setDialogOpen(false);
      setForm({ customer_id: "", departure_id: "", visa_type: "umrah", notes: "" });
      toast.success("Pengajuan visa berhasil dibuat");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  // Mutation: auto-create vendor_cost (AP) dari biaya visa
  const createVendorCostMutation = useMutation({
    mutationFn: async (payload: {
      departure_id: string;
      vendor_id: string;
      amount: number;
      description: string;
      notes?: string;
    }) => {
      const { error } = await (supabase as any).from("vendor_costs").insert({
        departure_id: payload.departure_id,
        vendor_id:    payload.vendor_id,
        cost_type:    "VISA",
        amount:       payload.amount,
        description:  payload.description,
        notes:        payload.notes || null,
        status:       "pending",
        currency:     "IDR",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ queryKey: ["finance-ap"] });
      toast.success("Biaya visa berhasil dicatat ke Hutang Dagang (AP)");
    },
    onError: (e: any) => {
      toast.error("Status visa diperbarui, tapi gagal catat biaya AP: " + e.message);
    },
  });

  const handleUpdateStatus = async () => {
    if (!selectedVisa) return;

    // Update status visa (+ notifikasi jamaah)
    await visaStatusUpdate.mutateAsync({
      visaId:           selectedVisa.id,
      customerId:       selectedVisa.customer_id,
      newStatus:        statusForm.status,
      oldStatus:        selectedVisa.status,
      visaNumber:       statusForm.visa_number,
      visaExpiry:       statusForm.visa_expiry,
      rejectionReason:  statusForm.rejection_reason,
      changedBy:        user?.id,
    });

    // INT-05: Auto-create vendor_cost saat status → submitted DAN biaya visa diisi
    if (
      statusForm.status === "submitted" &&
      visaCostForm.createAP &&
      visaCostForm.vendor_id &&
      visaCostForm.amount &&
      Number(visaCostForm.amount) > 0
    ) {
      if (!selectedVisa.departure_id) {
        toast.warning("Biaya visa tidak dicatat: visa ini tidak terhubung ke keberangkatan manapun.");
      } else {
        const vendorName = (vendors as any[]).find(v => v.id === visaCostForm.vendor_id)?.name || "Vendor Visa";
        await createVendorCostMutation.mutateAsync({
          departure_id: selectedVisa.departure_id,
          vendor_id:    visaCostForm.vendor_id,
          amount:       Number(visaCostForm.amount),
          description:  `Biaya visa ${selectedVisa.visa_type} — ${selectedVisa.customer?.full_name} via ${vendorName}`,
          notes:        visaCostForm.notes,
        });
      }
    }

    setStatusDialogOpen(false);
    // Reset form biaya visa
    setVisaCostForm({ vendor_id: "", amount: "", notes: "", createAP: true });
  };

  const filteredVisas = visas?.filter((v: any) =>
    !search || v.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.passport_number?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:      visas?.length || 0,
    pending:    visas?.filter((v: any) => v.status === "pending" || v.status === "documents_collected").length || 0,
    processing: visas?.filter((v: any) => v.status === "submitted" || v.status === "processing").length || 0,
    approved:   visas?.filter((v: any) => v.status === "approved").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Visa</h1>
          <p className="text-muted-foreground">Kelola pengajuan dan tracking visa jamaah — notifikasi otomatis ke jamaah</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${isLive ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"} ${liveFlash ? "animate-pulse" : ""}`}>
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isLive ? "Live" : "Reconnecting..."}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-1" />Refresh</Button>
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
                      {customers?.map((c: any) => (
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
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Send className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Setiap perubahan status visa akan <strong>otomatis mengirim notifikasi</strong> ke jamaah terkait dan mencatat riwayat perubahan.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Pengajuan", value: stats.total,      icon: FileCheck,    color: "text-primary" },
          { label: "Menunggu",        value: stats.pending,    icon: Clock,        color: "text-amber-500" },
          { label: "Diproses",        value: stats.processing, icon: Send,         color: "text-blue-500" },
          { label: "Disetujui",       value: stats.approved,   icon: CheckCircle2, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedVisa(v);
                        setStatusForm({ status: v.status, visa_number: v.visa_number || "", visa_expiry: v.visa_expiry || "", rejection_reason: v.rejection_reason || "" });
                        setStatusDialogOpen(true);
                      }}>
                        Update
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedVisa(v); setHistoryDialogOpen(true); }} title="Riwayat">
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={(open) => {
        setStatusDialogOpen(open);
        if (!open) setVisaCostForm({ vendor_id: "", amount: "", notes: "", createAP: true });
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Update Status Visa</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Jamaah info */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">{selectedVisa?.customer?.full_name}</p>
              <p className="text-xs text-muted-foreground">Paspor: {selectedVisa?.passport_number || "-"}</p>
              {selectedVisa?.departure_id ? (
                <p className="text-xs text-green-700 mt-0.5">✓ Terhubung ke keberangkatan</p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">⚠ Tidak terhubung ke keberangkatan — biaya AP tidak bisa dicatat</p>
              )}
            </div>

            <Alert className="border-blue-200 bg-blue-50 py-2">
              <AlertDescription className="text-xs text-blue-800">
                Jamaah akan mendapat notifikasi otomatis saat status diperbarui.
              </AlertDescription>
            </Alert>

            {/* Status selector */}
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

            {/* ── INT-05: Biaya Visa → Hutang Dagang (AP) ── */}
            {statusForm.status === "submitted" && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">Catat Biaya Visa ke Hutang Dagang</p>
                    <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">Opsional</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Isi form di bawah agar biaya visa otomatis masuk ke Akun Payable (AP) dan terkoneksi ke laporan keuangan keberangkatan.
                  </p>

                  {/* Toggle buat AP */}
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setVisaCostForm(f => ({ ...f, createAP: !f.createAP }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none ${visaCostForm.createAP ? "bg-emerald-600" : "bg-gray-200"}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform mt-0.5 ${visaCostForm.createAP ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <Label className="text-sm cursor-pointer" onClick={() => setVisaCostForm(f => ({ ...f, createAP: !f.createAP }))}>
                      Otomatis buat entri Hutang Dagang (AP)
                    </Label>
                  </div>

                  {visaCostForm.createAP && (
                    <div className="space-y-3 pl-1">
                      {/* Vendor / Konsulat */}
                      <div>
                        <Label className="text-xs">Vendor / Konsulat / Agen Visa *</Label>
                        <Select
                          value={visaCostForm.vendor_id}
                          onValueChange={v => setVisaCostForm(f => ({ ...f, vendor_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih vendor…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(vendors as any[]).length === 0 ? (
                              <SelectItem value="__none" disabled>
                                Belum ada vendor — tambah di menu Vendor
                              </SelectItem>
                            ) : (
                              (vendors as any[]).map((v: any) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                  <span className="text-xs text-muted-foreground ml-1">({v.vendor_type})</span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Biaya visa */}
                      <div>
                        <Label className="text-xs">Biaya Visa (IDR) *</Label>
                        <Input
                          type="number"
                          placeholder="Misal: 1500000"
                          value={visaCostForm.amount}
                          onChange={e => setVisaCostForm(f => ({ ...f, amount: e.target.value }))}
                        />
                        {visaCostForm.amount && Number(visaCostForm.amount) > 0 && (
                          <p className="text-xs text-emerald-600 mt-0.5">{fmt(Number(visaCostForm.amount))}</p>
                        )}
                      </div>

                      {/* Catatan */}
                      <div>
                        <Label className="text-xs">Catatan (opsional)</Label>
                        <Input
                          placeholder="Misal: Visa umrah batch Januari 2026"
                          value={visaCostForm.notes}
                          onChange={e => setVisaCostForm(f => ({ ...f, notes: e.target.value }))}
                        />
                      </div>

                      {/* Info jika tidak ada departure_id */}
                      {!selectedVisa?.departure_id && (
                        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>Visa ini tidak terhubung ke keberangkatan — biaya AP tidak akan dibuat. Hubungkan dulu ke keberangkatan.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <Button
              className="w-full"
              onClick={handleUpdateStatus}
              disabled={visaStatusUpdate.isPending || createVendorCostMutation.isPending || !statusForm.status}
            >
              {(visaStatusUpdate.isPending || createVendorCostMutation.isPending)
                ? "Menyimpan..."
                : statusForm.status === "submitted" && visaCostForm.createAP && visaCostForm.vendor_id && visaCostForm.amount
                  ? "Simpan + Catat Biaya AP + Kirim Notif"
                  : "Simpan + Kirim Notifikasi Jamaah"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Riwayat Perubahan Status Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Riwayat Status Visa — {selectedVisa?.customer?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {visaHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat perubahan. Tabel visa_status_logs perlu dibuat di Supabase.</p>
            ) : visaHistory.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{VISA_STATUS[log.old_status]?.label || log.old_status || "—"}</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs">{VISA_STATUS[log.new_status]?.label || log.new_status}</Badge>
                  </div>
                  {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
