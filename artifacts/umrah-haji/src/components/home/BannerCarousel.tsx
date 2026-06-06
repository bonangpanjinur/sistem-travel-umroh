import { useEffect, useCallback, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ArrowRight, Crown, Zap, Leaf, Star, MessageCircle, Phone, Sparkles, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

const AUTOPLAY_DELAY = 6000;

const DEMO_BANNERS: Banner[] = [
  {
    id: 'demo-1',
    title: 'Wujudkan Ibadah Suci Anda',
    subtitle: 'Layanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun melayani jamaah Indonesia',
    cta_text: 'Lihat Paket',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'demo-2',
    title: 'Umroh Plus Istanbul',
    subtitle: 'Gabungkan ibadah suci dengan wisata islami yang menakjubkan di kota bersejarah Istanbul',
    cta_text: 'Daftar Sekarang',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=2070',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'demo-3',
    title: 'Haji Reguler & Khusus',
    subtitle: 'Bimbingan ibadah haji dengan muthawif berpengalaman dan fasilitas hotel bintang lima',
    cta_text: 'Pelajari Lebih Lanjut',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=2070',
    sort_order: 3,
    is_active: true,
  },
];

const TRUST_BADGES = [
  { icon: CheckCircle, text: 'KEMENAG Terdaftar' },
  { icon: Star, text: '15+ Tahun Pengalaman' },
  { icon: CheckCircle, text: '10.000+ Jamaah Diberangkatkan' },
];

export type BannerTemplate = 'classic' | 'modern' | 'luxury' | 'islamic' | 'futuristic' | 'nature' | 'royal';

interface BannerCarouselProps {
  compact?: boolean;
  template?: BannerTemplate;
  waNumber?: string;
}

interface ThemeConfig {
  wrapperBg: string;
  overlayGradient: string;
  sectionHeight: string;
  titleClass: string;
  subtitleClass: string;
  primaryCtaClass: string;
  secondaryCtaClass: string;
  prevNextClass: string;
  dotActive: string;
  dotInactive: string;
  contentAlign: string;
  badge?: { icon: React.ElementType; text: string; className: string };
  borderClass?: string;
  glowClass?: string;
  trustBadgeClass: string;
  accentColor: string;
  imageFilter?: string;
}

const themeConfig: Record<BannerTemplate, ThemeConfig> = {
  classic: {
    wrapperBg: 'bg-primary',
    overlayGradient: 'bg-gradient-to-r from-primary/95 via-primary/75 to-primary/20 md:to-transparent',
    sectionHeight: 'h-[480px] md:h-[560px] lg:h-[640px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-sm',
    subtitleClass: 'text-sm md:text-base lg:text-lg text-white/85 leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-primary rounded-full font-bold text-sm md:text-base hover:bg-white/95 active:scale-95 transition-all shadow-2xl shadow-black/20 ring-2 ring-white/20',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold text-sm md:text-base hover:bg-white/20 active:scale-95 transition-all border border-white/30',
    prevNextClass: 'w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 active:bg-white/40 text-white backdrop-blur-sm border border-white/20 transition-all',
    dotActive: 'w-7 h-2.5 bg-white rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-white/40 rounded-full hover:bg-white/70',
    contentAlign: 'items-center',
    badge: { icon: Sparkles, text: 'Terpercaya Sejak 2010', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm border border-white/20' },
    trustBadgeClass: 'bg-white/10 border-white/20 text-white',
    accentColor: '#fff',
  },
  modern: {
    wrapperBg: 'bg-white',
    overlayGradient: 'bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/10 md:to-transparent',
    sectionHeight: 'h-[460px] md:h-[540px] lg:h-[620px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter',
    subtitleClass: 'text-sm md:text-base text-white/80 leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-primary text-white rounded-xl font-bold text-sm md:text-base hover:bg-primary/90 active:scale-95 transition-all shadow-xl shadow-primary/30',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-sm md:text-base hover:bg-white/20 active:scale-95 transition-all border border-white/30',
    prevNextClass: 'w-10 h-10 rounded-xl bg-white/15 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-primary rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-white/50 rounded-full hover:bg-white/80',
    contentAlign: 'items-center',
    trustBadgeClass: 'bg-white/10 border-white/20 text-white',
    accentColor: 'hsl(var(--primary))',
  },
  luxury: {
    wrapperBg: 'bg-[#0d1f17]',
    overlayGradient: 'bg-gradient-to-r from-[#0d1f17]/95 via-[#0d1f17]/70 to-[#0d1f17]/20 md:to-transparent',
    sectionHeight: 'h-[500px] md:h-[580px] lg:h-[660px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-serif italic text-white leading-[1.15]',
    subtitleClass: 'text-sm md:text-base text-white/75 font-light leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-black rounded-full font-bold text-sm md:text-base hover:from-amber-400 hover:to-amber-300 active:scale-95 transition-all shadow-2xl shadow-amber-500/30',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-amber-500/10 backdrop-blur-sm text-amber-400 rounded-full font-semibold text-sm md:text-base hover:bg-amber-500/20 active:scale-95 transition-all border border-amber-500/30',
    prevNextClass: 'w-10 h-10 rounded-full bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-amber-400 rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-amber-400/35 rounded-full hover:bg-amber-400/60',
    contentAlign: 'items-center',
    badge: { icon: Crown, text: 'Layanan Eksklusif & Premium', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm' },
    trustBadgeClass: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    accentColor: '#f59e0b',
  },
  islamic: {
    wrapperBg: 'bg-primary',
    overlayGradient: 'bg-gradient-to-r from-primary/95 via-primary/70 to-primary/20 md:to-transparent',
    sectionHeight: 'h-[480px] md:h-[560px] lg:h-[640px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1]',
    subtitleClass: 'text-sm md:text-base text-white/85 leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-primary rounded-2xl font-bold text-sm md:text-base hover:bg-white/95 active:scale-95 transition-all shadow-xl shadow-black/15',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-semibold text-sm md:text-base hover:bg-white/20 active:scale-95 transition-all border border-white/30',
    prevNextClass: 'w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/30 text-white border border-white/25 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-white rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-white/40 rounded-full hover:bg-white/70',
    contentAlign: 'items-center',
    badge: { icon: Star, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 text-white text-sm backdrop-blur-sm border border-white/20' },
    trustBadgeClass: 'bg-white/10 border-white/20 text-white',
    accentColor: '#fff',
    imageFilter: 'opacity-25 grayscale',
  },
  futuristic: {
    wrapperBg: 'bg-[#050505]',
    overlayGradient: 'bg-gradient-to-r from-[#050505]/95 via-[#050505]/70 to-[#050505]/15 md:to-transparent',
    sectionHeight: 'h-[480px] md:h-[560px] lg:h-[660px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter',
    subtitleClass: 'text-sm md:text-base text-gray-400 font-light leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-primary text-black font-bold text-sm md:text-base active:scale-95 transition-all clip-futuristic',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white/5 text-primary font-semibold text-sm md:text-base hover:bg-white/10 active:scale-95 transition-all border border-white/10 backdrop-blur-sm clip-futuristic',
    prevNextClass: 'w-10 h-10 bg-white/5 hover:bg-white/10 text-primary border border-white/10 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-primary',
    dotInactive: 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40',
    contentAlign: 'items-center',
    badge: { icon: Zap, text: 'Next-Gen Umrah Experience', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-white/5 border border-white/10 text-primary text-xs font-bold tracking-widest uppercase backdrop-blur-md' },
    trustBadgeClass: 'bg-white/5 border-white/10 text-gray-400',
    accentColor: 'hsl(var(--primary))',
    imageFilter: 'opacity-35',
  },
  nature: {
    wrapperBg: 'bg-[#1a2e1c]',
    overlayGradient: 'bg-gradient-to-r from-[#1a2e1c]/95 via-[#1a2e1c]/70 to-[#1a2e1c]/15 md:to-transparent',
    sectionHeight: 'h-[480px] md:h-[560px] lg:h-[640px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.15]',
    subtitleClass: 'text-sm md:text-base text-white/80 font-light leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-semibold text-sm md:text-base active:scale-95 transition-all shadow-xl shadow-emerald-900/40',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-semibold text-sm md:text-base hover:bg-white/20 active:scale-95 transition-all border border-white/25',
    prevNextClass: 'w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-emerald-400 rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-white/35 rounded-full hover:bg-white/60',
    contentAlign: 'items-center',
    badge: { icon: Leaf, text: 'Perjalanan Penuh Berkah', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-700/35 text-emerald-300 text-xs font-medium border border-emerald-500/30 backdrop-blur-sm' },
    trustBadgeClass: 'bg-white/10 border-white/20 text-white/80',
    accentColor: '#34d399',
  },
  royal: {
    wrapperBg: 'bg-[#0a0a0a]',
    overlayGradient: 'bg-gradient-to-r from-[#0a0a0a]/95 via-[#0a0a0a]/70 to-[#0a0a0a]/15 md:to-transparent',
    sectionHeight: 'h-[520px] md:h-[600px] lg:h-[700px]',
    titleClass: 'text-3xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.15]',
    subtitleClass: 'text-sm md:text-base text-gray-400 leading-relaxed',
    primaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-amber-600 to-amber-400 text-black rounded-full font-bold text-sm md:text-base hover:from-amber-500 hover:to-amber-300 active:scale-95 transition-all shadow-[0_0_30px_rgba(217,119,6,0.4)]',
    secondaryCtaClass: 'inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-amber-500/10 backdrop-blur-sm text-amber-400 rounded-full font-semibold text-sm md:text-base hover:bg-amber-500/20 active:scale-95 transition-all border border-amber-500/30',
    prevNextClass: 'w-10 h-10 rounded-full bg-amber-500/8 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 backdrop-blur-sm transition-all',
    dotActive: 'w-7 h-2.5 bg-amber-400 rounded-full',
    dotInactive: 'w-2.5 h-2.5 bg-amber-400/30 rounded-full hover:bg-amber-400/60',
    contentAlign: 'items-center',
    badge: { icon: Crown, text: 'Royal Experience', className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold tracking-[0.2em] uppercase' },
    trustBadgeClass: 'bg-amber-500/8 border-amber-500/20 text-amber-400/80',
    accentColor: '#f59e0b',
  },
};

function SlideContent({
  banner,
  cfg,
  template,
  compact,
  waNumber,
  isActive,
  slideIndex,
}: {
  banner: Banner;
  cfg: ThemeConfig;
  template: BannerTemplate;
  compact: boolean;
  waNumber?: string;
  isActive: boolean;
  slideIndex: number;
}) {
  const BadgeIcon = cfg.badge?.icon;
  const waHref = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Assalamu\'alaikum, saya ingin info paket umroh')}`
    : undefined;

  /* ── COMPACT MODE: dedicated app-card layout ── */
  if (compact) {
    return (
      <div className="absolute inset-0 flex items-end p-2">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-lg border border-white/20 text-[9px] text-white/95 font-semibold tracking-wide">
            <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
            <span>Premium</span>
          </div>
        </div>

        {/* Enhanced gradient overlays for better readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
        
        {/* Content pinned to bottom */}
        <div
          className={cn(
            'relative z-10 w-full px-5 pb-6 pt-2 transition-all duration-700',
            isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
          style={{ transitionDelay: isActive ? '150ms' : '0ms' }}
        >
          {banner.title && (
            <p className="text-base md:text-lg font-black text-white leading-snug drop-shadow-lg line-clamp-2 mb-2 tracking-tight">
              {banner.title}
            </p>
          )}
          {banner.subtitle && (
            <p className="text-xs md:text-sm text-white/85 line-clamp-1 mb-3 font-medium leading-relaxed">
              {banner.subtitle}
            </p>
          )}
          {banner.cta_text && banner.cta_url && (
            <a
              href={banner.cta_url}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs md:text-sm font-bold active:scale-95 transition-all shadow-xl shadow-primary/30 backdrop-blur-sm border border-white/10"
            >
              {banner.cta_text}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  /* ── FULL MODE: original layout ── */
  return (
    <div
      className={cn(
        'absolute inset-0 flex',
        cfg.contentAlign,
        'px-5 md:px-10 lg:px-16 xl:px-20'
      )}
    >
      <div
        className={cn(
          'w-full max-w-xl transition-all duration-700',
          isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
        style={{ transitionDelay: isActive ? '150ms' : '0ms' }}
      >
        {/* Trust badge */}
        {cfg.badge && BadgeIcon && (
          <div
            className={cn(cfg.badge.className, 'mb-4')}
            style={{ transitionDelay: isActive ? '200ms' : '0ms' }}
          >
            <BadgeIcon className="h-3 w-3 flex-shrink-0" />
            <span>{cfg.badge.text}</span>
          </div>
        )}

        {/* Title */}
        {banner.title && (
          <h2 className={cn(cfg.titleClass, 'mb-3 md:mb-4')}>
            {banner.title}
          </h2>
        )}

        {/* Subtitle */}
        {banner.subtitle && (
          <p className={cn(cfg.subtitleClass, 'mb-6 md:mb-8 max-w-lg')}>
            {banner.subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          {banner.cta_text && banner.cta_url && (
            <a href={banner.cta_url} className={cfg.primaryCtaClass}>
              {banner.cta_text}
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </a>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cfg.secondaryCtaClass}
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span>Chat WhatsApp</span>
            </a>
          )}
        </div>

        {/* Trust Badges (bottom row) */}
        {slideIndex === 0 && (
          <div className="hidden md:flex flex-wrap gap-2 mt-6 md:mt-8">
            {TRUST_BADGES.map((b) => (
              <span
                key={b.text}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm',
                  cfg.trustBadgeClass
                )}
              >
                <b.icon className="h-3 w-3 flex-shrink-0" />
                {b.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BannerCarousel({ compact = false, template = 'classic', waNumber }: BannerCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 40 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const { data: fetchedBanners } = useQuery({
    queryKey: ['public-banners'],
    queryFn: async (): Promise<Banner[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error || !data || data.length === 0) return [];
        return data as Banner[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const banners = fetchedBanners && fetchedBanners.length > 0 ? fetchedBanners : DEMO_BANNERS;
  const cfg = themeConfig[template] ?? themeConfig.classic;

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

  const startAutoplay = useCallback(() => {
    if (banners.length <= 1 || isPaused) return;
    autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), AUTOPLAY_DELAY);
  }, [emblaApi, banners.length, isPaused]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopAutoplay();
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  const handlePrev = () => { emblaApi?.scrollPrev(); setIsPaused(true); setTimeout(() => setIsPaused(false), 6000); };
  const handleNext = () => { emblaApi?.scrollNext(); setIsPaused(true); setTimeout(() => setIsPaused(false), 6000); };
  const handleDot = (i: number) => { emblaApi?.scrollTo(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 6000); };

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        cfg.wrapperBg,
        cfg.borderClass,
        cfg.glowClass,
        compact ? 'w-[calc(100%-24px)] mx-auto my-3 rounded-3xl shadow-xl' : 'w-full'
      )}
    >
      {template === 'futuristic' && (
        <style dangerouslySetInnerHTML={{ __html: `.clip-futuristic { clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%); }` }} />
      )}

      {/* Carousel viewport */}
      <div className={cn('overflow-hidden', compact && 'rounded-3xl')} ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((banner, index) => (
            <div key={banner.id} className="relative flex-[0_0_100%] min-w-0">
              <div className={cn('relative w-full', cfg.sectionHeight, compact && '!h-[200px]')}>

                {/* Background image with parallax-feel */}
                <img
                  src={banner.image_url}
                  alt={banner.title ?? 'Banner'}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-transform duration-700 will-change-transform scale-105',
                    cfg.imageFilter,
                    index === selectedIndex ? 'scale-100' : 'scale-105'
                  )}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />

                {/* Theme-specific overlay decorations */}
                {template === 'islamic' && (
                  <div
                    className="absolute inset-0 opacity-[0.045] pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/islamic-art.png")' }}
                  />
                )}
                {template === 'futuristic' && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
                )}
                {template === 'royal' && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-paper.png")' }} />
                )}
                {template === 'luxury' && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/60 via-amber-400/30 to-transparent pointer-events-none" />
                )}

                {/* Main gradient overlay */}
                <div className={cn('absolute inset-0', cfg.overlayGradient)} />

                {/* Bottom gradient fade for mobile readability */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none md:hidden" />

                {/* Slide content */}
                <SlideContent
                  banner={banner}
                  cfg={cfg}
                  template={template}
                  compact={compact}
                  waNumber={waNumber}
                  isActive={index === selectedIndex}
                  slideIndex={index}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next navigation */}
      {banners.length > 1 && !compact && (
        <>
          <button
            onClick={handlePrev}
            className={cn(
              'absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all',
              cfg.prevNextClass
            )}
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className={cn(
              'absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all',
              cfg.prevNextClass
            )}
            aria-label="Slide berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Progress bar autoplay indicator */}
      {banners.length > 1 && !compact && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
          <div
            key={selectedIndex}
            className="h-full bg-white/50 animate-progress-bar"
            style={{ animationDuration: `${AUTOPLAY_DELAY}ms`, animationPlayState: isPaused ? 'paused' : 'running' }}
          />
        </div>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 items-center">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDot(index)}
              className={cn(
                'rounded-full transition-all duration-400',
                index === selectedIndex ? cfg.dotActive : cfg.dotInactive
              )}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide counter — mobile only */}
      {banners.length > 1 && (
        <div className="absolute top-4 right-4 z-10 md:hidden">
          <span className="text-[11px] font-semibold text-white/70 bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {selectedIndex + 1}/{banners.length}
          </span>
        </div>
      )}
    </section>
  );
}
