import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Clock, Lightbulb, Zap, MessageSquare, Bot,
  BarChart3, Send, Settings, RefreshCw, Megaphone, Globe, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  id: string;
  phase: number;
  code: string;
  title: string;
  description: string | null;
  status: "done" | "in_progress" | "planned" | "cancelled";
  target_date: string | null;
  sort_order: number;
}

const STATUS_CONFIG = {
  done:        { label: "Selesai",      icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500"  },
  in_progress: { label: "Dikerjakan",   icon: Zap,          color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500"   },
  planned:     { label: "Direncanakan", icon: Lightbulb,    color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400"  },
  cancelled:   { label: "Dibatalkan",   icon: Clock,        color: "bg-gray-100 text-gray-500 border-gray-200",     dot: "bg-gray-400"   },
};

const PHASE_CONFIG: Record<number, { title: string; subtitle: string; icon: React.ReactNode; color: string }> = {
  1: { title: "Fase 1 — Fondasi",        subtitle: "Kirim WA dasar, template, log",         icon: <MessageSquare className="h-5 w-5" />, color: "from-emerald-500 to-green-600" },
  2: { title: "Fase 2 — Multi-Provider", subtitle: "Provider dinamis, admin panel API key",  icon: <Settings className="h-5 w-5" />,      color: "from-blue-500 to-blue-700" },
  3: { title: "Fase 3 — Broadcast",      subtitle: "Kampanye massal, segmentasi penerima",   icon: <Megaphone className="h-5 w-5" />,      color: "from-orange-500 to-amber-600" },
  4: { title: "Fase 4 — Bot & Inbox",    subtitle: "Auto-reply, menu interaktif, inbox WA",  icon: <Bot className="h-5 w-5" />,            color: "from-purple-500 to-violet-600" },
  5: { title: "Fase 5 — Meta WABA",      subtitle: "WhatsApp Business API resmi Meta",       icon: <Globe className="h-5 w-5" />,          color: "from-sky-500 to-cyan-600" },
  6: { title: "Fase 6 — AI",             subtitle: "Smart send, pesan personal berbasis AI",  icon: <Sparkles className="h-5 w-5" />,       color: "from-rose-500 to-pink-600" },
};

// Static fallback roadmap (used when DB not yet seeded)
const STATIC_ROADMAP: RoadmapItem[] = [
  { id: "1",  phase: 1, code: "WA_BASIC_SEND",        title: "Kirim WA via Fonnte",              description: "Kirim pesan single & bulk via provider Fonnte", status: "done",        target_date: null, sort_order: 10 },
  { id: "2",  phase: 1, code: "WA_TEMPLATES_ENGINE",  title: "Template Pesan Dinamis",           description: "Variabel {nama}, {kode}, {tanggal} di template", status: "done",        target_date: null, sort_order: 20 },
  { id: "3",  phase: 1, code: "WA_SEND_LOGS",         title: "Log Pengiriman WA",                description: "Riwayat setiap pesan terkirim / gagal", status: "done",               target_date: null, sort_order: 30 },
  { id: "4",  phase: 1, code: "WA_BLAST_DEPARTURE",   title: "Broadcast per Keberangkatan",      description: "Kirim massal ke semua jamaah satu keberangkatan", status: "done",       target_date: null, sort_order: 40 },
  { id: "5",  phase: 1, code: "WA_BLAST_TAGIHAN",     title: "Broadcast Tagihan",                description: "Kirim reminder tagihan ke banyak jamaah sekaligus", status: "done",     target_date: null, sort_order: 50 },
  { id: "6",  phase: 1, code: "WA_AUTO_BOOKING",      title: "Notif Otomatis Booking/DP/Lunas",  description: "Auto-kirim WA saat booking/DP/lunas dikonfirmasi", status: "done",      target_date: null, sort_order: 60 },
  { id: "7",  phase: 2, code: "WA_MULTIPROVIDER",     title: "Multi-Provider (Fonnte/Wablas/…)", description: "Support banyak gateway WA, dipilih dari panel admin", status: "in_progress", target_date: null, sort_order: 70 },
  { id: "8",  phase: 2, code: "WA_ADMIN_KEY_PANEL",   title: "Panel Kelola API Key di Admin",    description: "Super admin/owner/IT simpan & ganti key dari UI", status: "in_progress",  target_date: null, sort_order: 80 },
  { id: "9",  phase: 2, code: "WA_AUTO_REMINDER",     title: "Auto-Jadwal Reminder Pembayaran",  description: "Buat baris reminder H-7/H-3 otomatis", status: "in_progress",            target_date: null, sort_order: 90 },
  { id: "10", phase: 3, code: "WA_BROADCAST_SEGMENT", title: "Broadcast Tersegmentasi",          description: "Filter: by paket, keberangkatan, status bayar", status: "planned",      target_date: null, sort_order: 100 },
  { id: "11", phase: 3, code: "WA_CAMPAIGN_MANAGER",  title: "Manajemen Kampanye Broadcast",     description: "Jadwal pengiriman, A/B template, statistik", status: "planned",          target_date: null, sort_order: 110 },
  { id: "12", phase: 3, code: "WA_DELIVERY_RECEIPT",  title: "Status Terkirim & Dibaca",         description: "Webhook status delivered/read dari provider", status: "planned",          target_date: null, sort_order: 120 },
  { id: "13", phase: 4, code: "WA_CHATBOT_KEYWORD",   title: "Auto-Reply Berbasis Kata Kunci",   description: "Balas otomatis jika jamaah kirim kata kunci", status: "planned",          target_date: null, sort_order: 130 },
  { id: "14", phase: 4, code: "WA_CHATBOT_MENU",      title: "Bot Menu Interaktif",              description: "Menu nomor (1. Cek booking, 2. Hubungi CS…)", status: "planned",          target_date: null, sort_order: 140 },
  { id: "15", phase: 4, code: "WA_INBOX",             title: "Inbox WA di Admin Panel",          description: "Lihat & balas pesan masuk dari admin panel", status: "planned",          target_date: null, sort_order: 150 },
  { id: "16", phase: 5, code: "WA_META_CLOUD",        title: "WhatsApp Cloud API (Meta/WABA)",   description: "Integrasi resmi Meta Business API", status: "planned",                   target_date: null, sort_order: 160 },
  { id: "17", phase: 5, code: "WA_CONTACT_MGMT",      title: "Manajemen Kontak WA",              description: "Sinkronisasi kontak jamaah ke daftar provider", status: "planned",       target_date: null, sort_order: 170 },
  { id: "18", phase: 6, code: "WA_AI_SMARTSEND",      title: "AI Smart Send",                    description: "AI pilih waktu optimal pengiriman per jamaah", status: "planned",         target_date: null, sort_order: 180 },
  { id: "19", phase: 6, code: "WA_AI_PERSONALIZE",    title: "Personalisasi Pesan via AI",       description: "AI buat variasi pesan berdasarkan profil jamaah", status: "planned",      target_date: null, sort_order: 190 },
];

function StatusBadge({ status }: { status: RoadmapItem["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge className={cn("border text-xs gap-1", cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export default function AdminWARoadmap() {
  const { data: dbItems } = useQuery<RoadmapItem[]>({
    queryKey: ["wa-roadmap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_feature_roadmap")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as RoadmapItem[];
    },
  });

  const items = (dbItems && dbItems.length > 0) ? dbItems : STATIC_ROADMAP;

  const totalDone = items.filter(i => i.status === "done").length;
  const totalInProgress = items.filter(i => i.status === "in_progress").length;
  const totalPlanned = items.filter(i => i.status === "planned").length;
  const overallPct = Math.round((totalDone / items.length) * 100);

  const phases = Array.from(new Set(items.map(i => i.phase))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Roadmap Pengembangan WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rencana lengkap fitur WhatsApp — notifikasi, broadcast, bot, dan integrasi lanjutan
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Fitur",   value: items.length,      color: "text-gray-700",   bg: "bg-gray-100" },
          { label: "Selesai",       value: totalDone,         color: "text-green-700",  bg: "bg-green-100" },
          { label: "Dikerjakan",    value: totalInProgress,   color: "text-blue-700",   bg: "bg-blue-100" },
          { label: "Direncanakan",  value: totalPlanned,      color: "text-amber-700",  bg: "bg-amber-100" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress Keseluruhan</span>
            <span className="text-sm font-bold text-blue-600">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {totalDone} dari {items.length} fitur selesai · {totalInProgress} sedang dikerjakan
          </p>
        </CardContent>
      </Card>

      {/* Per-phase sections */}
      {phases.map(phase => {
        const phaseItems = items.filter(i => i.phase === phase);
        const cfg = PHASE_CONFIG[phase];
        const phaseDone = phaseItems.filter(i => i.status === "done").length;
        const phaseInProg = phaseItems.filter(i => i.status === "in_progress").length;
        const phasePct = Math.round((phaseDone / phaseItems.length) * 100);
        const phaseStatus = phaseDone === phaseItems.length ? "done"
          : phaseInProg > 0 ? "in_progress" : "planned";

        return (
          <div key={phase} className="space-y-3">
            {/* Phase header */}
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-gradient-to-r", cfg?.color ?? "from-gray-500 to-gray-600")}>
                {cfg?.icon}
                {cfg?.title ?? `Fase ${phase}`}
              </div>
              <div className="text-sm text-muted-foreground">{cfg?.subtitle}</div>
              <div className="h-px flex-1 bg-border" />
              <StatusBadge status={phaseStatus} />
              <span className="text-xs text-muted-foreground font-semibold">{phasePct}%</span>
            </div>

            {/* Feature cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
              {phaseItems.map(item => {
                const scfg = STATUS_CONFIG[item.status];
                return (
                  <Card key={item.id} className={cn(
                    "border transition-all",
                    item.status === "done"        && "border-green-200 bg-green-50/30",
                    item.status === "in_progress" && "border-blue-200 bg-blue-50/30 shadow-sm",
                    item.status === "planned"     && "border-border bg-background opacity-80",
                  )}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", scfg.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-semibold leading-tight",
                            item.status === "done" && "line-through text-muted-foreground",
                            item.status === "in_progress" && "text-blue-800",
                          )}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
                          )}
                          <div className="mt-1.5">
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Keterangan Status</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, val]) => {
              const Icon = val.icon;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", val.dot)} />
                  <span className="font-medium">{val.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Roadmap ini bersifat dinamis dan dapat berubah sesuai prioritas bisnis. Fitur yang dikerjakan berdasarkan kebutuhan operasional terkini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
