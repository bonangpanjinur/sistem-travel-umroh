/**
 * EquipmentConfirmationTabWithPhoto — B8: Konfirmasi Penerimaan Perlengkapan + Foto Bukti
 *
 * Admin/operator can mark that a jamaah has confirmed receipt of their equipment.
 * Now includes viewing and managing photo proof of distribution.
 * Supports per-jamaah toggle and bulk-confirm for entire departure.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Clock, Users, Package, RefreshCcw, CheckSquare, Search, Camera, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  departureId: string;
}

interface DistRow {
  id: string;
  customer_id: string;
  confirmed_by_jamaah: boolean;
  confirmed_at: string | null;
  distributed_at: string;
  quantity: number;
  size: string | null;
  distribution_photo_url: string | null;
  distribution_photo_uploaded_at: string | null;
  equipment: { id: string; name: string; category: string };
  customer: { id: string; full_name: string };
}

interface JamaahSummary {
  customer_id: string;
  full_name: string;
  total: number;
  confirmed: number;
  withPhotos: number;
  rows: DistRow[];
}

export function EquipmentConfirmationTabWithPhoto({ departureId }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewEquipmentName, setPreviewEquipmentName] = useState<string>("");

  const { data: rows = [], isLoading, refetch } = useQuery<DistRow[]>({
    queryKey: ["equipment-confirmation", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select(`
          id, customer_id, confirmed_by_jamaah, confirmed_at,
          distributed_at, quantity, size, distribution_photo_url, distribution_photo_uploaded_at,
          equipment:equipment_items(id, name, category),
          customer:customers(id, full_name)
        `)
        .eq("departure_id", departureId)
        .eq("status", "distributed")
        .order("customer_id");
      if (error) throw error;
      return (data || []) as DistRow[];
    },
  });

  // Group by jamaah
  const byJamaah: JamaahSummary[] = (() => {
    const map = new Map<string, JamaahSummary>();
    rows.forEach(r => {
      if (!map.has(r.customer_id)) {
        map.set(r.customer_id, {
          customer_id: r.customer_id,
          full_name: r.customer?.full_name || "-",
          total: 0,
          confirmed: 0,
          withPhotos: 0,
          rows: [],
        });
      }
      const entry = map.get(r.customer_id)!;
      entry.total++;
      if (r.confirmed_by_jamaah) entry.confirmed++;
      if (r.distribution_photo_url) entry.withPhotos++;
      entry.rows.push(r);
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  })();

  const filtered = search
    ? byJamaah.filter(j => j.full_name.toLowerCase().includes(search.toLowerCase()))
    : byJamaah;

  const totalJamaah = byJamaah.length;
  const fullyConfirmed = byJamaah.filter(j => j.confirmed === j.total && j.total > 0).length;
  const totalDist = rows.length;
  const totalConfirmed = rows.filter(r => r.confirmed_by_jamaah).length;
  const totalWithPhotos = rows.filter(r => r.distribution_photo_url).length;
  const pct = totalDist > 0 ? Math.round((totalConfirmed / totalDist) * 100) : 0;
  const photoPct = totalDist > 0 ? Math.round((totalWithPhotos / totalDist) * 100) : 0;

  // Confirm single distribution row
  const confirmMutation = useMutation({
    mutationFn: async (distId: string) => {
      const { error } = await supabase.rpc("confirm_equipment_receipt", {
        p_distribution_id: distId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-confirmation", departureId] });
      toast.success("Penerimaan dikonfirmasi");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  // Bulk confirm all for departure
  async function bulkConfirm() {
    setBulkLoading(true);
    try {
      const { data, error } = await supabase.rpc("bulk_confirm_equipment_departure", {
        p_departure_id: departureId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["equipment-confirmation", departureId] });
      toast.success(`${data ?? 0} item dikonfirmasi sekaligus`);
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  }

  // Confirm all rows for one jamaah
  async function confirmJamaah(jamaah: JamaahSummary) {
    const unconfirmed = jamaah.rows.filter(r => !r.confirmed_by_jamaah);
    if (unconfirmed.length === 0) return;
    setConfirmingId(jamaah.customer_id);
    let ok = 0;
    for (const r of unconfirmed) {
      try {
        await supabase.rpc("confirm_equipment_receipt", { p_distribution_id: r.id });
        ok++;
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ["equipment-confirmation", departureId] });
    toast.success(`${ok} item jamaah ${jamaah.full_name} dikonfirmasi`);
    setConfirmingId(null);
  }

  if (!departureId) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Pilih keberangkatan terlebih dahulu
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Photo Preview Modal */}
      <Dialog open={!!previewPhotoUrl} onOpenChange={() => setPreviewPhotoUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto Bukti Serah Terima: {previewEquipmentName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4">
            {previewPhotoUrl && (
              <img 
                src={previewPhotoUrl} 
                alt="Bukti serah terima" 
                className="max-w-full max-h-[500px] rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-xl font-bold">{totalJamaah}</p>
                <p className="text-xs text-muted-foreground">Total Jamaah</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div>
                <p className="text-xl font-bold">{fullyConfirmed}</p>
                <p className="text-xs text-muted-foreground">Sudah Konfirmasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-xl font-bold">{totalJamaah - fullyConfirmed}</p>
                <p className="text-xs text-muted-foreground">Belum Konfirmasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg"><Package className="h-4 w-4 text-purple-600" /></div>
              <div>
                <p className="text-xl font-bold">{pct}%</p>
                <p className="text-xs text-muted-foreground">Item Terkonfirmasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg"><Camera className="h-4 w-4 text-indigo-600" /></div>
              <div>
                <p className="text-xl font-bold">{photoPct}%</p>
                <p className="text-xs text-muted-foreground">Foto Ada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress Konfirmasi</p>
              <span className="text-sm text-muted-foreground">{totalConfirmed}/{totalDist} item</span>
            </div>
            <Progress value={pct} className="h-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" /> Foto Bukti
              </p>
              <span className="text-sm text-muted-foreground">{totalWithPhotos}/{totalDist} item</span>
            </div>
            <Progress value={photoPct} className="h-3" />
          </CardContent>
        </Card>
      </div>

      {/* Info banner if photos are missing */}
      {totalWithPhotos < totalDist && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Foto Bukti Belum Lengkap</p>
            <p>
              {totalDist - totalWithPhotos} item belum memiliki foto bukti serah terima. Silakan upload foto saat melakukan distribusi.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari jamaah..."
            className="pl-9 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={bulkConfirm}
            disabled={bulkLoading || totalConfirmed === totalDist}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {bulkLoading
              ? <RefreshCcw className="h-4 w-4 animate-spin" />
              : <CheckSquare className="h-4 w-4" />
            }
            Konfirmasi Semua
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {rows.length === 0 ? "Belum ada distribusi untuk keberangkatan ini." : "Tidak ada jamaah yang cocok."}
        </div>
      ) : (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold">Daftar Jamaah — Konfirmasi Penerimaan + Foto Bukti</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jamaah</TableHead>
                <TableHead className="text-center">Item Terdistribusi</TableHead>
                <TableHead className="text-center">Dikonfirmasi</TableHead>
                <TableHead className="text-center">Foto Bukti</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(jamaah => {
                const allConfirmed = jamaah.confirmed === jamaah.total && jamaah.total > 0;
                const isConfirming = confirmingId === jamaah.customer_id;
                const photoStatus = jamaah.withPhotos === jamaah.total ? "Lengkap" : jamaah.withPhotos > 0 ? `${jamaah.withPhotos}/${jamaah.total}` : "Belum";
                return (
                  <TableRow key={jamaah.customer_id}>
                    <TableCell className="font-medium">{jamaah.full_name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{jamaah.total}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{jamaah.confirmed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`text-xs gap-1 ${
                          jamaah.withPhotos === jamaah.total 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : jamaah.withPhotos > 0 
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        {photoStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {allConfirmed ? (
                        <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Konfirmasi
                        </Badge>
                      ) : jamaah.confirmed > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 border-0">
                          Sebagian ({jamaah.confirmed}/{jamaah.total})
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" /> Belum
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!allConfirmed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isConfirming}
                          onClick={() => confirmJamaah(jamaah)}
                        >
                          {isConfirming
                            ? <RefreshCcw className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3 text-green-600" />
                          }
                          Konfirmasi
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail per jamaah with photo gallery */}
      {filtered.some(j => j.confirmed < j.total || j.withPhotos < j.total) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Item belum dikonfirmasi atau belum ada foto:</p>
          {filtered
            .filter(j => j.confirmed < j.total || j.withPhotos < j.total)
            .map(jamaah => (
              <Card key={jamaah.customer_id} className="border-amber-100">
                <CardContent className="py-3 px-4">
                  <p className="text-sm font-semibold mb-2">{jamaah.full_name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {jamaah.rows
                      .filter(r => !r.confirmed_by_jamaah || !r.distribution_photo_url)
                      .map(r => (
                        <div key={r.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs gap-1">
                            {r.equipment?.name}
                            {r.size ? ` (${r.size})` : ""}
                            {r.distribution_photo_url && <Camera className="h-3 w-3 text-blue-600 cursor-pointer" onClick={() => {
                              setPreviewPhotoUrl(r.distribution_photo_url);
                              setPreviewEquipmentName(r.equipment?.name || "");
                            }} />}
                            {!r.confirmed_by_jamaah && (
                              <button
                                className="ml-1 text-green-600 hover:text-green-700"
                                title="Konfirmasi item ini"
                                onClick={() => confirmMutation.mutate(r.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}
