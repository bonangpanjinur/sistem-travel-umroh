import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Distribution } from "@/pages/operational/EquipmentPage";
import { EquipmentChecklist } from "./EquipmentChecklist";

interface DistributionTabProps {
  distributions: Distribution[] | undefined;
  onReturn: (dist: Distribution) => void;
  departures: any[] | undefined;
  selectedDeparture: string;
}

interface Passenger {
  id: string;
  customer_id: string;
  customer: { id: string; full_name: string };
  booking: { departure_id: string };
  is_main_passenger: boolean;
  passenger_type: string;
}

export function DistributionTab({
  distributions,
  onReturn,
  departures,
  selectedDeparture,
}: DistributionTabProps) {
  const [searchPassenger, setSearchPassenger] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"distribution" | "returns">("distribution");

  // Fetch passengers for selected departure
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure", selectedDeparture],
    queryFn: async () => {
      if (selectedDeparture === "all") return [];
      
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name),
          booking:bookings!inner(departure_id),
          is_main_passenger,
          passenger_type
        `)
        .eq("booking.departure_id", selectedDeparture)
        .order("customer.full_name");
      
      if (error) throw error;
      return (data || []) as Passenger[];
    },
    enabled: selectedDeparture !== "all",
  });

  // Fetch equipment items for checklist
  const { data: equipmentItems } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing distributions for selected customer and departure
  const { data: customerDistributions } = useQuery({
    queryKey: ["customer-distributions", selectedCustomerId, selectedDeparture],
    queryFn: async () => {
      if (!selectedCustomerId || selectedDeparture === "all") return [];
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("equipment_id")
        .eq("customer_id", selectedCustomerId)
        .eq("departure_id", selectedDeparture)
        .eq("status", "distributed");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId && selectedDeparture !== "all",
  });

  // Filter passengers based on search
  const filteredPassengers = useMemo(() => {
    if (!passengers) return [];
    if (!searchPassenger.trim()) return passengers;
    
    const lowerSearch = searchPassenger.toLowerCase();
    return passengers.filter((p) =>
      p.customer.full_name.toLowerCase().includes(lowerSearch)
    );
  }, [passengers, searchPassenger]);

  // Get distributed items for current departure
  const distributedItems = useMemo(() => {
    if (!distributions || selectedDeparture === "all") return [];
    return distributions.filter(
      (d) => d.departure_id === selectedDeparture && d.status !== "returned"
    );
  }, [distributions, selectedDeparture]);

  // Get returned items for current departure
  const returnedItems = useMemo(() => {
    if (!distributions || selectedDeparture === "all") return [];
    return distributions.filter(
      (d) => d.departure_id === selectedDeparture && d.status === "returned"
    );
  }, [distributions, selectedDeparture]);

  const selectedPassenger = passengers?.find(
    (p) => p.customer_id === selectedCustomerId
  );

  if (selectedDeparture === "all") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            Pilih keberangkatan terlebih dahulu untuk melihat daftar jamaah
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Tab Selector */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "distribution" ? "default" : "outline"}
          onClick={() => setActiveTab("distribution")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Distribusi Perlengkapan ({distributedItems.length})
        </Button>
        <Button
          variant={activeTab === "returns" ? "default" : "outline"}
          onClick={() => setActiveTab("returns")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Pengembalian ({returnedItems.length})
        </Button>
      </div>

      {/* Distribution Tab */}
      {activeTab === "distribution" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Passenger List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama jamaah..."
                  value={searchPassenger}
                  onChange={(e) => setSearchPassenger(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingPassengers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPassengers && filteredPassengers.length > 0 ? (
                <ScrollArea className="h-[600px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {filteredPassengers.map((passenger) => (
                      <button
                        key={passenger.id}
                        onClick={() => setSelectedCustomerId(passenger.customer_id)}
                        className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                          selectedCustomerId === passenger.customer_id
                            ? "bg-blue-50 border-blue-500"
                            : "bg-muted/30 border-transparent hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {passenger.customer.full_name}
                            </p>
                            {passenger.is_main_passenger && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Penumpang Utama
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {searchPassenger
                      ? "Tidak ada jamaah yang cocok"
                      : "Tidak ada jamaah untuk keberangkatan ini"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Equipment Checklist */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedPassenger
                  ? `Perlengkapan untuk ${selectedPassenger.customer.full_name}`
                  : "Pilih Jamaah untuk Melihat Perlengkapan"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPassenger && equipmentItems ? (
                <EquipmentChecklist
                  equipmentItems={equipmentItems}
                  selectedCustomerId={selectedCustomerId}
                  selectedDepartureId={selectedDeparture}
                  existingDistributions={customerDistributions || []}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Pilih seorang jamaah dari daftar untuk memulai distribusi perlengkapan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === "returns" && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengembalian Perlengkapan</CardTitle>
          </CardHeader>
          <CardContent>
            {returnedItems && returnedItems.length > 0 ? (
              <div className="space-y-3">
                {returnedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {item.equipment?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.customer?.full_name} • {item.quantity}x
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      Dikembalikan
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Belum ada perlengkapan yang dikembalikan untuk keberangkatan ini
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
