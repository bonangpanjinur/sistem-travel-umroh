import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, Plane, MapPin, Users, Hotel, Building2, ChevronRight } from 'lucide-react';
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
  layout?: 'modern' | 'classic' | 'minimal';
  imageRatio?: '16/10' | '1/1' | '3/4' | '9/6';
  viewMode?: 'grid' | 'list';
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
  viewMode = 'grid'
}: PackageCardProps) {
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

          <div className={cn(
            "grid gap-y-4 gap-x-2 mb-6",
            isList ? "grid-cols-4" : "grid-cols-2"
          )}>
            <div className="flex items-start gap-2.5">
              <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                <Calendar className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Keberangkatan</p>
                <p className="text-xs font-semibold line-clamp-1">{renderDepartureDate()}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className={cn("p-2 rounded-lg", isRoyal ? "bg-amber-500/10" : "bg-slate-100")}>
                <Plane className={cn("h-4 w-4", isRoyal ? "text-amber-500" : "text-primary")} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Maskapai</p>
                <p className="text-xs font-semibold line-clamp-1">{nearestDeparture?.airline?.name || pkg.airline?.name || "TBA"}</p>
              </div>
            </div>

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

  // Render Classic Layout
  if (layout === 'classic') {
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
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pkg.duration_days} Hari</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Makkah & Madinah</span>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pesawat</span>
              <span className="font-medium">{nearestDeparture?.airline?.name || pkg.airline?.name || "TBA"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hotel</span>
              <span className="font-medium">Bintang {nearestDeparture?.hotel_makkah?.star_rating || pkg.hotel_makkah?.star_rating || "4"}</span>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Harga Mulai</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(lowestPrice)}</p>
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
        <div className="absolute bottom-2 left-2">
          <Badge className="bg-black/60 backdrop-blur-md border-none text-white text-[10px]">
            {formatDuration(pkg.duration_days)}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {pkg.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
          {pkg.description || "Nikmati perjalanan ibadah yang nyaman dan khusyuk bersama kami."}
        </p>
        
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-primary">{formatCurrency(lowestPrice)}</p>
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
