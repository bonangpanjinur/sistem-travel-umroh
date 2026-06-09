import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BookOpen, Download, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function AdminBukuBesar() {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + "-01-01");
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  // Fetch COA
  const { data: coa = [] } = useQuery({
    queryKey: ["coa-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("coa_categories").select("code,name").eq("is_active", true).order("code");
      return (data || []) as Array<{ code: string; name: string }>;
    },
  });

  // Fetch ledger lines for selected account
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["buku-besar", selectedAccount, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedAccount) return [];
      const { data } = await (supabase as any)
        .from("journal_entry_lines")
        .select("*, entry:journal_entries!journal_entry_lines_entry_id_fkey(entry_number, entry_date, description, is_posted)")
        .eq("account_code", selectedAccount)
        .gte("entry.entry_date", dateFrom)
        .lte("entry.entry_date", dateTo)
        .order("entry.entry_date", { ascending: true });
      return (data || []).filter((l: any) => l.entry) as any[];
    },
    enabled: !!selectedAccount,
  });

  const selectedCOA = coa.find(c => c.code === selectedAccount);

  const { totalDebit, totalCredit, runningBalance } = useMemo(() => {
    let balance = 0;
    const withBalance = lines.map((l: any) => {
      balance += (l.debit || 0) - (l.credit || 0);
      return { ...l, running_balance: balance };
    });
    return {
      totalDebit: lines.reduce((s: number, l: any) => s + (l.debit || 0), 0),
      totalCredit: lines.reduce((s: number, l: any) => s + (l.credit || 0), 0),
      runningBalance: withBalance,
    };
  }, [lines]);

  const netBalance = totalDebit - totalCredit;

  const handleExport = () => {
    if (!lines.length) return;
    const rows = runningBalance.map((l: any) => ({
      "Tgl Jurnal": l.entry?.entry_date,
      "No. Jurnal": l.entry?.entry_number,
      "Deskripsi Entry": l.entry?.description,
      "Deskripsi Baris": l.description,
      "Debit (Rp)": l.debit || 0,
      "Kredit (Rp)": l.credit || 0,
      "Saldo (Rp)": l.running_balance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buku Besar");
    XLSX.writeFile(wb, `buku-besar-${selectedAccount}-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Buku Besar</h1>
          <p className="text-muted-foreground">Mutasi per akun COA dari jurnal umum</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!lines.length}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Filter Panel */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Akun COA</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger><SelectValue placeholder="Pilih akun…" /></SelectTrigger>
              <SelectContent>
                {coa.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      {!selectedAccount ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">Pilih akun COA untuk melihat buku besar</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          {!isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalDebit)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Kredit</p>
                  <p className="text-2xl font-bold text-red-500">{fmt(totalCredit)}</p>
                </CardContent>
              </Card>
              <Card className={netBalance >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Saldo Bersih</p>
                  <div className="flex items-center gap-2">
                    {netBalance >= 0
                      ? <TrendingUp className="h-5 w-5 text-green-600" />
                      : <TrendingDown className="h-5 w-5 text-red-500" />}
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt(Math.abs(netBalance))}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {netBalance >= 0 ? "Debit" : "Kredit"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ledger Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedCOA ? `${selectedCOA.code} — ${selectedCOA.name}` : selectedAccount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : runningBalance.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  Tidak ada mutasi untuk akun ini pada periode yang dipilih
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Tanggal</TableHead>
                      <TableHead className="w-32">No. Jurnal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right w-32">Debit</TableHead>
                      <TableHead className="text-right w-32">Kredit</TableHead>
                      <TableHead className="text-right w-36">Saldo Berjalan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runningBalance.map((l: any, i: number) => (
                      <TableRow key={l.id || i}>
                        <TableCell className="text-sm">
                          {l.entry?.entry_date ? format(new Date(l.entry.entry_date), "d MMM yyyy", { locale: localeId }) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.entry?.entry_number}</TableCell>
                        <TableCell className="text-sm">
                          <span className="text-muted-foreground">{l.entry?.description}</span>
                          {l.description && <> — {l.description}</>}
                        </TableCell>
                        <TableCell className="text-right text-sm">{l.debit > 0 ? fmt(l.debit) : ""}</TableCell>
                        <TableCell className="text-right text-sm">{l.credit > 0 ? fmt(l.credit) : ""}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${l.running_balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {fmt(Math.abs(l.running_balance))} {l.running_balance < 0 ? "(K)" : "(D)"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-bold bg-muted/30">
                      <TableCell colSpan={3} className="text-sm">Total</TableCell>
                      <TableCell className="text-right text-sm">{fmt(totalDebit)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(totalCredit)}</TableCell>
                      <TableCell className={`text-right text-sm ${netBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {fmt(Math.abs(netBalance))} {netBalance < 0 ? "(K)" : "(D)"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
