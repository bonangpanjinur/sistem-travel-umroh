import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhatsAppButtonSettingsProps {
  settings: WebsiteSettings;
}

interface WhatsAppSettings {
  enabled: boolean;
  phone_number: string;
  message: string;
  position: "bottom-right" | "bottom-left";
  show_preview: boolean;
}

export function WhatsAppButtonSettings({ settings }: WhatsAppButtonSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    enabled: false,
    phone_number: settings.footer_whatsapp || "",
    message: "Halo! Ada yang bisa saya bantu?",
    position: "bottom-right",
    show_preview: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("whatsapp_button_settings");
    if (stored) {
      setWhatsappSettings(JSON.parse(stored));
    }
  }, []);

  const handleSave = async () => {
    if (whatsappSettings.enabled && !whatsappSettings.phone_number.trim()) {
      toast.error("Nomor WhatsApp tidak boleh kosong");
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem("whatsapp_button_settings", JSON.stringify(whatsappSettings));

      // Update website settings with WhatsApp number
      if (whatsappSettings.phone_number) {
        updateSettings.mutate({
          footer_whatsapp: whatsappSettings.phone_number,
        });
      }

      toast.success("Pengaturan WhatsApp button berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return "62" + cleaned.substring(1);
    }
    if (!cleaned.startsWith("62")) {
      return "62" + cleaned;
    }
    return cleaned;
  };

  const formattedPhone = formatPhoneNumber(whatsappSettings.phone_number);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappSettings.message)}`;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Tombol WhatsApp mengambang memudahkan pengunjung untuk menghubungi Anda langsung. Pastikan nomor WhatsApp aktif dan siap melayani.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan WhatsApp Button</CardTitle>
          <CardDescription>Konfigurasi tombol WhatsApp yang mengambang di halaman website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <h4 className="font-semibold">Status WhatsApp Button</h4>
              <p className="text-sm text-muted-foreground">
                {whatsappSettings.enabled ? "Tombol WhatsApp sedang aktif" : "Tombol WhatsApp sedang nonaktif"}
              </p>
            </div>
            <Button
              variant={whatsappSettings.enabled ? "default" : "outline"}
              onClick={() =>
                setWhatsappSettings((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
            >
              {whatsappSettings.enabled ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Aktif
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Nonaktif
                </>
              )}
            </Button>
          </div>

          {whatsappSettings.enabled && (
            <>
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone_number">Nomor WhatsApp *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={whatsappSettings.phone_number}
                  onChange={(e) =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 0812-3456-7890 atau +62812-3456-7890"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 08XX-XXXX-XXXX atau +6281X-XXXX-XXXX
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Pesan Sambutan</Label>
                <Textarea
                  id="message"
                  value={whatsappSettings.message}
                  onChange={(e) =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Halo! Ada yang bisa saya bantu?"
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Pesan ini akan dikirim otomatis saat pengunjung membuka chat WhatsApp
                </p>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position">Posisi Tombol</Label>
                <Select
                  value={whatsappSettings.position}
                  onValueChange={(value: any) =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      position: value,
                    }))
                  }
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Kanan Bawah</SelectItem>
                    <SelectItem value="bottom-left">Kiri Bawah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      show_preview: !prev.show_preview,
                    }))
                  }
                  className="w-full"
                >
                  {whatsappSettings.show_preview ? "Sembunyikan Preview" : "Tampilkan Preview"}
                </Button>

                {whatsappSettings.show_preview && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <p className="text-sm font-semibold">Preview Tombol:</p>
                    <div
                      className={`relative h-64 border rounded-lg bg-white flex items-end ${
                        whatsappSettings.position === "bottom-right"
                          ? "justify-end"
                          : "justify-start"
                      } p-4`}
                    >
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all transform hover:scale-110`}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.946 1.347l-.355.192-.368-.06a9.879 9.879 0 00-3.464.608l.564 2.173 1.888-.959a9.877 9.877 0 018.368 1.215l.341-.11a9.876 9.876 0 015.52 5.588l-.424.254a9.87 9.87 0 01-1.141 4.769l2.6-1.298a9.877 9.877 0 001.186-15.864 9.873 9.873 0 00-8.777-3.52z" />
                        </svg>
                      </a>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1">
                      <p className="text-xs font-semibold text-green-900">Pesan yang akan dikirim:</p>
                      <p className="text-sm text-green-800">{whatsappSettings.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Pastikan nomor WhatsApp aktif dan siap menerima pesan</p>
          <p>✓ Gunakan pesan sambutan yang ramah dan informatif</p>
          <p>✓ Pilih posisi yang tidak menghalangi konten penting</p>
          <p>✓ Tombol akan otomatis menyembunyikan diri jika nomor kosong</p>
        </CardContent>
      </Card>
    </div>
  );
}
