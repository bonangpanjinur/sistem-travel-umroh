import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPackageType } from "@/lib/format";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Eye, Package, Trash2, Calendar, Filter, X, MoreHorizontal, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RegularPackageForm } from "@/components/admin/forms/RegularPackageForm";
import { SavingsPackageForm } from "@/components/admin/forms/SavingsPackageForm";
import { toast } from "sonner";
import { usePackageStats, PackageStatsFilters } from "@/hooks/usePackageStats";
import { format, subDays } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";

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
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
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

  const filteredPackages = useMemo(() => {
    return packages?.filter(pkg => {
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
    }) || [];
  }, [packages, searchTerm, packageTypeFilter]);

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

  const toggleAll = () => {
    if (selectedPackages.length === filteredPackages.length) {
      setSelectedPackages([]);
    } else {
      setSelectedPackages(filteredPackages.map(p => p.id));
    }
  };

  const activeFilterCount = [
    packageTypeFilter !== "all",
    Object.keys(statsFilters).length > 0,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchTerm || activeFilterCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Paket</h1>
          <p className="text-muted-foreground">Lihat dan kelola paket umroh & haji</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleAddPackage("regular")} className="gap-2">
            <Plus className="h-4 w-4" />
            Paket Reguler
          </Button>
          <Button onClick={() => handleAddPackage("tabungan")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Paket Tabungan
          </Button>
          {selectedPackages.length > 0 && (
            <div className="flex items-center gap-2 ml-4 bg-muted p-1 rounded-md animate-in fade-in slide-in-from-right-2">
              <span className="text-sm font-medium px-2">{selectedPackages.length} dipilih</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    Aksi Masal
                    <MoreHorizontal className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    toast.info("Fitur ini akan segera tersedia");
                  }}>
                    Aktifkan Semua
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    toast.info("Fitur ini akan segera tersedia");
                  }} className="text-destructive">
                    Nonaktifkan Semua
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari paket..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 w-full sm:w-auto"
        >
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchTerm("");
              handleClearFilters();
              setPackageTypeFilter("all");
              setSelectedPackages([]);
            }}
            className="gap-2 w-full sm:w-auto"
          >
            <X className="h-4 w-4" />
            Hapus Filter
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-3 block">Tipe Paket</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="all" 
                      checked={packageTypeFilter === "all"}
                      onChange={(e) => setPackageTypeFilter(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">Semua Paket</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="regular" 
                      checked={packageTypeFilter === "regular"}
                      onChange={(e) => setPackageTypeFilter(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">Paket Reguler</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="tabungan" 
                      checked={packageTypeFilter === "tabungan"}
                      onChange={(e) => setPackageTypeFilter(e.target.value as any)}
                      className="rounded"
                    />
                    <span className="text-sm">Paket Tabungan</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Rentang Tanggal</label>
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
            </div>
            
            {selectedDateRange === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal Awal</label>
                  <input 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal Akhir</label>
                  <input 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Hapus Filter
              </Button>
              <Button onClick={handleApplyDateFilter}>Terapkan Filter</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terjual</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Booking</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Package List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : !filteredPackages || filteredPackages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Tidak ada paket"
          description={searchTerm ? 'Tidak ada paket yang cocok dengan pencarian Anda.' : packageTypeFilter !== 'all' ? `Belum ada paket ${packageTypeFilter === 'tabungan' ? 'tabungan' : 'reguler'}.` : 'Mulai dengan membuat paket baru.'}
          action={
            <Button onClick={() => handleAddPackage("regular")} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Paket
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox 
              checked={selectedPackages.length === filteredPackages.length && filteredPackages.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedPackages.length > 0 
                ? `${selectedPackages.length} dari ${filteredPackages.length} dipilih` 
                : `Pilih semua (${filteredPackages.length})`}
            </span>
          </div>

          {/* Package Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video relative bg-muted">
                  <img
                    src={pkg.featured_image || '/placeholder.svg'}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
                    <Checkbox 
                      checked={selectedPackages.includes(pkg.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPackages([...selectedPackages, pkg.id]);
                        } else {
                          setSelectedPackages(selectedPackages.filter(id => id !== pkg.id));
                        }
                      }}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="text-xs">{formatPackageType(pkg.package_type)}</Badge>
                    {pkg.is_featured && <Badge className="text-xs">Featured</Badge>}
                  </div>
                  {!pkg.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Nonaktif</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{pkg.code}</p>
                    <h3 className="font-semibold line-clamp-2">{pkg.name}</h3>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {pkg.duration_days} Hari
                    </p>
                    <p className="flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      {getUpcomingDepartures(pkg.departures as any[])} jadwal aktif
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Mulai dari</p>
                    <p className="font-bold text-primary text-lg">
                      {getLowestPrice(pkg) > 0 ? formatCurrency(getLowestPrice(pkg)) : 'Hubungi Kami'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/admin/packages/${pkg.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(pkg)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
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
