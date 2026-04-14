import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, Plane, MapPin, Users, Hotel, Building2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from '@/types/database';
import { formatCurrency, getPackageTypeLabel, formatDuration, formatDate } from '@/lib/format';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';

interface PackageCardProps {
  pkg: Package;
  isRoyal?: boolean;
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

export function PackageCard({ pkg, isRoyal }: PackageCardProps) {
  const isTabungan = (pkg.package_type as string) === 'tabungan';
  
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
  
  const lowestPrice = getLowestPrice();

  // Departure Date Display Logic
  const renderDepartureDate = () => {
    if (!nearestDeparture) return "Segera Hadir";
    
    if (nearestDeparture.departure_date) {
      return formatDate(nearestDeparture.departure_date);
    }
    
    if (nearestDeparture.month) {
      const monthLabel = MONTHS.find(m => m.value === nearestDeparture.month)?.label || nearestDeparture.month;
      const year = nearestDeparture.year || new Date().getFullYear();
      return `${monthLabel} ${year}`;
    }
    
    return "Tanggal Belum Ditentukan";
  };

  return (
    <Card className={cn(
      "group overflow-hidden flex flex-col h-full transition-all duration-500 border-none shadow-lg hover:shadow-2xl",
      isRoyal ? "bg-[#1a1a1a] text-white" : "bg-white text-foreground"
    )}>
      {/* Image Section */}
      <div className="relative aspect-[16/10] overflow-hidden">
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
              Favorit
            </Badge>
          )}
        </div>

        {/* Price Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="text-white">
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-medium">Mulai dari</p>
            <p className={cn(
              "text-2xl font-bold leading-none",
              isRoyal ? "text-amber-400" : "text-white"
            )}>
              {formatCurrency(lowestPrice)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-bold">{formatDuration(pkg.duration_days)}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className={cn(
          "mb-4 line-clamp-2 text-xl font-bold leading-tight transition-colors",
          isRoyal ? "text-white font-serif group-hover:text-amber-400" : "text-slate-800 group-hover:text-primary"
        )}>
          {pkg.name}
        </h3>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
          {/* Departure Date */}
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "p-2 rounded-lg",
              isRoyal ? "bg-amber-500/10" : "bg-slate-100"
            )}>
              <Calendar className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Keberangkatan</p>
              <p className="text-xs font-semibold line-clamp-1">{renderDepartureDate()}</p>
            </div>
          </div>

          {/* Airline */}
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "p-2 rounded-lg",
              isRoyal ? "bg-amber-500/10" : "bg-slate-100"
            )}>
              <Plane className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Maskapai</p>
              <p className="text-xs font-semibold line-clamp-1">
                {nearestDeparture?.airline?.name || pkg.airline?.name || "TBA"}
              </p>
            </div>
          </div>

          {/* Hotel Makkah */}
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "p-2 rounded-lg",
              isRoyal ? "bg-amber-500/10" : "bg-slate-100"
            )}>
              <Building2 className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hotel Makkah</p>
              <p className="text-xs font-semibold line-clamp-1">
                {nearestDeparture?.hotel_makkah?.name || pkg.hotel_makkah?.name || "TBA"}
                { (nearestDeparture?.hotel_makkah?.star_rating || pkg.hotel_makkah?.star_rating) && 
                  ` (${nearestDeparture?.hotel_makkah?.star_rating || pkg.hotel_makkah?.star_rating}★)`
                }
              </p>
            </div>
          </div>

          {/* Hotel Madinah */}
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "p-2 rounded-lg",
              isRoyal ? "bg-amber-500/10" : "bg-slate-100"
            )}>
              <Hotel className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hotel Madinah</p>
              <p className="text-xs font-semibold line-clamp-1">
                {nearestDeparture?.hotel_madinah?.name || pkg.hotel_madinah?.name || "TBA"}
                { (nearestDeparture?.hotel_madinah?.star_rating || pkg.hotel_madinah?.star_rating) && 
                  ` (${nearestDeparture?.hotel_madinah?.star_rating || pkg.hotel_madinah?.star_rating}★)`
                }
              </p>
            </div>
          </div>
        </div>

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
