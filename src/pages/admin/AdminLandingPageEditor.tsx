import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLandingPage, useUpdateLandingPage } from "@/hooks/useLandingPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/LoadingState";
import { ArrowLeft, Save, Plus, Trash2, MoveUp, MoveDown, Layout, Settings, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LPSection, SectionType } from "@/types/landing-page";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lp, isLoading } = useLandingPage(id || "", false);
  const updateMutation = useUpdateLandingPage();
  
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (lp) {
      setFormData(lp);
    }
  }, [lp]);

  if (isLoading || !formData) return <LoadingState />;

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const addSection = (type: SectionType) => {
    const newSection: LPSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      order: formData.sections.length,
      data: getDefaultData(type)
    };
    setFormData({
      ...formData,
      sections: [...formData.sections, newSection]
    });
  };

  const getDefaultData = (type: SectionType) => {
    switch(type) {
      case 'hero': return { title: 'Judul Hero', subtitle: 'Subjudul Hero', imageUrl: '', ctaText: 'Daftar Sekarang' };
      case 'timer': return { title: 'Promo Berakhir Dalam:', endDate: new Date(Date.now() + 86400000 * 7).toISOString() };
      case 'features': return { title: 'Keunggulan Kami', subtitle: 'Kenapa harus memilih kami?', features: [{ id: '1', text: 'Fitur 1', description: 'Deskripsi fitur 1' }] };
      case 'faq': return { title: 'FAQ', faqs: [{ id: '1', question: 'Pertanyaan 1', answer: 'Jawaban 1' }] };
      case 'testimonials': return { title: 'Testimoni', testimonials: [{ id: '1', name: 'Nama', role: 'Jamaah', content: 'Sangat puas!', rating: 5 }] };
      case 'comparison': return { title: 'Perbandingan', subtitle: 'Kami vs Kompetitor', features: [{ id: '1', name: 'Layanan 1', ourValue: true, otherValue: false }] };
      case 'pricing': return { title: 'Paket Harga', subtitle: 'Pilih paket Anda', plans: [{ id: '1', name: 'Paket Hemat', price: '25', features: ['Fitur A', 'Fitur B'], isPopular: true, ctaText: 'Pilih Paket' }] };
      case 'cta': return { text: 'Daftar Sekarang!', subtext: 'Hubungi kami via WhatsApp' };
      default: return {};
    }
  };

  const removeSection = (sectionId: string) => {
    setFormData({
      ...formData,
      sections: formData.sections.filter((s: any) => s.id !== sectionId)
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order property
    newSections.forEach((s, i) => s.order = i);
    
    setFormData({ ...formData, sections: newSections });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/landing-pages')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{formData.title}</h1>
              <p className="text-sm text-gray-500">/lp/{formData.slug}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <a href={`/lp/${formData.slug}`} target="_blank" rel="noreferrer">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </a>
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="content" className="space-y-8">
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Konten & Section
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pengaturan Halaman
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tambah Section</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2">
                    {(['hero', 'timer', 'features', 'comparison', 'faq', 'testimonials', 'pricing', 'cta'] as SectionType[]).map((type) => (
                      <Button 
                        key={type} 
                        variant="outline" 
                        className="justify-start capitalize"
                        onClick={() => addSection(type)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {type}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3 space-y-4">
                {!formData.sections || formData.sections.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                    <Layout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Belum ada section</h3>
                    <p className="text-gray-500 mb-6">Mulai bangun landing page Anda dengan menambahkan section dari menu di samping.</p>
                  </div>
                ) : (
                  [...(formData.sections || [])].sort((a: any, b: any) => a.order - b.order).map((section: any, index: number) => (
                    <Card key={section.id} className="overflow-hidden border-l-4 border-l-green-500">
                      <CardHeader className="bg-gray-50 py-3 px-6 flex flex-row justify-between items-center space-y-0">
                        <div className="flex items-center gap-3">
                          <Badge className="capitalize">{section.type}</Badge>
                          <span className="text-sm font-medium text-gray-500">Section #{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                            <MoveUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => moveSection(index, 'down')} disabled={index === formData.sections.length - 1}>
                            <MoveDown className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeSection(section.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <p className="text-sm text-gray-500 italic">Editor konten untuk tipe {section.type} akan tampil di sini. (Gunakan JSON editor atau form dinamis)</p>
                        <textarea 
                          className="w-full mt-4 p-3 border border-gray-200 rounded-md font-mono text-xs h-32"
                          value={JSON.stringify(section.data, null, 2)}
                          onChange={(e) => {
                            try {
                              const newData = JSON.parse(e.target.value);
                              const newSections = [...formData.sections];
                              newSections[index].data = newData;
                              setFormData({ ...formData, sections: newSections });
                            } catch (err) {
                              // Silently wait for valid JSON
                            }
                          }}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Judul Halaman</Label>
                    <Input 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug URL</Label>
                    <Input 
                      value={formData.slug} 
                      onChange={(e) => setFormData({...formData, slug: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-bold text-gray-900">Publikasikan Halaman</h4>
                    <p className="text-sm text-gray-500">Jika aktif, halaman dapat diakses oleh publik melalui URL.</p>
                  </div>
                  <Switch 
                    checked={formData.is_published} 
                    onCheckedChange={(checked) => setFormData({...formData, is_published: checked})} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Konfigurasi WhatsApp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Sumber Nomor WhatsApp</Label>
                  <Select 
                    value={formData.whatsapp_source_type} 
                    onValueChange={(val) => setFormData({...formData, whatsapp_source_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sumber" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Nomor Global (Pusat)</SelectItem>
                      <SelectItem value="agent">Nomor Agen (Dinamis)</SelectItem>
                      <SelectItem value="custom">Nomor Kustom (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.whatsapp_source_type === 'custom' && (
                  <div className="space-y-2">
                    <Label>Nomor WhatsApp Kustom (Gunakan format 62...)</Label>
                    <Input 
                      placeholder="628123456789" 
                      value={formData.whatsapp_custom_number || ''} 
                      onChange={(e) => setFormData({...formData, whatsapp_custom_number: e.target.value})} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO & Media Sosial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input 
                    value={formData.meta_title || ''} 
                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input 
                    value={formData.meta_description || ''} 
                    onChange={(e) => setFormData({...formData, meta_description: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL (Gambar Share)</Label>
                  <Input 
                    value={formData.og_image_url || ''} 
                    onChange={(e) => setFormData({...formData, og_image_url: e.target.value})} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
