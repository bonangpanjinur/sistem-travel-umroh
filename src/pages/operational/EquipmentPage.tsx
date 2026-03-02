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
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Plus, Check, Users, Box, Database, BarChart3, Settings, Share2, Loader2, AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import sub-components
import { EquipmentDistributionDrawer } from "@/components/operational/equipment/EquipmentDistributionDrawer";
import { InventoryTab } from "@/components/operational/equipment/InventoryTab";
import { MasterDataTab } from "@/components/operational/equipment/MasterDataTab";

export interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
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
  customer: { id: string; full_name: string };
  booking: { departure_id: string };
  is_main_passenger: boolean;
  passenger_type: string;
}

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

  // Auto-select first departure if available
  if (departures && departures.length > 0 && !selectedDeparture) {
    setSelectedDeparture((departures[0] as any).id);
  }

  // Fetch equipment items
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

  // Fetch passengers for selected departure
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name),
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

  // Fetch distributions for selected departure
  const { data: distributions } = useQuery({
    queryKey: ["equipment-distributions", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select(`
          *,
          equipment:equipment_items(*),
          customer:customers(full_name)
        `)
        .eq("departure_id", selectedDeparture)
        .eq("status", "distributed")
        .order("distributed_at", { ascending: false });

      if (error) throw error;
      return data as Distribution[];
    },
    enabled: !!selectedDeparture,
  });

  // Calculate jamaah equipment completion status
  const getJamaahEquipmentStatus = (jamaahId: string) => {
    if (!distributions || !items) return { completed: 0, total: items.length };
    
    const jamaahDistributions = distributions.filter(d => d.customer_id === jamaahId);
    const completedEquipmentIds = new Set(jamaahDistributions.map(d => d.equipment_id));
    
    return {
      completed: completedEquipmentIds.size,
      total: items.length,
      percentage: items.length > 0 ? (completedEquipmentIds.size / items.length) * 100 : 0,
    };
  };

  // Calculate dashboard metrics
  const totalJamaah = passengers?.length || 0;
  const totalDistributed = distributions?.length || 0;
  const totalItems = items?.length || 0;
  const totalStock = items?.reduce((sum, i) => sum + (i.stock_quantity || 0), 0) || 0;
  const jamaahWithCompleteEquipment = passengers?.filter(p => {
    const status = getJamaahEquipmentStatus(p.customer_id);
    return status.completed === status.total && status.total > 0;
  }).length || 0;

  const handleOpenDrawer = (jamaah: Passenger) => {
    setSelectedJamaah(jamaah);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedJamaah(null);
  };

  const isLoading = loadingDepartures || loadingItems || loadingPassengers;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Perlengkapan</h1>
          <p className="text-muted-foreground">Kelola distribusi perlengkapan jamaah per keberangkatan</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettingsModal(true)}
          className="h-10 w-10"
        >
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

      {/* Mini Dashboard Cards */}
      {selectedDeparture && (
        <div className="grid gap-4 md:grid-cols-4 animate-in fade-in duration-500">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalJamaah}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {jamaahWithCompleteEquipment} lengkap
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Box className="h-4 w-4" />
                Total Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Stok: {totalStock}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Terdistribusi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalDistributed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalJamaah > 0 ? Math.round((totalDistributed / (totalJamaah * totalItems)) * 100) : 0}% dari total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                Kelengkapan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalJamaah > 0 ? Math.round((jamaahWithCompleteEquipment / totalJamaah) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Jamaah lengkap
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jamaah Table */}
      {selectedDeparture ? (
        <Card className="animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Jamaah & Kelengkapan
            </CardTitle>
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
                      <TableHead>Tipe</TableHead>
                      <TableHead>Kelengkapan</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((passenger) => {
                      const status = getJamaahEquipmentStatus(passenger.customer_id);
                      const isComplete = status.completed === status.total && status.total > 0;
                      
                      return (
                        <TableRow key={passenger.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <p className="font-semibold">{passenger.customer.full_name}</p>
                              {passenger.is_main_passenger && (
                                <Badge variant="secondary" className="w-fit text-xs mt-1">
                                  Penumpang Utama
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {passenger.passenger_type === "adult" ? "Dewasa" : "Anak"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {status.completed}/{status.total}
                              </span>
                              {isComplete && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Lengkap
                                </Badge>
                              )}
                              {!isComplete && status.completed > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(status.percentage)}%
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Progress value={status.percentage} className="w-24 h-2" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDrawer(passenger)}
                              className="gap-2"
                            >
                              <Share2 className="h-4 w-4" />
                              Bagikan
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
                  <p className="text-muted-foreground">
                    Tidak ada jamaah untuk keberangkatan ini
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in fade-in duration-500">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Pilih keberangkatan terlebih dahulu untuk melihat daftar jamaah
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Distribusi Perlengkapan: {selectedJamaah?.customer.full_name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedJamaah && (
              <EquipmentDistributionDrawer
                jamaahId={selectedJamaah.customer_id}
                jamaahName={selectedJamaah.customer.full_name}
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
              <Settings className="h-5 w-5" />
              Pengaturan Gudang Perlengkapan
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-6">
            {/* Tab selector */}
            <div className="flex gap-2 border-b">
              <Button
                variant={settingsTab === "inventory" ? "default" : "ghost"}
                onClick={() => setSettingsTab("inventory")}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Stok & Inventaris
              </Button>
              <Button
                variant={settingsTab === "master" ? "default" : "ghost"}
                onClick={() => setSettingsTab("master")}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Data Master
              </Button>
            </div>

            {/* Tab content */}
            {settingsTab === "inventory" && (
              <InventoryTab items={items} searchTerm="" setSearchTerm={() => {}} selectedDeparture={selectedDeparture} />
            )}
            
            {settingsTab === "master" && (
              <MasterDataTab items={items} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
