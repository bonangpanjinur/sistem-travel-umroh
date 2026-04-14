import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save } from 'lucide-react';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

interface AboutPageContent {
  id: string;
  settings_id: string;
  mission_text: string | null;
  vision_text: string | null;
  values: any;
  milestones: any;
}

export function AboutPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<AboutPageContent>>({
    mission_text: '',
    vision_text: '',
    values: [],
    milestones: [],
  });

  // Fetch existing content
  const { data: content, isLoading } = useQuery({
    queryKey: ['about-page-content', SETTINGS_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('about_page_content')
        .select('*')
        .eq('settings_id', SETTINGS_ID)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Initialize form when content loads
  useEffect(() => {
    if (content) {
      setFormData(content);
    }
  }, [content]);

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<AboutPageContent>) => {
      const payload = {
        settings_id: SETTINGS_ID,
        mission_text: data.mission_text,
        vision_text: data.vision_text,
        values: data.values,
        milestones: data.milestones,
      };

      if (content?.id) {
        const { error } = await supabase
          .from('about_page_content')
          .update(payload)
          .eq('id', content.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('about_page_content')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['about-page-content'] });
      toast({
        title: 'Berhasil',
        description: 'Konten halaman tentang kami berhasil disimpan',
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

  const addValue = () => {
    const values = formData.values || [];
    setFormData({
      ...formData,
      values: [...values, { icon: 'Heart', title: '', description: '' }],
    });
  };

  const removeValue = (index: number) => {
    const values = formData.values || [];
    setFormData({
      ...formData,
      values: values.filter((_: any, i: number) => i !== index),
    });
  };

  const updateValue = (index: number, field: string, value: string) => {
    const values = [...(formData.values || [])];
    values[index] = { ...values[index], [field]: value };
    setFormData({ ...formData, values });
  };

  const addMilestone = () => {
    const milestones = formData.milestones || [];
    setFormData({
      ...formData,
      milestones: [...milestones, { year: '', event: '' }],
    });
  };

  const removeMilestone = (index: number) => {
    const milestones = formData.milestones || [];
    setFormData({
      ...formData,
      milestones: milestones.filter((_: any, i: number) => i !== index),
    });
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    const milestones = [...(formData.milestones || [])];
    milestones[index] = { ...milestones[index], [field]: value };
    setFormData({ ...formData, milestones });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Vision & Mission */}
      <Card>
        <CardHeader>
          <CardTitle>Visi & Misi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vision_text">Visi</Label>
            <Textarea
              id="vision_text"
              value={formData.vision_text || ''}
              onChange={(e) => setFormData({ ...formData, vision_text: e.target.value })}
              placeholder="Masukkan visi perusahaan..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="mission_text">Misi</Label>
            <Textarea
              id="mission_text"
              value={formData.mission_text || ''}
              onChange={(e) => setFormData({ ...formData, mission_text: e.target.value })}
              placeholder="Masukkan misi perusahaan..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Values Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nilai-Nilai Kami</CardTitle>
          <Button size="sm" onClick={addValue} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Nilai
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.values && formData.values.length > 0 ? (
            formData.values.map((val: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">Nilai {index + 1}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeValue(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ikon</Label>
                    <select
                      value={val.icon || 'Heart'}
                      onChange={(e) => updateValue(index, 'icon', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="Heart">Heart</option>
                      <option value="Shield">Shield</option>
                      <option value="Users">Users</option>
                      <option value="Star">Star</option>
                      <option value="Award">Award</option>
                      <option value="Target">Target</option>
                    </select>
                  </div>
                  <div>
                    <Label>Judul</Label>
                    <Input
                      value={val.title || ''}
                      onChange={(e) => updateValue(index, 'title', e.target.value)}
                      placeholder="Contoh: Amanah"
                    />
                  </div>
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={val.description || ''}
                    onChange={(e) => updateValue(index, 'description', e.target.value)}
                    placeholder="Deskripsi singkat nilai tersebut..."
                    rows={2}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada nilai. Klik tombol di atas untuk menambah.</p>
          )}
        </CardContent>
      </Card>

      {/* Milestones Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Perjalanan Kami (Milestones)</CardTitle>
          <Button size="sm" onClick={addMilestone} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Milestone
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.milestones && formData.milestones.length > 0 ? (
            formData.milestones.map((ms: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary">Milestone {index + 1}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMilestone(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <Label>Tahun</Label>
                    <Input
                      value={ms.year || ''}
                      onChange={(e) => updateMilestone(index, 'year', e.target.value)}
                      placeholder="Contoh: 2024"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Peristiwa</Label>
                    <Input
                      value={ms.event || ''}
                      onChange={(e) => updateMilestone(index, 'event', e.target.value)}
                      placeholder="Contoh: Melayani 10.000 jamaah"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada milestone. Klik tombol di atas untuk menambah.</p>
          )}
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
