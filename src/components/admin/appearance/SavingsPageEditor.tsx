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
import { useSavingsPageContent, SavingsPageContent } from '@/hooks/useSavingsPageContent';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function SavingsPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: content, isLoading } = useSavingsPageContent(SETTINGS_ID);
  
  const [formData, setFormData] = useState<Partial<SavingsPageContent>>({
    hero_title: '',
    hero_subtitle: '',
    benefits: [],
    cta_title: '',
    cta_subtitle: '',
  });

  // Initialize form when content loads
  useEffect(() => {
    if (content) {
      setFormData({
        hero_title: content.hero_title || '',
        hero_subtitle: content.hero_subtitle || '',
        benefits: content.benefits || [],
        cta_title: content.cta_title || '',
        cta_subtitle: content.cta_subtitle || '',
      });
    }
  }, [content]);

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SavingsPageContent>) => {
      const payload = {
        settings_id: SETTINGS_ID,
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        benefits: data.benefits,
        cta_title: data.cta_title,
        cta_subtitle: data.cta_subtitle,
      };

      // Check if record exists in DB
      const { data: existing } = await supabase
        .from('savings_page_content')
        .select('id')
        .eq('settings_id', SETTINGS_ID)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('savings_page_content')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('savings_page_content')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-page-content'] });
      toast({
        title: 'Berhasil',
        description: 'Konten halaman tabungan berhasil disimpan',
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

  const addBenefit = () => {
    const benefits = formData.benefits || [];
    setFormData({
      ...formData,
      benefits: [...benefits, { icon: 'Calculator', title: '', description: '' }],
    });
  };

  const removeBenefit = (index: number) => {
    const benefits = formData.benefits || [];
    setFormData({
      ...formData,
      benefits: benefits.filter((_: any, i: number) => i !== index),
    });
  };

  const updateBenefit = (index: number, field: string, value: string) => {
    const benefits = [...(formData.benefits || [])];
    benefits[index] = { ...benefits[index], [field]: value };
    setFormData({ ...formData, benefits });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    if (content) {
      setFormData({
        hero_title: content.hero_title || '',
        hero_subtitle: content.hero_subtitle || '',
        benefits: content.benefits || [],
        cta_title: content.cta_title || '',
        cta_subtitle: content.cta_subtitle || '',
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
        <h2 className="text-2xl font-bold tracking-tight">Editor Halaman Tabungan</h2>
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
              placeholder="Tabungan Umroh"
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle">Subtitle Hero</Label>
            <Textarea
              id="hero_subtitle"
              value={formData.hero_subtitle || ''}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              placeholder="Wujudkan impian beribadah ke Tanah Suci..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manfaat Tabungan</CardTitle>
          <Button size="sm" onClick={addBenefit} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Manfaat
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.benefits && formData.benefits.length > 0 ? (
            formData.benefits.map((benefit: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">Manfaat {index + 1}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeBenefit(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Ikon</Label>
                  <select
                    value={benefit.icon || 'Calculator'}
                    onChange={(e) => updateBenefit(index, 'icon', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Calculator">Calculator</option>
                    <option value="TrendingUp">TrendingUp</option>
                    <option value="Shield">Shield</option>
                    <option value="CheckCircle">CheckCircle</option>
                  </select>
                </div>
                <div>
                  <Label>Judul</Label>
                  <Input
                    value={benefit.title || ''}
                    onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                    placeholder="Cicilan Fleksibel"
                  />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={benefit.description || ''}
                    onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                    placeholder="Tenor 6-36 bulan sesuai kemampuan"
                    rows={2}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada manfaat. Klik tombol di atas untuk menambah.</p>
          )}
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle>Call-to-Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cta_title">Judul CTA</Label>
            <Input
              id="cta_title"
              value={formData.cta_title || ''}
              onChange={(e) => setFormData({ ...formData, cta_title: e.target.value })}
              placeholder="Ada Pertanyaan?"
            />
          </div>
          <div>
            <Label htmlFor="cta_subtitle">Subtitle CTA</Label>
            <Textarea
              id="cta_subtitle"
              value={formData.cta_subtitle || ''}
              onChange={(e) => setFormData({ ...formData, cta_subtitle: e.target.value })}
              placeholder="Tim kami siap membantu..."
              rows={3}
            />
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
