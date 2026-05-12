import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, Search, RefreshCw, Filter, FileDown,
  BookOpen, RotateCcw, ChevronRight, ChevronDown, User,
  Calendar, Banknote, CreditCard,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// ── Action labels & colours ───────────────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  status_changed:          { label: "Ubah Status Booking",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  cancelled_with_refund:   { label: "Dibatalkan + Refund",        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  cancelled_no_refund:     { label: "Dibatalkan Tanpa Refund",    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  refund_created:          { label: "Refund Dibuat",              color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  refund_processed:        { label: "Refund Diproses",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  refund_cancelled:        { label: "Refund Dibatalkan",          color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  refund_status_update:    { label: "Status Refund Diperbarui",   color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
};

const ENTITY_ICONS: Record<string, any> = {
  booking: BookOpen,
  refund:  RotateCcw,
};

const ENTITY_LABELS: Record<string, string> = {
  booking: "Booking",
  refund:  "Refund",
};

// Untuk refund, link ke halaman booking terkait (via metadata.booking_id)
function entityPath(entityType: string, entityId: string, metadata?: any): string | null {
  if (entityType === "booking") return `/admin/bookings/${entityId}`;
  if (entityType === "refund") {
    const bookingId = metadata?.booking_id;
    return bookingId ? `/admin/bookings/${bookingId}` : `/admin/refunds`;
  }
  return null;
}

