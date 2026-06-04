import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, getRoomTypeLabel } from "@/lib/format";
import { Loader2, Users, BedDouble, Info } from "lucide-react";

type RoomType = "quad" | "triple" | "double" | "single";

const ROOM_TYPES: { value: RoomType; label: string; capacity: string; color: string }[] = [
  { value: "quad",   label: "Quad",   capacity: "4 orang/kamar", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "triple", label: "Triple", capacity: "3 orang/kamar", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "double", label: "Double", capacity: "2 orang/kamar", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  { value: "single", label: "Single", capacity: "1 orang/kamar", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  passengers: any[];
  departure: any;
}

export function RoomTypeAssignmentDialog({ isOpen, onClose, bookingId, passengers, departure }: Props) {
  const queryClient = useQueryClient();
  const pkg = departure?.package;

  const getPriceForType = (rt: RoomType): number => {
    const fromDep = (departure as any)?.[`price_${rt}`] as number | null | undefined;
    const fromPkg = (pkg as any)?.[`price_${rt}`] as number | null | undefined;
    return fromDep || fromPkg || 0;
  };

  const [roomMap, setRoomMap] = useState<Record<string, RoomType>>({});

  useEffect(() => {
    if (isOpen && passengers.length > 0) {
      const initial: Record<string, RoomType> = {};
      passengers.forEach((p) => {
        initial[p.id] = (p.room_preference as RoomType) || "quad";
      });
      setRoomMap(initial);
    }
  }, [isOpen, passengers]);

  const { groupedByRoom, newTotalPrice } = useMemo(() => {
    const groups: Partial<Record<RoomType, { passengers: any[]; pricePerPax: number; subtotal: number }>> = {};
    let total = 0;

    Object.entries(roomMap).forEach(([pid, rt]) => {
      const passenger = passengers.find((p) => p.id === pid);
      if (!passenger) return;
      if (!groups[rt]) {
        const price = getPriceForType(rt);
        groups[rt] = { passengers: [], pricePerPax: price, subtotal: 0 };
      }
      groups[rt]!.passengers.push(passenger);
      groups[rt]!.subtotal += groups[rt]!.pricePerPax;
      total += groups[rt]!.pricePerPax;
    });

    return { groupedByRoom: groups, newTotalPrice: total };
  }, [roomMap, departure]);

  const setAllToType = (rt: RoomType) => {
    const next: Record<string, RoomType> = {};
    passengers.forEach((p) => { next[p.id] = rt; });
    setRoomMap(next);
  };

  const getDominantRoomType = (): RoomType => {
    const counts: Partial<Record<RoomType, number>> = {};
    Object.values(roomMap).forEach((rt) => { counts[rt] = (counts[rt] || 0) + 1; });
    let max = 0;
    let dominant: RoomType = "quad";
    (Object.entries(counts) as [RoomType, number][]).forEach(([rt, c]) => {
      if (c > max) { max = c; dominant = rt; }
    });
    return dominant;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(roomMap).map(([pid, rt]) =>
        supabase.from("booking_passengers").update({ room_preference: rt }).eq("id", pid)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      // Update booking: total_price, base_price, dominant room_type
      const dominant = getDominantRoomType();
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          total_price: newTotalPrice,
          base_price: Math.round(newTotalPrice / passengers.length),
          room_type: dominant,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (bookingErr) throw bookingErr;

      // Update booking_line_items for each passenger
      for (const [pid, rt] of Object.entries(roomMap)) {
        const price = getPriceForType(rt);
        const description = `Paket Umroh - Room ${rt.charAt(0).toUpperCase() + rt.slice(1)}`;
        
        const { error: lineItemErr } = await supabase
          .from("booking_line_items" as any)
          .update({
            description: description,
            unit_price: price,
            total_price: price,
            updated_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId)
          .eq("passenger_id", pid);
        
        if (lineItemErr) {
          // If line item doesn't exist for this passenger, create it
          await supabase
            .from("booking_line_items" as any)
            .insert({
              booking_id: bookingId,
              passenger_id: pid,
              description: description,
              quantity: 1,
              unit_price: price,
              total_price: price,
              item_type: 'package'
            });
        }
      }
    },
    onSuccess: () => {
      toast.success("Alokasi kamar berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-passengers", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan alokasi kamar");
    },
  });

  const hasChanges = useMemo(() => {
    return passengers.some((p) => roomMap[p.id] && roomMap[p.id] !== (p.room_preference || "quad"));
  }, [roomMap, passengers]);

  if (passengers.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Alokasi Tipe Kamar Per Jamaah
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Price reference */}
          <div className="grid grid-cols-4 gap-2">
            {ROOM_TYPES.map((rt) => {
              const price = getPriceForType(rt.value);
              return (
                <div key={rt.value} className={`rounded-lg p-2.5 text-center ${rt.color} text-xs`}>
                  <p className="font-bold">{rt.label}</p>
                  <p className="text-[10px] opacity-70">{rt.capacity}</p>
                  <p className="font-black mt-1">{price ? formatCurrency(price) : "-"}</p>
                </div>
              );
            })}
          </div>

          {/* Quick set all */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Atur semua ke:</span>
            {ROOM_TYPES.map((rt) => (
              <Button
                key={rt.value}
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold"
                onClick={() => setAllToType(rt.value)}
              >
                Semua {rt.label}
              </Button>
            ))}
          </div>

          {/* Per-passenger assignment */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Daftar Jamaah ({passengers.length} orang)
              </span>
            </div>
            <div className="divide-y">
              {passengers.map((p, idx) => {
                const c = p.customer as any;
                const currentType = roomMap[p.id] || "quad";
                const rtInfo = ROOM_TYPES.find((r) => r.value === currentType)!;
                const price = getPriceForType(currentType);
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c?.full_name || `Jamaah ${idx + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {p.passenger_type || "dewasa"} · {p.customer?.gender === "male" ? "Laki-laki" : "Perempuan"}
                      </p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 hidden sm:inline-flex ${rtInfo.color}`}>
                      {rtInfo.label}
                    </Badge>
                    <Select
                      value={currentType}
                      onValueChange={(v) =>
                        setRoomMap((prev) => ({ ...prev, [p.id]: v as RoomType }))
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPES.map((rt) => (
                          <SelectItem key={rt.value} value={rt.value} className="text-xs">
                            <span className="font-semibold">{rt.label}</span>
                            {getPriceForType(rt.value) > 0 && (
                              <span className="text-muted-foreground ml-2">
                                {formatCurrency(getPriceForType(rt.value))}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs font-bold text-right w-24 shrink-0 tabular-nums">
                      {price ? formatCurrency(price) : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary breakdown */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2.5 border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Ringkasan Alokasi Kamar
            </p>
            {(Object.entries(groupedByRoom) as [RoomType, { passengers: any[]; pricePerPax: number; subtotal: number }][]).map(([rt, group]) => {
              const rtInfo = ROOM_TYPES.find((r) => r.value === rt)!;
              return (
                <div key={rt} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${rtInfo.color}`}>{rtInfo.label}</Badge>
                    <span className="text-muted-foreground">
                      {group.passengers.length} jamaah × {formatCurrency(group.pricePerPax)}
                    </span>
                  </div>
                  <span className="font-bold">{formatCurrency(group.subtotal)}</span>
                </div>
              );
            })}
            <div className="pt-2.5 border-t flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-tight">Total Harga Baru</span>
              <span className="text-lg font-black text-primary">{formatCurrency(newTotalPrice)}</span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Perubahan tipe kamar akan memperbarui total tagihan booking secara otomatis.
              Jamaah yang sudah membayar sebagian akan tetap memiliki sisa tagihan yang disesuaikan.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !hasChanges}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Alokasi Kamar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
