import { MapPin, Clock } from "lucide-react";

interface Package {
  id: string;
  name: string;
  package_type?: string;
  duration_days?: number;
  featured_image?: string | null;
  price_quad?: number;
  price_triple?: number;
  price_double?: number;
  price_single?: number;
  hotel_makkah?: { name?: string; star_rating?: number } | null;
  departures?: Array<{
    departure_date?: string;
    status?: string;
    price_quad?: number;
    price_triple?: number;
    price_double?: number;
    price_single?: number;
  }>;
}

interface ChatPackageCardProps {
  packageId: string;
  packages: Package[];
  accentColor?: string;
}

const TYPE_LABELS: Record<string, string> = {
  umroh: "Umroh",
  haji: "Haji",
  haji_plus: "Haji Plus",
  umroh_plus: "Umroh Plus",
  tabungan: "Tabungan",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ChatPackageCard({ packageId, packages, accentColor = "#6d28d9" }: ChatPackageCardProps) {
  const pkg = packages?.find((p) => p.id === packageId);
  if (!pkg) return null;

  const today = new Date().toISOString();
  const upcoming = (pkg.departures || [])
    .filter((d) => d.departure_date && d.departure_date >= today && d.status !== "cancelled")
    .sort((a, b) => (a.departure_date ?? "").localeCompare(b.departure_date ?? ""));

  const nearestDep = upcoming[0];
  const priceSource = nearestDep ?? pkg;
  const prices = [
    priceSource.price_quad,
    priceSource.price_triple,
    priceSource.price_double,
    priceSource.price_single,
  ].filter((p): p is number => typeof p === "number" && p > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;

  const typeLabel = TYPE_LABELS[pkg.package_type ?? ""] ?? pkg.package_type ?? "Paket";
  const hotelName = pkg.hotel_makkah?.name;
  const stars = pkg.hotel_makkah?.star_rating
    ? "★".repeat(pkg.hotel_makkah.star_rating)
    : null;

  return (
    <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white w-[220px] shrink-0">
      <div className="relative h-[90px] overflow-hidden bg-gradient-to-br from-violet-100 to-indigo-100">
        {pkg.featured_image ? (
          <img
            src={pkg.featured_image}
            alt={pkg.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🕋</span>
          </div>
        )}
        <span
          className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-white shadow"
          style={{ backgroundColor: accentColor }}
        >
          {typeLabel}
        </span>
        {pkg.duration_days && (
          <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-black/40 text-white flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {pkg.duration_days}hr
          </span>
        )}
      </div>

      <div className="p-2.5 space-y-1.5">
        <p className="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-tight">{pkg.name}</p>

        {hotelName && (
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {hotelName} {stars && <span className="text-amber-400 text-[9px]">{stars}</span>}
          </p>
        )}

        {minPrice ? (
          <p className="text-[10px] text-gray-500">
            Mulai{" "}
            <span className="font-bold text-gray-900 text-[11px]">{formatRupiah(minPrice)}</span>
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 italic">Hubungi kami untuk harga</p>
        )}

        <button
          onClick={() => (window.location.href = `/packages/${pkg.id}`)}
          className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          Lihat Paket →
        </button>
      </div>
    </div>
  );
}

export function extractPackageIds(text: string): string[] {
  const regex = /\/packages\/([a-zA-Z0-9\-]{8,})/g;
  const ids = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}
