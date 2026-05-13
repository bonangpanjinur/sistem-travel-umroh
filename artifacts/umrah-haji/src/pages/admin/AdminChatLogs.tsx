import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare, Search, RefreshCcw, Loader2, ChevronDown,
  ChevronUp, Bot, ThumbsUp, ThumbsDown, Minus, Calendar,
  Filter, Download, AlertCircle, HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ChatLog {
  id: string;
  session_id?: string;
  message?: string;
  response?: string;
  source?: string;
  rating?: number | null;
  is_unanswered?: boolean;
  channel?: string;
  created_at: string;
  metadata?: any;
}

const SOURCE_LABELS: Record<string, string> = {
  gemini: "Gemini AI",
  openai: "OpenAI",
  faq: "FAQ Lokal",
};

const SOURCE_COLORS: Record<string, string> = {
  gemini: "bg-blue-100 text-blue-700 border-blue-200",
  openai: "bg-green-100 text-green-700 border-green-200",
  faq: "bg-gray-100 text-gray-600 border-gray-200",
};

function RatingBadge({ rating }: { rating?: number | null }) {
  if (rating === 1)
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <ThumbsUp className="h-3 w-3" /> Positif
      </span>
    );
  if (rating === -1)
    return (
      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
        <ThumbsDown className="h-3 w-3" /> Negatif
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> Belum dinilai
    </span>
  );
}

function LogRow({ log }: { log: ChatLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${SOURCE_COLORS[log.source || "faq"] || "bg-gray-100 text-gray-600"}`}
              >
                {SOURCE_LABELS[log.source || ""] || log.source || "—"}
              </Badge>
              {log.is_unanswered && (
                <Badge className="text-xs shrink-0 bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <HelpCircle className="h-2.5 w-2.5" /> Tak Terjawab
                </Badge>
              )}
              {log.channel && log.channel !== "jamaah" && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {log.channel}
                </span>
              )}
              {log.session_id && (
                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                  {log.session_id.slice(0, 12)}…
                </span>
              )}
              <RatingBadge rating={log.rating} />
            </div>
            <p className="text-sm font-medium truncate">
              {log.message ? log.message.slice(0, 120) : <span className="text-muted-foreground italic">Pesan kosong</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(log.created_at), "d MMM yyyy HH:mm", { locale: idLocale })}
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/10 p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Pertanyaan Pengunjung
            </p>
            <p className="text-sm whitespace-pre-wrap bg-background border rounded p-3">
              {log.message || <span className="italic text-muted-foreground">Kosong</span>}
            </p>
          </div>
          {log.response && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <Bot className="h-3 w-3" /> Jawaban AI
              </p>
              <p className="text-sm whitespace-pre-wrap bg-background border rounded p-3">
                {log.response}
              </p>
            </div>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Metadata
              </p>
              <pre className="text-xs bg-background border rounded p-3 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
            <span>ID: <span className="font-mono">{log.id}</span></span>
            {log.session_id && (
              <span>Session: <span className="font-mono">{log.session_id}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminChatLogs() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-chat-logs", sourceFilter, ratingFilter, unansweredOnly, page],
    queryFn: async () => {
      let q = supabase
        .from("chatbot_logs")
        .select("id, session_id, message, response, source, rating, is_unanswered, channel, created_at, metadata", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      if (ratingFilter === "positive") q = q.eq("rating", 1);
      else if (ratingFilter === "negative") q = q.eq("rating", -1);
      else if (ratingFilter === "unrated") q = q.is("rating", null);
      if (unansweredOnly) q = q.eq("is_unanswered", true);

      const { data, error, count } = await q;
      if (error) throw error;
      return { logs: (data || []) as ChatLog[], total: count || 0 };
    },
    staleTime: 30_000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search.trim()
    ? logs.filter(
        (l) =>
          l.message?.toLowerCase().includes(search.toLowerCase()) ||
          l.response?.toLowerCase().includes(search.toLowerCase()) ||
          l.session_id?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const handleExportCSV = () => {
    const rows = [
      ["ID", "Session ID", "Sumber", "Pertanyaan", "Jawaban", "Rating", "Waktu"],
      ...logs.map((l) => [
        l.id,
        l.session_id || "",
        l.source || "",
        (l.message || "").replace(/"/g, '""'),
        (l.response || "").replace(/"/g, '""'),
        l.rating === 1 ? "positif" : l.rating === -1 ? "negatif" : "",
        l.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatbot-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-500" />
            Log Percakapan Chatbot
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Riwayat semua interaksi pengunjung dengan chatbot AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Ekspor CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pesan atau session ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Semua Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sumber</SelectItem>
                  <SelectItem value="gemini">Gemini AI</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="faq">FAQ Lokal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Semua Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rating</SelectItem>
                  <SelectItem value="positive">👍 Positif</SelectItem>
                  <SelectItem value="negative">👎 Negatif</SelectItem>
                  <SelectItem value="unrated">Belum Dinilai</SelectItem>
                </SelectContent>
              </Select>
              {/* P6: Filter unanswered */}
              <button
                onClick={() => { setUnansweredOnly(v => !v); setPage(0); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  unansweredOnly
                    ? "bg-amber-50 text-amber-700 border-amber-300 font-semibold"
                    : "bg-background text-muted-foreground border-input hover:border-amber-300"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Tak Terjawab
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm">Gagal memuat log. Pastikan Supabase sudah terhubung.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="font-medium">Belum ada log percakapan</p>
            <p className="text-sm mt-1">Log akan muncul setelah ada pengunjung yang berinteraksi dengan chatbot</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              Menampilkan {filtered.length} dari {total} log
              {search && ` (filter: "${search}")`}
            </span>
            <span>Halaman {page + 1} / {totalPages || 1}</span>
          </div>

          <div className="space-y-2">
            {filtered.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
