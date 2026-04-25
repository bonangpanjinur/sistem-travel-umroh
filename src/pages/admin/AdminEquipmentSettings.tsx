import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Printer, Bell } from "lucide-react";

import {
  getEquipmentSettings,
  upsertEquipmentSetting,
  getNotificationSettings,
  updateNotificationSettings,
} from "@/features/equipment/queries";
import type { EquipmentSettings, EquipmentNotificationSettings } from "@/features/equipment/dto";

export default function AdminEquipmentSettings() {
  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ["equipment-settings"],
    queryFn: getEquipmentSettings,
  });

  const { data: notifSettings } = useQuery({
    queryKey: ["equipment-notification-settings"],
    queryFn: getNotificationSettings,
  });

  const [settings, setSettings] = useState<EquipmentSettings>({
    showLogo: true,
    logoUrl: "",
    companyName: "Vins Tour Travel",
    showAddress: true,
    showContact: true,
    themeColor: "#3B82F6",
    fontSize: "12",
    paperSize: "A4",
    extras: {},
  });

  const [notifications, setNotifications] = useState<
    Pick<EquipmentNotificationSettings, "enabled" | "notifyAdmins" | "notifyPic" | "lowStockThresholdDefault">
  >({
    enabled: true,
    notifyAdmins: true,
    notifyPic: true,
    lowStockThresholdDefault: 10,
  });

  // Hydrate local state when remote settings load.
  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  useEffect(() => {
    if (notifSettings) {
      setNotifications({
        enabled: notifSettings.enabled,
        notifyAdmins: notifSettings.notifyAdmins,
        notifyPic: notifSettings.notifyPic,
        lowStockThresholdDefault: notifSettings.lowStockThresholdDefault,
      });
    }
  }, [notifSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => upsertEquipmentSetting(key, value),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNotifMutation = useMutation({
    mutationFn: async () => {
      if (!notifSettings) throw new Error("Pengaturan notifikasi belum siap");
      await updateNotificationSettings(notifSettings.id, notifications);
    },
    onSuccess: () => {
      toast.success("Pengaturan notifikasi disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-notification-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveManifest = async () => {
    const entries: Array<[string, string]> = [
      ["show_logo", String(settings.showLogo)],
      ["logo_url", settings.logoUrl],
      ["company_name", settings.companyName],
      ["show_address", String(settings.showAddress)],
      ["show_contact", String(settings.showContact)],
      ["theme_color", settings.themeColor],
      ["font_size", settings.fontSize],
      ["paper_size", settings.paperSize],
    ];
    try {
      await Promise.all(entries.map(([key, value]) => updateSettingsMutation.mutateAsync({ key, value })));
      toast.success("Pengaturan disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-settings"] });
    } catch {
      // Error already toasted by mutation.
    }
  };

  const handleSaveNotifications = () => updateNotifMutation.mutate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Perlengkapan</h1>
        <p className="text-muted-foreground">Konfigurasi tampilan dan notifikasi</p>
      </div>

      <Tabs defaultValue="manifest" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manifest" className="gap-2">
            <Printer className="h-4 w-4" />
            Tampilan Manifest
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manifest">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Tampilan Manifest</CardTitle>
              <CardDescription>Konfigurasi bagaimana manifest akan dicetak</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Logo</Label>
                    <Switch
                      checked={settings.showLogo}
                      onCheckedChange={(checked) => setSettings((s) => ({ ...s, showLogo: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Logo</Label>
                    <Input
                      value={settings.logoUrl}
                      onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Perusahaan</Label>
                    <Input
                      value={settings.companyName}
                      onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Alamat</Label>
                    <Switch
                      checked={settings.showAddress}
                      onCheckedChange={(checked) => setSettings((s) => ({ ...s, showAddress: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Kontak</Label>
                    <Switch
                      checked={settings.showContact}
                      onCheckedChange={(checked) => setSettings((s) => ({ ...s, showContact: checked }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Warna Tema</Label>
                      <Input
                        type="color"
                        value={settings.themeColor}
                        onChange={(e) => setSettings((s) => ({ ...s, themeColor: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ukuran Kertas</Label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={settings.paperSize}
                        onChange={(e) => setSettings((s) => ({ ...s, paperSize: e.target.value }))}
                      >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveManifest} className="w-full">
                Simpan Pengaturan Manifest
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi Low Stock</CardTitle>
              <CardDescription>Atur bagaimana notifikasi stock rendah dikirim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aktifkan Notifikasi</Label>
                    <p className="text-sm text-muted-foreground">Kirim notifikasi saat stock rendah</p>
                  </div>
                  <Switch
                    checked={notifications.enabled}
                    onCheckedChange={(checked) => setNotifications((n) => ({ ...n, enabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifikasi ke Admin</Label>
                    <p className="text-sm text-muted-foreground">Kirim ke semua admin</p>
                  </div>
                  <Switch
                    checked={notifications.notifyAdmins}
                    onCheckedChange={(checked) => setNotifications((n) => ({ ...n, notifyAdmins: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifikasi ke PIC</Label>
                    <p className="text-sm text-muted-foreground">Kirim ke penanggung jawab item</p>
                  </div>
                  <Switch
                    checked={notifications.notifyPic}
                    onCheckedChange={(checked) => setNotifications((n) => ({ ...n, notifyPic: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batas Default Stock Rendah</Label>
                  <Input
                    type="number"
                    min={1}
                    value={notifications.lowStockThresholdDefault}
                    onChange={(e) =>
                      setNotifications((n) => ({
                        ...n,
                        lowStockThresholdDefault: parseInt(e.target.value) || 10,
                      }))
                    }
                    className="max-w-[200px]"
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} className="w-full">
                Simpan Pengaturan Notifikasi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}