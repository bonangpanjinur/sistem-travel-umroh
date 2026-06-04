import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useAboutPageContent } from '@/hooks/useAboutPageContent';
import { useHeroStats } from '@/hooks/useHeroStats';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, Users, Award, Target, Heart, Shield, 
  MapPin, Phone, Mail, Clock, Star, CheckCircle2 
} from 'lucide-react';

// Icon mapping for dynamic values
const iconMap: Record<string, React.ComponentType<any>> = {
  'Heart': Heart,
  'Shield': Shield,
  'Users': Users,
  'Star': Star,
  'Award': Award,
  'Target': Target,
  'Building2': Building2,
  'Clock': Clock,
  'MapPin': MapPin,
  'Phone': Phone,
  'Mail': Mail,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Heart;
}

export default function AboutPage() {
  const { data: settings, isLoading: settingsLoading } = useWebsiteSettings();
  const { data: aboutContent, isLoading: aboutLoading } = useAboutPageContent('00000000-0000-0000-0000-000000000001');
  const { data: heroStats, isLoading: statsLoading } = useHeroStats();

  const isLoading = settingsLoading || aboutLoading || statsLoading;

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DynamicPublicLayout>
    );
  }

  const companyName = settings?.company_name || '';
  const tagline = settings?.tagline || '';
  const phone = settings?.footer_phone || '';
  const email = settings?.footer_email || '';
  const address = settings?.footer_address || '';

  // Use dynamic values from aboutContent
  const values = aboutContent?.values || [];
  const milestones = aboutContent?.milestones || [];
  
  // Use dynamic hero stats for the stats section
  const stats = heroStats && heroStats.length > 0 
    ? heroStats.map(stat => ({ value: stat.stat_value, label: stat.stat_label }))
    : [];

  return (
    <DynamicPublicLayout>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Building2 className="h-3 w-3 mr-1" />
              Tentang Kami
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {companyName}
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              {tagline}
            </p>
            {aboutContent?.mission_text && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {aboutContent.mission_text}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats.length > 0 && (
        <section className="py-12 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm md:text-base opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Vision & Mission */}
      {(aboutContent?.vision_text || aboutContent?.mission_text) && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {aboutContent?.vision_text && (
                <Card className="border-primary/20">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">Visi</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {aboutContent.vision_text}
                    </p>
                  </CardContent>
                </Card>
              )}

              {aboutContent?.mission_text && (
                <Card className="border-primary/20">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Award className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">Misi</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {aboutContent.mission_text}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      {values.length > 0 && (
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nilai-Nilai Kami</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Prinsip yang menjadi fondasi setiap layanan yang kami berikan
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {values.map((value: any, index: number) => {
                const IconComponent = getIconComponent(value.icon);
                return (
                  <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      {milestones.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Perjalanan Kami</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Milestone penting dalam sejarah {companyName}
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 transform md:-translate-x-1/2" />
                {milestones.map((milestone: any, index: number) => (
                  <div 
                    key={index} 
                    className={`relative flex items-center gap-4 mb-8 ${
                      index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'} pl-12 md:pl-0`}>
                      <Card>
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="mb-2">{milestone.year}</Badge>
                          <p className="text-sm text-muted-foreground">{milestone.event}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary transform md:-translate-x-1/2 z-10" />
                    <div className="flex-1 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Info */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Hubungi Kami</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tim kami siap membantu Anda merencanakan perjalanan ibadah
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {address && (
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Alamat</h3>
                  <p className="text-sm text-muted-foreground">{address}</p>
                </CardContent>
              </Card>
            )}
            {phone && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Telepon</h3>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </CardContent>
              </Card>
            )}
            {email && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Email</h3>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Jam Operasional</h3>
                <p className="text-sm text-muted-foreground">Senin - Sabtu<br />08:00 - 17:00 WIB</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </DynamicPublicLayout>
  );
}
