import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContactPageContent } from '@/hooks/useContactPageContent';
import { useWebsiteSettings, useUpdateWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Info,
  Clock,
  Layout,
  Map as MapIcon,
  MessageSquare
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
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Memuat konfigurasi editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header with Sticky Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 py-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Editor Halaman Kontak</h2>
          <p className="text-muted-foreground mt-1">Kelola konten, jam operasional, dan lokasi peta halaman kontak Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} className="shadow-sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending}
            className="shadow-md px-6"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: Company Info (Master Data) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <div className="h-2 bg-primary/20" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Identitas & Kontak
                </CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Master Data</Badge>
              </div>
              <CardDescription>Informasi ini disinkronkan dari pengaturan perusahaan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-muted rounded-md shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Alamat Kantor</Label>
                    <p className="text-sm font-medium leading-relaxed">{companyData.footer_address || '-'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-muted rounded-md shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">No. Telepon</Label>
                    <p className="text-sm font-medium">{companyData.footer_phone || '-'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-muted rounded-md shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Email Resmi</Label>
                    <p className="text-sm font-medium break-all">{companyData.footer_email || '-'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-muted rounded-md shrink-0">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                    <p className="text-sm font-medium">{companyData.footer_whatsapp || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-700 leading-normal">
                  Data di atas bersifat <strong>Read-Only</strong>. Untuk mengubahnya, silakan buka tab <span className="font-semibold underline">Informasi Perusahaan</span>.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Visual Hint */}
          <div className="p-6 border border-dashed rounded-xl flex flex-col items-center text-center space-y-3 bg-muted/20">
            <div className="p-3 bg-background rounded-full shadow-sm">
              <Layout className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Pratinjau Langsung</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Gunakan tombol "Tampilkan Preview" di atas untuk melihat perubahan secara real-time.</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 p-1 h-12">
              <TabsTrigger value="content" className="gap-2 h-full">
                <Layout className="h-4 w-4" />
                <span>Konten Hero</span>
              </TabsTrigger>
              <TabsTrigger value="hours" className="gap-2 h-full">
                <Clock className="h-4 w-4" />
                <span>Jam Kerja</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2 h-full">
                <MapIcon className="h-4 w-4" />
                <span>Lokasi Peta</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6 animate-in fade-in-50 duration-300">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layout className="h-5 w-5 text-primary" />
                    Header & Hero
                  </CardTitle>
                  <CardDescription>Tentukan judul dan deskripsi utama yang akan muncul di bagian atas halaman kontak.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Judul Utama (Hero Title)</Label>
                    <Input
                      id="hero_title"
                      value={formData.hero_title}
                      onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                      placeholder="Contoh: Hubungi Tim Kami"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_subtitle">Sub-judul / Deskripsi</Label>
                    <Textarea
                      id="hero_subtitle"
                      value={formData.hero_subtitle}
                      onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                      placeholder="Contoh: Kami siap membantu merencanakan perjalanan ibadah Anda dengan sepenuh hati."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Bagian Formulir
                  </CardTitle>
                  <CardDescription>Ubah teks judul pada bagian formulir kontak.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="form_title">Judul Formulir</Label>
                    <Input
                      id="form_title"
                      value={formData.form_title || ''}
                      onChange={(e) => setFormData({ ...formData, form_title: e.target.value })}
                      placeholder="Contoh: Kirim Pesan Sekarang"
                      className="h-11"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hours" className="space-y-6 animate-in fade-in-50 duration-300">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Jam Operasional
                    </CardTitle>
                    <CardDescription>Tambahkan jadwal operasional kantor Anda.</CardDescription>
                  </div>
                  <Button size="sm" onClick={addOperatingHour} variant="outline" className="h-9 border-primary/20 text-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Jadwal
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.operating_hours && formData.operating_hours.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {formData.operating_hours.map((hour: any, index: number) => (
                        <div key={index} className="group relative border rounded-xl p-5 bg-muted/10 hover:bg-muted/20 hover:border-primary/20 transition-all duration-200">
                          <div className="flex justify-between items-center mb-4">
                            <Badge variant="secondary" className="bg-background shadow-sm px-3">Sesi {index + 1}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeOperatingHour(index)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hari / Label</Label>
                              <Input
                                value={hour.label || ''}
                                onChange={(e) => updateOperatingHour(index, 'label', e.target.value)}
                                placeholder="Misal: Senin - Jumat"
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu Operasional</Label>
                              <Input
                                value={hour.value || ''}
                                onChange={(e) => updateOperatingHour(index, 'value', e.target.value)}
                                placeholder="Misal: 08:00 - 17:00"
                                className="bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                      <div className="p-4 bg-background rounded-full mb-4">
                        <Clock className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Belum ada jam operasional yang ditambahkan.</p>
                      <Button variant="link" onClick={addOperatingHour} className="mt-1">Klik untuk menambah jadwal</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="space-y-6 animate-in fade-in-50 duration-300">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-primary" />
                    Peta Lokasi (Google Maps)
                  </CardTitle>
                  <CardDescription>Integrasikan peta lokasi kantor Anda menggunakan Google Maps Embed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="map_url">URL Embed / Kode Iframe</Label>
                    <Textarea
                      id="map_url"
                      value={formData.map_url || ''}
                      onChange={(e) => setFormData({ ...formData, map_url: extractIframeUrl(e.target.value) })}
                      placeholder="Tempel kode iframe atau URL src di sini..."
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <p>Tips: Masuk ke Google Maps, klik "Bagikan", pilih "Sematkan peta", lalu salin kode yang diberikan.</p>
                    </div>
                  </div>

                  {formData.map_url && (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pratinjau Peta</Label>
                      <div className="aspect-video rounded-xl overflow-hidden border shadow-inner bg-muted">
                        <iframe
                          src={formData.map_url}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
