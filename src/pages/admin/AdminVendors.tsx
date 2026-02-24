import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];

const VENDOR_TYPES = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'AIRLINE', label: 'Maskapai' },
  { value: 'VISA_PROVIDER', label: 'Provider Visa' },
  { value: 'CATERING', label: 'Katering' },
  { value: 'TRANSPORT', label: 'Transportasi' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function AdminVendors() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    vendor_type: "HOTEL",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    notes: "",
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Vendor[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingVendor) {
        const payload: VendorUpdate = data;
        const { error } = await supabase
          .from('vendors')
          .update(payload)
          .eq('id', editingVendor.id);
        if (error) throw error;
      } else {
        const payload: VendorInsert = data;
        const { error } = await supabase
          .from('vendors')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success(editingVendor ? 'Vendor berhasil diperbarui' : 'Vendor berhasil ditambahkan');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan vendor: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error('Gagal menghapus vendor: ' + error.message);
    },
  });

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        vendor_type: vendor.vendor_type,
        contact_person: vendor.contact_person || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: vendor.address || "",
        bank_name: vendor.bank_name || "",
        bank_account_number: vendor.bank_account_number || "",
        bank_account_name: vendor.bank_account_name || "",
        notes: vendor.notes || "",
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: "",
        vendor_type: "HOTEL",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        bank_name: "",
        bank_account_number: "",
        bank_account_name: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVendor(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const filteredVendors = vendors?.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === "all" || v.vendor_type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeLabel = (type: string) => {
    return VENDOR_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Vendor</h1>
          <p className="text-muted-foreground">Kelola vendor hotel, maskapai, visa, dan lainnya</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {VENDOR_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="font-medium">{vendor.name}</div>
                      {vendor.contact_person && (
                        <div className="text-sm text-muted-foreground">{vendor.contact_person}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(vendor.vendor_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" /> {vendor.phone}
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" /> {vendor.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.bank_name && (
                        <div className="text-sm">
                          <div>{vendor.bank_name}</div>
                          <div className="text-muted-foreground">{vendor.bank_account_number}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active ? "default" : "secondary"}>
                        {vendor.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(vendor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (confirm('Hapus vendor ini?')) {
                            deleteMutation.mutate(vendor.id);
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Tambah Vendor Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Vendor *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipe Vendor *</Label>
                  <Select 
                    value={formData.vendor_type} 
                    onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Kontak Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telepon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nama Bank</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nomor Rekening</Label>
                  <Input
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atas Nama</Label>
                  <Input
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
