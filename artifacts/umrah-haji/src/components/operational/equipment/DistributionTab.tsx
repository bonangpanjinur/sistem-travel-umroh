import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Search, Loader2, RotateCcw, Calendar, ListChecks, Info } from "lucide-react";
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
  customer: { id: string; full_name: string; passport_number?: string };
  booking: { id: string; departure_id: string; booking_code?: string };
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

  // Fetch passengers for selected departure with more fields for search
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure-enhanced", selectedDeparture],
    queryFn: async () => {
      if (selectedDeparture === "all") return [];
      
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name, passport_number),
          booking:bookings!inner(id, departure_id, booking_code),
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

  // Fetch existing distributions for selected customer and departure (distributed + queued)
  const { data: customerDistributions } = useQuery({
    queryKey: ["customer-distributions", selectedCustomerId, selectedDeparture],
    queryFn: async () => {
      if (!selectedCustomerId || selectedDeparture === "all") return [];
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("equipment_id, status")
        .eq("customer_id", selectedCustomerId)
        .eq("departure_id", selectedDeparture)
        .in("status", ["distributed", "queued"]);
      if (error) throw error;
      return data as { equipment_id: string; status: string }[];
    },
    enabled: !!selectedCustomerId && selectedDeparture !== "all",
  });

  // Filter passengers based on search (Name, Passport, or Booking Code)
  const filteredPassengers = useMemo(() => {
    if (!passengers) return [];
    if (!searchPassenger.trim()) return passengers;
    
    const lowerSearch = searchPassenger.toLowerCase();
    return passengers.filter((p) =>
      p.customer.full_name.toLowerCase().includes(lowerSearch) ||
      p.customer.passport_number?.toLowerCase().includes(lowerSearch) ||
      p.booking.booking_code?.toLowerCase().includes(lowerSearch)
    );
  }, [passengers, searchPassenger]);

  // Get distributed/queued items for current departure (active distributions)
  const distributedItems = useMemo(() => {
    if (!distributions || selectedDeparture === "all") return [];
    return distributions.filter(
      (d) => d.departure_id === selectedDeparture && d.status !== "returned"
    );
  }, [distributions, selectedDeparture]);

  // Get only queued items (auto-created from template, awaiting prep)
  const queuedItems = useMemo(() => {
    if (!distributions || selectedDeparture === "all") return [];
    return distributions.filter(
      (d) => d.departure_id === selectedDeparture && d.status === "queued"
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
      <div className="flex gap-2 flex-wrap">
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
          <RotateCcw className="h-4 w-4" />
          Pengembalian ({returnedItems.length})
        </Button>
      </div>

      {/* Queued items info banner */}
      {queuedItems.length > 0 && (
        <Alert className="border-purple-200 bg-purple-50/60">
          <ListChecks className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <span className="font-semibold">{queuedItems.length} item perlengkapan</span> dalam antrian otomatis
            (dijadwalkan saat booking dikonfirmasi).{" "}
            Pilih jamaah di bawah lalu centang item untuk menandai sebagai <em>Terdistribusi</em>.
          </AlertDescription>
        </Alert>
      )}

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
                  placeholder="Cari nama, paspor, atau kode booking..."
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
                            <div className="flex flex-wrap gap-1 mt-1">
                              {passenger.is_main_passenger && (
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  Utama
                                </Badge>
                              )}
                              {passenger.booking.booking_code && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {passenger.booking.booking_code}
                                </Badge>
                              )}
                              {passenger.customer.passport_number && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {passenger.customer.passport_number}
                                </Badge>
                              )}
                            </div>
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
                  equipmentItems={equipmentItems as any}
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
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Daftar Pengembalian Perlengkapan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {returnedItems && returnedItems.length > 0 ? (
              <div className="space-y-3">
                {returnedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-amber-50/30 rounded-lg border border-amber-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <RotateCcw className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {item.equipment?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jamaah: {item.customer?.full_name} • Jumlah: {item.quantity}x
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 mb-1">
                        Dikembalikan
                      </Badge>
                      {(item as any).returned_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date((item as any).returned_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
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
