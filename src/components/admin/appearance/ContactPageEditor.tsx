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
import { Plus, Trash2, Save, RotateCcw, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import { useContactPageContent, ContactPageContent } from '@/hooks/useContactPageContent';
import { useWebsiteSettings, useUpdateWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { extractIframeUrl } from '@/lib/utils';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function ContactPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: content, isLoading: contentLoading } = useContactPageContent(SETTINGS_ID);
  const { data: settings, isLoading: settingsLoading } = useWebsiteSettings();
  const updateSettingsMutation = useUpdateWebsiteSettings();
  
  const [formData, setFormData] = useState<Partial<ContactPageContent>>({
    hero_title: '',
    hero_subtitle: '',
    form_title: '',
    operating_hours: [],
    map_url: '',
  });

  const [contactData, setContactData] = useState({
    footer_address: '',
    footer_phone: '',
    footer_email: '',
    footer_whatsapp: '',
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

  // Initialize contact data when settings load
  useEffect(() => {
    if (settings) {
      setContactData({
        footer_address: settings.footer_address || '',
        footer_phone: settings.footer_phone || '',
        footer_email: settings.footer_email || '',
        footer_whatsapp: settings.footer_whatsapp || '',
      });
    }
  }, [settings]);

  // Mutation for saving page content
  const saveContentMutation = useMutation({
    mutationFn: async (data: Partial<ContactPageContent>) => {
      const payload = {
        settings_id: SETTINGS_ID,
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        form_title: data.form_title,
        operating_hours: data.operating_hours,
        map_url: extractIframeUrl(data.map_url || ''),
      };

      // Check if record exists in DB
      const { data: existingData, error: checkError } = await supabase
        .from('contact_page_content')
        .select('id')
        .eq('settings_id', SETTINGS_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;
      const existing = (existingData && existingData.length > 0) ? existingData[0] : null;

      if (existing?.id) {
        const { data: updated, error } = await supabase
          .from('contact_page_content')
          .update(payload)
          .eq('id', existing.id)
          .select();
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error(
            'Tidak memiliki izin menyimpan konten halaman kontak. Akun Anda perlu peran admin (super_admin/owner/branch_manager).'
          );
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('contact_page_content')
          .insert([payload])
          .select();
        if (error) throw error;
        if (!inserted || inserted.length === 0) {
          throw new Error(
            'Tidak memiliki izin menyimpan konten halaman kontak. Akun Anda perlu peran admin (super_admin/owner/branch_manager).'
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-page-content'] });
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

  const handleSave = async () => {
    try {
      // Save page content
      await saveContentMutation.mutateAsync(formData);
      
      // Save contact info to website_settings
      await updateSettingsMutation.mutateAsync(contactData);
      
      toast({
        title: 'Berhasil',
        description: 'Semua perubahan konten kontak berhasil disimpan',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message || 'Terjadi kesalahan saat menyimpan',
        variant: 'destructive',
      });
    }
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
    }
    if (settings) {
      setContactData({
        footer_address: settings.footer_address || '',
        footer_phone: settings.footer_phone || '',
        footer_email: settings.footer_email || '',
        footer_whatsapp: settings.footer_whatsapp || '',
      });
    }
    toast({
      description: 'Formulir telah direset ke data tersimpan',
    });
  };

  if (contentLoading || settingsLoading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  const isPending = saveContentMutation.isPending || updateSettingsMutation.isPending;

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
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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

          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle>Peta Lokasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="map_url">URL Peta (Google Maps Embed)</Label>
                <Textarea
                  id="map_url"
                  value={formData.map_url || ''}
                  onChange={(e) => setFormData({ ...formData, map_url: extractIframeUrl(e.target.value) })}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Gunakan embed URL dari Google Maps (atribut src).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Contact Info Cards (Sidebar in Frontend) */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Kontak Utama</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Alamat Kantor
                </Label>
                <Textarea
                  value={contactData.footer_address}
                  onChange={(e) => setContactData({ ...contactData, footer_address: e.target.value })}
                  placeholder="Jl. Masjid Agung No. 123..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Nomor Telepon
                </Label>
                <Input
                  value={contactData.footer_phone}
                  onChange={(e) => setContactData({ ...contactData, footer_phone: e.target.value })}
                  placeholder="+62 21 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </Label>
                <Input
                  value={contactData.footer_email}
                  onChange={(e) => setContactData({ ...contactData, footer_email: e.target.value })}
                  placeholder="info@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  WhatsApp
                </Label>
                <Input
                  value={contactData.footer_whatsapp}
                  onChange={(e) => setContactData({ ...contactData, footer_whatsapp: e.target.value })}
                  placeholder="6281234567890"
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
                Tambah
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.operating_hours && formData.operating_hours.length > 0 ? (
                formData.operating_hours.map((hour: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary">Jam {index + 1}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOperatingHour(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={hour.label || ''}
                          onChange={(e) => updateOperatingHour(index, 'label', e.target.value)}
                          placeholder="Senin - Jumat"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Jam</Label>
                        <Input
                          value={hour.value || ''}
                          onChange={(e) => updateOperatingHour(index, 'value', e.target.value)}
                          placeholder="08:00 - 17:00"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">Belum ada jam operasional.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-6 text-lg"
      >
        <Save className="h-5 w-5 mr-2" />
        {isPending ? 'Menyimpan Perubahan...' : 'Simpan Semua Perubahan'}
      </Button>
    </div>
  );
}
