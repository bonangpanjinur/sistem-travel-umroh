import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  MessageSquare, FileText, Search, CheckCircle, XCircle,
  Clock, History, Users, Stamp, Award, Ticket, Receipt,
  RefreshCw, Filter, TrendingUp, Phone, MessageCircle,
  ClipboardSignature, PackageCheck
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WALog {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_content: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  template_code: string | null;
  departure_id: string | null;
  created_at: string;
}

interface DocLog {
  id: string;
  booking_id: string;
  document_type: string;
  document_label: string;
  jamaah_name: string | null;
  generated_by_name: string | null;
  is_bulk: boolean;
  bulk_count: number | null;
  notes: string | null;
  created_at: string;
}

interface CombinedEntry {
  id: string;
  type: 'whatsapp' | 'document';
  created_at: string;
  title: string;
  subtitle: string;
  status: string;
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  extra?: string;
}

// ── Icon/label maps ─────────────────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  passport:         { label: "Surat Paspor",        icon: Stamp,             color: "text-violet-600" },
  certificate:      { label: "Sertifikat Umrah",    icon: Award,             color: "text-emerald-600" },
  cuti_jamaah:      { label: "Surat Cuti Jamaah",   icon: ClipboardSignature, color: "text-orange-600" },
  eticket:          { label: "E-Ticket",            icon: Ticket,            color: "text-sky-600" },
  general:          { label: "Surat Umum",          icon: FileText,          color: "text-slate-600" },
  invoice:          { label: "Invoice",             icon: Receipt,           color: "text-indigo-600" },
  bulk_passport:    { label: "Paspor (Massal)",     icon: PackageCheck,      color: "text-violet-600" },
  bulk_certificate: { label: "Sertifikat (Massal)", icon: PackageCheck,      color: "text-emerald-600" },
  bulk_cuti:        { label: "Surat Cuti (Massal)", icon: PackageCheck,      color: "text-orange-600" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  BOOKING_CONFIRM:    "Konfirmasi Booking",
  PAYMENT_CONFIRM:    "Konfirmasi Pembayaran",
  PAYMENT_LUNAS:      "Pembayaran Lunas",
  DOCUMENT_READY:     "Dokumen Siap",
  DEPARTURE_REMINDER: "Reminder Keberangkatan",
  DEPARTURE_REMINDER_H7: "Reminder H-7",
  DEPARTURE_REMINDER_H1: "Reminder H-1",
  EQUIPMENT_READY:    "Perlengkapan Siap",
  CUSTOM:             "Pesan Kustom",
  TEST:               "Test Kirim",
  RESEND:             "Resend",
  SAVINGS_CICILAN_DITERIMA: "Cicilan Diterima",
  SAVINGS_REMINDER:   "Reminder Cicilan",
  SAVINGS_LUNAS:      "Tabungan Lunas",
};

