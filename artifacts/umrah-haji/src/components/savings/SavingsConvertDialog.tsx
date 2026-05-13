import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Plane, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  savingsPlan: {
    id: string;
    package_id: string;
    paid_amount: number;
    target_amount: number;
    locked_price?: number | null;
  };
}

const ROOM_TYPES = [
  { value: "quad", label: "Quad (4 orang/kamar)" },
  { value: "triple", label: "Triple (3 orang/kamar)" },
  { value: "double", label: "Double (2 orang/kamar)" },
  { value: "single", label: "Single (1 orang/kamar)" },
];

export function SavingsConvertDialog({ open, onOpenChange, savingsPlan }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [departureId, setDepartureId] = useState<string>("");
  const [roomType, setRoomType] = useState<string>("quad");

  const { data: departures = [], isLoading } = useQuery({
    queryKey: ["available-departures", savingsPlan.package_id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, quota, booked_count, status, price_quad, price_triple, price_double, price_single")
        .eq("package_id", savingsPlan.package_id)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .neq("status", "cancelled")
        .order("departure_date");
      return data || [];
    },
  });

  const selectedDeparture = departures.find((d: any) => d.id === departureId);
  const currentPrice = selectedDeparture
    ? (selectedDeparture as any)[`price_${roomType}`] || 0
    : 0;
  const lockedPrice = savingsPlan.locked_price || savingsPlan.target_amount;
  const priceDifference = currentPrice - lockedPrice;
  const remaining = lockedPrice - savingsPlan.paid_amount;

  const convert = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("convert_savings_to_booking" as any, {
        _savings_plan_id: savingsPlan.id,
        _departure_id: departureId,
        _room_type: roomType,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (bookingId) => {
      toast.success("Tabungan berhasil dikonversi ke booking!");
      qc.invalidateQueries({ queryKey: ["savings-plans"] });
      onOpenChange(false);
      navigate(`/my-bookings/${bookingId}`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal konversi tabungan"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Konversi Tabungan ke Booking
          </DialogTitle>
          <DialogDescription>
            Pilih jadwal keberangkatan & tipe kamar. Harga terkunci akan tetap berlaku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
              <Lock className="h-4 w-4" />
              <span className="font-semibold">Harga Terkunci: {formatCurrency(lockedPrice)}</span>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              Sudah terbayar: {formatCurrency(savingsPlan.paid_amount)} • Sisa: {formatCurrency(remaining)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Pilih Keberangkatan</Label>
            <Select value={departureId} onValueChange={setDepartureId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Memuat..." : "Pilih jadwal"} />
              </SelectTrigger>
              <SelectContent>
                {departures.map((d: any) => {
                  const seats = (d.quota || 0) - (d.booked_count || 0);
                  return (
                    <SelectItem key={d.id} value={d.id} disabled={seats <= 0}>
                      {format(new Date(d.departure_date), "d MMM yyyy", { locale: idLocale })} · sisa {seats} kursi
                    </SelectItem>
                  );
                })}
                {!isLoading && departures.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">Belum ada jadwal tersedia</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipe Kamar</Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDeparture && priceDifference > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Harga jadwal saat ini {formatCurrency(currentPrice)} (selisih +{formatCurrency(priceDifference)}). Anda dilindungi harga terkunci.
                <Badge variant="secondary" className="ml-2">Hemat {formatCurrency(priceDifference)}</Badge>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={() => convert.mutate()}
            disabled={!departureId || convert.isPending}
          >
            {convert.isPending ? "Memproses..." : "Konfirmasi Konversi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
