import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { LayoutGrid, Save, GripVertical, Monitor, PanelTop } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomSectionEditorProps {
  settings: WebsiteSettings;
}

interface StatItem {
  value: string;
  label: string;
}

type HeaderDisplayMode = 'logo_only' | 'logo_name_tagline' | 'name_tagline_only';
type FooterLayout = 'full' | 'simple' | 'minimal';

interface CustomSections {
  showBismillah: boolean;
  showSearchWidget: boolean;
  showStats: boolean;
  stats: StatItem[];
  headerDisplayMode: HeaderDisplayMode;
  footerLayout: FooterLayout;
  footerShowSocial: boolean;
  footerShowContact: boolean;
  footerShowLinks: boolean;
  footerCopyrightText: string;
}

const DEFAULT_STATS: StatItem[] = [
  { value: '15+', label: 'Tahun Pengalaman' },
  { value: '50K+', label: 'Jamaah Terlayani' },
  { value: '100+', label: 'Keberangkatan/Tahun' },
  { value: '4.9', label: 'Rating Kepuasan' },
];

function parseCustomSections(settings: WebsiteSettings): CustomSections {
  const raw = settings.custom_sections as any;
  if (raw && typeof raw === 'object') {
    return {
      showBismillah: raw.showBismillah ?? true,
      showSearchWidget: raw.showSearchWidget ?? true,
      showStats: raw.showStats ?? true,
      stats: Array.isArray(raw.stats) ? raw.stats : DEFAULT_STATS,
      headerDisplayMode: raw.headerDisplayMode || 'logo_name_tagline',
      footerLayout: raw.footerLayout || 'full',
      footerShowSocial: raw.footerShowSocial ?? true,
      footerShowContact: raw.footerShowContact ?? true,
      footerShowLinks: raw.footerShowLinks ?? true,
      footerCopyrightText: raw.footerCopyrightText || '',
    };
  }
  return {
    showBismillah: true,
    showSearchWidget: true,
    showStats: true,
    stats: DEFAULT_STATS,
    headerDisplayMode: 'logo_name_tagline',
    footerLayout: 'full',
    footerShowSocial: true,
    footerShowContact: true,
    footerShowLinks: true,
    footerCopyrightText: '',
  };
}

