import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoomAllocationVisualizer } from "@/components/booking/RoomAllocationVisualizer";
import { formatCurrency } from "@/lib/format";
import { BedDouble, Minus, Plus, AlertCircle, Info } from "lucide-react";
import { RoomType } from "@/types/database";
import { RoomAllocation } from "@/hooks/useBookingWizardDynamic";

interface StepRoomAllocationProps {
  totalPax: number;
  allocation: RoomAllocation;
  prices: Record<RoomType, number>;
  onUpdate: (allocation: RoomAllocation) => void;
  availableSeats?: number;
}

const ROOM_INFO: Record<RoomType, { label: string; occupancy: number; desc: string }> = {
  quad: { label: 'Quad', occupancy: 4, desc: '4 orang/kamar' },
  triple: { label: 'Triple', occupancy: 3, desc: '3 orang/kamar' },
  double: { label: 'Double', occupancy: 2, desc: '2 orang/kamar' },
  single: { label: 'Single', occupancy: 1, desc: '1 orang/kamar' },
};

export function StepRoomAllocation({ totalPax, allocation, prices, onUpdate, availableSeats }: StepRoomAllocationProps) {
  const currentAllocated = allocation.quad + allocation.triple + allocation.double + allocation.single;
  const remaining = totalPax - currentAllocated;

  const updateRoomCount = (type: RoomType, delta: number) => {
    const newCount = Math.max(0, allocation[type] + delta);
    const newTotal = (type === 'quad' ? newCount : allocation.quad) + 
                     (type === 'triple' ? newCount : allocation.triple) + 
                     (type === 'double' ? newCount : allocation.double) + 
                     (type === 'single' ? newCount : allocation.single);
    
    if (delta > 0 && currentAllocated >= totalPax) return;
    
    onUpdate({ ...allocation, [type]: newCount });
  };

  const doubleValidationError = allocation.double > 0 && allocation.double % 2 !== 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Alokasi Kamar</h3>
        <p className="text-sm text-muted-foreground">
          Tentukan tipe kamar untuk {totalPax} jamaah yang Anda daftarkan.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Status Alokasi</p>
            <p className="text-xs text-muted-foreground">
              {currentAllocated} dari {totalPax} jamaah teralokasi
            </p>
          </div>
        </div>
        <div className="text-right">
          {remaining === 0 ? (
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              Selesai
            </span>
          ) : (
            <span className="text-sm font-bold text-orange-600">
              Sisa {remaining} orang
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
          const price = prices[type];
          if (price === 0) return null;
          return (
            <div key={type} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <p className="font-bold text-base capitalize">{ROOM_INFO[type].label}</p>
                <p className="text-xs text-muted-foreground">{ROOM_INFO[type].desc}</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(price)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => updateRoomCount(type, -1)}
                  disabled={allocation[type] === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold text-lg">{allocation[type]}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => updateRoomCount(type, 1)}
                  disabled={currentAllocated >= totalPax}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {currentAllocated > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Visualisasi Kamar</Label>
          <RoomAllocationVisualizer allocation={allocation} totalPassengers={currentAllocated} />
        </div>
      )}

      {doubleValidationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tipe kamar Double harus berjumlah genap (kelipatan 2). Sisa 1 orang akan dipasangkan dengan staff.
          </AlertDescription>
        </Alert>
      )}

      {remaining > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Silakan alokasikan sisa {remaining} jamaah ke tipe kamar yang tersedia untuk melanjutkan.
          </AlertDescription>
        </Alert>
      )}

      {availableSeats !== undefined && availableSeats <= 10 && availableSeats > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sisa kursi terbatas!</strong> Hanya tersisa <strong>{availableSeats} kursi</strong> pada keberangkatan ini. Selesaikan pendaftaran sebelum kehabisan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
