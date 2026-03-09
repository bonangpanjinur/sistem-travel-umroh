import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, Plane, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from '@/types/database';
import { formatCurrency, getPackageTypeLabel, formatDuration } from '@/lib/format';

interface PackageCardProps {
  pkg: Package;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const lowestPrice = Math.min(
    pkg.price_quad,
    pkg.price_triple,
    pkg.price_double,
    pkg.price_single
  );

  return (
    <Card className="group card-hover overflow-hidden">
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
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            <span>{getPackageTypeLabel(pkg.package_type)}</span>
          </Badge>
          {pkg.is_featured && (
            <Badge className="bg-accent text-accent-foreground">
              <Star className="mr-1 h-3 w-3" />
              Favorit
            </Badge>
          )}
        </div>

        {/* Duration */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{formatDuration(pkg.duration_days)}</span>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-foreground group-hover:text-primary">
          {pkg.name}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {pkg.description || 'Perjalanan ibadah yang nyaman dan berkualitas'}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {pkg.airline && (
            <div className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              <span>{pkg.airline.name}</span>
            </div>
          )}
          {pkg.hotel_makkah && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>
                {pkg.hotel_makkah.star_rating}★ Makkah
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t p-4">
        <div>
          <p className="text-xs text-muted-foreground">Mulai dari</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(lowestPrice)}
          </p>
        </div>
        <Button asChild>
          <Link to={`/packages/${pkg.id}`}>Lihat Detail</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
