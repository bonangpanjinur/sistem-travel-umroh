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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, Loader2, MessageCircle, ChevronRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { getAgentRef, buildBookingUrlWithRef } from "@/hooks/useAgentRef";
import { useTenant } from "@/contexts/TenantContext";

interface PackageBookingFormSimpleProps {
  pkg: any;
}

export function PackageBookingFormSimple({ pkg }: PackageBookingFormSimpleProps) {
  const packageId = pkg.id;
  const { data: websiteSettings } = useWebsiteSettings();
  const waNumber = (websiteSettings?.footer_whatsapp || '6281234567890').replace(/\D/g, '');
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { tenant } = useTenant();
  
  // Form state
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [totalPax, setTotalPax] = useState<number>(1);

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

  // Get the lowest price from all available departures
  const lowestPrice = useMemo(() => {
    if (!departures || departures.length === 0) {
      // Fallback to package prices if no departures
      const packagePrices = [
        pkg.price_quad || 0,
        pkg.price_triple || 0,
        pkg.price_double || 0,
        pkg.price_single || 0,
      ].filter(p => p > 0);
      return packagePrices.length > 0 ? Math.min(...packagePrices) : 0;
    }

    let minPrice = Infinity;
    departures.forEach((d: any) => {
      const prices = [
        d.price_quad || 0,
        d.price_triple || 0,
        d.price_double || 0,
        d.price_single || 0,
      ].filter(p => p > 0);
      
      if (prices.length > 0) {
        minPrice = Math.min(minPrice, ...prices);
      }
    });

    return minPrice === Infinity ? 0 : minPrice;
  }, [departures, pkg]);

  const handleProceed = () => {
    const params = new URLSearchParams({
      departure: selectedDeparture,
      pax: totalPax.toString(),
    });

    // Ambil referensi agen dari TenantContext (prioritas) atau localStorage
    const ref = getAgentRef();
    const agentId = (tenant?.type === 'agent' ? tenant.id : null) || ref.agentId;
    const branchId = (tenant?.type === 'branch' ? tenant.id : null) || ref.branchId;

    if (agentId) {
      params.set('agent_id', agentId);
      params.set('pic_source', 'agen');
    } else if (branchId) {
      params.set('branch_id', branchId);
      params.set('pic_source', 'cabang');
    }

    const bookingUrl = `/booking/${packageId}?${params.toString()}`;

    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(bookingUrl)}`);
      return;
    }

    navigate(bookingUrl);
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
    <Card className="sticky top-24 z-10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pesan Sekarang</CardTitle>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Mulai Dari</p>
            <p className="text-lg font-bold text-amber-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(lowestPrice)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Step 1: Pilih Jadwal */}
          <div>
            <Label className="flex items-center gap-2 text-sm font-medium mb-3">
              <Calendar className="h-4 w-4 text-primary" />Pilih Tanggal Keberangkatan
            </Label>
            <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
              <SelectTrigger><SelectValue placeholder="Pilih tanggal keberangkatan" /></SelectTrigger>
              <SelectContent>
                {departures && departures.length > 0 ? departures.map((dep) => {
                  const seats = dep.quota - (dep.booked_count || 0);
                  return (
                    <SelectItem key={dep.id} value={dep.id} disabled={seats <= 0}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{format(new Date(dep.departure_date), "d MMM yyyy", { locale: idLocale })}</span>
                        <span className={cn("text-xs", seats < 10 ? "text-destructive" : "text-muted-foreground")}>({seats} kursi)</span>
                      </div>
                    </SelectItem>
                  );
                }) : (
                  <SelectItem value="none" disabled>Tidak ada jadwal tersedia</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Jumlah Jamaah */}
          <div>
            <Label className="flex items-center gap-2 text-sm font-medium mb-3">
              <Users className="h-4 w-4 text-primary" />Jumlah Jamaah
            </Label>
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setTotalPax(Math.max(1, totalPax - 1))}
                disabled={totalPax <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-lg font-bold">{totalPax}</span>
                <span className="text-xs text-muted-foreground ml-1">Orang</span>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setTotalPax(Math.min(availableSeats, totalPax + 1))}
                disabled={totalPax >= availableSeats}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <Button 
            className="w-full h-11 text-base font-semibold"
            onClick={handleProceed}
            disabled={!selectedDeparture || authLoading}
          >
            {authLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Lanjutkan Pemesanan
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>

          <Button
            variant="outline"
            className="w-full h-11 text-base font-semibold gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={() => {
              const message = encodeURIComponent(`Halo, saya tertarik dengan paket *${pkg.name}*. Bisa bantu saya untuk proses booking?`);
              window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
            }}
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi via WhatsApp
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground italic">
          * Pilihan kamar dan data jamaah akan diisi di langkah berikutnya
        </p>
      </CardContent>
    </Card>
  );
}
