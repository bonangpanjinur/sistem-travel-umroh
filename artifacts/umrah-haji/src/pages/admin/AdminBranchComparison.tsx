import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Building2, Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";

const CHART_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6",
];

function exportToCSV(rows: any[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function AdminBranchComparison() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: branches = [] } = useQuery({
    queryKey: ["branch-comparison-list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("id, name, code, city, province, is_active")
        .order("name");
      return data ?? [];
    },
  });

  const { data: statsMap = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["branch-comparison-stats", [...selectedIds].sort().join(",")],
    queryFn: async () => {
      if (selectedIds.size === 0) return {};
      const ids = [...selectedIds];
      const result: Record<string, any> = {};

      await Promise.all(ids.map(async (branchId) => {
        const [bookingsRes, agentRes, commRes] = await Promise.all([
          (supabase as any)
            .from("bookings")
            .select("id, total_price, booking_status")
            .eq("branch_id", branchId),
          (supabase as any)
            .from("agents")
            .select("id", { count: "exact", head: true })
            .eq("branch_id", branchId)
            .eq("status", "active"),
          (supabase as any)
            .from("branch_commissions")
            .select("commission_amount, status")
            .eq("branch_id", branchId),
        ]);

        const bk = bookingsRes.data ?? [];
        const confirmed = bk.filter((b: any) =>
          b.booking_status === "confirmed" || b.booking_status === "completed"
        );
        const revenue = confirmed.reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
        const cd = commRes.data ?? [];
        const commTotal = cd.reduce((s: number, c: any) => s + Number(c.commission_amount ?? 0), 0);
        const commPaid = cd.filter((c: any) => c.status === "paid")
          .reduce((s: number, c: any) => s + Number(c.commission_amount ?? 0), 0);

        result[branchId] = {
          totalBooking: bk.length,
          confirmedBooking: confirmed.length,
          revenue,
          agentAktif: agentRes.count ?? 0,
          komisiTotal: commTotal,
          komisiDibayar: commPaid,
        };
      }));

      return result;
    },
    enabled: selectedIds.size > 0,
  });

  function toggleBranch(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedBranches = useMemo(
    () => branches.filter((b: any) => selectedIds.has(b.id)),
    [branches, selectedIds]
  );

  const chartData = useMemo(() => {
    if (selectedBranches.length < 2) return [];
    return [
      {
        metric: "Total Booking",
        ...Object.fromEntries(selectedBranches.map((b: any) => [b.name, statsMap[b.id]?.totalBooking ?? 0])),
      },
      {
        metric: "Booking Confirmed",
        ...Object.fromEntries(selectedBranches.map((b: any) => [b.name, statsMap[b.id]?.confirmedBooking ?? 0])),
      },
      {
        metric: "Agen Aktif",
        ...Object.fromEntries(selectedBranches.map((b: any) => [b.name, statsMap[b.id]?.agentAktif ?? 0])),
      },
    ];
  }, [selectedBranches, statsMap]);

  const kpiRows = [
    { label: "Total Booking",       key: "totalBooking",     fmt: (v: number) => v.toString() },
    { label: "Booking Confirmed",   key: "confirmedBooking", fmt: (v: number) => v.toString() },
    { label: "Revenue Confirmed",   key: "revenue",          fmt: formatCurrency },
    { label: "Agen Aktif",          key: "agentAktif",       fmt: (v: number) => v.toString() },
    { label: "Total Komisi",        key: "komisiTotal",      fmt: formatCurrency },
    { label: "Komisi Dibayar",      key: "komisiDibayar",    fmt: formatCurrency },
  ];

  function exportComparison() {
    const rows = kpiRows.map((kpi) => ({
      KPI: kpi.label,
      ...Object.fromEntries(selectedBranches.map((b: any) => [b.name, statsMap[b.id]?.[kpi.key] ?? 0])),
    }));
    exportToCSV(rows, `perbandingan-cabang-${format(new Date(), "yyyyMMdd")}.csv`);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Perbandingan Cabang</h1>
          <p className="text-sm text-muted-foreground">
            Bandingkan KPI 2 atau lebih cabang secara berdampingan
          </p>
        </div>
        {selectedBranches.length >= 2 && (
          <Button variant="outline" size="sm" onClick={exportComparison}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Branch Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Pilih Cabang
            </CardTitle>
            <p className="text-xs text-muted-foreground">Pilih minimal 2 cabang</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada cabang.</p>
            ) : (
              branches.map((b: any, i: number) => (
                <div key={b.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`b-${b.id}`}
                    checked={selectedIds.has(b.id)}
                    onCheckedChange={() => toggleBranch(b.id)}
                  />
                  <Label htmlFor={`b-${b.id}`} className="flex-1 cursor-pointer">
                    <span
                      className="font-medium text-sm"
                      style={{ color: selectedIds.has(b.id) ? CHART_COLORS[[...selectedIds].indexOf(b.id) % CHART_COLORS.length] : undefined }}
                    >
                      {b.name}
                    </span>
                    {b.city && (
                      <span className="text-xs text-muted-foreground ml-1">· {b.city}</span>
                    )}
                  </Label>
                  {!b.is_active && (
                    <Badge variant="outline" className="text-xs">Nonaktif</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Comparison Area */}
        <div className="md:col-span-2 space-y-4">
          {selectedBranches.length < 2 ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Pilih minimal 2 cabang</p>
                <p className="text-sm">Centang cabang di sebelah kiri untuk membandingkan KPI</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tabel KPI</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Metrik</TableHead>
                          {selectedBranches.map((b: any, i: number) => (
                            <TableHead
                              key={b.id}
                              style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                            >
                              {b.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={selectedBranches.length + 1}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Memuat data…
                            </TableCell>
                          </TableRow>
                        ) : (
                          kpiRows.map((kpi) => {
                            const values = selectedBranches.map(
                              (b: any) => statsMap[b.id]?.[kpi.key] ?? 0
                            );
                            const max = Math.max(...values);
                            return (
                              <TableRow key={kpi.key}>
                                <TableCell className="font-medium text-sm">{kpi.label}</TableCell>
                                {selectedBranches.map((b: any) => {
                                  const v = statsMap[b.id]?.[kpi.key] ?? 0;
                                  const isMax = v > 0 && v === max;
                                  return (
                                    <TableCell
                                      key={b.id}
                                      className={isMax ? "font-bold text-emerald-700" : ""}
                                    >
                                      {kpi.fmt(v)}
                                      {isMax && selectedBranches.length > 1 && (
                                        <span className="ml-1">🏆</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              {chartData.length > 0 && !statsLoading && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Grafik Perbandingan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {selectedBranches.map((b: any, i: number) => (
                          <Bar
                            key={b.id}
                            dataKey={b.name}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
