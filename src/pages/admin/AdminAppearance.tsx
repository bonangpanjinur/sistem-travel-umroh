import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Layout, Image, Settings2, Eye, Sliders, LayoutTemplate, Square, Menu, Wallet, MessageCircle, Users, Search, MessageSquare, HelpCircle, Bell, Settings, FileText, MessageCircleMore, Package } from "lucide-react";
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
import { AboutPageEditor } from "@/components/admin/appearance/AboutPageEditor";
import { SavingsPageEditor } from "@/components/admin/appearance/SavingsPageEditor";
import { ContactPageEditor } from "@/components/admin/appearance/ContactPageEditor";
import { SEOSettings } from "@/components/admin/appearance/SEOSettings";
import { TestimonialEditor } from "@/components/admin/appearance/TestimonialEditor";
import { FAQEditor } from "@/components/admin/appearance/FAQEditor";
import { AnnouncementBarEditor } from "@/components/admin/appearance/AnnouncementBarEditor";
import { HeaderFooterSettings } from "@/components/admin/appearance/HeaderFooterSettings";
import { LegalPagesGenerator } from "@/components/admin/appearance/LegalPagesGenerator";
import { WhatsAppButtonSettings } from "@/components/admin/appearance/WhatsAppButtonSettings";
import { PackageListCustomization } from "@/components/admin/appearance/PackageListCustomization";
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
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="template" className="gap-2 py-2">
            <LayoutTemplate className="h-4 w-4" />
            <span>Template</span>
          </TabsTrigger>
          <TabsTrigger value="themes" className="gap-2 py-2">
            <Palette className="h-4 w-4" />
            <span>Tema</span>
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2 py-2">
            <Settings2 className="h-4 w-4" />
            <span>Warna</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2 py-2">
            <Type className="h-4 w-4" />
            <span>Font</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 py-2">
            <Image className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2 py-2">
            <Layout className="h-4 w-4" />
            <span>Layout</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2 py-2">
            <Sliders className="h-4 w-4" />
            <span>Sections</span>
          </TabsTrigger>
          <TabsTrigger value="package-design" className="gap-2 py-2">
            <Square className="h-4 w-4" />
            <span>Card Paket</span>
          </TabsTrigger>
          <TabsTrigger value="nav-menu" className="gap-2 py-2">
            <Menu className="h-4 w-4" />
            <span>Menu Header</span>
          </TabsTrigger>
          <TabsTrigger value="about-page" className="gap-2 py-2">
            <Users className="h-4 w-4" />
            <span>Tentang Kami</span>
          </TabsTrigger>
          <TabsTrigger value="savings-page" className="gap-2 py-2">
            <Wallet className="h-4 w-4" />
            <span>Tabungan</span>
          </TabsTrigger>
          <TabsTrigger value="contact-page" className="gap-2 py-2">
            <MessageCircle className="h-4 w-4" />
            <span>Hubungi</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2 py-2">
            <Search className="h-4 w-4" />
            <span>SEO</span>
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="gap-2 py-2">
            <MessageSquare className="h-4 w-4" />
            <span>Testimonial</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2 py-2">
            <HelpCircle className="h-4 w-4" />
            <span>FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="announcement" className="gap-2 py-2">
            <Bell className="h-4 w-4" />
            <span>Pengumuman</span>
          </TabsTrigger>
          <TabsTrigger value="header-footer" className="gap-2 py-2">
            <Settings className="h-4 w-4" />
            <span>Header & Footer</span>
          </TabsTrigger>
          <TabsTrigger value="legal-pages" className="gap-2 py-2">
            <FileText className="h-4 w-4" />
            <span>Halaman Legal</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 py-2">
            <MessageCircleMore className="h-4 w-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="package-list" className="gap-2 py-2">
            <Package className="h-4 w-4" />
            <span>Daftar Paket</span>
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

        <TabsContent value="about-page">
          <AboutPageEditor />
        </TabsContent>
        
        <TabsContent value="savings-page">
          <SavingsPageEditor />
        </TabsContent>
        
        <TabsContent value="contact-page">
          <ContactPageEditor />
        </TabsContent>

        <TabsContent value="seo">
          {settings && <SEOSettings settings={settings} />}
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialEditor />
        </TabsContent>

        <TabsContent value="faq">
          <FAQEditor />
        </TabsContent>

        <TabsContent value="announcement">
          {settings && <AnnouncementBarEditor settings={settings} />}
        </TabsContent>

        <TabsContent value="header-footer">
          {settings && <HeaderFooterSettings settings={settings} />}
        </TabsContent>

        <TabsContent value="legal-pages">
          <LegalPagesGenerator />
        </TabsContent>

        <TabsContent value="whatsapp">
          {settings && <WhatsAppButtonSettings settings={settings} />}
        </TabsContent>

        <TabsContent value="package-list">
          {settings && <PackageListCustomization settings={settings} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
