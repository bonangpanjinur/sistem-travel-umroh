import { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const AUTOPLAY_DELAY = 5000;

export function BannerCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const { data: banners = [] } = useQuery({
    queryKey: ['public-banners'],
    queryFn: async (): Promise<Banner[]> => {
      const { data, error } = await (supabase as any)
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return [];
      return (data ?? []) as Banner[];
    },
    staleTime: 60_000,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_DELAY);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-gray-900">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="relative flex-[0_0_100%] min-w-0"
            >
              <div className="relative w-full" style={{ aspectRatio: '21/7', minHeight: '200px' }}>
                <img
                  src={banner.image_url}
                  alt={banner.title ?? 'Banner'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {(banner.title || banner.subtitle || banner.cta_text) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
                    <div className="px-8 md:px-16 lg:px-24 max-w-2xl">
                      {banner.title && (
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
                          {banner.title}
                        </h2>
                      )}
                      {banner.subtitle && (
                        <p className="text-sm md:text-lg text-white/90 mb-5 drop-shadow-md">
                          {banner.subtitle}
                        </p>
                      )}
                      {banner.cta_text && banner.cta_url && (
                        <a
                          href={banner.cta_url}
                          className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm md:text-base hover:opacity-90 transition-opacity shadow-lg"
                        >
                          {banner.cta_text}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`rounded-full transition-all ${
                  index === selectedIndex
                    ? 'w-5 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
