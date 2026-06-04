import React, { useState, useEffect } from 'react';
import { ArrowRight, MessageCircle, Star, CheckCircle, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  data: {
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
    badge?: string;
    secondaryCta?: string;
    trustBadges?: string[];
    overlayStyle?: 'dark' | 'emerald' | 'gradient' | 'split';
  };
  waNumber: string;
}

const DEFAULT_TRUST = ['KEMENAG Terdaftar', '15+ Tahun Pengalaman', '10.000+ Jamaah'];

export const HeroSection: React.FC<HeroSectionProps> = ({ data, waNumber }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const waHref = `https://wa.me/${waNumber.replace(/\D/g, '')}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin info paket umroh")}`;
  const overlayStyle = data.overlayStyle ?? 'emerald';
  const trustBadges = data.trustBadges ?? DEFAULT_TRUST;

  const overlayClass = {
    dark: 'bg-gradient-to-r from-gray-900/92 via-gray-900/70 to-gray-900/20',
    emerald: 'bg-gradient-to-r from-emerald-950/95 via-emerald-900/72 to-emerald-900/20',
    gradient: 'bg-gradient-to-br from-emerald-950/95 via-emerald-900/60 to-blue-900/40',
    split: 'bg-gradient-to-r from-emerald-950/98 via-emerald-900/80 to-transparent',
  }[overlayStyle];

  return (
    <section className="relative w-full min-h-[100svh] md:min-h-[680px] lg:min-h-[780px] flex items-center overflow-hidden bg-emerald-950">

      {/* Background image */}
      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt={data.title}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-[8000ms] hover:scale-100"
          loading="eager"
        />
      )}

      {/* Overlay */}
      <div className={cn('absolute inset-0', overlayClass)} />

      {/* Bottom fade for mobile */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-emerald-950/60 to-transparent pointer-events-none md:hidden" />

      {/* Content */}
      <div className="relative z-10 w-full px-5 md:px-12 lg:px-20 py-20 md:py-24">
        <div
          className={cn(
            'max-w-2xl transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          )}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
            style={{ transitionDelay: '100ms' }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-white/90 text-xs font-semibold">
              {data.badge ?? 'Terpercaya Sejak 2010'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4 md:mb-5">
            {data.title}
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg lg:text-xl text-white/80 leading-relaxed mb-8 md:mb-10 max-w-xl">
            {data.subtitle}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 md:mb-10">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 md:py-4 bg-white text-emerald-800 rounded-full font-bold text-sm md:text-base hover:bg-white/95 active:scale-95 transition-all shadow-2xl shadow-black/25 ring-2 ring-white/20"
            >
              {data.ctaText || 'Daftar Sekarang'}
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold text-sm md:text-base hover:bg-white/20 active:scale-95 transition-all border border-white/25"
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              {data.secondaryCta ?? 'Chat WhatsApp'}
            </a>
          </div>

          {/* Trust badges */}
          {trustBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 border border-white/15 backdrop-blur-sm text-white/80 text-[11px] font-medium"
                >
                  <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce opacity-60">
        <ChevronDown className="h-5 w-5 text-white" />
      </div>
    </section>
  );
};
