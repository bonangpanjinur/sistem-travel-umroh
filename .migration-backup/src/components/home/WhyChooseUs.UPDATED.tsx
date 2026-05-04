import { useCompanyFeatures, getIconComponent } from '@/hooks/useCompanyFeatures';
import { Skeleton } from '@/components/ui/skeleton';

export function WhyChooseUs() {
  const { data: features, isLoading } = useCompanyFeatures();

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Mengapa Memilih Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Keunggulan Layanan Kami
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kami berkomitmen memberikan pelayanan terbaik untuk perjalanan ibadah Anda
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </>
          ) : (
            features?.map((feature) => {
              const IconComponent = getIconComponent(feature.icon_name);
              return (
                <div
                  key={feature.id}
                  className="group p-6 rounded-xl border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <IconComponent className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
