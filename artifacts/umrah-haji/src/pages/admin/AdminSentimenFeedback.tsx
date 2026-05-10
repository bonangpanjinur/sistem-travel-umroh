import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { RefreshCcw, Smile, Frown, Meh, TrendingUp, TrendingDown, Sparkles, MessageSquare, Star, Filter, BarChart2 } from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const SENTIMENT_KEYWORDS = {
  positive: ["bagus", "baik", "senang", "puas", "ramah", "mantap", "memuaskan", "luar biasa", "recommended", "terbaik", "nyaman", "profesional", "tepat waktu", "bersih", "mudah", "helpful", "bersyukur", "alhamdulillah", "mabrur", "berkah", "keren", "oke", "amazing", "excellent", "perfect", "happy"],
  negative: ["buruk", "jelek", "kecewa", "lambat", "terlambat", "kotor", "mahal", "susah", "ribet", "antri", "panas", "tidak nyaman", "kurang", "gagal", "masalah", "complaint", "komplain", "mengecewakan", "parah", "berantakan", "bingung", "kendala"],
  neutral: ["cukup", "biasa", "standar", "lumayan", "oke", "sedang", "normal"],
};

const ASPECTS = ["Hotel", "Muthawif", "Transportasi", "Makanan", "Dokumen", "Pembimbing", "Maskapai"];

function analyzeSentiment(text: string, rating: number): "positive" | "negative" | "neutral" {
  if (!text) return rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";
  const lower = text.toLowerCase();
  let posScore = SENTIMENT_KEYWORDS.positive.filter(k => lower.includes(k)).length;
  let negScore = SENTIMENT_KEYWORDS.negative.filter(k => lower.includes(k)).length;
  posScore += (rating - 3) * 1.5;
  if (posScore > negScore + 1) return "positive";
  if (negScore > posScore + 1) return "negative";
  return "neutral";
}

function extractAspectMentions(text: string): string[] {
  const lower = text?.toLowerCase() || "";
  return ASPECTS.filter(a => lower.includes(a.toLowerCase()));
}

const COLORS_PIE = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };
const RADAR_COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

