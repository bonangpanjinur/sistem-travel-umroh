import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Search, Plus, Check, Users, Box, Database, BarChart3
} from "lucide-react";

// Import sub-components
import { InventoryTab } from "@/components/operational/equipment/InventoryTab";
import { DistributionTab } from "@/components/operational/equipment/DistributionTab";
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

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [distributeDialog, setDistributeDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Fetch departures
  const { data: departures } = useQuery({
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

  // Fetch distributions
  const { data: distributions } = useQuery({
    queryKey: ["equipment-distributions", selectedDeparture],
    queryFn: async () => {
      let query = supabase
        .from("equipment_distributions")
        .select(`
          *,
          equipment:equipment_items(*),
          customer:customers(full_name)
        `)
        .order("distributed_at", { ascending: false });

      if (selectedDeparture !== "all") {
        query = query.eq("departure_id", selectedDeparture);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Distribution[];
    },
  });

  // Fetch customers for selected departure
  const { data: customers } = useQuery({
    queryKey: ["customers-for-equipment", selectedDeparture],
    queryFn: async () => {
      if (selectedDeparture === "all") return [];
      
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          customer:customers(id, full_name),
          booking:bookings!inner(departure_id)
        `)
        .eq("booking.departure_id", selectedDeparture);
      
      if (error) {
        const { data: allCustomers } = await supabase
          .from("customers")
          .select("id, full_name")
          .order("full_name");
        return allCustomers || [];
      }
      
      return data?.map(d => d.customer).filter(Boolean) || [];
    },
    enabled: selectedDeparture !== "all",
  });

  // Distribute equipment
  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !selectedCustomerId) throw new Error("Data tidak lengkap");
      
      const { error } = await supabase
        .from("equipment_distributions")
        .insert({
          equipment_id: selectedItem.id,
          customer_id: selectedCustomerId,
          departure_id: selectedDeparture !== "all" ? selectedDeparture : null,
          quantity,
          status: "distributed",
        });
      
      if (error) throw error;

      await supabase
        .from("equipment_items")
        .update({ stock_quantity: selectedItem.stock_quantity - quantity })
        .eq("id", selectedItem.id);
    },
    onSuccess: () => {
      toast.success(`✅ ${selectedItem?.name} berhasil didistribusikan ke ${selectedCustomerId}`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setDistributeDialog(false);
      setSelectedItem(null);
      setSelectedCustomerId("");
      setQuantity(1);
    },
    onError: (error) => toast.error(`❌ ${error.message}`),
  });

  // Return equipment
  const returnMutation = useMutation({
    mutationFn: async (distribution: Distribution) => {
      const { error } = await supabase
        .from("equipment_distributions")
        .update({ status: "returned", returned_at: new Date().toISOString() } as any)
        .eq("id", distribution.id);
      
      if (error) throw error;

      await supabase
        .from("equipment_items")
        .update({ stock_quantity: (distribution.equipment?.stock_quantity || 0) + distribution.quantity })
        .eq("id", distribution.equipment_id);
    },
    onSuccess: () => {
      toast.success(`✅ ${distribution.equipment?.name} berhasil dikembalikan`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
    },
    onError: (error) => toast.error(`❌ Gagal mengembalikan perlengkapan: ${error.message}`),
  });

  const totalDistributed = distributions?.filter(d => d.status !== "returned").length || 0;
  const totalReturned = distributions?.filter(d => d.status === "returned").length || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Perlengkapan</h1>
          <p className="text-muted-foreground">Kelola stok dan distribusi perlengkapan jamaah</p>
        </div>
        <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Pilih Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Keberangkatan</SelectItem>
            {departures?.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })} - {d.package?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 animate-in fade-in duration-500">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stok Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {items?.reduce((sum, i) => sum + (i.stock_quantity || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terdistribusi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalDistributed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dikembalikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalReturned}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="w-full animate-in fade-in duration-700">
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted p-1 rounded-lg">
          <TabsTrigger value="inventory" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Stok & Inventaris
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <Users className="h-4 w-4" />
            Distribusi & Pengembalian
          </TabsTrigger>
          <TabsTrigger value="master" className="gap-2">
            <Database className="h-4 w-4" />
            Data Master
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryTab items={items} searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedDeparture={selectedDeparture} />
        </TabsContent>

        <TabsContent value="distribution">
          <DistributionTab 
            distributions={distributions} 
            onReturn={(dist) => returnMutation.mutate(dist)}
            departures={departures}
            selectedDeparture={selectedDeparture}
          />
        </TabsContent>

        <TabsContent value="master">
          <MasterDataTab items={items} />
        </TabsContent>
      </Tabs>

      {/* Distribute Dialog */}
      <Dialog open={distributeDialog} onOpenChange={setDistributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribusi: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jamaah</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jamaah..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input
                type="number"
                min={1}
                max={selectedItem?.stock_quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground">
                Stok tersedia: {selectedItem?.stock_quantity || 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => distributeMutation.mutate()}
              disabled={!selectedCustomerId || distributeMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Distribusi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
