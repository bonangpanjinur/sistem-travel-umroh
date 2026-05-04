import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnnouncementBarEditorProps {
  settings: WebsiteSettings;
}

interface AnnouncementSettings {
  enabled: boolean;
  text: string;
  background_color: string;
  text_color: string;
  type: "info" | "warning" | "success" | "error";
  dismissible: boolean;
}

export function AnnouncementBarEditor({ settings }: AnnouncementBarEditorProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>({
    enabled: false,
    text: "",
    background_color: "#3b82f6",
    text_color: "#ffffff",
    type: "info",
    dismissible: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load announcement settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("announcement_bar_settings");
    if (stored) {
      setAnnouncement(JSON.parse(stored));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("announcement_bar_settings", JSON.stringify(announcement));

      // Also update website settings with announcement data
      updateSettings.mutate({
        // Store announcement in a custom field if needed
      });

      toast.success("Pengaturan announcement bar berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const typePresets = {
    info: { bg: "#3b82f6", text: "#ffffff", label: "Info" },
    warning: { bg: "#f59e0b", text: "#ffffff", label: "Peringatan" },
    success: { bg: "#10b981", text: "#ffffff", label: "Sukses" },
    error: { bg: "#ef4444", text: "#ffffff", label: "Error" },
  };

  const currentPreset = typePresets[announcement.type];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Announcement bar ditampilkan di bagian atas website untuk pengumuman penting, promosi, atau informasi mendesak.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Announcement Bar</CardTitle>
          <CardDescription>Konfigurasi bilah pengumuman di bagian atas website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <h4 className="font-semibold">Status Announcement Bar</h4>
              <p className="text-sm text-muted-foreground">
                {announcement.enabled ? "Announcement bar sedang aktif" : "Announcement bar sedang nonaktif"}
              </p>
            </div>
            <Button
              variant={announcement.enabled ? "default" : "outline"}
              onClick={() => setAnnouncement((prev) => ({ ...prev, enabled: !prev.enabled }))}
            >
              {announcement.enabled ? (
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

          {announcement.enabled && (
            <>
              {/* Announcement Text */}
              <div className="space-y-2">
                <Label htmlFor="text">Teks Pengumuman *</Label>
                <Textarea
                  id="text"
                  value={announcement.text}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="Contoh: Sisa 5 Seat untuk Keberangkatan Syawal! Daftar sekarang juga."
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">{announcement.text.length} karakter</p>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipe Pengumuman</Label>
                <Select value={announcement.type} onValueChange={(value: any) => {
                  setAnnouncement((prev) => ({
                    ...prev,
                    type: value,
                    background_color: typePresets[value].bg,
                    text_color: typePresets[value].text,
                  }));
                }}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (Biru)</SelectItem>
                    <SelectItem value="warning">Peringatan (Kuning)</SelectItem>
                    <SelectItem value="success">Sukses (Hijau)</SelectItem>
                    <SelectItem value="error">Error (Merah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bg_color">Warna Latar Belakang</Label>
                  <div className="flex gap-2">
                    <input
                      id="bg_color"
                      type="color"
                      value={announcement.background_color}
                      onChange={(e) =>
                        setAnnouncement((prev) => ({
                          ...prev,
                          background_color: e.target.value,
                        }))
                      }
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={announcement.background_color}
                      onChange={(e) =>
                        setAnnouncement((prev) => ({
                          ...prev,
                          background_color: e.target.value,
                        }))
                      }
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_color">Warna Teks</Label>
                  <div className="flex gap-2">
                    <input
                      id="text_color"
                      type="color"
                      value={announcement.text_color}
                      onChange={(e) =>
                        setAnnouncement((prev) => ({
                          ...prev,
                          text_color: e.target.value,
                        }))
                      }
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={announcement.text_color}
                      onChange={(e) =>
                        setAnnouncement((prev) => ({
                          ...prev,
                          text_color: e.target.value,
                        }))
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* Dismissible */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={announcement.dismissible}
                  onChange={(e) =>
                    setAnnouncement((prev) => ({
                      ...prev,
                      dismissible: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Izinkan pengunjung untuk menutup announcement bar</span>
              </label>

              {/* Preview */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full"
                >
                  {showPreview ? "Sembunyikan Preview" : "Tampilkan Preview"}
                </Button>

                {showPreview && (
                  <div
                    className="p-4 rounded-lg flex items-center justify-between gap-4 text-sm"
                    style={{
                      backgroundColor: announcement.background_color,
                      color: announcement.text_color,
                    }}
                  >
                    <span>{announcement.text || "Teks pengumuman akan ditampilkan di sini"}</span>
                    {announcement.dismissible && (
                      <button className="text-lg font-bold opacity-70 hover:opacity-100">×</button>
                    )}
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
          <p>✓ Gunakan teks yang singkat dan jelas untuk maksimal 2 baris</p>
          <p>✓ Pilih warna yang kontras untuk keterbacaan optimal</p>
          <p>✓ Aktifkan opsi "dismissible" agar pengunjung dapat menutupnya</p>
          <p>✓ Update announcement secara berkala untuk informasi terbaru</p>
        </CardContent>
      </Card>
    </div>
  );
}
