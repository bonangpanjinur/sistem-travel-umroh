import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Edit, Trash2, Eye, Hotel,
  CheckCircle2, Clock, XCircle, Ticket, Search
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const STATUS_CFG: Record<string, { label: string; variant: any; icon: any }> = {
  draft:     { label: "Draft",      variant: "secondary",    icon: Clock },
  confirmed: { label: "Confirmed",  variant: "default",      icon: CheckCircle2 },
  active:    { label: "Aktif",      variant: "default",      icon: CheckCircle2 },
  completed: { label: "Selesai",    variant: "outline",      icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", variant: "destructive",  icon: XCircle },
};

const VOUCHER_STATUS: Record<string, { label: string; variant: any }> = {
  active:    { label: "Aktif",      variant: "default" },
  used:      { label: "Terpakai",   variant: "secondary" },
  expired:   { label: "Expired",    variant: "outline" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

const emptyContract = {
  hotel_id: "", departure_id: "", contract_number: "",
  contract_date: "", check_in_date: "", check_out_date: "",
  room_type: "double", total_rooms: 0, price_per_room: 0,
  currency: "IDR", status: "draft", notes: "",
};

export default function AdminHotelContracts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm]           = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [isContractOpen, setIsContractOpen]   = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [formData, setFormData]               = useState({ ...emptyContract });
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isVoucherOpen, setIsVoucherOpen]     = useState(false);
  const [voucherForm, setVoucherForm]         = useState({
    voucher_number: "", issued_date: "", valid_from: "",
    valid_until: "", room_type: "double", rooms_allocated: 1, notes: "",
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hotel-contracts", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("hotel_contracts")
        .select("*, hotel:hotels(name, city), departure:departures(departure_date, package:packages(name))")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return data || [];
    },
  });

  const { data: hotels = [] } = useQuery({
    queryKey: ["hotels-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("id, name, city").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["departures-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .in("status", ["open","almost_full","confirmed"])
        .order("departure_date");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ["hotel-vouchers", selectedContract?.id],
    enabled: !!selectedContract?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_vouchers")
        .select("*")
        .eq("contract_id", selectedContract.id)
        .order("created_at", { ascending: false });
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return data || [];
    },
  });

  const saveContractMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        hotel_id:        formData.hotel_id        || null,
        departure_id:    formData.departure_id    || null,
        contract_number: formData.contract_number || null,
        contract_date:   formData.contract_date   || null,
        check_in_date:   formData.check_in_date   || null,
        check_out_date:  formData.check_out_date  || null,
        room_type:       formData.room_type,
        total_rooms:     Number(formData.total_rooms),
        price_per_room:  Number(formData.price_per_room),
        currency:        formData.currency,
        status:          formData.status,
        notes:           formData.notes || null,
      };
      if (editingContract?.id) {
        const { error } = await supabase.from("hotel_contracts").update(payload).eq("id", editingContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hotel_contracts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingContract ? "Kontrak diperbarui" : "Kontrak berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["hotel-contracts"] });
      setIsContractOpen(false);
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hotel_contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kontrak dihapus");
      queryClient.invalidateQueries({ queryKey: ["hotel-contracts"] });
      if (selectedContract) setSelectedContract(null);
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const saveVoucherMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        contract_id:     selectedContract.id,
        voucher_number:  voucherForm.voucher_number || null,
        issued_date:     voucherForm.issued_date    || null,
        valid_from:      voucherForm.valid_from     || null,
        valid_until:     voucherForm.valid_until    || null,
        room_type:       voucherForm.room_type,
        rooms_allocated: Number(voucherForm.rooms_allocated),
        notes:           voucherForm.notes || null,
      };
      const { error } = await supabase.from("hotel_vouchers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["hotel-vouchers", selectedContract?.id] });
      setIsVoucherOpen(false);
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const updateVoucherStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("hotel_vouchers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status voucher diperbarui");
      queryClient.invalidateQueries({ queryKey: ["hotel-vouchers", selectedContract?.id] });
    },
  });

  const openNew = () => {
    setEditingContract(null);
    setFormData({ ...emptyContract });
    setIsContractOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingContract(c);
    setFormData({
      hotel_id:        c.hotel_id       || "",
      departure_id:    c.departure_id   || "",
      contract_number: c.contract_number|| "",
      contract_date:   c.contract_date  || "",
      check_in_date:   c.check_in_date  || "",
      check_out_date:  c.check_out_date || "",
      room_type:       c.room_type      || "double",
      total_rooms:     c.total_rooms    || 0,
      price_per_room:  c.price_per_room || 0,
      currency:        c.currency       || "IDR",
      status:          c.status         || "draft",
      notes:           c.notes          || "",
    });
    setIsContractOpen(true);
  };

  const filtered = contracts.filter((c: any) => {
    const term = searchTerm.toLowerCase();
    return !term ||
      c.hotel?.name?.toLowerCase().includes(term) ||
      c.contract_number?.toLowerCase().includes(term) ||
      c.departure?.package?.name?.toLowerCase().includes(term);
  });

  const setField = (k: string, v: any) => setFormData(prev => ({ ...prev, [k]: v }));

  const fmtDate = (d: string | null) => d ? format(parseISO(d), "dd MMM yyyy", { locale: localeId }) : "-";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Kontrak & Voucher Hotel
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola kontrak hotel per keberangkatan dan voucher terkait
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Kontrak
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari hotel, nomor kontrak, paket..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-2 space-y-2">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Memuat...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Hotel className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-sm">Belum ada kontrak hotel</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1.5" />Buat Pertama
                </Button>
              </CardContent>
            </Card>
          ) : filtered.map((c: any) => {
            const scfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
            const SIcon = scfg.icon;
            const isSelected = selectedContract?.id === c.id;
            return (
              <Card
                key={c.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedContract(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Hotel className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.hotel?.name || "Hotel tidak diketahui"}</p>
                      <p className="text-xs text-muted-foreground">{c.hotel?.city || ""}</p>
                      {c.departure && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.departure?.package?.name} — {fmtDate(c.departure?.departure_date)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={scfg.variant} className="text-xs">
                          <SIcon className="h-3 w-3 mr-1" />{scfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {c.total_rooms} kamar
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="md:col-span-3">
          {!selectedContract ? (
            <Card className="h-full">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Pilih kontrak di sebelah kiri untuk melihat detail</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{selectedContract.hotel?.name}</span>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selectedContract)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteContractMutation.mutate(selectedContract.id)}
                      disabled={deleteContractMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="detail">
                  <TabsList>
                    <TabsTrigger value="detail">Detail Kontrak</TabsTrigger>
                    <TabsTrigger value="vouchers">
                      Voucher ({vouchers.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="detail" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">No. Kontrak</p>
                        <p className="font-medium">{selectedContract.contract_number || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tanggal Kontrak</p>
                        <p className="font-medium">{fmtDate(selectedContract.contract_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Check-In</p>
                        <p className="font-medium">{fmtDate(selectedContract.check_in_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Check-Out</p>
                        <p className="font-medium">{fmtDate(selectedContract.check_out_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tipe Kamar</p>
                        <p className="font-medium capitalize">{selectedContract.room_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Jumlah Kamar</p>
                        <p className="font-medium">{selectedContract.total_rooms}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Harga/Kamar</p>
                        <p className="font-medium">{formatCurrency(selectedContract.price_per_room || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Nilai Total</p>
                        <p className="font-bold text-emerald-700">{formatCurrency(selectedContract.total_value || 0)}</p>
                      </div>
                    </div>
                    {selectedContract.notes && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                        <p className="text-sm">{selectedContract.notes}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="vouchers" className="pt-4 space-y-4">
                    <Button size="sm" onClick={() => {
                      setVoucherForm({ voucher_number: "", issued_date: "", valid_from: "", valid_until: "", room_type: "double", rooms_allocated: 1, notes: "" });
                      setIsVoucherOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Tambah Voucher
                    </Button>
                    {vouchers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Belum ada voucher
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No. Voucher</TableHead>
                            <TableHead>Berlaku</TableHead>
                            <TableHead>Kamar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vouchers.map((v: any) => (
                            <TableRow key={v.id}>
                              <TableCell className="font-mono text-xs">{v.voucher_number || "-"}</TableCell>
                              <TableCell className="text-xs">
                                {fmtDate(v.valid_from)} – {fmtDate(v.valid_until)}
                              </TableCell>
                              <TableCell>{v.rooms_allocated} ({v.room_type})</TableCell>
                              <TableCell>
                                <Badge variant={VOUCHER_STATUS[v.status]?.variant || "outline"} className="text-xs">
                                  {VOUCHER_STATUS[v.status]?.label || v.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={v.status}
                                  onValueChange={(s) => updateVoucherStatus.mutate({ id: v.id, status: s })}
                                >
                                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(VOUCHER_STATUS).map(([k, vv]) => (
                                      <SelectItem key={k} value={k}>{vv.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Contract Form Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Kontrak" : "Buat Kontrak Hotel Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Hotel</Label>
                <Select value={formData.hotel_id} onValueChange={v => setField("hotel_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih hotel..." /></SelectTrigger>
                  <SelectContent>
                    {hotels.map((h: any) => (
                      <SelectItem key={h.id} value={h.id}>{h.name} {h.city ? `— ${h.city}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Keberangkatan (opsional)</Label>
                <Select value={formData.departure_id} onValueChange={v => setField("departure_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Tidak dikaitkan —</SelectItem>
                    {departures.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.package?.name} — {fmtDate(d.departure_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>No. Kontrak</Label>
                <Input value={formData.contract_number} onChange={e => setField("contract_number", e.target.value)} placeholder="CTR/2026/001" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tgl Kontrak</Label>
                <Input type="date" value={formData.contract_date} onChange={e => setField("contract_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Kamar</Label>
                <Select value={formData.room_type} onValueChange={v => setField("room_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["single","double","triple","quad"].map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Check-In</Label>
                <Input type="date" value={formData.check_in_date} onChange={e => setField("check_in_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Check-Out</Label>
                <Input type="date" value={formData.check_out_date} onChange={e => setField("check_out_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah Kamar</Label>
                <Input type="number" min={0} value={formData.total_rooms} onChange={e => setField("total_rooms", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Harga per Kamar (IDR)</Label>
                <Input type="number" min={0} value={formData.price_per_room} onChange={e => setField("price_per_room", e.target.value)} />
              </div>
            </div>
            {formData.total_rooms > 0 && formData.price_per_room > 0 && (
              <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                Nilai total: <strong className="text-foreground">{formatCurrency(Number(formData.total_rooms) * Number(formData.price_per_room))}</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={formData.notes} onChange={e => setField("notes", e.target.value)} rows={3} placeholder="Syarat & ketentuan, catatan negosiasi..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContractOpen(false)}>Batal</Button>
            <Button onClick={() => saveContractMutation.mutate()} disabled={saveContractMutation.isPending}>
              {saveContractMutation.isPending ? "Menyimpan..." : editingContract ? "Perbarui" : "Buat Kontrak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Voucher Form Dialog ───────────────────────────────────────────────── */}
      <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Voucher Hotel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>No. Voucher</Label>
                <Input value={voucherForm.voucher_number} onChange={e => setVoucherForm(p => ({ ...p, voucher_number: e.target.value }))} placeholder="VCH/2026/001" />
              </div>
              <div className="space-y-1.5">
                <Label>Tgl Terbit</Label>
                <Input type="date" value={voucherForm.issued_date} onChange={e => setVoucherForm(p => ({ ...p, issued_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Kamar</Label>
                <Select value={voucherForm.room_type} onValueChange={v => setVoucherForm(p => ({ ...p, room_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["single","double","triple","quad"].map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Berlaku Mulai</Label>
                <Input type="date" value={voucherForm.valid_from} onChange={e => setVoucherForm(p => ({ ...p, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Berlaku Hingga</Label>
                <Input type="date" value={voucherForm.valid_until} onChange={e => setVoucherForm(p => ({ ...p, valid_until: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Jumlah Kamar Dialokasikan</Label>
                <Input type="number" min={1} value={voucherForm.rooms_allocated} onChange={e => setVoucherForm(p => ({ ...p, rooms_allocated: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Catatan</Label>
                <Textarea value={voucherForm.notes} onChange={e => setVoucherForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoucherOpen(false)}>Batal</Button>
            <Button onClick={() => saveVoucherMutation.mutate()} disabled={saveVoucherMutation.isPending}>
              {saveVoucherMutation.isPending ? "Menyimpan..." : "Tambah Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
