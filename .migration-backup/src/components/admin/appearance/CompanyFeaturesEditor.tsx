import { useState, useEffect } from 'react';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompanyFeature } from '@/hooks/useCompanyFeatures';

const AVAILABLE_ICONS = ['Shield', 'Award', 'Clock', 'HeartHandshake', 'Building2', 'Headphones', 'Zap', 'Users', 'CheckCircle', 'Star'];

export function CompanyFeaturesEditor() {
  const { data: features, isLoading, refetch } = useCompanyFeatures();
  const [editingFeatures, setEditingFeatures] = useState<CompanyFeature[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editing features when data is loaded
  useEffect(() => {
    if (features) {
      setEditingFeatures([...features]);
    }
  }, [features]);

  const updateFeature = (index: number, field: keyof CompanyFeature, value: any) => {
    const updated = [...editingFeatures];
    updated[index] = { ...updated[index], [field]: value };
    setEditingFeatures(updated);
  };

  const addFeature = () => {
    const newFeature: CompanyFeature = {
      id: `temp-${Date.now()}`, 
      settings_id: '00000000-0000-0000-0000-000000000001', 
      icon_name: 'Star',
      title: '', 
      description: '', 
      display_order: editingFeatures.length + 1,
      is_active: true, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
    };
    setEditingFeatures([...editingFeatures, newFeature]);
  };

  const removeFeature = (index: number) => {
    setEditingFeatures(editingFeatures.filter((_, i) => i !== index));
  };

  const saveAllFeatures = async () => {
    setIsSaving(true);
    try {
      const featuresToSave = editingFeatures.map((feature, index) => ({
        ...(feature.id.startsWith('temp-') ? {} : { id: feature.id }),
        settings_id: '00000000-0000-0000-0000-000000000001',
        icon_name: feature.icon_name,
        title: feature.title,
        description: feature.description,
        display_order: index + 1,
        is_active: feature.is_active,
      }));

      const { error } = await (supabase as any)
        .from('company_features')
        .upsert(featuresToSave);
      
      if (error) throw error;
      
      toast.success('Semua fitur berhasil disimpan');
      refetch();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (features) {
      setEditingFeatures([...features]);
      toast.info('Data direset ke versi tersimpan');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🌟 Edit Fitur Perusahaan</CardTitle>
          <CardDescription>Kelola fitur yang ditampilkan di section "Mengapa Memilih Kami"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>🌟 Edit Fitur Perusahaan</CardTitle>
          <CardDescription>Kelola fitur yang ditampilkan di section "Mengapa Memilih Kami"</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveAllFeatures} size="sm" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingFeatures.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Belum ada fitur</p>
            <Button onClick={addFeature} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Fitur
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {editingFeatures.map((feature, index) => (
              <div key={feature.id} className="p-4 border rounded-lg bg-card space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-2 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Ikon</Label>
                          <Select 
                            value={feature.icon_name} 
                            onValueChange={(v) => updateFeature(index, 'icon_name', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ICONS.map((icon) => (
                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch 
                            checked={feature.is_active} 
                            onCheckedChange={(v) => updateFeature(index, 'is_active', v)} 
                          />
                          <Label className="text-xs cursor-pointer">Aktif</Label>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Judul Fitur</Label>
                        <Input 
                          value={feature.title} 
                          onChange={(e) => updateFeature(index, 'title', e.target.value)} 
                          placeholder="Contoh: Izin Resmi Kemenag" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Deskripsi</Label>
                        <Textarea 
                          value={feature.description} 
                          onChange={(e) => updateFeature(index, 'description', e.target.value)} 
                          placeholder="Deskripsi singkat fitur..." 
                          rows={2} 
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => removeFeature(index)} 
                    size="icon" 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button onClick={addFeature} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Fitur Baru
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
