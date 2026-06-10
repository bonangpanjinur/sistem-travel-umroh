import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import { format, differenceInDays, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Save, Plus, Trash2, TrendingUp, TrendingDown, Info, Wand2, RefreshCw,
  Hotel, Download, CheckSquare, Square, Building2,
} from "lucide-react";

interface Props { departureId: string }

const HPP_CATEGORY_LABELS: Record<string, string> = {
  hotel:           "Hotel",
  airline:         "Penerbangan",
  land_transport:  "Transportasi Darat",
  visa:            "Visa",
  handling:        "Handling",
  muthawif:        "Muthawif",
  equipment:       "Perlengkapan",
  manasik:         "Manasik",
  insurance:       "Asuransi",
  document:        "Dokumen",
  marketing:       "Marketing",
  pic_fee:         "PIC / Guide",
  overhead:        "Overhead",
  other:           "Lainnya",
};

const calcNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 0;
  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
  } catch { return 0; }
};

export function DepartureBudgetTab({ departureId }: Props) {
  const queryClient = useQueryClient();
  const { data: budgets = [], isLoading: loadingBudgets } = useDepartureBudget(departureId);
  const { data: costs   = [], isLoading: loadingCosts   } = useDepartureCosts(departureId);
  const saveBudget = useSaveBudget(departureId);

  const [editing, setEditing] = useState<Record<string, string>>({});
  const [newCat,  setNewCat]  = useState<BudgetCategory>("hotel");
  const [newAmt,  setNewAmt]  = useState("");
  const [newDesc, setNewDesc] = useState("");

  // INT-06: Hotel contract import state
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [nightOverrides, setNightOverrides]       = useState<Record<string, string>>({});

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

  // ── INT-06: Hotel contracts untuk keberangkatan ini ─────────────────────────
  const { data: hotelContracts = [] } = useQuery({
    queryKey: ["hotel-contracts-for-departure", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_contracts")
        .select("*, hotel:hotels(id, name, city, star_rating)")
        .eq("departure_id", departureId)
        .order("check_in_date");
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return data || [];
    },
    enabled: !!departureId,
  });

  // ── HPP Terencana: departure_cost_items ─────────────────────────────────────
  const { data: hppItems = [] } = useQuery({
    queryKey: ["departure-cost-items", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_cost_items")
        .select("*")
        .eq("departure_id", departureId)
        .order("sort_order");
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return data || [];
    },
    enabled: !!departureId,
  });

  // Kontrak yang sudah diimpor (via reference_id)
  const importedContractIds = new Set(
    (hppItems as any[]).filter(i => i.reference_id).map(i => i.reference_id)
  );

  // Toggle pilih kontrak
  const toggleContract = (id: string) => {
    setSelectedContracts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Mutation: Import hotel contracts → departure_cost_items ─────────────────
  const importContractsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const toImport = (hotelContracts as any[]).filter(c => ids.includes(c.id));
      if (!toImport.length) throw new Error("Tidak ada kontrak dipilih");
      const inserts = toImport.map(c => {
        const nights = Number(nightOverrides[c.id]) || calcNights(c.check_in_date, c.check_out_date) || 1;
        return {
          departure_id:   departureId,
          category:       "hotel",
          location:       c.hotel?.city || "",
          hotel_id:       c.hotel_id    || null,
          room_type:      c.room_type   || null,
          nights,
          check_in_date:  c.check_in_date  || null,
          check_out_date: c.check_out_date || null,
          description:    `Hotel ${c.hotel?.name || "-"} (${c.room_type}) × ${nights} malam`,
          unit:           "per_room",
          quantity:       c.total_rooms   || 1,
          unit_cost:      (c.price_per_room || 0) * nights,
          currency:       c.currency || "IDR",
          exchange_rate:  1,
          sort_order:     10,
          reference_id:   c.id,
          notes:          c.notes || null,
        };
      });
      const { error } = await supabase.from("departure_cost_items").insert(inserts);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", departureId] });
      setSelectedContracts(new Set());
      setNightOverrides({});
      toast.success(`${count} item HPP hotel berhasil diimpor ke perencana biaya!`);
    },
    onError: (e: any) => toast.error("Gagal import: " + e.message),
  });

  // ── Mutation: Hapus HPP item ─────────────────────────────────────────────────
  const deleteHPPItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departure_cost_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", departureId] });
      toast.success("Item HPP dihapus");
    },
    onError: (e: any) => toast.error("Gagal hapus: " + e.message),
  });

  // ── Budget summary ───────────────────────────────────────────────────────────
  const summary = computeBudgetSummary(budgets, costs);
  const totalBudgeted = summary.reduce((s, r) => s + r.budgeted, 0);
  const totalRealized = summary.reduce((s, r) => s + r.realized, 0);
  const totalVariance = totalBudgeted - totalRealized;
  const totalHPPItems = (hppItems as any[]).reduce((s, i) => s + (Number(i.total_cost_idr) || Number(i.quantity) * Number(i.unit_cost) || 0), 0);

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
      {/* KPI Cards */}
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

      {/* ─── INT-06: Import HPP Hotel dari Kontrak ─────────────────────────────── */}
      {(hotelContracts as any[]).length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm text-blue-900">Import HPP Hotel dari Kontrak</CardTitle>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                {(hotelContracts as any[]).length} kontrak
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  const unimported = (hotelContracts as any[]).filter(c => !importedContractIds.has(c.id)).map(c => c.id);
                  setSelectedContracts(new Set(unimported));
                }}
              >
                Pilih Semua
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                disabled={selectedContracts.size === 0 || importContractsMutation.isPending}
                onClick={() => importContractsMutation.mutate([...selectedContracts])}
              >
                {importContractsMutation.isPending
                  ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Mengimpor...</>
                  : <><Download className="h-3 w-3 mr-1" />Import {selectedContracts.size > 0 ? `(${selectedContracts.size})` : ""} ke HPP</>
                }
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Kota</TableHead>
                    <TableHead>Tipe Kamar</TableHead>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Harga/Kamar/Malam</TableHead>
                    <TableHead>Check-in → Out</TableHead>
                    <TableHead>Malam</TableHead>
                    <TableHead>Total Biaya</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hotelContracts as any[]).map(c => {
                    const nights  = Number(nightOverrides[c.id]) || calcNights(c.check_in_date, c.check_out_date) || 1;
                    const total   = (c.price_per_room || 0) * nights * (c.total_rooms || 1);
                    const alreadyImported = importedContractIds.has(c.id);
                    const isSelected      = selectedContracts.has(c.id);
                    return (
                      <TableRow
                        key={c.id}
                        className={alreadyImported ? "opacity-60 bg-gray-50" : isSelected ? "bg-blue-50" : ""}
                      >
                        <TableCell>
                          {alreadyImported ? (
                            <CheckSquare className="h-4 w-4 text-green-500" />
                          ) : (
                            <button onClick={() => toggleContract(c.id)}>
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                : <Square className="h-4 w-4 text-gray-400" />
                              }
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {c.hotel?.name || "-"}
                          {c.hotel?.star_rating && (
                            <span className="text-xs text-amber-500 ml-1">{"★".repeat(c.hotel.star_rating)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{c.hotel?.city || "-"}</TableCell>
                        <TableCell className="text-sm capitalize">{c.room_type}</TableCell>
                        <TableCell className="text-sm">{c.total_rooms}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(c.price_per_room || 0)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.check_in_date  ? format(parseISO(c.check_in_date),  "dd MMM", { locale: localeId }) : "-"}
                          {" → "}
                          {c.check_out_date ? format(parseISO(c.check_out_date), "dd MMM yy", { locale: localeId }) : "-"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-7 w-16 text-xs"
                            value={nightOverrides[c.id] ?? (calcNights(c.check_in_date, c.check_out_date) || "")}
                            onChange={e => setNightOverrides(prev => ({ ...prev, [c.id]: e.target.value }))}
                            min={1}
                            disabled={alreadyImported}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{formatCurrency(total)}</TableCell>
                        <TableCell>
                          {alreadyImported ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
                              ✓ Sudah Diimpor
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs capitalize">{c.status || "draft"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── HPP Terencana (departure_cost_items) ─────────────────────────────── */}
      {(hppItems as any[]).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm">HPP Terencana</CardTitle>
              <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                {(hppItems as any[]).length} item
              </Badge>
            </div>
            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(totalHPPItems)}</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Harga Satuan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hppItems as any[]).map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {HPP_CATEGORY_LABELS[item.category] || item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.location || "-"}</TableCell>
                      <TableCell className="text-sm">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(Number(item.unit_cost) || 0)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(Number(item.total_cost_idr) || (Number(item.quantity) * Number(item.unit_cost)) || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => deleteHPPItemMutation.mutate(item.id)}
                          disabled={deleteHPPItemMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="border-blue-200 bg-blue-50 py-2">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          Data realisasi berasal dari tabel vendor_costs. HPP Terencana berasal dari departure_cost_items (import kontrak / template).
        </AlertDescription>
      </Alert>

      {/* Budget vs Realisasi table */}
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

      {/* Tambah Budget */}
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
