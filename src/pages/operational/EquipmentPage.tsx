import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Plus, Check, Users, Box, Database, BarChart3, Settings, Share2, Loader2, AlertTriangle,
  User, Baby, Package
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { EquipmentDistributionDrawer } from "@/components/operational/equipment/EquipmentDistributionDrawer";
import { InventoryTab } from "@/components/operational/equipment/InventoryTab";
import { MasterDataTab } from "@/components/operational/equipment/MasterDataTab";

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

const GENDER_ICON: Record<string, { icon: typeof User; label: string; color: string }> = {
  male: { icon: User, label: 'L', color: 'text-blue-600' },
  female: { icon: User, label: 'P', color: 'text-pink-600' },
};

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [selectedJamaah, setSelectedJamaah] = useState<Passenger | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"inventory" | "master">("inventory");

  // Fetch departures
  const { data: departures, isLoading: loadingDepartures } = useQuery({
    queryKey: ["departures-for-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data;
    },
  });

  if (departures && departures.length > 0 && !selectedDeparture) {
    setSelectedDeparture((departures[0] as any).id);
  }

  // Fetch equipment items (with category)
  const { data: items, isLoading: loadingItems } = useQuery({
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

  // Fetch passengers with gender
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name, gender),
          booking:bookings(departure_id),
          is_main_passenger,
          passenger_type
        `)
        .eq("booking.departure_id", selectedDeparture)
        .order("customer.full_name");
      if (error) throw error;
      return data as Passenger[];
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
        .eq("status", "distributed")
        .order("distributed_at", { ascending: false });
      if (error) throw error;
      return data as Distribution[];
    },
    enabled: !!selectedDeparture,
  });

  // Get applicable items for a gender
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

  // Calculate per-jamaah status based on gender-filtered items
  const getJamaahEquipmentStatus = (jamaahId: string, gender?: string | null, passengerType?: string) => {
    const applicable = getApplicableItems(gender, passengerType);
    if (!distributions || applicable.length === 0) return { completed: 0, total: applicable.length, percentage: 0 };
    const jamaahDist = distributions.filter(d => d.customer_id === jamaahId);
    const completedIds = new Set(jamaahDist.map(d => d.equipment_id));
    const completed = applicable.filter(i => completedIds.has(i.id)).length;
    return {
      completed,
      total: applicable.length,
      percentage: (completed / applicable.length) * 100,
    };
  };

  // Metrics
  const totalJamaah = passengers?.length || 0;
  const totalDistributed = distributions?.length || 0;
  const totalItems = items?.length || 0;
  const totalStock = items?.reduce((sum, i) => sum + (i.stock_quantity || 0), 0) || 0;
  const jamaahWithCompleteEquipment = passengers?.filter(p => {
    const status = getJamaahEquipmentStatus(p.customer_id, p.customer?.gender, p.passenger_type);
    return status.completed === status.total && status.total > 0;
  }).length || 0;

  // Bulk distribution
  const bulkDistributeMutation = useMutation({
    mutationFn: async () => {
      if (!passengers || !items) return;
      const inserts: any[] = [];
      for (const p of passengers) {
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
      // Reduce stock
      const stockUpdates = new Map<string, number>();
      inserts.forEach(ins => {
        stockUpdates.set(ins.equipment_id, (stockUpdates.get(ins.equipment_id) || 0) + 1);
      });
      for (const [eqId, qty] of stockUpdates) {
        const item = items.find(i => i.id === eqId);
        if (item) {
          await supabase.from("equipment_items").update({
            stock_quantity: Math.max(0, (item.stock_quantity || 0) - qty),
          }).eq("id", eqId);
        }
      }
      return inserts.length;
    },
    onSuccess: (count) => {
      toast.success(`✅ ${count} item berhasil didistribusikan ke semua jamaah`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDrawer = (jamaah: Passenger) => {
    setSelectedJamaah(jamaah);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedJamaah(null);
  };

  const isLoading = loadingDepartures || loadingItems || loadingPassengers;

  // Per-item distribution summary
  const getItemDistributedCount = (itemId: string) => {
    return distributions?.filter(d => d.equipment_id === itemId).length || 0;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Perlengkapan</h1>
          <p className="text-muted-foreground">Kelola distribusi perlengkapan jamaah per keberangkatan</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)} className="h-10 w-10">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Departure Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">Keberangkatan:</span>
        <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Pilih Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            {departures?.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })} - {d.package?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Summary Cards */}
      {items && items.length > 0 && selectedDeparture && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ringkasan Stok</h3>
          <TooltipProvider>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map(item => {
                const distributed = getItemDistributedCount(item.id);
                const stock = item.stock_quantity || 0;
                const total = stock + distributed;
                const pct = total > 0 ? (distributed / total) * 100 : 0;
                const cat = (item as any).category || 'general';
                const catLabel = cat === 'male_only' ? '♂' : cat === 'female_only' ? '♀' : cat === 'child_only' ? '👶' : '';
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Card className="hover:border-primary/50 transition-colors cursor-default">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate flex items-center gap-1">
                              {catLabel && <span>{catLabel}</span>}
                              {item.name}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Sisa: {stock}</span>
                            <span>Terpakai: {distributed}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name}: {distributed} terdistribusi / {total} total (sisa {stock})</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Dashboard Cards */}
      {selectedDeparture && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Total Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalJamaah}</div>
              <p className="text-xs text-muted-foreground mt-1">{jamaahWithCompleteEquipment} lengkap</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Box className="h-4 w-4" /> Total Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">Stok: {totalStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Terdistribusi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDistributed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalJamaah > 0 && totalItems > 0 ? Math.round((totalDistributed / (totalJamaah * totalItems)) * 100) : 0}% dari total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4" /> Kelengkapan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalJamaah > 0 ? Math.round((jamaahWithCompleteEquipment / totalJamaah) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Jamaah lengkap</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jamaah Table */}
      {selectedDeparture ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Daftar Jamaah & Kelengkapan
            </CardTitle>
            {passengers && passengers.length > 0 && (
              <Button
                size="sm"
                onClick={() => bulkDistributeMutation.mutate()}
                disabled={bulkDistributeMutation.isPending || jamaahWithCompleteEquipment === totalJamaah}
              >
                {bulkDistributeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Package className="h-4 w-4 mr-1" />
                )}
                Bagikan Semua
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : passengers && passengers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Jamaah</TableHead>
                      <TableHead className="w-[80px]">Gender</TableHead>
                      <TableHead>Kelengkapan</TableHead>
                      <TableHead className="w-[120px]">Progress</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((passenger) => {
                      const gender = passenger.customer?.gender;
                      const status = getJamaahEquipmentStatus(passenger.customer_id, gender, passenger.passenger_type);
                      const isComplete = status.completed === status.total && status.total > 0;
                      const genderInfo = GENDER_ICON[gender || ''];

                      return (
                        <TableRow key={passenger.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {genderInfo && (
                                <span className={`text-xs font-bold ${genderInfo.color} bg-muted rounded-full w-6 h-6 flex items-center justify-center`}>
                                  {genderInfo.label}
                                </span>
                              )}
                              <div>
                                <p className="font-semibold">{passenger.customer.full_name}</p>
                                {passenger.is_main_passenger && (
                                  <Badge variant="secondary" className="w-fit text-xs mt-0.5">Utama</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {passenger.passenger_type === "child" ? "Anak" : gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium tabular-nums">
                                {status.completed}/{status.total}
                              </span>
                              {isComplete ? (
                                <Badge className="bg-green-600 text-white text-xs">
                                  <Check className="h-3 w-3 mr-0.5" /> Lengkap
                                </Badge>
                              ) : status.completed > 0 ? (
                                <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 bg-yellow-50">
                                  Belum Lengkap
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50">
                                  Belum Ada
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Progress value={status.percentage} className="w-full h-2" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDrawer(passenger)} className="gap-1.5">
                              <Share2 className="h-4 w-4" /> Bagikan
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
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Tidak ada jamaah untuk keberangkatan ini</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Pilih keberangkatan terlebih dahulu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Distribusi: {selectedJamaah?.customer.full_name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedJamaah && (
              <EquipmentDistributionDrawer
                jamaahId={selectedJamaah.customer_id}
                jamaahName={selectedJamaah.customer.full_name}
                jamaahGender={selectedJamaah.customer?.gender || undefined}
                jamaahType={selectedJamaah.passenger_type}
                departureId={selectedDeparture}
                onClose={handleCloseDrawer}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Pengaturan Gudang Perlengkapan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="flex gap-2 border-b">
              <Button variant={settingsTab === "inventory" ? "default" : "ghost"} onClick={() => setSettingsTab("inventory")} className="gap-2">
                <BarChart3 className="h-4 w-4" /> Stok & Inventaris
              </Button>
              <Button variant={settingsTab === "master" ? "default" : "ghost"} onClick={() => setSettingsTab("master")} className="gap-2">
                <Database className="h-4 w-4" /> Data Master
              </Button>
            </div>
            {settingsTab === "inventory" && <InventoryTab items={items} searchTerm="" setSearchTerm={() => {}} selectedDeparture={selectedDeparture} />}
            {settingsTab === "master" && <MasterDataTab items={items} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
