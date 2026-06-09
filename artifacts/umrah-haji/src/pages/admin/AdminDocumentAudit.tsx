import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Activity, Search, Download, FileText, Send, CheckCircle2, Eye,
  XCircle, Ticket, Award, Receipt, RefreshCw, Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.VITE_API_URL || "";

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  generate: { label: "Generate",     color: "bg-blue-100 text-blue-700",    icon: FileText },
  send_wa:  { label: "Kirim WA",     color: "bg-green-100 text-green-700",  icon: Send },
  send_email:{ label: "Kirim Email", color: "bg-sky-100 text-sky-700",      icon: Send },
  view:     { label: "Dibuka",       color: "bg-gray-100 text-gray-700",    icon: Eye },
  verify:   { label: "Diverifikasi", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  reject:   { label: "Ditolak",      color: "bg-red-100 text-red-700",      icon: XCircle },
  upload:   { label: "Upload",       color: "bg-violet-100 text-violet-700", icon: Download },
  bulk_send:{ label: "Bulk Kirim",   color: "bg-amber-100 text-amber-700",  icon: Users },
};

const DOC_LABELS: Record<string, string> = {
  eticket: "E-Ticket", invoice: "Invoice", certificate: "Sertifikat",
  jamaah_leave: "Surat Izin Jamaah", passport_letter: "Surat Paspor",
  employee_leave: "Surat Izin Karyawan", general_letter: "Surat Umum",
  lunas: "Ket. Lunas", mahram: "Surat Mahram", itinerary: "Itinerary",
};

async function fetchAudit(token: string, params: URLSearchParams) {
  const r = await fetch(`${BASE}/documents/audit?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Gagal memuat audit log");
  return r.json();
}

export default function AdminDocumentAudit() {
  const { session } = useAuth() as any;
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [limit, setLimit] = useState(100);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (eventFilter !== "all") params.set("event_type", eventFilter);
  if (docTypeFilter !== "all") params.set("doc_type", docTypeFilter);
  params.set("limit", String(limit));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["doc-audit-logs", search, eventFilter, docTypeFilter, limit],
    queryFn: () => fetchAudit(session?.access_token || "", params),
    enabled: !!session?.access_token,
    refetchInterval: 30_000,
  });

  const logs: any[] = data?.data || [];

  const stats = {
    total: data?.total || 0,
    generate: logs.filter(l => l.event_type === "generate").length,
    send: logs.filter(l => l.event_type?.startsWith("send")).length,
    verify: logs.filter(l => l.event_type === "verify" || l.event_type === "reject").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-violet-600" />
            Audit Trail Dokumen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Log lengkap semua aktivitas generate, kirim, dan verifikasi dokumen
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Log", value: stats.total, color: "text-gray-600", icon: Activity },
          { label: "Generate", value: stats.generate, color: "text-blue-600", icon: FileText },
          { label: "Kirim", value: stats.send, color: "text-green-600", icon: Send },
          { label: "Verifikasi/Tolak", value: stats.verify, color: "text-emerald-600", icon: CheckCircle2 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama jamaah, kode booking..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Semua Aktivitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aktivitas</SelectItem>
                {Object.entries(EVENT_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Semua Jenis Doc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {Object.entries(DOC_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {isLoading ? "Memuat..." : `${logs.length} log ditampilkan`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada log aktivitas dokumen</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Jenis Dokumen</TableHead>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Dilakukan Oleh</TableHead>
                    <TableHead>Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const ev = EVENT_CONFIG[log.event_type] || { label: log.event_type, color: "bg-gray-100 text-gray-700", icon: Activity };
                    const EvIcon = ev.icon;
                    return (
                      <TableRow key={log.id} className="text-sm">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.created_at
                            ? format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: localeId })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${ev.color} flex items-center gap-1 w-fit text-xs`}>
                            <EvIcon className="w-3 h-3" />
                            {ev.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{DOC_LABELS[log.doc_type] || log.doc_type || "-"}</span>
                        </TableCell>
                        <TableCell className="font-medium">{log.customer_name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{log.booking_code || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.performed_by_name || "Sistem"}</TableCell>
                        <TableCell>
                          {log.channel ? (
                            <Badge variant="outline" className="text-xs">{log.channel}</Badge>
                          ) : "-"}
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

      {logs.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setLimit(l => l + 100)}>
            Muat lebih banyak
          </Button>
        </div>
      )}
    </div>
  );
}
