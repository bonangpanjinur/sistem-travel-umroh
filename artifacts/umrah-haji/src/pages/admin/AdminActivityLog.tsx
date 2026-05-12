import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BookOpen, RotateCcw, ChevronRight, User,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// ── Tampilan action yang ramah baca ──────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  status_changed:       { label: "Ubah Status Booking",    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  refund_processed:     { label: "Refund Diproses",         color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  refund_cancelled:     { label: "Refund Dibatalkan",       color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  refund_created:       { label: "Refund Dibuat",           color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  refund_status_update: { label: "Status Refund Diperbarui",color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
};

const ENTITY_ICONS: Record<string, any> = {
  booking: BookOpen,
  refund:  RotateCcw,
};

const ENTITY_LABELS: Record<string, string> = {
  booking: "Booking",
  refund:  "Refund",
};

const ENTITY_PATHS: Record<string, (id: string) => string> = {
  booking: (id) => `/admin/bookings/${id}`,
  refund:  (_id) => `/admin/refunds`,
};

export default function AdminActivityLog() {
  const [search, setSearch]             = useState("");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

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

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = logs.filter((l: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.old_value?.toLowerCase().includes(q) ||
      l.new_value?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q);
    const matchEntity = filterEntity === "all" || l.entity_type === filterEntity;
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchEntity && matchAction;
  });

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((l: any) => ({
      "Waktu":        l.created_at ? format(parseISO(l.created_at), "dd MMM yyyy HH:mm:ss", { locale: idLocale }) : "-",
      "Actor":        l.actor_email || "System",
      "Entitas":      ENTITY_LABELS[l.entity_type] || l.entity_type,
      "Entity ID":    l.entity_id,
      "Aksi":         ACTION_LABELS[l.action]?.label || l.action,
      "Nilai Lama":   l.old_value || "-",
      "Nilai Baru":   l.new_value || "-",
      "Catatan":      l.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ActivityLog");
    XLSX.writeFile(wb, `ActivityLog-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
    toast.success("Export berhasil");
  };

  // ── Unique actions untuk filter ───────────────────────────────────────────
  const uniqueActions = [...new Set(logs.map((l: any) => l.action as string))];

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
            Riwayat lengkap perubahan status booking dan refund oleh seluruh admin
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
            <p className="text-3xl font-bold mt-1">{logs.filter((l: any) => l.entity_type === "refund").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Aktor Unik</p>
            <p className="text-3xl font-bold mt-1">
              {new Set(logs.map((l: any) => l.actor_email).filter(Boolean)).size}
            </p>
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
                placeholder="Cari email admin, entity ID, atau catatan…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
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
            <Select value={filterAction} onValueChange={setFilterAction}>
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} dari {logs.length} entri log
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
              <p className="font-semibold">Belum ada log aktivitas</p>
              <p className="text-sm mt-1">
                Log akan terisi otomatis saat admin mengubah status booking atau refund
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
                    <TableHead className="text-xs uppercase tracking-wide">Entitas</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Perubahan</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Catatan</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l: any) => {
                    const actionCfg = ACTION_LABELS[l.action];
                    const EntityIcon = ENTITY_ICONS[l.entity_type] || BookOpen;
                    const entityPath = ENTITY_PATHS[l.entity_type]?.(l.entity_id);
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/30">
                        {/* Waktu */}
                        <TableCell className="align-top">
                          <p className="text-xs font-mono whitespace-nowrap">
                            {l.created_at
                              ? format(parseISO(l.created_at), "dd MMM yyyy", { locale: idLocale })
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {l.created_at
                              ? format(parseISO(l.created_at), "HH:mm:ss")
                              : ""}
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

                        {/* Entitas */}
                        <TableCell className="align-top">
                          <div className="flex items-center gap-1.5">
                            <EntityIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs font-medium">{ENTITY_LABELS[l.entity_type] || l.entity_type}</span>
                          </div>
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

                        {/* Catatan */}
                        <TableCell className="align-top max-w-[180px]">
                          <p className="text-xs text-muted-foreground line-clamp-2">{l.notes || "—"}</p>
                        </TableCell>

                        {/* Link ke entitas */}
                        <TableCell className="align-top">
                          {entityPath && (
                            <Link
                              to={entityPath}
                              className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                            >
                              Lihat
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
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

      {logs.length >= 500 && (
        <p className="text-xs text-center text-muted-foreground">
          Menampilkan 500 log terbaru. Gunakan Export Excel untuk data lengkap.
        </p>
      )}
    </div>
  );
}
