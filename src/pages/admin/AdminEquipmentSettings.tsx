import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Printer, Image, Bell } from "lucide-react";

interface EquipmentSettings {
  key: string;
  value: string;
}

export default function AdminEquipmentSettings() {
  const queryClient = useQueryClient();

  // Settings state
  const [settings, setSettings] = useState({
    show_logo: true,
    logo_url: "",
    company_name: "Vins Tour Travel",
    show_address: true,
    show_contact: true,
    theme_color: "#3B82F6",
    font_size: "12",
    paper_size: "A4"
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    enabled: true,
    notify_admins: true,
    notify_pic: true,
    low_stock_threshold: 10
  });

  // Fetch settings
  const { data: settingsData } = useQuery({
    queryKey: ["equipment-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_settings")
        .select("*");
      if (error) throw error;
      return data as EquipmentSettings[];
    },
  });

  // Fetch notification settings
  const { data: notifSettings } = useQuery({
    queryKey: ["equipment-notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_notification_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("equipment_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update notification settings mutation
  const updateNotifMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("equipment_notification_settings")
        .update({
          enabled: notifications.enabled,
          notify_admins: notifications.notify_admins,
          notify_pic: notifications.notify_pic,
          low_stock_threshold_default: notifications.low_stock_threshold,
          updated_at: new Date().toISOString()
        })
        .eq("id", notifSettings?.id || '');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengaturan notifikasi disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-notification-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveManifest = () => {
    Object.entries(settings).forEach(([key, value]) => {
      updateSettingsMutation.mutate({ key, value: String(value) });
    });
  };

  const handleSaveNotifications = () => {
    updateNotifMutation.mutate();
  };

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

        {/* Manifest Settings */}
        <TabsContent value="manifest">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Tampilan Manifest</CardTitle>
              <CardDescription>
                Konfigurasi bagaimana manifest akan dicetak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Logo</Label>
                    <Switch 
                      checked={settings.show_logo} 
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, show_logo: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Logo</Label>
                    <Input 
                      value={settings.logo_url} 
                      onChange={(e) => setSettings(s => ({ ...s, logo_url: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Perusahaan</Label>
                    <Input 
                      value={settings.company_name} 
                      onChange={(e) => setSettings(s => ({ ...s, company_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Alamat</Label>
                    <Switch 
                      checked={settings.show_address} 
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, show_address: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Tampilkan Kontak</Label>
                    <Switch 
                      checked={settings.show_contact} 
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, show_contact: checked }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Warna Tema</Label>
                      <Input 
                        type="color"
                        value={settings.theme_color} 
                        onChange={(e) => setSettings(s => ({ ...s, theme_color: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ukuran Kertas</Label>
                      <select 
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={settings.paper_size}
                        onChange={(e) => setSettings(s => ({ ...s, paper_size: e.target.value }))}
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

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi Low Stock</CardTitle>
              <CardDescription>
                Atur bagaimana notifikasi stock rendah dikirim
              </CardDescription>
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
                    onCheckedChange={(checked) => setNotifications(n => ({ ...n, enabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifikasi ke Admin</Label>
                    <p className="text-sm text-muted-foreground">Kirim ke semua admin</p>
                  </div>
                  <Switch 
                    checked={notifications.notify_admins} 
                    onCheckedChange={(checked) => setNotifications(n => ({ ...n, notify_admins: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifikasi ke PIC</Label>
                    <p className="text-sm text-muted-foreground">Kirim ke penanggung jawab item</p>
                  </div>
                  <Switch 
                    checked={notifications.notify_pic} 
                    onCheckedChange={(checked) => setNotifications(n => ({ ...n, notify_pic: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Batas Default Stock Rendah</Label>
                  <Input 
                    type="number"
                    min={1}
                    value={notifications.low_stock_threshold} 
                    onChange={(e) => setNotifications(n => ({ ...n, low_stock_threshold: parseInt(e.target.value) || 10 }))}
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