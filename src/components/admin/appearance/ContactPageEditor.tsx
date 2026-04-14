import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useContactPageContent, ContactPageContent } from '@/hooks/useContactPageContent';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function ContactPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: content, isLoading } = useContactPageContent(SETTINGS_ID);
  
  const [formData, setFormData] = useState<Partial<ContactPageContent>>({
    hero_title: '',
    hero_subtitle: '',
    form_title: '',
    operating_hours: [],
    map_url: '',
  });

  // Initialize form when content loads
  useEffect(() => {
    if (content) {
      setFormData({
        hero_title: content.hero_title || '',
        hero_subtitle: content.hero_subtitle || '',
        form_title: content.form_title || '',
        operating_hours: content.operating_hours || [],
        map_url: content.map_url || '',
      });
    }
  }, [content]);

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ContactPageContent>) => {
      const payload = {
        settings_id: SETTINGS_ID,
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        form_title: data.form_title,
        operating_hours: data.operating_hours,
        map_url: data.map_url,
      };

      // Check if record exists in DB
      const { data: existing } = await supabase
        .from('contact_page_content')
        .select('id')
        .eq('settings_id', SETTINGS_ID)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('contact_page_content')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_page_content')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-page-content'] });
      toast({
        title: 'Berhasil',
        description: 'Konten halaman kontak berhasil disimpan',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Gagal',
        description: error.message || 'Terjadi kesalahan saat menyimpan',
        variant: 'destructive',
      });
    },
  });

  const addOperatingHour = () => {
    const hours = formData.operating_hours || [];
    setFormData({
      ...formData,
      operating_hours: [...hours, { label: '', value: '' }],
    });
  };

  const removeOperatingHour = (index: number) => {
    const hours = formData.operating_hours || [];
    setFormData({
      ...formData,
      operating_hours: hours.filter((_: any, i: number) => i !== index),
    });
  };

  const updateOperatingHour = (index: number, field: string, value: string) => {
    const hours = [...(formData.operating_hours || [])];
    hours[index] = { ...hours[index], [field]: value };
    setFormData({ ...formData, operating_hours: hours });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    if (content) {
      setFormData({
        hero_title: content.hero_title || '',
        hero_subtitle: content.hero_subtitle || '',
        form_title: content.form_title || '',
        operating_hours: content.operating_hours || [],
        map_url: content.map_url || '',
      });
      toast({
        description: 'Formulir telah direset ke data tersimpan',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Editor Halaman Kontak</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bagian Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero_title">Judul Hero</Label>
            <Input
              id="hero_title"
              value={formData.hero_title || ''}
              onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
              placeholder="Ada Pertanyaan?"
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle">Subtitle Hero</Label>
            <Textarea
              id="hero_subtitle"
              value={formData.hero_subtitle || ''}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              placeholder="Tim kami siap membantu merencanakan perjalanan ibadah Anda..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bagian Formulir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="form_title">Judul Form</Label>
            <Input
              id="form_title"
              value={formData.form_title || ''}
              onChange={(e) => setFormData({ ...formData, form_title: e.target.value })}
              placeholder="Kirim Pesan"
            />
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Jam Operasional</CardTitle>
          <Button size="sm" onClick={addOperatingHour} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Jam
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.operating_hours && formData.operating_hours.length > 0 ? (
            formData.operating_hours.map((hour: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">Jam {index + 1}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOperatingHour(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={hour.label || ''}
                      onChange={(e) => updateOperatingHour(index, 'label', e.target.value)}
                      placeholder="Senin - Jumat"
                    />
                  </div>
                  <div>
                    <Label>Jam</Label>
                    <Input
                      value={hour.value || ''}
                      onChange={(e) => updateOperatingHour(index, 'value', e.target.value)}
                      placeholder="08:00 - 17:00"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada jam operasional. Klik tombol di atas untuk menambah.</p>
          )}
        </CardContent>
      </Card>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle>Peta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="map_url">URL Peta (Google Maps Embed)</Label>
            <Textarea
              id="map_url"
              value={formData.map_url || ''}
              onChange={(e) => setFormData({ ...formData, map_url: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
              rows={3}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Gunakan embed URL dari Google Maps. Biarkan kosong untuk menampilkan placeholder.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
      </Button>
    </div>
  );
}
