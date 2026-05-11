import { Star, Quote, Crown } from 'lucide-react';
import { useTheme } from '@/lib/themes/useTheme';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePublicTestimonials } from '@/hooks/useTestimonials';
import { Skeleton } from '@/components/ui/skeleton';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface TestimonialsProps {
  settings?: WebsiteSettings;
}

const fallbackTestimonials = [
  { id: '1', name: 'Haji Ahmad Fauzi', location: 'Jakarta', package_name: 'Umroh Reguler 9 Hari', rating: 5, content: 'Alhamdulillah, perjalanan umroh bersama sangat nyaman. Hotel dekat Masjidil Haram, muthawif sangat baik dalam membimbing ibadah.', photo_url: null },
  { id: '2', name: 'Ibu Siti Aminah', location: 'Surabaya', package_name: 'Umroh Plus Turki 12 Hari', rating: 5, content: 'MasyaAllah, pengalaman yang luar biasa! Selain beribadah di Tanah Suci, juga bisa mengunjungi Turki.', photo_url: null },
  { id: '3', name: 'Bapak Ridwan', location: 'Bandung', package_name: 'Haji Plus ONH+ 2025', rating: 5, content: 'Sudah 2 kali berangkat bersama travel ini. Pelayanan konsisten baik, tidak pernah mengecewakan.', photo_url: null },
];

export function Testimonials({ settings }: TestimonialsProps) {
  const { data: dbTestimonials, isLoading } = usePublicTestimonials();
  const testimonials = dbTestimonials && dbTestimonials.length > 0 ? dbTestimonials : fallbackTestimonials;
  const { isDark } = useTheme(settings); const isRoyal = isDark;

  return (
    <section className={`py-20 transition-colors duration-500 ${isRoyal ? 'bg-[#050505] text-white' : 'bg-primary/5'}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          {isRoyal && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase mb-4">
              <Crown className="h-3 w-3" />
              Royal Testimonials
            </div>
          )}
          <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider block`}>Testimoni Jamaah</span>
          <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>Cerita Dari Jamaah Kami</h2>
          <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>Dengarkan pengalaman jamaah yang telah menjalani perjalanan ibadah bersama kami</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className={`relative overflow-hidden transition-all duration-300 ${
                isRoyal 
                  ? 'bg-[#1a1a1a] border-amber-500/10 hover:border-amber-500/30 text-white' 
                  : 'hover:shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <Quote className={`absolute top-4 right-4 h-8 w-8 ${isRoyal ? 'text-amber-500/10' : 'text-primary/10'}`} />
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${isRoyal ? 'fill-amber-500 text-amber-500' : 'fill-accent text-accent'}`} />
                    ))}
                  </div>
                  <p className={`${isRoyal ? 'text-gray-300' : 'text-muted-foreground'} text-sm leading-relaxed mb-6 italic`}>"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar className={isRoyal ? 'border border-amber-500/20' : ''}>
                      {testimonial.photo_url && <AvatarImage src={testimonial.photo_url} alt={testimonial.name} />}
                      <AvatarFallback className={isRoyal ? 'bg-amber-500/10 text-amber-500' : ''}>{testimonial.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`font-semibold text-sm ${isRoyal ? 'text-white' : 'text-foreground'}`}>{testimonial.name}</p>
                      <p className={`text-xs ${isRoyal ? 'text-amber-500/70' : 'text-muted-foreground'}`}>{testimonial.location}{testimonial.package_name ? ` • ${testimonial.package_name}` : ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
