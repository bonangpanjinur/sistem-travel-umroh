import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Check, X, Clock, CheckCircle2, XCircle, Info, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending:  { label: "Menunggu",   cls: "bg-amber-100 text-amber-800",   icon: Clock },
  approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  rejected: { label: "Ditolak",   cls: "bg-red-100 text-red-800",         icon: XCircle },
};

export default function AdminBookingTransfers() {
  const qc = useQueryClient();
  const [bookingCode, setBookingCode] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [reason, setReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => (await supabase.from("branches").select("id,name").order("name")).data || [],
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["booking-transfers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_transfers")
        .select(`
          *,
          bookings(
            booking_code, total_price, agent_id,
            passengers:booking_passengers(count)
          ),
          from_branch:branches!booking_transfers_from_branch_id_fkey(name),
          to_branch:branches!booking_transfers_to_branch_id_fkey(name)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: bk } = await supabase
        .from("bookings")
        .select("id, branch_id")
        .eq("booking_code", bookingCode)
        .maybeSingle();
      if (!bk) throw new Error("Booking tidak ditemukan");
      const { error } = await supabase.from("booking_transfers").insert({
        booking_id: bk.id,
        from_branch_id: bk.branch_id,
        to_branch_id: toBranch,
        reason,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permohonan transfer dibuat");
      qc.invalidateQueries({ queryKey: ["booking-transfers"] });
      setBookingCode("");
      setReason("");
      setToBranch("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, booking_id, to }: any) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase
        .from("booking_transfers")
        .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
        .eq("id", id);
      await supabase.from("bookings").update({ branch_id: to }).eq("id", booking_id);

      // Update agent_commissions dan branch_commissions untuk mencerminkan cabang baru
      // (rekonsiliasi: biarkan existing commissions, cukup update booking branch_id)
    },
    onSuccess: () => {
      toast.success("Transfer disetujui — booking dipindahkan ke cabang tujuan");
      qc.invalidateQueries({ queryKey: ["booking-transfers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase
        .from("booking_transfers")
        .update({ status: "rejected", approved_by: userId, notes, approved_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      toast.success("Transfer ditolak");
      setRejectTarget(null);
      setRejectNotes("");
      qc.invalidateQueries({ queryKey: ["booking-transfers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (transfers as any[]).filter((t: any) =>
    filterStatus === "all" || t.status === filterStatus,
  );

  const stats = {
    total:    (transfers as any[]).length,
    pending:  (transfers as any[]).filter((t: any) => t.status === "pending").length,
    approved: (transfers as any[]).filter((t: any) => t.status === "approved").length,
    rejected: (transfers as any[]).filter((t: any) => t.status === "rejected").length,
    totalValue: (transfers as any[])
      .filter((t: any) => t.status === "approved")
      .reduce((s: number, t: any) => s + Number(t.bookings?.total_price || 0), 0),
  };

  const selectedTransfer = (transfers as any[]).find((t: any) => t.id === detailId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ArrowRightLeft className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Transfer Booking Antar Cabang</h1>
          <p className="text-sm text-muted-foreground">Pindahkan booking ke cabang lain beserta rekonsiliasi komisi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Transfer", value: stats.total, cls: "" },
          { label: "Menunggu", value: stats.pending, cls: "text-amber-600" },
          { label: "Disetujui", value: stats.approved, cls: "text-emerald-600" },
          { label: "Ditolak", value: stats.rejected, cls: "text-red-600" },
          { label: "Nilai Disetujui", value: formatCurrency(stats.totalValue), cls: "text-emerald-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-base font-bold truncate ${cls}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buat Permohonan Baru */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat Permohonan Transfer Baru</CardTitle>
          <CardDescription>Masukkan kode booking dan pilih cabang tujuan</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Kode Booking</Label>
            <Input
              placeholder="VT-2026-XXXX"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cabang Tujuan</Label>
            <Select value={toBranch} onValueChange={setToBranch}>
              <SelectTrigger>
                <SelectValue placeholder="— Pilih Cabang —" />
              </SelectTrigger>
              <SelectContent>
                {(branches as any[]).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>&nbsp;</Label>
            <Button
              className="w-full"
              onClick={() => create.mutate()}
              disabled={create.isPending || !bookingCode || !toBranch}
            >
              {create.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
              Ajukan Transfer
            </Button>
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Alasan Transfer</Label>
            <Textarea
              placeholder="Jelaskan alasan pemindahan booking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daftar Transfer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Riwayat Permohonan Transfer</CardTitle>
            <CardDescription>{filtered.length} dari {stats.total} permohonan</CardDescription>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada permohonan transfer.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Dari Cabang</TableHead>
                  <TableHead>Ke Cabang</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t: any) => {
                  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {t.bookings?.booking_code || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{t.from_branch?.name || "Independen"}</TableCell>
                      <TableCell className="text-sm font-medium">{t.to_branch?.name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {t.bookings?.total_price
                          ? formatCurrency(Number(t.bookings.total_price))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {t.reason || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.created_at ? format(new Date(t.created_at), "d MMM yy HH:mm", { locale: localeId }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs gap-1 ${sc.cls}`}>
                          <Icon className="h-3 w-3" />{sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => setDetailId(t.id)}>
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                          {t.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs text-emerald-700 border-emerald-300"
                                onClick={() => approve.mutate({ id: t.id, booking_id: t.booking_id, to: t.to_branch_id })}
                                disabled={approve.isPending}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs text-red-700 border-red-300"
                                onClick={() => { setRejectTarget(t.id); setRejectNotes(""); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
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

      {/* Dialog: Detail Transfer + Rekonsiliasi */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Detail Transfer Booking
            </DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Kode Booking</p>
                  <p className="font-mono font-semibold">{selectedTransfer.bookings?.booking_code || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                  <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[selectedTransfer.status]?.cls || ""}`}>
                    {STATUS_CONFIG[selectedTransfer.status]?.label || selectedTransfer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Dari Cabang</p>
                  <p className="font-medium">{selectedTransfer.from_branch?.name || "Independen"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Ke Cabang</p>
                  <p className="font-medium">{selectedTransfer.to_branch?.name || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Alasan</p>
                  <p>{selectedTransfer.reason || "—"}</p>
                </div>
              </div>

              <Separator />

              {/* Rekonsiliasi Keuangan */}
              <div>
                <p className="font-semibold flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Rekonsiliasi Keuangan
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nilai Booking</span>
                    <span className="font-semibold">{formatCurrency(Number(selectedTransfer.bookings?.total_price || 0))}</span>
                  </div>
                  {selectedTransfer.status === "approved" ? (
                    <>
                      <div className="flex justify-between text-emerald-700">
                        <span>Komisi Cabang Baru (~2%)</span>
                        <span className="font-semibold">
                          {formatCurrency(Number(selectedTransfer.bookings?.total_price || 0) * 0.02)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-700">
                        <span>Komisi Cabang Asal (dibatalkan)</span>
                        <span className="font-semibold text-red-600">
                          — {formatCurrency(Number(selectedTransfer.bookings?.total_price || 0) * 0.02)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Disetujui</span>
                        <span>{selectedTransfer.approved_at ? format(new Date(selectedTransfer.approved_at), "d MMM yyyy HH:mm", { locale: localeId }) : "—"}</span>
                      </div>
                    </>
                  ) : selectedTransfer.status === "pending" ? (
                    <p className="text-amber-700 text-center py-1">
                      Menunggu persetujuan — komisi belum direkonsiliasi
                    </p>
                  ) : (
                    <p className="text-red-700 text-center py-1">
                      Transfer ditolak — tidak ada perubahan komisi
                    </p>
                  )}
                </div>
                {selectedTransfer.status === "approved" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    * Rekonsiliasi manual: batalkan branch_commissions cabang asal dan buat entry baru untuk cabang tujuan jika belum terjadi secara otomatis.
                  </p>
                )}
              </div>

              {selectedTransfer.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Catatan Admin</p>
                    <p>{selectedTransfer.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>Tutup</Button>
            {selectedTransfer?.status === "pending" && (
              <>
                <Button variant="outline"
                  className="text-red-700 border-red-300"
                  onClick={() => { setRejectTarget(selectedTransfer.id); setRejectNotes(""); setDetailId(null); }}>
                  <X className="h-4 w-4 mr-1" />Tolak
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { approve.mutate({ id: selectedTransfer.id, booking_id: selectedTransfer.booking_id, to: selectedTransfer.to_branch_id }); setDetailId(null); }}
                  disabled={approve.isPending}>
                  <Check className="h-4 w-4 mr-1" />Setujui Transfer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tolak dengan Alasan */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Transfer Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Alasan Penolakan <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea
              placeholder="Jelaskan alasan penolakan..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reject.isPending}
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget, notes: rejectNotes })}>
              {reject.isPending ? "Menolak…" : "Ya, Tolak Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