export default function KorespondensiHubPage() {
  const [searchQuery, setSearchQuery]     = useState("");
  const [typeFilter, setTypeFilter]       = useState<"all" | "whatsapp" | "document">("all");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [activeTab, setActiveTab]         = useState("timeline");

  const { data: waLogs = [], isLoading: loadingWA, refetch: refetchWA } = useQuery<WALog[]>({
    queryKey: ["korespondensi-wa-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as unknown as WALog[];
    },
  });

  const { data: docLogs = [], isLoading: loadingDocs } = useQuery<DocLog[]>({
    queryKey: ["korespondensi-doc-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("booking_document_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as DocLog[];
    },
  });

  // Per-jamaah stats
  const { data: jamaahStats = [] } = useQuery({
    queryKey: ["korespondensi-jamaah-stats"],
    queryFn: async () => {
      const { data: docs } = await (supabase as any)
        .from("booking_document_logs")
        .select("jamaah_name, document_type, created_at")
        .order("created_at", { ascending: false });

      const statsMap = new Map<string, { name: string; docCount: number; waCount: number; lastContact: string }>();
      (docs || []).forEach((d: any) => {
        if (!d.jamaah_name) return;
        const existing = statsMap.get(d.jamaah_name) || { name: d.jamaah_name, docCount: 0, waCount: 0, lastContact: d.created_at };
        existing.docCount += d.is_bulk ? (d.bulk_count || 1) : 1;
        if (d.created_at > existing.lastContact) existing.lastContact = d.created_at;
        statsMap.set(d.jamaah_name, existing);
      });

      const { data: waSent } = await supabase
        .from("whatsapp_logs" as any)
        .select("recipient_name, created_at")
        .eq("status", "sent" as any);

      (waSent || []).forEach((w: any) => {
        if (!w.recipient_name) return;
        const existing = statsMap.get(w.recipient_name) || { name: w.recipient_name, docCount: 0, waCount: 0, lastContact: w.created_at };
        existing.waCount++;
        if (w.created_at > existing.lastContact) existing.lastContact = w.created_at;
        statsMap.set(w.recipient_name, existing);
      });

      return Array.from(statsMap.values()).sort((a, b) => b.lastContact.localeCompare(a.lastContact));
    },
  });

  // Combine WA + Doc logs into unified timeline
  const combinedEntries = useMemo((): CombinedEntry[] => {
    const waEntries: CombinedEntry[] = waLogs.map(log => ({
      id: `wa-${log.id}`,
      type: 'whatsapp',
      created_at: log.created_at,
      title: log.recipient_name || log.recipient_phone,
      subtitle: TEMPLATE_LABELS[log.template_code || ''] || log.template_code || 'WhatsApp',
      status: log.status,
      badge: log.status === 'sent' ? 'Terkirim' : log.status === 'failed' ? 'Gagal' : 'Pending',
      badgeVariant: log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary',
      extra: log.message_content?.slice(0, 80),
    }));

    const docEntries: CombinedEntry[] = docLogs.map(doc => ({
      id: `doc-${doc.id}`,
      type: 'document',
      created_at: doc.created_at,
      title: doc.jamaah_name || 'Jamaah',
      subtitle: DOC_TYPE_CONFIG[doc.document_type]?.label || doc.document_label,
      status: 'generated',
      badge: doc.is_bulk ? `Massal (${doc.bulk_count || '?'} pax)` : 'Individual',
      badgeVariant: doc.is_bulk ? 'secondary' : 'outline',
      extra: `Oleh: ${doc.generated_by_name || 'System'}`,
    }));

    return [...waEntries, ...docEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [waLogs, docLogs]);

  const filteredEntries = useMemo(() => {
    return combinedEntries.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'sent'      && e.status !== 'sent')      return false;
        if (statusFilter === 'failed'    && e.status !== 'failed')    return false;
        if (statusFilter === 'generated' && e.status !== 'generated') return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.subtitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [combinedEntries, typeFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const waSent   = waLogs.filter(l => l.status === 'sent').length;
    const waFailed = waLogs.filter(l => l.status === 'failed').length;
    const docTotal = docLogs.reduce((sum, d) => sum + (d.is_bulk ? (d.bulk_count || 1) : 1), 0);
    const totalComm = waSent + docTotal;
    return { waSent, waFailed, docTotal, totalComm, waTotal: waLogs.length };
  }, [waLogs, docLogs]);

  const filteredJamaahStats = useMemo(() => {
    if (!searchQuery) return jamaahStats;
    const q = searchQuery.toLowerCase();
    return jamaahStats.filter((j: any) => j.name.toLowerCase().includes(q));
  }, [jamaahStats, searchQuery]);

  const isLoading = loadingWA || loadingDocs;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hub Korespondensi</h1>
          <p className="text-muted-foreground">Riwayat terpadu semua WhatsApp terkirim + dokumen digenerate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchWA(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Link to="/admin/whatsapp">
            <Button size="sm" variant="outline" className="gap-2">
              <MessageSquare className="h-3.5 w-3.5" />Kirim WA
            </Button>
          </Link>
          <Link to="/admin/documents-generator">
            <Button size="sm" className="gap-2">
              <FileText className="h-3.5 w-3.5" />Generate Dokumen
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "WA Terkirim",       value: stats.waSent,    icon: MessageSquare, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "WA Gagal",          value: stats.waFailed,  icon: XCircle,       color: "text-red-600",   bg: "bg-red-500/10"   },
          { label: "Dokumen Dibuat",    value: stats.docTotal,  icon: FileText,      color: "text-blue-600",  bg: "bg-blue-500/10"  },
          { label: "Total Komunikasi",  value: stats.totalComm, icon: TrendingUp,    color: "text-primary",   bg: "bg-primary/10"   },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <div className={`p-2.5 rounded-full ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama jamaah, template..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="document">Dokumen</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="sent">WA Terkirim</SelectItem>
              <SelectItem value="failed">WA Gagal</SelectItem>
              <SelectItem value="generated">Dokumen</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filteredEntries.length} entri
          </span>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="timeline" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" />Timeline Terpadu
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />WhatsApp ({stats.waTotal})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />Dokumen ({docLogs.length})
          </TabsTrigger>
          <TabsTrigger value="per-jamaah" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />Per Jamaah
          </TabsTrigger>
        </TabsList>

        {/* ── TIMELINE TERPADU ────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Belum ada riwayat korespondensi</p>
                  <p className="text-sm mt-1">Kirim WhatsApp atau generate dokumen untuk memulai</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEntries.slice(0, 300).map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${entry.type === 'whatsapp' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {entry.type === 'whatsapp'
                          ? <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                          : <FileText className="h-3.5 w-3.5 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{entry.title}</span>
                          <span className="text-xs text-muted-foreground">—</span>
                          <span className="text-xs text-muted-foreground">{entry.subtitle}</span>
                          <Badge variant={entry.badgeVariant} className="text-[10px] h-4 px-1.5">
                            {entry.badge}
                          </Badge>
                        </div>
                        {entry.extra && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.extra}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {format(new Date(entry.created_at), "dd MMM HH:mm", { locale: id })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WHATSAPP TAB ─────────────────────────────────────────────── */}
        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Nomor HP</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Pesan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waLogs.filter(l => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (l.recipient_name || '').toLowerCase().includes(q) || l.recipient_phone.includes(q);
                      }).slice(0, 200).map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "dd MMM HH:mm", { locale: id })}</TableCell>
                          <TableCell className="text-sm">{log.recipient_name || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{log.recipient_phone}</TableCell>
                          <TableCell>
                            {log.template_code && (
                              <Badge variant="outline" className="text-[10px]">{TEMPLATE_LABELS[log.template_code] || log.template_code}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-xs truncate">{log.message_content}</p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                              className="text-xs gap-1"
                            >
                              {log.status === 'sent' ? <CheckCircle className="h-3 w-3" /> : log.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {log.status === 'sent' ? 'Terkirim' : log.status === 'failed' ? 'Gagal' : 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DOCUMENTS TAB ───────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Jamaah</TableHead>
                        <TableHead>Jenis Dokumen</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                        <TableHead>Tipe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docLogs.filter(d => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (d.jamaah_name || '').toLowerCase().includes(q) || (d.document_label || '').toLowerCase().includes(q);
                      }).slice(0, 200).map(doc => {
                        const docCfg = DOC_TYPE_CONFIG[doc.document_type];
                        const Icon = docCfg?.icon || FileText;
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="text-xs whitespace-nowrap">{format(new Date(doc.created_at), "dd MMM HH:mm", { locale: id })}</TableCell>
                            <TableCell className="font-medium text-sm">{doc.jamaah_name || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-3.5 w-3.5 ${docCfg?.color || 'text-muted-foreground'}`} />
                                <span className="text-sm">{docCfg?.label || doc.document_label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{doc.generated_by_name || 'System'}</TableCell>
                            <TableCell>
                              <Badge variant={doc.is_bulk ? 'secondary' : 'outline'} className="text-xs">
                                {doc.is_bulk ? `Massal (${doc.bulk_count || '?'} pax)` : 'Individual'}
                              </Badge>
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
        </TabsContent>

        {/* ── PER JAMAAH ──────────────────────────────────────────────── */}
        <TabsContent value="per-jamaah" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ringkasan Per Jamaah
              </CardTitle>
              <p className="text-sm text-muted-foreground">{filteredJamaahStats.length} jamaah memiliki riwayat korespondensi</p>
            </CardHeader>
            <CardContent className="p-0">
              {filteredJamaahStats.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  {searchQuery ? "Tidak ada jamaah yang cocok" : "Belum ada data korespondensi per jamaah"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">No</TableHead>
                        <TableHead>Nama Jamaah</TableHead>
                        <TableHead className="text-center">Dokumen Dibuat</TableHead>
                        <TableHead className="text-center">WA Terkirim</TableHead>
                        <TableHead className="text-center">Total Kontak</TableHead>
                        <TableHead>Kontak Terakhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJamaahStats.slice(0, 100).map((j: any, idx: number) => (
                        <TableRow key={j.name}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{j.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs gap-1">
                              <FileText className="h-3 w-3" />{j.docCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs gap-1">
                              <MessageSquare className="h-3 w-3" />{j.waCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-primary">{j.docCount + j.waCount}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(j.lastContact), "dd MMM yyyy HH:mm", { locale: id })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
