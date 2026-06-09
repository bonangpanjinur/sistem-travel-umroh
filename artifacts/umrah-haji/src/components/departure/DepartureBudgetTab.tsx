import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import {
  useDepartureBudget, useDepartureCosts, useSaveBudget,
  computeBudgetSummary, BUDGET_CATEGORIES, BudgetCategory
} from "@/hooks/useDepartureBudget";
import { usePackageHPPTemplate } from "@/hooks/usePackageHPPTemplate";
import { formatCurrency } from "@/lib/format";
import { Save, Plus, Trash2, TrendingUp, TrendingDown, Info, Wand2, RefreshCw } from "lucide-react";

interface Props { departureId: string }

export function DepartureBudgetTab({ departureId }: Props) {
  const queryClient = useQueryClient();
  const { data: budgets = [], isLoading: loadingBudgets } = useDepartureBudget(departureId);
  const { data: costs   = [], isLoading: loadingCosts   } = useDepartureCosts(departureId);
  const saveBudget = useSaveBudget(departureId);

  const [editing, setEditing] = useState<Record<string, string>>({});
  const [newCat,  setNewCat]  = useState<BudgetCategory>("hotel");
  const [newAmt,  setNewAmt]  = useState("");
  const [newDesc, setNewDesc] = useState("");

  // ── A3: HPP Template Auto-Apply ─────────────────────────────────────────────
  const { data: departureInfo } = useQuery({
    queryKey: ["departure-package-id", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, package_id")
        .eq("id", departureId)
        .single();
      if (error) throw error;
      return data as { id: string; package_id: string };
    },
  });

  const packageId = departureInfo?.package_id;
  const { templateItems, hasTemplate, totalHPP, isApplying, applyTemplate } =
    usePackageHPPTemplate(packageId);

  const handleApplyHPPTemplate = async (mode: "append" | "replace") => {
    if (!hasTemplate) {
      toast.info("Tidak ada template HPP tersimpan untuk paket ini. Buat dulu di halaman Paket → HPP.");
      return;
    }
    await applyTemplate({ templateItems, departureId, mode });
  };

  const summary = computeBudgetSummary(budgets, costs);

  const totalBudgeted = summary.reduce((s, r) => s + r.budgeted, 0);
  const totalRealized = summary.reduce((s, r) => s + r.realized, 0);
  const totalVariance = totalBudgeted - totalRealized;

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departure_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-budget", departureId] });
      toast.success("Budget dihapus");
    },
  });

  const handleSaveAll = async () => {
    const updates = budgets
      .filter(b => editing[b.id] !== undefined)
      .map(b => ({ ...b, budgeted_amount: parseFloat(editing[b.id]) || b.budgeted_amount }));
    if (updates.length === 0) { toast.info("Tidak ada perubahan"); return; }
    await saveBudget.mutateAsync(updates);
    setEditing({});
  };

  const handleAddBudget = async () => {
    if (!newAmt) { toast.error("Masukkan jumlah budget"); return; }
    await saveBudget.mutateAsync([{
      category: newCat, budgeted_amount: parseFloat(newAmt), description: newDesc || undefined,
    }]);
    setNewAmt(""); setNewDesc("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Realisasi</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(totalRealized)}</p>
          </CardContent>
        </Card>
        <Card className={totalVariance < 0 ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Variance</p>
            <div className="flex items-center gap-1.5">
              {totalVariance < 0 ? <TrendingDown className="h-4 w-4 text-red-600" /> : <TrendingUp className="h-4 w-4 text-green-600" />}
              <p className={`text-xl font-bold ${totalVariance < 0 ? "text-red-700" : "text-green-700"}`}>
                {formatCurrency(Math.abs(totalVariance))}
              </p>
              <span className={`text-xs ${totalVariance < 0 ? "text-red-600" : "text-green-600"}`}>
                {totalVariance < 0 ? "Over" : "Under"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* A3: HPP Template Auto-Apply Banner */}
      {hasTemplate && (
        <Alert className="border-emerald-200 bg-emerald-50 py-2">
          <Wand2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs text-emerald-800 flex items-center justify-between gap-2 flex-wrap">
            <span>
              Template HPP paket tersedia: <strong>{templateItems.length} item</strong>
              {" "}({formatCurrency(totalHPP)} HPP total).
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                onClick={() => handleApplyHPPTemplate("append")}
                disabled={isApplying}
              >
                <Plus className="h-3 w-3 mr-1" />
                Tambah dari Template
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleApplyHPPTemplate("replace")}
                disabled={isApplying}
              >
                {isApplying ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                Terapkan Template (Ganti)
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-blue-200 bg-blue-50 py-2">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          Data realisasi berasal dari tabel vendor_costs. Pastikan semua biaya vendor tercatat dengan benar.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Budget vs Realisasi per Kategori</CardTitle>
          {Object.keys(editing).length > 0 && (
            <Button size="sm" onClick={handleSaveAll} disabled={saveBudget.isPending}>
              <Save className="h-4 w-4 mr-1" /> Simpan Perubahan
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Budget (IDR)</TableHead>
                <TableHead>Realisasi</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>%</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBudgets ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6">Memuat...</TableCell></TableRow>
              ) : summary.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Belum ada budget. Tambahkan baris di bawah.</TableCell></TableRow>
              ) : summary.map(row => {
                const budgetRow = budgets.find(b => b.category === row.category);
                const isOver = row.variance < 0;
                return (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium text-sm">{BUDGET_CATEGORIES[row.category] || row.category}</TableCell>
                    <TableCell>
                      {budgetRow ? (
                        <Input
                          type="number"
                          className="h-8 w-32 text-sm"
                          value={editing[budgetRow.id] ?? budgetRow.budgeted_amount.toString()}
                          onChange={e => setEditing(prev => ({ ...prev, [budgetRow.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-sm">{formatCurrency(row.budgeted)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(row.realized)}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${isOver ? "text-red-600" : "text-green-600"}`}>
                        {isOver ? "-" : ""}{formatCurrency(Math.abs(row.variance))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${isOver ? "border-red-300 text-red-700 bg-red-50" : "border-green-300 text-green-700 bg-green-50"}`}>
                        {row.variancePct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {budgetRow && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => deleteBudget.mutate(budgetRow.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Tambah Budget Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Kategori</Label>
              <select
                className="mt-1 block w-[180px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={newCat}
                onChange={e => setNewCat(e.target.value as BudgetCategory)}
              >
                {Object.entries(BUDGET_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Jumlah Budget (IDR)</Label>
              <Input className="mt-1 h-9 w-40 text-sm" type="number" value={newAmt} onChange={e => setNewAmt(e.target.value)} placeholder="0" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Deskripsi</Label>
              <Input className="mt-1 h-9 text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opsional..." />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={handleAddBudget} disabled={saveBudget.isPending || !newAmt}>
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
