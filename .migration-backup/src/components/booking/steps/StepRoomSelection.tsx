import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomType } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BedDouble, Users } from "lucide-react";

interface StepRoomSelectionProps {
  packageId: string;
  roomType?: RoomType;
  onSelect: (roomType: RoomType) => void;
}

const ROOM_OPTIONS: { type: RoomType; label: string; occupancy: string; icon: React.ReactNode }[] = [
  { type: 'quad', label: 'Quad', occupancy: '4 orang/kamar', icon: <Users className="h-5 w-5" /> },
  { type: 'triple', label: 'Triple', occupancy: '3 orang/kamar', icon: <Users className="h-5 w-5" /> },
  { type: 'double', label: 'Double', occupancy: '2 orang/kamar', icon: <BedDouble className="h-5 w-5" /> },
  { type: 'single', label: 'Single', occupancy: '1 orang/kamar', icon: <BedDouble className="h-5 w-5" /> },
];

export function StepRoomSelection({ packageId, roomType, onSelect }: StepRoomSelectionProps) {
  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package-pricing', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('price_quad, price_triple, price_double, price_single, currency')
        .eq('id', packageId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pilih Tipe Kamar</h3>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const priceMap: Record<RoomType, number> = {
    quad: pkg?.price_quad || 0,
    triple: pkg?.price_triple || 0,
    double: pkg?.price_double || 0,
    single: pkg?.price_single || 0,
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Pilih Tipe Kamar</h3>
        <p className="text-sm text-muted-foreground">
          Harga per orang berdasarkan tipe kamar yang dipilih
        </p>
      </div>

      <RadioGroup value={roomType} onValueChange={(val) => onSelect(val as RoomType)}>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROOM_OPTIONS.map((room) => {
            const isSelected = roomType === room.type;
            const price = priceMap[room.type];

            return (
              <div key={room.type}>
                <RadioGroupItem
                  value={room.type}
                  id={room.type}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={room.type}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all h-full",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "p-2 rounded-full",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {room.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{room.label}</p>
                      <p className="text-sm text-muted-foreground">{room.occupancy}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 border-t">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(price)}
                    </p>
                    <p className="text-xs text-muted-foreground">per orang</p>
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
