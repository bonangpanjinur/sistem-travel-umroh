import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Gauge, MousePointerClick, Timer, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type MetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";

interface MetricRow {
  id: string;
  metric_name: MetricName;
  metric_value: number;
  rating: "good" | "needs-improvement" | "poor" | null;
  route: string;
  device_type: "mobile" | "tablet" | "desktop" | null;
  branch_id: string | null;
  release_version: string | null;
  created_at: string;
}

const METRIC_META: Record<MetricName, { unit: string; icon: any; goodMax: number; poorMin: number; label: string }> = {
  LCP:  { unit: "ms", icon: Timer,             goodMax: 2500, poorMin: 4000, label: "Largest Contentful Paint" },
  CLS:  { unit: "",   icon: Activity,          goodMax: 0.1,  poorMin: 0.25, label: "Cumulative Layout Shift" },
  INP:  { unit: "ms", icon: MousePointerClick, goodMax: 200,  poorMin: 500,  label: "Interaction to Next Paint" },
  FCP:  { unit: "ms", icon: Gauge,             goodMax: 1800, poorMin: 3000, label: "First Contentful Paint" },
  TTFB: { unit: "ms", icon: TrendingUp,        goodMax: 800,  poorMin: 1800, label: "Time To First Byte" },
};

function fmt(name: MetricName, v: number) {
  if (name === "CLS") return v.toFixed(3);
  return Math.round(v) + " ms";
}

function ratingColor(name: MetricName, v: number) {
  const m = METRIC_META[name];
  if (v <= m.goodMax) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v <= m.poorMin) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

function p75(arr: number[]) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
  return sorted[idx];
}

const RANGE_OPTIONS = [
  { value: "24h", label: "24 jam terakhir", hours: 24 },
  { value: "7d",  label: "7 hari terakhir",  hours: 24 * 7 },
  { value: "30d", label: "30 hari terakhir", hours: 24 * 30 },
];

