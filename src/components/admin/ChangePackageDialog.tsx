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
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { differenceInDays, parseISO } from "date-fns";

interface ChangePackageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  currentDepartureId: string;
  currentDepartureDate: string;
}

export function ChangePackageDialog({
  isOpen,
  onClose,
  bookingId,
  currentDepartureId,
  currentDepartureDate,
}: ChangePackageDialogProps) {
  const queryClient = useQueryClient();
  const { getSetting, isLoading: isLoadingSettings } = useCompanySettings();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [penaltyFee, setPenaltyFee] = useState<number>(0);
  const [daysToDeparture, setDaysToDeparture] = useState<number>(0);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(false);

  // Fetch available departures
  const { data: departures, isLoading: isLoadingDepartures } = useQuery({
    queryKey: ["available-departures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          *,
          package:packages(name)
        `)
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
      const deadlineDays = parseInt(getSetting("package_change_deadline_days")) || 60;
      const penaltyAmount = parseFloat(getSetting("package_change_penalty_fee")) || 0;
      
      const departureDate = parseISO(currentDepartureDate);
      const today = new Date();
      const diff = differenceInDays(departureDate, today);
      
      setDaysToDeparture(diff);
      const passed = diff < deadlineDays;
      setIsDeadlinePassed(passed);
      setPenaltyFee(passed ? penaltyAmount : 0);
    }
  }, [isOpen, currentDepartureDate, getSetting]);

  const changePackageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDepartureId) throw new Error("Pilih paket tujuan terlebih dahulu");

      // 1. Update booking departure_id
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          departure_id: selectedDepartureId,
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // 2. If there's a penalty, create a payment record or update total_amount
      // For now, we'll just add a note or log it. 
      // Ideally, we should add this to the booking's total_amount if the schema supports it,
      // or create a 'penalty' payment record.
      if (penaltyFee > 0) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            amount: penaltyFee,
            payment_method: "manual",
            payment_type: "other",
            status: "pending",
            notes: `Denda pindah paket (H-${daysToDeparture} keberangkatan)`,
          });
        
        if (paymentError) console.error("Gagal mencatat denda:", paymentError);
      }

      return true;
    },
    onSuccess: () => {
      toast.success("Paket berhasil dipindahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memindahkan paket");
    },
  });

  const selectedDeparture = departures?.find(d => d.id === selectedDepartureId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pindah Paket / Keberangkatan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <Info className="h-4 w-4" />
              Informasi Batas Waktu
            </div>
            <p className="text-xs text-amber-700">
              Keberangkatan saat ini: <strong>{formatDate(currentDepartureDate)}</strong> ({daysToDeparture} hari lagi).
              Batas pindah paket gratis adalah H-{getSetting("package_change_deadline_days") || 60} hari.
            </p>
            {isDeadlinePassed ? (
              <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-200 rounded text-red-800 text-xs mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Batas waktu telah terlewati. Pindah paket akan dikenakan denda sebesar <strong>{formatCurrency(penaltyFee)}</strong>.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2 bg-green-100 border border-green-200 rounded text-green-800 text-xs mt-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>Anda masih dalam periode bebas denda pindah paket.</span>
              </div>
            )}
          </div>

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

          {selectedDeparture && (
            <div className="p-3 rounded-md bg-muted text-xs space-y-1">
              <p><strong>Paket:</strong> {selectedDeparture.package?.name}</p>
              <p><strong>Tanggal:</strong> {formatDate(selectedDeparture.departure_date)}</p>
              <p><strong>Sisa Kuota:</strong> {selectedDeparture.quota - (selectedDeparture.booked_count || 0)} pax</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button 
            onClick={() => changePackageMutation.mutate()} 
            disabled={!selectedDepartureId || changePackageMutation.isPending}
          >
            {changePackageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Konfirmasi Pindah Paket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
