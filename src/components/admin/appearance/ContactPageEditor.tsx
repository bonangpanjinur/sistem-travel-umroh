import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContactPageContent, ContactPageContent } from '@/hooks/useContactPageContent';
import { useWebsiteSettings, useUpdateWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  RotateCcw, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Plus, 
  Trash2, 
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function ContactPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: content, isLoading: contentLoading } = useContactPageContent(SETTINGS_ID);
  const { data: settings, isLoading: settingsLoading } = useWebsiteSettings();
  const updateSettingsMutation = useUpdateWebsiteSettings();

  const [formData, setFormData] = useState<any>({
    hero_title: '',
    hero_subtitle: '',
    form_title: '',
    operating_hours: [],
    map_url: '',
  });

  const companyData: any = settings || {};

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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        settings_id: SETTINGS_ID,
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        form_title: data.form_title,
        operating_hours: data.operating_hours,
        map_url: data.map_url,
      };

      const { data: existingData, error: checkError } = await supabase
        .from('contact_page_content')
        .select('id')
        .eq('settings_id', SETTINGS_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;
      const existing = (existingData && existingData.length > 0) ? existingData[0] : null;

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
        description: 'Konten halaman kontak telah diperbarui',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Gagal',
        description: error.message || 'Terjadi kesalahan saat menyimpan konten',
        variant: 'destructive',
      });
    },
  });

  const isPending = saveMutation.isPending || updateSettingsMutation.isPending;

  const handleSave = async () => {
    saveMutation.mutate(formData);
  };

  const addOperatingHour = () => {
    const newHours = [...(formData.operating_hours || []), { label: '', value: '' }];
    setFormData({ ...formData, operating_hours: newHours });
  };

  const removeOperatingHour = (index: number) => {
    const newHours = [...formData.operating_hours];
    newHours.splice(index, 1);
    setFormData({ ...formData, operating_hours: newHours });
  };

  const updateOperatingHour = (index: number, field: string, value: string) => {
    const newHours = [...formData.operating_hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setFormData({ ...formData, operating_hours: newHours });
  };

  const extractIframeUrl = (html: string) => {
    if (!html) return '';
    if (html.startsWith('http')) return html;
    
    const match = html.match(/src="([^"]+)"/);
    return match ? match[1] : html;
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
    toast({
      description: 'Formulir telah direset ke data tersimpan',
    });
  };

  if (contentLoading || settingsLoading) {
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
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Identitas Kantor & Kontak (Master Data) */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Identitas Kantor & Kontak
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Data ini diambil dari <strong>Informasi Perusahaan</strong> dan akan ditampilkan di halaman kontak serta footer.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Alamat Kantor
                  </Label>
                  <p className="text-sm font-medium leading-relaxed">{companyData.footer_address || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> No. Telepon
                  </Label>
                  <p className="text-sm font-medium">{companyData.footer_phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <p className="text-sm font-medium">{companyData.footer_email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </Label>
                  <p className="text-sm font-medium">{companyData.footer_whatsapp || '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[11px] border border-blue-100">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <p>
                  Untuk mengubah data di atas, silakan buka tab <strong>Informasi Perusahaan</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle>Konten Halaman Kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hero_title">Judul Hero</Label>
                <Input
                  id="hero_title"
                  value={formData.hero_title}
                  onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                  placeholder="Contoh: Hubungi Kami"
                />
              </div>
              <div>
                <Label htmlFor="hero_subtitle">Sub-judul Hero</Label>
                <Textarea
                  id="hero_subtitle"
                  value={formData.hero_subtitle}
                  onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                  placeholder="Contoh: Kami siap membantu merencanakan perjalanan ibadah Anda"
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
          {/* Contact Info Cards (from Master Data - Read Only) */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Informasi Kontak
                <Badge variant="secondary" className="ml-auto">Master Data</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Informasi kontak diambil otomatis dari <strong>Informasi Perusahaan</strong>. 
                    Untuk mengubah, silakan edit di tab <strong>Informasi Perusahaan</strong>.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Alamat Kantor
                </Label>
                <Textarea
                  value={companyData.footer_address}
                  readOnly
                  disabled
                  placeholder="Tidak ada alamat"
                  rows={2}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Nomor Telepon
                </Label>
                <Input
                  value={companyData.footer_phone}
                  readOnly
                  disabled
                  placeholder="Tidak ada telepon"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  value={companyData.footer_email}
                  readOnly
                  disabled
                  placeholder="Tidak ada email"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  value={companyData.footer_whatsapp || '-'}
                  readOnly
                  disabled
                  placeholder="Tidak ada WhatsApp"
                  className="bg-muted/50"
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
