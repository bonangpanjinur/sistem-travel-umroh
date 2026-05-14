import { useState, useEffect } from "react";
import { DynamicBookingFormData } from "@/hooks/useBookingWizardDynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/format";
import { getExchangeRate, convertAmount } from "@/lib/currency";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, BedDouble, Plane, User, Tag, Share2, Loader2, CheckCircle, XCircle, Mail, Phone, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoomType } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PaymentModeSelector, PaymentMode } from "@/components/booking/PaymentModeSelector";

interface StepReviewDynamicProps {
  formData: DynamicBookingFormData;
  packageInfo: {
    id?: string;
    name: string;
    duration_days: number;
    package_type: string;
    price_quad: number;
    price_triple: number;
    price_double: number;
    price_single: number;
    currency?: string | null;
  };
  departureInfo?: {
    departure_date: string;
    return_date: string;
    flight_number?: string | null;
  } | null;
  departurePrices?: {
    price_quad: number;
    price_triple: number;
    price_double: number;
    price_single: number;
    price_adult?: number;
    price_child?: number;
    price_infant?: number;
  };
  isHaji?: boolean;
  onCouponApplied?: (discount: number, code: string) => void;
  onReferralApplied?: (code: string) => void;
  onUpdatePassengers?: (passengers: any[]) => void;
  cancellationAgreed?: boolean;
  onCancellationAgreedChange?: (agreed: boolean) => void;
  onPaymentModeChange?: (mode: PaymentMode, dpAmount: number, savingsPlanId?: string) => void;
  paymentMode?: PaymentMode;
  dpAmount?: number;
  savingsPlanId?: string;
  onPaymentValidityChange?: (valid: boolean) => void;
}

const ROOM_LABELS: Record<RoomType, string> = {
  quad: 'Quad',
  triple: 'Triple',
  double: 'Double',
  single: 'Single',
};

