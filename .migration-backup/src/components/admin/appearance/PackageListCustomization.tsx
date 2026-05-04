import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PackageListCustomizationProps {
  settings: WebsiteSettings;
}

interface PackageBadge {
  id: string;
  name: string;
  color: string;
  condition: string;
}

interface PackageListSettings {
  filter_price_enabled: boolean;
  filter_month_enabled: boolean;
  filter_airline_enabled: boolean;
  sort_enabled: boolean;
  badges_enabled: boolean;
  price_display: "show_all" | "show_from" | "contact_for_price";
  custom_badges: PackageBadge[];
}

const DEFAULT_BADGES: PackageBadge[] = [
  {
    id: "1",
    name: "Promo",
    color: "#ef4444",
    condition: "Paket dengan harga khusus",
  },
  {
    id: "2",
    name: "Terlaris",
    color: "#f59e0b",
    condition: "Paket paling banyak dipesan",
  },
  {
    id: "3",
    name: "Terbatas",
    color: "#8b5cf6",
    condition: "Paket dengan seat terbatas",
  },
];

export function PackageListCustomization({ settings }: PackageListCustomizationProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [packageSettings, setPackageSettings] = useState<PackageListSettings>({
    filter_price_enabled: true,
    filter_month_enabled: true,
    filter_airline_enabled: true,
    sort_enabled: true,
    badges_enabled: true,
    price_display: "show_all",
    custom_badges: DEFAULT_BADGES,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("package_list_settings");
    if (stored) {
      setPackageSettings(JSON.parse(stored));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("package_list_settings", JSON.stringify(packageSettings));

      // Update website settings
      updateSettings.mutate({
        // Store in custom field if needed
      });

      toast.success("Pengaturan daftar paket berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFilter = (filter: keyof Omit<PackageListSettings, "badges_enabled" | "price_display" | "custom_badges">) => {
    setPackageSettings((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
  };

  const handleToggleBadges = () => {
    setPackageSettings((prev) => ({
      ...prev,
      badges_enabled: !prev.badges_enabled,
    }));
  };

  const handleUpdateBadge = (id: string, field: keyof PackageBadge, value: string) => {
    setPackageSettings((prev) => ({
      ...prev,
      custom_badges: prev.custom_badges.map((badge) =>
        badge.id === id ? { ...badge, [field]: value } : badge
      ),
    }));
  };

  const handleAddBadge = () => {
    const newBadge: PackageBadge = {
      id: Math.random().toString(36).substr(2, 9),
      name: "Badge Baru",
      color: "#3b82f6",
      condition: "",
    };
    setPackageSettings((prev) => ({
      ...prev,
      custom_badges: [...prev.custom_badges, newBadge],
    }));
  };

  const handleRemoveBadge = (id: string) => {
    setPackageSettings((prev) => ({
      ...prev,
      custom_badges: prev.custom_badges.filter((badge) => badge.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kustomisasi tampilan dan fitur daftar paket untuk meningkatkan pengalaman pengunjung dan konversi.
        </AlertDescription>
      </Alert>

      {/* Filter Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Filter & Sort</CardTitle>
          <CardDescription>Aktifkan atau nonaktifkan opsi filter dan pengurutan pada halaman paket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.filter_price_enabled}
                onChange={() => handleToggleFilter("filter_price_enabled")}
                className="rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Filter Harga</p>
                <p className="text-xs text-muted-foreground">Izinkan pengunjung memfilter paket berdasarkan harga</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.filter_month_enabled}
                onChange={() => handleToggleFilter("filter_month_enabled")}
                className="rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Filter Bulan Keberangkatan</p>
                <p className="text-xs text-muted-foreground">Izinkan pengunjung memfilter paket berdasarkan bulan keberangkatan</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.filter_airline_enabled}
                onChange={() => handleToggleFilter("filter_airline_enabled")}
                className="rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Filter Maskapai</p>
                <p className="text-xs text-muted-foreground">Izinkan pengunjung memfilter paket berdasarkan maskapai penerbangan</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.sort_enabled}
                onChange={() => handleToggleFilter("sort_enabled")}
                className="rounded border-gray-300"
              />
              <div>
                <p className="font-medium text-sm">Opsi Pengurutan</p>
                <p className="text-xs text-muted-foreground">Izinkan pengunjung mengurutkan paket (harga, durasi, rating)</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Price Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Tampilan Harga</CardTitle>
          <CardDescription>Pilih bagaimana harga paket ditampilkan kepada pengunjung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={packageSettings.price_display} onValueChange={(value: any) => {
            setPackageSettings((prev) => ({
              ...prev,
              price_display: value,
            }));
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="show_all">Tampilkan Semua Harga</SelectItem>
              <SelectItem value="show_from">Tampilkan "Mulai dari" Harga</SelectItem>
              <SelectItem value="contact_for_price">Hubungi untuk Harga</SelectItem>
            </SelectContent>
          </Select>

          <div className="p-3 border rounded-lg bg-muted/30 text-sm">
            {packageSettings.price_display === "show_all" && (
              <p>Semua harga paket akan ditampilkan secara lengkap kepada pengunjung.</p>
            )}
            {packageSettings.price_display === "show_from" && (
              <p>Hanya harga terendah yang ditampilkan dengan label "Mulai dari". Pengunjung dapat melihat harga lengkap setelah membuka detail paket.</p>
            )}
            {packageSettings.price_display === "contact_for_price" && (
              <p>Harga tidak ditampilkan. Pengunjung diminta menghubungi untuk mendapatkan informasi harga.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badge Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pengaturan Lencana Paket</CardTitle>
            <CardDescription>Kustomisasi lencana yang ditampilkan pada kartu paket</CardDescription>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={packageSettings.badges_enabled}
              onChange={handleToggleBadges}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">Aktifkan Lencana</span>
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          {packageSettings.badges_enabled && (
            <>
              <div className="space-y-3">
                {packageSettings.custom_badges.map((badge) => (
                  <div key={badge.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <Input
                            value={badge.name}
                            onChange={(e) => handleUpdateBadge(badge.id, "name", e.target.value)}
                            placeholder="Nama lencana"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBadge(badge.id)}
                      >
                        Hapus
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Warna</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={badge.color}
                            onChange={(e) => handleUpdateBadge(badge.id, "color", e.target.value)}
                            className="h-8 w-12 rounded border cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={badge.color}
                            onChange={(e) => handleUpdateBadge(badge.id, "color", e.target.value)}
                            placeholder="#3b82f6"
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Kondisi/Deskripsi</Label>
                        <Input
                          value={badge.condition}
                          onChange={(e) => handleUpdateBadge(badge.id, "condition", e.target.value)}
                          placeholder="Kapan lencana ini ditampilkan?"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleAddBadge} variant="outline" className="w-full">
                + Tambah Lencana Baru
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
      </Button>
    </div>
  );
}
