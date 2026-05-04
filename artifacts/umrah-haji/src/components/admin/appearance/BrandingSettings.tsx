import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Image, Save, Upload, Loader2, Settings2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImage, getImageDimensions, formatFileSize } from "@/lib/image-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BrandingSettingsProps {
  settings: WebsiteSettings;
}

interface ImageUploadState {
  file: File | null;
  preview: string;
  originalDimensions: { width: number; height: number } | null;
  targetWidth: number;
  targetHeight: number;
  processing: boolean;
}

export function BrandingSettings({ settings }: BrandingSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [uploading, setUploading] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<"logo_url" | "favicon_url" | null>(null);
  const [imageState, setImageState] = useState<ImageUploadState>({
    file: null,
    preview: "",
    originalDimensions: null,
    targetWidth: 200,
    targetHeight: 60,
    processing: false,
  });
  
  const [formData, setFormData] = useState({
    company_name: settings.company_name || "",
    tagline: settings.tagline || "",
    logo_url: settings.logo_url || "",
    favicon_url: settings.favicon_url || "",
    footer_address: settings.footer_address || "",
    footer_phone: settings.footer_phone || "",
    footer_email: settings.footer_email || "",
    footer_whatsapp: settings.footer_whatsapp || "",
    social_instagram: settings.social_instagram || "",
    social_facebook: settings.social_facebook || "",
    social_youtube: settings.social_youtube || "",
    social_tiktok: settings.social_tiktok || "",
    meta_title: settings.meta_title || "",
    meta_description: settings.meta_description || "",
  });

  const { getSetting, isLoading: loadingCompany } = useCompanySettings();

  useEffect(() => {
    if (!loadingCompany) {
      setFormData({
        company_name: getSetting("company_name") || settings.company_name || "",
        tagline: settings.tagline || "",
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        footer_address: getSetting("company_address") || settings.footer_address || "",
        footer_phone: getSetting("company_phone") || settings.footer_phone || "",
        footer_email: getSetting("company_email") || settings.footer_email || "",
        footer_whatsapp: settings.footer_whatsapp || "",
        social_instagram: settings.social_instagram || "",
        social_facebook: settings.social_facebook || "",
        social_youtube: settings.social_youtube || "",
        social_tiktok: settings.social_tiktok || "",
        meta_title: settings.meta_title || "",
        meta_description: settings.meta_description || "",
      });
    }
  }, [settings, loadingCompany, getSetting]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  const openImageDialog = async (field: "logo_url" | "favicon_url", file: File) => {
    try {
      const dimensions = await getImageDimensions(file);
      const preview = URL.createObjectURL(file);
      
      // Set default target dimensions based on field type
      const isFavicon = field === "favicon_url";
      const defaultWidth = isFavicon ? 64 : Math.min(dimensions.width, 400);
      const defaultHeight = isFavicon ? 64 : Math.min(dimensions.height, 200);
      
      setImageState({
        file,
        preview,
        originalDimensions: dimensions,
        targetWidth: defaultWidth,
        targetHeight: defaultHeight,
        processing: false,
      });
      setCurrentField(field);
      setImageDialogOpen(true);
    } catch (error) {
      toast.error("Gagal membaca file gambar");
    }
  };

  const handleWidthChange = (value: number[]) => {
    if (!imageState.originalDimensions) return;
    
    const newWidth = value[0];
    const aspectRatio = imageState.originalDimensions.height / imageState.originalDimensions.width;
    const newHeight = Math.round(newWidth * aspectRatio);
    
    setImageState((prev) => ({
      ...prev,
      targetWidth: newWidth,
      targetHeight: newHeight,
    }));
  };

  const handleConfirmUpload = async () => {
    if (!imageState.file || !currentField) return;
    
    setImageState((prev) => ({ ...prev, processing: true }));
    setUploading(currentField);
    
    try {
      // Resize the image
      const resizedBlob = await resizeImage(imageState.file, {
        maxWidth: imageState.targetWidth,
        maxHeight: imageState.targetHeight,
        quality: 0.95,
        format: 'image/png',
      });

      const fileExt = 'png';
      const fileName = `${currentField.replace('_url', '')}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(fileName, resizedBlob, { 
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("website-assets")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, [currentField]: publicUrl }));
      toast.success("Gambar berhasil diupload dan di-resize");
      setImageDialogOpen(false);
    } catch (error: any) {
      toast.error(`Gagal upload: ${error.message}`);
    } finally {
      setUploading(null);
      setImageState((prev) => ({ ...prev, processing: false }));
      if (imageState.preview) {
        URL.revokeObjectURL(imageState.preview);
      }
    }
  };

  const closeImageDialog = () => {
    if (imageState.preview) {
      URL.revokeObjectURL(imageState.preview);
    }
    setImageDialogOpen(false);
    setCurrentField(null);
    setImageState({
      file: null,
      preview: "",
      originalDimensions: null,
      targetWidth: 200,
      targetHeight: 60,
      processing: false,
    });
  };

  const isFavicon = currentField === "favicon_url";
  const maxSliderWidth = isFavicon ? 128 : 600;
  const minSliderWidth = isFavicon ? 16 : 50;

  return (
    <>
      {/* Image Resize Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={(open) => !open && closeImageDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Sesuaikan Ukuran {isFavicon ? "Favicon" : "Logo"}
            </DialogTitle>
            <DialogDescription>
              Atur ukuran gambar sebelum upload. Aspek rasio akan dipertahankan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="border rounded-lg p-4 bg-muted/50">
                {imageState.preview && (
                  <img
                    src={imageState.preview}
                    alt="Preview"
                    style={{
                      width: Math.min(imageState.targetWidth, 300),
                      height: 'auto',
                      maxHeight: 200,
                      objectFit: 'contain',
                    }}
                    className="rounded"
                  />
                )}
              </div>
            </div>
            
            {/* Original dimensions info */}
            {imageState.originalDimensions && (
              <div className="text-center text-sm text-muted-foreground">
                Ukuran asli: {imageState.originalDimensions.width} × {imageState.originalDimensions.height} px
                {imageState.file && ` (${formatFileSize(imageState.file.size)})`}
              </div>
            )}
            
            {/* Width slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Lebar Target</Label>
                <span className="text-sm font-medium">
                  {imageState.targetWidth} × {imageState.targetHeight} px
                </span>
              </div>
              <Slider
                value={[imageState.targetWidth]}
                onValueChange={handleWidthChange}
                min={minSliderWidth}
                max={maxSliderWidth}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{minSliderWidth}px</span>
                <span>{maxSliderWidth}px</span>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              {isFavicon ? (
                <p>💡 Rekomendasi: 32×32 atau 64×64 pixel untuk favicon optimal</p>
              ) : (
                <p>💡 Rekomendasi: 200-400px lebar untuk logo yang tajam di semua perangkat</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeImageDialog}>
              Batal
            </Button>
            <Button onClick={handleConfirmUpload} disabled={imageState.processing}>
              {imageState.processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Upload ({imageState.targetWidth}×{imageState.targetHeight})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              <div>
                <CardTitle>Branding & Identitas</CardTitle>
                <CardDescription>
                  Konfigurasi logo, nama perusahaan, dan informasi kontak
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
        {/* Logo & Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo & Favicon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo Utama</Label>
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="h-16 w-auto object-contain bg-muted rounded"
                  />
                ) : (
                  <div className="h-16 w-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                    No Logo
                  </div>
                )}
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openImageDialog("logo_url", file);
                    }}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading === "logo_url"}>
                    <span className="cursor-pointer">
                      {uploading === "logo_url" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Logo
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG/JPG, akan di-resize otomatis. Klik upload untuk menyesuaikan ukuran.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex items-center gap-4">
                {formData.favicon_url ? (
                  <img
                    src={formData.favicon_url}
                    alt="Favicon"
                    className="h-8 w-8 object-contain bg-muted rounded"
                  />
                ) : (
                  <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    ?
                  </div>
                )}
                <label>
                  <input
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openImageDialog("favicon_url", file);
                    }}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading === "favicon_url"}>
                    <span className="cursor-pointer">
                      {uploading === "favicon_url" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Favicon
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Icon tab browser. Klik upload untuk menyesuaikan ukuran (32×32 atau 64×64 px).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Perusahaan</CardTitle>
            <CardDescription className="text-xs text-amber-600 font-medium">
              Data ini diambil dari Master Data Informasi Perusahaan. Silakan edit melalui tab "Informasi Perusahaan".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan</Label>
              <Input
                value={formData.company_name}
                disabled
                className="bg-muted"
                placeholder="Extraordinary Umroh"
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={formData.tagline}
                onChange={(e) => handleChange("tagline", e.target.value)}
                placeholder="Perjalanan Spiritual Menuju Baitullah"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Kontak</CardTitle>
            <CardDescription className="text-xs text-amber-600 font-medium">
              Data ini diambil dari Master Data Informasi Perusahaan. Silakan edit melalui tab "Informasi Perusahaan".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                value={formData.footer_address}
                disabled
                className="bg-muted"
                placeholder="Jl. Contoh No. 123, Jakarta"
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={formData.footer_phone}
                  disabled
                  className="bg-muted"
                  placeholder="+62 21 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.footer_whatsapp}
                  disabled
                  className="bg-muted"
                  placeholder="+62 812 3456 7890"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.footer_email}
                disabled
                className="bg-muted"
                placeholder="info@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Media Sosial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={formData.social_instagram}
                  onChange={(e) => handleChange("social_instagram", e.target.value)}
                  placeholder="https://instagram.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input
                  value={formData.social_facebook}
                  onChange={(e) => handleChange("social_facebook", e.target.value)}
                  placeholder="https://facebook.com/page"
                />
              </div>
              <div className="space-y-2">
                <Label>YouTube</Label>
                <Input
                  value={formData.social_youtube}
                  onChange={(e) => handleChange("social_youtube", e.target.value)}
                  placeholder="https://youtube.com/channel"
                />
              </div>
              <div className="space-y-2">
                <Label>TikTok</Label>
                <Input
                  value={formData.social_tiktok}
                  onChange={(e) => handleChange("social_tiktok", e.target.value)}
                  placeholder="https://tiktok.com/@username"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">SEO & Meta Tags</CardTitle>
            <CardDescription>
              Pengaturan untuk optimasi mesin pencari
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                value={formData.meta_title}
                onChange={(e) => handleChange("meta_title", e.target.value)}
                placeholder="Extraordinary Umroh - Perjalanan Spiritual Menuju Baitullah"
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_title.length}/60 karakter (rekomendasi maks 60)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={formData.meta_description}
                onChange={(e) => handleChange("meta_description", e.target.value)}
                placeholder="Layanan perjalanan umroh dan haji terpercaya..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_description.length}/160 karakter (rekomendasi maks 160)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
