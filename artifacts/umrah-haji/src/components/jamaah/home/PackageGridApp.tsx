import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";

function getMinPrice(p: any): number {
  const arr = [p.price_quad, p.price_triple, p.price_double, p.price_single]
    .map(Number).filter((v) => v > 0);
  return arr.length ? Math.min(...arr) : 0;
}

const PKG_TYPE_LABEL: Record<string, string> = {
  umroh: "Umroh", umroh_plus: "Umroh+", haji: "Haji", haji_plus: "Haji+", tabungan: "Tabungan",
};

/**
 * Grid 2-kolom kartu paket bergaya aplikasi mobile.
 * Image 4:3 di atas, badge tipe + wishlist, harga, durasi.
 */
export function PackageGridApp({ limit = 6, themeColor = "#15803d" }: { limit?: number; themeColor?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-package-grid-app", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id,name,featured_image,duration_days,price_quad,price_triple,price_double,price_single,currency,package_type,is_popular,is_featured")
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { isWishlisted, toggle } = useWishlist();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted aspect-[3/4] animate-pulse" />
        ))}
      </div>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((p: any, i: number) => {
        const slug = `${p.id}-${slugify(p.name)}`;
        const min = getMinPrice(p);
        const isTabungan = p.package_type === "tabungan";
        const href = isTabungan ? `/savings/register/${p.id}` : `/packages/${slug}`;
        const wished = isWishlisted(p.id);
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform"
          >
            <Link to={href} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.featured_image || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&auto=format&fit=crop"}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span
                  className="absolute top-1.5 left-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
                  style={{ backgroundColor: themeColor }}
                >
                  {PKG_TYPE_LABEL[p.package_type] || "Paket"}
                </span>
                {p.is_popular && (
                  <span className="absolute top-1.5 right-7 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                    🔥
                  </span>
                )}
                {p.duration_days && (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-black/45 backdrop-blur px-1.5 py-0.5 rounded-full">
                    <Clock className="h-2.5 w-2.5" />
                    {p.duration_days}H
                  </span>
                )}
              </div>
            </Link>

            <button
              onClick={(e) => { e.preventDefault(); toggle(p.id); }}
              className={cn(
                "absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur transition",
                wished ? "bg-rose-50/95" : "bg-white/85 hover:bg-white"
              )}
              aria-label="Wishlist"
            >
              <Heart className={cn("h-3 w-3", wished ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
            </button>

            <Link to={href} className="block px-2.5 py-2">
              <h4 className="font-semibold text-[12px] leading-snug line-clamp-2 text-foreground min-h-[2rem]">
                {p.name}
              </h4>
              {min > 0 ? (
                <>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-none">Mulai dari</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: themeColor }}>
                    {formatCurrency(min, p.currency)}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> Hubungi kami
                </p>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}