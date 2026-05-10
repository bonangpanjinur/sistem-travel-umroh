import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Clock, Calendar, Plane, Building2, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Package } from "@/types/database";
import { formatCurrency, getPackageTypeLabel, formatDuration } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";

interface PackageCardPWAProps {
  pkg: Package & { departures?: any[] };
  index?: number;
  themeColor?: string;
}

const MONTHS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mei", "06": "Jun", "07": "Jul", "08": "Ags",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

function getLowestPrice(pkg: any): number {
  const departures: any[] = pkg.departures ?? [];
  const openFuture = departures.filter(
    (d) => d.status === "open" && (!d.departure_date || new Date(d.departure_date) > new Date())
  );
  if (openFuture.length > 0) {
    let min = Infinity;
    openFuture.forEach((d) => {
      [d.price_quad, d.price_triple, d.price_double, d.price_single]
        .map(Number)
        .filter((v) => v > 0)
        .forEach((v) => { if (v < min) min = v; });
    });
    if (min !== Infinity) return min;
  }
  const base = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
    .map(Number)
    .filter((v) => v > 0);
  return base.length > 0 ? Math.min(...base) : 0;
}

function getNearestDeparture(pkg: any): any | null {
  const departures: any[] = pkg.departures ?? [];
  const openFuture = departures
    .filter((d) => d.status === "open" && (!d.departure_date || new Date(d.departure_date) > new Date()))
    .sort((a, b) => {
      if (!a.departure_date) return 1;
      if (!b.departure_date) return -1;
      return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
    });
  return openFuture[0] ?? null;
}

function formatDepartureShort(dep: any | null): string {
  if (!dep) return "Segera";
  if (dep.departure_date) {
    const d = new Date(dep.departure_date);
    return `${d.getDate()} ${MONTHS[String(d.getMonth() + 1).padStart(2, "0")]} ${d.getFullYear()}`;
  }
  if (dep.month) {
    return `${MONTHS[dep.month] ?? dep.month} ${dep.year ?? ""}`.trim();
  }
  return "TBA";
}

const EASE_CARD: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PackageCardPWA({ pkg, index = 0, themeColor = "#15803d" }: PackageCardPWAProps) {
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(pkg.id);
  const price = getLowestPrice(pkg);
  const dep = getNearestDeparture(pkg);
  const slug = `${pkg.id}-${slugify(pkg.name)}`;
  const isTabungan = (pkg.package_type as string) === "tabungan";

  const totalQuota = dep?.quota ?? (pkg as any).quota ?? 0;
  const bookedCount = dep?.booked_count ?? (pkg as any).booked_count ?? 0;
  const remaining = Math.max(0, totalQuota - bookedCount);
  const pct = totalQuota > 0 ? (bookedCount / totalQuota) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: EASE_CARD }}
      className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm active:scale-[0.985] transition-transform duration-150"
    >
      {/* Image strip */}
      <Link to={isTabungan ? `/savings/register/${pkg.id}` : `/packages/${slug}`} className="block">
        <div className="relative aspect-[16/7] overflow-hidden bg-muted">
          <img
            src={pkg.featured_image ?? "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&auto=format&fit=crop"}
            alt={pkg.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Badges top-left */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
            <Badge
              className="text-[10px] font-bold px-2 py-0.5 border-none shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              {getPackageTypeLabel(pkg.package_type)}
            </Badge>
            {(pkg as any).is_popular && (
              <Badge className="text-[10px] font-bold px-2 py-0.5 bg-rose-500 border-none">🔥 Populer</Badge>
            )}
            {(pkg as any).is_featured && (
              <Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-black border-none">⭐ Unggulan</Badge>
            )}
          </div>

          {/* Duration pill bottom-right */}
          {!isTabungan && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
              <Clock className="h-3 w-3 text-white/80" />
              <span className="text-[11px] font-bold text-white">{formatDuration(pkg.duration_days)}</span>
            </div>
          )}

          {/* Price bottom-left */}
          <div className="absolute bottom-2.5 left-2.5">
            <p className="text-[10px] text-white/70 leading-none">Mulai dari</p>
            <p className="text-lg font-bold text-white leading-tight">
              {formatCurrency(price, pkg.currency)}
            </p>
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="px-3.5 pt-3 pb-3.5">
        <div className="flex items-start gap-2">
          <Link
            to={isTabungan ? `/savings/register/${pkg.id}` : `/packages/${slug}`}
            className="flex-1 min-w-0"
          >
            <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground mb-2">
              {pkg.name}
            </h3>
          </Link>

          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggle(pkg.id);
            }}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90",
              wishlisted
                ? "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700"
                : "bg-muted border-border hover:border-rose-300"
            )}
            aria-label={wishlisted ? "Hapus dari wishlist" : "Simpan ke wishlist"}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                wishlisted ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
              )}
            />
          </button>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground mb-2.5">
          {dep && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 flex-shrink-0" style={{ color: themeColor }} />
              <span className="truncate font-medium">{formatDepartureShort(dep)}</span>
            </div>
          )}
          {dep?.airline?.name && (
            <div className="flex items-center gap-1.5">
              <Plane className="h-3 w-3 flex-shrink-0" style={{ color: themeColor }} />
              <span className="truncate font-medium">{dep.airline.name}</span>
            </div>
          )}
          {dep?.hotel_makkah?.name && (
            <div className="flex items-center gap-1.5 col-span-2">
              <Building2 className="h-3 w-3 flex-shrink-0" style={{ color: themeColor }} />
              <span className="truncate font-medium">{dep.hotel_makkah.name}</span>
            </div>
          )}
        </div>

        {/* Seat bar */}
        {totalQuota > 0 && !isTabungan && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" />
                <span>Ketersediaan Seat</span>
              </div>
              <span className={cn(
                "text-[10px] font-bold",
                remaining === 0 ? "text-destructive" : remaining <= 5 ? "text-amber-500" : "text-emerald-600"
              )}>
                {remaining === 0 ? "Penuh" : `${remaining}/${totalQuota} tersisa`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          to={isTabungan ? `/savings/register/${pkg.id}` : `/packages/${slug}`}
          className="flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.97] transition-transform duration-150"
          style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)` }}
        >
          <span>{isTabungan ? "Mulai Menabung" : "Lihat Detail"}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
