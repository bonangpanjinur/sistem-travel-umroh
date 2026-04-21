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
import { SectionEditor } from "@/components/admin/landing-page/SectionEditor";
import { SectionSelectorCard } from "@/components/admin/landing-page/SectionSelector";

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
    toast.success(`${type} section added`);
  };

  const getDefaultData = (type: SectionType) => {
    switch(type) {
      case 'hero': return { 
        title: 'Judul Hero', 
        subtitle: 'Subjudul Hero', 
        imageUrl: '', 
        ctaText: 'Daftar Sekarang',
        bgColor: '#ffffff'
      };
      case 'timer': return { 
        title: 'Promo Berakhir Dalam:', 
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        textColor: '#000000'
      };
      case 'features': return { 
        title: 'Keunggulan Kami', 
        subtitle: 'Kenapa harus memilih kami?', 
        features: [{ id: '1', text: 'Fitur 1', description: 'Deskripsi fitur 1', icon: '✨' }] 
      };
      case 'faq': return { 
        title: 'FAQ', 
        faqs: [{ id: '1', question: 'Pertanyaan 1', answer: 'Jawaban 1' }] 
      };
      case 'testimonials': return { 
        title: 'Testimoni', 
        testimonials: [{ id: '1', name: 'Nama', role: 'Jamaah', content: 'Sangat puas!', rating: 5, image: '' }] 
      };
      case 'comparison': return { 
        title: 'Perbandingan', 
        subtitle: 'Kami vs Kompetitor', 
        features: [{ id: '1', name: 'Layanan 1', ourValue: true, otherValue: false }] 
      };
      case 'pricing': return { 
        title: 'Paket Harga', 
        subtitle: 'Pilih paket Anda', 
        plans: [{ id: '1', name: 'Paket Hemat', price: '25', features: ['Fitur A', 'Fitur B'], isPopular: true, ctaText: 'Pilih Paket' }] 
      };
      case 'cta': return { 
        text: 'Daftar Sekarang!', 
        subtext: 'Hubungi kami via WhatsApp',
        bgColor: '#000000',
        textColor: '#ffffff'
      };
      default: return {};
    }
  };

  const removeSection = (sectionId: string) => {
    setFormData({
      ...formData,
      sections: formData.sections.filter((s: any) => s.id !== sectionId)
    });
    toast.success('Section removed');
  };

  const updateSection = (updatedSection: LPSection) => {
    setFormData({
      ...formData,
      sections: formData.sections.map((s: any) => s.id === updatedSection.id ? updatedSection : s)
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
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/landing-pages')} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{formData.title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">/lp/{formData.slug}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <a href={`/lp/${formData.slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-center">
                <Eye className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">Preview</span>
              </a>
            </Button>
            <Button className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              <span>{updateMutation.isPending ? '...' : 'Simpan'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <Tabs defaultValue="content" className="space-y-8">
          <TabsList className="bg-card border border-border p-1 w-full sm:w-auto">
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
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <SectionSelectorCard 
                    onSelect={addSection}
                    selectedSections={formData.sections.map((s: any) => s.type)}
                  />
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                {!formData.sections || formData.sections.length === 0 ? (
                  <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
                    <Layout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Belum ada section</h3>
                    <p className="text-muted-foreground mb-6">Mulai bangun landing page Anda dengan menambahkan section dari menu di samping.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...(formData.sections || [])].sort((a: any, b: any) => a.order - b.order).map((section: any, index: number) => (
                      <div key={section.id} className="space-y-2">
                        <div className="flex items-center justify-between px-2 py-2 bg-secondary/20 rounded border border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Section #{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => moveSection(index, 'up')} 
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                            >
                              <MoveUp className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => moveSection(index, 'down')} 
                              disabled={index === formData.sections.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              <MoveDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <SectionEditor
                          section={section}
                          onUpdate={updateSection}
                          onDelete={() => removeSection(section.id)}
                        />
                      </div>
                    ))}
                  </div>
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

                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
                  <div>
                    <h4 className="font-bold text-foreground">Publikasikan Halaman</h4>
                    <p className="text-sm text-muted-foreground">Jika aktif, halaman dapat diakses oleh publik melalui URL.</p>
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
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="agent">Agent Tertentu</SelectItem>
                      <SelectItem value="custom">Nomor Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.whatsapp_source_type === 'custom' && (
                  <div className="space-y-2">
                    <Label>Nomor WhatsApp Custom</Label>
                    <Input 
                      value={formData.whatsapp_custom_number || ''} 
                      onChange={(e) => setFormData({...formData, whatsapp_custom_number: e.target.value})}
                      placeholder="+62812345678"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO & Open Graph</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input 
                    value={formData.meta_title || ''} 
                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                    placeholder="Judul untuk search engine"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input 
                    value={formData.meta_description || ''} 
                    onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                    placeholder="Deskripsi untuk search engine"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL</Label>
                  <Input 
                    value={formData.og_image_url || ''} 
                    onChange={(e) => setFormData({...formData, og_image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    type="url"
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
