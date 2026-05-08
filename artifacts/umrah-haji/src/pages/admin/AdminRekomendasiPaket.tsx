import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain, Star, TrendingUp, Users, Target, Sparkles, RefreshCcw,
  CheckCircle2, Filter, ChevronRight, Settings, BarChart2, DollarSign
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

interface RecoRule {
  id: string;
  label: string;
  enabled: boolean;
  weight: number;
}

const DEFAULT_RULES: RecoRule[] = [
  { id: "budget_match", label: "Kesesuaian Budget", enabled: true, weight: 40 },
  { id: "date_match", label: "Ketersediaan Tanggal", enabled: true, weight: 25 },
  { id: "type_pref", label: "Jenis Paket (Umroh/Haji)", enabled: true, weight: 15 },
  { id: "popularity", label: "Popularitas Paket", enabled: true, weight: 10 },
  { id: "fill_rate", label: "Kursi Tersedia", enabled: true, weight: 10 },
];

function scorePackage(pkg: any, filters: any, rules: RecoRule[]): number {
  let score = 0;
  const enabledRules = rules.filter(r => r.enabled);
  const totalWeight = enabledRules.reduce((s, r) => s + r.weight, 0);

  for (const rule of enabledRules) {
    let ruleScore = 0;
    const weight = rule.weight / (totalWeight || 1);

    if (rule.id === "budget_match") {
      const price = pkg.base_price || 0;
      const [minB, maxB] = filters.budget;
      if (price >= minB && price <= maxB) ruleScore = 100;
      else if (price < minB) ruleScore = Math.max(0, 100 - ((minB - price) / minB) * 100);
      else ruleScore = Math.max(0, 100 - ((price - maxB) / maxB) * 50);
    }

    if (rule.id === "popularity") {
      ruleScore = Math.min(100, (pkg.bookings_count || 0) * 5);
    }

    if (rule.id === "fill_rate") {
      const fillPct = pkg.departure_quota > 0 ? ((pkg.departures_booked || 0) / pkg.departure_quota) * 100 : 50;
      ruleScore = fillPct < 90 ? 100 : 50;
    }

    if (rule.id === "type_pref" && filters.packageType !== "all") {
      ruleScore = pkg.package_type_name?.toLowerCase().includes(filters.packageType) ? 100 : 0;
    } else if (rule.id === "type_pref") {
      ruleScore = 70;
    }

    if (rule.id === "date_match") {
      ruleScore = 75;
    }

    score += ruleScore * weight;
  }

  return Math.round(score);
}