// Format currency ringkas
function fmtCurrency(n?: number | null): string {
  if (!n) return "";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// Quick-filter tab defs
const QUICK_FILTERS = [
  { key: "all",      label: "Semua Log",       entity: "all",    action: "all" },
  { key: "refund",   label: "Refund Saja",      entity: "refund", action: "all" },
  { key: "cancel",   label: "Pembatalan",        entity: "all",   action: "cancelled_with_refund" },
  { key: "cancel2",  label: "Batal Tanpa Refund",entity: "all",   action: "cancelled_no_refund" },
];

export default function AdminActivityLog() {
  const [search, setSearch]             = useState("");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterDate, setFilterDate]     = useState("");
  const [activeTab, setActiveTab]       = useState("all");
  const [expandedRow, setExpandedRow]   = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    refetchInterval: 30_000,
  });

  // ── Apply quick-filter tab ──────────────────────────────────────────────
  function applyTab(key: string) {
    const tab = QUICK_FILTERS.find((t) => t.key === key)!;
    setActiveTab(key);
    setFilterEntity(tab.entity);
    setFilterAction(tab.action);
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = logs.filter((l: any) => {
    const q = search.toLowerCase();
    const meta = l.metadata || {};
    const matchSearch =
      !q ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.old_value?.toLowerCase().includes(q) ||
      l.new_value?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) ||
      meta.booking_code?.toLowerCase().includes(q) ||
      meta.refund_method?.toLowerCase().includes(q);

    const matchEntity = filterEntity === "all" || l.entity_type === filterEntity;
    const matchAction = filterAction === "all" || l.action === filterAction;

    let matchDate = true;
    if (filterDate && l.created_at) {
      const d = parseISO(l.created_at);
      const target = parseISO(filterDate);
      matchDate = isWithinInterval(d, { start: startOfDay(target), end: endOfDay(target) });
    }

    return matchSearch && matchEntity && matchAction && matchDate;
  });

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((l: any) => ({
      "Waktu":           l.created_at ? format(parseISO(l.created_at), "dd MMM yyyy HH:mm:ss", { locale: idLocale }) : "-",
      "Actor":           l.actor_email || "System",
      "Entitas":         ENTITY_LABELS[l.entity_type] || l.entity_type,
      "Entity ID":       l.entity_id,
      "Kode Booking":    l.metadata?.booking_code || "-",
      "Aksi":            ACTION_LABELS[l.action]?.label || l.action,
      "Nilai Lama":      l.old_value || "-",
      "Nilai Baru":      l.new_value || "-",
      "Jumlah Refund":   l.metadata?.amount ? fmtCurrency(l.metadata.amount) : "-",
      "Metode Refund":   l.metadata?.refund_method || "-",
      "Detail Rekening": l.metadata?.account_info || l.metadata?.refund_account_info || "-",
      "Catatan":         l.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ActivityLog");
    XLSX.writeFile(wb, `ActivityLog-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
    toast.success("Export berhasil");
  };

  const uniqueActions = [...new Set(logs.map((l: any) => l.action as string))].sort();
  const refundEventCount = logs.filter((l: any) => l.entity_type === "refund").length;
  const cancelCount      = logs.filter((l: any) => ["cancelled_with_refund","cancelled_no_refund"].includes(l.action)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Log Aktivitas Admin
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Riwayat lengkap perubahan status booking dan siklus hidup refund oleh seluruh admin
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Log</p>
            <p className="text-3xl font-bold mt-1">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Booking Events</p>
            <p className="text-3xl font-bold mt-1">{logs.filter((l: any) => l.entity_type === "booking").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Refund Events</p>
            <p className="text-3xl font-bold mt-1 text-purple-600 dark:text-purple-400">{refundEventCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Pembatalan</p>
            <p className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{cancelCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick-filter tabs */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => applyTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari email admin, kode booking, entity ID…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Date filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                className="pl-9 w-full sm:w-[160px]"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter berdasarkan tanggal"
              />
            </div>
            <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setActiveTab("all"); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Entitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Entitas</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setActiveTab("all"); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]?.label || a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterDate || search || filterEntity !== "all" || filterAction !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch(""); setFilterDate("");
                  setFilterEntity("all"); setFilterAction("all");
                  setActiveTab("all");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} dari {logs.length} entri log
            {filterDate && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                — tanggal {format(parseISO(filterDate), "dd MMM yyyy", { locale: idLocale })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Tidak ada log yang cocok</p>
              <p className="text-sm mt-1">
                Coba ubah filter atau cari dengan kata kunci lain
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide w-[170px]">Waktu</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Admin</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Aksi</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Entitas / Booking</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Perubahan</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Detail</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l: any) => {
                    const actionCfg = ACTION_LABELS[l.action];
                    const EntityIcon = ENTITY_ICONS[l.entity_type] || BookOpen;
                    const path = entityPath(l.entity_type, l.entity_id, l.metadata);
                    const meta = l.metadata || {};
                    const isRefundEvent = l.entity_type === "refund" || l.action?.startsWith("refund") || l.action?.includes("refund");
                    const isCancelEvent = ["cancelled_with_refund", "cancelled_no_refund"].includes(l.action);
                    const isExpanded = expandedRow === l.id;

                    // Link label — refund entity links ke booking
                    const linkLabel = l.entity_type === "refund" && meta.booking_id
                      ? `Booking${meta.booking_code ? " " + meta.booking_code : ""}`
                      : "Lihat";

                    return (
                      <>
                        <TableRow
                          key={l.id}
                          className={`hover:bg-muted/30 cursor-pointer transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                          onClick={() => setExpandedRow(isExpanded ? null : l.id)}
                        >
                          {/* Waktu */}
                          <TableCell className="align-top">
                            <p className="text-xs font-mono whitespace-nowrap">
                              {l.created_at
                                ? format(parseISO(l.created_at), "dd MMM yyyy", { locale: idLocale })
                                : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {l.created_at ? format(parseISO(l.created_at), "HH:mm:ss") : ""}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 whitespace-nowrap">
                              {l.created_at
                                ? formatDistanceToNow(parseISO(l.created_at), { addSuffix: true, locale: idLocale })
                                : ""}
                            </p>
                          </TableCell>

                          {/* Admin */}
                          <TableCell className="align-top">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs truncate max-w-[140px]">
                                {l.actor_email || "System"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className="align-top">
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${actionCfg?.color || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                              {actionCfg?.label || l.action}
                            </span>
                          </TableCell>

                          {/* Entitas + Booking code */}
                          <TableCell className="align-top">
                            <div className="flex items-center gap-1.5">
                              <EntityIcon className={`h-3.5 w-3.5 flex-shrink-0 ${isRefundEvent ? "text-purple-500" : "text-muted-foreground"}`} />
                              <span className="text-xs font-medium">{ENTITY_LABELS[l.entity_type] || l.entity_type}</span>
                            </div>
                            {meta.booking_code && (
                              <p className="text-xs text-primary font-semibold mt-0.5">{meta.booking_code}</p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[120px] mt-0.5">
                              {l.entity_id?.slice(0, 8)}…
                            </p>
                          </TableCell>

                          {/* Perubahan */}
                          <TableCell className="align-top">
                            {(l.old_value || l.new_value) ? (
                              <div className="flex items-center gap-1 text-xs flex-wrap">
                                {l.old_value && (
                                  <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
                                    {l.old_value}
                                  </span>
                                )}
                                {l.old_value && l.new_value && (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                {l.new_value && (
                                  <span className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">
                                    {l.new_value}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Detail ringkas (jumlah + metode jika ada) */}
                          <TableCell className="align-top">
                            <div className="space-y-0.5">
                              {meta.amount && (
                                <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-semibold">
                                  <Banknote className="h-3 w-3" />
                                  {fmtCurrency(meta.amount)}
                                </div>
                              )}
                              {(meta.refund_method || meta.method) && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CreditCard className="h-3 w-3" />
                                  {meta.refund_method || meta.method}
                                </div>
                              )}
                              {l.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[160px]">{l.notes}</p>
                              )}
                              {!meta.amount && !meta.refund_method && !l.notes && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Link ke entitas */}
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              {path && (
                                <Link
                                  to={path}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                                >
                                  {linkLabel}
                                  <ChevronRight className="h-3 w-3" />
                                </Link>
                              )}
                              {(meta.account_info || meta.refund_account_info || (meta && Object.keys(meta).length > 0)) && (
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded metadata row */}
                        {isExpanded && (
                          <TableRow key={`${l.id}-meta`} className="bg-muted/10 border-t-0">
                            <TableCell colSpan={7} className="pt-0 pb-3 px-6">
                              <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-2 border border-border/50">
                                <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Detail Metadata</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-1.5">
                                  {meta.booking_code && (
                                    <div>
                                      <span className="text-muted-foreground">Kode Booking</span>
                                      <p className="font-semibold text-primary">{meta.booking_code}</p>
                                    </div>
                                  )}
                                  {meta.booking_id && (
                                    <div>
                                      <span className="text-muted-foreground">Booking ID</span>
                                      <p className="font-mono text-[10px] break-all">{meta.booking_id}</p>
                                    </div>
                                  )}
                                  {meta.amount != null && (
                                    <div>
                                      <span className="text-muted-foreground">Jumlah Refund</span>
                                      <p className="font-semibold text-green-700 dark:text-green-400">{fmtCurrency(meta.amount)}</p>
                                    </div>
                                  )}
                                  {meta.refund_amount != null && meta.refund_amount !== meta.amount && (
                                    <div>
                                      <span className="text-muted-foreground">Jumlah Refund</span>
                                      <p className="font-semibold text-green-700 dark:text-green-400">{fmtCurrency(meta.refund_amount)}</p>
                                    </div>
                                  )}
                                  {(meta.refund_method || meta.method) && (
                                    <div>
                                      <span className="text-muted-foreground">Metode</span>
                                      <p className="font-medium capitalize">{meta.refund_method || meta.method}</p>
                                    </div>
                                  )}
                                  {(meta.account_info || meta.refund_account_info) && (
                                    <div>
                                      <span className="text-muted-foreground">Rekening</span>
                                      <p className="font-medium">{meta.account_info || meta.refund_account_info}</p>
                                    </div>
                                  )}
                                  {meta.with_refund != null && (
                                    <div>
                                      <span className="text-muted-foreground">Dengan Refund</span>
                                      <p className="font-medium">{meta.with_refund ? "Ya" : "Tidak"}</p>
                                    </div>
                                  )}
                                  {meta.customer_id && (
                                    <div>
                                      <span className="text-muted-foreground">Customer ID</span>
                                      <p className="font-mono text-[10px] break-all">{meta.customer_id}</p>
                                    </div>
                                  )}
                                </div>
                                {/* Full entity ID */}
                                <div className="pt-1 border-t border-border/40">
                                  <span className="text-muted-foreground">Entity ID penuh: </span>
                                  <span className="font-mono text-[10px]">{l.entity_id}</span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {logs.length >= 500 && (
        <p className="text-xs text-center text-muted-foreground">
          Menampilkan 500 log terbaru. Gunakan Export Excel untuk data lengkap.
        </p>
      )}
    </div>
  );
}
