import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MessageCircle, Search, Filter, Phone, ExternalLink,
  Users, TrendingUp, CheckCircle2, XCircle, Clock,
  Pencil, Loader2, Download, RefreshCw, Star, ArrowUpRight
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: any }> = {
  new: { label: "Baru", color: "bg-blue-100 text-blue-700 border-blue-200", icon: MessageCircle },
  contacted: { label: "Dihubungi", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Phone },
  qualified: { label: "Qualified", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Star },
  converted: { label: "Konversi", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  lost: { label: "Tidak Jadi", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const SOURCE_LABEL: Record<string, string> = {
  chat_widget: "Chat Widget",
  lead_form: "Form Lead",
  whatsapp: "WhatsApp",
  landing_page: "Landing Page",
};

export default function AdminChatLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<LeadStatus>("new");
  const [editNotes, setEditNotes] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const { data: leads = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-chat-leads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await (supabase as any)
        .from("chat_leads")
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chat-leads"] });
      setSelectedLead(null);
      toast.success("Lead diperbarui!");
    },
    onError: (err: any) => toast.error("Gagal: " + err.message),
  });

  const filtered = useMemo(() => leads.filter((l: any) => {
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.message?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchSource = sourceFilter === "all" || l.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  }), [leads, search, statusFilter, sourceFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l: any) => l.status === "new").length,
    contacted: leads.filter((l: any) => l.status === "contacted").length,
    converted: leads.filter((l: any) => l.status === "converted").length,
    conversionRate: leads.length > 0
      ? Math.round((leads.filter((l: any) => l.status === "converted").length / leads.length) * 100)
      : 0,
  }), [leads]);

  const openEdit = (lead: any) => {
    setSelectedLead(lead);
    setEditStatus(lead.status || "new");
    setEditNotes(lead.notes || "");
  };

  const handleSave = () => {
    if (!selectedLead) return;
    updateMutation.mutate({ id: selectedLead.id, status: editStatus, notes: editNotes });
  };

  const exportExcel = () => {
    const rows = filtered.map((l: any) => ({
      "Nama": l.name,
      "Telepon": l.phone,
      "Email": l.email || "-",
      "Sumber": SOURCE_LABEL[l.source] || l.source || "-",
      "Pesan": l.message || "-",
      "Status": STATUS_CONFIG[l.status as LeadStatus]?.label || l.status,
      "Catatan": l.notes || "-",
      "Tgl Masuk": l.created_at ? format(parseISO(l.created_at), "d MMM yyyy HH:mm", { locale: localeId }) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 30 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chat Leads");
    XLSX.writeFile(wb, `ChatLeads_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel diunduh!");
  };

  const waLink = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}?text=Halo%20${encodeURIComponent("Terima kasih sudah menghubungi kami! Ada yang bisa kami bantu?")}`;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Leads dari Chat Widget
          </h1>
          <p className="text-sm text-muted-foreground">
            Calon jamaah yang meninggalkan kontak via chat publik
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1 text-green-600" /> Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Lead", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "Baru", value: stats.new, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Dihubungi", value: stats.contacted, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Konversi", value: stats.converted, color: "text-green-700", bg: "bg-green-50" },
          { label: "Conversion Rate", value: `${stats.conversionRate}%`, color: "text-purple-700", bg: "bg-purple-50" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className={cn("p-3 text-center", k.bg)}>
              <p className={cn("font-bold text-xl", k.color)}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama, HP, email, pesan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sumber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber</SelectItem>
            {Object.entries(SOURCE_LABEL).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Status Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[{ val: "all", label: `Semua (${leads.length})` }, ...Object.entries(STATUS_CONFIG).map(([val, cfg]) => ({
          val, label: `${cfg.label} (${leads.filter((l: any) => l.status === val).length})`
        }))].map((tab) => (
          <button
            key={tab.val}
            onClick={() => { setStatusFilter(tab.val); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              statusFilter === tab.val
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-14">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-base">Belum ada lead dari chat widget</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "all" ? "Coba ubah filter pencarian" : "Lead akan muncul saat pengunjung meninggalkan kontak via widget chat di halaman publik"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((lead: any) => {
              const status = (lead.status || "new") as LeadStatus;
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
              const Icon = cfg.icon;
              return (
                <Card key={lead.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {lead.name?.[0]?.toUpperCase() || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-sm">{lead.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <a
                                href={`tel:${lead.phone}`}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </a>
                              {lead.email && (
                                <span className="text-xs text-muted-foreground">{lead.email}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            <Badge className={cn("text-[10px] border gap-1", cfg.color)}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                            {lead.source && (
                              <Badge variant="outline" className="text-[10px]">
                                {SOURCE_LABEL[lead.source] || lead.source}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {lead.message && (
                          <p className="text-xs text-muted-foreground mt-1.5 bg-muted rounded-lg px-2 py-1.5 italic line-clamp-2">
                            "{lead.message}"
                          </p>
                        )}

                        {lead.notes && (
                          <p className="text-xs text-gray-600 mt-1 flex items-start gap-1">
                            <span className="shrink-0 font-medium">Catatan:</span>
                            <span className="line-clamp-1">{lead.notes}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <p className="text-[10px] text-muted-foreground">
                            {lead.created_at
                              ? formatDistanceToNow(parseISO(lead.created_at), { addSuffix: true, locale: localeId })
                              : ""}
                          </p>
                          <div className="flex gap-1">
                            <a
                              href={waLink(lead.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg px-2 py-1 transition-colors"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              WA
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              onClick={() => openEdit(lead)}
                            >
                              <Pencil className="h-3 w-3 mr-0.5" /> Ubah Status
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages} ({filtered.length} lead)</span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted rounded-xl p-3 text-sm">
              <p className="font-semibold">{selectedLead?.name}</p>
              <a href={`tel:${selectedLead?.phone}`} className="text-blue-600 text-xs">{selectedLead?.phone}</a>
              {selectedLead?.message && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{selectedLead.message}"</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as LeadStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={val} value={val}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Catatan Internal</label>
              <Textarea
                placeholder="Contoh: Sudah dihubungi via WA, tertarik paket Umroh Plus..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <a
                href={selectedLead ? waLink(selectedLead.phone) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Hubungi via WA
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
