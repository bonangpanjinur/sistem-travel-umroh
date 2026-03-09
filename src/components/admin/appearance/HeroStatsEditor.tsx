import { useState } from 'react';
import { useHeroStats } from '@/hooks/useHeroStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { HeroStat } from '@/hooks/useHeroStats';

export function HeroStatsEditor() {
  const { data: stats, isLoading, refetch } = useHeroStats();
  const [editingStats, setEditingStats] = useState<HeroStat[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editing state when data loads
  const handleEdit = () => {
    if (stats) {
      setEditingStats([...stats]);
    }
  };

  const updateStat = (index: number, field: keyof HeroStat, value: any) => {
    const updated = [...editingStats];
    updated[index] = { ...updated[index], [field]: value };
    setEditingStats(updated);
  };

  const addStat = () => {
    const newStat: HeroStat = {
      id: `temp-${Date.now()}`,
      settings_id: 'default',
      stat_value: '',
      stat_label: '',
      display_order: editingStats.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingStats([...editingStats, newStat]);
  };

  const removeStat = (index: number) => {
    setEditingStats(editingStats.filter((_, i) => i !== index));
  };

  const saveStat = async (index: number) => {
    const stat = editingStats[index];
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hero_stats')
        .upsert({
          id: stat.id,
          settings_id: stat.settings_id,
          stat_value: stat.stat_value,
          stat_label: stat.stat_label,
          display_order: stat.display_order,
        })
        .eq('id', stat.id);

      if (error) throw error;
      toast.success('Statistik berhasil disimpan');
      refetch();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
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
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Edit Statistik Hero</CardTitle>
        <CardDescription>Ubah angka dan label statistik yang ditampilkan di hero section</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingStats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Belum ada statistik</p>
            <Button onClick={addStat} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Statistik
            </Button>
          </div>
        ) : (
          <>
            {editingStats.map((stat, index) => (
              <div key={stat.id} className="flex items-end gap-3 p-4 border rounded-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-6" />
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Nilai Statistik</Label>
                  <Input
                    value={stat.stat_value}
                    onChange={(e) => updateStat(index, 'stat_value', e.target.value)}
                    placeholder="15+"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Label Statistik</Label>
                  <Input
                    value={stat.stat_label}
                    onChange={(e) => updateStat(index, 'stat_label', e.target.value)}
                    placeholder="Tahun Pengalaman"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Urutan</Label>
                  <Input
                    type="number"
                    value={stat.display_order}
                    onChange={(e) => updateStat(index, 'display_order', parseInt(e.target.value))}
                    className="w-16"
                  />
                </div>
                <Button
                  onClick={() => saveStat(index)}
                  size="sm"
                  disabled={isSaving}
                >
                  Simpan
                </Button>
                <Button
                  onClick={() => removeStat(index)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={addStat} variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Statistik
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
