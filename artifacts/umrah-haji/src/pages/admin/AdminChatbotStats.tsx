import { useState, useEffect, useCallback } from "react";
import { UnansweredQuestionsWidget } from "@/components/admin/chatbot/UnansweredQuestionsWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from "recharts";
import {
  MessageSquare, Bot, RefreshCcw, Loader2, CheckCircle2, AlertCircle,
  BarChart3, ThumbsUp, ThumbsDown, Activity, HelpCircle, Zap, TrendingUp, TrendingDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayStat { date: string; gemini: number; openai: number; faq: number; total: number }
interface SourceStat { source: string; count: number }

interface Stats {
  total: number;
  totalInRange: number;
  bySource: SourceStat[];
  bySourceInRange: SourceStat[];
  ratings: { positive: number; negative: number; total: number };
  unanswered: number;
  byDay: DayStat[];
  range: number;
  geminiActive: boolean;
  currentModel: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MODEL_LABELS: Record<string, string> = {
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
  "gemini-1.5-flash-8b": "Gemini 1.5 Flash-8B",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
};

const SOURCE_COLORS: Record<string, string> = {
  gemini: "#3b82f6",
  openai: "#10b981",
  faq: "#94a3b8",
};

const SOURCE_LABELS: Record<string, string> = {
  gemini: "Gemini AI",
  openai: "OpenAI",
  faq: "FAQ Lokal",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#94a3b8", "#f59e0b", "#8b5cf6"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function pct(a: number, b: number): string {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "—";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, trend, color = "text-primary",
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500 mt-1" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mt-1" />}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip for Bar Chart ─────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[140px]">
      <p className="font-semibold mb-2 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
            {SOURCE_LABELS[p.dataKey] || p.dataKey}
          </span>
          <span className="font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
      <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
        <span>Total</span><span>{total}</span>
      </div>
    </div>
  );
}

