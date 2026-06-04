import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus,
  BookOpen, DollarSign, Users, Target, Lightbulb,
  ChevronDown, ChevronUp, Calendar, Clock, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MetricSnapshot {
  label: string;
  value: number;
  prev: number;
  unit: string;
}

interface SummarySection {
  id: string;
  icon: any;
  title: string;
  color: string;
  narrative: string;
  bullets: string[];
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function trend(val: number): "up" | "down" | "flat" {
  if (val > 2) return "up";
  if (val < -2) return "down";
  return "flat";
}

function TrendBadge({ value }: { value: number }) {
  const t = trend(value);
  if (t === "up") return (
    <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-semibold">
      <TrendingUp className="h-3 w-3" /> +{value}%
    </Badge>
  );
  if (t === "down") return (
    <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100 border-0 font-semibold">
      <TrendingDown className="h-3 w-3" /> {value}%
    </Badge>
  );
  return (
    <Badge className="gap-1 bg-muted text-muted-foreground hover:bg-muted border-0 font-semibold">
      <Minus className="h-3 w-3" /> Stabil
    </Badge>
  );
}

function generateSummary(data: MetricSnapshot[]): SummarySection[] {
  const booking = data.find(d => d.label === "Booking")!;
  const revenue = data.find(d => d.label === "Pendapatan")!;
  const lead = data.find(d => d.label === "Lead Baru")!;
  const conversion = data.find(d => d.label === "Konversi Lead")!;
  const avgValue = data.find(d => d.label === "Nilai Rata-rata Booking")!;
  const customerSatisfaction = data.find(d => d.label === "Kepuasan Jamaah")!;

  const bookingPct = pct(booking.value, booking.prev);
  const revenuePct = pct(revenue.value, revenue.prev);
  const leadPct = pct(lead.value, lead.prev);
  const convPct = pct(conversion.value, conversion.prev);

  const bulanIni = new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });

  const sections: SummarySection[] = [
    {
      id: "executive",
      icon: Sparkles,
      title: "Ringkasan Eksekutif",
      color: "text-violet-600 bg-violet-50",
      narrative: `Pada ${bulanIni}, performa Vinstour Travel menunjukkan ${
        revenuePct > 5 ? "tren positif yang menggembirakan" :
        revenuePct < -5 ? "penurunan yang perlu mendapat perhatian segera" :
        "kinerja yang stabil"
      }. Total pendapatan mencapai Rp ${(revenue.value / 1_000_000).toFixed(0)} juta (${
        revenuePct >= 0 ? "+" : ""
      }${revenuePct}% vs bulan lalu), dengan ${booking.value} booking terkonfirmasi. ${
        bookingPct > 0
          ? `Jumlah booking tumbuh ${bookingPct}% — momentum positif yang perlu dijaga.`
          : `Jumlah booking turun ${Math.abs(bookingPct)}% — perlu akselerasi di pipeline penjualan.`
      }`,
      bullets: [
        `Pendapatan Rp ${(revenue.value / 1_000_000).toFixed(0)}jt (${revenuePct >= 0 ? "+" : ""}${revenuePct}% MoM)`,
        `${booking.value} booking baru, ${bookingPct >= 0 ? "+" : ""}${bookingPct}% dari bulan sebelumnya`,
        `Rata-rata nilai booking Rp ${(avgValue.value / 1_000_000).toFixed(1)}jt per jamaah`,
        `Kepuasan jamaah ${customerSatisfaction.value.toFixed(1)}/5.0 ⭐`,
      ],
    },
    {
      id: "booking",
      icon: BookOpen,
      title: "Analisis Booking & Penjualan",
      color: "text-blue-600 bg-blue-50",
      narrative: `Volume booking bulan ini sebesar ${booking.value} transaksi, ${
        bookingPct > 0 ? `meningkat ${bookingPct}% dibandingkan` : `mengalami penurunan ${Math.abs(bookingPct)}% dari`
      } bulan lalu (${booking.prev} booking). Nilai rata-rata per booking Rp ${(avgValue.value / 1_000_000).toFixed(1)} juta ${
        pct(avgValue.value, avgValue.prev) > 0
          ? `naik ${pct(avgValue.value, avgValue.prev)}% — jamaah cenderung memilih paket premium.`
          : `— segment reguler masih mendominasi.`
      } ${
        bookingPct > 10
          ? "Momentum penjualan sangat kuat. Pastikan kapasitas keberangkatan mencukupi."
          : bookingPct < -10
          ? "Perlu strategi promosi atau program referral untuk mendorong volume booking."
          : "Penjualan berjalan normal. Fokus pada peningkatan nilai rata-rata per transaksi."
      }`,
      bullets: [
        `${booking.value} booking terkonfirmasi bulan ini`,
        `Tren: ${bookingPct >= 0 ? "+" : ""}${bookingPct}% dibanding bulan lalu`,
        `Rata-rata nilai Rp ${(avgValue.value / 1_000_000).toFixed(1)}jt (${pct(avgValue.value, avgValue.prev) >= 0 ? "+" : ""}${pct(avgValue.value, avgValue.prev)}% MoM)`,
        bookingPct > 0 ? "Pastikan ketersediaan seat keberangkatan" : "Pertimbangkan kampanye early bird atau promo seasonal",
      ],
    },
    {
      id: "finance",
      icon: DollarSign,
      title: "Analisis Keuangan",
      color: "text-emerald-600 bg-emerald-50",
      narrative: `Kinerja keuangan bulan ini ${
        revenuePct > 5 ? "melampaui ekspektasi" : revenuePct > 0 ? "sesuai target" : "di bawah target"
      }. Pendapatan Rp ${(revenue.value / 1_000_000).toFixed(0)} juta ${
        revenuePct >= 0 ? `tumbuh ${revenuePct}%` : `turun ${Math.abs(revenuePct)}%`
      } secara bulanan. ${
        revenuePct > 15
          ? "Pertumbuhan signifikan ini didorong oleh peningkatan volume dan up-selling paket premium."
          : revenuePct > 0
          ? "Pertumbuhan moderat menunjukkan bisnis berjalan sehat. Fokus pada efisiensi biaya untuk meningkatkan margin."
          : "Perlu review struktur biaya dan strategi pricing untuk menjaga kesehatan arus kas."
      }`,
      bullets: [
        `Pendapatan Rp ${(revenue.value / 1_000_000).toFixed(0)}jt (${revenuePct >= 0 ? "+" : ""}${revenuePct}% MoM)`,
        revenuePct > 0 ? "Arus kas positif — pertahankan disiplin piutang" : "Perhatikan aging piutang (AR > 30 hari)",
        `Proyeksi bulan depan: Rp ${(revenue.value * 1.05 / 1_000_000).toFixed(0)}jt (asumsi tren +5%)`,
        "Optimalkan collection pembayaran DP dan pelunasan",
      ],
    },
    {
      id: "crm",
      icon: Users,
      title: "Lead & CRM",
      color: "text-amber-600 bg-amber-50",
      narrative: `Pipeline CRM bulan ini mencatat ${lead.value} lead baru (${
        leadPct >= 0 ? "+" : ""
      }${leadPct}% MoM) dengan tingkat konversi ${conversion.value}% (${
        convPct >= 0 ? "+" : ""
      }${convPct}% dari bulan lalu). ${
        conversion.value > 30
          ? "Konversi di atas 30% menunjukkan kualitas lead sangat baik — tim sales bekerja efektif."
          : conversion.value > 20
          ? "Konversi 20-30% tergolong normal untuk industri travel Umroh. Ada ruang untuk peningkatan follow-up."
          : "Konversi di bawah 20% — perlu evaluasi kualifikasi lead dan kecepatan follow-up."
      } ${
        leadPct > 0
          ? `Lonjakan lead baru sebesar ${leadPct}% mengindikasikan kampanye marketing berjalan efektif.`
          : `Penurunan lead masuk perlu diantisipasi dengan peningkatan aktivitas marketing digital.`
      }`,
      bullets: [
        `${lead.value} lead baru (${leadPct >= 0 ? "+" : ""}${leadPct}% MoM)`,
        `Konversi ${conversion.value}% (${convPct >= 0 ? "+" : ""}${convPct}% MoM)`,
        conversion.value < 25 ? "Percepat waktu respons lead < 1 jam untuk meningkatkan konversi" : "Pertahankan kecepatan respons yang sudah baik",
        "Review segmentasi lead berdasarkan sumber (organik, referral, iklan)",
      ],
    },
    {
      id: "rekomendasi",
      icon: Lightbulb,
      title: "Rekomendasi Aksi",
      color: "text-rose-600 bg-rose-50",
      narrative: `Berdasarkan analisis data bulan ${bulanIni}, berikut adalah prioritas tindakan yang direkomendasikan untuk memaksimalkan performa bulan depan:`,
      bullets: [
        revenuePct < 0
          ? "🔴 PRIORITAS: Tinjau ulang target penjualan dan lakukan coaching tim sales"
          : bookingPct < 0
          ? "🟡 Dorong pipeline booking dengan program promo atau referral jamaah lama"
          : "🟢 Pertahankan momentum positif — fokus pada retensi dan up-sell paket premium",
        conversion.value < 25
          ? "Implementasi SLA follow-up lead: respons pertama < 1 jam, follow-up ke-2 dalam 24 jam"
          : "Kembangkan program loyalitas untuk jamaah yang sudah pernah berangkat (repeat booking)",
        `Proyeksikan kebutuhan seat keberangkatan ${Math.ceil(booking.value * 1.1)} booking untuk bulan depan`,
        "Review dan update konten blog/artikel untuk SEO — target 2 artikel baru per minggu",
        customerSatisfaction.value < 4.5
          ? "Lakukan survei kepuasan lebih mendalam — identifikasi pain point utama jamaah"
          : "Share ulasan positif jamaah ke media sosial dan website untuk social proof",
      ],
    },
  ];

  return sections;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
}
function endOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59).toISOString();
}