export default function AdminRekomendasiPaket() {
  const [budget, setBudget] = useState<[number, number]>([15_000_000, 50_000_000]);
  const [packageType, setPackageType] = useState("all");
  const [groupSize, setGroupSize] = useState("1");
  const [rules, setRules] = useState<RecoRule[]>(DEFAULT_RULES);
  const [activeTab, setActiveTab] = useState("simulator");

  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ["reko-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id, name, description, base_price, status, duration_days,
          package_type:package_types(name),
          departures(id, quota, departure_date,
            bookings(id, booking_status)
          )
        `)
        .eq("status", "active")
        .order("base_price", { ascending: true });
      if (error) throw error;
      return (data || []).map((pkg: any) => {
        const activeDeps = (pkg.departures || []).filter((d: any) => d.departure_date && new Date(d.departure_date) > new Date());
        const bookingsCount = activeDeps.reduce((s: number, d: any) => s + (d.bookings?.filter((b: any) => b.booking_status !== "cancelled").length || 0), 0);
        const quota = activeDeps.reduce((s: number, d: any) => s + (d.quota || 0), 0);
        return {
          ...pkg,
          package_type_name: pkg.package_type?.name || "",
          bookings_count: bookingsCount,
          departure_quota: quota,
          departures_booked: bookingsCount,
          active_departures: activeDeps.length,
        };
      });
    },
  });

  const scored = useMemo(() => {
    return (packages as any[])
      .map(pkg => ({ ...pkg, score: scorePackage(pkg, { budget, packageType, groupSize: parseInt(groupSize) }, rules) }))
      .sort((a, b) => b.score - a.score);
  }, [packages, budget, packageType, groupSize, rules]);

  function updateRuleWeight(id: string, weight: number) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, weight } : r));
  }

  function toggleRule(id: string, enabled: boolean) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
  }

  const top3 = scored.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-green-500" />
            Rekomendasi Paket Cerdas
          </h1>
          <p className="text-muted-foreground mt-1">AI merekomendasikan paket berdasarkan preferensi calon jamaah</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="simulator"><Sparkles className="h-4 w-4 mr-1" />Simulator Rekomendasi</TabsTrigger>
          <TabsTrigger value="all_packages"><BarChart2 className="h-4 w-4 mr-1" />Semua Paket + Skor</TabsTrigger>
          <TabsTrigger value="rules"><Settings className="h-4 w-4 mr-1" />Aturan AI</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Filter Preferensi Calon Jamaah</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Budget ({formatCurrency(budget[0])} — {formatCurrency(budget[1])})</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={budget[0]}
                      onChange={e => setBudget([parseInt(e.target.value) || 0, budget[1]])}
                      className="text-sm"
                      placeholder="Min budget"
                    />
                    <Input
                      type="number"
                      value={budget[1]}
                      onChange={e => setBudget([budget[0], parseInt(e.target.value) || 100_000_000])}
                      className="text-sm"
                      placeholder="Max budget"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Jenis Paket</Label>
                  <Select value={packageType} onValueChange={setPackageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis</SelectItem>
                      <SelectItem value="umroh">Umroh</SelectItem>
                      <SelectItem value="haji">Haji</SelectItem>
                      <SelectItem value="haji plus">Haji Plus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Jumlah Peserta</Label>
                  <Select value={groupSize} onValueChange={setGroupSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 orang (sendiri)</SelectItem>
                      <SelectItem value="2">2 orang (suami-istri)</SelectItem>
                      <SelectItem value="3">3-4 orang (keluarga kecil)</SelectItem>
                      <SelectItem value="5">5+ orang (rombongan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Top 3 Rekomendasi AI</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Menganalisis paket...</p>
                ) : top3.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Tidak ada paket aktif</p>
                ) : top3.map((pkg: any, i) => (
                  <div key={pkg.id} className={`border-2 rounded-xl p-3 ${i === 0 ? "border-amber-400 bg-amber-50" : i === 1 ? "border-slate-300 bg-slate-50" : "border-orange-300 bg-orange-50"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                        <div>
                          <p className="font-semibold text-sm">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">{pkg.package_type_name}</p>
                        </div>
                      </div>
                      <Badge className={`border-0 text-xs font-bold ${pkg.score >= 80 ? "bg-green-100 text-green-700" : pkg.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {pkg.score}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-sm">{formatCurrency(pkg.base_price)}</span>
                      <span>{pkg.duration_days} hari</span>
                      <span>{pkg.active_departures} keberangkatan</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all_packages" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Semua Paket — Skor Rekomendasi AI</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Keberangkatan</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Skor AI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                  ) : scored.map((pkg: any, i) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-bold text-center">{i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">{pkg.package_type_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(pkg.base_price)}</TableCell>
                      <TableCell className="text-sm">{pkg.duration_days} hari</TableCell>
                      <TableCell className="text-sm">{pkg.active_departures}</TableCell>
                      <TableCell className="text-sm">{pkg.bookings_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${pkg.score}%`, backgroundColor: pkg.score >= 70 ? "#22c55e" : pkg.score >= 50 ? "#f59e0b" : "#ef4444" }}
                            />
                          </div>
                          <span className="text-xs font-bold">{pkg.score}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konfigurasi Aturan Rekomendasi AI</CardTitle>
              <CardDescription>Atur bobot dan aktifkan/nonaktifkan faktor penilaian paket</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.map(rule => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">Bobot: {rule.weight}%</p>
                    </div>
                    <Switch checked={rule.enabled} onCheckedChange={val => toggleRule(rule.id, val)} />
                  </div>
                  {rule.enabled && (
                    <div className="space-y-1">
                      <Slider
                        value={[rule.weight]}
                        onValueChange={([v]) => updateRuleWeight(rule.id, v)}
                        min={5}
                        max={60}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>5%</span><span>60%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Total bobot: {rules.filter(r => r.enabled).reduce((s, r) => s + r.weight, 0)}% (disarankan 100%)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
