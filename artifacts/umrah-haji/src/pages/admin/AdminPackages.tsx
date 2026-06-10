import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPackageType } from "@/lib/format";
import { useState, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Search, Plus, Edit, Eye, Package, Trash2, Calendar, Filter, X, Copy,
  MoreHorizontal, Star, Info, Hotel, Plane, Clock, CheckCircle2, AlertCircle,
  Power, PowerOff, ChevronDown, Layers, TrendingUp, DollarSign, Users, Zap,
  ArrowUpRight, ArrowDownRight, Download, FileSpreadsheet, FileText,
  AlertTriangle, CheckSquare, Square, BarChart3, LayoutGrid, List,
  Tag, FolderOpen
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
import { usePrefetchAdminRoutes } from "@/hooks/usePrefetchAdminRoutes";
const RegularPackageForm = lazy(() =>
  import("@/components/admin/forms/RegularPackageForm").then(m => ({ default: m.RegularPackageForm }))
);
const SavingsPackageForm = lazy(() =>
  import("@/components/admin/forms/SavingsPackageForm").then(m => ({ default: m.SavingsPackageForm }))
);
const PackageTypeForm = lazy(() =>
  import("@/components/admin/forms/PackageTypeForm").then(m => ({ default: m.PackageTypeForm }))
);
const PackageLabelManagerDialog = lazy(() =>
  import("@/components/admin/packages/PackageLabelManagerDialog").then(m => ({ default: m.PackageLabelManagerDialog }))
);
const PackageLabelAssignDialog = lazy(() =>
  import("@/components/admin/packages/PackageLabelAssignDialog").then(m => ({ default: m.PackageLabelAssignDialog }))
);
const DepartureForm = lazy(() =>
  import("@/components/admin/forms/DepartureForm").then(m => ({ default: m.DepartureForm }))
);

const FormFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);
import { PackageLabelBadges } from "@/components/packages/PackageLabelBadges";
import { usePackageLabelsMap } from "@/hooks/usePackageLabels";
import { toast } from "sonner";
import { usePackageStats, PackageStatsFilters } from "@/hooks/usePackageStats";
import { usePackageAnalytics } from "@/hooks/usePackageAnalytics";
import { subDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
// NOTE: jsPDF, jspdf-autotable, xlsx (via export-utils*) adalah dependency besar.
// Sengaja dipakai lewat dynamic import() di handler agar tidak ikut ke chunk awal halaman ini.

export default function AdminPackages() {
  usePrefetchAdminRoutes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deletePackage, setDeletePackage] = useState<any>(null);
  const [packageTypeFilter, setPackageTypeFilter] = useState<"all" | "regular" | "tabungan">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "almost_full" | "soon">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [statsFilters, setStatsFilters] = useState<PackageStatsFilters>({});
  const [selectedDateRange, setSelectedDateRange] = useState<"7days" | "30days" | "90days" | "custom">("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("packages");
  const [groupedView, setGroupedView] = useState(false);
  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeSearchTerm, setTypeSearchTerm] = useState("");
  const [deleteType, setDeleteType] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isManifestDialogOpen, setIsManifestDialogOpen] = useState(false);
  const [selectedPackageForManifest, setSelectedPackageForManifest] = useState<any>(null);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [labelAssignFor, setLabelAssignFor] = useState<{ id: string; name: string } | null>(null);
  const [addJadwalFor, setAddJadwalFor] = useState<{ id: string; name: string } | null>(null);
  // P3.2 — Package Groups
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [deleteGroup, setDeleteGroup] = useState<any>(null);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", slug: "", color: "#6366f1", description: "", display_order: 0 });
  const [assignGroupFor, setAssignGroupFor] = useState<any>(null);
  const { data: labelsMap } = usePackageLabelsMap();
  
  const queryClient = useQueryClient();
  const { data: stats, isLoading: isStatsLoading } = usePackageStats(statsFilters);
  const { data: analytics, isLoading: isAnalyticsLoading } = usePackageAnalytics();
  
  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          departures(id, departure_date, quota, booked_count, status, price_quad, price_triple, price_double, price_single)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[admin-packages] query error:', error);
        throw error;
      }
      return data;
    },
  });

  const { data: packageGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["admin-package-groups"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("package_groups")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  // Fetch which departure IDs already have HPP cost items
  const { data: departuresWithHPP = [] } = useQuery({
    queryKey: ['departures-with-hpp'],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from('departure_cost_items')
        .select('departure_id')
        .limit(5000);
      if (error) return [];
      return [...new Set((data || []).map((r: any) => r.departure_id))] as string[];
    },
  });

  const { data: packageTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["admin-package-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_types")
        .select("*")
        .order("display_order", { ascending: true });
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

  const bulkToggleStatusMutation = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[], is_active: boolean }) => {
      const { error } = await supabase
        .from('packages')
        .update({ is_active })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.ids.length} paket berhasil ${variables.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      setSelectedPackages([]);
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

  const duplicatePackageMutation = useMutation({
    mutationFn: async (pkg: any) => {
      const newCode = `${pkg.code}-COPY${Date.now().toString().slice(-4)}`;
      const payload: any = {
        name: `${pkg.name} - Salinan`,
        code: newCode,
        package_type: pkg.package_type,
        package_type_id: pkg.package_type_id ?? null,
        duration_days: pkg.duration_days,
        description: pkg.description,
        price_quad: pkg.price_quad,
        price_triple: pkg.price_triple,
        price_double: pkg.price_double,
        price_single: pkg.price_single,
        airline_id: pkg.airline_id ?? null,
        hotel_makkah_id: pkg.hotel_makkah_id ?? null,
        hotel_madinah_id: pkg.hotel_madinah_id ?? null,
        muthawif_id: pkg.muthawif_id ?? null,
        includes: pkg.includes ?? [],
        excludes: pkg.excludes ?? [],
        itinerary: pkg.itinerary ?? [],
        featured_image: pkg.featured_image ?? null,
        is_active: false,
        is_featured: false,
      };
      const { error } = await supabase.from('packages').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paket berhasil diduplikasi (status nonaktif)");
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menduplikasi paket");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("package_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipe paket berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-package-types"] });
      setDeleteType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus tipe paket");
    },
  });

  // ── P3.2 Group mutations ─────────────────────────────────────────────────
  const saveGroupMutation = useMutation({
    mutationFn: async (form: typeof groupForm & { id?: string }) => {
      const db = supabase as any;
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-'),
        color: form.color,
        description: form.description.trim() || null,
        display_order: Number(form.display_order) || 0,
      };
      if (form.id) {
        const { error } = await db.from("package_groups").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("package_groups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingGroup ? "Grup diperbarui" : "Grup berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-package-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      setIsGroupFormOpen(false);
      setEditingGroup(null);
      setGroupForm({ name: "", slug: "", color: "#6366f1", description: "", display_order: 0 });
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan grup"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("package_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grup dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-package-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      setDeleteGroup(null);
    },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus grup"),
  });

  const assignGroupMutation = useMutation({
    mutationFn: async ({ packageId, groupId }: { packageId: string; groupId: string | null }) => {
      const { error } = await supabase.from("packages" as any).update({ group_id: groupId }).eq("id", packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grup paket diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      setAssignGroupFor(null);
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengatur grup"),
  });

  const getUpcomingDepartures = (departures: any[]) => {
    if (!departures) return [];
    const today = new Date().toISOString().split('T')[0];
    return departures.filter(d => d.departure_date >= today && d.status === 'open');
  };

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

      const upcoming = getUpcomingDepartures(pkg.departures || []);
      
      if (quickFilter === "almost_full") {
        const hasAlmostFull = upcoming.some(d => (d.quota - (d.booked_count || 0)) < 5);
        if (!hasAlmostFull) return false;
      }

      if (quickFilter === "soon") {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        
        const hasSoon = upcoming.some(d => {
          const depDate = new Date(d.departure_date);
          return depDate >= today && depDate <= thirtyDaysLater;
        });
        if (!hasSoon) return false;
      }

      // P3.2 — Group filter
      if (groupFilter !== "all") {
        const pg = (pkg as any).package_group;
        if (!pg || pg.id !== groupFilter) return false;
      }
      
      return true;
    }) || [];
  }, [packages, searchTerm, packageTypeFilter, statusFilter, quickFilter, groupFilter]);

  const filteredTypes = useMemo(() => {
    return packageTypes?.filter(t => 
      t.name.toLowerCase().includes(typeSearchTerm.toLowerCase()) || 
      t.code.toLowerCase().includes(typeSearchTerm.toLowerCase())
    ) || [];
  }, [packageTypes, typeSearchTerm]);

  const filteredGroups = useMemo(() => {
    return (packageGroups as any[]).filter(g =>
      g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
      (g.slug || "").toLowerCase().includes(groupSearchTerm.toLowerCase())
    );
  }, [packageGroups, groupSearchTerm]);

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

  const handleEditType = (type: any) => {
    setEditingType(type);
    setIsTypeFormOpen(true);
  };

  const handleTypeFormClose = () => {
    setIsTypeFormOpen(false);
    setEditingType(null);
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

  const handleExportPackages = async (type: 'excel' | 'pdf') => {
    if (!filteredPackages.length) return;
    setIsExporting(true);

    const columns = [
      { header: 'Kode', accessor: 'code', width: 12 },
      { header: 'Nama Paket', accessor: 'name', width: 35 },
      { header: 'Tipe', accessor: (r: any) => r.package_type_ref?.name || formatPackageType(r.package_type), width: 15 },
      { header: 'Durasi', accessor: (r: any) => `${r.duration_days} Hari`, width: 10 },
      { header: 'Harga Mulai', accessor: (r: any) => formatCurrency(getLowestPrice(r)), width: 20 },
      { header: 'Hotel Makkah', accessor: (r: any) => r.hotel_makkah?.name || '-', width: 25 },
      { header: 'Hotel Madinah', accessor: (r: any) => r.hotel_madinah?.name || '-', width: 25 },
      { header: 'Pesawat', accessor: (r: any) => r.airline?.name || '-', width: 20 },
      { header: 'Status', accessor: (r: any) => r.is_active ? 'Aktif' : 'Nonaktif', width: 12 },
    ];

    const filename = `Daftar_Paket_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    const title = 'Daftar Paket Perjalanan';
    const subtitle = `Total: ${filteredPackages.length} paket | Dicetak pada: ${format(new Date(), 'd MMMM yyyy', { locale: localeId })}`;

    try {
      if (type === 'excel') {
        const { exportToExcel } = await import("@/lib/export-utils");
        exportToExcel(filteredPackages, columns, filename, 'Packages');
      } else {
        const { exportToPDF } = await import("@/lib/export-utils");
        exportToPDF(filteredPackages, columns, filename, title, subtitle);
      }
      toast.success(`Daftar paket berhasil di-export ke ${type.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal melakukan export data');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadManifest = async (pkg: any) => {
    const upcoming = getUpcomingDepartures(pkg.departures || []);
    if (upcoming.length === 0) {
      toast.error("Tidak ada keberangkatan aktif untuk paket ini");
      return;
    }

    const departure = upcoming[0]; // Ambil yang terdekat
    
    // Fetch passengers for this departure
    const { data: passengers, error } = await supabase
      .from("booking_passengers")
      .select(`
        id, is_main_passenger, room_preference, passenger_type,
        customer:customers(id, full_name, gender, birth_date, passport_number, passport_expiry, phone),
        booking:bookings!inner(id, booking_code, room_type, booking_status, departure_id)
      `)
      .eq("booking.departure_id", departure.id)
      .eq("booking.booking_status", "confirmed");

    if (error) {
      toast.error("Gagal mengambil data jamaah");
      return;
    }

    if (!passengers || passengers.length === 0) {
      toast.error("Belum ada jamaah terdaftar untuk keberangkatan ini");
      return;
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Manifest Jamaah - ${pkg.name}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Berangkat: ${format(new Date(departure.departure_date), "dd MMMM yyyy", { locale: localeId })}`, 14, 28);
    doc.text(`Jumlah: ${passengers.length} jamaah`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [["No", "Nama Lengkap", "L/P", "No. Paspor", "Exp. Paspor", "Tipe Kamar", "Telepon"]],
      body: passengers.map((p, idx) => [
        (idx + 1).toString(),
        p.customer?.full_name || "-",
        p.customer?.gender === "male" ? "L" : "P",
        p.customer?.passport_number || "-",
        p.customer?.passport_expiry ? format(new Date(p.customer.passport_expiry), "dd/MM/yyyy") : "-",
        (p.booking?.room_type || "-").toUpperCase(),
        p.customer?.phone || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    doc.save(`Manifest-${pkg.name}-${departure.departure_date}.pdf`);
    toast.success("Manifest PDF berhasil di-download");
  };

  const toggleSelectPackage = (id: string) => {
    setSelectedPackages(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPackages.length === filteredPackages.length) {
      setSelectedPackages([]);
    } else {
      setSelectedPackages(filteredPackages.map(p => p.id));
    }
  };

  // Count packages with warnings
  const packagesWithLowQuota = filteredPackages.filter(pkg => {
    const upcoming = getUpcomingDepartures(pkg.departures || []);
    return upcoming.some(d => (d.quota - (d.booked_count || 0)) < 5);
  }).length;

  const packagesWithMissingData = filteredPackages.filter(pkg => 
    pkg.is_active && (!pkg.departures || pkg.departures.length === 0)
  ).length;

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
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl border-primary/20 text-primary">
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-56">
                <DropdownMenuItem onClick={() => handleExportPackages('excel')} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Daftar Paket (Excel)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPackages('pdf')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span>Daftar Paket (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  const m = await import("@/lib/export-utils-enhanced");
                  m.exportCapacityStatsToExcel(filteredPackages);
                }} className="gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>Statistik Kapasitas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const m = await import("@/lib/export-utils-enhanced");
                  m.exportDepartureScheduleToExcel(filteredPackages);
                }} className="gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span>Jadwal Keberangkatan</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  const m = await import("@/lib/export-utils-enhanced");
                  m.exportPackageSummaryPDF(filteredPackages);
                }} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Laporan Ringkas (PDF)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleAddPackage("regular")} className="gap-2 shadow-sm bg-primary hover:bg-primary/90 rounded-xl">
              <Plus className="h-4 w-4" />
              Paket Reguler
            </Button>
            <Button onClick={() => handleAddPackage("tabungan")} variant="outline" className="gap-2 shadow-sm rounded-xl border-primary/20 text-primary">
              <Plus className="h-4 w-4" />
              Paket Tabungan
            </Button>
            <Button onClick={() => setIsLabelManagerOpen(true)} variant="outline" className="gap-2 shadow-sm rounded-xl">
              <Star className="h-4 w-4" />
              Kelola Label
            </Button>
          </div>
        </div>

        {/* Alert Badges for Warnings */}
        {(packagesWithLowQuota > 0 || packagesWithMissingData > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {packagesWithLowQuota > 0 && (
              <Card className="border-rose-200/50 bg-rose-50/50 backdrop-blur rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rose-900">Kuota Menipis</p>
                    <p className="text-xs text-rose-700">{packagesWithLowQuota} paket memiliki kuota kurang dari 5 pax</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {packagesWithMissingData > 0 && (
              <Card className="border-amber-200/50 bg-amber-50/50 backdrop-blur rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">Data Tidak Lengkap</p>
                    <p className="text-xs text-amber-700">{packagesWithMissingData} paket aktif tanpa jadwal keberangkatan</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Analytics Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsCard
            title="Total Paket"
            value={analytics?.totalPackages || 0}
            description="Paket aktif dan nonaktif"
            icon={Package}
            loading={isAnalyticsLoading}
            color="primary"
          />
          <AnalyticsCard
            title="Paket Aktif"
            value={analytics?.activePackages || 0}
            description={`${analytics?.inactivePackages || 0} paket nonaktif`}
            icon={CheckCircle2}
            loading={isAnalyticsLoading}
            color="emerald"
            trend={analytics?.activePackages ? `${((analytics.activePackages / (analytics.totalPackages || 1)) * 100).toFixed(0)}%` : "0%"}
            trendUp={true}
          />
          <AnalyticsCard
            title="Total Keberangkatan"
            value={analytics?.totalDepartures || 0}
            description={`${analytics?.openDepartures || 0} keberangkatan terbuka`}
            icon={Plane}
            loading={isAnalyticsLoading}
            color="blue"
          />
          <AnalyticsCard
            title="Kapasitas Tersedia"
            value={analytics?.availableCapacity || 0}
            description={`${analytics?.capacityUtilization || 0}% terisi`}
            icon={Users}
            loading={isAnalyticsLoading}
            color="amber"
            trend={`${analytics?.capacityUtilization || 0}%`}
            trendUp={analytics?.capacityUtilization ? analytics.capacityUtilization < 80 : false}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="packages" className="rounded-lg gap-2">
              <Package className="h-4 w-4" />
              Daftar Paket
            </TabsTrigger>
            <TabsTrigger value="types" className="rounded-lg gap-2">
              <Layers className="h-4 w-4" />
              Tipe Paket
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg gap-2">
              <FolderOpen className="h-4 w-4" />
              Grup Paket
            </TabsTrigger>
          </TabsList>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6 mt-6">
            {/* Quick Action Tabs */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
              <Button 
                variant={quickFilter === "all" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setQuickFilter("all")}
                className="rounded-full px-4 h-9"
              >
                Semua Paket
              </Button>
              <Button 
                variant={quickFilter === "almost_full" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setQuickFilter("almost_full")}
                className={cn(
                  "rounded-full px-4 h-9 gap-2",
                  quickFilter !== "almost_full" && "border-rose-200 text-rose-600 hover:bg-rose-50"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                Hampir Penuh
                {packages?.some(p => getUpcomingDepartures(p.departures || []).some(d => (d.quota - (d.booked_count || 0)) < 5)) && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </Button>
              <Button 
                variant={quickFilter === "soon" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setQuickFilter("soon")}
                className={cn(
                  "rounded-full px-4 h-9 gap-2",
                  quickFilter !== "soon" && "border-amber-200 text-amber-600 hover:bg-amber-50"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Segera Berangkat
              </Button>
              </div>
              {/* P3.2 — Grouped View Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={groupedView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupedView(g => !g)}
                    className="rounded-full px-3 h-9 gap-2"
                  >
                    {groupedView ? <List className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{groupedView ? "Grid Biasa" : "Per Grup"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{groupedView ? "Tampilkan grid biasa" : "Kelompokkan berdasarkan grup paket"}</TooltipContent>
              </Tooltip>
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
                    {packageGroups.length > 0 && (
                      <Select value={groupFilter} onValueChange={setGroupFilter}>
                        <SelectTrigger className="w-[150px] h-11 rounded-xl border-none bg-background shadow-sm">
                          <SelectValue placeholder="Grup Paket" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Semua Grup</SelectItem>
                          {packageGroups.map((g: any) => (
                            <SelectItem key={g.id} value={g.id}>
                              <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full inline-block shrink-0" style={{ background: g.color }} />
                                {g.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedPackages.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {selectedPackages.length}
                  </div>
                  <span className="text-sm font-medium">Paket terpilih</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => bulkToggleStatusMutation.mutate({ ids: selectedPackages, is_active: true })}
                    className="rounded-xl gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Power className="h-4 w-4" /> Aktifkan
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => bulkToggleStatusMutation.mutate({ ids: selectedPackages, is_active: false })}
                    className="rounded-xl gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <PowerOff className="h-4 w-4" /> Nonaktifkan
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setSelectedPackages([])}
                    className="rounded-xl"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleSelectAll}
                className="text-xs font-bold gap-2 text-muted-foreground hover:text-primary"
              >
                {selectedPackages.length === filteredPackages.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                PILIH SEMUA
              </Button>
            </div>

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
              />
            ) : groupedView ? (
              /* P3.2 — Grouped view by package group */
              <div className="space-y-8">
                {(() => {
                  const grouped: Record<string, { label: string; color: string; pkgs: any[] }> = {};
                  filteredPackages.forEach(p => {
                    const pg = (p as any).package_group;
                    const key = pg?.id || "__ungrouped";
                    if (!grouped[key]) grouped[key] = { label: pg?.name || "Tanpa Grup", color: pg?.color || "#94a3b8", pkgs: [] };
                    grouped[key].pkgs.push(p);
                  });
                  return Object.entries(grouped).map(([key, { label, color, pkgs }]) => (
                    <div key={key} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-1 rounded-full" style={{ background: color }} />
                        <span className="h-3 w-3 rounded-full inline-block" style={{ background: color }} />
                        <h3 className="text-base font-bold text-foreground">{label}</h3>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{pkgs.length} paket</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pkgs.map((pkg: any) => {
                  const upcoming = getUpcomingDepartures(pkg.departures || []);
                  const lowestPrice = getLowestPrice(pkg);
                  const isSelected = selectedPackages.includes(pkg.id);
                  
                  // Progress calculation for the closest departure
                  const mainDep = upcoming[0];
                  const occupancyRate = mainDep ? (mainDep.booked_count / mainDep.quota) * 100 : 0;
                  const remainingQuota = mainDep ? mainDep.quota - mainDep.booked_count : 0;
                  const isLowQuota = remainingQuota > 0 && remainingQuota < 5;
                  const hasNoDepartures = !pkg.departures || pkg.departures.length === 0;
                  
                  // HPP badge: any upcoming departure that doesn't have cost items yet
                  const upcomingMissingHPP = upcoming.filter((d: any) => !departuresWithHPP.includes(d.id));
                  const hasMissingHPP = upcomingMissingHPP.length > 0;

                  // Determine progress bar color based on occupancy
                  let progressColor = "bg-emerald-500"; // Green - Safe
                  let progressLabel = "Aman";
                  if (occupancyRate > 90) {
                    progressColor = "bg-rose-500"; // Red - Almost Full
                    progressLabel = "Hampir Penuh";
                  } else if (occupancyRate > 50) {
                    progressColor = "bg-amber-500"; // Yellow - Half
                    progressLabel = "Setengah";
                  }

                  return (
                    <Card 
                      key={pkg.id} 
                      className={cn(
                        "group overflow-hidden rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col bg-card relative",
                        !pkg.is_active && "opacity-75 grayscale-[0.5]",
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      {/* Selection Overlay */}
                      <div 
                        className={cn(
                          "absolute top-4 right-4 z-20 cursor-pointer transition-transform hover:scale-110",
                          isSelected ? "text-primary" : "text-white/50 group-hover:text-white"
                        )}
                        onClick={() => toggleSelectPackage(pkg.id)}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-6 w-6" />
                        ) : (
                          <Square className="h-6 w-6" />
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        {(pkg as any).package_group && (
                          <Badge className="text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1" style={{ background: (pkg as any).package_group.color }}>
                            <Tag className="h-3 w-3" /> {(pkg as any).package_group.name}
                          </Badge>
                        )}
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
                        {isLowQuota && (
                          <Badge className="bg-rose-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase animate-pulse flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> KUOTA MENIPIS
                          </Badge>
                        )}
                        {hasNoDepartures && pkg.is_active && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                <AlertTriangle className="h-3 w-3 mr-1" /> DATA TIDAK LENGKAP
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Paket aktif tetapi belum memiliki jadwal keberangkatan</TooltipContent>
                          </Tooltip>
                        )}
                        {hasMissingHPP && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-violet-500/90 hover:bg-violet-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> HPP BELUM DIISI
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{upcomingMissingHPP.length} keberangkatan belum ada data HPP/modal</TooltipContent>
                          </Tooltip>
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

                        {/* Harga Anak / Bayi */}
                        {((pkg as any).child_price_percent || (pkg as any).infant_price_percent) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {(pkg as any).child_price_percent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 rounded-full px-2 py-0.5">
                                Anak {(pkg as any).child_price_percent}%
                              </span>
                            )}
                            {(pkg as any).infant_price_percent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 rounded-full px-2 py-0.5">
                                Bayi {(pkg as any).infant_price_percent}%
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground">dari harga kamar</span>
                          </div>
                        )}

                        {/* Quota Progress Bar - Enhanced */}
                        {mainDep && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Keterisian Kuota</p>
                                <p className={cn(
                                  "text-xs font-bold",
                                  occupancyRate > 90 ? "text-rose-600" : 
                                  occupancyRate > 50 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {progressLabel}
                                </p>
                              </div>
                              <span className={cn(
                                "text-xs font-bold px-2 py-1 rounded-full",
                                occupancyRate > 90 ? "bg-rose-100 text-rose-600" : 
                                occupancyRate > 50 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                              )}>
                                {mainDep.booked_count} / {mainDep.quota} PAX
                              </span>
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={occupancyRate} 
                                className="h-3 bg-slate-100 rounded-full" 
                                indicatorClassName={cn(
                                  "rounded-full transition-all",
                                  progressColor
                                )}
                              />
                              <div className="flex justify-between text-[9px] text-muted-foreground">
                                <span>0%</span>
                                <span>{occupancyRate.toFixed(0)}%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </div>
                        )}

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
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                                  onClick={() => downloadManifest(pkg)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download Manifest Jamaah</TooltipContent>
                            </Tooltip>
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
                                onClick={() => setLabelAssignFor({ id: pkg.id, name: pkg.name })}
                              >
                                <Star className="h-4 w-4 text-primary" />
                                Atur Label
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
                              <DropdownMenuItem
                                className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg"
                                onClick={() => setAddJadwalFor({ id: pkg.id, name: pkg.name })}
                              >
                                <Calendar className="h-4 w-4 text-emerald-500" /> Tambah Jadwal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg"
                                onClick={() => duplicatePackageMutation.mutate(pkg)}
                                disabled={duplicatePackageMutation.isPending}
                              >
                                <Copy className="h-4 w-4 text-blue-500" /> Duplikat Paket
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg"
                                onClick={() => setAssignGroupFor(pkg)}
                              >
                                <Tag className="h-4 w-4 text-indigo-500" /> Atur Grup
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
            </div>
          ));
        })()}
      </div>
            ) : (
              /* Flat grid (default view) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPackages.map((pkg) => {
                  const upcoming = getUpcomingDepartures(pkg.departures || []);
                  const lowestPrice = getLowestPrice(pkg);
                  const isSelected = selectedPackages.includes(pkg.id);
                  const mainDep = upcoming[0];
                  const occupancyRate = mainDep ? (mainDep.booked_count / mainDep.quota) * 100 : 0;
                  const remainingQuota = mainDep ? mainDep.quota - mainDep.booked_count : 0;
                  const isLowQuota = remainingQuota > 0 && remainingQuota < 5;
                  const hasNoDepartures = !pkg.departures || pkg.departures.length === 0;
                  const upcomingMissingHPP = upcoming.filter((d: any) => !departuresWithHPP.includes(d.id));
                  const hasMissingHPP = upcomingMissingHPP.length > 0;
                  let progressColor = "bg-emerald-500";
                  let progressLabel = "Aman";
                  if (occupancyRate > 90) { progressColor = "bg-rose-500"; progressLabel = "Hampir Penuh"; }
                  else if (occupancyRate > 50) { progressColor = "bg-amber-500"; progressLabel = "Setengah"; }

                  return (
                    <Card
                      key={pkg.id}
                      className={cn(
                        "group overflow-hidden rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col bg-card relative",
                        !pkg.is_active && "opacity-75 grayscale-[0.5]",
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <div className={cn("absolute top-4 right-4 z-20 cursor-pointer transition-transform hover:scale-110", isSelected ? "text-primary" : "text-white/50 group-hover:text-white")} onClick={() => toggleSelectPackage(pkg.id)}>
                        {isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                      </div>
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        {(pkg as any).package_group && <Badge className="text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1" style={{ background: (pkg as any).package_group.color }}><Tag className="h-3 w-3" /> {(pkg as any).package_group.name}</Badge>}
                        {pkg.is_featured && <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> UNGGULAN</Badge>}
                        {!pkg.is_active && <Badge variant="destructive" className="shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">NONAKTIF</Badge>}
                        {isLowQuota && <Badge className="bg-rose-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> KUOTA MENIPIS</Badge>}
                        {hasNoDepartures && pkg.is_active && <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"><AlertTriangle className="h-3 w-3 mr-1" /> DATA TIDAK LENGKAP</Badge></TooltipTrigger><TooltipContent>Paket aktif tetapi belum memiliki jadwal keberangkatan</TooltipContent></Tooltip>}
                        {hasMissingHPP && <Tooltip><TooltipTrigger asChild><Badge className="bg-violet-500/90 hover:bg-violet-500 text-white border-none shadow-lg backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" /> HPP BELUM DIISI</Badge></TooltipTrigger><TooltipContent>{upcomingMissingHPP.length} keberangkatan belum ada data HPP/modal</TooltipContent></Tooltip>}
                      </div>
                      <div className="relative h-52 overflow-hidden">
                        {pkg.featured_image ? (
                          <img src={pkg.featured_image} alt={pkg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground/20" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{pkg.package_type ? formatPackageType(pkg.package_type) : '—'}</p>
                          <p className="text-white font-bold text-lg leading-snug line-clamp-2">{pkg.name}</p>
                        </div>
                      </div>
                      <CardContent className="p-5 flex flex-col gap-4 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {lowestPrice !== null ? (
                              <p className="text-2xl font-extrabold tracking-tight text-primary">{formatCurrency(lowestPrice)}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Harga belum diatur</p>
                            )}
                            <p className="text-[10px] text-muted-foreground font-medium">per jamaah, mulai dari</p>
                          </div>
                          {pkg.duration_days && <span className="shrink-0 flex items-center gap-1 text-[11px] bg-primary/10 text-primary rounded-full px-2.5 py-1 font-bold"><Clock className="h-3 w-3" />{pkg.duration_days}H</span>}
                        </div>
                        {mainDep && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><div className={cn("h-2 w-2 rounded-full", occupancyRate > 90 ? "bg-rose-500 animate-pulse" : occupancyRate > 50 ? "bg-amber-500" : "bg-emerald-500")} /><p className={cn("text-xs font-bold", occupancyRate > 90 ? "text-rose-600" : occupancyRate > 50 ? "text-amber-600" : "text-emerald-600")}>{progressLabel}</p></div>
                              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", occupancyRate > 90 ? "bg-rose-100 text-rose-600" : occupancyRate > 50 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>{mainDep.booked_count} / {mainDep.quota} PAX</span>
                            </div>
                            <div className="space-y-1"><Progress value={occupancyRate} className="h-3 bg-slate-100 rounded-full" indicatorClassName={cn("rounded-full transition-all", progressColor)} /><div className="flex justify-between text-[9px] text-muted-foreground"><span>0%</span><span>{occupancyRate.toFixed(0)}%</span><span>100%</span></div></div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Hotel className="h-3.5 w-3.5" /></div><div className="truncate"><span className="block font-bold text-foreground text-[9px] uppercase tracking-tighter">Hotel</span><span className="truncate block font-medium">{pkg.hotel_makkah?.name || '-'}</span></div></div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Plane className="h-3.5 w-3.5" /></div><div className="truncate"><span className="block font-bold text-foreground text-[9px] uppercase tracking-tighter">Pesawat</span><span className="truncate block font-medium">{pkg.airline?.name || '-'}</span></div></div>
                        </div>
                        <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm"><Calendar className="h-4 w-4 text-primary" /></div><div><p className="text-[10px] font-bold text-foreground uppercase">Jadwal Aktif</p><p className="text-xs text-muted-foreground font-medium">{upcoming.length} Keberangkatan</p></div></div>
                          <div className="flex items-center gap-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => downloadManifest(pkg)}><FileText className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Download Manifest Jamaah</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => setAddJadwalFor({ id: pkg.id, name: pkg.name })}><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Tambah Jadwal Keberangkatan</TooltipContent></Tooltip>
                          </div>
                        </div>
                        <div className="pt-2 flex gap-2 mt-auto">
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-bold text-[10px] gap-1.5 border-primary/20 hover:bg-primary/5 text-primary" asChild><Link to={`/admin/packages/${pkg.id}`}><Eye className="h-3.5 w-3.5" /> DETAIL</Link></Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)} className="flex-1 rounded-xl h-10 font-bold text-[10px] gap-1.5 border-primary/20 hover:bg-primary/5 text-primary"><Edit className="h-3.5 w-3.5" /> EDIT</Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-primary/20 hover:bg-primary/5 text-primary"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl p-1 w-48">
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => toggleFeaturedMutation.mutate({ id: pkg.id, is_featured: !pkg.is_featured })}><Star className={cn("h-4 w-4", pkg.is_featured ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />{pkg.is_featured ? 'Hapus Unggulan' : 'Jadikan Unggulan'}</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => setLabelAssignFor({ id: pkg.id, name: pkg.name })}><Star className="h-4 w-4 text-primary" />Atur Label</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => toggleStatusMutation.mutate({ id: pkg.id, is_active: !pkg.is_active })}>{pkg.is_active ? (<><PowerOff className="h-4 w-4 text-orange-500" />Nonaktifkan Paket</>) : (<><Power className="h-4 w-4 text-emerald-500" />Aktifkan Paket</>)}</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => setAddJadwalFor({ id: pkg.id, name: pkg.name })}><Calendar className="h-4 w-4 text-emerald-500" /> Tambah Jadwal</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => duplicatePackageMutation.mutate(pkg)} disabled={duplicatePackageMutation.isPending}><Copy className="h-4 w-4 text-blue-500" /> Duplikat Paket</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer rounded-lg" onClick={() => setAssignGroupFor(pkg)}><Tag className="h-4 w-4 text-indigo-500" /> Atur Grup</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs font-semibold gap-2 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg" onClick={() => setDeletePackage(pkg)}><Trash2 className="h-4 w-4" /> Hapus Permanen</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Package Types Tab */}
          <TabsContent value="types" className="space-y-6 mt-6">
            {/* Search & Add Button */}
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari tipe paket..."
                      value={typeSearchTerm}
                      onChange={e => setTypeSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-background border-none shadow-inner rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>
                  <Button 
                    onClick={() => { setEditingType(null); setIsTypeFormOpen(true); }}
                    className="gap-2 shadow-sm bg-primary hover:bg-primary/90 rounded-xl whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Tipe
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Package Types Table */}
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Daftar Tipe Paket
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingTypes ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-primary/30 animate-pulse" />
                      Memuat data...
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50">
                          <TableHead className="w-[100px] font-bold">Urutan</TableHead>
                          <TableHead className="font-bold">Kode</TableHead>
                          <TableHead className="font-bold">Nama Tipe</TableHead>
                          <TableHead className="font-bold">Deskripsi</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="text-right font-bold">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTypes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Tidak ada tipe paket ditemukan
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTypes.map(type => (
                            <TableRow key={type.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium">{type.display_order}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{type.code}</TableCell>
                              <TableCell className="font-medium">{type.name}</TableCell>
                              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{type.description || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={type.is_active ? "default" : "secondary"} className="rounded-full">
                                  {type.is_active ? "Aktif" : "Nonaktif"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEditType(type)}
                                    className="rounded-lg h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setDeleteType(type)}
                                    className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Package Groups Tab */}
          <TabsContent value="groups" className="space-y-6 mt-6">
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari grup paket..."
                      value={groupSearchTerm}
                      onChange={e => setGroupSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-background border-none shadow-inner rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>
                  <Button
                    onClick={() => { setEditingGroup(null); setGroupForm({ name: "", slug: "", color: "#6366f1", description: "", display_order: 0 }); setIsGroupFormOpen(true); }}
                    className="gap-2 shadow-sm bg-primary hover:bg-primary/90 rounded-xl whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Grup
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Daftar Grup Paket
                  <Badge variant="secondary" className="ml-auto">{filteredGroups.length} grup</Badge>
                </CardTitle>
                <CardDescription>Kategorikan paket ke dalam grup untuk pengelompokan tampilan.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingGroups ? (
                  <div className="p-8 flex justify-center"><Skeleton className="h-32 w-full rounded-xl" /></div>
                ) : filteredGroups.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="Belum ada grup" description="Tambah grup pertama untuk mengelompokkan paket Anda." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="w-16 text-center">Urutan</TableHead>
                          <TableHead className="w-16">Warna</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                          <TableHead className="text-center">Jumlah Paket</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGroups.map((grp: any) => {
                          const count = (packages || []).filter((p: any) => (p as any).package_group?.id === grp.id).length;
                          return (
                            <TableRow key={grp.id} className="hover:bg-muted/20">
                              <TableCell className="text-center font-bold text-muted-foreground">{grp.display_order ?? "-"}</TableCell>
                              <TableCell>
                                <span className="inline-block h-6 w-6 rounded-full border-2 border-white shadow" style={{ background: grp.color }} title={grp.color} />
                              </TableCell>
                              <TableCell className="font-bold">{grp.name}</TableCell>
                              <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">{grp.slug}</code></TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{grp.description || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{count} paket</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setEditingGroup(grp); setGroupForm({ name: grp.name, slug: grp.slug, color: grp.color, description: grp.description || "", display_order: grp.display_order ?? 0 }); setIsGroupFormOpen(true); }} className="rounded-lg h-8 w-8 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => setDeleteGroup(grp)} className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forms & Dialogs */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 bg-primary text-white sticky top-0 z-10">
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <Package className="h-6 w-6" />
                {editingPackage ? 'Edit Paket' : 'Tambah Paket Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <Suspense fallback={<FormFallback />}>
                {packageTypeFilter === "tabungan" ? (
                  <SavingsPackageForm 
                    packageData={editingPackage} 
                    onSuccess={() => {
                      handleFormClose();
                      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
                    }}
                    onCancel={handleFormClose}
                  />
                ) : (
                  <RegularPackageForm 
                    packageData={editingPackage} 
                    onSuccess={() => {
                      handleFormClose();
                      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
                    }}
                    onCancel={handleFormClose}
                  />
                )}
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isTypeFormOpen} onOpenChange={handleTypeFormClose}>
          <DialogContent className="max-w-lg rounded-3xl p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 bg-primary text-white">
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <Layers className="h-6 w-6" />
                {editingType ? "Edit Tipe Paket" : "Tambah Tipe Paket"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <Suspense fallback={<FormFallback />}>
                <PackageTypeForm
                  packageTypeData={editingType}
                  onSuccess={() => {
                    handleTypeFormClose();
                    queryClient.invalidateQueries({ queryKey: ["admin-package-types"] });
                  }}
                  onCancel={handleTypeFormClose}
                />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Hapus Paket?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Paket <strong>{deletePackage?.name}</strong> akan dihapus secara permanen dari sistem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate(deletePackage.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Hapus Permanen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Hapus Tipe Paket?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus tipe paket <strong>{deleteType?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTypeMutation.mutate(deleteType.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLabelManagerOpen && (
          <Suspense fallback={null}>
            <PackageLabelManagerDialog
              open={isLabelManagerOpen}
              onOpenChange={setIsLabelManagerOpen}
            />
          </Suspense>
        )}
        {!!labelAssignFor && (
          <Suspense fallback={null}>
            <PackageLabelAssignDialog
              open={!!labelAssignFor}
              onOpenChange={(v) => !v && setLabelAssignFor(null)}
              packageId={labelAssignFor?.id ?? null}
              packageName={labelAssignFor?.name}
            />
          </Suspense>
        )}

        {!!addJadwalFor && (
          <Dialog open={!!addJadwalFor} onOpenChange={(v) => !v && setAddJadwalFor(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Jadwal — {addJadwalFor?.name}</DialogTitle>
              </DialogHeader>
              <Suspense fallback={<FormFallback />}>
                <DepartureForm
                  packageId={addJadwalFor?.id}
                  onSuccess={() => setAddJadwalFor(null)}
                  onCancel={() => setAddJadwalFor(null)}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        )}

        {/* Group Form Dialog */}
        <Dialog open={isGroupFormOpen} onOpenChange={v => { if (!v) { setIsGroupFormOpen(false); setEditingGroup(null); } }}>
          <DialogContent className="max-w-lg rounded-3xl p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 bg-primary text-white rounded-t-3xl">
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                {editingGroup ? "Edit Grup Paket" : "Tambah Grup Paket"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nama Grup <span className="text-destructive">*</span></label>
                <Input
                  value={groupForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                    setGroupForm(f => ({ ...f, name, slug: editingGroup ? f.slug : slug }));
                  }}
                  placeholder="misal: Paket Premium"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Slug</label>
                <Input
                  value={groupForm.slug}
                  onChange={e => setGroupForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="misal: premium"
                  className="rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Warna</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={groupForm.color}
                    onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))}
                    className="h-10 w-16 rounded-lg border border-border cursor-pointer"
                  />
                  <Input
                    value={groupForm.color}
                    onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))}
                    className="rounded-xl font-mono text-sm flex-1"
                    placeholder="#6366f1"
                  />
                  <span className="inline-block h-8 w-8 rounded-full border-2 border-white shadow-md" style={{ background: groupForm.color }} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Deskripsi</label>
                <Input
                  value={groupForm.description}
                  onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi singkat grup (opsional)"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Urutan Tampil</label>
                <Input
                  type="number"
                  value={groupForm.display_order}
                  onChange={e => setGroupForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                  className="rounded-xl"
                  min={0}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setIsGroupFormOpen(false); setEditingGroup(null); }}>Batal</Button>
                <Button
                  className="flex-1 rounded-xl bg-primary"
                  disabled={!groupForm.name || saveGroupMutation.isPending}
                  onClick={() => saveGroupMutation.mutate(editingGroup ? { ...groupForm, id: editingGroup.id } : groupForm)}
                >
                  {saveGroupMutation.isPending ? "Menyimpan..." : (editingGroup ? "Simpan Perubahan" : "Tambah Grup")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Group AlertDialog */}
        <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Hapus Grup Paket?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus grup <strong>{deleteGroup?.name}</strong>? Paket yang tergabung dalam grup ini tidak akan terhapus, tetapi akan kehilangan grup-nya.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteGroupMutation.mutate(deleteGroup.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Hapus Grup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Assign Group Dialog */}
        {!!assignGroupFor && (
          <Dialog open={!!assignGroupFor} onOpenChange={v => { if (!v) setAssignGroupFor(null); }}>
            <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl p-0">
              <DialogHeader className="p-6 bg-primary text-white rounded-t-3xl">
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Atur Grup Paket
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">Pilih grup untuk paket <strong>{assignGroupFor?.name}</strong>.</p>
                <Select
                  value={(assignGroupFor as any).group_id || "__none"}
                  onValueChange={val => setAssignGroupFor((prev: any) => ({ ...prev, group_id: val === "__none" ? null : val }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Pilih grup..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Tanpa Grup —</SelectItem>
                    {(packageGroups as any[]).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ background: g.color }} />
                          {g.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAssignGroupFor(null)}>Batal</Button>
                  <Button
                    className="flex-1 rounded-xl bg-primary"
                    disabled={assignGroupMutation.isPending}
                    onClick={() => assignGroupMutation.mutate({ packageId: assignGroupFor.id, groupId: (assignGroupFor as any).group_id || null })}
                  >
                    {assignGroupMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}

function AnalyticsCard({ title, value, description, icon: Icon, loading, color, trend, trendUp }: any) {
  const colorMap: any = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden rounded-3xl bg-card/50 backdrop-blur group hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-foreground">{value}</h3>
                {trend && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                    trendUp ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                  )}>
                    {trendUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                    {trend}
                  </span>
                )}
              </div>
            )}
            <p className="text-[10px] font-medium text-muted-foreground line-clamp-1">{description}</p>
          </div>
          <div className={cn("p-3 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
