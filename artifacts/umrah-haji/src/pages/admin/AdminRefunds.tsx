import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  RotateCcw, Search, FileDown, CheckCircle2, Clock, XCircle,
  ExternalLink, Filter, Banknote, ChevronDown, RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { logActivity } from "@/lib/activityLogger";

const REFUND_METHODS: Record<string, string> = {
  transfer_bank: "Transfer Bank",
  tunai: "Tunai",
  dana: "DANA",
  gopay: "GoPay",
  ovo: "OVO",
  shopeepay: "ShopeePay",
  kartu_kredit: "Kartu Kredit",
  lainnya: "Lainnya",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending:   { label: "Menunggu",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", icon: Clock },
  processed: { label: "Diproses",   className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",   icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",           icon: XCircle },
};

export default function AdminRefunds() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [processNote, setProcessNote] = useState("");

  // ── Fetch refunds ─────────────────────────────────────────────────────────
  const { data: refunds = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("refunds")
        .select(`
          *,
          booking:bookings(booking_code, total_price, paid_amount),
          customer:customers(full_name, phone, email)
        `)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalPending   = refunds.filter((r: any) => r.status === "pending").length;
  const totalProcessed = refunds.filter((r: any) => r.status === "processed").length;
  const sumPending     = refunds.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const sumProcessed   = refunds.filter((r: any) => r.status === "processed").reduce((s: number, r: any) => s + (r.amount || 0), 0);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const patch: any = { status };
      if (status === "processed") patch.processed_at = new Date().toISOString();
      if (notes) patch.notes = notes;
      const { error } = await (supabase as any).from("refunds").update(patch).eq("id", id);
      if (error) throw error;
      return { id, status, notes };
    },
    onSuccess: ({ id: refundId, status, notes }) => {
      toast.success("Status refund berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      setShowDetailDialog(false);
      setProcessNote("");

      // Catat ke activity log (fire-and-forget)
      const actionMap: Record<string, string> = {
        processed: "refund_processed",
        cancelled: "refund_cancelled",
      };
      logActivity({
        entity_type: "refund",
        entity_id: refundId,
        action: actionMap[status] ?? "refund_status_update",
        old_value: selectedRefund?.status,
        new_value: status,
        notes: notes,
      });
    },
    onError: (e: any) => toast.error(e.message || "Gagal memperbarui status"),
  });

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = refunds.filter((r: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.customer?.full_name?.toLowerCase().includes(q) ||
      r.booking?.booking_code?.toLowerCase().includes(q) ||
      r.account_info?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchMethod = filterMethod === "all" || r.refund_method === filterMethod;
    return matchSearch && matchStatus && matchMethod;
  });

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((r: any) => ({
      "Booking Code":     r.booking?.booking_code || "-",
      "Nama Jamaah":      r.customer?.full_name || "-",
      "Telepon":          r.customer?.phone || "-",
      "Jumlah Refund":    r.amount || 0,
      "Metode":           REFUND_METHODS[r.refund_method] || r.refund_method || "-",
      "Detail Rekening":  r.account_info || "-",
      "Alasan":           r.reason || "-",
      "Status":           STATUS_CONFIG[r.status]?.label || r.status,
      "Catatan":          r.notes || "-",
      "Tgl Pengajuan":    r.created_at ? format(parseISO(r.created_at), "dd MMM yyyy", { locale: idLocale }) : "-",
      "Tgl Diproses":     r.processed_at ? format(parseISO(r.processed_at), "dd MMM yyyy", { locale: idLocale }) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Refunds");
    XLSX.writeFile(wb, `Refunds-${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Export berhasil");
  };

  const openDetail = (r: any) => {
    setSelectedRefund(r);
    setProcessNote(r.notes || "");
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            Monitor Refund
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pantau dan kelola semua pengajuan pengembalian dana jamaah
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Pengajuan</p>
            <p className="text-3xl font-bold mt-1">{refunds.length}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-5">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold uppercase tracking-wide">Menunggu Proses</p>
            <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{totalPending}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(sumPending)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-5">
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide">Sudah Diproses</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-1">{totalProcessed}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(sumProcessed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Dana Kembali</p>
            <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(sumPending + sumProcessed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jamaah atau kode booking…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="processed">Diproses</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Banknote className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                {Object.entries(REFUND_METHODS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} Pengajuan Refund
            {search || filterStatus !== "all" || filterMethod !== "all" ? " (difilter)" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Belum ada data refund</p>
              <p className="text-sm mt-1">Refund akan muncul di sini saat admin membatalkan booking yang memiliki dana masuk</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide">Jamaah</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Booking</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Jumlah</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Metode</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Alasan</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Tanggal</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(r)}>
                        <TableCell>
                          <p className="font-medium text-sm">{r.customer?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.customer?.phone || ""}</p>
                        </TableCell>
                        <TableCell>
                          {r.booking?.booking_code ? (
                            <Link
                              to={`/admin/bookings/${r.booking_id}`}
                              className="text-sm font-mono text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.booking.booking_code}
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-sm">{formatCurrency(r.amount || 0)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{REFUND_METHODS[r.refund_method] || r.refund_method || "—"}</span>
                          {r.account_info && (
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{r.account_info}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground line-clamp-2 max-w-[160px]">{r.reason || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs whitespace-nowrap">
                            {r.created_at ? format(parseISO(r.created_at), "dd MMM yyyy", { locale: idLocale }) : "—"}
                          </p>
                          {r.processed_at && (
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              Selesai: {format(parseISO(r.processed_at), "dd MMM yyyy", { locale: idLocale })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${cfg.className}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Aksi cepat"
                              onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Link
                              to={`/admin/refunds/${r.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap px-1"
                              title="Buka halaman detail"
                            >
                              Detail
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Detail Pengajuan Refund
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (() => {
            const cfg = STATUS_CONFIG[selectedRefund.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${cfg.className}`}>
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </span>
                  {selectedRefund.booking?.booking_code && (
                    <Link
                      to={`/admin/bookings/${selectedRefund.booking_id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setShowDetailDialog(false)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {selectedRefund.booking.booking_code}
                    </Link>
                  )}
                </div>

                {/* Info grid */}
                <div className="rounded-lg border divide-y text-sm">
                  <Row label="Nama Jamaah" value={selectedRefund.customer?.full_name || "—"} />
                  <Row label="Telepon" value={selectedRefund.customer?.phone || "—"} />
                  <Row label="Jumlah Refund" value={<span className="font-bold text-primary">{formatCurrency(selectedRefund.amount || 0)}</span>} />
                  <Row label="Metode" value={REFUND_METHODS[selectedRefund.refund_method] || selectedRefund.refund_method || "—"} />
                  <Row label="Detail Rekening" value={selectedRefund.account_info || "—"} />
                  <Row label="Alasan" value={selectedRefund.reason || "—"} />
                  <Row
                    label="Tgl Pengajuan"
                    value={selectedRefund.created_at
                      ? format(parseISO(selectedRefund.created_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })
                      : "—"}
                  />
                  {selectedRefund.processed_at && (
                    <Row
                      label="Tgl Diproses"
                      value={format(parseISO(selectedRefund.processed_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                    />
                  )}
                </div>

                {/* Catatan admin */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catatan Admin</Label>
                  <Textarea
                    rows={2}
                    value={processNote}
                    onChange={(e) => setProcessNote(e.target.value)}
                    placeholder="Tambah catatan proses refund…"
                    disabled={selectedRefund.status === "processed"}
                  />
                </div>

                {/* Action buttons */}
                {selectedRefund.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedRefund.id,
                        status: "processed",
                        notes: processNote,
                      })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Tandai Sudah Diproses
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedRefund.id,
                        status: "cancelled",
                        notes: processNote,
                      })}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Batalkan
                    </Button>
                  </div>
                )}
                {selectedRefund.status === "processed" && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Refund ini sudah selesai diproses
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2">
      <span className="text-muted-foreground text-xs flex-shrink-0">{label}</span>
      <span className="text-right text-xs font-medium">{value}</span>
    </div>
  );
}
