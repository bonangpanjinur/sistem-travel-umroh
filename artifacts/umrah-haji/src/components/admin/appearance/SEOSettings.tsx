import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SEOSettingsProps {
  settings: WebsiteSettings;
}

interface PageSEOSettings {
  page: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  robots_index: boolean;
  schema_type: string;
}

const DEFAULT_PAGES: PageSEOSettings[] = [
  {
    page: "home",
    meta_title: "Umroh & Haji Terpercaya - Perjalanan Suci Anda",
    meta_description: "Layanan umroh dan haji terpercaya dengan pengalaman bertahun-tahun. Paket lengkap, harga kompetitif, dan pelayanan profesional.",
    og_image_url: "",
    robots_index: true,
    schema_type: "TravelAgency",
  },
  {
    page: "packages",
    meta_title: "Paket Umroh & Haji - Pilihan Terbaik",
    meta_description: "Jelajahi berbagai paket umroh dan haji dengan berbagai pilihan durasi, maskapai, dan hotel. Dapatkan penawaran terbaik hari ini.",
    og_image_url: "",
    robots_index: true,
    schema_type: "Product",
  },
  {
    page: "about",
    meta_title: "Tentang Kami - Perusahaan Umroh Terpercaya",
    meta_description: "Pelajari lebih lanjut tentang perusahaan kami, visi, misi, dan komitmen kami dalam melayani perjalanan ibadah Anda.",
    og_image_url: "",
    robots_index: true,
    schema_type: "Organization",
  },
  {
    page: "contact",
    meta_title: "Hubungi Kami - Layanan Pelanggan 24/7",
    meta_description: "Hubungi tim customer service kami yang siap membantu Anda 24/7. Kami siap menjawab semua pertanyaan Anda.",
    og_image_url: "",
    robots_index: true,
    schema_type: "ContactPage",
  },
  {
    page: "faq",
    meta_title: "FAQ - Pertanyaan yang Sering Diajukan",
    meta_description: "Temukan jawaban atas pertanyaan umum tentang umroh, persyaratan, pembayaran, dan layanan kami.",
    og_image_url: "",
    robots_index: true,
    schema_type: "FAQPage",
  },
  {
    page: "terms",
    meta_title: "Syarat & Ketentuan",
    meta_description: "Baca syarat dan ketentuan layanan kami sebelum melakukan pemesanan.",
    og_image_url: "",
    robots_index: true,
    schema_type: "WebPage",
  },
  {
    page: "privacy",
    meta_title: "Kebijakan Privasi",
    meta_description: "Pelajari bagaimana kami melindungi data pribadi Anda dan kebijakan privasi kami.",
    og_image_url: "",
    robots_index: true,
    schema_type: "WebPage",
  },
];

