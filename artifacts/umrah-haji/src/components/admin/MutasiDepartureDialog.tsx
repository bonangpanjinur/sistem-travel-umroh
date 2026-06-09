import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Calendar, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingCode: string;
  currentDepartureId: string;
  currentPackageId: string;
  currentRoomType: string;
  totalPrice: number;
}

export function MutasiDepartureDialog({
  isOpen, onClose, bookingId, bookingCode, currentDepartureId, currentPackageId, currentRoomType, totalPrice
}: Props) {
  const queryClient = useQueryClient();
  const [targetDepartureId, setTargetDepartureId] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch available departures for the same package (open + quota tersedia)
  const { data: departures = [], isLoading: depsLoading } = useQuery({
    queryKey: ["mutasi-departures", currentPackageId],
    enabled: !!currentPackageId && isOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("departures")
        .select("id, departure_date, return_date, available_seats, status, price_quad, price_triple, price_double, price_single")
        .eq("package_id", currentPackageId)
        .neq("id", currentDepartureId)
        .in("status", ["open", "almost_full"])
        .gt("available_seats", 0)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const targetDep = departures.find((d: any) => d.id === targetDepartureId);
  const targetPrice = targetDep ? (targetDep[`price_${currentRoomType}`] || 0) : 0;
  const priceDiff = targetPrice - totalPrice;

  const mutasiMutation = useMutation({
    mutationFn: async () => {
      if (!targetDepartureId) throw new Error("Pilih keberangkatan tujuan");

      // Update booking departure_id
      const { error: bookingErr } = await (supabase as any)
        .from("bookings")
        .update({
          departure_id: targetDepartureId,
          total_price: targetPrice || totalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (bookingErr) throw bookingErr;

      // Log in booking_status_history
      const { error: logErr } = await (supabase as any)
        .from("booking_status_history")
        .insert({
          booking_id: bookingId,
          status: "mutasi_departure",
          notes: notes
            ? `Mutasi keberangkatan → ${format(new Date(targetDep!.departure_date), "dd MMM yyyy", { locale: idLocale })}. Catatan: ${notes}`
            : `Mutasi keberangkatan → ${format(new Date(targetDep!.departure_date), "dd MMM yyyy", { locale: idLocale })}`,
        });
      // Ignore log error — not critical
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Mutasi keberangkatan berhasil!", {
        description: `Booking ${bookingCode} dipindah ke ${targetDep ? format(new Date(targetDep.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-"}`,
      });
      onClose();
      setTargetDepartureId("");
      setNotes("");
    },
    onError: (e: any) => toast.error("Mutasi gagal: " + (e.message || "Terjadi kesalahan")),
  });

  const ROOM_LABELS: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };

  return (
    <Dialog open={isOpen} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" /> Mutasi Keberangkatan
          </DialogTitle>
          <DialogDescription>
            Pindahkan booking <strong>{bookingCode}</strong> ke keberangkatan lain dalam paket yang sama.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info booking saat ini */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Keberangkatan Saat Ini</p>
            <p className="font-semibold">{bookingCode} · Kamar {ROOM_LABELS[currentRoomType] || currentRoomType}</p>
            <p className="text-muted-foreground">Total: {formatCurrency(totalPrice)}</p>
          </div>

          {/* Pilih keberangkatan tujuan */}
          <div className="space-y-1.5">
            <Label>Keberangkatan Tujuan *</Label>
            {depsLoading ? (
              <p className="text-sm text-muted-foreground">Memuat daftar keberangkatan...</p>
            ) : departures.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada keberangkatan lain yang tersedia untuk paket ini. Pastikan ada keberangkatan dengan status terbuka dan seat tersedia.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={targetDepartureId} onValueChange={setTargetDepartureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((dep: any) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{format(new Date(dep.departure_date), "dd MMM yyyy", { locale: idLocale })}</span>
                        <Badge variant="outline" className="text-[10px] ml-1">
                          <Users className="w-2.5 h-2.5 mr-1" />
                          {dep.available_seats} seat
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Kalkulasi perbedaan harga */}
          {targetDep && (
            <div className={`rounded-lg border p-3 space-y-2 text-sm ${priceDiff === 0 ? "border-slate-200 bg-slate-50" : priceDiff > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Harga keberangkatan baru (kamar {ROOM_LABELS[currentRoomType]})</span>
                <span className="font-semibold">{formatCurrency(targetPrice)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Selisih harga</span>
                <span className={`font-bold ${priceDiff > 0 ? "text-amber-700" : priceDiff < 0 ? "text-green-700" : "text-slate-600"}`}>
                  {priceDiff > 0 ? `+ ${formatCurrency(priceDiff)} (jamaah harus bayar tambahan)` :
                   priceDiff < 0 ? `- ${formatCurrency(Math.abs(priceDiff))} (ada sisa pembayaran)` :
                   "Harga sama"}
                </span>
              </div>
              {priceDiff !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {priceDiff > 0
                    ? "Buat tagihan tambahan manual di tab Pembayaran setelah mutasi."
                    : "Proses refund selisih via tab Pembayaran setelah mutasi."}
                </p>
              )}
            </div>
          )}

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Textarea
              rows={2}
              placeholder="Alasan mutasi, permintaan jamaah, dll..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Mutasi akan langsung memperbarui booking. Pastikan seat tersedia di keberangkatan tujuan dan koordinasikan dengan jamaah terlebih dahulu.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => mutasiMutation.mutate()}
            disabled={!targetDepartureId || departures.length === 0 || mutasiMutation.isPending}
            className="gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {mutasiMutation.isPending ? "Memproses..." : "Konfirmasi Mutasi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
