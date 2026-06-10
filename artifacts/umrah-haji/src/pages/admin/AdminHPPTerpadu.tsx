import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  Package, TrendingUp, TrendingDown, BarChart3, Download,
  ArrowUpRight, ArrowDownRight, RefreshCw, Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/format";

const MONTHS_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const CATEGORY_LABELS: Record<string, string> = {
  ACCOMMODATION: "Hotel & Akomodasi",
  FLIGHT:        "Tiket Pesawat",
  VISA:          "Visa",
  MEALS:         "Konsumsi",
  TRANSPORT:     "Transportasi",
  OTHER:         "Lain-lain",
  airline_ticket:"Tiket Pesawat",
  hotel:         "Hotel & Akomodasi",
  transport:     "Transportasi",
  visa_fee:      "Biaya Visa",
  guide:         "Guide / Muthawif",
  meals:         "Konsumsi",
  tips:          "Tips",
  souvenir:      "Souvenir",
  printing:      "Percetakan",
  medical:       "Medis",
  operational:   "Operasional",
  other:         "Lainnya",
};

function MarginBadge({ pct }: { pct: number }) {
  if (pct >= 20) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">{pct.toFixed(1)}%</Badge>;
  if (pct >= 10) return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">{pct.toFixed(1)}%</Badge>;
  if (pct >= 0)  return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">{pct.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">{pct.toFixed(1)}%</Badge>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-muted/60 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold mb-2 text-xs">{label}</p>
      {payload.map((p: any) =>
        p.value !== null && p.value !== undefined ? (
          <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4 text-xs">
            <span>{p.name}</span>
            <span className="font-semibold">{formatCurrency(p.value)}</span>
          </p>
        ) : null
      )}
    </div>
  );
};