export function SEOSettings({ settings }: SEOSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [pageSEOSettings, setPageSEOSettings] = useState<Record<string, PageSEOSettings>>({});
  const [googleVerification, setGoogleVerification] = useState(settings.google_console_verification || "");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize page SEO settings from localStorage or defaults
  useEffect(() => {
    const stored = localStorage.getItem("page_seo_settings");
    if (stored) {
      setPageSEOSettings(JSON.parse(stored));
    } else {
      const defaults: Record<string, PageSEOSettings> = {};
      DEFAULT_PAGES.forEach((page) => {
        defaults[page.page] = page;
      });
      setPageSEOSettings(defaults);
    }
  }, []);

  const currentPage = pageSEOSettings[selectedPage] || DEFAULT_PAGES[0];

  const handleFieldChange = (field: keyof PageSEOSettings, value: any) => {
    setPageSEOSettings((prev) => ({
      ...prev,
      [selectedPage]: {
        ...prev[selectedPage],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now (in production, this would be saved to database)
      localStorage.setItem("page_seo_settings", JSON.stringify(pageSEOSettings));
      
      // Update main website settings with home page SEO and Google Verification
      const updates: Partial<WebsiteSettings> = {
        google_console_verification: googleVerification,
      };

      if (pageSEOSettings["home"]) {
        updates.meta_title = pageSEOSettings["home"].meta_title;
        updates.meta_description = pageSEOSettings["home"].meta_description;
      }

      await updateSettings.mutateAsync(updates);
      
      // Update local cache for instant restoration
      if (googleVerification) {
        localStorage.setItem('website-seo-verification', googleVerification);
      } else {
        localStorage.removeItem('website-seo-verification');
      }
      
      toast.success("Pengaturan SEO berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan SEO");
    } finally {
      setIsSaving(false);
    }
  };

  const metaTitleLength = currentPage?.meta_title?.length || 0;
  const metaDescriptionLength = currentPage?.meta_description?.length || 0;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Pengaturan SEO ini membantu meningkatkan visibilitas halaman Anda di mesin pencari dan media sosial. Meta title optimal 50-60 karakter, meta description 150-160 karakter.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pilih Halaman</CardTitle>
          <CardDescription>Kelola SEO metadata untuk setiap halaman publik</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PAGES.map((page) => (
                <SelectItem key={page.page} value={page.page}>
                  {page.page.charAt(0).toUpperCase() + page.page.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {currentPage && (
        <Card>
          <CardHeader>
            <CardTitle>SEO Metadata - {selectedPage.charAt(0).toUpperCase() + selectedPage.slice(1)}</CardTitle>
            <CardDescription>Konfigurasi meta tag dan schema markup untuk halaman ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meta Title */}
            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta Title</Label>
              <Textarea
                id="meta_title"
                value={currentPage.meta_title || ""}
                onChange={(e) => handleFieldChange("meta_title", e.target.value)}
                placeholder="Judul halaman untuk mesin pencari (50-60 karakter optimal)"
                className="min-h-[60px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metaTitleLength} karakter</span>
                <span className={metaTitleLength > 60 ? "text-amber-600" : "text-green-600"}>
                  {metaTitleLength > 60 ? "Terlalu panjang" : "Optimal"}
                </span>
              </div>
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={currentPage.meta_description || ""}
                onChange={(e) => handleFieldChange("meta_description", e.target.value)}
                placeholder="Deskripsi halaman untuk mesin pencari (150-160 karakter optimal)"
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metaDescriptionLength} karakter</span>
                <span className={metaDescriptionLength > 160 ? "text-amber-600" : "text-green-600"}>
                  {metaDescriptionLength > 160 ? "Terlalu panjang" : "Optimal"}
                </span>
              </div>
            </div>

            {/* OG Image URL */}
            <div className="space-y-2">
              <Label htmlFor="og_image_url">OpenGraph Image URL</Label>
              <Input
                id="og_image_url"
                type="url"
                value={currentPage.og_image_url || ""}
                onChange={(e) => handleFieldChange("og_image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Gambar yang ditampilkan saat halaman dibagikan di media sosial (minimal 1200x630px)
              </p>
            </div>

            {/* Schema Type */}
            <div className="space-y-2">
              <Label htmlFor="schema_type">Schema Markup Type</Label>
              <Select value={currentPage.schema_type || "WebPage"} onValueChange={(value) => handleFieldChange("schema_type", value)}>
                <SelectTrigger id="schema_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TravelAgency">Travel Agency (Beranda)</SelectItem>
                  <SelectItem value="Product">Product (Paket)</SelectItem>
                  <SelectItem value="Organization">Organization (Tentang)</SelectItem>
                  <SelectItem value="ContactPage">Contact Page (Hubungi)</SelectItem>
                  <SelectItem value="FAQPage">FAQ Page (FAQ)</SelectItem>
                  <SelectItem value="WebPage">Web Page (Umum)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Schema markup membantu mesin pencari memahami konten halaman Anda
              </p>
            </div>

            {/* Robots Index */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentPage.robots_index || true}
                  onChange={(e) => handleFieldChange("robots_index", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Izinkan mesin pencari untuk mengindeks halaman ini</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Jika dinonaktifkan, halaman tidak akan muncul di hasil pencarian
              </p>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
              <h4 className="text-sm font-semibold">Preview di Mesin Pencari</h4>
              <div className="space-y-1 text-xs">
                <div className="text-blue-600 font-medium truncate">
                  {currentPage.meta_title || "Judul halaman"}
                </div>
                <div className="text-green-700 text-xs truncate">
                  https://example.com/{selectedPage === "home" ? "" : selectedPage}
                </div>
                <div className="text-gray-600 line-clamp-2">
                  {currentPage.meta_description || "Deskripsi halaman akan ditampilkan di sini"}
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan SEO"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Google Search Console Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Google Search Console</CardTitle>
          <CardDescription>Verifikasi kepemilikan situs Anda di Google Search Console</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google_verification">Google Site Verification Code</Label>
            <Input
              id="google_verification"
              value={googleVerification}
              onChange={(e) => setGoogleVerification(e.target.value)}
              placeholder="Contoh: SrBzGpm9hZ7L3E..."
            />
            <p className="text-xs text-muted-foreground">
              Masukkan kode verifikasi dari meta tag Google Search Console. 
              Hanya kodenya saja (isi dari atribut <code>content</code>).
            </p>
          </div>
          <div className="bg-muted/50 p-3 rounded-md text-xs space-y-2">
            <p className="font-semibold">Cara mendapatkan kode:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Buka <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Search Console</a></li>
              <li>Tambahkan Properti baru (URL Prefix)</li>
              <li>Pilih metode verifikasi <strong>"HTML Tag"</strong></li>
              <li>Salin kode yang ada di dalam tanda kutip <code>content="..."</code></li>
              <li>Tempelkan kode tersebut di atas dan klik Simpan</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Robots.txt dan Sitemap Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Lanjutan</CardTitle>
          <CardDescription>Kontrol pengindeksan dan sitemap</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>robots.txt</strong> dan <strong>sitemap.xml</strong> secara otomatis dihasilkan berdasarkan pengaturan di atas. Pastikan server Anda mengakses file-file ini untuk SEO optimal.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 text-sm">
            <p><strong>Lokasi robots.txt:</strong> <code className="bg-muted px-2 py-1 rounded">/robots.txt</code></p>
            <p><strong>Lokasi sitemap.xml:</strong> <code className="bg-muted px-2 py-1 rounded">/sitemap.xml</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
