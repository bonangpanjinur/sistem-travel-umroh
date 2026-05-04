import { useState, useEffect } from 'react';
import { useHeroStats } from '@/hooks/useHeroStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { GripVertical, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HeroStat } from '@/hooks/useHeroStats';

export function HeroStatsEditor() {
  const { data: stats, isLoading, refetch } = useHeroStats();
  const [editingStats, setEditingStats] = useState<HeroStat[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editing stats when data is loaded
  useEffect(() => {
    if (stats) {
      setEditingStats([...stats]);
    }
  }, [stats]);

  const updateStat = (index: number, field: keyof HeroStat, value: any) => {
    const updated = [...editingStats];
    updated[index] = { ...updated[index], [field]: value };
    setEditingStats(updated);
  };

  const addStat = () => {
    setEditingStats([...editingStats, {
      id: `temp-${Date.now()}`, 
      settings_id: '00000000-0000-0000-0000-000000000001', 
      stat_value: '', 
      stat_label: '',
      display_order: editingStats.length + 1, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
    }]);
  };

  const removeStat = (index: number) => {
    setEditingStats(editingStats.filter((_, i) => i !== index));
  };

  const saveAllStats = async () => {
    setIsSaving(true);
    try {
      // Delete existing stats for this settings_id to sync properly
      // Or use upsert for each. Given the structure, upsert is safer.
      const statsToSave = editingStats.map((stat, index) => ({
        // If it's a temp ID, don't send it so Supabase generates one, 
        // or just let upsert handle it if we want to keep it.
        // Better to remove 'id' for new ones.
        ...(stat.id.startsWith('temp-') ? {} : { id: stat.id }),
        settings_id: '00000000-0000-0000-0000-000000000001',
        stat_value: stat.stat_value,
        stat_label: stat.stat_label,
        display_order: index + 1,
      }));

      const { error } = await (supabase as any)
        .from('hero_stats')
        .upsert(statsToSave);
      
      if (error) throw error;
      
      toast.success('Semua statistik berhasil disimpan');
      refetch();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (stats) {
      setEditingStats([...stats]);
      toast.info('Data direset ke versi tersimpan');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Edit Statistik Hero</CardTitle>
          <CardDescription>Ubah angka dan label statistik yang ditampilkan di hero section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>📊 Edit Statistik Hero</CardTitle>
          <CardDescription>Ubah angka dan label statistik yang ditampilkan di hero section</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveAllStats} size="sm" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingStats.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Belum ada statistik</p>
            <Button onClick={addStat} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Statistik
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {editingStats.map((stat, index) => (
              <div key={stat.id} className="flex items-end gap-3 p-4 border rounded-lg bg-card">
                <GripVertical className="h-4 w-4 text-muted-foreground mb-3 cursor-grab" />
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Nilai</Label>
                  <Input 
                    value={stat.stat_value} 
                    onChange={(e) => updateStat(index, 'stat_value', e.target.value)} 
                    placeholder="Contoh: 15+" 
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label className="text-xs">Label</Label>
                  <Input 
                    value={stat.stat_label} 
                    onChange={(e) => updateStat(index, 'stat_label', e.target.value)} 
                    placeholder="Contoh: Tahun Pengalaman" 
                  />
                </div>
                <Button 
                  onClick={() => removeStat(index)} 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={addStat} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Statistik Baru
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
