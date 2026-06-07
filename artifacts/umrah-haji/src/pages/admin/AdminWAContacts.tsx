import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Users, RefreshCw, Search, Phone, UserCheck,
  Pencil, Trash2, RotateCcw, MessageSquarePlus,
  Bot, ArrowUpLeft, ArrowUpRight, Send, Loader2,
  MessageSquare, BarChart3, Clock, CheckCheck,
  Download, FileSpreadsheet, FileText, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api/v1/whatsapp";

interface WAContact {
  id: string;
  phone: string;
  name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  tags: string[];
  notes: string | null;
  opt_out: boolean;
  last_sent_at: string | null;
  last_reply_at: string | null;
  message_count: number;
  updated_at: string;
}

interface ConvMessage {
  id: string;
  text: string;
  ts: string;
  direction: "incoming" | "outgoing";
  chatbot_matched?: boolean;
  reply_message?: string | null;
  is_replied?: boolean;
  template_code?: string;
  status?: string;
}

interface ContactHistory {
  contact: { id: string; phone: string; name: string | null };
  messages: ConvMessage[];
  stats: { incoming_count: number; outgoing_count: number; chatbot_count: number };
}

export default function AdminWAContacts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editContact, setEditContact] = useState<WAContact | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; notes: string; tags: string }>({ name: "", notes: "", tags: "" });
  const [detailContact, setDetailContact] = useState<WAContact | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Export state
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx");
  const [exportOptOut, setExportOptOut] = useState<"all" | "active" | "optout">("all");
  const [exportTags, setExportTags] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ total: number; contacts: WAContact[] }>({
    queryKey: ["wa-contacts", search, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (search) p.set("search", search);
      return fetch(`${API}/contacts?${p}`).then(r => r.json());
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<ContactHistory>({
    queryKey: ["wa-contact-history", detailContact?.id],
    queryFn: () => fetch(`${API}/contacts/${detailContact!.id}/messages`).then(r => r.json()),
    enabled: !!detailContact,
    refetchInterval: detailContact ? 20000 : false,
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const pageSize = 50;

  const syncMut = useMutation({
    mutationFn: () =>
      fetch(`${API}/contacts/sync`, { method: "POST" }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal sinkronisasi");
        return d;
      }),
    onSuccess: (d) => {
      toast.success(`Sinkronisasi selesai: ${d.synced} kontak disinkronkan`);
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`${API}/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Kontak diperbarui");
      setEditContact(null);
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/contacts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Kontak dihapus");
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    },
  });

  function openEdit(c: WAContact) {
    setEditContact(c);
    setEditForm({ name: c.name || "", notes: c.notes || "", tags: (c.tags || []).join(", ") });
  }

  function saveEdit() {
    if (!editContact) return;
    const tags = editForm.tags.split(",").map(t => t.trim()).filter(Boolean);
    patchMut.mutate({ id: editContact.id, data: { name: editForm.name, notes: editForm.notes, tags } });
  }

  function openDetail(c: WAContact) {
    setDetailContact(c);
    setReplyText("");
  }

  async function sendReply() {
    if (!detailContact || !replyText.trim()) return;
    setIsSending(true);
    try {
      const resp = await fetch(`${API}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: detailContact.phone, message: replyText.trim(), recipientName: detailContact.name }),
      });
      const d = await resp.json();
      if (!resp.ok || !d.success) throw new Error(d.error || "Gagal mengirim");
      toast.success("Pesan terkirim");
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["wa-contact-history", detailContact.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSending(false);
    }
  }

  const optOutTotal = contacts.filter(c => c.opt_out).length;
  const withCustomer = contacts.filter(c => c.customer_id).length;

  const stats = historyData?.stats;
  const messages = historyData?.messages ?? [];

  // Collect all unique tags from loaded contacts
  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => (c.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [contacts]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const p = new URLSearchParams({ format: exportFormat, opt_out: exportOptOut });
      if (search) p.set("search", search);
      if (exportTags.length) p.set("tags", exportTags.join(","));
      const resp = await fetch(`${API}/contacts/export?${p}`);
      if (!resp.ok) throw new Error("Gagal mengekspor kontak");
      const blob = await resp.blob();
      const ext = exportFormat === "xlsx" ? "xlsx" : "csv";
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kontak-wa-${dateStr}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`File ${ext.toUpperCase()} berhasil diunduh`);
      setShowExport(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            Kontak WA Jamaah
          </h1>
          <p className="text-muted-foreground mt-1">Kelola daftar kontak, lihat riwayat percakapan per kontak</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExport(true)}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4 mr-1" /> Ekspor
          </Button>
          <Button
            size="sm"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <RotateCcw className={cn("h-4 w-4 mr-1", syncMut.isPending && "animate-spin")} />
            {syncMut.isPending ? "Menyinkronkan..." : "Sinkron dari Data Jamaah"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-600">{total}</div>
            <div className="text-sm text-muted-foreground">Total Kontak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{withCustomer}</div>
            <div className="text-sm text-muted-foreground">Terhubung Jamaah</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{total - optOutTotal}</div>
            <div className="text-sm text-muted-foreground">Aktif (Opt-in)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{optOutTotal}</div>
            <div className="text-sm text-muted-foreground">Opt-Out</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nomor atau nama..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{total} kontak</p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Daftar Kontak
          </CardTitle>
          <CardDescription>
            Klik baris untuk melihat riwayat percakapan · "Sinkron" untuk impor otomatis dari data booking
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat kontak...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Belum ada kontak. Klik "Sinkron dari Data Jamaah" untuk mengisi otomatis.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor WA</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-center">Pesan</TableHead>
                  <TableHead>Terakhir Aktif</TableHead>
                  <TableHead>Opt-Out</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(c => (
                  <TableRow
                    key={c.id}
                    className={cn("cursor-pointer hover:bg-teal-50/50 transition-colors", c.opt_out && "opacity-50")}
                    onClick={() => openDetail(c)}
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        +{c.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name || <span className="text-muted-foreground italic text-sm">Tanpa nama</span>}</div>
                      {c.customer_name && c.customer_name !== c.name && (
                        <div className="text-xs text-muted-foreground">{c.customer_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.customer_id ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs">
                          <UserCheck className="h-3 w-3 mr-1" />Jamaah
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">Umum</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).length > 0
                          ? c.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <MessageSquarePlus className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{c.message_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_reply_at
                        ? format(parseISO(c.last_reply_at), "dd MMM HH:mm", { locale: idLocale })
                        : c.last_sent_at
                          ? format(parseISO(c.last_sent_at), "dd MMM HH:mm", { locale: idLocale })
                          : "—"
                      }
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={c.opt_out}
                        onCheckedChange={v => patchMut.mutate({ id: c.id, data: { opt_out: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm("Hapus kontak ini?")) deleteMut.mutate(c.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
            Sebelumnya
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            Halaman {page + 1} dari {Math.ceil(total / pageSize)}
          </span>
          <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      {/* ── Contact Detail Sheet ─────────────────────────────────────────────── */}
      <Sheet open={!!detailContact} onOpenChange={v => { if (!v) { setDetailContact(null); setReplyText(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          {detailContact && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{detailContact.name || "Tanpa nama"}</div>
                    <div className="text-sm text-muted-foreground font-mono">+{detailContact.phone}</div>
                  </div>
                  {detailContact.customer_id && (
                    <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs shrink-0">
                      <UserCheck className="h-3 w-3 mr-1" />Jamaah
                    </Badge>
                  )}
                </SheetTitle>

                {/* Interaction Stats */}
                {stats && (
                  <div className="flex gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowUpLeft className="h-3.5 w-3.5 text-sky-500" />
                      <span><strong className="text-foreground">{stats.incoming_count}</strong> masuk</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowUpRight className="h-3.5 w-3.5 text-teal-500" />
                      <span><strong className="text-foreground">{stats.outgoing_count}</strong> keluar</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Bot className="h-3.5 w-3.5 text-purple-500" />
                      <span><strong className="text-foreground">{stats.chatbot_count}</strong> chatbot</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {(detailContact.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {detailContact.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {detailContact.notes && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-teal-200 pl-2 mt-1">{detailContact.notes}</p>
                )}
              </SheetHeader>

              {/* Message History */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 flex items-center gap-2 border-b bg-muted/30">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Riwayat Percakapan ({messages.length} pesan)
                  </span>
                  {historyLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
                </div>

                <ScrollArea className="flex-1 px-4 py-3">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat riwayat...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada riwayat percakapan</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-2">
                      {/* Sort oldest first for chat display */}
                      {[...messages].reverse().map((msg, i) => {
                        const isIncoming = msg.direction === "incoming";
                        return (
                          <div key={msg.id + i} className={cn("flex", isIncoming ? "justify-start" : "justify-end")}>
                            <div className={cn(
                              "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm space-y-1",
                              isIncoming
                                ? "bg-white border border-border rounded-tl-sm shadow-xs"
                                : "bg-teal-600 text-white rounded-tr-sm",
                            )}>
                              {/* Direction indicator */}
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] font-medium mb-1",
                                isIncoming ? "text-muted-foreground" : "text-teal-100",
                              )}>
                                {isIncoming ? (
                                  <><ArrowUpLeft className="h-3 w-3" /> Pesan Masuk</>
                                ) : (
                                  <><ArrowUpRight className="h-3 w-3" /> Terkirim</>
                                )}
                                {msg.chatbot_matched && (
                                  <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1 py-0 h-4 ml-1">
                                    <Bot className="h-2.5 w-2.5 mr-0.5" />Bot
                                  </Badge>
                                )}
                                {msg.template_code && msg.template_code !== 'CUSTOM' && (
                                  <Badge className="bg-teal-100 text-teal-700 text-[9px] px-1 py-0 h-4 ml-1">
                                    {msg.template_code}
                                  </Badge>
                                )}
                              </div>

                              {/* Message text */}
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>

                              {/* Bot auto-reply preview (for incoming that triggered bot) */}
                              {isIncoming && msg.is_replied && msg.reply_message && (
                                <div className={cn(
                                  "mt-2 pt-2 border-t text-[11px] italic",
                                  "border-border/50 text-muted-foreground",
                                )}>
                                  <Bot className="h-3 w-3 inline mr-1" />
                                  Dibalas: {msg.reply_message.length > 80 ? msg.reply_message.slice(0, 80) + "…" : msg.reply_message}
                                </div>
                              )}

                              {/* Timestamp + status */}
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] mt-1",
                                isIncoming ? "text-muted-foreground" : "text-teal-200",
                              )}>
                                <Clock className="h-2.5 w-2.5" />
                                {format(parseISO(msg.ts), "dd MMM yyyy · HH:mm", { locale: idLocale })}
                                {!isIncoming && msg.status && (
                                  <span className="ml-1 capitalize">
                                    {msg.status === "delivered" || msg.status === "read"
                                      ? <CheckCheck className="h-3 w-3 inline" />
                                      : msg.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Send Message */}
              <Separator />
              <div className="px-4 py-3 space-y-2">
                {detailContact.opt_out ? (
                  <p className="text-xs text-red-500 text-center py-1">
                    Kontak ini telah opt-out — tidak dapat mengirim pesan
                  </p>
                ) : (
                  <>
                    <Textarea
                      rows={3}
                      placeholder="Ketik pesan untuk dikirim ke kontak ini..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="text-sm resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground">Ctrl+Enter untuk kirim</span>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 gap-1.5"
                        disabled={!replyText.trim() || isSending}
                        onClick={sendReply}
                      >
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Kirim Pesan
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Export Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-600" />
              Ekspor Kontak WA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" /> Format File
              </Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={v => setExportFormat(v as "csv" | "xlsx")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/50 flex-1"
                  onClick={() => setExportFormat("xlsx")}>
                  <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                  <Label htmlFor="fmt-xlsx" className="cursor-pointer flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Excel (.xlsx)</div>
                      <div className="text-xs text-muted-foreground">Dengan lembar Ringkasan</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/50 flex-1"
                  onClick={() => setExportFormat("csv")}>
                  <RadioGroupItem value="csv" id="fmt-csv" />
                  <Label htmlFor="fmt-csv" className="cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">CSV (.csv)</div>
                      <div className="text-xs text-muted-foreground">Kompatibel semua aplikasi</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Opt-out filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <Filter className="h-4 w-4" /> Filter Status Opt-Out
              </Label>
              <RadioGroup
                value={exportOptOut}
                onValueChange={v => setExportOptOut(v as "all" | "active" | "optout")}
                className="space-y-1"
              >
                {[
                  { value: "all",    label: "Semua kontak" },
                  { value: "active", label: "Hanya aktif (opt-in)" },
                  { value: "optout", label: "Hanya yang opt-out" },
                ].map(opt => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`optout-${opt.value}`} />
                    <Label htmlFor={`optout-${opt.value}`} className="cursor-pointer font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Filter className="h-4 w-4" /> Filter Tags
                    <span className="text-xs text-muted-foreground font-normal">(kosongkan = semua tag)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {allTags.map(tag => (
                      <div key={tag} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={exportTags.includes(tag)}
                          onCheckedChange={checked => {
                            setExportTags(prev =>
                              checked ? [...prev, tag] : prev.filter(t => t !== tag)
                            );
                          }}
                        />
                        <Label htmlFor={`tag-${tag}`} className="cursor-pointer text-xs">
                          <Badge variant="outline" className="text-xs">{tag}</Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {exportTags.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground"
                      onClick={() => setExportTags([])}>
                      Hapus filter tag
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Info row */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800 space-y-1">
              <p className="font-medium">Kolom yang diekspor:</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Nomor WA · Nama · Jamaah · Email · Tags · Catatan · Opt-Out ·
                Pesan Masuk · Pesan Keluar · Chatbot · Total Interaksi · Terakhir Kirim · Terakhir Balas · Terdaftar Sejak
              </p>
              {search && (
                <p className="text-xs font-medium text-amber-700 mt-1">
                  ⚠ Filter pencarian aktif: "{search}" akan diterapkan ke ekspor
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExport(false)}>Batal</Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isExporting
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Mengekspor...</>
                : <><Download className="h-4 w-4 mr-1" /> Unduh {exportFormat.toUpperCase()}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={!!editContact} onOpenChange={v => { if (!v) setEditContact(null); }}>
        {editContact && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Kontak</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nomor WA</Label>
                <Input value={`+${editContact.phone}`} disabled className="font-mono" />
              </div>
              <div>
                <Label>Nama</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama kontak"
                />
              </div>
              <div>
                <Label>Tags <span className="text-muted-foreground font-normal">(pisahkan dengan koma)</span></Label>
                <Input
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="cth: vip, leads, jamaah_2025"
                />
              </div>
              <div>
                <Label>Catatan Internal</Label>
                <Textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan internal tentang kontak ini..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditContact(null)}>Batal</Button>
              <Button onClick={saveEdit} disabled={patchMut.isPending} className="bg-teal-600 hover:bg-teal-700">
                {patchMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
