import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { LayoutGrid, Save, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CustomSectionEditorProps {
  settings: WebsiteSettings;
}

interface StatItem {
  value: string;
  label: string;
}

interface CustomSections {
  showBismillah: boolean;
  showSearchWidget: boolean;
  showStats: boolean;
  stats: StatItem[];
}

const DEFAULT_STATS: StatItem[] = [
  { value: '15+', label: 'Tahun Pengalaman' },
  { value: '50K+', label: 'Jamaah Terlayani' },
  { value: '100+', label: 'Keberangkatan/Tahun' },
  { value: '4.9', label: 'Rating Kepuasan' },
];

function parseCustomSections(settings: WebsiteSettings): CustomSections {
  const raw = (settings as any).custom_sections;
  if (raw && typeof raw === 'object') {
    return {
      showBismillah: raw.showBismillah ?? true,
      showSearchWidget: raw.showSearchWidget ?? true,
      showStats: raw.showStats ?? true,
      stats: Array.isArray(raw.stats) ? raw.stats : DEFAULT_STATS,
    };
  }
  return {
    showBismillah: true,
    showSearchWidget: true,
    showStats: true,
    stats: DEFAULT_STATS,
  };
}

export function CustomSectionEditor({ settings }: CustomSectionEditorProps) {
  const updateSettings = useUpdateWebsiteSettings();

  const parsed = parseCustomSections(settings);
  const [stats, setStats] = useState<StatItem[]>(parsed.stats);
  const [showBismillah, setShowBismillah] = useState(parsed.showBismillah);
  const [showSearchWidget, setShowSearchWidget] = useState(parsed.showSearchWidget);
  const [showStats, setShowStats] = useState(parsed.showStats);

  useEffect(() => {
    const p = parseCustomSections(settings);
    setStats(p.stats);
    setShowBismillah(p.showBismillah);
    setShowSearchWidget(p.showSearchWidget);
    setShowStats(p.showStats);
  }, [settings]);

  const handleSave = () => {
    const customSections = { showBismillah, showSearchWidget, showStats, stats };
    updateSettings.mutate({ custom_sections: customSections } as any);
  };

  const updateStat = (index: number, field: keyof StatItem, value: string) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setStats(newStats);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              <div>
                <CardTitle>Pengaturan Section Custom</CardTitle>
                <CardDescription>
                  Kustomisasi konten dan elemen di berbagai section
                </CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hero Section Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🖼️ Opsi Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Tampilkan Bismillah</Label>
                <p className="text-xs text-muted-foreground">
                  Tulisan Arab di atas judul hero
                </p>
              </div>
              <Switch checked={showBismillah} onCheckedChange={setShowBismillah} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Tampilkan Search Widget</Label>
                <p className="text-xs text-muted-foreground">
                  Form pencarian paket di hero
                </p>
              </div>
              <Switch checked={showSearchWidget} onCheckedChange={setShowSearchWidget} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Tampilkan Statistik</Label>
                <p className="text-xs text-muted-foreground">
                  Angka statistik di bawah hero
                </p>
              </div>
              <Switch checked={showStats} onCheckedChange={setShowStats} />
            </div>
          </CardContent>
        </Card>

        {/* Statistics Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Edit Statistik</CardTitle>
            <CardDescription>
              Ubah angka dan label statistik yang ditampilkan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={stat.value}
                  onChange={(e) => updateStat(index, 'value', e.target.value)}
                  className="w-20"
                  placeholder="15+"
                />
                <Input
                  value={stat.label}
                  onChange={(e) => updateStat(index, 'label', e.target.value)}
                  className="flex-1"
                  placeholder="Tahun Pengalaman"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
