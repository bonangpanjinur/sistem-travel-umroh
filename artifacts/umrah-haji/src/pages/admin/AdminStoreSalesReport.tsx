import { useState, useMemo } from "react";
import { useSalesReport } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, DollarSign, Package, Percent, Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, startOfMonth } from "date-fns";

export default function AdminStoreSalesReport() {
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: rows = [], isLoading } = useSalesReport(from, to);

  const summary = useMemo(() => {
    const paid = rows.filter((r) => r.payment_status === "paid");
    const revenue = paid.reduce((s, r) => s + r.total_amount, 0);
    const cogs = paid.reduce((s, r) => s + r.cogs, 0);
    const profit = revenue - cogs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { count: rows.length, paidCount: paid.length, revenue, cogs, profit, margin };
  }, [rows]);

  const exportCSV = () => {
    const head = ["No. Pesanan", "Tanggal", "Pelanggan", "Status", "Bayar", "Total", "HPP", "Laba Kotor"];
    const body = rows.map((r) => [
      r.order_number, format(new Date(r.date), "yyyy-MM-dd HH:mm"),
      r.customer_name ?? "-", r.status, r.payment_status,
      r.total_amount, r.cogs, r.gross_profit,
    ]);
    const csv = [head, ...body].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `laporan-penjualan-${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Laporan Penjualan Toko</h1>
          <p className="text-sm text-muted-foreground">Analisis pendapatan, HPP (avg cost), dan laba kotor per periode.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Pendapatan (paid)" value={formatCurrency(summary.revenue)} bg="bg-green-100" />
        <SummaryCard icon={<Package className="h-5 w-5 text-orange-600" />} label="HPP" value={formatCurrency(summary.cogs)} bg="bg-orange-100" />
        <SummaryCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="Laba Kotor" value={formatCurrency(summary.profit)} bg="bg-blue-100" />
        <SummaryCard icon={<Percent className="h-5 w-5 text-purple-600" />} label="Margin" value={`${summary.margin.toFixed(1)}%`} bg="bg-purple-100" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Detail Pesanan ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>No. Pesanan</TableHead><TableHead>Tanggal</TableHead><TableHead>Pelanggan</TableHead>
              <TableHead>Bayar</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">HPP</TableHead><TableHead className="text-right">Laba</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.order_id}>
                  <TableCell className="font-mono text-xs">{r.order_number}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.date), "dd MMM yy HH:mm")}</TableCell>
                  <TableCell>{r.customer_name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>{r.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(r.cogs)}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.gross_profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(r.gross_profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, bg }: { icon: any; label: string; value: string; bg: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg}`}>{icon}</div>
    </CardContent></Card>
  );
}
