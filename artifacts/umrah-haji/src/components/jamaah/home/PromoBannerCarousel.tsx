import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  badge?: string;
  price?: number;
  href: string;
  accent?: string;
}

/**
 * Banner promosi auto-rotate untuk home jamaah.
 * Sumber data: paket dengan is_popular / is_featured.
 */
export function PromoBannerCarousel() {
  const { data } = useQuery({
    queryKey: ["home-promo-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id,name,featured_image,price_quad,price_triple,price_double,currency,is_popular,is_featured,package_type")
        .eq("is_active", true)
        .or("is_popular.eq.true,is_featured.eq.true")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides: Slide[] = (data || []).map((p: any) => {
    const prices = [p.price_quad, p.price_triple, p.price_double].map(Number).filter((v) => v > 0);
    const min = prices.length ? Math.min(...prices) : 0;
    return {
      id: p.id,
      title: p.name,
      subtitle: p.is_popular ? "Paling diminati" : "Pilihan unggulan",
      image: p.featured_image || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&auto=format&fit=crop",
      badge: (p.package_type || "umroh").toString().toUpperCase().replace("_", " "),
      price: min,
      href: `/packages/${p.id}-${slugify(p.name)}`,
      accent: p.is_popular ? "#e11d48" : "#d97706",
    };
  });

  const [idx, setIdx] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timer.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 5000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[idx];

  return (
    <section className="mb-4 -mt-1">
      <div className="relative aspect-[16/8] overflow-hidden rounded-3xl shadow-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Link to={slide.href} className="block h-full w-full">
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
                width={1200}
                height={600}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={idx === 0 ? "high" : "low"}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  {slide.badge && (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow"
                      style={{ backgroundColor: slide.accent }}
                    >
                      {slide.subtitle}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white border border-white/30">
                    {slide.badge}
                  </span>
                </div>
                <div>
                  <p className="text-white font-display text-base sm:text-lg font-semibold leading-tight line-clamp-2 drop-shadow">
                    {slide.title}
                  </p>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    {slide.price ? (
                      <div>
                        <p className="text-[10px] text-white/75 leading-none">Mulai dari</p>
                        <p className="text-white text-lg font-bold leading-tight">{formatCurrency(slide.price)}</p>
                      </div>
                    ) : <span />}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-primary/95 px-3 py-1.5 rounded-full shadow">
                      Lihat <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Sparkle accent */}
        <Sparkles className="absolute top-3 right-3 h-4 w-4 text-white/60" />
      </div>
    </section>
  );
}