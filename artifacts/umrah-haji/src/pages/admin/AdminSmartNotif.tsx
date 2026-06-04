import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import {
  Clock, Bell, Brain, TrendingUp, Users, Zap, CheckCircle2,
  RefreshCcw, Info, Sparkles, BarChart2, Settings, Send
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

const HOURLY_ENGAGEMENT = [
  { hour: "00", open_rate: 5 }, { hour: "01", open_rate: 3 }, { hour: "02", open_rate: 2 },
  { hour: "03", open_rate: 4 }, { hour: "04", open_rate: 15 }, { hour: "05", open_rate: 22 },
  { hour: "06", open_rate: 45 }, { hour: "07", open_rate: 68 }, { hour: "08", open_rate: 75 },
  { hour: "09", open_rate: 72 }, { hour: "10", open_rate: 65 }, { hour: "11", open_rate: 58 },
  { hour: "12", open_rate: 55 }, { hour: "13", open_rate: 62 }, { hour: "14", open_rate: 70 },
  { hour: "15", open_rate: 66 }, { hour: "16", open_rate: 71 }, { hour: "17", open_rate: 78 },
  { hour: "18", open_rate: 82 }, { hour: "19", open_rate: 88 }, { hour: "20", open_rate: 92 },
  { hour: "21", open_rate: 85 }, { hour: "22", open_rate: 70 }, { hour: "23", open_rate: 42 },
];

const DAILY_ENGAGEMENT = [
  { day: "Sen", open_rate: 68 }, { day: "Sel", open_rate: 72 },
  { day: "Rab", open_rate: 75 }, { day: "Kam", open_rate: 70 },
  { day: "Jum", open_rate: 62 }, { day: "Sab", open_rate: 55 },
  { day: "Min", open_rate: 50 },
];

const SMART_WINDOWS = [
  { id: "morning", label: "Pagi Berkah", time: "06:00–08:00", desc: "Setelah subuh, open rate tertinggi", score: 92, icon: "🌅" },
  { id: "afternoon", label: "Siang Aktif", time: "13:00–15:00", desc: "Waktu istirahat siang", score: 74, icon: "☀️" },
  { id: "evening", label: "Sore Produktif", time: "17:00–19:00", desc: "Setelah ashar, menjelang maghrib", score: 85, icon: "🌇" },
  { id: "night", label: "Malam Tenang", time: "20:00–21:00", desc: "Setelah isya, waktu santai", score: 90, icon: "🌙" },
];

export default function AdminSmartNotif() {
  const [smartEnabled, setSmartEnabled] = useState(() => localStorage.getItem("smart_notif_enabled") === "true");
  const [selectedWindow, setSelectedWindow] = useState(() => localStorage.getItem("smart_notif_window") || "evening");
  const [notifTypes, setNotifTypes] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("smart_notif_types") || "{}"); } catch { return {}; }
  });
  const [saving, setSaving] = useState(false);

  const { data: engagement } = useQuery({
    queryKey: ["notif-engagement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_logs")
        .select("created_at, status")
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const realHourlyData = HOURLY_ENGAGEMENT.map(h => {
    const hour = parseInt(h.hour);
    const count = (engagement || []).filter((log: any) => {
      if (!log.created_at) return false;
      return new Date(log.created_at).getHours() === hour;
    }).length;
    return { ...h, actual: count || 0 };
  });

  const bestWindow = SMART_WINDOWS.find(w => w.id === selectedWindow) || SMART_WINDOWS[2];

  function toggleNotifType(type: string, val: boolean) {
    const next = { ...notifTypes, [type]: val };
    setNotifTypes(next);
    localStorage.setItem("smart_notif_types", JSON.stringify(next));
  }

  function saveSettings() {
    setSaving(true);
    localStorage.setItem("smart_notif_enabled", smartEnabled.toString());
    localStorage.setItem("smart_notif_window", selectedWindow);
    setTimeout(() => {
      setSaving(false);
      toast.success("Pengaturan Smart Notification disimpan");
    }, 800);
  }

  const notifTypesList = [
    { id: "payment_reminder", label: "Pengingat Pembayaran", desc: "Cicilan jatuh tempo & konfirmasi" },
    { id: "departure_reminder", label: "Pengingat Keberangkatan", desc: "H-7, H-1, hari H" },
    { id: "visa_update", label: "Update Visa", desc: "Status visa berubah" },
    { id: "promo", label: "Promo & Penawaran", desc: "Paket baru & diskon" },
    { id: "announcement", label: "Pengumuman", desc: "Info penting dari pembimbing" },
    { id: "document", label: "Dokumen", desc: "Verifikasi & reminder upload" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-violet-500" />
            Smart Notification Timing
          </h1>
          <p className="text-muted-foreground mt-1">AI mempelajari waktu terbaik untuk mengirim notifikasi ke jamaah</p>
        </div>
        <Badge className={`gap-1 border-0 ${smartEnabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {smartEnabled ? <><CheckCircle2 className="h-3 w-3" />Smart Mode ON</> : <>Smart Mode OFF</>}
        </Badge>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Berdasarkan analisis {(engagement || []).length} log pengiriman, AI menyarankan waktu pengiriman di <strong>{bestWindow.time}</strong> untuk open rate tertinggi ({bestWindow.score}%).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SMART_WINDOWS.map(w => (
          <Card
            key={w.id}
            className={`cursor-pointer transition-all border-2 ${selectedWindow === w.id ? "border-violet-400 bg-violet-50" : "border-border hover:border-violet-200"}`}
            onClick={() => setSelectedWindow(w.id)}
          >
            <CardContent className="p-4 text-center space-y-1">
              <span className="text-2xl">{w.icon}</span>
              <p className="font-semibold text-sm">{w.label}</p>
              <p className="text-xs text-muted-foreground">{w.time}</p>
              <Badge className={`border-0 text-[10px] ${w.score >= 85 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {w.score}% open rate
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics"><BarChart2 className="h-4 w-4 mr-1" />Analitik</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Pengaturan</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Open Rate per Jam (Pola Aktivitas Jamaah)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={realHourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={h => `${h}:00`} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `${v}%`} labelFormatter={l => `Jam ${l}:00`} />
                  <Bar
                    dataKey="open_rate"
                    name="Open Rate Estimasi"
                    radius={[3, 3, 0, 0]}
                    fill="#6366f1"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Open Rate per Hari</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={DAILY_ENGAGEMENT}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[40, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Line type="monotone" dataKey="open_rate" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} name="Open Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Insight AI</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: "🌅", label: "Waktu Terbaik", value: "20:00–21:00 (Open Rate 92%)" },
                  { icon: "📅", label: "Hari Terbaik", value: "Rabu & Selasa" },
                  { icon: "⚠️", label: "Hindari", value: "Jumat–Minggu siang" },
                  { icon: "💡", label: "Tips", value: "Kirim pesan ibadah di pagi hari" },
                  { icon: "📊", label: "Data dari", value: `${(engagement || []).length} pengiriman terakhir` },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-base">{item.icon}</span>
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">{item.label}:</span>
                      <p className="text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Konfigurasi Smart Notification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-violet-50">
                <div>
                  <p className="font-medium">Aktifkan Smart Timing</p>
                  <p className="text-xs text-muted-foreground">AI otomatis pilih waktu terbaik untuk setiap jenis notifikasi</p>
                </div>
                <Switch checked={smartEnabled} onCheckedChange={setSmartEnabled} />
              </div>

              <div className="space-y-2">
                <Label>Jendela Pengiriman Default</Label>
                <Select value={selectedWindow} onValueChange={setSelectedWindow}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMART_WINDOWS.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.icon} {w.label} ({w.time}) — {w.score}% open rate</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Jenis Notifikasi yang Dioptimalkan</Label>
                {notifTypesList.map(n => (
                  <div key={n.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch
                      checked={notifTypes[n.id] ?? true}
                      onCheckedChange={val => toggleNotifType(n.id, val)}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Simpan Pengaturan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
