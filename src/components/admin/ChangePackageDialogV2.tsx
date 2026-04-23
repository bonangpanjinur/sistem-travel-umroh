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
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2, AlertTriangle, Info, CheckCircle2, TrendingUp } from "lucide-react";
import { useCalculatePackageChangePenalty } from "@/hooks/usePackageChangeRules";
import { differenceInDays, parseISO } from "date-fns";

interface ChangePackageDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  currentPackageId: string;
  currentDepartureId: string;
  currentDepartureDate: string;
}

export function ChangePackageDialogV2({
  isOpen,
  onClose,
  bookingId,
  currentPackageId,
  currentDepartureId,
  currentDepartureDate,
}: ChangePackageDialogV2Props) {
  const queryClient = useQueryClient();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [daysToDeparture, setDaysToDeparture] = useState<number>(0);
  const [upgradeFee, setUpgradeFee] = useState<number>(0);

  // Fetch current departure price to compare
  const { data: currentDeparture } = useQuery({
    queryKey: ["current-departure-price", currentDepartureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, price_quad, price_triple, price_double, price_single, package:packages(id, name, price_quad, price_triple, price_double, price_single)")
        .eq("id", currentDepartureId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!currentDepartureId,
  });

  // Fetch new departure price when selected
  const { data: newDeparturePrices } = useQuery({
    queryKey: ["new-departure-prices", selectedDepartureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, price_quad, price_triple, price_double, price_single")
        .eq("id", selectedDepartureId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!selectedDepartureId,
  });

  // Calculate upgrade fee when new departure is selected
  // This calculates based on departure prices - actual calculation happens on submit
  useEffect(() => {
    if (selectedDepartureId && currentDeparture && newDeparturePrices) {
      // Get current departure prices (using quad as baseline)
      const currentPrice = currentDeparture.price_quad || currentDeparture.package?.price_quad || 0;
      // Get new departure prices (using quad as baseline)
      const newPrice = newDeparturePrices.price_quad || newDeparturePrices.package?.price_quad || 0;
      if (newPrice > currentPrice) {
        setUpgradeFee(newPrice - currentPrice);
      } else {
        setUpgradeFee(0);
      }
    } else {
      setUpgradeFee(0);
    }
  }, [selectedDepartureId, currentDeparture, newDeparturePrices]);

  // Fetch penalty info for current package
  const { data: penaltyInfo, isLoading: isLoadingPenalty } =
    useCalculatePackageChangePenalty(currentPackageId, currentDepartureDate);

  // Fetch available departures
  const { data: departures, isLoading: isLoadingDepartures } = useQuery({
    queryKey: ["available-departures-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(
          `
          *,
          package:packages(id, name)
        `
        )
        .eq("status", "open")
        .neq("id", currentDepartureId)
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && currentDepartureDate) {
      const departureDate = parseISO(currentDepartureDate);
      const today = new Date();
      const diff = differenceInDays(departureDate, today);
      setDaysToDeparture(diff);
    }
  }, [isOpen, currentDepartureDate]);

  const changePackageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDepartureId) throw new Error("Pilih paket tujuan terlebih dahulu");

      // 1. Get current booking info with passengers
      const { data: currentBooking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          id,
          total_price,
          departure:departures(
            id,
            package_id,
            price_quad,
            price_triple,
            price_double,
            price_single
          )
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // 2. Get passengers separately
      const { data: passengersData, error: passengersError } = await supabase
        .from("booking_passengers")
        .select("room_type, passenger_type")
        .eq("booking_id", bookingId);

      if (passengersError) throw passengersError;

      const passengers = passengersData || [];

      // 2. Get new departure/package price info
      const { data: newDeparture, error: newDepError } = await supabase
        .from("departures")
        .select(`
          id,
          price_quad,
          price_triple,
          price_double,
          price_single,
          package:packages(id, name, price_quad, price_triple, price_double, price_single)
        `)
        .eq("id", selectedDepartureId)
        .single();

      if (newDepError) throw newDepError;

      // 3. Calculate new total based on passengers room types
      const currentPrices = currentBooking?.departure || {};
      const newPrices = newDeparture || {};
      
      // Get prices from departure first, fallback to package
      const getPrice = (type: string, prices: any) => {
        return prices[`price_${type}`] || prices.package?.[`price_${type}`] || 0;
      };
      
      // Calculate new total based on each passenger's room type
      let newTotal = 0;
      for (const p of passengers) {
        const roomType = p.room_type || 'quad';
        newTotal += getPrice(roomType, newPrices);
      }

      // If no passengers or no room type, use quad price
      if (newTotal === 0) {
        newTotal = getPrice('quad', newPrices);
      }

      // Calculate upgrade fee (difference)
      const oldTotal = currentBooking?.total_price || 0;
      const priceDiff = newTotal - oldTotal;
      const upgradeFee = priceDiff > 0 ? priceDiff : 0;

      // 4. Update booking departure_id and total_price
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          departure_id: selectedDepartureId,
          total_price: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // 5. If there's a penalty, create a payment record
      if (penaltyInfo?.applicable && penaltyInfo.penaltyAmount > 0) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            amount: penaltyInfo.penaltyAmount,
            payment_method: "manual",
            payment_type: "other",
            status: "pending",
            notes: `Denda pindah paket (H-${daysToDeparture} keberangkatan): ${penaltyInfo.reason}`,
          });

        if (paymentError) console.error("Gagal mencatat denda:", paymentError);
      }

      // 6. If there's an upgrade fee, create a payment record
      if (upgradeFee > 0) {
        const { error: upgradeError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            amount: upgradeFee,
            payment_method: "manual",
            payment_type: "other",
            status: "pending",
            notes: `Selisih upgrade paket (dari Rp ${formatCurrency(currentPrice)} ke Rp ${formatCurrency(newPrice)})`,
          });

        if (upgradeError) console.error("Gagal mencatat upgrade fee:", upgradeError);
      }

      return { upgradeFee, penaltyAmount: penaltyInfo?.penaltyAmount || 0 };
    },
    onSuccess: () => {
      toast.success("Paket berhasil dipindahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      onClose();
      setSelectedDepartureId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memindahkan paket");
    },
  });

  const selectedDeparture = departures?.find((d) => d.id === selectedDepartureId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Pindah Paket / Keberangkatan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
              <Info className="h-4 w-4" />
              Status Saat Ini
            </div>
            <p className="text-xs text-blue-700">
              Keberangkatan: <strong>{formatDate(currentDepartureDate)}</strong> (
              <strong>{daysToDeparture}</strong> hari lagi)
            </p>
          </div>

          {/* Penalty Information */}
          {isLoadingPenalty ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : penaltyInfo?.applicable ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                Denda Berlaku
              </div>
              <div className="space-y-1 text-xs text-red-700">
                <p>
                  <strong>Alasan:</strong> {penaltyInfo.reason}
                </p>
                <p>
                  <strong>Nominal Denda:</strong> {formatCurrency(penaltyInfo.penaltyAmount)}
                </p>
                <p className="italic text-red-600">
                  Denda akan ditambahkan ke tagihan booking Anda.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
              <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Bebas Denda
              </div>
              <p className="text-xs text-green-700">
                Anda masih dalam periode bebas denda pindah paket.
              </p>
            </div>
          )}

          {/* Upgrade Fee Information */}
          {selectedDepartureId && (
            <>
              {upgradeFee > 0 ? (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Biaya Upgrade Paket
                  </div>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>
                      Paket baru lebih mahal dari paket sebelumnya.
                    </p>
                    <p>
                      <strong>Selisih Harga:</strong> {formatCurrency(upgradeFee)}
                    </p>
                    <p className="italic text-blue-600">
                      Biaya upgrade akan ditambahkan ke tagihan booking.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
                  <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Paket Sama atau Lebih Murah
                  </div>
                  <p className="text-xs text-green-700">
                    Paket baru tidak lebih mahal atau biaya upgrade tidak berlaku.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Package Selection */}
          <div className="space-y-2">
            <Label>Pilih Paket & Tanggal Keberangkatan Baru</Label>
            <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih keberangkatan..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDepartures ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  departures?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.package?.name} - {formatDate(d.departure_date)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Departure Details */}
          {selectedDeparture && (
            <div className="p-3 rounded-md bg-muted text-xs space-y-1">
              <p>
                <strong>Paket:</strong> {selectedDeparture.package?.name}
              </p>
              <p>
                <strong>Tanggal:</strong> {formatDate(selectedDeparture.departure_date)}
              </p>
              <p>
                <strong>Sisa Kuota:</strong>{" "}
                {selectedDeparture.quota - (selectedDeparture.booked_count || 0)} pax
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={() => changePackageMutation.mutate()}
            disabled={!selectedDepartureId || changePackageMutation.isPending}
          >
            {changePackageMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Konfirmasi Pindah Paket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
