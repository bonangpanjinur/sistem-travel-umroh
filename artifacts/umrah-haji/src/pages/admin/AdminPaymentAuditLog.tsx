import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { ShieldAlert, ArrowLeft, Search, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { format as dfFormat } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Lunas",
  verified: "Terverifikasi",
  partial: "Sebagian",
  pending: "Pending",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

export default function AdminPaymentAuditLog() {
  const { isSuperAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canView = isSuperAdmin() || hasRole("owner");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["payment-audit-logs", dateFrom, dateTo],
    queryFn: async () => {
      let query = (supabase as any)
        .from("audit_logs")
        .select("*")
        .eq("action", "PAYMENT_DELETED")
        .order("created_at", { ascending: false })
        .limit(300);

      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: canView,
  });

  const filtered = (logs || []).filter((log) => {
    if (!search.trim()) return true;
    const meta = (log.metadata as any) || {};
    const old = (log.old_values as any) || {};
    const q = search.toLowerCase();
    return (
      (meta.booking_code || "").toLowerCase().includes(q) ||
      (meta.deleted_by_email || "").toLowerCase().includes(q) ||
      (meta.deleted_by_name || "").toLowerCase().includes(q) ||
      (old.payment_method || "").toLowerCase().includes(q) ||
      (log.record_id || "").toLowerCase().includes(q)
    );
  });

  if (!canView) {
    return (
      <div className="p-8 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
        <p className="font-semibold text-destructive">Akses ditolak</p>
        <p className="text-sm text-muted-foreground">Hanya Super Admin dan Owner yang dapat melihat log ini.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Audit Log — Penghapusan Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground">
            Riwayat lengkap semua pembayaran yang dihapus oleh Super Admin / Owner.
          </p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Log ini bersifat <strong>permanen dan tidak dapat diubah</strong>. Setiap penghapusan pembayaran dicatat secara otomatis beserta snapshot data aslinya.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 space-y-1">
              <Label className="text-xs">Cari kode booking / email / metode</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dari tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai tanggal</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isLoading ? "Memuat..." : `${filtered.length} Penghapusan Tercatat`}
          </CardTitle>
          <CardDescription>Urut dari terbaru</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm italic">
              Tidak ada data penghapusan ditemukan.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs w-40">Waktu Hapus</TableHead>
                  <TableHead className="text-xs">Kode Booking</TableHead>
                  <TableHead className="text-xs">Dihapus Oleh</TableHead>
                  <TableHead className="text-xs text-right">Jumlah</TableHead>
                  <TableHead className="text-xs">Status Saat Dihapus</TableHead>
                  <TableHead className="text-xs">Metode</TableHead>
                  <TableHead className="text-xs">ID Pembayaran</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const meta = (log.metadata as any) || {};
                  const oldVals = (log.old_values as any) || {};
                  const oldData = (log.old_data as any) || {};
                  const amount = oldVals.amount ?? oldData.amount ?? 0;
                  const status = oldVals.status ?? oldData.status ?? "-";
                  const method = oldVals.payment_method ?? oldData.payment_method ?? "-";
                  const deletedAt = log.created_at ? new Date(log.created_at) : null;

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {deletedAt
                          ? dfFormat(deletedAt, "dd MMM yyyy, HH:mm", { locale: localeId })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {meta.booking_code || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{meta.deleted_by_name || "-"}</div>
                        <div className="text-muted-foreground text-[10px]">{meta.deleted_by_email || ""}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        {amount > 0 ? formatCurrency(amount) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border"}`}
                        >
                          {STATUS_LABELS[status] || status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs uppercase">
                        {method}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">
                        {log.record_id ? log.record_id.slice(0, 8) + "…" : "-"}
                      </TableCell>
                      <TableCell>
                        {meta.booking_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/admin/bookings/${meta.booking_id}`)}
                            title="Buka booking"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
