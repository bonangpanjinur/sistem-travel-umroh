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
import { Search, Plus, Edit, Eye, Package, Trash2, Calendar, TrendingUp, ShoppingCart, Star, BarChart3, Filter, X } from "lucide-react";
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
import { usePackageStats, PackageStatsFilters } from "@/hooks/usePackageStats";
import { format, subDays } from "date-fns";

export default function AdminPackages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deletePackage, setDeletePackage] = useState<any>(null);
  const [packageTypeFilter, setPackageTypeFilter] = useState<"all" | "regular" | "tabungan">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [statsFilters, setStatsFilters] = useState<PackageStatsFilters>({});
  const [selectedDateRange, setSelectedDateRange] = useState<"7days" | "30days" | "90days" | "custom">("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeStatsTab, setActiveStatsTab] = useState("overview");
  
  const queryClient = useQueryClient();
  const { data: stats, isLoading: isStatsLoading } = usePackageStats(statsFilters);
  
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

  const handleApplyDateFilter = () => {
    if (selectedDateRange === "custom") {
      if (!customStartDate || !customEndDate) {
        toast.error("Silakan isi tanggal awal dan akhir");
        return;
      }
      setStatsFilters({
        ...statsFilters,
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate)
      });
    } else {
      const now = new Date();
      let startDate: Date;
      
      switch (selectedDateRange) {
        case "7days":
          startDate = subDays(now, 7);
          break;
        case "90days":
          startDate = subDays(now, 90);
          break;
        case "30days":
        default:
          startDate = subDays(now, 30);
          break;
      }
      
      setStatsFilters({
        ...statsFilters,
        startDate,
        endDate: now
      });
    }
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setStatsFilters({});
    setSelectedDateRange("30days");
    setCustomStartDate("");
    setCustomEndDate("");
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

      {/* Statistics Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Realisasi Paket</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        
        {/* Filter Panel */}
        {showFilters && (
          <CardContent className="border-t pt-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rentang Tanggal</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="7days" 
                      checked={selectedDateRange === "7days"}
                      onChange={(e) => setSelectedDateRange(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">7 Hari Terakhir</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="30days" 
                      checked={selectedDateRange === "30days"}
                      onChange={(e) => setSelectedDateRange(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">30 Hari Terakhir</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="90days" 
                      checked={selectedDateRange === "90days"}
                      onChange={(e) => setSelectedDateRange(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">90 Hari Terakhir</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="custom" 
                      checked={selectedDateRange === "custom"}
                      onChange={(e) => setSelectedDateRange(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">Kustom</span>
                  </label>
                </div>
              </div>
              
              {selectedDateRange === "custom" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tanggal Awal</label>
                    <input 
                      type="date" 
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tanggal Akhir</label>
                    <input 
                      type="date" 
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Hapus Filter
              </Button>
              <Button onClick={handleApplyDateFilter}>Terapkan Filter</Button>
            </div>
          </CardContent>
        )}

        {/* Statistics Tabs */}
        <CardContent className="pt-4">
          <Tabs value={activeStatsTab} onValueChange={setActiveStatsTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="packages">Per Paket</TabsTrigger>
              <TabsTrigger value="breakdown">Kategori</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
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
                          {stats?.mostPopular ? `${stats.mostPopular.count} Pax` : 'Belum ada data'}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isStatsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                        <p className="text-xs text-muted-foreground">Dari semua paket</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Nilai Rata-rata Booking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isStatsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.averageBookingValue || 0)}</div>
                        <p className="text-xs text-muted-foreground">Per transaksi</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tingkat Konversi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isStatsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{(stats?.conversionRate || 0).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Booking terkonfirmasi</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Per Package Tab */}
            <TabsContent value="packages" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Nama Paket</th>
                      <th className="text-right py-2 px-2 font-semibold">Pax Terjual</th>
                      <th className="text-right py-2 px-2 font-semibold">Jumlah Booking</th>
                      <th className="text-right py-2 px-2 font-semibold">Total Pendapatan</th>
                      <th className="text-right py-2 px-2 font-semibold">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isStatsLoading ? (
                      <tr><td colSpan={5} className="py-4"><Skeleton className="h-6" /></td></tr>
                    ) : stats?.topPackages && stats.topPackages.length > 0 ? (
                      stats.topPackages.map((pkg: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{pkg.name}</p>
                              <p className="text-xs text-muted-foreground">{pkg.code}</p>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 font-semibold">{pkg.count}</td>
                          <td className="text-right py-3 px-2">{pkg.bookingCount}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(pkg.revenue)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(pkg.revenue / pkg.bookingCount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {isStatsLoading ? (
                  <>
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </>
                ) : stats?.packageTypeBreakdown && stats.packageTypeBreakdown.length > 0 ? (
                  stats.packageTypeBreakdown.map((breakdown: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium capitalize">{formatPackageType(breakdown.type)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Pax</span>
                          <span className="font-semibold">{breakdown.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Pendapatan</span>
                          <span className="font-semibold">{formatCurrency(breakdown.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Persentase</span>
                          <span className="font-semibold">{((breakdown.count / (stats?.totalSold || 1)) * 100).toFixed(1)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-muted-foreground">Tidak ada data</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
