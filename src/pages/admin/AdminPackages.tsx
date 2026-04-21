import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPackageType } from "@/lib/format";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Plus, Edit, Eye, Package, Trash2, Calendar, Filter, X, 
  MoreHorizontal, Star, Info, Hotel, Plane, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
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
import { subDays } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminPackages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deletePackage, setDeletePackage] = useState<any>(null);
  const [packageTypeFilter, setPackageTypeFilter] = useState<"all" | "regular" | "tabungan">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [statsFilters, setStatsFilters] = useState<PackageStatsFilters>({});
  const [selectedDateRange, setSelectedDateRange] = useState<"7days" | "30days" | "90days" | "custom">("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  
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
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star_rating),
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
      if (packageTypeFilter === "tabungan" && pkg.package_type !== "tabungan") return false;
      if (packageTypeFilter === "regular" && pkg.package_type === "tabungan") return false;

      // Filter by status
      if (statusFilter === "active" && !pkg.is_active) return false;
      if (statusFilter === "inactive" && pkg.is_active) return false;
      
      return true;
    }) || [];
  }, [packages, searchTerm, packageTypeFilter, statusFilter]);

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
    setPackageTypeFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  const getUpcomingDepartures = (departures: any[]) => {
    if (!departures) return [];
    const today = new Date().toISOString().split('T')[0];
    return departures.filter(d => d.departure_date >= today && d.status === 'open');
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
    statusFilter !== "all",
    Object.keys(statsFilters).length > 0,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchTerm || activeFilterCount > 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Kelola Paket
            </h1>
            <p className="text-muted-foreground">Pusat manajemen paket perjalanan umroh & haji</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleAddPackage("regular")} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Paket Reguler
            </Button>
            <Button onClick={() => handleAddPackage("tabungan")} variant="outline" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Paket Tabungan
            </Button>
            {selectedPackages.length > 0 && (
              <div className="flex items-center gap-2 ml-4 bg-primary/5 p-1 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-right-2">
                <span className="text-xs font-semibold px-2 text-primary">{selectedPackages.length} terpilih</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/10">
                      Aksi Masal
                      <MoreHorizontal className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-xs">Aktifkan Semua</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-destructive">Nonaktifkan Semua</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau kode paket..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-background border-none shadow-inner"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={showFilters ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 h-10 px-4"
                >
                  <Filter className="h-4 w-4" />
                  Filter Lanjutan
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 flex items-center justify-center bg-primary">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearFilters}
                    className="gap-2 h-10 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipe Paket</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["all", "regular", "tabungan"].map((type) => (
                      <Badge 
                        key={type}
                        variant={packageTypeFilter === type ? "default" : "outline"}
                        className="cursor-pointer capitalize px-3 py-1"
                        onClick={() => setPackageTypeFilter(type as any)}
                      >
                        {type === "all" ? "Semua" : type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["all", "active", "inactive"].map((status) => (
                      <Badge 
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        className="cursor-pointer capitalize px-3 py-1"
                        onClick={() => setStatusFilter(status as any)}
                      >
                        {status === "all" ? "Semua" : status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rentang Waktu Statistik</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-muted p-1 rounded-md">
                      {["7days", "30days", "90days", "custom"].map((range) => (
                        <button
                          key={range}
                          onClick={() => setSelectedDateRange(range as any)}
                          className={`px-3 py-1 text-xs rounded-sm transition-all ${selectedDateRange === range ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {range === "7days" ? "7H" : range === "30days" ? "30H" : range === "90days" ? "90H" : "Kustom"}
                        </button>
                      ))}
                    </div>
                    {selectedDateRange === "custom" && (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-xs p-1 border rounded bg-background" />
                        <span className="text-muted-foreground">-</span>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-xs p-1 border rounded bg-background" />
                      </div>
                    )}
                    <Button size="sm" className="h-8 text-xs ml-auto" onClick={handleApplyDateFilter}>Terapkan</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Terjual", value: stats?.totalSold || 0, sub: "Pax dari semua paket", icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Bulan Ini", value: stats?.soldThisMonth || 0, sub: "Pax terjual bulan ini", icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Total Pendapatan", value: formatCurrency(stats?.totalRevenue || 0), sub: "Akumulasi omzet", icon: CheckCircle2, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "Konversi", value: `${(stats?.conversionRate || 0).toFixed(1)}%`, sub: "Rasio booking sukses", icon: Star, color: "text-purple-500", bg: "bg-purple-50" }
          ].map((item, i) => (
            <Card key={i} className="border-none shadow-sm overflow-hidden group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`${item.bg} ${item.color} p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  {isStatsLoading ? <Skeleton className="h-7 w-20 mt-1" /> : <div className="text-xl font-bold mt-0.5">{item.value}</div>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Package List Area */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[400px] rounded-3xl" />)}
          </div>
        ) : !filteredPackages || filteredPackages.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tidak ada paket ditemukan"
            description={hasActiveFilters ? "Coba sesuaikan filter atau kata kunci pencarian Anda." : "Mulai bangun bisnis Anda dengan membuat paket perjalanan pertama."}
            action={
              <Button onClick={() => handleAddPackage("regular")} className="gap-2">
                <Plus className="h-4 w-4" />
                Buat Paket Sekarang
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="select-all"
                  checked={selectedPackages.length === filteredPackages.length && filteredPackages.length > 0}
                  onCheckedChange={toggleAll}
                  className="rounded-md border-muted-foreground/30"
                />
                <label htmlFor="select-all" className="text-sm font-medium text-muted-foreground cursor-pointer select-none">
                  {selectedPackages.length > 0 ? `${selectedPackages.length} Paket terpilih` : `Pilih semua (${filteredPackages.length})`}
                </label>
              </div>
              <div className="text-xs text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
                Menampilkan {filteredPackages.length} paket
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const upcoming = getUpcomingDepartures(pkg.departures as any[]);
                const lowestPrice = getLowestPrice(pkg);
                
                return (
                  <Card key={pkg.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl flex flex-col bg-card/50 backdrop-blur-sm">
                    {/* Image Section */}
                    <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                      <img
                        src={pkg.featured_image || '/placeholder.svg'}
                        alt={pkg.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Selection Overlay */}
                      <div className="absolute top-4 right-4 z-20">
                        <Checkbox 
                          checked={selectedPackages.includes(pkg.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedPackages([...selectedPackages, pkg.id]);
                            else setSelectedPackages(selectedPackages.filter(id => id !== pkg.id));
                          }}
                          className="h-6 w-6 rounded-lg bg-white/20 border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>

                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
                        <Badge variant="secondary" className="bg-white/90 text-black border-none font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg">
                          {formatPackageType(pkg.package_type)}
                        </Badge>
                        {pkg.is_featured && (
                          <Badge className="bg-amber-500 text-white border-none font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" /> UNGGULAN
                          </Badge>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute bottom-4 left-4 z-20">
                        <Badge 
                          variant={pkg.is_active ? "default" : "destructive"} 
                          className={`text-[10px] font-bold px-3 py-1 rounded-full border-none shadow-lg flex items-center gap-1.5 ${pkg.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
                        >
                          <div className={`h-1.5 w-1.5 rounded-full bg-white ${pkg.is_active ? 'animate-pulse' : ''}`} />
                          {pkg.is_active ? 'PUBLISHED' : 'DRAFT'}
                        </Badge>
                      </div>

                      {/* Quick Info Overlay */}
                      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end">
                        <div className="text-[10px] text-white/80 font-bold uppercase tracking-tighter">Mulai Dari</div>
                        <div className="text-xl font-black text-white drop-shadow-md">
                          {lowestPrice > 0 ? formatCurrency(lowestPrice) : 'TBA'}
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <CardContent className="p-6 flex-1 flex flex-col space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary tracking-widest uppercase">{pkg.code}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{pkg.duration_days} HARI</span>
                        </div>
                        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors duration-300" title={pkg.name}>
                          {pkg.name}
                        </h3>
                      </div>
                      
                      {/* Facility & Service Info */}
                      <div className="grid grid-cols-2 gap-3 py-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="bg-muted p-1.5 rounded-lg"><Hotel className="h-3.5 w-3.5" /></div>
                          <div className="truncate">
                            <span className="block font-semibold text-foreground text-[10px] uppercase">Hotel</span>
                            <span className="truncate block">{pkg.hotel_makkah?.name || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="bg-muted p-1.5 rounded-lg"><Plane className="h-3.5 w-3.5" /></div>
                          <div className="truncate">
                            <span className="block font-semibold text-foreground text-[10px] uppercase">Pesawat</span>
                            <span className="truncate block">{pkg.airline?.name || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Schedule Summary */}
                      <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-foreground uppercase">Jadwal Aktif</p>
                            <p className="text-xs text-muted-foreground font-medium">{upcoming.length} Keberangkatan</p>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-3">
                            <p className="text-xs font-bold mb-1 uppercase tracking-wider">Jadwal Terdekat:</p>
                            {upcoming.length > 0 ? (
                              <div className="space-y-1">
                                {upcoming.slice(0, 3).map((d: any, idx: number) => (
                                  <div key={idx} className="flex justify-between gap-4 text-[10px]">
                                    <span>{new Date(d.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className="font-bold text-primary">{d.booked_count}/{d.quota} Pax</span>
                                  </div>
                                ))}
                                {upcoming.length > 3 && <p className="text-[9px] text-center pt-1 border-t mt-1">+{upcoming.length - 3} jadwal lainnya</p>}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Belum ada jadwal keberangkatan aktif.</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 flex gap-2 mt-auto">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-bold text-xs gap-2" asChild>
                          <Link to={`/admin/packages/${pkg.id}`}>
                            <Eye className="h-4 w-4" /> DETAIL
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(pkg)}
                          className="flex-1 rounded-xl h-10 font-bold text-xs gap-2"
                        >
                          <Edit className="h-4 w-4" /> EDIT
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-1">
                            <DropdownMenuItem className="text-xs font-semibold gap-2 py-2 cursor-pointer">
                              <Star className="h-4 w-4 text-amber-500" /> Tandai Unggulan
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-semibold gap-2 py-2 cursor-pointer">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ubah Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs font-semibold gap-2 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeletePackage(pkg)}
                            >
                              <Trash2 className="h-4 w-4" /> Hapus Permanen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Package Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-2xl"><Package className="h-6 w-6" /></div>
                  {editingPackage ? 'Konfigurasi Paket' : 'Pendaftaran Paket Baru'}
                </DialogTitle>
                <p className="text-primary-foreground/70 text-sm font-medium mt-1">
                  {editingPackage ? `Memperbarui data paket ${editingPackage.code}` : 'Lengkapi detail paket perjalanan untuk mulai dipublikasikan.'}
                </p>
              </DialogHeader>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)] custom-scrollbar">
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full text-red-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black">Hapus Paket Ini?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-medium">
                  Anda akan menghapus paket <strong className="text-foreground">{deletePackage?.name}</strong> secara permanen. Tindakan ini akan berdampak pada data riwayat yang terkait.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="w-full flex sm:flex-row gap-3 pt-4">
                <AlertDialogCancel className="flex-1 rounded-2xl h-12 font-bold border-muted">BATALKAN</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteMutation.mutate(deletePackage.id)}
                  className="flex-1 rounded-2xl h-12 font-bold bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-200"
                >
                  YA, HAPUS SEKARANG
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
