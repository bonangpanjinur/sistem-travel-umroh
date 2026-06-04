import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Globe, Save, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const PREF_KEY = "vinstour_prefs";

interface Prefs {
  language: "id" | "en" | "ar";
  notif_payment: boolean;
  notif_booking: boolean;
  notif_announcement: boolean;
  notif_visa: boolean;
  notif_departure: boolean;
  notif_promo: boolean;
}

const DEFAULT_PREFS: Prefs = {
  language: "id",
  notif_payment: true,
  notif_booking: true,
  notif_announcement: true,
  notif_visa: true,
  notif_departure: true,
  notif_promo: false,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { }
  return { ...DEFAULT_PREFS };
}

interface NotifToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function NotifToggle({ label, description, checked, onChange }: NotifToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    setSaving(false);
    toast.success("Preferensi berhasil disimpan!");
  };

  return (
    <div className="space-y-4">
      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Bahasa Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm">Pilih Bahasa</Label>
            <Select value={prefs.language} onValueChange={v => set("language", v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ar">🇸🇦 العربية</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pengaturan bahasa berlaku saat refresh halaman.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Preferensi Notifikasi
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pilih jenis notifikasi yang ingin Anda terima
          </p>
        </CardHeader>
        <CardContent className="divide-y">
          <NotifToggle
            label="Pembayaran"
            description="Konfirmasi, pengingat, dan status verifikasi pembayaran"
            checked={prefs.notif_payment}
            onChange={v => set("notif_payment", v)}
          />
          <NotifToggle
            label="Booking"
            description="Update status booking dan konfirmasi pemesanan"
            checked={prefs.notif_booking}
            onChange={v => set("notif_booking", v)}
          />
          <NotifToggle
            label="Pengumuman Muthawif"
            description="Informasi mendadak dari pembimbing perjalanan"
            checked={prefs.notif_announcement}
            onChange={v => set("notif_announcement", v)}
          />
          <NotifToggle
            label="Visa & Dokumen"
            description="Update status proses visa dan kelengkapan dokumen"
            checked={prefs.notif_visa}
            onChange={v => set("notif_visa", v)}
          />
          <NotifToggle
            label="Jadwal Keberangkatan"
            description="Pengingat H-7, H-3, dan H-1 sebelum keberangkatan"
            checked={prefs.notif_departure}
            onChange={v => set("notif_departure", v)}
          />
          <Separator className="my-1" />
          <NotifToggle
            label="Promo & Penawaran"
            description="Info paket baru, diskon, dan penawaran spesial"
            checked={prefs.notif_promo}
            onChange={v => set("notif_promo", v)}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Menyimpan..." : "Simpan Preferensi"}
      </Button>
    </div>
  );
}
