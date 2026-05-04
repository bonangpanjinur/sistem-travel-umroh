import { usePackageDepartures } from "@/hooks/usePackages";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Plane, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepSelectDepartureProps {
  packageId: string;
  selectedDepartureId?: string;
  onSelect: (departureId: string) => void;
}

export function StepSelectDeparture({ packageId, selectedDepartureId, onSelect }: StepSelectDepartureProps) {
  const { data: departures, isLoading } = usePackageDepartures(packageId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pilih Jadwal Keberangkatan</h3>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!departures || departures.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Tidak ada jadwal keberangkatan tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pilih Jadwal Keberangkatan</h3>
      <p className="text-sm text-muted-foreground">
        Pilih tanggal keberangkatan yang sesuai dengan jadwal Anda
      </p>

      <RadioGroup value={selectedDepartureId} onValueChange={onSelect}>
        <div className="space-y-3">
          {departures.map((departure) => {
            const availableSeats = departure.quota - departure.booked_count;
            const isSelected = selectedDepartureId === departure.id;

            return (
              <div key={departure.id}>
                <RadioGroupItem
                  value={departure.id}
                  id={departure.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={departure.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {format(new Date(departure.departure_date), "d MMMM yyyy", { locale: id })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pulang: {format(new Date(departure.return_date), "d MMMM yyyy", { locale: id })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    {departure.flight_number && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span>{departure.flight_number}</span>
                      </div>
                    )}
                    <div className={cn(
                      "flex items-center gap-2 font-medium",
                      availableSeats < 10 ? "text-destructive" : "text-green-600"
                    )}>
                      <Users className="h-4 w-4" />
                      <span>{availableSeats} kursi tersedia</span>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
