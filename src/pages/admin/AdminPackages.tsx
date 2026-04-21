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
  MoreHorizontal, Star, Info, Hotel, Plane, Clock, CheckCircle2, AlertCircle,
  Power, PowerOff, ChevronDown
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RegularPackageForm } from "@/components/admin/forms/RegularPackageForm";
import { SavingsPackageForm } from "@/components/admin/forms/SavingsPackageForm";
import { toast } from "sonner";
import { usePackageStats, PackageStatsFilters } from "@/hooks/usePackageStats";
import { subDays } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('packages')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Paket berhasil ${variables.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengubah status paket");
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string, is_featured: boolean }) => {
      const { error } = await supabase
        .from('packages')
        .update({ is_featured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Paket ${variables.is_featured ? 'ditandai sebagai unggulan' : 'dihapus dari unggulan'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengubah status unggulan");
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
      if (searchTerm && !(
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.code.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return false;
      }
      
      if (packageTypeFilter === "tabungan" && pkg.package_type !== "tabungan") return false;
      if (packageTypeFilter === "regular" && pkg.package_type === "tabungan") return false;

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
            <Button onClick={() => handleAddPackage("regular")} className="gap-2 shadow-sm bg-primary hover:bg-primary/90 rounded-xl">
              <Plus className="h-4 w-4" />
              Paket Reguler
            </Button>
            <Button onClick={() => handleAddPackage("tabungan")} variant="outline" className="gap-2 shadow-sm rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
              <Plus className="h-4 w-4" />
              Paket Tabungan
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur rounded-2xl">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau kode paket..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-background border-none shadow-inner rounded-xl focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={packageTypeFilter} onValueChange={(v: any) => setPackageTypeFilter(v)}>
                  <SelectTrigger className="w-[140px] h-11 rounded-xl border-none bg-background shadow-sm">
                    <SelectValue placeholder="Tipe Paket" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="regular">Reguler</SelectItem>
                    <SelectItem value="tabungan">Tabungan</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[140px] h-11 rounded-xl border-none bg-background shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden rounded-3xl border-none shadow-sm">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPackages.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tidak ada paket ditemukan"
            description="Coba ubah kata kunci pencarian atau filter Anda."
            action={{
              label: "Reset Filter",
              onClick: () => {
                setSearchTerm("");
                setPackageTypeFilter("all");
                setStatusFilter("all");
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => {
              const upcoming = getUpcomingDepartures(pkg.departures || []);
              const lowestPrice = getLowestPrice(pkg);
              
              return (
                <Card 
                  key={pkg.id} 
                  className={cn(
                    "group overflow-hidden rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col bg-card relative",
                    !pkg.is_active && "opacity-75 grayscale-[0.5]"
                  )}
                >
                  {/* Status Badges */}
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    {pkg.is_featured && (
                      <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" /> UNGGULAN
                      </Badge>
                    )}
                    {!pkg.is_active && (
                      <Badge variant="destructive" className="shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        NONAKTIF
                      </Badge>
                    )}
                  </div>

                  {/* Image Section */}
                  <div className="relative h-52 overflow-hidden">
                    {pkg.featured_image ? (
                      <img 
                        src={pkg.featured_image} 
                        alt={pkg.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md text-[10px] font-bold">
                        {pkg.package_type_ref?.name || formatPackageType(pkg.package_type)}
                      </Badge>
                      <h3 className="text-white font-black text-lg leading-tight line-clamp-2 drop-shadow-md">
                        {pkg.name}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col space-y-4">
                    {/* Price & Info */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Mulai Dari</p>
                        <p className="text-xl font-black text-primary">
                          {lowestPrice > 0 ? formatCurrency(lowestPrice) : 'Hubungi Kami'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Durasi</p>
                        <p className="text-sm font-bold text-foreground flex items-center justify-end gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {pkg.duration_days} Hari
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Hotel className="h-3.5 w-3.5" /></div>
                        <div className="truncate">
                          <span className="block font-bold text-foreground text-[9px] uppercase tracking-tighter">Hotel</span>
                          <span className="truncate block font-medium">{pkg.hotel_makkah?.name || '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Plane className="h-3.5 w-3.5" /></div>
                        <div className="truncate">
                          <span className="block font-bold text-foreground text-[9px] uppercase tracking-tighter">Pesawat</span>
                          <span className="truncate block font-medium">{pkg.airline?.name || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Summary */}
                    <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm">
                          <Calendar className="h-4 w-4 text-primary" />
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
                        <TooltipContent side="top" className="max-w-xs p-3 rounded-xl">
                          <p className="text-xs font-bold mb-1 uppercase tracking-wider">Jadwal Terdekat:</p>
                          {upcoming.length > 0 ? (
                            <div className="space-y-1">
                              {upcoming.slice(0, 3).map((d: any, idx: number) => (
                                <div key={idx} className="flex justify-between gap-4 text-[10px]">
                                  <span>{new Date(d.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  <span className="font-bold text-primary">{d.booked_count}/{d.quota} Pax</span>
                                </div>
                              ))}
                              {upcoming.length > 3 && <p className="text-[9px] text-center pt-1 border-t mt-1">+{upcoming.length - 3} lainnya</p>}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Belum ada jadwal aktif.</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex gap-2 mt-auto">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-bold text-[10px] gap-1.5 border-primary/20 hover:bg-primary/5 text-primary" asChild>
                        <Link to={`/admin/packages/${pkg.id}`}>
                          <Eye className="h-3.5 w-3.5" /> DETAIL
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(pkg)}
                        className="flex-1 rounded-xl h-10 font-bold text-[10px] gap-1.5 border-primary/20 hover:bg-primary/5 text-primary"
                      >
                        <Edit className="h-3.5 w-3.5" /> EDIT
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl p-1 w-48">
                          <DropdownMenuItem 
                            className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg"
                            onClick={() => toggleFeaturedMutation.mutate({ id: pkg.id, is_featured: !pkg.is_featured })}
                          >
                            <Star className={cn("h-4 w-4", pkg.is_featured ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
                            {pkg.is_featured ? 'Hapus Unggulan' : 'Jadikan Unggulan'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg"
                            onClick={() => toggleStatusMutation.mutate({ id: pkg.id, is_active: !pkg.is_active })}
                          >
                            {pkg.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 text-orange-500" />
                                Nonaktifkan Paket
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 text-emerald-500" />
                                Aktifkan Paket
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-xs font-semibold gap-2 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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
        )}

        {/* Package Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
            <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl" />
              
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner"><Package className="h-7 w-7" /></div>
                  {editingPackage ? 'Konfigurasi Paket' : 'Pendaftaran Paket Baru'}
                </DialogTitle>
                <p className="text-primary-foreground/80 text-sm font-medium mt-2 max-w-xl">
                  {editingPackage ? `Memperbarui data paket ${editingPackage.code}. Pastikan informasi yang dimasukkan sudah sesuai dengan standar operasional.` : 'Lengkapi detail paket perjalanan untuk mulai dipublikasikan ke calon jamaah.'}
                </p>
              </DialogHeader>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(95vh-180px)] custom-scrollbar bg-background">
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
          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-red-50 p-6 rounded-full text-red-500 shadow-inner">
                <AlertCircle className="h-12 w-12" />
              </div>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-3xl font-black text-foreground">Hapus Paket Ini?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-medium text-base">
                  Anda akan menghapus paket <strong className="text-foreground font-bold">{deletePackage?.name}</strong> secara permanen. Tindakan ini tidak dapat dibatalkan dan akan berdampak pada data riwayat yang terkait.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="w-full flex sm:flex-row gap-4 pt-6">
                <AlertDialogCancel className="flex-1 rounded-2xl h-14 font-bold border-muted hover:bg-muted/50 transition-all">BATALKAN</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteMutation.mutate(deletePackage.id)}
                  className="flex-1 rounded-2xl h-14 font-bold bg-red-500 hover:bg-red-600 text-white border-none shadow-xl shadow-red-100 transition-all"
                >
                  YA, HAPUS PERMANEN
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

