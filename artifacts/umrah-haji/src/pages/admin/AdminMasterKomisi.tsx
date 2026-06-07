import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, Search, DollarSign, Users, Building2, GitMerge,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_COLOR: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid:     "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", approved: "Disetujui", paid: "Dibayar", rejected: "Ditolak",
};

function exportToCSV(rows: any[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMasterKomisi() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [periodFilter, setPeriod] = useState("3");

  const dateFrom = useMemo(() => {
    if (periodFilter === "all") return null;
    return startOfMonth(subMonths(new Date(), Number(periodFilter) - 1)).toISOString();
  }, [periodFilter]);

  const dateTo = useMemo(() => endOfMonth(new Date()).toISOString(), []);

  // ── Komisi Agen ──────────────────────────────────────────────────────────
  const { data: agentComm = [] } = useQuery({
    queryKey: ["master-komisi-agen", statusFilter, dateFrom],
    queryFn: async () => {
      let q = (supabase as any)
        .from("agent_commissions")
        .select(`
          id, commission_amount, status, created_at,
          booking:booking_id(booking_code, total_price),
          agent:agent_id(contact_name, company_name, agent_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      const { data } = await q;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        tipe: "Agen",
        nama: r.agent?.company_name || r.agent?.contact_name || "—",
        kode: r.agent?.agent_code || "—",
        booking: r.booking?.booking_code || "—",
        nominal: r.commission_amount ?? 0,
        status: r.status ?? "pending",
        tanggal: r.created_at,
      }));
    },
  });

  // ── Override Komisi (Sub-Agen → Parent) ──────────────────────────────────
  const { data: overrideComm = [] } = useQuery({
    queryKey: ["master-komisi-override", statusFilter, dateFrom],
    queryFn: async () => {
      let q = (supabase as any)
        .from("agent_override_commission_records")
        .select(`
          id, override_amount, status, created_at,
          parent_agent:parent_agent_id(contact_name, company_name, agent_code),
          sub_agent:sub_agent_id(contact_name, company_name, agent_code),
          booking:booking_id(booking_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      const { data } = await q;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        tipe: "Override",
        nama: `${r.parent_agent?.company_name || r.parent_agent?.contact_name || "—"} ← ${r.sub_agent?.company_name || r.sub_agent?.contact_name || "—"}`,
        kode: r.parent_agent?.agent_code || "—",
        booking: r.booking?.booking_code || "—",
        nominal: r.override_amount ?? 0,
        status: r.status ?? "pending",
        tanggal: r.created_at,
      }));
    },
  });

  // ── Komisi Cabang ────────────────────────────────────────────────────────
  const { data: branchComm = [] } = useQuery({
    queryKey: ["master-komisi-cabang", statusFilter, dateFrom],
    queryFn: async () => {
      let q = (supabase as any)
        .from("branch_commissions")
        .select(`
          id, commission_amount, status, created_at,
          booking:booking_id(booking_code),
          branch:branch_id(name, code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      const { data } = await q;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        tipe: "Cabang",
        nama: r.branch?.name || "—",
        kode: r.branch?.code || "—",
        booking: r.booking?.booking_code || "—",
        nominal: r.commission_amount ?? 0,
        status: r.status ?? "pending",
        tanggal: r.created_at,
      }));
    },
  });

  const allRows = useMemo(() => [...agentComm, ...overrideComm, ...branchComm]
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()),
    [agentComm, overrideComm, branchComm]);

  function filtered(rows: typeof allRows) {
    const q = search.toLowerCase();
    return rows.filter((r) =>
      !q || r.nama.toLowerCase().includes(q) || r.kode.toLowerCase().includes(q) || r.booking.toLowerCase().includes(q)
    );
  }

  const totalAll    = allRows.reduce((s, r) => s + r.nominal, 0);
  const totalAgen   = agentComm.reduce((s, r) => s + r.nominal, 0);
  const totalOverride = overrideComm.reduce((s, r) => s + r.nominal, 0);
  const totalCabang = branchComm.reduce((s, r) => s + r.nominal, 0);

  function KomisiTable({ rows }: { rows: typeof allRows }) {
    const f = filtered(rows);
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipe</TableHead>
              <TableHead>Nama / Entitas</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {f.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Tidak ada data komisi.
                </TableCell>
              </TableRow>
            ) : (
              f.map((r) => (
                <TableRow key={`${r.tipe}-${r.id}`}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {r.tipe === "Agen" && <Users className="h-3 w-3 mr-1 inline" />}
                      {r.tipe === "Override" && <GitMerge className="h-3 w-3 mr-1 inline" />}
                      {r.tipe === "Cabang" && <Building2 className="h-3 w-3 mr-1 inline" />}
                      {r.tipe}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{r.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{r.kode}</TableCell>
                  <TableCell className="font-mono text-xs">{r.booking}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.nominal)}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${STATUS_COLOR[r.status] ?? ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.tanggal ? format(new Date(r.tanggal), "d MMM yyyy", { locale: localeId }) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Master Laporan Komisi</h1>
          <p className="text-sm text-muted-foreground">
            Rekap gabungan komisi agen, override sub-agen, dan komisi cabang
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(filtered(allRows).map((r) => ({
            Tipe: r.tipe,
            Nama: r.nama,
            Kode: r.kode,
            Booking: r.booking,
            Nominal: r.nominal,
            Status: STATUS_LABEL[r.status] ?? r.status,
            Tanggal: r.tanggal ? format(new Date(r.tanggal), "d MMM yyyy") : "",
          })), `master-komisi-${format(new Date(), "yyyyMMdd")}.csv`)}
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Semua",   value: totalAll,     icon: DollarSign, color: "text-primary" },
          { label: "Komisi Agen",   value: totalAgen,    icon: Users,      color: "text-blue-600" },
          { label: "Override",      value: totalOverride, icon: GitMerge,  color: "text-purple-600" },
          { label: "Komisi Cabang", value: totalCabang,  icon: Building2,  color: "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-sm">{formatCurrency(value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kode, atau booking…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="paid">Dibayar</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Bulan Ini</SelectItem>
                <SelectItem value="3">3 Bulan Terakhir</SelectItem>
                <SelectItem value="6">6 Bulan Terakhir</SelectItem>
                <SelectItem value="12">12 Bulan Terakhir</SelectItem>
                <SelectItem value="all">Semua Waktu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="semua">
        <TabsList>
          <TabsTrigger value="semua">Semua ({filtered(allRows).length})</TabsTrigger>
          <TabsTrigger value="agen">Agen ({filtered(agentComm).length})</TabsTrigger>
          <TabsTrigger value="override">Override ({filtered(overrideComm).length})</TabsTrigger>
          <TabsTrigger value="cabang">Cabang ({filtered(branchComm).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="semua">
          <Card><CardContent className="p-0 pt-1"><KomisiTable rows={allRows} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="agen">
          <Card><CardContent className="p-0 pt-1"><KomisiTable rows={agentComm} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="override">
          <Card><CardContent className="p-0 pt-1"><KomisiTable rows={overrideComm} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="cabang">
          <Card><CardContent className="p-0 pt-1"><KomisiTable rows={branchComm} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
