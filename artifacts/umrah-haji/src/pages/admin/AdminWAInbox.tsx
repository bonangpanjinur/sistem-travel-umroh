import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Inbox, RefreshCw, Search, CheckCheck, MessageSquare, Reply,
  Bot, Phone, Clock, Eye, MailOpen, BellDot
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api/v1/whatsapp";

interface InboxMessage {
  id: string;
  from_phone: string;
  from_name: string | null;
  message: string;
  is_read: boolean;
  is_replied: boolean;
  chatbot_matched: boolean;
  reply_message: string | null;
  replied_at: string | null;
  received_at: string;
}

export default function AdminWAInbox() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ total: number; messages: InboxMessage[] }>({
    queryKey: ["wa-inbox", search, unreadOnly],
    queryFn: () => {
      const p = new URLSearchParams({ pageSize: "50" });
      if (search) p.set("search", search);
      if (unreadOnly) p.set("unread", "true");
      return fetch(`${API}/inbox?${p}`).then(r => r.json());
    },
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["wa-inbox-unread"],
    queryFn: () => fetch(`${API}/inbox/unread-count`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const messages = data?.messages ?? [];
  const unreadCount = unreadData?.count ?? 0;

  const readMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/inbox/${id}/read`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-inbox"] }),
  });

  const readAllMut = useMutation({
    mutationFn: () =>
      fetch(`${API}/inbox/read-all`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Semua pesan ditandai sudah dibaca");
      qc.invalidateQueries({ queryKey: ["wa-inbox"] });
      qc.invalidateQueries({ queryKey: ["wa-inbox-unread"] });
    },
  });

  const replyMut = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      fetch(`${API}/inbox/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal membalas");
        return d;
      }),
    onSuccess: () => {
      toast.success("Pesan terkirim");
      setShowReply(false);
      setReplyText("");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["wa-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openMessage(msg: InboxMessage) {
    setSelected(msg);
    setShowReply(false);
    setReplyText("");
    if (!msg.is_read) readMut.mutate(msg.id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-sky-600" />
            Inbox WA
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white ml-1">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Pesan masuk dari jamaah via WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline" size="sm"
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" /> Tandai Semua Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nomor / nama / pesan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={unreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setUnreadOnly(v => !v)}
          className={unreadOnly ? "bg-sky-600 hover:bg-sky-700" : ""}
        >
          <BellDot className="h-4 w-4 mr-1" />
          {unreadOnly ? "Belum Dibaca" : "Semua Pesan"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-sky-600">{data?.total ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total Pesan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{unreadCount}</div>
            <div className="text-sm text-muted-foreground">Belum Dibaca</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {messages.filter(m => m.chatbot_matched).length}
            </div>
            <div className="text-sm text-muted-foreground">Dibalas Chatbot</div>
          </CardContent>
        </Card>
      </div>

      {/* Message List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Pesan Masuk ({data?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat pesan...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Tidak ada pesan masuk{unreadOnly ? " yang belum dibaca" : ""}
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <div className="divide-y">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      !msg.is_read && "bg-sky-50 border-l-4 border-l-sky-400",
                    )}
                    onClick={() => openMessage(msg)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {msg.from_name || msg.from_phone}
                        </span>
                        {msg.from_name && (
                          <span className="text-xs text-muted-foreground">{msg.from_phone}</span>
                        )}
                        {!msg.is_read && <Badge className="bg-sky-500 text-white text-[10px] px-1 py-0">Baru</Badge>}
                        {msg.chatbot_matched && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-300 text-purple-600">
                            <Bot className="h-2.5 w-2.5 mr-0.5" />Bot
                          </Badge>
                        )}
                        {msg.is_replied && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-green-300 text-green-600">
                            <Reply className="h-2.5 w-2.5 mr-0.5" />Dibalas
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(msg.received_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      </div>
                    </div>
                    {msg.is_read ? (
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-sky-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail & Reply Dialog */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) { setSelected(null); setShowReply(false); setReplyText(""); } }}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-sky-600" />
                {selected.from_name || selected.from_phone}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(selected.received_at), "dd MMMM yyyy HH:mm", { locale: idLocale })}
                  {selected.from_name && <span>· {selected.from_phone}</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
              </div>

              {selected.chatbot_matched && selected.reply_message && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-xs text-purple-600 font-medium mb-1 flex items-center gap-1">
                    <Bot className="h-3 w-3" /> Balasan Otomatis Chatbot
                    {selected.replied_at && (
                      <span className="text-purple-400 ml-1">
                        {format(parseISO(selected.replied_at), "HH:mm", { locale: idLocale })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-purple-800 whitespace-pre-wrap">{selected.reply_message}</p>
                </div>
              )}

              {selected.is_replied && !selected.chatbot_matched && selected.reply_message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
                    <Reply className="h-3 w-3" /> Balasan Admin
                  </div>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">{selected.reply_message}</p>
                </div>
              )}

              {showReply ? (
                <div className="space-y-2">
                  <Textarea
                    rows={4}
                    placeholder="Ketik pesan balasan..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setShowReply(false); setReplyText(""); }}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || replyMut.isPending}
                      onClick={() => replyMut.mutate({ id: selected.id, message: replyText.trim() })}
                      className="bg-sky-600 hover:bg-sky-700"
                    >
                      {replyMut.isPending ? "Mengirim..." : "Kirim Balasan"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full bg-sky-600 hover:bg-sky-700"
                  onClick={() => setShowReply(true)}
                >
                  <Reply className="h-4 w-4 mr-2" /> Balas Pesan
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
