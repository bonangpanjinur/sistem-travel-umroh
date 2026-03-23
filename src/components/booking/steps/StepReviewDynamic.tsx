import { useState } from "react";
import { DynamicBookingFormData } from "@/hooks/useBookingWizardDynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Users, BedDouble, Plane, User, Tag, Share2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { RoomType } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";

interface StepReviewDynamicProps {
  formData: DynamicBookingFormData;
  packageInfo: {
    name: string;
    duration_days: number;
    package_type: string;
    price_quad: number;
    price_triple: number;
    price_double: number;
    price_single: number;
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
  };
  onCouponApplied?: (discount: number, code: string) => void;
  onReferralApplied?: (code: string) => void;
}

const ROOM_LABELS: Record<RoomType, string> = {
  quad: 'Quad',
  triple: 'Triple',
  double: 'Double',
  single: 'Single',
};

export function StepReviewDynamic({ formData, packageInfo, departureInfo, departurePrices, onCouponApplied, onReferralApplied }: StepReviewDynamicProps) {
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; name: string } | null>(null);

  // Use departure prices (if available), fallback to package prices
  const priceSource = departurePrices || packageInfo;
  const priceMap: Record<RoomType, number> = {
    quad: priceSource.price_quad,
    triple: priceSource.price_triple,
    double: priceSource.price_double,
    single: priceSource.price_single,
  };

  // Calculate price breakdown by room type
  const priceBreakdown = formData.passengers.reduce((acc, p) => {
    const roomType = p.roomType;
    if (!acc[roomType]) {
      acc[roomType] = { count: 0, price: priceMap[roomType], total: 0 };
    }
    acc[roomType].count++;
    acc[roomType].total += priceMap[roomType];
    return acc;
  }, {} as Record<RoomType, { count: number; price: number; total: number }>);

  const subtotal = formData.passengers.reduce((sum, p) => sum + priceMap[p.roomType], 0);
  const discountAmount = couponResult?.valid ? couponResult.discount : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount);

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

      {/* Passengers by Room Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Data Jamaah ({formData.passengers.length} orang)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(groupedPassengers) as RoomType[]).map((roomType) => (
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
          ))}
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

      {/* Price Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rincian Harga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.keys(priceBreakdown) as RoomType[]).map((roomType) => {
            const item = priceBreakdown[roomType];
            return (
              <div key={roomType} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.count}x {ROOM_LABELS[roomType]} @ {formatCurrency(item.price)}
                </span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            );
          })}
          
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
            <span className="text-primary">{formatCurrency(totalPrice)}</span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            * Pembayaran dapat dilakukan setelah booking dikonfirmasi
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
