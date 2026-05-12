import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  RotateCcw, ArrowLeft, CheckCircle2, Clock, XCircle,
  ExternalLink, User, BookOpen, Banknote, CreditCard,
  FileText, ClipboardList, ChevronRight, RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const REFUND_METHODS: Record<string, string> = {
  transfer_bank: "Transfer Bank",
  tunai:         "Tunai",
  dana:          "DANA",
  gopay:         "GoPay",
  ovo:           "OVO",
  shopeepay:     "ShopeePay",
  kartu_kredit:  "Kartu Kredit",
  lainnya:       "Lainnya",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any; desc: string }> = {
  pending:   {
    label: "Menunggu Proses",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    icon: Clock,
    desc: "Refund belum diproses oleh admin",
  },
  processed: {
    label: "Sudah Diproses",
    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    icon: CheckCircle2,
    desc: "Dana sudah dikembalikan ke jamaah",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    icon: XCircle,
    desc: "Pengajuan refund ini dibatalkan",
  },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  refund_created:          { label: "Refund Dibuat",              color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  refund_processed:        { label: "Refund Diproses",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  refund_cancelled:        { label: "Refund Dibatalkan",          color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  refund_status_update:    { label: "Status Diperbarui",          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  cancelled_with_refund:   { label: "Booking Dibatalkan + Refund",color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
};

export default function AdminRefundDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processNote, setProcessNote] = useState("");

  // ── Fetch refund detail ─────────────────────────────────────────────────
  const { data: refund, isLoading } = useQuery({
    queryKey: ["admin-refund-detail", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("refunds")
        .select(`
          *,
          booking:bookings(id, booking_code, total_price, paid_amount, booking_status),
          customer:customers(id, full_name, phone, email)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ── Fetch activity log untuk refund ini ────────────────────────────────
  const { data: activityLog = [], isLoading: logLoading, refetch: refetchLog } = useQuery({
    queryKey: ["refund-activity-log", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_activity_log")
        .select("*")
        .eq("entity_type", "refund")
        .eq("entity_id", id)
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!id,
  });

  // ── Mutation update status ──────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      const patch: any = { status };
      if (status === "processed") patch.processed_at = new Date().toISOString();
      if (notes) patch.notes = notes;
      const { error } = await (supabase as any).from("refunds").update(patch).eq("id", id);
      if (error) throw error;
      return { status, notes };
    },
    onSuccess: async ({ status, notes }) => {
      toast.success(
        status === "processed"
          ? "Refund berhasil ditandai sudah diproses"
          : "Refund berhasil dibatalkan"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-refund-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      queryClient.invalidateQueries({ queryKey: ["refund-activity-log", id] });
      setProcessNote("");

      const actionMap: Record<string, string> = {
        processed: "refund_processed",
        cancelled: "refund_cancelled",
      };
      logActivity({
        entity_type: "refund",
        entity_id: id!,
        action: actionMap[status] ?? "refund_status_update",
        old_value: refund?.status,
        new_value: status,
        notes,
        metadata: {
          booking_id: refund?.booking_id,
          booking_code: refund?.booking?.booking_code ?? null,
          amount: refund?.amount,
          refund_method: refund?.refund_method,
        },
      });

      // ── Notifikasi in-app ke jamaah ────────────────────────────────────
      const customerId = (refund as any)?.customer_id ?? refund?.customer?.id;
      if (customerId) {
        const methodLabel = REFUND_METHODS[refund?.refund_method ?? ""] || refund?.refund_method || "";
        const amountFmt = formatCurrency(refund?.amount || 0);
        const bookingCode = refund?.booking?.booking_code ? ` (Booking ${refund.booking.booking_code})` : "";

        const notifTitle = status === "processed"
          ? "Dana Refund Telah Dikembalikan ✅"
          : "Pengajuan Refund Dibatalkan ❌";

        const notifMessage = status === "processed"
          ? `Dana refund Anda sebesar ${amountFmt} melalui ${methodLabel} telah berhasil dikembalikan ke rekening Anda${bookingCode}.${notes ? ` Catatan admin: ${notes}` : ""}`
          : `Pengajuan refund Anda sebesar ${amountFmt}${bookingCode} telah dibatalkan oleh admin.${notes ? ` Alasan: ${notes}.` : ""} Hubungi kami untuk informasi lebih lanjut.`;

        await (supabase as any).from("customer_notifications").insert({
          customer_id: customerId,
          type: "refund",
          title: notifTitle,
          message: notifMessage,
          is_read: false,
          metadata: {
            refund_id: id,
            booking_id: refund?.booking_id,
            booking_code: refund?.booking?.booking_code ?? null,
            amount: refund?.amount,
            refund_status: status,
          },
        });
      }
    },
    onError: (e: any) => toast.error(e.message || "Gagal memperbarui status"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!refund) {
    return (
      <div className="py-24 text-center">
        <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
        <p className="font-semibold text-lg">Refund tidak ditemukan</p>
        <p className="text-muted-foreground text-sm mt-1">ID: {id}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/refunds")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Refund
        </Button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/refunds")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Detail Refund
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {refund.booking?.id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/bookings/${refund.booking_id}`}>
                <BookOpen className="h-4 w-4 mr-2" />
                Lihat Booking {refund.booking?.booking_code || ""}
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          )}
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${cfg.className}`}>
            <StatusIcon className="h-4 w-4" />
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Kiri: Info Refund */}
        <div className="space-y-4">
          {/* Info Jamaah */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <User className="h-4 w-4" />
                Data Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <InfoRow label="Nama" value={refund.customer?.full_name || "—"} />
              <InfoRow label="Telepon" value={refund.customer?.phone || "—"} />
              <InfoRow label="Email" value={refund.customer?.email || "—"} />
            </CardContent>
          </Card>

          {/* Info Booking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-4 w-4" />
                Data Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <InfoRow
                label="Kode Booking"
                value={
                  refund.booking?.booking_code
                    ? (
                      <Link
                        to={`/admin/bookings/${refund.booking_id}`}
                        className="text-primary font-mono hover:underline flex items-center gap-1"
                      >
                        {refund.booking.booking_code}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )
                    : "—"
                }
              />
              <InfoRow label="Total Booking" value={formatCurrency(refund.booking?.total_price || 0)} />
              <InfoRow label="Sudah Dibayar" value={formatCurrency(refund.booking?.paid_amount || 0)} />
              <InfoRow
                label="Status Booking"
                value={
                  <span className="capitalize text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {refund.booking?.booking_status || "—"}
                  </span>
                }
              />
            </CardContent>
          </Card>

          {/* Info Refund */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Banknote className="h-4 w-4" />
                Rincian Refund
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <InfoRow
                label="Jumlah Refund"
                value={
                  <span className="text-green-700 dark:text-green-400 font-bold text-base">
                    {formatCurrency(refund.amount || 0)}
                  </span>
                }
              />
              <InfoRow label="Metode" value={REFUND_METHODS[refund.refund_method] || refund.refund_method || "—"} />
              <InfoRow label="Detail Rekening" value={refund.account_info || "—"} />
              <InfoRow label="Alasan Pembatalan" value={refund.reason || "—"} />
              <InfoRow label="Catatan Admin" value={refund.notes || "—"} />
              <InfoRow
                label="Tanggal Pengajuan"
                value={refund.created_at
                  ? format(parseISO(refund.created_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })
                  : "—"}
              />
              {refund.processed_at && (
                <InfoRow
                  label="Tanggal Diproses"
                  value={format(parseISO(refund.processed_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kanan: Status update + Timeline */}
        <div className="space-y-4">
          {/* Panel update status */}
          {refund.status === "pending" ? (
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
                  <Clock className="h-4 w-4" />
                  Tindakan Diperlukan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-muted-foreground">
                  Refund ini masih menunggu konfirmasi admin. Setelah dana dikirim ke jamaah, tandai sebagai sudah diproses.
                </p>

                <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{REFUND_METHODS[refund.refund_method] || refund.refund_method}</span>
                  </div>
                  {refund.account_info && (
                    <p className="text-muted-foreground pl-6">{refund.account_info}</p>
                  )}
                  <p className="text-green-700 dark:text-green-400 font-bold pl-6 text-base mt-1">
                    {formatCurrency(refund.amount || 0)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Catatan Admin (opsional)
                  </Label>
                  <Textarea
                    rows={2}
                    value={processNote}
                    onChange={(e) => setProcessNote(e.target.value)}
                    placeholder="Nomor referensi transfer, waktu pengiriman, dll…"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "processed", notes: processNote })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Tandai Sudah Diproses
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "cancelled", notes: processNote })}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Batalkan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={refund.status === "processed"
              ? "border-green-200 dark:border-green-800"
              : "border-red-200 dark:border-red-800"
            }>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <StatusIcon className={`h-8 w-8 ${refund.status === "processed" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
                  <div>
                    <p className="font-semibold">{cfg.label}</p>
                    <p className="text-sm text-muted-foreground">{cfg.desc}</p>
                    {refund.processed_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(refund.processed_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline riwayat aktivitas */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <ClipboardList className="h-4 w-4" />
                Riwayat Aktivitas
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchLog()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {logLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : activityLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada log aktivitas untuk refund ini</p>
                  <p className="text-xs mt-1 opacity-70">Log akan muncul saat admin mengambil tindakan</p>
                </div>
              ) : (
                <ol className="relative border-l border-border ml-3 space-y-0">
                  {activityLog.map((log: any, idx: number) => {
                    const actionCfg = ACTION_LABELS[log.action];
                    const isLast = idx === activityLog.length - 1;
                    return (
                      <li key={log.id} className={`ml-4 ${isLast ? "pb-0" : "pb-5"}`}>
                        {/* Dot */}
                        <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${
                          log.action === "refund_created"
                            ? "bg-purple-500"
                            : log.action === "refund_processed"
                            ? "bg-green-500"
                            : log.action === "refund_cancelled"
                            ? "bg-red-500"
                            : "bg-primary"
                        }`} />

                        <div className="flex flex-col gap-1">
                          {/* Badge aksi */}
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${actionCfg?.color || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                            {actionCfg?.label || log.action}
                          </span>

                          {/* Perubahan nilai */}
                          {(log.old_value || log.new_value) && (
                            <div className="flex items-center gap-1 text-xs flex-wrap">
                              {log.old_value && (
                                <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
                                  {log.old_value}
                                </span>
                              )}
                              {log.old_value && log.new_value && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                              {log.new_value && (
                                <span className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">
                                  {log.new_value}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {log.notes && (
                            <p className="text-xs text-muted-foreground italic">"{log.notes}"</p>
                          )}

                          {/* Actor + waktu */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <User className="h-3 w-3" />
                            <span>{log.actor_email || "System"}</span>
                            <span>·</span>
                            <span title={log.created_at ? format(parseISO(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: idLocale }) : ""}>
                              {log.created_at
                                ? formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: idLocale })
                                : ""}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Link ke activity log global */}
          <div className="text-center">
            <Link
              to={`/admin/activity-log`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center justify-center gap-1"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Lihat semua log aktivitas admin
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}