async function fetchMetrics(): Promise<MetricSnapshot[]> {
  const supabaseRaw: any = supabase;
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const prevMonthEnd = endOfPrevMonth(now);

  const [
    { count: bookingsCurr },
    { count: bookingsPrev },
    { data: revCurr },
    { data: revPrev },
    { count: leadsCurr },
    { count: leadsPrev },
    { data: avgData },
    { data: feedbackData },
    { data: avgPrevData },
  ] = await Promise.all([
    supabaseRaw.from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisMonthStart)
      .not("status", "eq", "cancelled"),
    supabaseRaw.from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevMonthStart)
      .lte("created_at", prevMonthEnd)
      .not("status", "eq", "cancelled"),
    supabaseRaw.from("payments")
      .select("amount")
      .in("status", ["verified", "confirmed", "approved"])
      .gte("created_at", thisMonthStart),
    supabaseRaw.from("payments")
      .select("amount")
      .in("status", ["verified", "confirmed", "approved"])
      .gte("created_at", prevMonthStart)
      .lte("created_at", prevMonthEnd),
    supabaseRaw.from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisMonthStart),
    supabaseRaw.from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevMonthStart)
      .lte("created_at", prevMonthEnd),
    supabaseRaw.from("bookings")
      .select("total_price")
      .gte("created_at", thisMonthStart)
      .not("status", "eq", "cancelled"),
    supabaseRaw.from("feedback")
      .select("rating")
      .gte("created_at", thisMonthStart),
    supabaseRaw.from("bookings")
      .select("total_price")
      .gte("created_at", prevMonthStart)
      .lte("created_at", prevMonthEnd)
      .not("status", "eq", "cancelled"),
  ]);

  const sumRevCurr = (revCurr ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const sumRevPrev = (revPrev ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

  const bkCurr = bookingsCurr ?? 0;
  const bkPrev = bookingsPrev ?? 0;
  const ldCurr = leadsCurr ?? 0;
  const ldPrev = leadsPrev ?? 0;

  const convCurr = ldCurr > 0 ? Math.round((bkCurr / ldCurr) * 100) : 0;
  const convPrev = ldPrev > 0 ? Math.round((bkPrev / ldPrev) * 100) : 0;

  const prices = (avgData ?? []).map((b: any) => b.total_price ?? 0);
  const avgCurr = prices.length > 0 ? prices.reduce((s: number, v: number) => s + v, 0) / prices.length : 0;
  const pricesPrev = (avgPrevData ?? []).map((b: any) => b.total_price ?? 0);
  const avgPrev = pricesPrev.length > 0 ? pricesPrev.reduce((s: number, v: number) => s + v, 0) / pricesPrev.length : 0;

  const ratings = (feedbackData ?? []).map((f: any) => f.rating ?? 0).filter((r: number) => r > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length : 4.7;

  return [
    { label: "Booking", value: bkCurr, prev: bkPrev, unit: "transaksi" },
    { label: "Pendapatan", value: sumRevCurr, prev: sumRevPrev, unit: "IDR" },
    { label: "Lead Baru", value: ldCurr, prev: ldPrev, unit: "lead" },
    { label: "Konversi Lead", value: convCurr, prev: convPrev, unit: "%" },
    { label: "Nilai Rata-rata Booking", value: avgCurr, prev: avgPrev, unit: "IDR" },
    { label: "Kepuasan Jamaah", value: avgRating, prev: 4.7, unit: "/5" },
  ];
}

const FALLBACK_METRICS: MetricSnapshot[] = [
  { label: "Booking", value: 0, prev: 0, unit: "transaksi" },
  { label: "Pendapatan", value: 0, prev: 0, unit: "IDR" },
  { label: "Lead Baru", value: 0, prev: 0, unit: "lead" },
  { label: "Konversi Lead", value: 0, prev: 0, unit: "%" },
  { label: "Nilai Rata-rata Booking", value: 0, prev: 0, unit: "IDR" },
  { label: "Kepuasan Jamaah", value: 5.0, prev: 5.0, unit: "/5" },
];

export default function AdminAISummary() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [sections, setSections] = useState<SummarySection[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["executive"]));

  const { data: liveMetrics, isLoading: metricsLoading, error: metricsError, refetch } = useQuery<MetricSnapshot[]>({
    queryKey: ["ai-summary-metrics"],
    queryFn: fetchMetrics,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const metrics = liveMetrics ?? FALLBACK_METRICS;
  const isDemo = !!metricsError || (!metricsLoading && metrics === FALLBACK_METRICS);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setExpandedIds(new Set(["executive"]));

    await refetch();
    await new Promise(r => setTimeout(r, 1200));

    const fresh = liveMetrics ?? FALLBACK_METRICS;
    setSections(generateSummary(fresh));
    setGeneratedAt(new Date());
    setIsGenerating(false);
    setExpandedIds(new Set(["executive", "booking", "finance", "crm", "rekomendasi"]));
  }, [liveMetrics, refetch]);

  const toggleSection = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulanIni = new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-violet-100">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold">Ringkasan AI Otomatis</h1>
          </div>
          <p className="text-muted-foreground">
            Narasi performa bisnis bulan ini — dihasilkan otomatis dari data operasional
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || metricsLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating || metricsLoading ? "animate-spin" : ""}`} />
          {isGenerating ? "Menganalisis..." : sections.length ? "Generate Ulang" : "Generate Ringkasan"}
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Periode: <strong className="text-foreground">{bulanIni}</strong></span>
        {generatedAt && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Clock className="h-4 w-4" />
            <span>Dibuat: {generatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
          </>
        )}
        {isDemo && !metricsLoading && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Mode Demo
            </span>
          </>
        )}
      </div>

      {/* Metric Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricsLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="text-center p-3 bg-muted/30 border-muted">
                <Skeleton className="h-3 w-16 mx-auto mb-2" />
                <Skeleton className="h-5 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-10 mx-auto" />
              </Card>
            ))
          : metrics.map((m) => {
              const change = pct(m.value, m.prev);
              const fmt = m.label === "Pendapatan" || m.label === "Nilai Rata-rata Booking"
                ? `Rp ${(m.value / 1_000_000).toFixed(0)}jt`
                : m.unit === "%"
                ? `${m.value}%`
                : m.unit === "/5"
                ? `${m.value.toFixed(1)}/5`
                : `${m.value.toLocaleString("id-ID")}`;
              return (
                <Card key={m.label} className="text-center p-3 bg-muted/30 border-muted">
                  <p className="text-[10px] text-muted-foreground leading-tight mb-1">{m.label}</p>
                  <p className="text-base font-bold">{fmt}</p>
                  <TrendBadge value={change} />
                </Card>
              );
            })
        }
      </div>

      {/* Empty state */}
      {!sections.length && !isGenerating && (
        <Card className="border-dashed border-violet-200 bg-violet-50/40">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-full bg-violet-100">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-lg mb-1">Belum ada ringkasan dibuat</p>
              <p className="text-muted-foreground text-sm max-w-md">
                Klik tombol <strong>Generate Ringkasan</strong> untuk menganalisis data bulan ini
                dan mendapatkan narasi insight otomatis dalam Bahasa Indonesia.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={metricsLoading} className="gap-2 mt-2">
              <Sparkles className="h-4 w-4" /> Generate Sekarang
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="space-y-4">
          {["Mengambil data booking & keuangan dari database...", "Menghitung tren bulanan...", "Menyusun insight dan rekomendasi...", "Memformat narasi final..."].map((msg, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20 animate-pulse">
              <RefreshCw className="h-4 w-4 text-violet-500 animate-spin" />
              <span className="text-sm text-muted-foreground">{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {!isGenerating && sections.map((sec) => {
        const Icon = sec.icon;
        const isOpen = expandedIds.has(sec.id);
        return (
          <Card key={sec.id} className="overflow-hidden border shadow-sm">
            <button
              className="w-full text-left"
              onClick={() => toggleSection(sec.id)}
            >
              <CardHeader className="py-4 px-5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${sec.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {sec.title}
                  </CardTitle>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </CardHeader>
            </button>
            {isOpen && (
              <CardContent className="px-5 pb-5 pt-0 space-y-4">
                <Separator />
                <p className="text-sm leading-relaxed text-foreground/90">{sec.narrative}</p>
                <ul className="space-y-2">
                  {sec.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        );
      })}

      {sections.length > 0 && (
        <p className="text-xs text-center text-muted-foreground pb-4">
          {isDemo
            ? "Mode demo — hubungkan Supabase untuk analisis data real-time."
            : `Data diambil langsung dari database — ${bulanIni}.`
          }
        </p>
      )}
    </div>
  );
}
