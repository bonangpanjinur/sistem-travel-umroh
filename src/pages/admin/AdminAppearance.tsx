import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Layout, Image, Settings2, Eye, Sliders, LayoutTemplate, Square, Menu, Wallet, MessageCircle, Users } from "lucide-react";
import { ThemeSelector } from "@/components/admin/appearance/ThemeSelector";
import { ColorSettings } from "@/components/admin/appearance/ColorSettings";
import { TypographySettings } from "@/components/admin/appearance/TypographySettings";
import { BrandingSettings } from "@/components/admin/appearance/BrandingSettings";
import { PackageDesignSettings } from "@/components/admin/appearance/PackageDesignSettings";
import { PageBuilder } from "@/components/admin/appearance/PageBuilder";
import { LivePreview } from "@/components/admin/appearance/LivePreview";
import { CustomSectionEditor } from "@/components/admin/appearance/CustomSectionEditor";
import { TemplateSelector } from "@/components/admin/appearance/TemplateSelector";
import { NavLinksEditor } from "@/components/admin/appearance/NavLinksEditor";
import { SavingsPageEditor } from "@/components/admin/appearance/SavingsPageEditor";
import { ContactPageEditor } from "@/components/admin/appearance/ContactPageEditor";
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
        <TabsList className="grid w-full grid-cols-11 lg:w-auto lg:inline-grid">
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
          <TabsTrigger value="package-design" className="gap-2">
            <Square className="h-4 w-4" />
            <span className="hidden sm:inline">Card Paket</span>
          </TabsTrigger>
          <TabsTrigger value="nav-menu" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">Menu Header</span>
          </TabsTrigger>
          <TabsTrigger value="savings-page" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Tabungan</span>
          </TabsTrigger>
          <TabsTrigger value="contact-page" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Hubungi</span>
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
        <TabsContent value="package-design">
          {settings && <PackageDesignSettings settings={settings} />}
        </TabsContent>
        <TabsContent value="nav-menu">
          {settings && <NavLinksEditor settings={settings} />}
        </TabsContent>
        
        <TabsContent value="savings-page">
          <SavingsPageEditor />
        </TabsContent>
        
        <TabsContent value="contact-page">
          <ContactPageEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
