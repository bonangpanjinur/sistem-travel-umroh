import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HeaderFooterSettingsProps {
  settings: WebsiteSettings;
}

interface CTAButton {
  text: string;
  link: string;
  style: "primary" | "secondary" | "outline";
}

interface HeaderSettings {
  sticky_enabled: boolean;
  cta_button: CTAButton | null;
}

interface FooterSettings {
  newsletter_enabled: boolean;
  newsletter_title: string;
  newsletter_description: string;
  legal_pages_enabled: boolean;
}

export function HeaderFooterSettings({ settings }: HeaderFooterSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>({
    sticky_enabled: false,
    cta_button: null,
  });
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    newsletter_enabled: false,
    newsletter_title: "Berlangganan Newsletter",
    newsletter_description: "Dapatkan informasi terbaru tentang paket umroh dan promosi eksklusif",
    legal_pages_enabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ctaForm, setCtaForm] = useState<CTAButton>({
    text: "Daftar Sekarang",
    link: "/register",
    style: "primary",
  });

  // Load settings from localStorage
  useEffect(() => {
    const storedHeader = localStorage.getItem("header_settings");
    const storedFooter = localStorage.getItem("footer_settings");

    if (storedHeader) {
      setHeaderSettings(JSON.parse(storedHeader));
    }
    if (storedFooter) {
      setFooterSettings(JSON.parse(storedFooter));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("header_settings", JSON.stringify(headerSettings));
      localStorage.setItem("footer_settings", JSON.stringify(footerSettings));

      // Update website settings
      updateSettings.mutate({
        footer_description: footerSettings.newsletter_description,
      });

      toast.success("Pengaturan header & footer berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCTA = () => {
    if (!ctaForm.text.trim() || !ctaForm.link.trim()) {
      toast.error("Teks dan link CTA tidak boleh kosong");
      return;
    }

    setHeaderSettings((prev) => ({
      ...prev,
      cta_button: ctaForm,
    }));

    setCtaForm({
      text: "Daftar Sekarang",
      link: "/register",
      style: "primary",
    });
    setIsDialogOpen(false);
    toast.success("CTA button berhasil ditambahkan");
  };

  const handleRemoveCTA = () => {
    setHeaderSettings((prev) => ({
      ...prev,
      cta_button: null,
    }));
    toast.success("CTA button berhasil dihapus");
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kustomisasi header dan footer untuk meningkatkan user experience dan konversi pengunjung menjadi pelanggan.
        </AlertDescription>
      </Alert>

      {/* Header Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Header</CardTitle>
          <CardDescription>Konfigurasi tampilan dan fungsi header website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sticky Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h4 className="font-semibold">Sticky Header</h4>
                <p className="text-sm text-muted-foreground">
                  Header tetap terlihat saat pengunjung menggulir halaman
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={headerSettings.sticky_enabled}
                  onChange={(e) =>
                    setHeaderSettings((prev) => ({
                      ...prev,
                      sticky_enabled: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  {headerSettings.sticky_enabled ? "Aktif" : "Nonaktif"}
                </span>
              </label>
            </div>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Call-to-Action Button</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {headerSettings.cta_button ? "Edit" : "Tambah"}
              </Button>
            </div>

            {headerSettings.cta_button && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{headerSettings.cta_button.text}</p>
                    <p className="text-sm text-muted-foreground">{headerSettings.cta_button.link}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCTA}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Preview */}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="flex gap-2">
                    <button
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        headerSettings.cta_button.style === "primary"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : headerSettings.cta_button.style === "secondary"
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          : "border border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {headerSettings.cta_button.text}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Footer</CardTitle>
          <CardDescription>Konfigurasi tampilan dan konten footer website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Newsletter Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h4 className="font-semibold">Newsletter Form</h4>
                <p className="text-sm text-muted-foreground">
                  Formulir berlangganan newsletter di footer
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerSettings.newsletter_enabled}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      newsletter_enabled: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  {footerSettings.newsletter_enabled ? "Aktif" : "Nonaktif"}
                </span>
              </label>
            </div>

            {footerSettings.newsletter_enabled && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="newsletter_title">Judul Newsletter</Label>
                  <Input
                    id="newsletter_title"
                    value={footerSettings.newsletter_title}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        newsletter_title: e.target.value,
                      }))
                    }
                    placeholder="Berlangganan Newsletter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newsletter_description">Deskripsi</Label>
                  <Textarea
                    id="newsletter_description"
                    value={footerSettings.newsletter_description}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        newsletter_description: e.target.value,
                      }))
                    }
                    placeholder="Deskripsi newsletter"
                    className="min-h-[60px] resize-none"
                  />
                </div>

                {/* Preview */}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="border rounded p-4 bg-white space-y-2">
                    <h4 className="font-semibold text-sm">{footerSettings.newsletter_title}</h4>
                    <p className="text-xs text-muted-foreground">{footerSettings.newsletter_description}</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Masukkan email Anda"
                        className="flex-1 px-3 py-2 border rounded text-sm"
                        disabled
                      />
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">
                        Berlangganan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legal Pages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <h4 className="font-semibold">Halaman Legal</h4>
                <p className="text-sm text-muted-foreground">
                  Tampilkan link ke Syarat & Ketentuan dan Kebijakan Privasi di footer
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerSettings.legal_pages_enabled}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      legal_pages_enabled: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  {footerSettings.legal_pages_enabled ? "Aktif" : "Nonaktif"}
                </span>
              </label>
            </div>

            {footerSettings.legal_pages_enabled && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                <p className="text-sm text-muted-foreground">Link legal pages yang akan ditampilkan:</p>
                <ul className="text-sm space-y-1">
                  <li>• <a href="/terms" className="text-primary hover:underline">Syarat & Ketentuan</a></li>
                  <li>• <a href="/privacy" className="text-primary hover:underline">Kebijakan Privasi</a></li>
                  <li>• <a href="/faq" className="text-primary hover:underline">FAQ</a></li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
      </Button>

      {/* CTA Button Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {headerSettings.cta_button ? "Edit CTA Button" : "Tambah CTA Button"}
            </DialogTitle>
            <DialogDescription>
              Konfigurasi tombol Call-to-Action yang akan ditampilkan di header
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">Teks Button *</Label>
              <Input
                id="cta_text"
                value={ctaForm.text}
                onChange={(e) => setCtaForm((prev) => ({ ...prev, text: e.target.value }))}
                placeholder="Contoh: Daftar Sekarang"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_link">Link/URL *</Label>
              <Input
                id="cta_link"
                value={ctaForm.link}
                onChange={(e) => setCtaForm((prev) => ({ ...prev, link: e.target.value }))}
                placeholder="Contoh: /register atau https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_style">Gaya Button</Label>
              <select
                id="cta_style"
                value={ctaForm.style}
                onChange={(e) => setCtaForm((prev) => ({ ...prev, style: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="primary">Primary (Warna Utama)</option>
                <option value="secondary">Secondary (Warna Sekunder)</option>
                <option value="outline">Outline (Garis Tepi)</option>
              </select>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <button
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  ctaForm.style === "primary"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : ctaForm.style === "secondary"
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "border border-input bg-background hover:bg-accent"
                }`}
              >
                {ctaForm.text}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddCTA}>
              <Save className="h-4 w-4 mr-2" />
              Simpan CTA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
