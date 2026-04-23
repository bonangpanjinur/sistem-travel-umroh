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
import { Loader2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
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

      // 1. Update booking departure_id
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          departure_id: selectedDepartureId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // 2. If there's a penalty, create a payment record
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

      return true;
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
