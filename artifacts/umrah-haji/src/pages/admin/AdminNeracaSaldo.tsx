import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Scale, Download, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function AdminNeracaSaldo() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + "-01-01");
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: coa = [] } = useQuery({
    queryKey: ["coa-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("coa_categories").select("code,name,parent_code").eq("is_active", true).order("code");
      return (data || []) as Array<{ code: string; name: string; parent_code: string | null }>;
    },
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["neraca-saldo-lines", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("journal_entry_lines")
        .select("account_code, debit, credit, entry:journal_entries!journal_entry_lines_entry_id_fkey(entry_date, is_posted)")
        .gte("entry.entry_date", dateFrom)
        .lte("entry.entry_date", dateTo)
        .eq("entry.is_posted", true);
      return (data || []).filter((l: any) => l.entry) as any[];
    },
  });

  // Aggregate per account
  const trialBalance = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    lines.forEach((l: any) => {
      const cur = map.get(l.account_code) || { debit: 0, credit: 0 };
      map.set(l.account_code, {
        debit: cur.debit + (l.debit || 0),
        credit: cur.credit + (l.credit || 0),
      });
    });

    const result: Array<{
      code: string; name: string;
      debit: number; credit: number;
      netDebit: number; netCredit: number;
    }> = [];

    map.forEach((val, code) => {
      const coaEntry = coa.find(c => c.code === code);
      const net = val.debit - val.credit;
      result.push({
        code,
        name: coaEntry?.name || code,
        debit: val.debit,
        credit: val.credit,
        netDebit: Math.max(net, 0),
        netCredit: Math.max(-net, 0),
      });
    });

    return result.sort((a, b) => a.code.localeCompare(b.code));
  }, [lines, coa]);

  const totalDebit = trialBalance.reduce((s, r) => s + r.netDebit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.netCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  const handleExport = () => {
    if (!trialBalance.length) return;
    const rows = trialBalance.map(r => ({
      "Kode": r.code,
      "Nama Akun": r.name,
      "Total Debit (Rp)": r.debit,
      "Total Kredit (Rp)": r.credit,
      "Saldo Debit (Rp)": r.netDebit,
      "Saldo Kredit (Rp)": r.netCredit,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Neraca Saldo");
    XLSX.writeFile(wb, `neraca-saldo-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" /> Neraca Saldo</h1>
          <p className="text-muted-foreground">Ringkasan saldo debit & kredit per akun COA pada periode tertentu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["neraca-saldo-lines"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!trialBalance.length}>
            <Download className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4 items-end">
          <div>
            <Label>Dari Tanggal</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Sampai Tanggal</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Balance status */}
      {!isLoading && trialBalance.length > 0 && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isBalanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {isBalanced
            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
            : <AlertCircle className="h-5 w-5 text-red-600" />}
          <div>
            <p className={`font-semibold text-sm ${isBalanced ? "text-green-700" : "text-red-700"}`}>
              {isBalanced ? "Neraca Balance ✓" : "Neraca Tidak Balance!"}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Debit: {fmt(totalDebit)} | Total Kredit: {fmt(totalCredit)}
              {!isBalanced && ` | Selisih: ${fmt(Math.abs(totalDebit - totalCredit))}`}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : trialBalance.length === 0 ? (
            <div className="p-12 text-center">
              <Scale className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Belum ada data jurnal pada periode ini</p>
              <p className="text-xs text-muted-foreground mt-1">Pastikan tabel journal_entries sudah dibuat dan ada entri yang diposting</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Total Debit</TableHead>
                  <TableHead className="text-right">Total Kredit</TableHead>
                  <TableHead className="text-right bg-green-50">Saldo Debit</TableHead>
                  <TableHead className="text-right bg-red-50">Saldo Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map(row => (
                  <TableRow key={row.code} className={row.netDebit === 0 && row.netCredit === 0 ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-xs font-semibold">{row.code}</TableCell>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(row.debit)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(row.credit)}</TableCell>
                    <TableCell className="text-right text-sm font-medium bg-green-50/50">
                      {row.netDebit > 0 ? fmt(row.netDebit) : ""}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium bg-red-50/50">
                      {row.netCredit > 0 ? fmt(row.netCredit) : ""}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total */}
                <TableRow className="font-bold bg-muted/30 border-t-2">
                  <TableCell colSpan={2} className="text-sm">TOTAL</TableCell>
                  <TableCell className="text-right text-sm">{fmt(trialBalance.reduce((s, r) => s + r.debit, 0))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(trialBalance.reduce((s, r) => s + r.credit, 0))}</TableCell>
                  <TableCell className="text-right text-sm bg-green-50">{fmt(totalDebit)}</TableCell>
                  <TableCell className={`text-right text-sm bg-red-50 ${!isBalanced ? "text-red-600" : ""}`}>{fmt(totalCredit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
