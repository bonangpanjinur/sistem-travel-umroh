import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

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
}

export function PassengerSelection({
  passengers,
  selectedCustomerId,
  onSelectCustomer,
}: PassengerSelectionProps) {
  if (passengers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Tidak ada jamaah untuk keberangkatan ini</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {passengers.map((passenger) => (
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
                <div className="flex gap-2 mt-2">
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
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
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
      ))}
    </div>
  );
}
