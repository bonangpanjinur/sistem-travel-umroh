import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WebsiteSettings, HomepageSection, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Layout, Save, GripVertical, Eye, EyeOff, Upload, Loader2, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PageBuilderProps {
  settings: WebsiteSettings;
}

/**
 * PageBuilder Component
 * 
 * Manages the homepage layout and section ordering.
 * 
 * Current Implementation:
 * - Section reordering uses arrow buttons (up/down) for changing order
 * - Each section can be toggled on/off via switch
 * - Hero section content (title, subtitle, image, CTA) can be customized
 * 
 * Future Enhancement:
 * - Implement real drag-and-drop using dnd-kit or react-beautiful-dnd library
 * - This would provide better UX with visual feedback during dragging
 */
export function PageBuilder({ settings }: PageBuilderProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [uploading, setUploading] = useState(false);
  
  const [sections, setSections] = useState<HomepageSection[]>(
    settings.homepage_sections || []
  );
  
  const [heroContent, setHeroContent] = useState({
    hero_title: settings.hero_title || "",
    hero_subtitle: settings.hero_subtitle || "",
    hero_image_url: settings.hero_image_url || "",
    hero_cta_text: settings.hero_cta_text || "",
    hero_cta_link: settings.hero_cta_link || "",
  });
  
  const [packageCount, setPackageCount] = useState<number>(
    settings.featured_packages_count || 3
  );

  useEffect(() => {
    setSections(settings.homepage_sections || []);
    setHeroContent({
      hero_title: settings.hero_title || "",
      hero_subtitle: settings.hero_subtitle || "",
      hero_image_url: settings.hero_image_url || "",
      hero_cta_text: settings.hero_cta_text || "",
      hero_cta_link: settings.hero_cta_link || "",
    });
    setPackageCount(settings.featured_packages_count || 3);
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      homepage_sections: sections,
      ...heroContent,
      featured_packages_count: packageCount,
    });
  };

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  /**
   * Move section up or down in the order
   * Updates the order field for all sections
   */
  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];

    // Update order values to reflect new sequence
    newSections.forEach((s, i) => {
      s.order = i + 1;
    });

    setSections(newSections);
  };

  const handleHeroImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `branding/hero-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setHeroContent((prev) => ({ ...prev, hero_image_url: publicUrl }));
      toast.success("Gambar hero berhasil diupload");
    } catch (error: any) {
      toast.error(`Gagal upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const getSectionIcon = (id: string) => {
    switch (id) {
      case "hero":
        return "🖼️";
      case "featured_packages":
        return "📦";
      case "why_choose_us":
        return "⭐";
      case "testimonials":
        return "💬";
      case "cta":
        return "🎯";
      default:
        return "📄";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <div>
                <CardTitle>Page Builder</CardTitle>
                <CardDescription>
                  Atur urutan dan visibilitas section di halaman beranda
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Simpan
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section Order */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Urutan Section</CardTitle>
            <CardDescription>
              Gunakan tombol panah untuk mengubah urutan, toggle untuk show/hide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      section.enabled
                        ? "bg-background hover:bg-muted/50"
                        : "bg-muted/50 opacity-60"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, "up")}
                        title="Pindahkan ke atas"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(section.id, "down")}
                        title="Pindahkan ke bawah"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xl">{getSectionIcon(section.id)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {section.enabled ? "Ditampilkan" : "Disembunyikan"}
                      </p>
                    </div>
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={() => toggleSection(section.id)}
                      aria-label={`Toggle ${section.title}`}
                    />
                  </div>
                ))}
            </div>

            {/* Featured Packages Count Setting */}
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Jumlah Paket Unggulan</Label>
                  <p className="text-sm text-muted-foreground">
                    Tentukan berapa banyak paket yang ditampilkan di halaman utama
                  </p>
                </div>
                <Select 
                  value={packageCount.toString()} 
                  onValueChange={(val) => setPackageCount(parseInt(val))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Pilih jumlah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Paket</SelectItem>
                    <SelectItem value="6">6 Paket</SelectItem>
                    <SelectItem value="9">9 Paket</SelectItem>
                    <SelectItem value="12">12 Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <p className="font-medium mb-1">💡 Tips:</p>
              <p>Gunakan tombol panah untuk mengubah urutan section. Perubahan akan disimpan saat Anda klik tombol "Simpan".</p>
            </div>
          </CardContent>
        </Card>

        {/* Hero Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🖼️ Hero Section</CardTitle>
            <CardDescription>
              Kustomisasi banner utama di halaman beranda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Judul Hero</Label>
              <Input
                id="hero_title"
                value={heroContent.hero_title}
                onChange={(e) =>
                  setHeroContent((prev) => ({ ...prev, hero_title: e.target.value }))
                }
                placeholder="Wujudkan Perjalanan Spiritual Anda"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={heroContent.hero_subtitle}
                onChange={(e) =>
                  setHeroContent((prev) => ({ ...prev, hero_subtitle: e.target.value }))
                }
                placeholder="Pengalaman umroh dan haji terbaik..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Background Image</Label>
              <div className="flex items-start gap-4">
                {heroContent.hero_image_url ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img
                      src={heroContent.hero_image_url}
                      alt="Hero"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex-1">
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="text-center">
                      {uploading ? (
                        <>
                          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Klik untuk upload</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WebP (Max 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleHeroImageUpload(file);
                      }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_cta_text">CTA Button Text</Label>
              <Input
                id="hero_cta_text"
                value={heroContent.hero_cta_text}
                onChange={(e) =>
                  setHeroContent((prev) => ({ ...prev, hero_cta_text: e.target.value }))
                }
                placeholder="Mulai Booking Sekarang"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_cta_link">CTA Button Link</Label>
              <Input
                id="hero_cta_link"
                value={heroContent.hero_cta_link}
                onChange={(e) =>
                  setHeroContent((prev) => ({ ...prev, hero_cta_link: e.target.value }))
                }
                placeholder="/packages"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
