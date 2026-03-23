import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, BedDouble, Minus, Plus, Loader2, Info, Plane, Hotel, MessageCircle, Building2, UserCheck, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomType } from "@/types/database";
import { HotelDisplay } from "@/components/hotels/HotelDisplay";
import { PICSelectionStepImproved } from "@/components/booking/PICSelectionStepImproved";
import { useTenant } from "@/contexts/TenantContext";

interface PackageBookingFormProps {
  pkg: any;
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

type PICSource = 'pusat' | 'cabang' | 'agen' | 'referral';

export function PackageBookingForm({ pkg }: PackageBookingFormProps) {
  const packageId = pkg.id;
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { tenant } = useTenant();
  
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({ quad: 0, triple: 0, double: 0, single: 0 });
  const [picSource, setPicSource] = useState<PICSource>('pusat');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');

  // Auto-set PIC based on tenant context
  useEffect(() => {
    if (tenant.type === 'branch' && tenant.id && picSource !== 'cabang') {
      setPicSource('cabang');
      setSelectedBranchId(tenant.id);
    } else if (tenant.type === 'agent' && tenant.id && picSource !== 'agen') {
      setPicSource('agen');
      setSelectedAgentId(tenant.id);
    }
  }, [tenant.type, tenant.id]);

  // Fetch departures
  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: ['package-departures', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`*, airline:airlines(code, name)`)
        .eq('package_id', packageId)
        .eq('status', 'open')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch branches for PIC selection
  const { data: branches } = useQuery({
    queryKey: ['active-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, city, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch agents for PIC selection
  const { data: agents } = useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, company_name, agent_code').eq('is_active', true).order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const selectedDepartureData = departures?.find(d => d.id === selectedDeparture);
  const availableSeats = selectedDepartureData ? selectedDepartureData.quota - (selectedDepartureData.booked_count || 0) : 99;

  const prices = useMemo(() => {
    if (!selectedDepartureData) return { quad: 0, triple: 0, double: 0, single: 0 };
    return {
      quad: selectedDepartureData.price_quad || 0,
      triple: selectedDepartureData.price_triple || 0,
      double: selectedDepartureData.price_double || 0,
      single: selectedDepartureData.price_single || 0,
    };
  }, [selectedDepartureData]);

  const hasPricing = prices.quad > 0 || prices.triple > 0 || prices.double > 0 || prices.single > 0;

  const { totalPassengers, totalPrice, roomSummary } = useMemo(() => {
    const passengers = roomAllocation.quad + roomAllocation.triple + roomAllocation.double + roomAllocation.single;
    const price = (roomAllocation.quad * prices.quad) + (roomAllocation.triple * prices.triple) + (roomAllocation.double * prices.double) + (roomAllocation.single * prices.single);
    const summary: string[] = [];
    if (roomAllocation.quad > 0) summary.push(`${Math.ceil(roomAllocation.quad / 4)} Quad`);
    if (roomAllocation.triple > 0) summary.push(`${Math.ceil(roomAllocation.triple / 3)} Triple`);
    if (roomAllocation.double > 0) {
      const rooms = Math.ceil(roomAllocation.double / 2);
      const leftover = roomAllocation.double % 2;
      summary.push(leftover > 0 ? `${rooms} Double (${leftover} akan dipasangkan staff)` : `${rooms} Double`);
    }
    if (roomAllocation.single > 0) summary.push(`${roomAllocation.single} Single`);
    return { totalPassengers: passengers, totalPrice: price, roomSummary: summary };
  }, [roomAllocation, prices]);

  const updateRoomCount = (type: RoomType, delta: number) => {
    setRoomAllocation(prev => {
      const newCount = Math.max(0, prev[type] + delta);
      const newTotal = (type === 'quad' ? newCount : prev.quad) + (type === 'triple' ? newCount : prev.triple) + (type === 'double' ? newCount : prev.double) + (type === 'single' ? newCount : prev.single);
      if (newTotal > availableSeats) return prev;
      return { ...prev, [type]: newCount };
    });
  };

  const handleDepartureChange = (departureId: string) => {
    setSelectedDeparture(departureId);
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
  };

  const handleProceed = () => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(`/packages/${packageId}`)}`);
      return;
    }

    const params = new URLSearchParams({
      departure: selectedDeparture,
      quad: roomAllocation.quad.toString(),
      triple: roomAllocation.triple.toString(),
      double: roomAllocation.double.toString(),
      single: roomAllocation.single.toString(),
      pic_source: picSource,
    });

    if (picSource === 'cabang' && selectedBranchId) params.set('branch_id', selectedBranchId);
    if (picSource === 'agen' && selectedAgentId) params.set('agent_id', selectedAgentId);
    if (picSource === 'referral' && referralCode) params.set('referral_code', referralCode);

    navigate(`/booking/${packageId}?${params.toString()}`);
  };

  const doubleValidationError = roomAllocation.double > 0 && roomAllocation.double % 2 !== 0;
  const canProceed = selectedDeparture && totalPassengers > 0 && hasPricing && !doubleValidationError;

  if (departuresLoading) {
    return (
      <Card className="sticky top-24 z-10">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
      <CardHeader className="pb-4"><CardTitle className="text-lg">Pesan Sekarang</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* 1. Pilih Tanggal Keberangkatan */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />Tanggal Keberangkatan
          </Label>
          <Select value={selectedDeparture} onValueChange={handleDepartureChange}>
            <SelectTrigger><SelectValue placeholder="Pilih tanggal" /></SelectTrigger>
            <SelectContent>
              {departures && departures.length > 0 ? departures.map((dep) => {
                const seats = dep.quota - (dep.booked_count || 0);
                const hasPrice = (dep.price_quad || 0) > 0;
                return (
                  <SelectItem key={dep.id} value={dep.id} disabled={seats <= 0}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{format(new Date(dep.departure_date), "d MMM yyyy", { locale: idLocale })}</span>
                      <span className={cn("text-xs", seats < 10 ? "text-destructive" : "text-muted-foreground")}>({seats} kursi)</span>
                      {!hasPrice && <Badge variant="outline" className="text-xs">Harga TBA</Badge>}
                    </div>
                  </SelectItem>
                );
              }) : (
                <SelectItem value="none" disabled>Tidak ada jadwal tersedia</SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {selectedDepartureData && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
              <p className="text-muted-foreground">Pulang: {format(new Date(selectedDepartureData.return_date), "d MMM yyyy", { locale: idLocale })}</p>
              {selectedDepartureData.airline && <p className="flex items-center gap-1"><Plane className="h-3 w-3" />{(selectedDepartureData.airline as any).name}</p>}
              {(selectedDepartureData.hotel_makkah_id || selectedDepartureData.hotel_madinah_id) && (
                <div className="flex items-start gap-1">
                  <Hotel className="h-3 w-3 mt-0.5" />
                  <div>
                    {selectedDepartureData.hotel_makkah_id && <span>M: <HotelDisplay hotelIds={selectedDepartureData.hotel_makkah_id} /></span>}
                    {selectedDepartureData.hotel_makkah_id && selectedDepartureData.hotel_madinah_id && <span> • </span>}
                    {selectedDepartureData.hotel_madinah_id && <span>D: <HotelDisplay hotelIds={selectedDepartureData.hotel_madinah_id} /></span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedDepartureData && !hasPricing && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="h-4 w-4 inline mr-2" />Harga untuk keberangkatan ini belum tersedia.
          </div>
        )}

        {/* 2. Pilih Jumlah Jamaah per Tipe Kamar */}
        {selectedDepartureData && hasPricing && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <BedDouble className="h-4 w-4 text-primary" />Jumlah Jamaah per Kamar
            </Label>
            <div className="space-y-3">
              {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
                const price = prices[type];
                if (price === 0) return null;
                return (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm capitalize">{ROOM_INFO[type].label}</p>
                      <p className="text-xs text-muted-foreground">{ROOM_INFO[type].desc}</p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateRoomCount(type, -1)} disabled={roomAllocation[type] === 0}><Minus className="h-3 w-3" /></Button>
                      <span className="w-4 text-center font-medium">{roomAllocation[type]}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateRoomCount(type, 1)} disabled={totalPassengers >= availableSeats}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Sumber Pendaftaran (PIC) */}
        {selectedDepartureData && hasPricing && totalPassengers > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4 text-primary" />Sumber Pendaftaran
            </Label>
            <RadioGroup value={picSource} onValueChange={(v) => setPicSource(v as PICSource)} className="space-y-2">
              <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/30">
                <RadioGroupItem value="pusat" id="pic-pusat" />
                <Label htmlFor="pic-pusat" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">Pusat</p><p className="text-xs text-muted-foreground">Daftar langsung melalui kantor pusat</p></div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/30">
                <RadioGroupItem value="cabang" id="pic-cabang" />
                <Label htmlFor="pic-cabang" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">Cabang</p><p className="text-xs text-muted-foreground">Daftar melalui kantor cabang</p></div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/30">
                <RadioGroupItem value="agen" id="pic-agen" />
                <Label htmlFor="pic-agen" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">Agen</p><p className="text-xs text-muted-foreground">Daftar melalui agen resmi</p></div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/30">
                <RadioGroupItem value="referral" id="pic-referral" />
                <Label htmlFor="pic-referral" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">Kode Referral</p><p className="text-xs text-muted-foreground">Punya kode dari jamaah lain</p></div>
                </Label>
              </div>
            </RadioGroup>

            {picSource === 'cabang' && (
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.city ? ` - ${b.city}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {picSource === 'agen' && (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Pilih agen" /></SelectTrigger>
                <SelectContent>
                  {agents?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.company_name || a.agent_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {picSource === 'referral' && (
              <Input
                placeholder="Contoh: REF-NAMA123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="text-sm uppercase"
              />
            )}

            {/* Use improved PIC selection */}
            {false && (
              <PICSelectionStepImproved
                picSource={picSource}
                selectedBranchId={selectedBranchId}
                selectedAgentId={selectedAgentId}
                referralCode={referralCode}
                onPICSourceChange={setPicSource}
                onBranchChange={setSelectedBranchId}
                onAgentChange={setSelectedAgentId}
                onReferralChange={setReferralCode}
              />
            )}
          </div>
        )}

        {/* 4. Summary & Action */}
        {totalPassengers > 0 && (
          <div className="pt-4 space-y-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total {totalPassengers} Jamaah</span>
                <span className="font-medium">{roomSummary.join(", ")}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium">Total Harga</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {doubleValidationError && (
              <p className="text-xs text-destructive bg-destructive/5 p-2 rounded border border-destructive/20">
                Tipe kamar Double harus berjumlah genap (kelipatan 2).
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button className="w-full h-11 text-base font-semibold" onClick={handleProceed} disabled={!canProceed}>
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lanjutkan Pemesanan"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full h-11 text-base font-semibold gap-2 border-primary text-primary hover:bg-primary/5" 
                onClick={() => {
                  const message = encodeURIComponent(`Halo, saya tertarik dengan paket *${pkg.name}*. Bisa bantu saya untuk proses booking?`);
                  window.open(`https://wa.me/6281234567890?text=${message}`, '_blank');
                }}
              >
                <MessageCircle className="h-5 w-5" />Konsultasi via WhatsApp
              </Button>
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground italic">* Harga dapat berubah sewaktu-waktu sebelum pembayaran uang muka (DP)</p>
          </div>
        )}

        {!selectedDepartureData && (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Pilih tanggal keberangkatan untuk melihat harga dan memesan paket.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
