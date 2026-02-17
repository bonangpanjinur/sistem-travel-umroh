import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePublicTestimonials } from '@/hooks/useTestimonials';
import { Skeleton } from '@/components/ui/skeleton';

const fallbackTestimonials = [
  { id: '1', name: 'Haji Ahmad Fauzi', location: 'Jakarta', package_name: 'Umroh Reguler 9 Hari', rating: 5, content: 'Alhamdulillah, perjalanan umroh bersama sangat nyaman. Hotel dekat Masjidil Haram, muthawif sangat baik dalam membimbing ibadah.', photo_url: null },
  { id: '2', name: 'Ibu Siti Aminah', location: 'Surabaya', package_name: 'Umroh Plus Turki 12 Hari', rating: 5, content: 'MasyaAllah, pengalaman yang luar biasa! Selain beribadah di Tanah Suci, juga bisa mengunjungi Turki.', photo_url: null },
  { id: '3', name: 'Bapak Ridwan', location: 'Bandung', package_name: 'Haji Plus ONH+ 2025', rating: 5, content: 'Sudah 2 kali berangkat bersama travel ini. Pelayanan konsisten baik, tidak pernah mengecewakan.', photo_url: null },
];

export function Testimonials() {
  const { data: dbTestimonials, isLoading } = usePublicTestimonials();
  const testimonials = dbTestimonials && dbTestimonials.length > 0 ? dbTestimonials : fallbackTestimonials;

  return (
    <section className="py-20 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Testimoni Jamaah</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Cerita Dari Jamaah Kami</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Dengarkan pengalaman jamaah yang telah menjalani perjalanan ibadah bersama kami</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {testimonial.photo_url && <AvatarImage src={testimonial.photo_url} alt={testimonial.name} />}
                      <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.location}{testimonial.package_name ? ` • ${testimonial.package_name}` : ''}</p>
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