export function CustomSectionEditor({ settings }: CustomSectionEditorProps) {
  const updateSettings = useUpdateWebsiteSettings();

  const parsed = parseCustomSections(settings);
  const [stats, setStats] = useState<StatItem[]>(parsed.stats);
  const [showBismillah, setShowBismillah] = useState(parsed.showBismillah);
  const [showSearchWidget, setShowSearchWidget] = useState(parsed.showSearchWidget);
  const [showStats, setShowStats] = useState(parsed.showStats);
  const [headerDisplayMode, setHeaderDisplayMode] = useState<HeaderDisplayMode>(parsed.headerDisplayMode);
  const [footerLayout, setFooterLayout] = useState<FooterLayout>(parsed.footerLayout);
  const [footerShowSocial, setFooterShowSocial] = useState(parsed.footerShowSocial);
  const [footerShowContact, setFooterShowContact] = useState(parsed.footerShowContact);
  const [footerShowLinks, setFooterShowLinks] = useState(parsed.footerShowLinks);
  const [footerCopyrightText, setFooterCopyrightText] = useState(parsed.footerCopyrightText);

  useEffect(() => {
    const p = parseCustomSections(settings);
    setStats(p.stats);
    setShowBismillah(p.showBismillah);
    setShowSearchWidget(p.showSearchWidget);
    setShowStats(p.showStats);
    setHeaderDisplayMode(p.headerDisplayMode);
    setFooterLayout(p.footerLayout);
    setFooterShowSocial(p.footerShowSocial);
    setFooterShowContact(p.footerShowContact);
    setFooterShowLinks(p.footerShowLinks);
    setFooterCopyrightText(p.footerCopyrightText);
  }, [settings]);

  const handleSave = () => {
    const customSections: CustomSections = {
      showBismillah, showSearchWidget, showStats, stats,
      headerDisplayMode, footerLayout,
      footerShowSocial, footerShowContact, footerShowLinks,
      footerCopyrightText,
    };
    updateSettings.mutate({ custom_sections: customSections as any });
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
                  Kustomisasi header, footer, dan elemen di berbagai section
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

      <Tabs defaultValue="header" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="header" className="gap-2">
            <Monitor className="h-4 w-4" />
            Header
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2">
            <PanelTop className="h-4 w-4" />
            Hero Section
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Footer
          </TabsTrigger>
        </TabsList>

        {/* Header Settings */}
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🖥️ Pengaturan Header</CardTitle>
              <CardDescription>Atur tampilan header/navbar di website publik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode Tampilan Header</Label>
                <Select value={headerDisplayMode} onValueChange={(v) => setHeaderDisplayMode(v as HeaderDisplayMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo_only">Logo Saja</SelectItem>
                    <SelectItem value="logo_name_tagline">Logo + Nama Travel + Tagline</SelectItem>
                    <SelectItem value="name_tagline_only">Nama Travel + Tagline Saja</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pilih elemen apa yang ditampilkan di header website
                </p>
              </div>

              {/* Preview */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Preview Header:</p>
                <div className="flex items-center gap-3 bg-background rounded-md px-4 py-3 border">
                  {headerDisplayMode !== 'name_tagline_only' && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                      <span className="font-bold text-lg">ع</span>
                    </div>
                  )}
                  {headerDisplayMode !== 'logo_only' && (
                    <div>
                      <p className="text-sm font-bold">{settings.company_name || 'UmrohTravel'}</p>
                      <p className="text-xs text-muted-foreground">{settings.tagline || 'Perjalanan Suci Anda'}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section Settings */}
        <TabsContent value="hero">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🖼️ Opsi Hero Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Bismillah</Label>
                    <p className="text-xs text-muted-foreground">Tulisan Arab di atas judul hero</p>
                  </div>
                  <Switch checked={showBismillah} onCheckedChange={setShowBismillah} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Search Widget</Label>
                    <p className="text-xs text-muted-foreground">Form pencarian paket di hero</p>
                  </div>
                  <Switch checked={showSearchWidget} onCheckedChange={setShowSearchWidget} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Statistik</Label>
                    <p className="text-xs text-muted-foreground">Angka statistik di bawah hero</p>
                  </div>
                  <Switch checked={showStats} onCheckedChange={setShowStats} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">📊 Edit Statistik</CardTitle>
                <CardDescription>Ubah angka dan label statistik yang ditampilkan</CardDescription>
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
        </TabsContent>

        {/* Footer Settings */}
        <TabsContent value="footer">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📐 Layout Footer</CardTitle>
                <CardDescription>Pilih tata letak footer website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tipe Layout</Label>
                  <Select value={footerLayout} onValueChange={(v) => setFooterLayout(v as FooterLayout)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (Logo, Link, Kontak, Sosmed)</SelectItem>
                      <SelectItem value="simple">Simple (Logo + Kontak + Sosmed)</SelectItem>
                      <SelectItem value="minimal">Minimal (Copyright saja)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Teks Copyright Kustom</Label>
                  <Textarea
                    value={footerCopyrightText}
                    onChange={(e) => setFooterCopyrightText(e.target.value)}
                    placeholder="Contoh: Izin Resmi Kemenag RI No. 123"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Kosongkan untuk menggunakan teks default</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">👁️ Visibilitas Elemen Footer</CardTitle>
                <CardDescription>Pilih elemen apa yang ditampilkan di footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Link Navigasi</Label>
                    <p className="text-xs text-muted-foreground">Kolom Layanan, Informasi, Panduan</p>
                  </div>
                  <Switch checked={footerShowLinks} onCheckedChange={setFooterShowLinks} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Info Kontak</Label>
                    <p className="text-xs text-muted-foreground">Telepon, email, alamat</p>
                  </div>
                  <Switch checked={footerShowContact} onCheckedChange={setFooterShowContact} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tampilkan Media Sosial</Label>
                    <p className="text-xs text-muted-foreground">Icon Facebook, Instagram, dll</p>
                  </div>
                  <Switch checked={footerShowSocial} onCheckedChange={setFooterShowSocial} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
