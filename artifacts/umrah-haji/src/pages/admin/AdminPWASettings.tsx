import { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Smartphone, GripVertical, RotateCcw, Save, Loader2,
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Info, Upload,
  ImageIcon, Moon, Compass, Cloud, Target, ShoppingBag, Star, X, CheckCircle2,
  Database, Palette, Layout, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  usePWAConfig,
  ALL_NAV_OPTIONS,
  DEFAULT_HEADER_NAV,
  DEFAULT_ICON_CONFIG,
  DEFAULT_PWA_LAYOUT,
  DEFAULT_PWA_THEME,
  BottomNavItem,
  HeaderNavLink,
  PWAIconConfig,
  PWALayoutSection,
  PWAThemeConfig,
} from "@/hooks/usePWAConfig";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Moon, Compass,
  Cloud, Target, ShoppingBag, Star,
};

const SPLASH_COLORS = [
  { label: "Hijau Islami", bg: "#15803d" },
  { label: "Teal Elegan",  bg: "#0f766e" },
  { label: "Biru Langit",  bg: "#1d4ed8" },
  { label: "Ungu Royal",   bg: "#7c3aed" },
  { label: "Emas Mewah",   bg: "#92400e" },
  { label: "Abu Gelap",    bg: "#1e293b" },
];

function NavItemRow({ item, index, onChange }: {
  item: BottomNavItem;
  index: number;
  onChange: (updated: BottomNavItem) => void;
}) {
  const Icon = ICON_MAP[item.icon] ?? Home;
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary",
          )}
        >
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            item.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", !item.enabled && "text-muted-foreground")}>{item.label}</p>
            <p className="text-xs text-muted-foreground truncate">{item.path}</p>
          </div>
          <Switch
            checked={item.enabled}
            onCheckedChange={(checked) => onChange({ ...item, enabled: checked })}
          />
        </div>
      )}
    </Draggable>
  );
}

function HeaderNavRow({ item, index, onChange }: {
  item: HeaderNavLink;
  index: number;
  onChange: (updated: HeaderNavLink) => void;
}) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary",
          )}
        >
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", !item.enabled && "text-muted-foreground")}>{item.label}</p>
            <p className="text-xs text-muted-foreground truncate">{item.href}</p>
          </div>
          <Switch
            checked={item.enabled}
            onCheckedChange={(checked) => onChange({ ...item, enabled: checked })}
          />
        </div>
      )}
    </Draggable>
  );
}

function LayoutSectionRow({ item, index, onChange }: {
  item: PWALayoutSection;
  index: number;
  onChange: (updated: PWALayoutSection) => void;
}) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary",
          )}
        >
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", !item.enabled && "text-muted-foreground")}>{item.title}</p>
            <p className="text-xs text-muted-foreground truncate">Section ID: {item.id}</p>
          </div>
          <Switch
            checked={item.enabled}
            onCheckedChange={(checked) => onChange({ ...item, enabled: checked })}
          />
        </div>
      )}
    </Draggable>
  );
}

