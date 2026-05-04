import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  type: 'image' | 'video';
  category: string;
  order: number;
}

interface GallerySectionProps {
  settings?: any;
}

// Fallback gallery items
const fallbackGalleryItems: GalleryItem[] = [
  { id: '1', title: 'Jamaah di Masjidil Haram', description: 'Pengalaman spiritual yang tak terlupakan di hadapan Kaabah', image_url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070', type: 'image', category: 'umroh', order: 1 },
  { id: '2', title: 'Tawaf Berjamaah', description: 'Momen indah saat melakukan tawaf bersama-sama', image_url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=2070', type: 'image', category: 'umroh', order: 2 },
  { id: '3', title: 'Bukit Safa dan Marwa', description: "Melaksanakan sa'i di antara Bukit Safa dan Marwa", image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070', type: 'image', category: 'umroh', order: 3 },
  { id: '4', title: 'Kota Madinah', description: 'Kunjungan ke Masjid Nabawi dan kota suci Madinah', image_url: 'https://images.unsplash.com/photo-1518684029980-cf91ee70ee05?q=80&w=2070', type: 'image', category: 'umroh', order: 4 },
  { id: '5', title: 'Jamaah Haji di Arafah', description: 'Wukuf di Padang Arafah - puncak ibadah haji', image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?q=80&w=2070', type: 'image', category: 'haji', order: 5 },
  { id: '6', title: 'Penyambutan Jamaah', description: 'Momen penuh kebahagiaan saat jamaah tiba', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070', type: 'image', category: 'dokumentasi', order: 6 },
];

export function GallerySection({ settings }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: galleryItems = fallbackGalleryItems } = useQuery({
    queryKey: ['gallery-items'],
    queryFn: async (): Promise<GalleryItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('gallery_items')
          .select('*')
          .eq('is_active', true)
          .order('order', { ascending: true });
        
        if (error) {
          console.warn('Error fetching gallery:', error);
          return fallbackGalleryItems;
        }
        return data && data.length > 0 ? data : fallbackGalleryItems;
      } catch {
        return fallbackGalleryItems;
      }
    },
  });

  const categories = ['all', ...new Set(galleryItems.map(item => item.category))];
  
  const filteredItems = activeCategory === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  const currentItem = filteredItems[selectedIndex];

  const handleNext = () => setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
  const handlePrev = () => setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  const handleCategoryChange = (category: string) => { setActiveCategory(category); setSelectedIndex(0); };

  if (filteredItems.length === 0 || !currentItem) return null;

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-secondary/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Galeri Perjalanan Spiritual</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lihat pengalaman nyata dari ribuan jamaah yang telah merasakan keindahan perjalanan umroh dan haji bersama kami
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {categories.map((category) => (
            <Button key={category} variant={activeCategory === category ? 'default' : 'outline'} onClick={() => handleCategoryChange(category)} className="capitalize">
              {category === 'all' ? 'Semua' : category}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden cursor-pointer group" onClick={() => setIsLightboxOpen(true)}>
              <CardContent className="p-0 relative h-96 lg:h-full">
                {currentItem.type === 'video' ? (
                  <>
                    <img src={currentItem.image_url} alt={currentItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <Play className="h-16 w-16 text-white" />
                    </div>
                  </>
                ) : (
                  <img src={currentItem.image_url} alt={currentItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
              </CardContent>
            </Card>
            <div className="mt-4">
              <h3 className="text-2xl font-bold mb-2">{currentItem.title}</h3>
              <p className="text-muted-foreground mb-4">{currentItem.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary font-semibold capitalize">{currentItem.category}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrev} className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleNext} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold mb-4">Galeri Lainnya</h4>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredItems.map((item, index) => (
                <button key={item.id} onClick={() => setSelectedIndex(index)} className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${index === selectedIndex ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-primary/50'}`}>
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Play className="h-4 w-4 text-white" /></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLightboxOpen && currentItem && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"><X className="h-8 w-8" /></button>
            <div className="relative w-full max-w-4xl">
              {currentItem.type === 'video' ? (
                <video src={currentItem.video_url} controls autoPlay className="w-full rounded-lg" />
              ) : (
                <img src={currentItem.image_url} alt={currentItem.title} className="w-full rounded-lg" />
              )}
              <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"><ChevronRight className="h-6 w-6" /></button>
              <div className="mt-4 text-white">
                <h3 className="text-xl font-bold mb-2">{currentItem.title}</h3>
                <p className="text-gray-300">{currentItem.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
