import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Package, Star, Clock, Users,
  Plane, ChevronRight, SlidersHorizontal, X, Loader2,
  Hotel, MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { slugify } from "@/lib/slug";

const TYPE_LABELS: Record<string, string> = {
  umroh: "Umroh",
  haji: "Haji",
  haji_plus: "Haji Plus",
  umroh_plus: "Umroh Plus",
};

const TYPE_COLORS: Record<string, string> = {
  umroh:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  haji:       "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  haji_plus:  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  umroh_plus: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

const FILTERS = [
  { label: "Semua", value: "" },
  { label: "Umroh", value: "umroh" },
  { label: "Haji", value: "haji" },
  { label: "Haji Plus", value: "haji_plus" },
  { label: "Umroh Plus", value: "umroh_plus" },
];

function PackageCard({ pkg }: { pkg: any }) {
  const slug = `${pkg.id}-${slugify(pkg.name)}`;
  const prices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
    .map(Number).filter(v => v > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const typeLabel = TYPE_LABELS[pkg.package_type] || pkg.package_type;
  const typeColor = TYPE_COLORS[pkg.package_type] || "bg-gray-100 text-gray-800";

  return (
    <Link to={`/jamaah/paket/${slug}`}>
      <Card className="overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
        {/* Image */}
        <div className="relative h-40 bg-muted">
          {pkg.featured_image ? (
            <img src={pkg.featured_image} alt={pkg.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Package className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor}`}>
              {typeLabel}
            </span>
          </div>
          {pkg.is_featured && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-current" /> Unggulan
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-3">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2">{pkg.name}</h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {pkg.duration_days} Hari
            </span>
            {pkg.quota && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> Kuota {pkg.quota}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Mulai dari</p>
              <p className="text-base font-bold text-primary">{formatCurrency(lowestPrice, pkg.currency)}</p>
            </div>
            <div className="flex items-center text-primary text-xs font-semibold gap-0.5">
              Lihat <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function JamaahKatalogPaket() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("");

  const { data: packages, isLoading } = useQuery({
    queryKey: ["jamaah-packages-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, package_type, duration_days, price_quad, price_triple, price_double, price_single, currency, featured_image, is_featured, quota, short_description")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = (packages || []).filter((pkg: any) => {
    const matchType = !activeType || pkg.package_type === activeType;
    const matchSearch = !search || pkg.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
      <JamaahBottomNav />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link to="/jamaah" className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-base">Paket Umroh & Haji</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari paket umroh, haji..."
              className="pl-9 pr-9 h-9 text-sm bg-muted/60 border-0 focus-visible:ring-1"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveType(f.value)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  activeType === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto md:ml-64 px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-sm">Paket tidak ditemukan</p>
            <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian</p>
            <button onClick={() => { setSearch(""); setActiveType(""); }} className="mt-4 text-xs text-primary font-semibold">
              Reset pencarian
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} paket tersedia{activeType ? ` · ${TYPE_LABELS[activeType]}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((pkg: any) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