export default function AdminHPPTerpadu() {
  const db = supabase as any;
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"margin" | "hpp_plan" | "hpp_realized" | "departure_date">("departure_date");
  const [sortAsc, setSortAsc] = useState(false);

  const yearNum = parseInt(year);
  const yearStart = `${yearNum}-01-01`;
  const yearEnd   = `${yearNum}-12-31`;

  const { data: departures = [], isLoading, refetch } = useQuery({
    queryKey: ["hpp-terpadu", year],
    queryFn: async () => {
      const { data } = await db
        .from("v_financial_summary")
        .select("departure_id, departure_date, package_name, package_type, booked_count, quota, revenue_plan, revenue_realized, hpp_planned, hpp_realized, vendor_cost_total, gross_margin_plan, gross_margin_realized, net_margin_pct")
        .gte("departure_date", yearStart)
        .lte("departure_date", yearEnd)
        .order("departure_date", { ascending: true });
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: costItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["hpp-cost-items", year],
    queryFn: async () => {
      const { data } = await db
        .from("departure_cost_items")
        .select("departure_id, category, unit_cost, quantity, total_cost, currency")
        .order("category");
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const computed = useMemo(() => {
    let filtered = departures.filter((d: any) => {
      if (!search) return true;
      return (d.package_name || "").toLowerCase().includes(search.toLowerCase());
    });

    filtered = [...filtered].sort((a: any, b: any) => {
      let av = 0, bv = 0;
      if (sortKey === "margin") {
        av = a.revenue_realized > 0 ? (a.gross_margin_realized / a.revenue_realized) * 100 : 0;
        bv = b.revenue_realized > 0 ? (b.gross_margin_realized / b.revenue_realized) * 100 : 0;
      } else if (sortKey === "hpp_plan") {
        av = a.hpp_planned || 0; bv = b.hpp_planned || 0;
      } else if (sortKey === "hpp_realized") {
        av = a.hpp_realized || 0; bv = b.hpp_realized || 0;
      } else {
        return sortAsc
          ? (a.departure_date || "").localeCompare(b.departure_date || "")
          : (b.departure_date || "").localeCompare(a.departure_date || "");
      }
      return sortAsc ? av - bv : bv - av;
    });

    const totalHppPlan     = departures.reduce((s: number, d: any) => s + (d.hpp_planned || 0), 0);
    const totalHppRealized = departures.reduce((s: number, d: any) => s + (d.hpp_realized || 0), 0);
    const totalRevRealized = departures.reduce((s: number, d: any) => s + (d.revenue_realized || 0), 0);
    const totalGMRealized  = departures.reduce((s: number, d: any) => s + (d.gross_margin_realized || 0), 0);
    const avgMargin = totalRevRealized > 0 ? (totalGMRealized / totalRevRealized) * 100 : 0;
    const hppVariance = totalHppPlan - totalHppRealized;

    const byPackage: Record<string, { name: string; count: number; hpp_plan: number; hpp_realized: number; revenue: number; margin: number; deps: number }> = {};
    departures.forEach((d: any) => {
      const key = d.package_name || "Paket Lainnya";
      if (!byPackage[key]) {
        byPackage[key] = { name: key, count: 0, hpp_plan: 0, hpp_realized: 0, revenue: 0, margin: 0, deps: 0 };
      }
      byPackage[key].count    += d.booked_count || 0;
      byPackage[key].hpp_plan += d.hpp_planned  || 0;
      byPackage[key].hpp_realized += d.hpp_realized || 0;
      byPackage[key].revenue += d.revenue_realized || 0;
      byPackage[key].deps    += 1;
    });
    Object.values(byPackage).forEach(pkg => {
      pkg.margin = pkg.revenue > 0 ? ((pkg.revenue - pkg.hpp_realized) / pkg.revenue) * 100 : 0;
    });
    const packageList = Object.values(byPackage).sort((a, b) => b.revenue - a.revenue);

    const byCategory: Record<string, { label: string; plan: number; realized: number }> = {};
    costItems.forEach((item: any) => {
      const key = item.category || "other";
      if (!byCategory[key]) {
        byCategory[key] = { label: CATEGORY_LABELS[key] || key, plan: 0, realized: 0 };
      }
      byCategory[key].plan += item.total_cost || 0;
    });
    const categoryList = Object.entries(byCategory)
      .map(([k, v]) => ({ category: v.label, plan: v.plan, realized: v.realized }))
      .sort((a, b) => b.plan - a.plan);

    const monthlyHpp = MONTHS_LABEL.map((label, i) => {
      const monthStr = String(i + 1).padStart(2, "0");
      const monthDeps = departures.filter((d: any) => (d.departure_date || "").startsWith(`${yearNum}-${monthStr}`));
      return {
        month: label,
        hpp_plan:     monthDeps.reduce((s: number, d: any) => s + (d.hpp_planned  || 0), 0) || null,
        hpp_realized: monthDeps.reduce((s: number, d: any) => s + (d.hpp_realized || 0), 0) || null,
        revenue:      monthDeps.reduce((s: number, d: any) => s + (d.revenue_realized || 0), 0) || null,
        margin_pct:   (() => {
          const rev = monthDeps.reduce((s: number, d: any) => s + (d.revenue_realized || 0), 0);
          const gm  = monthDeps.reduce((s: number, d: any) => s + (d.gross_margin_realized || 0), 0);
          return rev > 0 ? parseFloat(((gm / rev) * 100).toFixed(1)) : null;
        })(),
      };
    });

    return { filtered, totalHppPlan, totalHppRealized, totalRevRealized, totalGMRealized, avgMargin, hppVariance, packageList, categoryList, monthlyHpp };
  }, [departures, costItems, search, sortKey, sortAsc, yearNum]);

  function exportCSV() {
    const headers = ["Tgl Berangkat", "Paket", "Pax", "HPP Rencana", "HPP Realisasi", "Pendapatan", "Margin", "Margin %"];
    const rows = computed.filtered.map((d: any) => {
      const marginPct = d.revenue_realized > 0 ? ((d.gross_margin_realized / d.revenue_realized) * 100).toFixed(1) : "0";
      return [
        d.departure_date || "",
        d.package_name || "",
        d.booked_count || 0,
        d.hpp_planned  || 0,
        d.hpp_realized || 0,
        d.revenue_realized || 0,
        d.gross_margin_realized || 0,
        marginPct,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(String).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HPP-Terpadu-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) => sortKey === k
    ? (sortAsc ? <ArrowUpRight className="h-3 w-3 inline ml-0.5" /> : <ArrowDownRight className="h-3 w-3 inline ml-0.5" />)
    : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Laporan HPP Terpadu
          </h1>
          <p className="text-muted-foreground text-sm">
            HPP Plan vs Realisasi per keberangkatan, per paket, dan tren bulanan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024","2025","2026","2027"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!computed.filtered.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "HPP Direncanakan",     value: computed.totalHppPlan,     sub: `${departures.length} keberangkatan`,                    icon: Package,     color: "text-orange-700",  bg: "bg-orange-50  border-orange-200" },
          { label: "HPP Realisasi",         value: computed.totalHppRealized, sub: computed.hppVariance >= 0 ? `Hemat ${formatCurrency(computed.hppVariance)}` : `Lebih ${formatCurrency(Math.abs(computed.hppVariance))}`, icon: TrendingDown, color: "text-rose-700",    bg: "bg-rose-50    border-rose-200" },
          { label: "Total Pendapatan",      value: computed.totalRevRealized, sub: "Pembayaran terverifikasi",                              icon: TrendingUp,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Rata-rata Margin",      value: computed.avgMargin,        sub: `${formatCurrency(computed.totalGMRealized)} gross margin`, icon: BarChart3,   color: "text-blue-700",    bg: "bg-blue-50    border-blue-200", isPct: true },
        ].map(s => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-28 mt-1" /> : (
                <p className={`font-bold text-lg ${s.color}`}>
                  {(s as any).isPct ? `${s.value.toFixed(1)}%` : formatCurrency(s.value)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="keberangkatan">
        <TabsList>
          <TabsTrigger value="keberangkatan">Per Keberangkatan</TabsTrigger>
          <TabsTrigger value="paket">Per Paket</TabsTrigger>
          <TabsTrigger value="trend">Tren HPP Bulanan</TabsTrigger>
        </TabsList>

        <TabsContent value="keberangkatan" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Cari nama paket..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{computed.filtered.length} keberangkatan</p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : computed.filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada data keberangkatan {year}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("departure_date")}>
                          Tgl Berangkat <SortIcon k="departure_date" />
                        </TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead className="text-right">Pax</TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("hpp_plan")}>
                          HPP Rencana <SortIcon k="hpp_plan" />
                        </TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("hpp_realized")}>
                          HPP Realisasi <SortIcon k="hpp_realized" />
                        </TableHead>
                        <TableHead className="text-right">Selisih</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                        <TableHead className="text-right">Gross Margin</TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("margin")}>
                          % <SortIcon k="margin" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computed.filtered.map((d: any) => {
                        const marginPct = d.revenue_realized > 0 ? (d.gross_margin_realized / d.revenue_realized) * 100 : 0;
                        const hppDiff   = (d.hpp_planned || 0) - (d.hpp_realized || 0);
                        const hasData   = d.revenue_realized > 0 || d.hpp_realized > 0;
                        return (
                          <TableRow key={d.departure_id} className={`text-xs ${d.gross_margin_realized < 0 ? "bg-red-50/30" : ""}`}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy") : "—"}
                            </TableCell>
                            <TableCell className="max-w-[140px]">
                              <p className="truncate font-medium">{d.package_name || "—"}</p>
                              {d.package_type && <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5">{d.package_type}</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{d.booked_count}/{d.quota}</TableCell>
                            <TableCell className="text-right text-orange-700">{d.hpp_planned > 0 ? formatCurrency(d.hpp_planned) : "—"}</TableCell>
                            <TableCell className="text-right text-rose-700">{d.hpp_realized > 0 ? formatCurrency(d.hpp_realized) : "—"}</TableCell>
                            <TableCell className={`text-right font-medium ${hppDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {d.hpp_planned > 0 || d.hpp_realized > 0 ? (
                                <span>{hppDiff >= 0 ? "+" : ""}{formatCurrency(hppDiff)}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">{hasData ? formatCurrency(d.revenue_realized) : "—"}</TableCell>
                            <TableCell className={`text-right font-semibold ${d.gross_margin_realized < 0 ? "text-red-600" : "text-emerald-700"}`}>
                              {hasData ? formatCurrency(d.gross_margin_realized) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasData ? <MarginBadge pct={marginPct} /> : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paket" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">HPP Rata-rata per Paket — {year}</CardTitle>
              <CardDescription>Perbandingan HPP dan margin antar jenis paket</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : computed.packageList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data paket {year}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={computed.packageList} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="hpp_plan"     name="HPP Rencana"   fill="#f97316" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="hpp_realized" name="HPP Realisasi" fill="#ef4444" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="revenue"      name="Pendapatan"    fill="#10b981" radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {computed.packageList.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Paket</TableHead>
                      <TableHead className="text-right">Keberangkatan</TableHead>
                      <TableHead className="text-right">Total Pax</TableHead>
                      <TableHead className="text-right">HPP Rencana</TableHead>
                      <TableHead className="text-right">HPP Realisasi</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computed.packageList.map((pkg, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium max-w-[160px]">
                          <p className="truncate">{pkg.name}</p>
                        </TableCell>
                        <TableCell className="text-right">{pkg.deps}</TableCell>
                        <TableCell className="text-right">{pkg.count}</TableCell>
                        <TableCell className="text-right text-orange-700">{formatCurrency(pkg.hpp_plan)}</TableCell>
                        <TableCell className="text-right text-rose-700">{formatCurrency(pkg.hpp_realized)}</TableCell>
                        <TableCell className="text-right text-emerald-700">{formatCurrency(pkg.revenue)}</TableCell>
                        <TableCell className="text-right"><MarginBadge pct={pkg.margin} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tren HPP Bulanan — {year}</CardTitle>
              <CardDescription>HPP Rencana vs Realisasi vs Pendapatan per bulan keberangkatan</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || loadingItems ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={computed.monthlyHpp} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="hpp_plan"     name="HPP Rencana"   fill="#f97316" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="hpp_realized" name="HPP Realisasi" fill="#ef4444" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="revenue"      name="Pendapatan"    fill="#10b981" radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tren % Margin per Bulan</CardTitle>
              <CardDescription>Persentase gross margin realisasi per bulan keberangkatan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={computed.monthlyHpp} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Margin"]} />
                  <Line
                    type="monotone" dataKey="margin_pct"
                    name="Margin %" stroke="#6366f1"
                    strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
