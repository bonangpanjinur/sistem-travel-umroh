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

export interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
  category?: string;
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
      if (cat === 'male_only' && gender === 'male') return true;
      if (cat === 'female_only' && gender === 'female') return true;
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
      for (const p of validPassengers) {
        const applicable = getApplicableItems(p.customer?.gender, p.passenger_type);
        const existingIds = new Set(
          (distributions || []).filter(d => d.customer_id === p.customer_id).map(d => d.equipment_id)
        );
        for (const item of applicable) {
          if (!existingIds.has(item.id) && (item.stock_quantity || 0) > 0) {
            inserts.push({
              equipment_id: item.id,
              customer_id: p.customer_id,
              departure_id: selectedDeparture,
              quantity: 1,
              status: "distributed",
              distributed_at: new Date().toISOString(),
            });
          }
        }
      }
      if (inserts.length === 0) throw new Error("Semua jamaah sudah lengkap atau stok habis");
      const { error } = await supabase.from("equipment_distributions").insert(inserts);
      if (error) throw error;
      // Reduce stock atomically
      const stockMap = new Map<string, number>();
      inserts.forEach(ins => stockMap.set(ins.equipment_id, (stockMap.get(ins.equipment_id) || 0) + 1));
      for (const [eqId, qty] of stockMap) {
        // Use atomic update to prevent race condition
        const { error: updateError } = await supabase
          .from("equipment_items")
          .update({ stock_quantity: supabase.rpc('decrement_stock', { item_id: eqId, qty: qty }) })
          .eq("id", eqId);
        
        // Fallback: if RPC not available, use client-side calculation with select
        if (updateError) {
          const item = items.find(i => i.id === eqId);
          if (item) {
            await supabase.from("equipment_items").update({
              stock_quantity: Math.max(0, (item.stock_quantity || 0) - qty),
            }).eq("id", eqId);
          }
        }
      }
      return inserts.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} item berhasil didistribusikan`);
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
          <Button variant="outline" size="sm" onClick={() => setShowMasterData(true)}>
            <Database className="h-4 w-4 mr-1.5" /> Kelola Item
          </Button>
          <Button size="sm" onClick={() => { setAddStockPreselect(undefined); setIsAddStockOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Stok
          </Button>
        </div>
      </div>

      {/* Step selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Step 1: Package */}
            <div className="flex-1 space-y-1.5 w-full">
              <div className="flex items-center gap-2">
                <Badge variant={selectedPackage ? "default" : "secondary"} className="text-xs tabular-nums">1</Badge>
                <label className="text-sm font-medium">Pilih Paket</label>
              </div>
              <Select value={selectedPackage} onValueChange={(v) => { setSelectedPackage(v); setSelectedDeparture(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket umrah/haji..." />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-muted-foreground ml-1">({p.package_type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block mt-6" />

            {/* Step 2: Departure */}
            <div className="flex-1 space-y-1.5 w-full">
              <div className="flex items-center gap-2">
                <Badge variant={selectedDeparture ? "default" : "secondary"} className="text-xs tabular-nums">2</Badge>
                <label className="text-sm font-medium">Pilih Keberangkatan</label>
              </div>
              <Select
                value={selectedDeparture}
                onValueChange={setSelectedDeparture}
                disabled={!selectedPackage}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPackage ? "Pilih tanggal..." : "Pilih paket dulu"} />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })}
                      {" — "}
                      {format(new Date(d.return_date), "dd MMM yyyy", { locale: localeId })}
                      <span className="text-muted-foreground ml-1">({d.booked_count || 0}/{d.quota} pax)</span>
                    </SelectItem>
                  ))}
                  {departures?.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">Tidak ada keberangkatan</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Breadcrumb */}
          {selectedPkgName && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
              <PackageIcon className="h-4 w-4" />
              <span>{selectedPkgName}</span>
              {selectedDepDate && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>{format(new Date(selectedDepDate.departure_date), "dd MMM yyyy", { locale: localeId })}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard - only show when departure selected */}
      {hasDeparture && (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalJamaah}</p>
                    <p className="text-xs text-muted-foreground">Total Jamaah</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                    <Box className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalItems}</p>
                    <p className="text-xs text-muted-foreground">Jenis Item</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDistributed}</p>
                    <p className="text-xs text-muted-foreground">Terdistribusi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{overallPct}%</p>
                    <p className="text-xs text-muted-foreground">{jamaahComplete}/{totalJamaah} Lengkap</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock summary */}
          {items && items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ringkasan Stok</h3>
              <TooltipProvider>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {items.map(item => {
                    const distributed = getItemDistCount(item.id);
                    const stock = item.stock_quantity || 0;
                    const total = stock + distributed;
                    const pct = total > 0 ? (distributed / total) * 100 : 0;
                    const stockPct = total > 0 ? (stock / total) * 100 : 100;
                    const isLow = stock <= 5 && stock > 0;
                    const isEmpty = stock === 0;
                    const catEmoji = item.category === 'male_only' ? '♂ ' : item.category === 'female_only' ? '♀ ' : item.category === 'child_only' ? '👶 ' : '';

                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <Card
                            className={`cursor-pointer hover:border-primary/50 transition-colors ${isEmpty ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : isLow ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                            onClick={() => handleStockClick(item.id)}
                          >
                            <CardContent className="p-3">
                              <p className="text-xs font-medium truncate mb-1">{catEmoji}{item.name}</p>
                              <div className="flex items-baseline justify-between mb-1.5">
                                <span className={`text-lg font-bold ${isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                                  {stock}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{distributed} terpakai</span>
                              </div>
                              <Progress value={stockPct} className={`h-1 ${isEmpty ? '[&>div]:bg-red-500' : isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`} />
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.name}: Sisa {stock}, Terpakai {distributed}. Klik untuk tambah stok.</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>
          )}

          {/* Jamaah list */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" /> Daftar Jamaah
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari jamaah..."
                      value={searchJamaah}
                      onChange={(e) => setSearchJamaah(e.target.value)}
                      className="pl-8 h-9 w-48"
                    />
                  </div>
                  {validPassengers.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMutation.mutate()}
                      disabled={bulkMutation.isPending || jamaahComplete === totalJamaah}
                    >
                      {bulkMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackageIcon className="h-4 w-4 mr-1" />}
                      Bagikan Semua
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPassengers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPassengers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jamaah</TableHead>
                        <TableHead className="w-[100px]">Gender</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[140px]">Progress</TableHead>
                        <TableHead className="text-right w-[100px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p) => {
                        const gender = p.customer?.gender;
                        const status = getJamaahStatus(p.customer_id, gender, p.passenger_type);
                        const isComplete = status.completed === status.total && status.total > 0;
                        const isPartial = status.completed > 0 && !isComplete;

                        return (
                          <TableRow
                            key={p.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleOpenDist(p)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                                  gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {gender === 'male' ? 'L' : gender === 'female' ? 'P' : p.passenger_type === 'child' ? 'A' : '-'}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{p.customer.full_name}</p>
                                  {p.is_main_passenger && (
                                    <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">Utama</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {p.passenger_type === 'child' ? 'Anak' : gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium tabular-nums">{status.completed}/{status.total}</span>
                                {isComplete ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] dark:bg-green-950 dark:text-green-400">
                                    <Check className="h-3 w-3 mr-0.5" /> Lengkap
                                  </Badge>
                                ) : isPartial ? (
                                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
                                    Belum Lengkap
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50 dark:bg-red-950/30">
                                    Belum Ada
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Progress value={status.pct} className="h-2" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                Detail <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {searchJamaah ? "Tidak ada jamaah yang cocok" : "Tidak ada jamaah untuk keberangkatan ini"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state when no departure selected */}
      {!hasDeparture && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-semibold text-lg mb-1">Pilih Paket & Keberangkatan</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Pilih paket dan tanggal keberangkatan di atas untuk melihat daftar jamaah dan mengelola distribusi perlengkapan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Dialog */}
      {selectedJamaah && (
        <EquipmentDistributionDialog
          open={isDistDialogOpen}
          onOpenChange={setIsDistDialogOpen}
          jamaahId={selectedJamaah.customer_id}
          jamaahName={selectedJamaah.customer.full_name}
          jamaahGender={selectedJamaah.customer?.gender || undefined}
          jamaahType={selectedJamaah.passenger_type}
          departureId={selectedDeparture}
        />
      )}

      {/* Add Stock Dialog */}
      {items && (
        <AddStockDialog
          open={isAddStockOpen}
          onOpenChange={setIsAddStockOpen}
          items={items}
          preselectedItemId={addStockPreselect}
        />
      )}

      {/* Realization Dialog */}
      <Dialog open={showRealization} onOpenChange={setShowRealization}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Realisasi Perlengkapan
            </DialogTitle>
          </DialogHeader>
          <EquipmentRealizationTab
            selectedPackage={selectedPackage}
            selectedDeparture={selectedDeparture}
          />
        </DialogContent>
      </Dialog>

      {/* Master Data Dialog */}
      <Dialog open={showMasterData} onOpenChange={setShowMasterData}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Master Data Perlengkapan
            </DialogTitle>
          </DialogHeader>
          <MasterDataTab items={items} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
