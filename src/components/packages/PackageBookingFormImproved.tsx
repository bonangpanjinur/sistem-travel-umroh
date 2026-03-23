import { useState, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StepProgressIndicator } from "@/components/booking/StepProgressIndicator";
import { RoomAllocationVisualizer } from "@/components/booking/RoomAllocationVisualizer";
import { PICSelectionStep } from "@/components/booking/PICSelectionStep";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, BedDouble, Minus, Plus, Loader2, Info, Plane, Hotel, MessageCircle, Building2, UserCheck, Ticket, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomType } from "@/types/database";
import { HotelDisplay } from "@/components/hotels/HotelDisplay";

interface PackageBookingFormImprovedProps {
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

const STEPS = [
  { id: 1, title: 'Pilih Jadwal', description: 'Tanggal & Keberangkatan' },
  { id: 2, title: 'Alokasi Kamar', description: 'Jumlah Jamaah' },
  { id: 3, title: 'Sumber Pendaftaran', description: 'Pilih Cara Daftar' },
  { id: 4, title: 'Konfirmasi', description: 'Ringkasan & Pembayaran' },
];

export function PackageBookingFormImproved({ pkg }: PackageBookingFormImprovedProps) {
  const packageId = pkg.id;
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({ quad: 0, triple: 0, double: 0, single: 0 });
  const [picSource, setPicSource] = useState<PICSource>('pusat');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');

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

  const doubleValidationError = roomAllocation.double > 0 && roomAllocation.double % 2 !== 0;

  // Validation for each step
  const isStep1Valid = !!selectedDeparture && hasPricing;
  const isStep2Valid = totalPassengers > 0 && !doubleValidationError;
  const isStep3Valid = picSource === 'pusat' || (picSource === 'cabang' && !!selectedBranchId) || (picSource === 'agen' && !!selectedAgentId) || (picSource === 'referral' && !!referralCode);

  const canGoNext = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    return true;
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
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Pesan Sekarang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Progress Indicator */}
        <StepProgressIndicator steps={STEPS} currentStep={currentStep} />

        {/* Step 1: Pilih Jadwal Keberangkatan */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                <Calendar className="h-4 w-4 text-primary" />Pilih Tanggal Keberangkatan
              </Label>
              <Select value={selectedDeparture} onValueChange={handleDepartureChange}>
                <SelectTrigger><SelectValue placeholder="Pilih tanggal keberangkatan" /></SelectTrigger>
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
            </div>

            {selectedDepartureData && (
              <Card className="bg-muted/30 border-muted">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tanggal Pulang:</span>
                    <span className="font-medium">{format(new Date(selectedDepartureData.return_date), "d MMM yyyy", { locale: idLocale })}</span>
                  </div>
                  {selectedDepartureData.airline && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Plane className="h-3 w-3" />Maskapai:</span>
                      <span className="font-medium">{(selectedDepartureData.airline as any).name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sisa Kuota:</span>
                    <span className={cn("font-medium", availableSeats < 10 ? "text-destructive" : "text-primary")}>{availableSeats} kursi</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedDepartureData && !hasPricing && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Harga untuk keberangkatan ini belum tersedia. Silakan hubungi kami untuk informasi lebih lanjut.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 2: Alokasi Kamar */}
        {currentStep === 2 && selectedDepartureData && hasPricing && (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-4">
                <BedDouble className="h-4 w-4 text-primary" />Pilih Jumlah Jamaah per Tipe Kamar
              </Label>
              <p className="text-xs text-muted-foreground mb-4">Gunakan tombol + dan - untuk menyesuaikan jumlah jamaah di setiap tipe kamar.</p>

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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateRoomCount(type, -1)}
                          disabled={roomAllocation[type] === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-base">{roomAllocation[type]}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
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
            </div>

            {totalPassengers > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Visualisasi Alokasi Kamar</Label>
                <RoomAllocationVisualizer allocation={roomAllocation} totalPassengers={totalPassengers} />
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
          </div>
        )}

        {/* Step 3: Sumber Pendaftaran */}
        {currentStep === 3 && (
          <PICSelectionStep
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

        {/* Step 4: Konfirmasi */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-4">Ringkasan Pesanan Anda</h3>

              <div className="space-y-3">
                <Card className="bg-muted/30 border-muted">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket:</span>
                      <span className="font-medium">{pkg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tanggal Keberangkatan:</span>
                      <span className="font-medium">{selectedDepartureData && format(new Date(selectedDepartureData.departure_date), "d MMM yyyy", { locale: idLocale })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Jamaah:</span>
                      <span className="font-medium">{totalPassengers} orang</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alokasi Kamar:</span>
                      <span className="font-medium text-right">{roomSummary.join(", ")}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Total Harga:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(totalPrice)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Harga dapat berubah sewaktu-waktu sebelum pembayaran uang muka (DP). Anda akan menerima konfirmasi melalui email dan WhatsApp.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            )}
            {currentStep < 4 && (
              <Button
                className="flex-1"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canGoNext()}
              >
                Lanjutkan
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep === 4 && (
              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={handleProceed}
                disabled={authLoading}
              >
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Lanjutkan Pemesanan
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full h-11 text-base font-semibold gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={() => {
              const message = encodeURIComponent(`Halo, saya tertarik dengan paket *${pkg.name}*. Bisa bantu saya untuk proses booking?`);
              window.open(`https://wa.me/6281234567890?text=${message}`, '_blank');
            }}
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi via WhatsApp
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground italic">
          * Langkah {currentStep} dari {STEPS.length}
        </p>
      </CardContent>
    </Card>
  );
}
