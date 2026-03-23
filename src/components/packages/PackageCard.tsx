import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, Plane, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from '@/types/database';
import { formatCurrency, getPackageTypeLabel, formatDuration } from '@/lib/format';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';

interface PackageCardProps {
  pkg: Package;
  isRoyal?: boolean;
}

export function PackageCard({ pkg, isRoyal }: PackageCardProps) {
  const lowestPrice = Math.min(
    pkg.price_quad,
    pkg.price_triple,
    pkg.price_double,
    pkg.price_single
  );

  // Calculate total available seats from all open departures
  const openDepartures = (pkg.departures || []).filter(
    (d: any) => d.status === 'open' && new Date(d.departure_date) > new Date()
  );
  
  const totalQuota = openDepartures.reduce(
    (acc: number, d: any) => acc + (d.quota || 0), 
    0
  );

  const totalBooked = openDepartures.reduce(
    (acc: number, d: any) => acc + (d.booked_count || 0), 
    0
  );

  const totalAvailableSeats = totalQuota - totalBooked;
  const occupancyPercentage = totalQuota > 0 ? (totalBooked / totalQuota) * 100 : 0;
  const isAlmostFull = totalAvailableSeats > 0 && totalAvailableSeats < 10;
  const isSoldOut = openDepartures.length > 0 && totalAvailableSeats <= 0;

  return (
    <Card className={cn(
      "group card-hover overflow-hidden flex flex-col h-full transition-all duration-300",
      isRoyal ? "bg-[#1a1a1a] border-amber-500/10 hover:border-amber-500/30 text-white" : ""
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop'}
          alt={pkg.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary text-primary-foreground border-none shadow-sm">
            <span>{getPackageTypeLabel(pkg.package_type)}</span>
          </Badge>
          {pkg.is_featured && (
            <Badge className="bg-amber-500 text-white border-none shadow-sm">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Favorit
            </Badge>
          )}
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">{formatDuration(pkg.duration_days)}</span>
        </div>
      </div>

      <CardContent className="p-4 flex-1">
        {/* Title */}
        <h3 className={cn(
          "mb-2 line-clamp-2 text-lg font-bold transition-colors",
          isRoyal ? "text-white font-serif group-hover:text-amber-500" : "text-foreground group-hover:text-primary"
        )}>
          {pkg.name}
        </h3>

        {/* Description */}
        <p className={cn(
          "mb-4 line-clamp-2 text-sm leading-relaxed",
          isRoyal ? "text-gray-400" : "text-muted-foreground"
        )}>
          {pkg.description || 'Perjalanan ibadah yang nyaman dan berkualitas'}
        </p>

        {/* Features */}
        <div className={cn(
          "flex flex-wrap gap-3 text-xs",
          isRoyal ? "text-amber-500/70" : "text-muted-foreground"
        )}>
          {pkg.airline && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded",
              isRoyal ? "bg-amber-500/10" : "bg-muted/50"
            )}>
              <Plane className={cn("h-3.5 w-3.5", isRoyal ? "text-amber-500" : "text-primary")} />
              <span className="font-medium">{pkg.airline.name}</span>
            </div>
          )}
          {pkg.hotel_makkah && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded",
              isRoyal ? "bg-amber-500/10" : "bg-muted/50"
            )}>
              <MapPin className={cn("h-3.5 w-3.5", isRoyal ? "text-amber-500" : "text-primary")} />
              <span className="font-medium">
                {pkg.hotel_makkah.star_rating}★ Makkah
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Remaining Seats Progress Bar */}
      {openDepartures.length > 0 && (
        <div className={cn(
          "px-4 py-3 border-t space-y-2",
          isRoyal ? "bg-black/20 border-amber-500/10" : "bg-muted/30"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className={cn("h-4 w-4", isRoyal ? "text-amber-500/50" : "text-muted-foreground")} />
              <span className={cn("text-xs font-semibold", isRoyal ? "text-white" : "text-foreground")}>
                {isSoldOut ? 'Habis Terjual' : `Sisa ${totalAvailableSeats} Kursi`}
              </span>
            </div>
            <span className={cn("text-xs", isRoyal ? "text-amber-500/50" : "text-muted-foreground")}>
              {totalBooked}/{totalQuota}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className={cn("h-2 w-full rounded-full overflow-hidden", isRoyal ? "bg-white/5" : "bg-muted")}>
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                isSoldOut
                  ? "bg-destructive"
                  : isAlmostFull
                  ? "bg-amber-500"
                  : "bg-green-500"
              )}
              style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      <CardFooter className={cn(
        "flex items-center justify-between border-t p-4",
        isRoyal ? "border-amber-500/10" : ""
      )}>
        <div>
          <p className={cn("text-xs", isRoyal ? "text-gray-400" : "text-muted-foreground")}>Mulai dari</p>
          <p className={cn("text-lg font-bold", isRoyal ? "text-amber-500" : "text-amber-600")}>
            {formatCurrency(lowestPrice)}
          </p>
        </div>
        <Button asChild className={cn(
          "border-none rounded-lg px-6",
          isRoyal ? "bg-amber-600 hover:bg-amber-500 text-black font-bold" : "bg-[#D98E27] hover:bg-[#BF7A1D] text-white"
        )}>
          <Link to={`/packages/${pkg.id}-${slugify(pkg.name)}`}>Lihat Detail</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