export default function AdminSentimenFeedback() {
  const [monthFilter, setMonthFilter] = useState("3");
  const [aspectFilter, setAspectFilter] = useState("all");

  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ["sentimen-feedback", monthFilter],
    queryFn: async () => {
      const since = subMonths(new Date(), parseInt(monthFilter)).toISOString();
      // testimonials.id = bookingId (set by JamaahFeedback), content = ulasan text
      const { data, error } = await supabase
        .from("testimonials")
        .select(`
          id, rating, content, created_at, name, location,
          booking:bookings!bookings_id_fkey(booking_code, departure:departures(package:packages(name)))
        `)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) {
        // fallback tanpa join jika relasi belum ada
        const { data: d2 } = await supabase
          .from("testimonials")
          .select("id, rating, content, created_at, name, location")
          .gte("created_at", since)
          .order("created_at", { ascending: false });
        return (d2 || []).map((t: any) => ({ ...t, comment: t.content }));
      }
      return (data || []).map((t: any) => ({ ...t, comment: t.content }));
    },
  });

  const analyzed = useMemo(() => (feedbacks as any[]).map(f => ({
    ...f,
    sentiment: analyzeSentiment(f.comment || f.content || "", f.rating),
    aspects: extractAspectMentions(f.comment || f.content || ""),
  })), [feedbacks]);

  const positiveCount = analyzed.filter(f => f.sentiment === "positive").length;
  const negativeCount = analyzed.filter(f => f.sentiment === "negative").length;
  const neutralCount = analyzed.filter(f => f.sentiment === "neutral").length;
  const total = analyzed.length;
  const avgRating = total > 0 ? (analyzed.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1) : "0";

  const pieData = [
    { name: "Positif", value: positiveCount, color: COLORS_PIE.positive },
    { name: "Netral", value: neutralCount, color: COLORS_PIE.neutral },
    { name: "Negatif", value: negativeCount, color: COLORS_PIE.negative },
  ].filter(d => d.value > 0);

  const aspectData = ASPECTS.map(aspect => {
    const mentioned = analyzed.filter(f => f.aspects.includes(aspect));
    const posCount = mentioned.filter(f => f.sentiment === "positive").length;
    const negCount = mentioned.filter(f => f.sentiment === "negative").length;
    const score = mentioned.length > 0 ? Math.round((posCount / mentioned.length) * 100) : 50;
    return { aspect, total: mentioned.length, positive: posCount, negative: negCount, score };
  }).sort((a, b) => b.total - a.total);

  const radarData = ASPECTS.slice(0, 6).map(aspect => {
    const mentions = analyzed.filter(f => f.aspects.includes(aspect));
    const pos = mentions.filter(f => f.sentiment === "positive").length;
    const score = mentions.length > 0 ? Math.round((pos / mentions.length) * 100) : 60;
    return { subject: aspect, score };
  });

  const monthlyData = Array.from({ length: parseInt(monthFilter) }, (_, i) => {
    const month = subMonths(new Date(), parseInt(monthFilter) - 1 - i);
    const monthStr = format(month, "MMM yy", { locale: idLocale });
    const monthFeedbacks = analyzed.filter(f => {
      if (!f.created_at) return false;
      const d = parseISO(f.created_at);
      return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    });
    return {
      month: monthStr,
      positif: monthFeedbacks.filter(f => f.sentiment === "positive").length,
      netral: monthFeedbacks.filter(f => f.sentiment === "neutral").length,
      negatif: monthFeedbacks.filter(f => f.sentiment === "negative").length,
    };
  });

  const displayedFeedbacks = aspectFilter === "all" ? analyzed : analyzed.filter(f => f.aspects.includes(aspectFilter));

  function sentimentBadge(s: string) {
    if (s === "positive") return <Badge className="bg-green-100 text-green-700 border-0 gap-1"><Smile className="h-3 w-3" />Positif</Badge>;
    if (s === "negative") return <Badge className="bg-red-100 text-red-700 border-0 gap-1"><Frown className="h-3 w-3" />Negatif</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-0 gap-1"><Meh className="h-3 w-3" />Netral</Badge>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Analisis Sentimen Feedback
          </h1>
          <p className="text-muted-foreground mt-1">AI menganalisis semua ulasan jamaah — positif, negatif, netral per aspek</p>
        </div>
        <div className="flex gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Bulan Terakhir</SelectItem>
              <SelectItem value="3">3 Bulan Terakhir</SelectItem>
              <SelectItem value="6">6 Bulan Terakhir</SelectItem>
              <SelectItem value="12">1 Tahun Terakhir</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Ulasan</p>
          <p className="text-3xl font-bold">{total}</p>
        </CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-4 text-center">
          <p className="text-sm text-green-600">Positif</p>
          <p className="text-3xl font-bold text-green-600">{positiveCount}</p>
          <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(positiveCount / total * 100) : 0}%</p>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-4 text-center">
          <p className="text-sm text-amber-600">Netral</p>
          <p className="text-3xl font-bold text-amber-600">{neutralCount}</p>
          <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(neutralCount / total * 100) : 0}%</p>
        </CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-4 text-center">
          <p className="text-sm text-red-600">Negatif</p>
          <p className="text-3xl font-bold text-red-600">{negativeCount}</p>
          <p className="text-xs text-muted-foreground">{total > 0 ? Math.round(negativeCount / total * 100) : 0}%</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><BarChart2 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="aspects"><Star className="h-4 w-4 mr-1" />Per Aspek</TabsTrigger>
          <TabsTrigger value="detail"><MessageSquare className="h-4 w-4 mr-1" />Detail Ulasan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribusi Sentimen</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Memuat...</div> : total === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada feedback</div> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Tren Sentimen per Bulan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="positif" fill="#22c55e" name="Positif" stackId="a" />
                    <Bar dataKey="netral" fill="#f59e0b" name="Netral" stackId="a" />
                    <Bar dataKey="negatif" fill="#ef4444" name="Negatif" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Skor per Aspek (Radar)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Skor Positif %" />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aspects" className="space-y-4 mt-4">
          <div className="grid gap-3">
            {aspectData.map(a => (
              <Card key={a.aspect}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{a.aspect}</span>
                      <Badge variant="outline" className="text-[10px]">{a.total} ulasan</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">{a.positive} positif</Badge>
                      <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">{a.negative} negatif</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Skor Kepuasan</span>
                      <span className={`font-semibold ${a.score >= 70 ? "text-green-600" : a.score >= 40 ? "text-amber-600" : "text-red-600"}`}>{a.score}%</span>
                    </div>
                    <Progress value={a.score} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Select value={aspectFilter} onValueChange={setAspectFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aspek</SelectItem>
                {ASPECTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket / Booking</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Komentar</TableHead>
                  <TableHead>Sentimen</TableHead>
                  <TableHead>Aspek</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Menganalisis feedback...</TableCell></TableRow>
                ) : displayedFeedbacks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada feedback</TableCell></TableRow>
                ) : displayedFeedbacks.slice(0, 50).map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{f.booking?.departure?.package?.name || f.booking?.booking_code || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{f.rating || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      <p className="line-clamp-2">{f.comment || "Tidak ada komentar"}</p>
                    </TableCell>
                    <TableCell>{sentimentBadge(f.sentiment)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.aspects.length > 0 ? f.aspects.slice(0, 2).map((a: string) => (
                          <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                        )) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.created_at ? format(parseISO(f.created_at), "dd MMM yy", { locale: idLocale }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
