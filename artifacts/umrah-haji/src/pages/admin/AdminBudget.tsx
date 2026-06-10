import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { PiggyBank, Plus, Edit, Trash2, AlertTriangle, CheckCircle2, TrendingUp, Plane } from "lucide-react";

const DEP_BUDGET_LABELS: Record<string, string> = {
  hotel: "Akomodasi Hotel",
  tiket: "Tiket Penerbangan",
  visa: "Biaya Visa",
  katering: "Katering / Konsumsi",
  transportasi: "Transportasi",
  handling: "Handling Bandara",
  manasik: "Biaya Manasik",
  perlengkapan: "Perlengkapan Jamaah",
  other: "Lainnya",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy", { locale: localeId }), year: d.getFullYear(), month: d.getMonth() + 1 };
});

export default function AdminBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ account_code: "", budget_amount: "", notes: "" });

  const [periodYear, periodMonth] = selectedMonth.split("-").map(Number);

  const { data: coa = [] } = useQuery({
    queryKey: ["coa-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("coa_categories").select("code,name").eq("is_active", true).order("code");
      return (data || []) as Array<{ code: string; name: string }>;
    },
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", periodYear, periodMonth],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("finance_budgets")
        .select("*")
        .eq("period_year", periodYear)
        .eq("period_month", periodMonth)
        .order("account_code");
      return data || [];
    },
  });

  // Aktual dari cash_transactions + vendor_costs untuk bulan ini
  const dateFrom = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
  const dateToObj = new Date(periodYear, periodMonth, 0);
  const dateTo = format(dateToObj, "yyyy-MM-dd");

  // Budget Keberangkatan — departure_budgets digroup per kategori untuk bulan ini
  const { data: departureBudgets = [], isLoading: loadDepBudget } = useQuery({
    queryKey: ["departure-budgets-monthly", periodYear, periodMonth],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("departure_budgets")
        .select("category, budgeted_amount, departure_id, departures!inner(id, departure_date, packages!inner(name, code))")
        .gte("departures.departure_date", dateFrom)
        .lte("departures.departure_date", dateTo);
      return data || [];
    },
  });

  // Realisasi vendor_costs per keberangkatan bulan ini
  const { data: depVendorCosts = [], isLoading: loadDepVC } = useQuery({
    queryKey: ["dep-vendor-costs-monthly", periodYear, periodMonth],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_costs")
        .select("amount, cost_type, departure_id")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo)
        .not("departure_id", "is", null);
      return data || [];
    },
  });

  // Aggregasi departure_budgets per kategori
  const depBudgetByCategory = (departureBudgets as any[]).reduce((acc: Record<string, number>, b: any) => {
    const k = b.category || "other";
    acc[k] = (acc[k] || 0) + (b.budgeted_amount || 0);
    return acc;
  }, {});

  // Aggregasi vendor_costs per departure sebagai realisasi
  const depActualByCategory = (depVendorCosts as any[]).reduce((acc: Record<string, number>, v: any) => {
    const k = (v.cost_type || "other").toLowerCase();
    acc[k] = (acc[k] || 0) + (v.amount || 0);
    return acc;
  }, {});

  const totalDepBudget = Object.values(depBudgetByCategory).reduce((s: number, v: any) => s + v, 0);
  const totalDepActual = Object.values(depActualByCategory).reduce((s: number, v: any) => s + v, 0);

  // Departures dalam bulan ini
  const departuresThisMonth = Array.from(
    new Map(
      (departureBudgets as any[]).map((b: any) => [
        b.departure_id,
        { id: b.departure_id, departure_date: b.departures?.departure_date, name: b.departures?.packages?.name, code: b.departures?.packages?.code }
      ])
    ).values()
  );

  const { data: actuals = [] } = useQuery({
    queryKey: ["budget-actuals", periodYear, periodMonth],
    queryFn: async () => {
      const [cashData, vcData] = await Promise.all([
        (supabase as any).from("cash_transactions").select("amount, category").eq("type", "out").gte("transaction_date", dateFrom).lte("transaction_date", dateTo),
        (supabase as any).from("vendor_costs").select("amount, cost_type").gte("created_at", dateFrom).lte("created_at", dateTo),
      ]);
      const result: Record<string, number> = {};
      (cashData.data || []).forEach((c: any) => {
        result[c.category || "other"] = (result[c.category || "other"] || 0) + (c.amount || 0);
      });
      return result;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        period_year: periodYear,
        period_month: periodMonth,
        account_code: form.account_code,
        budget_amount: parseFloat(form.budget_amount) || 0,
        notes: form.notes,
        created_by: user?.id,
      };
      if (editing) {
        const { error } = await (supabase as any).from("finance_budgets").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("finance_budgets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Budget diperbarui" : "Budget disimpan");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ account_code: "", budget_amount: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("finance_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget dihapus");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ account_code: b.account_code, budget_amount: String(b.budget_amount), notes: b.notes || "" });
    setDialogOpen(true);
  };

  const totalBudget = budgets.reduce((s: number, b: any) => s + (b.budget_amount || 0), 0);
  const totalActual = Object.values(actuals as Record<string, number>).reduce((s, v) => s + v, 0);

  const budgetWithActual = budgets.map((b: any) => {
    const actual = (actuals as Record<string, number>)[b.account_code] || 0;
    const pct = b.budget_amount > 0 ? (actual / b.budget_amount) * 100 : 0;
    return { ...b, actual, pct };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PiggyBank className="h-6 w-6" /> Budget vs Aktual</h1>
          <p className="text-muted-foreground">Anggaran per kategori akun dan perbandingan dengan realisasi</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ account_code: "", budget_amount: "", notes: "" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Budget
        </Button>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4 flex gap-4 items-center flex-wrap">
          <div>
            <Label className="text-xs">Periode</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
              <p className="font-bold text-lg">{fmt(totalBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Aktual</p>
              <p className={`font-bold text-lg ${totalActual > totalBudget ? "text-red-600" : "text-green-600"}`}>{fmt(totalActual)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sisa Budget</p>
              <p className="font-bold text-lg">{fmt(totalBudget - totalActual)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall progress */}
      {totalBudget > 0 && (
        <div className="px-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Penyerapan Anggaran Keseluruhan</span>
            <span>{Math.min((totalActual / totalBudget) * 100, 100).toFixed(1)}%</span>
          </div>
          <Progress value={Math.min((totalActual / totalBudget) * 100, 100)} className="h-2" />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="operasional">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="operasional" className="flex-1 sm:flex-none">
            <PiggyBank className="h-4 w-4 mr-1.5" /> Budget Operasional
          </TabsTrigger>
          <TabsTrigger value="keberangkatan" className="flex-1 sm:flex-none">
            <Plane className="h-4 w-4 mr-1.5" /> Budget Keberangkatan
          </TabsTrigger>
        </TabsList>

        {/* Tab: Budget Operasional (COA) */}
        <TabsContent value="operasional">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : budgetWithActual.length === 0 ? (
            <div className="p-12 text-center">
              <PiggyBank className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Belum ada anggaran untuk periode ini</p>
              <p className="text-xs text-muted-foreground mt-1">Pastikan tabel finance_budgets sudah dibuat (jalankan migrasi SQL)</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akun COA</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Aktual</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="w-40">Penyerapan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetWithActual.map((b: any) => {
                  const sisa = b.budget_amount - b.actual;
                  const isOver = b.actual > b.budget_amount;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-mono text-xs text-muted-foreground">{b.account_code}</p>
                        <p className="text-sm">{coa.find(c => c.code === b.account_code)?.name || b.account_code}</p>
                        {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(b.budget_amount)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${isOver ? "text-red-600" : ""}`}>{fmt(b.actual)}</TableCell>
                      <TableCell className={`text-right text-sm ${sisa < 0 ? "text-red-600 font-semibold" : "text-green-600"}`}>{fmt(sisa)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(b.pct, 100)} className={`h-1.5 flex-1 ${isOver ? "[&>div]:bg-red-500" : ""}`} />
                          <span className="text-xs w-10 text-right">{b.pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOver
                          ? <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Over</Badge>
                          : b.pct >= 80
                          ? <Badge className="text-xs bg-yellow-100 text-yellow-700"><TrendingUp className="h-3 w-3 mr-1" />Hampir</Badge>
                          : <Badge className="text-xs bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Normal</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab: Budget Keberangkatan */}
        <TabsContent value="keberangkatan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget Keberangkatan Periode Ini</CardTitle>
              <CardDescription>
                Sumber: <code className="text-xs">departure_budgets</code> — per kategori biaya, keberangkatan yang berada di periode {selectedMonth}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadDepBudget || loadDepVC ? (
                <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : departuresThisMonth.length === 0 ? (
                <div className="text-center py-8">
                  <Plane className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Tidak ada keberangkatan di periode ini</p>
                  <p className="text-xs text-muted-foreground mt-1">Atau tabel departure_budgets belum diisi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Budget</p>
                      <p className="font-bold text-orange-700">{fmt(totalDepBudget)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Realisasi (AP)</p>
                      <p className="font-bold text-red-700">{fmt(totalDepActual)}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${totalDepBudget - totalDepActual >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <p className="text-xs text-muted-foreground">Sisa Budget</p>
                      <p className={`font-bold ${totalDepBudget - totalDepActual >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {fmt(totalDepBudget - totalDepActual)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {totalDepBudget > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Penyerapan Budget Keberangkatan</span>
                        <span>{Math.min((totalDepActual / totalDepBudget) * 100, 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min((totalDepActual / totalDepBudget) * 100, 100)} className={`h-2 ${totalDepActual > totalDepBudget ? "[&>div]:bg-red-500" : ""}`} />
                    </div>
                  )}

                  {/* Per category breakdown */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori Biaya</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Realisasi AP</TableHead>
                        <TableHead className="text-right">Selisih</TableHead>
                        <TableHead>Serapan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys({ ...depBudgetByCategory, ...depActualByCategory }).map(cat => {
                        const budget = (depBudgetByCategory as any)[cat] || 0;
                        const actual = (depActualByCategory as any)[cat] || 0;
                        const sisa = budget - actual;
                        const pct = budget > 0 ? (actual / budget) * 100 : 0;
                        return (
                          <TableRow key={cat}>
                            <TableCell className="text-sm">{DEP_BUDGET_LABELS[cat] || cat}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(budget)}</TableCell>
                            <TableCell className={`text-right text-sm font-medium ${actual > budget ? "text-red-600" : ""}`}>{fmt(actual)}</TableCell>
                            <TableCell className={`text-right text-sm ${sisa < 0 ? "text-red-600 font-semibold" : "text-green-600"}`}>{fmt(sisa)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={Math.min(pct, 100)} className={`h-1.5 flex-1 ${pct > 100 ? "[&>div]:bg-red-500" : ""}`} />
                                <span className="text-xs w-10 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Departures list */}
                  {departuresThisMonth.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Keberangkatan dalam periode ini:</p>
                      <div className="flex flex-wrap gap-2">
                        {departuresThisMonth.map((dep: any) => (
                          <Badge key={dep.id} variant="outline" className="text-xs">
                            <Plane className="h-3 w-3 mr-1" />
                            {dep.code} — {dep.departure_date ? dep.departure_date.slice(0, 10) : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Budget" : "Tambah Budget"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Akun COA</Label>
              <Select value={form.account_code} onValueChange={v => setForm(f => ({ ...f, account_code: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih akun…" /></SelectTrigger>
                <SelectContent>
                  {coa.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah Budget (Rp)</Label>
              <Input type="number" value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.account_code || !form.budget_amount || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
