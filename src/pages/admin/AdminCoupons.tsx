import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CouponForm } from "@/components/admin/forms/CouponForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Ticket } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { useCoupons } from "@/hooks/useCoupons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCoupons() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  
  const { coupons, isLoading, deleteCoupon } = useCoupons();

  const filtered = useMemo(() => {
    if (!coupons) return [];
    const term = searchTerm.toLowerCase();
    return coupons.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term)
    );
  }, [coupons, searchTerm]);

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
      deleteCoupon(coupon.id);
    }
  };

  const isExpired = (coupon: any) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manajemen Kupon</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola kode diskon dan promosi untuk pelanggan</p>
        </div>
        <Button 
          onClick={handleAddCoupon}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Tambah Kupon
        </Button>
      </div>

      {/* Search Section */}
      <div className="relative max-w-sm group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Cari kupon berdasarkan kode atau nama..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="pl-10 bg-card border-muted-foreground/20 focus-visible:ring-primary/50"
        />
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground/80">Kode</TableHead>
                <TableHead className="font-semibold text-foreground/80">Nama</TableHead>
                <TableHead className="font-semibold text-foreground/80">Diskon</TableHead>
                <TableHead className="font-semibold text-foreground/80">Penggunaan</TableHead>
                <TableHead className="font-semibold text-foreground/80">Berlaku</TableHead>
                <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                <TableHead className="text-right font-semibold text-foreground/80">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length ? (
                filtered.map(coupon => (
                  <TableRow 
                    key={coupon.id}
                    className={`hover:bg-muted/30 transition-colors group ${isExpired(coupon) ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <code className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-bold border border-primary/20">
                        {coupon.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        {coupon.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatDiscount(coupon)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{coupon.used_count || 0}</span>
                        {coupon.usage_limit && (
                          <span className="text-muted-foreground/60">/ {coupon.usage_limit}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.valid_from && coupon.valid_until ? (
                        <div className="space-y-1">
                          <div className="font-medium">{format(new Date(coupon.valid_from), "dd MMM yyyy")}</div>
                          <div className="text-xs text-muted-foreground/60">s/d {format(new Date(coupon.valid_until), "dd MMM yyyy")}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Tidak terbatas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={coupon.is_active ? "default" : "secondary"}
                          className={coupon.is_active ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20" : "bg-muted text-muted-foreground border-border"}
                        >
                          {coupon.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        {isExpired(coupon) && (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
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
                          className="gap-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="gap-1 shadow-sm active:scale-95 transition-all"
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
                      <div className="rounded-full bg-muted p-4">
                        <Ticket className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {searchTerm ? "Tidak ada hasil pencarian" : "Belum ada kupon"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
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
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="px-6 py-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary p-3 shadow-lg shadow-primary/20">
                <Ticket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
                  {editingCoupon ? "Edit Kupon" : "Tambah Kupon Baru"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {editingCoupon 
                    ? `Perbarui informasi kupon "${editingCoupon.code}"` 
                    : "Buat kupon diskon baru untuk promosi pelanggan"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-6 bg-card">
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
