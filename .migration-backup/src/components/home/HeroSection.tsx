import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function HeroSection() {
  const navigate = useNavigate();
  const [packageType, setPackageType] = useState('umroh');
  const [month, setMonth] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (packageType) params.set('type', packageType);
    if (month) params.set('month', month);
    navigate(`/packages?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Bismillah */}
          <p className="text-accent font-arabic text-2xl mb-4 animate-fade-in">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Wujudkan Ibadah Suci Anda
            <span className="block text-accent mt-2">Bersama Kami</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun. 
            Nikmati perjalanan ibadah yang nyaman, aman, dan penuh keberkahan.
          </p>

          {/* Search Widget */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Package Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Jenis Paket
                </label>
                <Select value={packageType} onValueChange={setPackageType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umroh">Umroh</SelectItem>
                    <SelectItem value="haji">Haji Reguler</SelectItem>
                    <SelectItem value="haji_plus">Haji Plus</SelectItem>
                    <SelectItem value="umroh_plus">Umroh Plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Bulan Keberangkatan
                </label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Januari 2026</SelectItem>
                    <SelectItem value="02">Februari 2026</SelectItem>
                    <SelectItem value="03">Maret 2026</SelectItem>
                    <SelectItem value="04">April 2026</SelectItem>
                    <SelectItem value="05">Mei 2026</SelectItem>
                    <SelectItem value="06">Juni 2026</SelectItem>
                    <SelectItem value="07">Juli 2026</SelectItem>
                    <SelectItem value="08">Agustus 2026</SelectItem>
                    <SelectItem value="09">September 2026</SelectItem>
                    <SelectItem value="10">Oktober 2026</SelectItem>
                    <SelectItem value="11">November 2026</SelectItem>
                    <SelectItem value="12">Desember 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pax */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Jumlah Jamaah
                </label>
                <Input type="number" min="1" placeholder="1" defaultValue="1" />
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <Button onClick={handleSearch} size="lg" className="w-full gap-2">
                  <Search className="h-5 w-5" />
                  Cari Paket
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {[
              { value: '15+', label: 'Tahun Pengalaman' },
              { value: '50K+', label: 'Jamaah Terlayani' },
              { value: '100+', label: 'Keberangkatan/Tahun' },
              { value: '4.9', label: 'Rating Kepuasan' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
