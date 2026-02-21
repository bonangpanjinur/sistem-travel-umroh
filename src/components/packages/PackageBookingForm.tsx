import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, BedDouble, Minus, Plus, Loader2, Info, Plane, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomType } from "@/types/database";

interface PackageBookingFormProps {
  packageId: string;
}

interface RoomAllocation {
  quad: number;
  triple: number;
  double: number;
  single: number;
}

const ROOM_INFO: Record<RoomType, { label: string; occupancy: number; desc: string }> = {
  quad: { label: 'Quad', occupancy: 4, desc: '4 orang/kamar' },
  triple: { label: 'Triple', occupancy: 3, desc: '3 orang/kamar' },
  double: { label: 'Double', occupancy: 2, desc: '2 orang/kamar' },
  single: { label: 'Single', occupancy: 1, desc: '1 orang/kamar' },
};

export function PackageBookingForm({ packageId }: PackageBookingFormProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({
    quad: 0,
    triple: 0,
    double: 0,
    single: 0,
  });

  // Fetch departures with pricing and hotel info
  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: ['package-departures', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          *,
          airline:airlines(code, name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating)
        `)
        .eq('package_id', packageId)
        .eq('status', 'open')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const selectedDepartureData = departures?.find(d => d.id === selectedDeparture);
  const availableSeats = selectedDepartureData 
    ? selectedDepartureData.quota - (selectedDepartureData.booked_count || 0)
    : 99;

  // Get prices from selected departure
  const prices = useMemo(() => {
    if (!selectedDepartureData) {
      return { quad: 0, triple: 0, double: 0, single: 0 };
    }
    return {
      quad: selectedDepartureData.price_quad || 0,
      triple: selectedDepartureData.price_triple || 0,
      double: selectedDepartureData.price_double || 0,
      single: selectedDepartureData.price_single || 0,
    };
  }, [selectedDepartureData]);

  // Check if departure has pricing
  const hasPricing = prices.quad > 0 || prices.triple > 0 || prices.double > 0 || prices.single > 0;

  // Calculate totals
  const { totalPassengers, totalPrice, roomSummary } = useMemo(() => {
    const passengers = roomAllocation.quad + roomAllocation.triple + roomAllocation.double + roomAllocation.single;
    
    const price = 
      (roomAllocation.quad * prices.quad) +
      (roomAllocation.triple * prices.triple) +
      (roomAllocation.double * prices.double) +
      (roomAllocation.single * prices.single);

    // Calculate rooms needed
    const summary: string[] = [];
    if (roomAllocation.quad > 0) {
      const rooms = Math.ceil(roomAllocation.quad / 4);
      summary.push(`${rooms} Quad`);
    }
    if (roomAllocation.triple > 0) {
      const rooms = Math.ceil(roomAllocation.triple / 3);
      summary.push(`${rooms} Triple`);
    }
    if (roomAllocation.double > 0) {
      const rooms = Math.ceil(roomAllocation.double / 2);
      const leftover = roomAllocation.double % 2;
      if (leftover > 0) {
        summary.push(`${rooms} Double (${leftover} akan dipasangkan staff)`);
      } else {
        summary.push(`${rooms} Double`);
      }
    }
    if (roomAllocation.single > 0) {
      summary.push(`${roomAllocation.single} Single`);
    }

    return { totalPassengers: passengers, totalPrice: price, roomSummary: summary };
  }, [roomAllocation, prices]);

  const updateRoomCount = (type: RoomType, delta: number) => {
    setRoomAllocation(prev => {
      const newCount = Math.max(0, prev[type] + delta);
      const newTotal = (type === 'quad' ? newCount : prev.quad) +
                       (type === 'triple' ? newCount : prev.triple) +
                       (type === 'double' ? newCount : prev.double) +
                       (type === 'single' ? newCount : prev.single);
      
      // Don't exceed available seats
      if (newTotal > availableSeats) return prev;
      
      return { ...prev, [type]: newCount };
    });
  };

  // Reset room allocation when departure changes
  const handleDepartureChange = (departureId: string) => {
    setSelectedDeparture(departureId);
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
  };

  const handleProceed = () => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(`/packages/${packageId}`)}`);
      return;
    }

    // Encode room allocation as URL params
    const params = new URLSearchParams({
      departure: selectedDeparture,
      quad: roomAllocation.quad.toString(),
      triple: roomAllocation.triple.toString(),
      double: roomAllocation.double.toString(),
      single: roomAllocation.single.toString(),
    });
    navigate(`/booking/${packageId}?${params.toString()}`);
  };

  const canProceed = selectedDeparture && totalPassengers > 0 && hasPricing;

  if (departuresLoading) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Pesan Sekarang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 1. Pilih Tanggal Keberangkatan */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Tanggal Keberangkatan
          </Label>
          <Select value={selectedDeparture} onValueChange={handleDepartureChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih tanggal" />
            </SelectTrigger>
            <SelectContent>
              {departures && departures.length > 0 ? (
                departures.map((dep) => {
                  const seats = dep.quota - (dep.booked_count || 0);
                  const hasPrice = (dep.price_quad || 0) > 0;
                  return (
                    <SelectItem 
                      key={dep.id} 
                      value={dep.id}
                      disabled={seats <= 0}
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>
                          {format(new Date(dep.departure_date), "d MMM yyyy", { locale: idLocale })}
                        </span>
                        <span className={cn(
                          "text-xs",
                          seats < 10 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          ({seats} kursi)
                        </span>
                        {!hasPrice && (
                          <Badge variant="outline" className="text-xs">Harga TBA</Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="none" disabled>
                  Tidak ada jadwal tersedia
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* Departure Details */}
          {selectedDepartureData && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
              <p className="text-muted-foreground">
                Pulang: {format(new Date(selectedDepartureData.return_date), "d MMM yyyy", { locale: idLocale })}
              </p>
              {selectedDepartureData.airline && (
                <p className="flex items-center gap-1">
                  <Plane className="h-3 w-3" />
                  {selectedDepartureData.airline.name}
                </p>
              )}
              {(selectedDepartureData.hotel_makkah || selectedDepartureData.hotel_madinah) && (
                <div className="flex items-start gap-1">
                  <Hotel className="h-3 w-3 mt-0.5" />
                  <div>
                    {selectedDepartureData.hotel_makkah && (
                      <span>M: {selectedDepartureData.hotel_makkah.name}</span>
                    )}
                    {selectedDepartureData.hotel_makkah && selectedDepartureData.hotel_madinah && <span> • </span>}
                    {selectedDepartureData.hotel_madinah && (
                      <span>D: {selectedDepartureData.hotel_madinah.name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* No pricing warning */}
        {selectedDepartureData && !hasPricing && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="h-4 w-4 inline mr-2" />
            Harga untuk keberangkatan ini belum tersedia. Hubungi admin untuk informasi lebih lanjut.
          </div>
        )}

        {/* 2. Pilih Jumlah Jamaah per Tipe Kamar */}
        {selectedDepartureData && hasPricing && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <BedDouble className="h-4 w-4 text-primary" />
              Pilih Kamar & Jumlah Jamaah
            </Label>
            
            <div className="space-y-2">
              {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
                const info = ROOM_INFO[type];
                const count = roomAllocation[type];
                const price = prices[type];
                
                // Skip if no price for this room type
                if (price <= 0) return null;
                
                return (
                  <div 
                    key={type}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors",
                      count > 0 ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{info.label}</span>
                        <span className="text-xs text-muted-foreground">({info.desc})</span>
                      </div>
                      <span className="text-xs text-primary font-medium">
                        {formatCurrency(price)}/org
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateRoomCount(type, -1)}
                        disabled={count <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{count}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateRoomCount(type, 1)}
                        disabled={totalPassengers >= availableSeats}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Summary */}
            {roomSummary.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Ringkasan Kamar:</p>
                    {roomSummary.map((s, i) => (
                      <p key={i}>• {s}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total Summary */}
        {hasPricing && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total Jamaah
              </span>
              <span className="font-medium">{totalPassengers} orang</span>
            </div>
            
            {totalPassengers > 0 && (
              <>
                <div className="text-xs text-muted-foreground space-y-1">
                  {roomAllocation.quad > 0 && prices.quad > 0 && (
                    <div className="flex justify-between">
                      <span>{roomAllocation.quad}x Quad @ {formatCurrency(prices.quad)}</span>
                      <span>{formatCurrency(roomAllocation.quad * prices.quad)}</span>
                    </div>
                  )}
                  {roomAllocation.triple > 0 && prices.triple > 0 && (
                    <div className="flex justify-between">
                      <span>{roomAllocation.triple}x Triple @ {formatCurrency(prices.triple)}</span>
                      <span>{formatCurrency(roomAllocation.triple * prices.triple)}</span>
                    </div>
                  )}
                  {roomAllocation.double > 0 && prices.double > 0 && (
                    <div className="flex justify-between">
                      <span>{roomAllocation.double}x Double @ {formatCurrency(prices.double)}</span>
                      <span>{formatCurrency(roomAllocation.double * prices.double)}</span>
                    </div>
                  )}
                  {roomAllocation.single > 0 && prices.single > 0 && (
                    <div className="flex justify-between">
                      <span>{roomAllocation.single}x Single @ {formatCurrency(prices.single)}</span>
                      <span>{formatCurrency(roomAllocation.single * prices.single)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* CTA Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleProceed}
          disabled={!canProceed || authLoading}
        >
          {authLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {!user ? 'Login untuk Pesan' : 'Lanjut ke Data Jamaah'}
        </Button>

        {!selectedDeparture && departures && departures.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Pilih tanggal keberangkatan untuk melanjutkan
          </p>
        )}
        {selectedDeparture && hasPricing && totalPassengers === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Pilih jumlah jamaah per tipe kamar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
