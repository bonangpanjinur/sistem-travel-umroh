import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Plus, Check, Users, Box, BarChart3, Package as PackageIcon,
  Loader2, AlertTriangle, User, ChevronRight, Settings, Database
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { EquipmentDistributionDialog } from "@/components/operational/equipment/EquipmentDistributionDrawer";
import { AddStockDialog } from "@/components/operational/equipment/AddStockDialog";
import { MasterDataTab } from "@/components/operational/equipment/MasterDataTab";
import { EquipmentRealizationTab } from "@/components/operational/equipment/EquipmentRealizationTab";
import { PrintManifest } from "@/components/operational/equipment/PrintManifest";

export interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
  category?: string;
  low_stock_threshold?: number;
}

export interface Distribution {
  id: string;
  equipment_id: string;
  customer_id: string;
  departure_id?: string;
  quantity: number;
  distributed_at: string;
  status?: string;
  equipment?: EquipmentItem;
  customer?: { full_name: string };
}

interface Passenger {
  id: string;
  customer_id: string;
  customer: { id: string; full_name: string; gender?: string | null };
  booking: { departure_id: string };
  is_main_passenger: boolean;
  passenger_type: string;
}

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [searchJamaah, setSearchJamaah] = useState("");
  const [selectedJamaah, setSelectedJamaah] = useState<Passenger | null>(null);
  const [isDistDialogOpen, setIsDistDialogOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addStockPreselect, setAddStockPreselect] = useState<string | undefined>();
  const [showMasterData, setShowMasterData] = useState(false);
  const [showRealization, setShowRealization] = useState(false);
  const [showManifest, setShowManifest] = useState(false);

  // Fetch packages
  const { data: packages } = useQuery({
    queryKey: ["packages-for-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, package_type")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch departures filtered by package
  const { data: departures } = useQuery({
    queryKey: ["departures-for-equipment", selectedPackage],
    queryFn: async () => {
      if (!selectedPackage) return [];
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, quota, booked_count, status")
        .eq("package_id", selectedPackage)
        .order("departure_date");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPackage,
  });

  // Fetch equipment items
  const { data: items } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  // Fetch passengers
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, customer_id,
          customer:customers(id, full_name, gender),
          booking:bookings!inner(departure_id),
          is_main_passenger, passenger_type
        `)
        .eq("booking.departure_id", selectedDeparture);
      if (error) throw error;
      return (data || []) as Passenger[];
    },
    enabled: !!selectedDeparture,
  });

  // Fetch distributions
  const { data: distributions } = useQuery({
    queryKey: ["equipment-distributions", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select(`*, equipment:equipment_items(*), customer:customers(full_name)`)
        .eq("departure_id", selectedDeparture)
        .eq("status", "distributed");
      if (error) throw error;
      return data as Distribution[];
    },
    enabled: !!selectedDeparture,
  });

  // Helpers
  const getApplicableItems = (gender?: string | null, passengerType?: string) => {
    if (!items) return [];
    return items.filter(item => {
      const cat = (item as any).category || 'general';
      if (cat === 'general') return true;
      if (cat === 'male_only' && (gender === 'male' || gender === 'Laki-laki')) return true;
      if (cat === 'female_only' && (gender === 'female' || gender === 'Perempuan')) return true;
      if (cat === 'child_only' && passengerType === 'child') return true;
      return false;
    });
  };

  const getJamaahStatus = (customerId: string, gender?: string | null, passengerType?: string) => {
    const applicable = getApplicableItems(gender, passengerType);
    if (!distributions || applicable.length === 0) return { completed: 0, total: applicable.length, pct: 0 };
    const completedIds = new Set(distributions.filter(d => d.customer_id === customerId).map(d => d.equipment_id));
    const completed = applicable.filter(i => completedIds.has(i.id)).length;
    return { completed, total: applicable.length, pct: applicable.length > 0 ? (completed / applicable.length) * 100 : 0 };
  };

  const getItemDistCount = (itemId: string) => distributions?.filter(d => d.equipment_id === itemId).length || 0;

  // Metrics
  const validPassengers = passengers || [];
  const totalJamaah = validPassengers.length;
  const totalItems = items?.length || 0;
  const totalDistributed = distributions?.length || 0;
  const jamaahComplete = validPassengers.filter(p => {
    const s = getJamaahStatus(p.customer_id, p.customer?.gender, p.passenger_type);
    return s.completed === s.total && s.total > 0;
  }).length;
  const overallPct = totalJamaah > 0 ? Math.round((jamaahComplete / totalJamaah) * 100) : 0;

  // Filter jamaah
  const filteredPassengers = validPassengers.filter(p =>
    p.customer.full_name.toLowerCase().includes(searchJamaah.toLowerCase())
  );

  // Bulk distribute
  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (!validPassengers.length || !items) return 0;
      const inserts: any[] = [];
      
      // Track virtual stock to prevent over-distribution in one bulk operation
      const virtualStock = new Map<string, number>();
      items.forEach(i => virtualStock.set(i.id, i.stock_quantity || 0));

      for (const p of validPassengers) {
        const applicable = getApplicableItems(p.customer?.gender, p.passenger_type);
        const existingIds = new Set(
          (distributions || []).filter(d => d.customer_id === p.customer_id).map(d => d.equipment_id)
        );
        for (const item of applicable) {
          const currentStock = virtualStock.get(item.id) || 0;
          if (!existingIds.has(item.id) && currentStock > 0) {
            inserts.push({
              equipment_id: item.id,
              customer_id: p.customer_id,
              quantity: 1,
            });
            virtualStock.set(item.id, currentStock - 1);
          }
        }
      }
      
      if (inserts.length === 0) throw new Error("Semua jamaah sudah lengkap atau stok habis");
      
      const { data, error } = await supabase.rpc('bulk_distribute_equipment', {
        p_departure_id: selectedDeparture,
        p_distributions: inserts
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`${count} item berhasil didistribusikan secara massal`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDist = (p: Passenger) => {
    setSelectedJamaah(p);
    setIsDistDialogOpen(true);
  };

  const handleStockClick = (itemId: string) => {
    setAddStockPreselect(itemId);
    setIsAddStockOpen(true);
  };

  const hasDeparture = !!selectedDeparture;
  const selectedPkgName = packages?.find(p => p.id === selectedPackage)?.name;
  const selectedDepDate = departures?.find(d => d.id === selectedDeparture);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Perlengkapan</h1>
          <p className="text-sm text-muted-foreground">Kelola & distribusi perlengkapan jamaah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRealization(true)}>
            <BarChart3 className="h-4 w-4 mr-1.5" /> Realisasi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowManifest(true)} disabled={!selectedDeparture}>
            <Search className="h-4 w-4 mr-1.5" /> Manifest
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMasterData(true)}>
            <Database className="h-4 w-4 mr-1.5" /> Kelola Item
          </Button>
          <Button size="sm" onClick={() => { setAddStockPreselect(undefined); setIsAddStockOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Stok
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pilih Paket</label>
            <Select value={selectedPackage} onValueChange={(v) => { setSelectedPackage(v); setSelectedDeparture(""); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pilih Paket Umroh" />
              </SelectTrigger>
              <SelectContent>
                {packages?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pilih Keberangkatan</label>
            <Select value={selectedDeparture} onValueChange={setSelectedDeparture} disabled={!selectedPackage}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={selectedPackage ? "Pilih Tanggal" : "Pilih paket dahulu"} />
              </SelectTrigger>
              <SelectContent>
                {departures?.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {format(new Date(d.departure_date), "dd MMMM yyyy", { locale: localeId })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cari Jamaah</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nama jamaah..."
                className="pl-9 bg-background"
                value={searchJamaah}
                onChange={(e) => setSearchJamaah(e.target.value)}
                disabled={!hasDeparture}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasDeparture ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/10 rounded-xl border-2 border-dashed">
          <div className="p-4 bg-background rounded-full shadow-sm">
            <Box className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="max-w-xs">
            <h3 className="font-semibold text-lg">Belum Ada Data</h3>
            <p className="text-sm text-muted-foreground">Silakan pilih paket dan tanggal keberangkatan untuk mengelola perlengkapan.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary & Items */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-primary text-primary-foreground pb-8">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Ringkasan Distribusi
                </CardTitle>
                <p className="text-primary-foreground/70 text-xs">
                  {selectedPkgName} - {selectedDepDate && format(new Date(selectedDepDate.departure_date), "dd MMM yyyy")}
                </p>
              </CardHeader>
              <CardContent className="-mt-6">
                <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-bold">{overallPct}%</p>
                      <p className="text-xs text-muted-foreground">Total Kelengkapan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{jamaahComplete}/{totalJamaah}</p>
                      <p className="text-xs text-muted-foreground">Jamaah Selesai</p>
                    </div>
                  </div>
                  <Progress value={overallPct} className="h-2" />
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => bulkMutation.mutate()}
                      disabled={bulkMutation.isPending || overallPct === 100}
                    >
                      {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Bagikan Semua (Massal)
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-2">
                      *Hanya membagikan item yang masih memiliki stok
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-primary" /> Status Stok Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items?.map(item => {
                  const distCount = getItemDistCount(item.id);
                  const threshold = item.low_stock_threshold || 10;
                  const isLow = item.stock_quantity <= threshold;
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 h-4">{distCount} Terbagi</Badge>
                          {isLow && <Badge variant="destructive" className="text-[10px] px-1 h-4 animate-pulse">Low</Badge>}
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`h-8 px-2 font-bold ${isLow ? 'text-destructive' : 'text-primary'}`}
                              onClick={() => handleStockClick(item.id)}
                            >
                              {item.stock_quantity}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Klik untuk tambah stok</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right: Passenger List */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Daftar Jamaah</CardTitle>
                  <p className="text-xs text-muted-foreground">Kelola distribusi per individu</p>
                </div>
                <Badge variant="secondary">{filteredPassengers.length} Orang</Badge>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[250px]">Nama Jamaah</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPassengers ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-xs text-muted-foreground mt-2">Memuat data jamaah...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredPassengers.length > 0 ? (
                        filteredPassengers.map((p) => {
                          const status = getJamaahStatus(p.customer_id, p.customer?.gender, p.passenger_type);
                          const isComplete = status.completed === status.total && status.total > 0;
                          
                          return (
                            <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    p.customer?.gender === 'male' || p.customer?.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                  }`}>
                                    {p.customer.full_name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.customer.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                      {p.passenger_type} • {p.customer?.gender === 'male' || p.customer?.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="w-full max-w-[120px] space-y-1.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span className={isComplete ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                      {status.completed}/{status.total} Item
                                    </span>
                                    <span>{Math.round(status.pct)}%</span>
                                  </div>
                                  <Progress value={status.pct} className={`h-1.5 ${isComplete ? "bg-green-100" : ""}`} />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant={isComplete ? "outline" : "default"}
                                  className={`h-8 px-3 ${isComplete ? 'border-green-200 text-green-700 hover:bg-green-50' : ''}`}
                                  onClick={() => handleOpenDist(p)}
                                >
                                  {isComplete ? <Check className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                                  {isComplete ? 'Lengkap' : 'Kelola'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Jamaah tidak ditemukan</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedJamaah && (
        <EquipmentDistributionDialog
          open={isDistDialogOpen}
          onOpenChange={setIsDistDialogOpen}
          jamaahId={selectedJamaah.customer_id}
          jamaahName={selectedJamaah.customer.full_name}
          jamaahGender={selectedJamaah.customer.gender || undefined}
          jamaahType={selectedJamaah.passenger_type}
          departureId={selectedDeparture}
        />
      )}

      <AddStockDialog
        open={isAddStockOpen}
        onOpenChange={setIsAddStockOpen}
        items={items || []}
        preselectedItemId={addStockPreselect}
      />

      <Dialog open={showMasterData} onOpenChange={setShowMasterData}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <MasterDataTab items={items} />
        </DialogContent>
      </Dialog>

      <Dialog open={showRealization} onOpenChange={setShowRealization}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <EquipmentRealizationTab />
        </DialogContent>
      </Dialog>

      <Dialog open={showManifest} onOpenChange={setShowManifest}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <PrintManifest 
            distributions={distributions}
            departureName={selectedPkgName}
            departureDate={selectedDepDate?.departure_date}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
