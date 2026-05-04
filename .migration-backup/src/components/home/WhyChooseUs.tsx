import { useCompanyFeatures, getIconComponent } from '@/hooks/useCompanyFeatures';
import { Skeleton } from '@/components/ui/skeleton';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Crown } from 'lucide-react';

interface WhyChooseUsProps {
  settings?: WebsiteSettings;
}

export function WhyChooseUs({ settings }: WhyChooseUsProps) {
  const { data: features, isLoading } = useCompanyFeatures();
  const isRoyal = settings?.template === 'royal';

  if (isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card">
                <Skeleton className="h-14 w-14 rounded-xl mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-20 transition-colors duration-500 ${isRoyal ? 'bg-[#0a0a0a] text-white' : 'bg-background'}`}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          {isRoyal && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase mb-4">
              <Crown className="h-3 w-3" />
              Royal Commitment
            </div>
          )}
          <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider block`}>
            Mengapa Memilih Kami
          </span>
          <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
            Keunggulan Layanan Kami
          </h2>
          <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>
            Kami berkomitmen memberikan pelayanan terbaik untuk perjalanan ibadah Anda
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features && features.length > 0 ? (
            features.map((feature) => {
              const IconComponent = getIconComponent(feature.icon_name);
              return (
                <div
                  key={feature.id}
                  className={`group p-6 rounded-2xl border transition-all duration-300 ${
                    isRoyal 
                      ? 'bg-[#1a1a1a] border-amber-500/10 hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(217,119,6,0.1)]' 
                      : 'bg-card hover:shadow-lg hover:border-primary/50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                    isRoyal
                      ? 'bg-amber-500/10 group-hover:bg-amber-500 group-hover:scale-110'
                      : 'bg-primary/10 group-hover:bg-primary group-hover:scale-110'
                  }`}>
                    <IconComponent className={`h-7 w-7 transition-colors ${
                      isRoyal
                        ? 'text-amber-500 group-hover:text-black'
                        : 'text-primary group-hover:text-primary-foreground'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isRoyal ? 'text-gray-400' : 'text-muted-foreground'}`}>
                    {feature.description}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              Tidak ada fitur yang tersedia
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
