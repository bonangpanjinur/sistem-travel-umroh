import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CouponForm } from "@/components/admin/forms/CouponForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Ticket, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

export default function AdminCoupons() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kupon berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus kupon");
    },
  });

  const filtered = coupons?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDiscount = (coupon: any) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value);
  };

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setIsFormOpen(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  };

  const handleDeleteCoupon = (coupon: any) => {
    if (window.confirm(`Yakin ingin menghapus kupon "${coupon.code}"?`)) {
      deleteMutation.mutate(coupon.id);
    }
  };

  const isExpired = (coupon: any) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Kupon</h1>
          <p className="text-gray-600 text-sm mt-1">Kelola kode diskon dan promosi untuk pelanggan</p>
        </div>
        <Button 
          onClick={handleAddCoupon}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Kupon
        </Button>
      </div>

      {/* Search Section */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Cari kupon berdasarkan kode atau nama..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="pl-10 bg-white"
        />
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-200">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Kode</TableHead>
                <TableHead className="font-semibold text-gray-700">Nama</TableHead>
                <TableHead className="font-semibold text-gray-700">Diskon</TableHead>
                <TableHead className="font-semibold text-gray-700">Penggunaan</TableHead>
                <TableHead className="font-semibold text-gray-700">Berlaku</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered?.length ? (
                filtered.map(coupon => (
                  <TableRow 
                    key={coupon.id}
                    className={`hover:bg-gray-50 transition-colors ${isExpired(coupon) ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <code className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-bold border border-blue-200">
                        {coupon.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-gray-400" />
                        {coupon.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatDiscount(coupon)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{coupon.used_count || 0}</span>
                        {coupon.usage_limit && (
                          <span className="text-gray-400">/ {coupon.usage_limit}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {coupon.valid_from && coupon.valid_until ? (
                        <div className="space-y-1">
                          <div>{format(new Date(coupon.valid_from), "dd MMM yyyy")}</div>
                          <div className="text-xs text-gray-400">s/d {format(new Date(coupon.valid_until), "dd MMM yyyy")}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Tidak terbatas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={coupon.is_active ? "default" : "secondary"}
                          className={coupon.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                        >
                          {coupon.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        {isExpired(coupon) && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            Kadaluarsa
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditCoupon(coupon)}
                          className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-gray-100 p-3">
                        <Ticket className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {searchTerm ? "Tidak ada hasil pencarian" : "Belum ada kupon"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchTerm ? "Coba ubah kata kunci pencarian" : "Mulai dengan membuat kupon baru"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {editingCoupon ? "Edit Kupon" : "Tambah Kupon Baru"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {editingCoupon 
                    ? `Perbarui informasi kupon "${editingCoupon.code}"` 
                    : "Buat kupon diskon baru untuk promosi pelanggan"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            <CouponForm 
              couponData={editingCoupon} 
              onSuccess={() => setIsFormOpen(false)} 
              onCancel={() => setIsFormOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