export default function AdminPWASettings() {
  const {
    items,
    headerNavLinks: serverHeaderNavLinks,
    iconConfig: serverIconConfig,
    pwaLayout: serverPwaLayout,
    pwaTheme: serverPwaTheme,
    save, saveIconConfig, saveHeaderNavLinks, savePwaLayout, savePwaTheme,
    reset, resetHeaderNav,
    isSaving, isLoading,
  } = usePWAConfig();

  const [localItems, setLocalItems] = useState<BottomNavItem[]>(() =>
    ALL_NAV_OPTIONS.slice().sort((a, b) => a.order - b.order),
  );
  const [localHeaderNav, setLocalHeaderNav] = useState<HeaderNavLink[]>(DEFAULT_HEADER_NAV);
  const [localPwaLayout, setLocalPwaLayout] = useState<PWALayoutSection[]>(DEFAULT_PWA_LAYOUT);
  const [pwaTheme, setPwaTheme] = useState<PWAThemeConfig>(DEFAULT_PWA_THEME);
  const [iconConfig, setIconConfig] = useState<PWAIconConfig>(DEFAULT_ICON_CONFIG);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when server data loads (first time only)
  useEffect(() => {
    if (!isLoading && !initialized) {
      setLocalItems(
        ALL_NAV_OPTIONS.map((opt) => {
          const saved = items.find((i) => i.id === opt.id);
          return saved ?? opt;
        }).sort((a, b) => a.order - b.order),
      );
      // Merge saved header nav with default options
      const mergedHeader = DEFAULT_HEADER_NAV.map((opt) => {
        const saved = serverHeaderNavLinks.find((l) => l.id === opt.id);
        return saved ?? opt;
      }).sort((a, b) => a.order - b.order);
      setLocalHeaderNav(mergedHeader);
      setLocalPwaLayout(serverPwaLayout);
      setPwaTheme(serverPwaTheme);
      setIconConfig(serverIconConfig);
      setIconPreview(serverIconConfig.iconUrl);
      setInitialized(true);
    }
  }, [isLoading, initialized, items, serverHeaderNavLinks, serverIconConfig, serverPwaLayout, serverPwaTheme]);

  const activeCount = localItems.filter((i) => i.enabled).length;
  const previewItems = localItems.filter((i) => i.enabled).slice(0, 5);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(localItems);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalItems(reordered.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleChange = (updated: BottomNavItem) => {
    setLocalItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleSave = () => {
    const enabled = localItems.filter((i) => i.enabled);
    if (enabled.length === 0) { toast.error("Aktifkan minimal 1 menu."); return; }
    save(localItems);
    toast.success("Menu navigasi bawah disimpan ke database!");
  };

  const handleReset = () => {
    reset();
    setLocalItems(ALL_NAV_OPTIONS.slice().sort((a, b) => a.order - b.order));
    toast.info("Menu dikembalikan ke default.");
  };

  const handleHeaderNavSave = () => {
    saveHeaderNavLinks(localHeaderNav);
    toast.success("Navigasi header disimpan ke database!");
  };

  const handleHeaderNavReset = () => {
    resetHeaderNav();
    setLocalHeaderNav(DEFAULT_HEADER_NAV.slice().sort((a, b) => a.order - b.order));
    toast.info("Navigasi header dikembalikan ke default.");
  };

  const handleHeaderNavDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(localHeaderNav);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalHeaderNav(reordered.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleHeaderNavChange = (updated: HeaderNavLink) => {
    setLocalHeaderNav((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handlePwaLayoutDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(localPwaLayout);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalPwaLayout(reordered.map((item, idx) => ({ ...item, order: idx })));
  };

  const handlePwaLayoutChange = (updated: PWALayoutSection) => {
    setLocalPwaLayout((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleSavePwaLayout = () => {
    savePwaLayout(localPwaLayout);
    toast.success("Tata letak beranda PWA disimpan!");
  };

  const handleSavePwaTheme = () => {
    savePwaTheme(pwaTheme);
    toast.success("Tema warna PWA disimpan!");
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar (PNG, JPG, SVG)."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran file maksimal 2MB."); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setIconPreview(url);
      setIconConfig((prev) => ({ ...prev, iconUrl: url }));
      setUploading(false);
      toast.info("Ikon siap — klik Simpan untuk menyimpan ke database.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setIconPreview(null);
    setIconConfig((prev) => ({ ...prev, iconUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveIconConfig = () => {
    saveIconConfig(iconConfig);
    toast.success("Konfigurasi tampilan aplikasi disimpan ke database!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          Pengaturan Aplikasi (PWA)
        </h1>
        <p className="text-muted-foreground">
          Atur tampilan dan menu saat website dipasang sebagai aplikasi di ponsel.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-300">
        <Database className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tersimpan di Database</p>
          <p>
            Semua perubahan disimpan ke database dan langsung berlaku di semua perangkat pengguna —
            bukan hanya di browser ini. Menu navigasi bawah dan tampilan ikon akan diperbarui secara real-time.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tentang Fitur Aplikasi (PWA)</p>
          <p>
            Saat dipasang di ponsel, website tampil seperti aplikasi native — tanpa address bar,
            dengan menu bawah kustom, dan bisa dibuka dari ikon di layar utama.
            <strong> Pengunjung browser biasa tetap melihat website lengkap</strong> dengan
            navbar, footer, dan semua konten — tampilan aplikasi hanya muncul setelah diinstal.
          </p>
        </div>
      </div>

      <Tabs defaultValue="menu">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="menu">Menu Bawah</TabsTrigger>
          <TabsTrigger value="layout">Layout Beranda</TabsTrigger>
          <TabsTrigger value="theme">Tema & Warna</TabsTrigger>
          <TabsTrigger value="header">Navigasi Header</TabsTrigger>
          <TabsTrigger value="icon">Ikon &amp; Tampilan</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="live-preview">Live App</TabsTrigger>
          <TabsTrigger value="panduan">Cara Pasang</TabsTrigger>
        </TabsList>

        {/* ── TAB: LAYOUT BERANDA ── */}
        <TabsContent value="layout">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Tata Letak Beranda PWA
                </CardTitle>
                <CardDescription>
                  Atur urutan dan visibilitas komponen khusus untuk tampilan PWA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DragDropContext onDragEnd={handlePwaLayoutDragEnd}>
                  <Droppable droppableId="pwa-layout">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {localPwaLayout.map((item, index) => (
                          <LayoutSectionRow key={item.id} item={item} index={index} onChange={handlePwaLayoutChange} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                <Button onClick={handleSavePwaLayout} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Simpan Tata Letak
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview Struktur
                </CardTitle>
                <CardDescription>Urutan komponen yang akan tampil di PWA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  {localPwaLayout.filter(s => s.enabled).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 bg-background border rounded shadow-sm">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">{i + 1}</Badge>
                      <span className="font-medium text-sm">{s.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: TEMA & WARNA ── */}
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Tema Warna Khusus PWA
              </CardTitle>
              <CardDescription>
                Sesuaikan warna aplikasi agar berbeda dari website utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Warna Primer PWA</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      value={pwaTheme.primaryColor} 
                      onChange={(e) => setPwaTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={pwaTheme.primaryColor} 
                      onChange={(e) => setPwaTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Warna Background</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      value={pwaTheme.backgroundColor} 
                      onChange={(e) => setPwaTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={pwaTheme.backgroundColor} 
                      onChange={(e) => setPwaTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gaya Navigasi Bawah</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['solid', 'glass', 'floating'] as const).map((style) => (
                    <Button
                      key={style}
                      variant={pwaTheme.bottomNavStyle === style ? "default" : "outline"}
                      onClick={() => setPwaTheme(prev => ({ ...prev, bottomNavStyle: style }))}
                      className="capitalize"
                    >
                      {style}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSavePwaTheme} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan Tema
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: MENU NAVIGASI ── */}
        <TabsContent value="menu">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Menu Navigasi Bawah</CardTitle>
                <CardDescription>
                  Aktifkan/nonaktifkan dan seret untuk mengubah urutan. Maks. 5 item ditampilkan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Aktif: <strong>{activeCount}</strong> dari {localItems.length}
                  </span>
                  {activeCount > 5 && (
                    <Badge variant="destructive" className="text-xs">Hanya 5 pertama ditampilkan</Badge>
                  )}
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="bottom-nav">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {localItems.map((item, index) => (
                          <NavItemRow key={item.id} item={item} index={index} onChange={handleChange} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                <Separator />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving} className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-1.5" />Reset Default
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Phone preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview Menu</CardTitle>
                <CardDescription>Tampilan bottom nav di aplikasi</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="relative w-56 h-[420px] rounded-[2rem] border-4 border-foreground bg-background shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground rounded-b-xl z-10" />
                  <div className="h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${iconConfig.bgColor}, ${iconConfig.themeColor})` }}>
                    <div className="flex justify-between px-4 pt-8 pb-2 text-white text-[10px]">
                      <span>9:41</span><span>●●●</span>
                    </div>
                    <div className="flex-1 bg-background mx-0 rounded-t-2xl mt-1 relative overflow-hidden">
                      <div className="p-3 space-y-2">
                        <div className="h-2 w-2/3 bg-muted rounded-full" />
                        <div className="h-20 rounded-xl" style={{ background: `linear-gradient(135deg, ${iconConfig.bgColor}cc, ${iconConfig.themeColor}cc)` }} />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-14 bg-muted rounded-lg" />
                          <div className="h-14 bg-muted rounded-lg" />
                        </div>
                        <div className="h-12 bg-muted rounded-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border">
                    <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${previewItems.length || 1}, 1fr)` }}>
                      {previewItems.map((item, idx) => {
                        const Icon = ICON_MAP[item.icon] ?? Home;
                        return (
                          <div key={item.id} className={cn("flex flex-col items-center justify-center gap-0.5", idx === 0 ? "text-primary" : "text-muted-foreground")}>
                            <Icon className="h-4 w-4" />
                            <span className="text-[8px] font-medium">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-foreground/30 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: NAVIGASI HEADER ── */}
        <TabsContent value="header">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link Navigasi Header</CardTitle>
                <CardDescription>
                  Aktifkan/nonaktifkan dan seret untuk mengubah urutan link di navbar website.
                  Link ini tampil di desktop dan menu mobile hamburger.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Aktif: <strong>{localHeaderNav.filter((l) => l.enabled).length}</strong> dari {localHeaderNav.length}
                  </span>
                </div>

                <DragDropContext onDragEnd={handleHeaderNavDragEnd}>
                  <Droppable droppableId="header-nav">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {localHeaderNav.map((item, index) => (
                          <HeaderNavRow key={item.id} item={item} index={index} onChange={handleHeaderNavChange} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                <Separator />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleHeaderNavReset} disabled={isSaving} className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-1.5" />Reset Default
                  </Button>
                  <Button size="sm" onClick={handleHeaderNavSave} disabled={isSaving} className="flex-1">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Header nav preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview Navbar</CardTitle>
                <CardDescription>Tampilan link di navigation bar website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                  {/* Simulated navbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b border-border gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">V</span>
                      </div>
                      <div>
                        <div className="h-2.5 w-20 bg-foreground/80 rounded-full" />
                        <div className="h-1.5 w-14 bg-muted-foreground/50 rounded-full mt-1" />
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      {localHeaderNav.filter((l) => l.enabled).slice(0, 5).map((link) => (
                        <div
                          key={link.id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent text-foreground/80"
                        >
                          {link.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-14 rounded-lg border border-border text-[10px] flex items-center justify-center text-muted-foreground">Masuk</div>
                      <div className="h-7 w-14 rounded-lg bg-primary text-[10px] flex items-center justify-center text-primary-foreground font-semibold">Daftar</div>
                    </div>
                  </div>
                  <div className="bg-muted h-24 flex items-center justify-center text-xs text-muted-foreground">
                    Konten halaman
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Link aktif tampil setelah menu dropdown Layanan, Portal Jamaah, dan Islami di desktop.
                  Di mobile, muncul di dalam menu hamburger.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: IKON & TAMPILAN ── */}
        <TabsContent value="icon">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">

              {/* Icon Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />Ikon Aplikasi
                  </CardTitle>
                  <CardDescription>
                    Upload ikon PNG minimal 512×512px untuk tampilan di layar ponsel.
                    Format: PNG, JPG, SVG. Maks 2MB.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {iconPreview ? (
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={iconPreview}
                          alt="Ikon app"
                          className="h-24 w-24 rounded-2xl object-cover border-2 border-border shadow-md"
                        />
                        <button
                          onClick={handleRemoveIcon}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          <CheckCircle2 className="h-4 w-4" />Ikon terpasang
                        </div>
                        <p className="text-xs text-muted-foreground">Klik Simpan untuk menyimpan ke database.</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />Ganti Ikon
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary hover:bg-accent transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                        <Upload className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Klik atau seret ikon ke sini</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — Maks 2MB — Min 512×512px</p>
                      </div>
                      {uploading && <p className="text-xs text-primary animate-pulse">Memproses...</p>}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                </CardContent>
              </Card>

              {/* App Name */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nama Aplikasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="appName">Nama Lengkap</Label>
                    <Input
                      id="appName"
                      value={iconConfig.appName}
                      onChange={(e) => setIconConfig((prev) => ({ ...prev, appName: e.target.value }))}
                      placeholder="Vinstour Travel"
                    />
                    <p className="text-xs text-muted-foreground">Tampil di halaman instalasi dan header PWA</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shortName">Nama Singkat</Label>
                    <Input
                      id="shortName"
                      value={iconConfig.shortName}
                      onChange={(e) => setIconConfig((prev) => ({ ...prev, shortName: e.target.value }))}
                      placeholder="Vinstour"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">Maks 12 karakter — tampil di bawah ikon layar utama</p>
                  </div>
                </CardContent>
              </Card>

              {/* Theme Color */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Warna Tema Aplikasi</CardTitle>
                  <CardDescription>Warna header PWA, splash screen &amp; halaman instalasi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {SPLASH_COLORS.map((c) => (
                      <button
                        key={c.bg}
                        onClick={() => setIconConfig((prev) => ({ ...prev, themeColor: c.bg, bgColor: c.bg }))}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                          iconConfig.themeColor === c.bg ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground",
                        )}
                      >
                        <div className="h-8 w-8 rounded-xl shadow-md" style={{ backgroundColor: c.bg }} />
                        <span className="text-[10px] text-muted-foreground leading-tight text-center">{c.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label className="shrink-0 text-xs">Kustom:</Label>
                    <input
                      type="color"
                      value={iconConfig.themeColor}
                      onChange={(e) => setIconConfig((prev) => ({ ...prev, themeColor: e.target.value, bgColor: e.target.value }))}
                      className="h-9 w-16 rounded-lg border cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground font-mono">{iconConfig.themeColor}</span>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveIconConfig} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan Konfigurasi Tampilan
              </Button>
            </div>

            {/* Icon Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview Ikon &amp; Splash</CardTitle>
                <CardDescription>Tampilan di layar utama ponsel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Layar Utama Android / iOS</p>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="h-16 w-16 rounded-[20px] overflow-hidden shadow-xl border-2 border-white/30"
                        style={{ backgroundColor: iconConfig.themeColor }}
                      >
                        {iconPreview ? (
                          <img src={iconPreview} alt="icon" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold">
                            {iconConfig.shortName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-[11px] font-medium drop-shadow">{iconConfig.shortName}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-2">
                          {[...Array(3)].map((__, j) => (
                            <div key={j} className="h-12 w-12 rounded-[14px] bg-white/20 backdrop-blur-sm" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Splash Screen saat Dibuka</p>
                  <div
                    className="relative w-full h-48 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center gap-3"
                    style={{ backgroundColor: iconConfig.bgColor }}
                  >
                    <div className="h-20 w-20 rounded-[24px] overflow-hidden shadow-2xl border-2 border-white/20">
                      {iconPreview ? (
                        <img src={iconPreview} alt="icon" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="h-full w-full flex items-center justify-center text-white text-3xl font-bold"
                          style={{ backgroundColor: iconConfig.themeColor }}
                        >
                          {iconConfig.shortName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-white font-bold text-lg drop-shadow">{iconConfig.appName}</p>
                    <div className="absolute bottom-4 flex gap-1">
                      <div className="h-1 w-8 bg-white/60 rounded-full" />
                      <div className="h-1 w-2 bg-white/30 rounded-full" />
                      <div className="h-1 w-2 bg-white/30 rounded-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Header Aplikasi (PWA Standalone)</p>
                  <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                    <div
                      className="flex items-center justify-between px-4 py-2.5 text-white text-xs font-medium"
                      style={{ backgroundColor: iconConfig.themeColor }}
                    >
                      <div className="flex items-center gap-2">
                        {iconPreview && (
                          <img src={iconPreview} alt="icon" className="h-6 w-6 rounded object-cover" />
                        )}
                        <span className="font-bold">{iconConfig.appName}</span>
                      </div>
                      <span className="opacity-60">{iconConfig.shortName}</span>
                    </div>
                    <div className="bg-muted h-16 flex items-center justify-center text-xs text-muted-foreground">
                      Konten halaman
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: PREVIEW LENGKAP ── */}
        <TabsContent value="preview">
          <div className="flex justify-center">
            <div className="relative w-64 h-[560px] rounded-[2.5rem] border-4 border-foreground bg-background shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground rounded-b-xl z-10" />

              {/* PWA compact header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 text-white text-xs font-medium"
                style={{ backgroundColor: iconConfig.themeColor }}
              >
                <div className="flex items-center gap-1.5">
                  {iconPreview && (
                    <img src={iconPreview} alt="" className="h-5 w-5 rounded object-cover" />
                  )}
                  <span className="font-bold">{iconConfig.appName}</span>
                </div>
                <span className="opacity-60">9:41</span>
              </div>

              {/* Content */}
              <div className="flex-1 bg-background p-3 space-y-2 overflow-hidden" style={{ height: "calc(100% - 90px)" }}>
                <div className="h-2.5 w-2/3 bg-muted rounded-full" />
                <div className="h-24 rounded-xl" style={{ background: `linear-gradient(135deg, ${iconConfig.bgColor}99, ${iconConfig.themeColor}99)` }} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-16 bg-muted rounded-xl" />
                  <div className="h-16 bg-muted rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-12 bg-muted rounded-xl" />
                  <div className="h-12 bg-muted rounded-xl" />
                  <div className="h-12 bg-muted rounded-xl" />
                </div>
              </div>

              {/* Bottom nav */}
              <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border">
                <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${previewItems.length || 1}, 1fr)` }}>
                  {previewItems.map((item, idx) => {
                    const Icon = ICON_MAP[item.icon] ?? Home;
                    return (
                      <div
                        key={item.id}
                        className={cn("flex flex-col items-center justify-center gap-0.5", idx === 0 ? "text-primary" : "text-muted-foreground")}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] font-medium">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-foreground/30 rounded-full" />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Preview tampilan saat website dipasang sebagai aplikasi (PWA) di ponsel
          </p>
        </TabsContent>

        {/* ── TAB: LIVE APP ── */}
        <TabsContent value="live-preview">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pratinjau live website Anda dalam mode aplikasi (standalone). Iframe di bawah ini menampilkan website seperti yang akan terlihat ketika dipasang sebagai PWA di perangkat pengguna.
            </p>
            <div className="flex justify-center">
              <div
                className="relative rounded-[2.5rem] border-4 bg-background shadow-2xl overflow-hidden"
                style={{ width: 360, height: 720, borderColor: iconConfig.themeColor }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-xl z-10"
                  style={{ backgroundColor: iconConfig.themeColor }}
                />
                <iframe
                  src="/?preview=standalone"
                  title="Preview PWA standalone"
                  className="w-full h-full border-0"
                  loading="lazy"
                />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-foreground/30 rounded-full" />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Tips: tambahkan parameter <code>?preview=standalone</code> pada URL untuk memunculkan tampilan aplikasi tanpa header browser.
            </p>
          </div>
        </TabsContent>

        {/* ── TAB: CARA PASANG ── */}
        <TabsContent value="panduan">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5 space-y-2">
                <p className="font-semibold text-sm">📱 Android (Chrome)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Buka website di browser Chrome</li>
                  <li>Ketuk menu ⋮ (tiga titik) di kanan atas</li>
                  <li>Pilih <em>"Tambahkan ke Layar Utama"</em></li>
                  <li>Ketuk <strong>Tambahkan</strong></li>
                </ol>
                <p className="text-xs text-green-600 font-medium">✓ Banner otomatis muncul setelah beberapa detik</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 space-y-2">
                <p className="font-semibold text-sm">🍎 iPhone (Safari)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Buka website di Safari</li>
                  <li>Ketuk ikon Bagikan 🔗 di bawah layar</li>
                  <li>Gulir ke bawah, pilih <em>"Tambahkan ke Layar Utama"</em></li>
                </ol>
                <p className="text-xs text-blue-600 font-medium">ℹ Safari di iPhone mendukung PWA sejak iOS 16.4</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 space-y-2">
                <p className="font-semibold text-sm">💻 Desktop (Chrome/Edge)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Buka website di Chrome atau Edge</li>
                  <li>Lihat ikon install di address bar</li>
                  <li>Klik ikon tersebut, lalu klik <strong>Install</strong></li>
                </ol>
                <p className="text-xs text-violet-600 font-medium">✓ Berjalan di jendela tersendiri tanpa browser</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
