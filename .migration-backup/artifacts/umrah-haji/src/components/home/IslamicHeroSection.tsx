import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Calendar, Users, MapPin, Moon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useHeroStats } from '@/hooks/useHeroStats';
import { usePackageTypes } from '@/hooks/usePackageTypes';
import { useDepartures } from '@/hooks/useDepartures';
import { Skeleton } from '@/components/ui/skeleton';

interface IslamicHeroSectionProps {
  settings?: WebsiteSettings;
}

export function IslamicHeroSection({ settings: propSettings }: IslamicHeroSectionProps) {
  const navigate = useNavigate();
  const { data: fetchedSettings } = useWebsiteSettings();
  const { data: heroStats, isLoading: statsLoading } = useHeroStats();
  const { data: packageTypes, isLoading: packageTypesLoading } = usePackageTypes();
  const { data: departures } = useDepartures();
  
  const settings = propSettings || fetchedSettings;
  const [packageType, setPackageType] = useState('');
  const [month, setMonth] = useState('');
  const [jamaahCount, setJamaahCount] = useState('1');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (packageType) params.set('type', packageType);
    if (month) params.set('month', month);
    if (jamaahCount) params.set('jamaah', jamaahCount);
    navigate(`/packages?${params.toString()}`);
  };

  const heroTitle = settings?.hero_title || 'Wujudkan Ibadah Suci Anda';
  const heroSubtitle = settings?.hero_subtitle || 'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun. Nikmati perjalanan ibadah yang nyaman, aman, dan penuh keberkahan.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070';
  const heroCTAText = settings?.hero_cta_text || 'Lihat Paket';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  const getAvailableMonths = () => {
    if (!departures || departures.length === 0) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    const months = new Set<number>();
    departures.forEach((dep: any) => {
      if (dep.departure_date) {
        const date = new Date(dep.departure_date);
        months.add(date.getMonth() + 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  };

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const currentYear = new Date().getFullYear();
  const availableMonths = getAvailableMonths();

  return (
    <section className="relative min-h-[700px] flex items-center justify-center overflow-hidden bg-primary/5">
      {/* Background Pattern & Image */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 grayscale"
          style={{ backgroundImage: `url('${heroImageUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
        {/* Islamic Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/islamic-art.png")' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 animate-fade-in">
              <Star className="h-4 w-4 fill-primary" />
              <span className="text-sm font-bold tracking-wide uppercase">Terpercaya & Berpengalaman</span>
            </div>

            <div className="space-y-4">
              <p className="text-primary font-arabic text-3xl md:text-4xl animate-fade-in">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1]">
                {heroTitle.split('\n').map((line, i) => (
                  <span key={i} className={i > 0 ? "block text-primary" : ""}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed">
                {heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {heroCTAText && (
                <Button asChild size="lg" className="text-lg px-10 py-7 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                  <Link to={heroCTALink}>{heroCTAText}</Link>
                </Button>
              )}
              <Button variant="outline" size="lg" className="text-lg px-10 py-7 rounded-2xl border-2">
                Konsultasi Gratis
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))
              ) : (
                heroStats?.map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-2xl font-bold text-primary">{stat.stat_value}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{stat.stat_label}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Content - Search Widget */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              
              <div className="relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Cari Keberangkatan</h3>
                    <p className="text-sm text-slate-500">Temukan jadwal terbaik untuk Anda</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Jenis Paket</label>
                    <Select value={packageType} onValueChange={setPackageType}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white/50 focus:ring-primary">
                        <SelectValue placeholder="Pilih jenis paket" />
                      </SelectTrigger>
                      <SelectContent>
                        {packageTypesLoading ? (
                          <div className="p-2"><Skeleton className="h-8 w-full" /></div>
                        ) : (
                          packageTypes?.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.code}>{pkg.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Bulan Keberangkatan</label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white/50 focus:ring-primary">
                        <SelectValue placeholder="Pilih bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map((m) => (
                          <SelectItem key={m} value={String(m).padStart(2, '0')}>
                            {monthNames[m - 1]} {currentYear}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Jumlah Jamaah</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type="number" 
                        min="1" 
                        className="h-14 pl-12 rounded-2xl border-slate-200 bg-white/50 focus:ring-primary"
                        value={jamaahCount}
                        onChange={(e) => setJamaahCount(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSearch} size="lg" className="w-full h-16 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 mt-4">
                    Cari Sekarang
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