export function StepReviewDynamic({
  formData, packageInfo, departureInfo, departurePrices,
  isHaji = false,
  onCouponApplied, onReferralApplied, onUpdatePassengers,
  cancellationAgreed, onCancellationAgreedChange,
  onPaymentModeChange, paymentMode = 'full', dpAmount = 0, savingsPlanId,
  onPaymentValidityChange,
}: StepReviewDynamicProps) {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; name: string } | null>(null);
  const [policyExpanded, setPolicyExpanded] = useState(false);

  const pkgCurrency = (packageInfo.currency || 'IDR').toUpperCase();
  const { data: idrRate = 1 } = useQuery({
    queryKey: ['exchange-rate', pkgCurrency, 'IDR'],
    queryFn: () => getExchangeRate(pkgCurrency, 'IDR'),
    enabled: pkgCurrency !== 'IDR',
    staleTime: 5 * 60 * 1000,
  });

  const { data: cancellationPolicy } = useQuery({
    queryKey: ["cancellation-policy", packageInfo.id],
    queryFn: async () => {
      if (packageInfo.id) {
        const { data } = await (supabase as any)
          .from("cancellation_policies")
          .select("id, name, description, terms")
          .eq("package_id", packageInfo.id)
          .limit(1)
          .maybeSingle();
        if (data) return data;
      }
      const { data } = await (supabase as any)
        .from("cancellation_policies")
        .select("id, name, description, terms")
        .eq("is_global", true)
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: true,
    staleTime: 60_000,
  });

  // When a policy loads, signal to parent that agreement is required
  useEffect(() => {
    if (cancellationPolicy && cancellationAgreed === null) {
      onCancellationAgreedChange?.(false);
    }
  }, [cancellationPolicy]);

  // Use departure prices (if available), fallback to package prices
  const priceSource = departurePrices || packageInfo;
  
  // Check if age-based pricing is available
  const hasAgeBasedPricing = departurePrices && (
    (departurePrices.price_adult && departurePrices.price_adult > 0) ||
    (departurePrices.price_child && departurePrices.price_child > 0) ||
    (departurePrices.price_infant && departurePrices.price_infant > 0)
  );
  
  // Get age-based prices if available, otherwise use room prices
  const adultPrice = hasAgeBasedPricing ? (departurePrices.price_adult || 0) : 0;
  const childPrice = hasAgeBasedPricing ? (departurePrices.price_child || 0) : 0;
  const infantPrice = hasAgeBasedPricing ? (departurePrices.price_infant || 0) : 0;
  
  const priceMap: Record<RoomType, number> = {
    quad: priceSource.price_quad,
    triple: priceSource.price_triple,
    double: priceSource.price_double,
    single: priceSource.price_single,
  };

  // Get price based on passenger type (adult/child/infant) or room type
  const getPassengerPrice = (passenger: any) => {
    if (hasAgeBasedPricing && passenger.passengerType) {
      switch (passenger.passengerType) {
        case 'adult': return adultPrice;
        case 'child': return childPrice;
        case 'infant': return infantPrice;
        default: return priceMap[passenger.roomType as keyof typeof priceMap] || 0;
      }
    }
    return priceMap[passenger.roomType as keyof typeof priceMap] || 0;
  };

  // Calculate price breakdown by room type and passenger type
  const priceBreakdown = formData.passengers.reduce((acc, p) => {
    const roomType = p.roomType;
    const passengerType = p.passengerType || 'adult';
    const key = `${roomType}-${passengerType}`;
    if (!acc[key]) {
      acc[key] = { count: 0, price: getPassengerPrice(p), total: 0, roomType, passengerType };
    }
    acc[key].count++;
    acc[key].total += getPassengerPrice(p);
    return acc;
  }, {} as Record<string, { count: number; price: number; total: number; roomType: string; passengerType: string }>);

  // Calculate subtotal with age-based pricing if available
  const subtotal = formData.passengers.reduce((sum, p) => sum + getPassengerPrice(p), 0);
  const discountAmount = couponResult?.valid ? couponResult.discount : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount);

  // Validasi mode pembayaran berbasis totalPrice
  useEffect(() => {
    let valid = true;
    if (paymentMode === 'full') valid = totalPrice > 0;
    else if (paymentMode === 'dp') {
      const minDp = Math.ceil(totalPrice * 0.3);
      valid = dpAmount >= minDp && dpAmount <= totalPrice;
    } else if (paymentMode === 'savings') {
      valid = !!savingsPlanId;
    }
    onPaymentValidityChange?.(valid);
  }, [paymentMode, dpAmount, savingsPlanId, totalPrice]);

  // Group passengers by room type for display
  const groupedPassengers = formData.passengers.reduce((acc, passenger) => {
    const roomType = passenger.roomType;
    if (!acc[roomType]) {
      acc[roomType] = [];
    }
    acc[roomType].push(passenger);
    return acc;
  }, {} as Record<RoomType, typeof formData.passengers>);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponResult({ valid: false, discount: 0, name: '' });
        return;
      }

      // Validate coupon
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setCouponResult({ valid: false, discount: 0, name: '' });
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setCouponResult({ valid: false, discount: 0, name: '' });
        return;
      }
      if (data.usage_limit && (data.used_count || 0) >= data.usage_limit) {
        setCouponResult({ valid: false, discount: 0, name: '' });
        return;
      }
      if (data.min_purchase && subtotal < data.min_purchase) {
        setCouponResult({ valid: false, discount: 0, name: '' });
        return;
      }

      let discount = 0;
      if (data.discount_type === 'percentage') {
        discount = Math.round(subtotal * data.discount_value / 100);
        if (data.max_discount && discount > data.max_discount) {
          discount = data.max_discount;
        }
      } else {
        discount = data.discount_value;
      }

      setCouponResult({ valid: true, discount, name: data.name });
      onCouponApplied?.(discount, data.code);
    } catch {
      setCouponResult({ valid: false, discount: 0, name: '' });
    } finally {
      setCouponLoading(false);
    }
  };



  const removeCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    onCouponApplied?.(0, "");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Pesanan</h3>
        <p className="text-sm text-muted-foreground">
          Periksa kembali data pesanan Anda sebelum melanjutkan
        </p>
      </div>



      {/* Package & Departure Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detail Paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold">{packageInfo.name}</p>
            <p className="text-sm text-muted-foreground">
              {packageInfo.duration_days} Hari • {packageInfo.package_type.toUpperCase()}
            </p>
          </div>
          
          {departureInfo && (
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">
                    {format(new Date(departureInfo.departure_date), "d MMMM yyyy", { locale: idLocale })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pulang: {format(new Date(departureInfo.return_date), "d MMM yyyy", { locale: idLocale })}
                  </p>
                </div>
              </div>
              {departureInfo.flight_number && (
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span>{departureInfo.flight_number}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passengers section — Haji: per tipe usia | Umroh: per tipe kamar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Data Jamaah ({formData.passengers.length} orang)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isHaji ? (
            // Haji: tampilkan per tipe usia
            (['adult', 'child', 'infant'] as const).map((type) => {
              const typePassengers = formData.passengers.filter(p => p.passengerType === type);
              if (typePassengers.length === 0) return null;
              const typeLabel = type === 'adult' ? 'Dewasa' : type === 'child' ? 'Anak-anak' : 'Bayi';
              const typePrice = type === 'adult' ? adultPrice : type === 'child' ? childPrice : infantPrice;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{typeLabel}</span>
                    <Badge variant="secondary" className="text-xs">{typePassengers.length} orang</Badge>
                  </div>
                  <div className="grid gap-2 pl-6">
                    {typePassengers.map((passenger) => (
                      <div key={passenger.id} className="flex items-center gap-3 text-sm">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{passenger.fullName || 'Belum diisi'}</p>
                          <p className="text-xs text-muted-foreground">{passenger.gender === 'male' ? 'L' : 'P'}</p>
                        </div>
                        {typePrice > 0 && (
                          <span className="text-xs text-primary font-medium">{formatCurrency(typePrice)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Umroh/Wisata: tampilkan per tipe kamar
            (Object.keys(groupedPassengers) as RoomType[]).map((roomType) => (
              <div key={roomType}>
                <div className="flex items-center gap-2 mb-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Kamar {ROOM_LABELS[roomType]}</span>
                  <Badge variant="secondary" className="text-xs">
                    {groupedPassengers[roomType].length} orang
                  </Badge>
                </div>
                <div className="grid gap-2 pl-6">
                  {groupedPassengers[roomType].map((passenger) => (
                    <div key={passenger.id} className="flex items-center gap-3 text-sm">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{passenger.fullName || 'Belum diisi'}</p>
                        <p className="text-xs text-muted-foreground">
                          {passenger.gender === 'male' ? 'L' : 'P'} • {passenger.passengerType === 'adult' ? 'Dewasa' : passenger.passengerType === 'child' ? 'Anak' : 'Bayi'}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium">
                        {formatCurrency(priceMap[roomType])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Coupon Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Kode Kupon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {couponResult?.valid ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{couponResult.name}</p>
                    <p className="text-xs text-green-600">Diskon: {formatCurrency(couponResult.discount)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-destructive h-8">
                  Hapus
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Masukkan kode kupon"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponResult(null);
                  }}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pakai'}
                </Button>
              </div>
            )}
            {couponResult && !couponResult.valid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Kode kupon tidak valid atau sudah kadaluarsa
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      {cancellationPolicy && (
        <Card className={cancellationAgreed === false ? "border-amber-300" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Kebijakan Pembatalan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{cancellationPolicy.name}</p>
            {cancellationPolicy.description && (
              <p className="text-sm text-muted-foreground">{cancellationPolicy.description}</p>
            )}
            {cancellationPolicy.terms && (
              <div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => setPolicyExpanded((v) => !v)}
                >
                  {policyExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {policyExpanded ? "Sembunyikan detail" : "Lihat detail syarat & ketentuan"}
                </button>
                {policyExpanded && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap border">
                    {cancellationPolicy.terms}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-start gap-3 pt-2 border-t">
              <Checkbox
                id="cancellation-agree"
                checked={!!cancellationAgreed}
                onCheckedChange={(v) => onCancellationAgreedChange?.(!!v)}
              />
              <Label htmlFor="cancellation-agree" className="text-sm leading-snug cursor-pointer">
                Saya telah membaca dan menyetujui kebijakan pembatalan yang berlaku untuk paket ini.
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rincian Harga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isHaji ? (
            // Haji: rincian per tipe usia
            <>
              {adultPrice > 0 && formData.passengers.filter(p => p.passengerType === 'adult').length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formData.passengers.filter(p => p.passengerType === 'adult').length}x Dewasa @ {formatCurrency(adultPrice)}
                  </span>
                  <span>{formatCurrency(formData.passengers.filter(p => p.passengerType === 'adult').length * adultPrice)}</span>
                </div>
              )}
              {childPrice > 0 && formData.passengers.filter(p => p.passengerType === 'child').length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formData.passengers.filter(p => p.passengerType === 'child').length}x Anak-anak @ {formatCurrency(childPrice)}
                  </span>
                  <span>{formatCurrency(formData.passengers.filter(p => p.passengerType === 'child').length * childPrice)}</span>
                </div>
              )}
              {infantPrice > 0 && formData.passengers.filter(p => p.passengerType === 'infant').length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formData.passengers.filter(p => p.passengerType === 'infant').length}x Bayi @ {formatCurrency(infantPrice)}
                  </span>
                  <span>{formatCurrency(formData.passengers.filter(p => p.passengerType === 'infant').length * infantPrice)}</span>
                </div>
              )}
              {adultPrice === 0 && childPrice === 0 && infantPrice === 0 && (
                <p className="text-sm text-muted-foreground italic">Harga per orang belum diset untuk keberangkatan ini</p>
              )}
            </>
          ) : (
            // Umroh/Wisata: rincian per tipe kamar
            (Object.keys(priceBreakdown) as RoomType[]).map((roomType) => {
              const item = priceBreakdown[roomType];
              return (
                <div key={roomType} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.count}x {ROOM_LABELS[roomType]} @ {formatCurrency(item.price)}
                  </span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              );
            })
          )}
          
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Diskon Kupon</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            </>
          )}
          
          <Separator className="my-2" />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Pembayaran</span>
            <span className="text-primary text-right">
              {formatCurrency(totalPrice, pkgCurrency)}
              {pkgCurrency !== 'IDR' && idrRate > 1 && (
                <span className="block text-xs font-normal text-muted-foreground">
                  ≈ {formatCurrency(convertAmount(totalPrice, idrRate), 'IDR')}
                </span>
              )}
            </span>
          </div>

          {paymentMode === 'dp' && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bayar Sekarang (DP)</span>
                <span className="font-medium">{formatCurrency(dpAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sisa Pelunasan</span>
                <span>{formatCurrency(Math.max(0, totalPrice - dpAmount))}</span>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            * Pembayaran dapat dilakukan setelah booking dikonfirmasi
          </p>
        </CardContent>
      </Card>

      {/* Mode Pembayaran */}
      <PaymentModeSelector
        totalPrice={totalPrice}
        mode={paymentMode}
        dpAmount={dpAmount}
        savingsPlanId={savingsPlanId}
        onModeChange={(m) => onPaymentModeChange?.(m, dpAmount, savingsPlanId)}
        onDpAmountChange={(a) => onPaymentModeChange?.('dp', a, savingsPlanId)}
        onSavingsPlanChange={(id) => onPaymentModeChange?.('savings', dpAmount, id)}
      />
    </div>
  );
}
