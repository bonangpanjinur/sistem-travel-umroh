import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Building2, TrendingUp, Users, Package, Trophy } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: localeId }) };
});

/**
 * CAB-ADD3 — Dashboard perbandingan semua cabang dalam satu view.
 * Per cabang: total booking, revenue, jumlah agen aktif, jumlah jamaah.
 * Plus chart bar perbandingan + leaderboard ranking.
 */
export default function AdminBranchComparison() {
  const [period, setPeriod] = useState(MONTHS[0].value);
  const [year, month] = period.split("-").map(Number);
  const startDate = startOfMonth(new Date(year, month - 1)).toISOString();
  const endDate = endOfMonth(new Date(year, month - 1)).toISOString();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["branch-comparison", period],
    queryFn: async () => {
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, city, is_active")
        .order("name");
      if (!branches?.length) return [];

      const results = await Promise.all(branches.map(async (b: any) => {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, total_price, paid_amount, booking_status, customer_id")
          .eq("branch_id", b.id)
          .gte("created_at", startDate)
          .lte("created_at", endDate);
        const list = (bookings ?? []) as any[];
        const active = list.filter((x) => !["cancelled", "refunded"].includes(x.booking_status));
        const revenue = active.reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);
        const target  = active.reduce((s, x) => s + Number(x.total_price ?? 0), 0);
        const customers = new Set(active.map((x) => x.customer_id)).size;

        const { count: agentCount } = await supabase
          .from("agents")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", b.id)
          .eq("status", "active");

        return {
          id: b.id,
          name: b.name,
          city: b.city,
          isActive: b.is_active,
          bookingCount: active.length,
          cancelledCount: list.length - active.length,
          revenue,
          target,
          customers,
          agents: agentCount ?? 0,
          conversion: target > 0 ? (revenue / target) * 100 : 0,
        };
      }));
      return results;
    },
  });

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      bookings: acc.bookings + r.bookingCount,
      customers: acc.customers + r.customers,
      agents: acc.agents + r.agents,
    }),
    { revenue: 0, bookings: 0, customers: 0, agents: 0 },
  ), [rows]);

  const ranked = useMemo(
    () => [...rows].sort((a, b) => b.revenue - a.revenue),
    [rows],
  );
  const chartData = ranked.map((r) => ({
    name: r.name,
    Revenue: r.revenue,
    Booking: r.bookingCount,
  }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Perbandingan Cabang</h1>
          <p className="text-sm text-muted-foreground">
            Bandingkan performa semua cabang dalam satu tampilan
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(totals.revenue)} color="text-emerald-600" />
        <KpiCard icon={Package}    label="Total Booking" value={totals.bookings.toString()}      color="text-blue-600" />
        <KpiCard icon={Users}      label="Total Jamaah"  value={totals.customers.toString()}     color="text-purple-600" />
        <KpiCard icon={Building2}  label="Total Agen"    value={totals.agents.toString()}        color="text-amber-600" />
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue per Cabang</CardTitle></CardHeader>
        <CardContent className="h-72">
          {isLoading ? <Skeleton className="h-full w-full" /> : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Belum ada data.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1_000_000).toFixed(0)}jt`} />
                <Tooltip formatter={(v: any, k: any) => k === "Revenue" ? formatCurrency(Number(v)) : v} />
                <Legend />
                <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                <Bar dataKey="Booking" fill="hsl(var(--accent))"  radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Ranking Cabang
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Cabang</th>
                <th className="text-right py-2 px-2">Booking</th>
                <th className="text-right py-2 px-2">Jamaah</th>
                <th className="text-right py-2 px-2">Agen</th>
                <th className="text-right py-2 px-2">Revenue</th>
                <th className="text-right py-2 px-2">Konversi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Memuat…</td></tr>
              ) : ranked.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Tidak ada data.</td></tr>
              ) : ranked.map((r, idx) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2 px-2">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </td>
                  <td className="py-2 px-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.city}</div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {r.bookingCount}
                    {r.cancelledCount > 0 && (
                      <Badge variant="outline" className="ml-1 h-4 text-[10px]">
                        −{r.cancelledCount}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">{r.customers}</td>
                  <td className="py-2 px-2 text-right">{r.agents}</td>
                  <td className="py-2 px-2 text-right font-semibold">{formatCurrency(r.revenue)}</td>
                  <td className="py-2 px-2 text-right">
                    <Badge variant={r.conversion >= 80 ? "default" : "outline"}>
                      {r.conversion.toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold mt-0.5">{value}</p>
          </div>
          <Icon className={`h-7 w-7 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}