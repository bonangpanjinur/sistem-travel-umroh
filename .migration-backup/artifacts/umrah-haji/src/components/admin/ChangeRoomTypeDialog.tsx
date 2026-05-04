import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Loader2, AlertTriangle, Info, CheckCircle2, TrendingUp } from "lucide-react";

interface ChangeRoomTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  currentRoomType: string;
  currentDepartureId: string;
  currentTotalPrice: number;
  totalPax: number;
}

const ROOM_TYPES = [
  { value: "quad", label: "Kamar Quad (4 orang)" },
  { value: "triple", label: "Kamar Triple (3 orang)" },
  { value: "double", label: "Kamar Double (2 orang)" },
  { value: "single", label: "Kamar Single (1 orang)" },
];

export function ChangeRoomTypeDialog({
  isOpen,
  onClose,
  bookingId,
  currentRoomType,
  currentDepartureId,
  currentTotalPrice,
  totalPax,
}: ChangeRoomTypeDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRoomType, setSelectedRoomType] = useState<string>("");
  const [newTotalPrice, setNewTotalPrice] = useState<number>(0);
  const [priceDifference, setPriceDifference] = useState<number>(0);

  // Fetch current departure prices
  const { data: departurePrices } = useQuery({
    queryKey: ["departure-prices", currentDepartureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("price_quad, price_triple, price_double, price_single, package:packages(price_quad, price_triple, price_double, price_single)")
        .eq("id", currentDepartureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentDepartureId,
  });

  // Calculate new total price when room type changes
  useEffect(() => {
    if (selectedRoomType && departurePrices) {
      const prices: any = departurePrices;
      
      // Get price from departure first, fallback to package
      const getPrice = (type: string) => {
        const fromDeparture = prices[`price_${type}`] || 0;
        const fromPackage = prices.package?.[`price_${type}`] || 0;
        return fromDeparture || fromPackage || 0;
      };

      const pricePerPerson = getPrice(selectedRoomType);
      const calculated = pricePerPerson * totalPax;
      
      setNewTotalPrice(calculated);
      setPriceDifference(calculated - currentTotalPrice);
    } else {
      setNewTotalPrice(0);
      setPriceDifference(0);
    }
  }, [selectedRoomType, departurePrices, totalPax, currentTotalPrice]);

  const changeRoomTypeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoomType) throw new Error("Pilih tipe kamar terlebih dahulu");

      // 1. Update booking room_type and total_price
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          room_type: selectedRoomType as "double" | "quad" | "single" | "triple",
          total_price: newTotalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // 2. Update all booking_passengers room_preference
      const { error: passengersError } = await supabase
        .from("booking_passengers")
        .update({
          room_preference: selectedRoomType as "double" | "quad" | "single" | "triple",
        })
        .eq("booking_id", bookingId);

      if (passengersError) throw passengersError;

      // 3. If there's a price difference, create a payment record
      if (priceDifference !== 0) {
        const paymentType = priceDifference > 0 ? "upgrade" : "downgrade";
        const amount = Math.abs(priceDifference);
        
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            payment_code: `${paymentType === "upgrade" ? "UPG" : "DWN"}-${Date.now()}`,
            amount: amount,
            payment_method: "manual",
            status: "pending",
            notes: `${paymentType === "upgrade" ? "Upgrade" : "Downgrade"} tipe kamar dari ${currentRoomType} ke ${selectedRoomType}`,
          });

        if (paymentError) console.error("Gagal mencatat biaya perubahan kamar:", paymentError);
      }

      // 4. Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-passengers", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

      return { priceDifference };
    },
    onSuccess: () => {
      toast.success("Tipe kamar berhasil diubah");
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      onClose();
      setSelectedRoomType("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengubah tipe kamar");
    },
  });

  const roomTypeLabel = ROOM_TYPES.find(rt => rt.value === currentRoomType)?.label || currentRoomType;
  const selectedRoomTypeLabel = ROOM_TYPES.find(rt => rt.value === selectedRoomType)?.label || selectedRoomType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Ubah Tipe Kamar</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
              <Info className="h-4 w-4" />
              Status Saat Ini
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              <p>
                <strong>Tipe Kamar:</strong> {roomTypeLabel}
              </p>
              <p>
                <strong>Jumlah Jamaah:</strong> {totalPax} orang
              </p>
              <p>
                <strong>Total Harga:</strong> {formatCurrency(currentTotalPrice)}
              </p>
            </div>
          </div>

          {/* Room Type Selection */}
          <div className="space-y-2">
            <Label>Pilih Tipe Kamar Baru</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe kamar..." />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value} disabled={rt.value === currentRoomType}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Calculation */}
          {selectedRoomType && (
            <>
              <div className="p-3 rounded-md bg-muted text-xs space-y-2">
                <div className="flex justify-between">
                  <span>Tipe Kamar Baru:</span>
                  <strong>{selectedRoomTypeLabel}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Harga Baru:</span>
                  <strong>{formatCurrency(newTotalPrice)}</strong>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Selisih Harga:</span>
                  <span className={priceDifference > 0 ? "text-red-600" : priceDifference < 0 ? "text-green-600" : ""}>
                    {priceDifference > 0 ? "+" : ""}{formatCurrency(priceDifference)}
                  </span>
                </div>
              </div>

              {/* Price Difference Alert */}
              {priceDifference > 0 ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Biaya Tambahan
                  </div>
                  <div className="space-y-1 text-xs text-red-700">
                    <p>
                      Tipe kamar baru lebih mahal dari sebelumnya.
                    </p>
                    <p>
                      <strong>Biaya Tambahan:</strong> {formatCurrency(priceDifference)}
                    </p>
                    <p className="italic text-red-600">
                      Biaya tambahan akan ditambahkan ke tagihan booking.
                    </p>
                  </div>
                </div>
              ) : priceDifference < 0 ? (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
                  <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Pengembalian Dana
                  </div>
                  <div className="space-y-1 text-xs text-green-700">
                    <p>
                      Tipe kamar baru lebih murah dari sebelumnya.
                    </p>
                    <p>
                      <strong>Pengembalian Dana:</strong> {formatCurrency(Math.abs(priceDifference))}
                    </p>
                    <p className="italic text-green-600">
                      Pengembalian dana akan dicatat dalam sistem.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Harga Sama
                  </div>
                  <p className="text-xs text-blue-700">
                    Harga tipe kamar baru sama dengan sebelumnya.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={() => changeRoomTypeMutation.mutate()}
            disabled={!selectedRoomType || changeRoomTypeMutation.isPending}
          >
            {changeRoomTypeMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Konfirmasi Ubah Kamar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
