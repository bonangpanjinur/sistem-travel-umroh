import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, Plane, MapPin, Users, Hotel, Building2, ChevronRight, Info, Heart } from 'lucide-react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from '@/types/database';
import { formatCurrency, getPackageTypeLabel, formatDuration, formatDate } from '@/lib/format';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { PackageLabelBadges } from '@/components/packages/PackageLabelBadges';
import { usePackageLabelsMap } from '@/hooks/usePackageLabels';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PackageCardProps {
  pkg: Package;
  isRoyal?: boolean;
  layout?: 'modern' | 'classic' | 'minimal';
  imageRatio?: '16/10' | '1/1' | '3/4' | '9/6';
  viewMode?: 'grid' | 'list';
  showAirline?: boolean;
  showHotel?: boolean;
  showDuration?: boolean;
  showDeparture?: boolean;
  showSeats?: boolean;
}

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export function PackageCard({ 
  pkg, 
  isRoyal, 
  layout = 'modern', 
  imageRatio = '16/10',
  viewMode = 'grid',
  showAirline = true,
  showHotel = true,
  showDuration = true,
  showDeparture = true,
  showSeats = true
}: PackageCardProps) {
  const isTabungan = (pkg.package_type as string) === 'tabungan';
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  
  // Get open future departures
  const openFutureDepartures = (pkg.departures || [])
    .filter((d: any) => d.status === 'open' && (d.departure_date ? new Date(d.departure_date) > new Date() : true))
    .sort((a: any, b: any) => {
      if (!a.departure_date) return 1;
      if (!b.departure_date) return -1;
      return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
    });

  const nearestDeparture = openFutureDepartures[0];

  // Get the lowest price
  const getLowestPrice = () => {
    if (isTabungan) {
      return (pkg as any).savings_target || 0;
    }
    
    if (openFutureDepartures.length > 0) {
      let minPrice = Infinity;
      openFutureDepartures.forEach((d: any) => {
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
      
      if (minPrice !== Infinity) {
        return minPrice;
      }
    }
    
    const packagePrices = [
      pkg.price_quad || 0,
      pkg.price_triple || 0,
      pkg.price_double || 0,
      pkg.price_single || 0,
    ].filter(p => p > 0);
    
    return packagePrices.length > 0 ? Math.min(...packagePrices) : 0;
  };
  
  const rawLowestPrice = getLowestPrice();
  
  // Calculate discount
  const discountAmount = (pkg as any).discount_amount || 0;
  const discountPercentage = (pkg as any).discount_percentage || 0;
  
  let lowestPrice = rawLowestPrice;
  let originalPrice = 0;
  
  if (discountAmount > 0 || discountPercentage > 0) {
    originalPrice = rawLowestPrice;
    if (discountPercentage > 0) {
      lowestPrice = rawLowestPrice * (1 - discountPercentage / 100);
    }
    if (discountAmount > 0) {
      lowestPrice = lowestPrice - discountAmount;
    }
    lowestPrice = Math.max(0, lowestPrice);
  }

  // Calculate seat availability
  const getTotalQuota = () => {
    if (nearestDeparture?.quota) return nearestDeparture.quota;
    return (pkg as any).quota || 0;
  };

  const getBookedCount = () => {
    if (nearestDeparture?.booked_count) return nearestDeparture.booked_count;
    return (pkg as any).booked_count || 0;
  };

  const totalQuota = getTotalQuota();
  const bookedCount = getBookedCount();
  const remainingSeats = Math.max(0, totalQuota - bookedCount);
  const seatPercentage = totalQuota > 0 ? (bookedCount / totalQuota) * 100 : 0;

  // Departure Date Display Logic
  const renderDepartureDate = (departure: any = nearestDeparture) => {
    if (!departure) return "Segera Hadir";
    
    if (departure.departure_date) {
      return formatDate(departure.departure_date);
    }
    
    if (departure.month) {
      const monthLabel = MONTHS.find(m => m.value === departure.month)?.label || departure.month;
      const year = departure.year || new Date().getFullYear();
      return `${monthLabel} ${year}`;
    }
    
    return "Tanggal Belum Ditentukan";
  };

  // Image Aspect Ratio Class
  const getRatioClass = () => {
    switch (imageRatio) {
      case '1/1': return 'aspect-square';
      case '3/4': return 'aspect-[3/4]';
      case '9/6': return 'aspect-[9/6]';
      case '16/10': 
      default: return 'aspect-[16/10]';
    }
  };

  const isList = viewMode === 'list';

  // Render Modern Layout
  if (layout === 'modern') {
    return (
      <Card className={cn(
        "group overflow-hidden flex transition-all duration-500 border-none shadow-lg hover:shadow-2xl",
        isList ? "flex-row h-64" : "flex-col h-full",
        isRoyal ? "bg-[#1a1a1a] text-white" : "bg-white text-foreground"
      )}>
        {/* Image Section */}
        <div className={cn(
          "relative overflow-hidden",
          isList ? "w-1/3 h-full" : getRatioClass()
        )}>
          <img
            src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop'}
            alt={pkg.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className={cn(
              "border-none px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg",
              isRoyal ? "bg-amber-500 text-black" : "bg-primary text-white"
            )}>
              {getPackageTypeLabel(pkg.package_type)}
            </Badge>
            {pkg.is_featured && (
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 text-[10px] font-bold uppercase tracking-wider">
                <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
                Unggulan
              </Badge>
            )}
            {(pkg as any).is_popular && (
              <Badge className="bg-rose-500/90 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                🔥 Populer
              </Badge>
            )}
            {(pkg as any).is_cheapest && (
              <Badge className="bg-emerald-600/90 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                💰 Termurah
              </Badge>
            )}
            {(discountAmount > 0 || discountPercentage > 0) && (
              <Badge className="bg-amber-500 text-black border-none text-[10px] font-bold uppercase tracking-wider animate-pulse">
                🎉 DISKON {discountPercentage > 0 ? `${discountPercentage}%` : ''}
              </Badge>
            )}
            <CustomLabelBadges packageId={pkg.id} />
          </div>

          {/* Wishlist Button */}
          <button
            onClick={(e) => { e.preventDefault(); toggleWishlist(pkg.id); }}
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-200 active:scale-90 z-10",
              isWishlisted(pkg.id)
                ? "bg-rose-500/90 border-rose-400"
                : "bg-black/30 border-white/20 hover:bg-black/50"
            )}
            aria-label={isWishlisted(pkg.id) ? "Hapus dari wishlist" : "Simpan ke wishlist"}
          >
            <Heart className={cn(
              "h-3.5 w-3.5 transition-colors",
              isWishlisted(pkg.id) ? "fill-white text-white" : "text-white"
            )} />
          </button>

          {/* Price Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="text-white">
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-medium">Mulai dari</p>
              <div className="flex flex-col">
                {originalPrice > 0 && (
                  <p className="text-xs line-through opacity-60 decoration-rose-500 decoration-2">
                    {formatCurrency(originalPrice, pkg.currency)}
                  </p>
                )}
                <p className={cn(
                  "text-2xl font-bold leading-none",
                  isRoyal ? "text-amber-400" : "text-white"
                )}>
                  {formatCurrency(lowestPrice, pkg.currency)}
                </p>
              </div>
            </div>
            {showDuration && (
              <div className="flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold">{formatDuration(pkg.duration_days)}</span>
              </div>
            )}
          </div>
        </div>

        <CardContent className={cn(
          "p-5 flex-1 flex flex-col",
          isList ? "justify-center" : ""
        )}>
          <h3 className={cn(
            "mb-4 line-clamp-2 text-xl font-bold leading-tight transition-colors",
            isRoyal ? "text-white font-serif group-hover:text-amber-400" : "text-slate-800 group-hover:text-primary"
          )}>
            {pkg.name}
          </h3>

          {(showDeparture || showAirline || showHotel) && (
            <div className={cn(
              "grid gap-y-4 gap-x-2 mb-6",
              isList ? "grid-cols-4" : "grid-cols-2"
            )}>
              {showDeparture && (
                <div className="flex items-start gap-2.5">
                  <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                    <Calendar className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Keberangkatan</p>
                    <p className="text-xs font-semibold line-clamp-1">{renderDepartureDate()}</p>
                  </div>
                </div>
              )}

              {showAirline && (
                <div className="flex items-start gap-2.5">
                  <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                    <Plane className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Maskapai</p>
                    <p className="text-xs font-semibold line-clamp-1">{nearestDeparture?.airline?.name || pkg.airline?.name || "TBA"}</p>
                  </div>
                </div>
              )}

              {showHotel && (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                      <Building2 className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hotel Makkah</p>
                      <p className="text-xs font-semibold line-clamp-1">
                        {nearestDeparture?.hotel_makkah?.name || pkg.hotel_makkah?.name || "TBA"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                      <Hotel className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hotel Madinah</p>
                      <p className="text-xs font-semibold line-clamp-1">
                        {nearestDeparture?.hotel_madinah?.name || pkg.hotel_madinah?.name || "TBA"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {showSeats && totalQuota > 0 && !isTabungan && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                  <Users className="h-3 w-3" /> Ketersediaan Seat
                </span>
                <span className={cn(
                  "text-xs font-bold",
                  remainingSeats === 0 ? "text-destructive" : remainingSeats <= 5 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {remainingSeats === 0 ? 'Penuh' : `${remainingSeats}/${totalQuota} tersisa`}
                </span>
              </div>
              <div className={cn(
                "w-full h-2 rounded-full overflow-hidden",
                isRoyal ? "bg-white/10" : "bg-slate-200"
              )}>
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    seatPercentage >= 100 ? "bg-destructive" : seatPercentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, seatPercentage)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-auto">
            <Button asChild className={cn(
              "w-full py-6 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]",
              isRoyal 
                ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black border-none" 
                : "bg-gradient-to-r from-[#D98E27] to-[#f0a53d] hover:from-[#BF7A1D] hover:to-[#D98E27] text-white border-none"
            )}>
              <Link to={isTabungan ? `/savings/register/${pkg.id}` : `/packages/${pkg.id}-${slugify(pkg.name)}`}>
                {isTabungan ? 'Mulai Menabung' : 'Lihat Detail Paket'}
              </Link>
            </Button>
          </div>

        </CardContent>
      </Card>
    );
  }

  // Render Classic Layout
  if (layout === 'classic') {
    const displayedDepartures = openFutureDepartures.slice(0, 3);
    const hasMoreDepartures = openFutureDepartures.length > 3;

    return (
      <Card className={cn(
        "group overflow-hidden flex flex-col h-full transition-all duration-300 border bg-white hover:border-primary/50",
        isList ? "flex-row h-64" : "flex-col h-full"
      )}>
        <div className={cn(
          "relative overflow-hidden",
          isList ? "w-1/3 h-full" : getRatioClass()
        )}>
          <img
            src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop'}
            alt={pkg.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-0 right-0 p-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold">
              {getPackageTypeLabel(pkg.package_type)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{pkg.name}</h3>
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="ml-1 text-xs font-bold">4.9</span>
            </div>
          </div>
          
          <div className="space-y-2.5 mb-6">
            {showDuration && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-slate-900 text-sm">{formatDuration(pkg.duration_days)}</span>
              </div>
            )}

            {showDeparture && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  {openFutureDepartures.length > 0 ? (
                    <>
                      {displayedDepartures.map((d, idx) => (
                        <span key={idx} className="font-semibold text-slate-900 text-sm">
                          {renderDepartureDate(d)}
                        </span>
                      ))}
                      {hasMoreDepartures && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                                Lihat tanggal lainnya <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 max-w-xs">
                              <p className="font-bold text-xs mb-2 border-bottom pb-1">Jadwal Keberangkatan Lainnya:</p>
                              <div className="grid grid-cols-1 gap-1">
                                {openFutureDepartures.slice(3).map((d, idx) => (
                                  <div key={idx} className="text-xs py-1 border-b border-slate-100 last:border-0">
                                    {renderDepartureDate(d)}
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </>
                  ) : (
                    <span className="font-semibold text-slate-900 text-sm">Segera Hadir</span>
                  )}
                </div>
              </div>
            )}

            {showAirline && (
              <div className="flex items-center gap-3">
                <Plane className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-slate-900 text-sm">{nearestDeparture?.airline?.name || pkg.airline?.name || "TBA"}</span>
              </div>
            )}

            {showHotel && (
              <div className="flex items-center gap-3">
                <Hotel className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-slate-900 text-sm">Bintang {nearestDeparture?.hotel_makkah?.star_rating || pkg.hotel_makkah?.star_rating || "4"}</span>
              </div>
            )}

            {showSeats && totalQuota > 0 && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">Sisa Seat</span>
                    <span className="text-xs font-bold text-slate-900">{remainingSeats}/{totalQuota}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ width: `${seatPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Harga Mulai</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(lowestPrice, pkg.currency)}</p>
            </div>
            <Button asChild size="sm" className="rounded-full px-6">
              <Link to={`/packages/${pkg.id}-${slugify(pkg.name)}`}>Detail</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render Minimal Layout
  return (
    <Card className={cn(
      "group overflow-hidden border-none bg-transparent hover:bg-white transition-all duration-300 p-2 rounded-2xl",
      isList ? "flex-row h-48" : "flex-col h-full"
    )}>
      <div className={cn(
        "relative overflow-hidden rounded-xl",
        isList ? "w-1/3 h-full" : getRatioClass()
      )}>
        <img
          src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop'}
          alt={pkg.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {showDuration && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-black/60 backdrop-blur-md border-none text-white text-[10px]">
              {formatDuration(pkg.duration_days)}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {pkg.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
          {pkg.description || "Nikmati perjalanan ibadah yang nyaman dan khusyuk bersama kami."}
        </p>
        
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-primary">{formatCurrency(lowestPrice, pkg.currency)}</p>
          <Link 
            to={`/packages/${pkg.id}-${slugify(pkg.name)}`}
            className="text-xs font-bold flex items-center gap-1 text-slate-400 group-hover:text-primary transition-colors"
          >
            Lihat <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomLabelBadges({ packageId }: { packageId: string }) {
  const { data: map } = usePackageLabelsMap();
  const labels = map?.[packageId] ?? [];
  if (labels.length === 0) return null;
  return <PackageLabelBadges labels={labels} />;
}