// ─── Pie active shape ─────────────────────────────────────────────────────────
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#374151" className="text-sm font-semibold" fontSize={14}>
        {SOURCE_LABELS[payload.name] || payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize={13}>
        {value} ({Math.round(percent * 100)}%)
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 1}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminChatbotStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, configRes] = await Promise.all([
        fetch(`/api/v1/chatbot/stats?range=${range}`).then(r => r.ok ? r.json() : null),
        fetch("/api/v1/chatbot/config").then(r => r.ok ? r.json() : null),
      ]);

      if (statsRes) {
        setStats({
          ...statsRes,
          geminiActive: configRes?.geminiKeySet === true,
          currentModel: configRes?.model || "gemini-2.0-flash",
        });
        setLastRefreshed(new Date());
      }
    } catch {}
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // ── derived ─────────────────────────────────────────────────────────────────
  const pieData = stats
    ? stats.bySourceInRange
        .filter(s => s.count > 0)
        .map(s => ({ name: s.source, value: s.count, color: SOURCE_COLORS[s.source] || "#94a3b8" }))
    : [];

  const satisfactionPct = stats?.ratings.total
    ? Math.round((stats.ratings.positive / stats.ratings.total) * 100)
    : null;

  const unansweredPct = stats && stats.totalInRange > 0
    ? Math.round((stats.unanswered / stats.totalInRange) * 100)
    : 0;

  const geminiCount = stats?.bySourceInRange.find(s => s.source === "gemini")?.count || 0;
  const aiPct = stats && stats.totalInRange > 0
    ? Math.round((geminiCount / stats.totalInRange) * 100)
    : 0;

  const hasBarData = stats?.byDay.some(d => d.total > 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Analitik Chatbot AI
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tren percakapan, pertanyaan tak terjawab &amp; performa Gemini AI
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stats?.geminiActive ? (
            <Badge className="gap-1.5 bg-blue-50 text-blue-700 border-blue-200">
              <Zap className="h-3 w-3" /> AI Aktif — {MODEL_LABELS[stats.currentModel] || stats.currentModel}
            </Badge>
          ) : (
            <Badge className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3" /> Mode FAQ (AI belum dikonfigurasi)
            </Badge>
          )}
          {/* Range tabs */}
          <div className="flex rounded-lg border bg-background overflow-hidden text-sm">
            {([7, 14, 30] as (7 | 14 | 30)[]).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 transition-colors ${
                range === r ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}>{r}h</button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {loading && !stats && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && !stats && (
        <div className="flex items-center justify-center h-48 text-muted-foreground flex-col gap-2">
          <AlertCircle className="h-8 w-8" />
          <p>Gagal memuat data. Pastikan server API berjalan.</p>
          <Button variant="outline" size="sm" onClick={load}>Coba Lagi</Button>
        </div>
      )}

      {stats && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<MessageSquare className="h-5 w-5" />}
              label={`Total percakapan (${range}h)`}
              value={stats.totalInRange.toLocaleString("id")}
              sub={`${stats.total.toLocaleString("id")} total keseluruhan`}
            />
            <StatCard
              icon={<Bot className="h-5 w-5" />}
              label="Dijawab AI Gemini"
              value={aiPct > 0 ? `${aiPct}%` : "—"}
              sub={`${geminiCount} dari ${stats.totalInRange} pesan`}
              color="text-blue-500"
              trend={aiPct >= 50 ? "up" : "neutral"}
            />
            <StatCard
              icon={<HelpCircle className="h-5 w-5" />}
              label="Tak Terjawab"
              value={stats.unanswered > 0 ? `${unansweredPct}%` : "0%"}
              sub={`${stats.unanswered} pertanyaan gagal dijawab`}
              color="text-amber-500"
              trend={unansweredPct > 20 ? "down" : "neutral"}
            />
            <StatCard
              icon={satisfactionPct !== null && satisfactionPct >= 70
                ? <ThumbsUp className="h-5 w-5" />
                : <Activity className="h-5 w-5" />
              }
              label="Kepuasan pengguna"
              value={satisfactionPct !== null ? `${satisfactionPct}%` : "—"}
              sub={`${stats.ratings.positive}👍 ${stats.ratings.negative}👎 dari ${stats.ratings.total} rating`}
              color={satisfactionPct !== null && satisfactionPct >= 70 ? "text-green-500" : "text-muted-foreground"}
              trend={satisfactionPct !== null ? (satisfactionPct >= 70 ? "up" : "down") : "neutral"}
            />
          </div>

          {/* ── Main Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Conversation Trend */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Tren Percakapan Harian
                </CardTitle>
                <CardDescription>
                  Jumlah pesan per hari, dibedakan sumber jawaban — {range} hari terakhir
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasBarData ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
                    <BarChart3 className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Belum ada percakapan dalam {range} hari terakhir</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={range <= 7 ? 28 : range <= 14 ? 18 : 10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmtDate}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        interval={range <= 7 ? 0 : range <= 14 ? 1 : 4}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                      <Legend
                        formatter={(v) => <span className="text-xs text-muted-foreground">{SOURCE_LABELS[v] || v}</span>}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar dataKey="gemini" stackId="a" fill={SOURCE_COLORS.gemini} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="openai" stackId="a" fill={SOURCE_COLORS.openai} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="faq" stackId="a" fill={SOURCE_COLORS.faq} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Source Breakdown Pie */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  Sumber Jawaban
                </CardTitle>
                <CardDescription>
                  Distribusi Gemini AI vs FAQ dalam {range} hari
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
                    <Bot className="h-10 w-10 opacity-20" />
                    <p className="text-sm text-center">Belum ada data percakapan</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          activeIndex={activeIndex}
                          activeShape={renderActiveShape}
                          onMouseEnter={(_, i) => setActiveIndex(i)}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {pieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{SOURCE_LABELS[entry.name] || entry.name}</span>
                          </span>
                          <span className="font-semibold tabular-nums">
                            {entry.value} <span className="text-muted-foreground font-normal text-xs">({pct(entry.value, stats.totalInRange)})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Unanswered Questions ── */}
          <UnansweredQuestionsWidget />

          {/* ── Ratings + Footer ── */}
          {stats.ratings.total > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Rating Pengguna
                </CardTitle>
                <CardDescription>
                  Feedback yang diberikan pengguna setelah percakapan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Positive bar */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-green-600"><ThumbsUp className="h-3.5 w-3.5" /> Positif</span>
                      <span className="font-semibold">{stats.ratings.positive} ({pct(stats.ratings.positive, stats.ratings.total)})</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: pct(stats.ratings.positive, stats.ratings.total) }} />
                    </div>
                  </div>
                  {/* Negative bar */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-red-500"><ThumbsDown className="h-3.5 w-3.5" /> Negatif</span>
                      <span className="font-semibold">{stats.ratings.negative} ({pct(stats.ratings.negative, stats.ratings.total)})</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: pct(stats.ratings.negative, stats.ratings.total) }} />
                    </div>
                  </div>
                  {/* Summary */}
                  <div className="text-center px-4 py-2 rounded-xl bg-muted">
                    <p className="text-2xl font-bold">{satisfactionPct}%</p>
                    <p className="text-xs text-muted-foreground">Kepuasan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Footer ── */}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Terakhir diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")}
            {" · "}Data diambil langsung dari database Neon Postgres
            {stats.ratings.total === 0 && " · Belum ada rating pengguna"}
          </p>
        </>
      )}
    </div>
  );
}
