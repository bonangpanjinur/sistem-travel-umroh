import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, DollarSign, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type VendorCost = Database["public"]["Tables"]["vendor_costs"]["Row"];
type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const COST_TYPES = [
  { value: 'ACCOMMODATION', label: 'Akomodasi Hotel' },
  { value: 'FLIGHT', label: 'Tiket Pesawat' },
  { value: 'VISA', label: 'Visa' },
  { value: 'MEALS', label: 'Konsumsi' },
  { value: 'TRANSPORT', label: 'Transportasi' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function AdminFinanceAP() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAP, setEditingAP] = useState<VendorCost | null>(null);

  const [formData, setFormData] = useState({
    vendor_id: "",
    cost_type: "ACCOMMODATION",
    description: "",
    amount: "",
    due_date: "",
  });

  // Fetch AP data (vendor costs) — limited to most recent 200 for UI responsiveness
  const { data: apData = [], isLoading } = useQuery({
    queryKey: ["admin-ap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_costs")
        .select(`
          *,
          vendor:vendors(id, name, vendor_type)
        `)
        .order("due_date", { ascending: true })
        .limit(200);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, vendor_type")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Calculate summary
  const totalAP = apData.reduce((sum, ap) => sum + (ap.amount || 0), 0);
  const totalPaid = apData.reduce((sum, ap) => sum + (ap.paid_amount || 0), 0);
  const totalOutstanding = totalAP - totalPaid;
  const unpaidCount = apData.filter(ap => ap.status !== 'paid').length;

  const filtered = apData.filter(ap => {
    const matchSearch = ap.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ap.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || ap.status === statusFilter;
    const matchVendor = vendorFilter === "all" || ap.vendor_id === vendorFilter;
    return matchSearch && matchStatus && matchVendor;
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingAP) {
        const { error } = await supabase
          .from("vendor_costs")
          .update(data)
          .eq("id", editingAP.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendor_costs")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ap"] });
      toast.success(editingAP ? "Hutang vendor berhasil diperbarui" : "Hutang vendor berhasil ditambahkan");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Gagal menyimpan: " + error.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const ap = apData.find(a => a.id === id);
      if (!ap) throw new Error("Data not found");
      
      const { error } = await supabase
        .from("vendor_costs")
        .update({
          paid_amount: ap.amount,
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ap"] });
      toast.success("Hutang vendor telah ditandai lunas");
    },
    onError: (error: any) => {
      toast.error("Gagal: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendor_costs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ap"] });
      toast.success("Hutang vendor berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error("Gagal: " + error.message);
    },
  });

  const handleOpenDialog = (ap?: VendorCost) => {
    if (ap) {
      setEditingAP(ap);
      setFormData({
        vendor_id: ap.vendor_id || "",
        cost_type: ap.cost_type || "ACCOMMODATION",
        description: ap.description || "",
        amount: ap.amount?.toString() || "",
        due_date: ap.due_date || "",
      });
    } else {
      setEditingAP(null);
      setFormData({
        vendor_id: "",
        cost_type: "ACCOMMODATION",
        description: "",
        amount: "",
        due_date: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAP(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hutang Vendor (AP)</h1>
          <p className="text-muted-foreground">Kelola hutang ke vendor (hotel, maskapai, visa, dll)</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Hutang
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hutang</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAP)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hutang Tertunggak</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Belum Dibayar</p>
                <p className="text-2xl font-bold">{unpaidCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari vendor atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Vendor</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Tidak ada hutang vendor ditemukan</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Tipe Biaya</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Sudah Dibayar</TableHead>
                <TableHead>Sisa Hutang</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ap) => (
                <TableRow key={ap.id}>
                  <TableCell className="font-medium">{ap.vendor?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {COST_TYPES.find(t => t.value === ap.cost_type)?.label || ap.cost_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{ap.description || "-"}</TableCell>
                  <TableCell>{formatCurrency(ap.amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(ap.paid_amount || 0)}</TableCell>
                  <TableCell className={ap.amount - (ap.paid_amount || 0) > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                    {formatCurrency(ap.amount - (ap.paid_amount || 0))}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ap.due_date ? format(new Date(ap.due_date), "dd MMM yyyy", { locale: localeId }) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ap.status === "paid" ? "default" : "secondary"}>
                      {ap.status === "paid" ? "Lunas" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {ap.status !== "paid" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markPaidMutation.mutate(ap.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(ap)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Hapus hutang vendor ini?")) {
                          deleteMutation.mutate(ap.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAP ? "Edit Hutang Vendor" : "Tambah Hutang Vendor Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipe Biaya *</Label>
                  <Select value={formData.cost_type} onValueChange={(v) => setFormData({ ...formData, cost_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi hutang"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">ℹ️ Informasi Hutang Vendor</p>
          <p>Halaman ini menampilkan semua hutang ke vendor seperti hotel, maskapai, visa provider, dan lainnya. Anda dapat menambah, mengedit, dan menandai hutang sebagai lunas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