export default function AdminWebVitals() {
  const [range, setRange] = useState("7d");
  const [device, setDevice] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [release, setRelease] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");

  const since = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.value === range)!;
    return new Date(Date.now() - opt.hours * 3600 * 1000).toISOString();
  }, [range]);

  const branchesQ = useQuery({
    queryKey: ["wv-branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id,name").eq("is_active", true).order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const metricsQ = useQuery({
    queryKey: ["web-vitals", range, device, branch, release, routeFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("web_vitals_metrics")
        .select("id,metric_name,metric_value,rating,route,device_type,branch_id,release_version,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (device !== "all") q = q.eq("device_type", device);
      if (branch !== "all") q = q.eq("branch_id", branch);
      if (release !== "all") q = q.eq("release_version", release);
      if (routeFilter !== "all") q = q.eq("route", routeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MetricRow[];
    },
    staleTime: 30 * 1000,
  });

  const rows = metricsQ.data || [];

  // P75 per metric
  const p75ByMetric = useMemo(() => {
    const out: Record<MetricName, number> = { LCP: 0, CLS: 0, INP: 0, FCP: 0, TTFB: 0 };
    (Object.keys(METRIC_META) as MetricName[]).forEach((m) => {
      out[m] = p75(rows.filter((r) => r.metric_name === m).map((r) => r.metric_value));
    });
    return out;
  }, [rows]);

  // Per-route breakdown (P75 LCP/CLS/INP)
  const perRoute = useMemo(() => {
    const map = new Map<string, { route: string; counts: Record<MetricName, number[]> }>();
    rows.forEach((r) => {
      if (!map.has(r.route)) {
        map.set(r.route, { route: r.route, counts: { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] } });
      }
      map.get(r.route)!.counts[r.metric_name].push(r.metric_value);
    });
    return Array.from(map.values())
      .map((r) => ({
        route: r.route,
        LCP: p75(r.counts.LCP),
        CLS: p75(r.counts.CLS),
        INP: p75(r.counts.INP),
        samples: Object.values(r.counts).reduce((a, b) => a + b.length, 0),
      }))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 25);
  }, [rows]);

  // Per-device breakdown
  const perDevice = useMemo(() => {
    const groups: Record<string, MetricRow[]> = { mobile: [], tablet: [], desktop: [] };
    rows.forEach((r) => { if (r.device_type) groups[r.device_type]?.push(r); });
    return (Object.keys(groups) as Array<keyof typeof groups>).map((dev) => ({
      device: dev,
      LCP: p75(groups[dev].filter((r) => r.metric_name === "LCP").map((r) => r.metric_value)),
      CLS: p75(groups[dev].filter((r) => r.metric_name === "CLS").map((r) => r.metric_value)),
      INP: p75(groups[dev].filter((r) => r.metric_name === "INP").map((r) => r.metric_value)),
      samples: groups[dev].length,
    }));
  }, [rows]);

  // Time-series LCP/INP per day
  const timeSeries = useMemo(() => {
    const buckets = new Map<string, { date: string; LCP: number[]; INP: number[]; CLS: number[] }>();
    rows.forEach((r) => {
      const d = r.created_at.slice(0, 10);
      if (!buckets.has(d)) buckets.set(d, { date: d, LCP: [], INP: [], CLS: [] });
      const b = buckets.get(d)!;
      if (r.metric_name === "LCP" || r.metric_name === "INP" || r.metric_name === "CLS") {
        (b as any)[r.metric_name].push(r.metric_value);
      }
    });
    return Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({
        date: b.date.slice(5),
        LCP: Math.round(p75(b.LCP)),
        INP: Math.round(p75(b.INP)),
        CLS: Math.round(p75(b.CLS) * 1000) / 1000,
      }));
  }, [rows]);

  // Distinct values for filters
  const allReleases = useMemo(() => Array.from(new Set(rows.map((r) => r.release_version).filter(Boolean))) as string[], [rows]);
  const allRoutes   = useMemo(() => Array.from(new Set(rows.map((r) => r.route))).sort(), [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Web Vitals</h1>
          <p className="text-sm text-muted-foreground">Pantau performa nyata pengguna (LCP, CLS, INP, FCP, TTFB) per rute, perangkat, cabang, dan rilis.</p>
        </div>
        <Badge variant="secondary" className="w-fit">Sample: {rows.length.toLocaleString("id-ID")}</Badge>
      </header>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Periode</label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Perangkat</label>
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cabang</label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua cabang</SelectItem>
                {(branchesQ.data || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rilis</label>
            <Select value={release} onValueChange={setRelease}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua rilis</SelectItem>
                {allReleases.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rute</label>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua rute</SelectItem>
                {allRoutes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* P75 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(METRIC_META) as MetricName[]).map((m) => {
          const Icon = METRIC_META[m].icon;
          const v = p75ByMetric[m];
          return (
            <Card key={m}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground">{m}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsQ.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{fmt(m, v)}</div>
                    <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${ratingColor(m, v)}`}>
                      P75 · {METRIC_META[m].label}
                    </span>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren Harian (P75)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          {metricsQ.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : timeSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data pada periode ini.</p>
          ) : (
            <ResponsiveContainer>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis yAxisId="ms" fontSize={11} />
                <YAxis yAxisId="cls" orientation="right" fontSize={11} />
                <Tooltip />
                <Legend />
                <Line yAxisId="ms"  type="monotone" dataKey="LCP" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line yAxisId="ms"  type="monotone" dataKey="INP" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line yAxisId="cls" type="monotone" dataKey="CLS" stroke="#d97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per device */}
      <Card>
        <CardHeader><CardTitle className="text-base">Performa per Perangkat (P75)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Device</th><th>Sample</th><th>LCP</th><th>CLS</th><th>INP</th></tr>
            </thead>
            <tbody>
              {perDevice.map((d) => (
                <tr key={d.device} className="border-b last:border-0">
                  <td className="py-2 capitalize font-medium">{d.device}</td>
                  <td>{d.samples}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("LCP", d.LCP)}`}>{fmt("LCP", d.LCP)}</span></td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("CLS", d.CLS)}`}>{fmt("CLS", d.CLS)}</span></td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("INP", d.INP)}`}>{fmt("INP", d.INP)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Per route */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Rute (P75)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Rute</th><th>Sample</th><th>LCP</th><th>CLS</th><th>INP</th></tr>
            </thead>
            <tbody>
              {perRoute.map((r) => (
                <tr key={r.route} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{r.route}</td>
                  <td>{r.samples}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("LCP", r.LCP)}`}>{fmt("LCP", r.LCP)}</span></td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("CLS", r.CLS)}`}>{fmt("CLS", r.CLS)}</span></td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${ratingColor("INP", r.INP)}`}>{fmt("INP", r.INP)}</span></td>
                </tr>
              ))}
              {perRoute.length === 0 && !metricsQ.isLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}