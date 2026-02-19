import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Layout, Image, Settings2, Eye, Sliders, LayoutTemplate } from "lucide-react";
import { ThemeSelector } from "@/components/admin/appearance/ThemeSelector";
import { ColorSettings } from "@/components/admin/appearance/ColorSettings";
import { TypographySettings } from "@/components/admin/appearance/TypographySettings";
import { BrandingSettings } from "@/components/admin/appearance/BrandingSettings";
import { PageBuilder } from "@/components/admin/appearance/PageBuilder";
import { LivePreview } from "@/components/admin/appearance/LivePreview";
import { CustomSectionEditor } from "@/components/admin/appearance/CustomSectionEditor";
import { TemplateSelector } from "@/components/admin/appearance/TemplateSelector";
import { useWebsiteSettings, useThemePresets } from "@/hooks/useWebsiteSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function AdminAppearance() {
  const { data: settings, isLoading: loadingSettings } = useWebsiteSettings();
  const { data: presets, isLoading: loadingPresets } = useThemePresets();
  const [activeTab, setActiveTab] = useState("template");
  const [showPreview, setShowPreview] = useState(false);

  if (loadingSettings || loadingPresets) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Tampilan</h1>
          <p className="text-muted-foreground">
            Kustomisasi tema, warna, font, dan layout website publik (White Label)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showPreview ? "default" : "outline"} 
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Sembunyikan Preview" : "Tampilkan Preview"}
          </Button>
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka Website
            </a>
          </Button>
        </div>
      </div>

      {showPreview && <LivePreview className="mb-6" />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="template" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Template</span>
          </TabsTrigger>
          <TabsTrigger value="themes" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Warna</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Font</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Layout</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Sections</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          {settings && <TemplateSelector settings={settings} />}
        </TabsContent>

        <TabsContent value="themes">
          {settings && presets && (
            <ThemeSelector settings={settings} presets={presets} />
          )}
        </TabsContent>

        <TabsContent value="colors">
          {settings && <ColorSettings settings={settings} />}
        </TabsContent>

        <TabsContent value="typography">
          {settings && <TypographySettings settings={settings} />}
        </TabsContent>

        <TabsContent value="branding">
          {settings && <BrandingSettings settings={settings} />}
        </TabsContent>

        <TabsContent value="layout">
          {settings && <PageBuilder settings={settings} />}
        </TabsContent>

        <TabsContent value="sections">
          {settings && <CustomSectionEditor settings={settings} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
