import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";

interface Passenger {
  id: string;
  customer_id: string;
  customer: {
    id: string;
    full_name: string;
  };
  is_main_passenger?: boolean;
  passenger_type?: string;
}

interface PassengerSelectionProps {
  passengers: Passenger[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  selectedDepartureId: string;
}

export function PassengerSelection({
  passengers,
  selectedCustomerId,
  onSelectCustomer,
  selectedDepartureId,
}: PassengerSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch distribution summary for each passenger
  const { data: distributionSummary } = useQuery({
    queryKey: ["distribution-summary", selectedDepartureId],
    queryFn: async () => {
      if (!selectedDepartureId) return {};

      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("customer_id, equipment_id")
        .eq("departure_id", selectedDepartureId)
        .eq("status", "distributed");

      if (error) throw error;

      // Group by customer_id and count unique equipment items
      const summary: Record<string, number> = {};
      data?.forEach((dist) => {
        summary[dist.customer_id] = (summary[dist.customer_id] || 0) + 1;
      });

      return summary;
    },
    enabled: !!selectedDepartureId,
  });

  // Filter passengers based on search term
  const filteredPassengers = useMemo(() => {
    if (!searchTerm.trim()) return passengers;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return passengers.filter((passenger) =>
      passenger.customer?.full_name.toLowerCase().includes(lowerSearchTerm)
    );
  }, [passengers, searchTerm]);

  if (passengers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Tidak ada jamaah untuk keberangkatan ini</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama jamaah..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Passenger List */}
      <div className="grid gap-3">
        {filteredPassengers.length > 0 ? (
          filteredPassengers.map((passenger) => {
            const distributedCount = distributionSummary?.[passenger.customer_id] || 0;

            return (
              <Card
                key={passenger.id}
                className={`cursor-pointer transition-all ${
                  selectedCustomerId === passenger.customer_id
                    ? "border-blue-500 border-2 bg-blue-50"
                    : "hover:border-primary"
                }`}
                onClick={() => onSelectCustomer(passenger.customer_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-base">
                        {passenger.customer?.full_name}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {passenger.is_main_passenger && (
                          <Badge variant="default" className="text-xs">
                            Jamaah Utama
                          </Badge>
                        )}
                        {passenger.passenger_type && (
                          <Badge variant="outline" className="text-xs">
                            {passenger.passenger_type}
                          </Badge>
                        )}
                        {distributedCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            {distributedCount} Item Terdistribusi
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedCustomerId === passenger.customer_id
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedCustomerId === passenger.customer_id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Tidak ada jamaah yang cocok dengan pencarian</p>
          </div>
        )}
      </div>
    </div>
  );
}
