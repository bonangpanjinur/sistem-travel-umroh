import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPackageType } from "@/lib/format";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Eye, Package, Trash2, Calendar, TrendingUp, ShoppingCart, Star, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegularPackageForm } from "@/components/admin/forms/RegularPackageForm";
import { SavingsPackageForm } from "@/components/admin/forms/SavingsPackageForm";
import { toast } from "sonner";
import { usePackageStats } from "@/hooks/usePackageStats";

export default function AdminPackages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deletePackage, setDeletePackage] = useState<any>(null);
  const [packageTypeFilter, setPackageTypeFilter] = useState<"all" | "regular" | "tabungan">("all");
  
  const queryClient = useQueryClient();
  const { data: stats, isLoading: isStatsLoading } = usePackageStats();
  
  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          airline:airlines(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name),
          package_type_ref:package_types(name),
          departures(id, departure_date, quota, booked_count, status, price_quad, price_triple, price_double, price_single)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paket berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      setDeletePackage(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus paket");
    },
  });

  const filteredPackages = packages?.filter(pkg => {
    // Filter by search term
    if (searchTerm && !(
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.code.toLowerCase().includes(searchTerm.toLowerCase())
    )) {
      return false;
    }
    
    // Filter by package type
    if (packageTypeFilter === "tabungan") {
      return pkg.package_type === "tabungan";
    } else if (packageTypeFilter === "regular") {
      return pkg.package_type !== "tabungan";
    }
    
    return true;
  });

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setIsFormOpen(true);
  };

  const handleAddPackage = (type: "regular" | "tabungan") => {
    setEditingPackage(null);
    setPackageTypeFilter(type === "regular" ? "regular" : "tabungan");
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPackage(null);
  };

  const getUpcomingDepartures = (departures: any[]) => {
    if (!departures) return 0;
    const today = new Date().toISOString().split('T')[0];
    return departures.filter(d => d.departure_date >= today && d.status === 'open').length;
  };

  const getLowestPrice = (pkg: any) => {
    const today = new Date().toISOString().split('T')[0];
    const openDeps = (pkg.departures as any[])?.filter(
      (d: any) => d.departure_date >= today && d.status === 'open'
    ) || [];
    const depPrices = openDeps.flatMap((d: any) =>
      [d.price_quad, d.price_triple, d.price_double, d.price_single].filter((p: number) => p && p > 0)
    );
    if (depPrices.length > 0) return Math.min(...depPrices);
    const pkgPrices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
      .filter((p: number) => p && p > 0);
    return pkgPrices.length > 0 ? Math.min(...pkgPrices) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Paket</h1>
          <p className="text-muted-foreground">Lihat dan kelola paket umroh & haji</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari paket..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Button onClick={() => handleAddPackage("regular")} className="gap-2">
              <Plus className="h-4 w-4" />
              Paket Reguler
            </Button>
            <Button onClick={() => handleAddPackage("tabungan")} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Paket Tabungan
            </Button>
          </div>
      </div>

      {/* Realization Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terjual</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalSold || 0}</div>
                <p className="text-xs text-muted-foreground">Pax dari semua paket</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.soldThisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">Pax terjual bulan ini</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tahun Ini</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.soldThisYear || 0}</div>
                <p className="text-xs text-muted-foreground">Pax terjual tahun ini</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paket Paling Laku</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-lg font-bold truncate" title={stats?.mostPopular?.name}>
                  {stats?.mostPopular?.name || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.mostPopular ? `${stats.mostPopular.count} Pax terjual` : 'Belum ada data'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Package Type Tabs */}
      <Tabs value={packageTypeFilter} onValueChange={(v: any) => setPackageTypeFilter(v)} className="w-full">
        <TabsList>
          <TabsTrigger value="all">Semua Paket</TabsTrigger>
          <TabsTrigger value="regular">Paket Reguler</TabsTrigger>
          <TabsTrigger value="tabungan">Paket Tabungan</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : !filteredPackages || filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Tidak ada paket yang cocok.' : packageTypeFilter !== 'all' ? `Belum ada paket ${packageTypeFilter === 'tabungan' ? 'tabungan' : 'reguler'}.` : 'Belum ada paket.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={pkg.featured_image || '/placeholder.svg'}
                  alt={pkg.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge>{pkg.package_type_ref?.name || formatPackageType(pkg.package_type)}</Badge>
                  {pkg.is_featured && <Badge variant="secondary">Featured</Badge>}
                </div>
                {!pkg.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Nonaktif</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{pkg.code}</p>
                  <h3 className="font-semibold line-clamp-1">{pkg.name}</h3>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{pkg.duration_days} Hari</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{getUpcomingDepartures(pkg.departures as any[])} jadwal aktif</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Mulai dari</p>
                  <p className="font-bold text-primary">
                    {getLowestPrice(pkg) > 0 ? formatCurrency(getLowestPrice(pkg)) : 'Hubungi Kami'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/admin/packages/${pkg.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Detail
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletePackage(pkg)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Package Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Edit Paket' : 'Tambah Paket Baru'}</DialogTitle>
          </DialogHeader>
          {packageTypeFilter === "tabungan" ? (
            <SavingsPackageForm 
              packageData={editingPackage} 
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          ) : (
            <RegularPackageForm 
              packageData={editingPackage} 
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Paket <strong>{deletePackage?.name}</strong> akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deletePackage.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
