import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  MessageSquare, Search, RefreshCcw, Loader2, ChevronDown, ChevronUp,
  Bot, ThumbsUp, ThumbsDown, Minus, Calendar, Filter, Download,
  AlertCircle, HelpCircle, FileSpreadsheet, FileText, ChevronRight,
  Play, User, Zap, BookOpen, X, Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatLog {
  id: string;
  session_id?: string;
  message?: string;
  answer?: string;
  source?: string;
  rating?: number | null;
  is_unanswered?: boolean;
  channel?: string;
  created_at: string;
}

interface LogsResponse {
  logs: ChatLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

const SOURCE_ICON: Record<string, React.ReactNode> = {
  gemini: <Zap className="h-3.5 w-3.5" />,
  openai: <Bot className="h-3.5 w-3.5" />,
  faq: <BookOpen className="h-3.5 w-3.5" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  widget: "Widget",
  jamaah: "Portal Jamaah",
  admin: "Admin",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function RatingBadge({ rating }: { rating?: number | null }) {
  if (rating === 1) return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <ThumbsUp className="h-3 w-3" /> Positif
    </span>
  );
  if (rating === -1) return (
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

function relativeTime(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale }); }
  catch { return "—"; }
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(rows: ChatLog[], filename: string) {
  const headers = ["Waktu", "Channel", "Sumber", "Pertanyaan", "Jawaban", "Rating", "Tak Terjawab", "Session ID", "ID"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      l.channel || "jamaah",
      SOURCE_LABELS[l.source || ""] || l.source || "",
      l.message || "",
      l.answer || "",
      l.rating === 1 ? "Positif" : l.rating === -1 ? "Negatif" : "Belum dinilai",
      l.is_unanswered ? "Ya" : "Tidak",
      l.session_id || "",
      l.id,
    ].map(escape).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename + ".csv");
}

async function exportExcel(rows: ChatLog[], filename: string, filterSummary: string) {
  const XLSXStyle = (await import("xlsx-js-style")).default;
  const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "7C3AED" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  };
  const CELL_STYLE = { alignment: { vertical: "top", wrapText: true }, font: { sz: 10 } };
  const ALT_STYLE = { ...CELL_STYLE, fill: { fgColor: { rgb: "F5F3FF" } } };
  const UNANS_STYLE = { ...CELL_STYLE, fill: { fgColor: { rgb: "FEF3C7" } }, font: { sz: 10, color: { rgb: "92400E" } } };
  const RATING_POS = { ...CELL_STYLE, font: { sz: 10, color: { rgb: "15803D" }, bold: true } };
  const RATING_NEG = { ...CELL_STYLE, font: { sz: 10, color: { rgb: "B91C1C" }, bold: true } };
  const headers = ["Waktu", "Channel", "Sumber", "Pertanyaan", "Jawaban AI", "Rating", "Tak Terjawab", "Session ID"];
  const wsData: any[][] = [
    [{ v: filterSummary, s: { font: { italic: true, sz: 9, color: { rgb: "6B7280" } } } }],
    [""],
    headers.map((h) => ({ v: h, s: HEADER_STYLE })),
    ...rows.map((l, i) => {
      const base = l.is_unanswered ? UNANS_STYLE : i % 2 === 1 ? ALT_STYLE : CELL_STYLE;
      const ratingStyle = l.rating === 1 ? RATING_POS : l.rating === -1 ? RATING_NEG : CELL_STYLE;
      return [
        { v: format(new Date(l.created_at), "d MMM yyyy HH:mm"), s: base },
        { v: CHANNEL_LABELS[l.channel || ""] || l.channel || "jamaah", s: base },
        { v: SOURCE_LABELS[l.source || ""] || l.source || "", s: base },
        { v: l.message || "", s: base },
        { v: l.answer || "", s: base },
        { v: l.rating === 1 ? "👍 Positif" : l.rating === -1 ? "👎 Negatif" : "—", s: ratingStyle },
        { v: l.is_unanswered ? "Ya" : "Tidak", s: base },
        { v: l.session_id || "", s: { ...base, font: { sz: 9, color: { rgb: "6B7280" } } } },
      ];
    }),
  ];
  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 50 }, { wch: 60 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 3 };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Chat Logs");
  const summarySheet = XLSXStyle.utils.aoa_to_sheet([
    ["Laporan Chatbot Vinstour Travel"],
    ["Diekspor pada", format(new Date(), "d MMMM yyyy HH:mm", { locale: idLocale })],
    ["Total baris", rows.length],
    ["Filter aktif", filterSummary],
    [],
    ["Ringkasan Rating"],
    ["👍 Positif", rows.filter(r => r.rating === 1).length],
    ["👎 Negatif", rows.filter(r => r.rating === -1).length],
    ["— Belum dinilai", rows.filter(r => r.rating == null).length],
    [],
    ["Ringkasan Sumber"],
    ["Gemini AI", rows.filter(r => r.source === "gemini").length],
    ["OpenAI", rows.filter(r => r.source === "openai").length],
    ["FAQ Lokal", rows.filter(r => r.source === "faq").length],
    [],
    ["Pertanyaan Tak Terjawab", rows.filter(r => r.is_unanswered).length],
  ]);
  summarySheet["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSXStyle.utils.book_append_sheet(wb, summarySheet, "Ringkasan");
  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename + ".xlsx");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Chat bubble (for session replay) ────────────────────────────────────────
function ChatBubble({ log }: { log: ChatLog }) {
  return (
    <div className="space-y-3">
      {/* User message */}
      <div className="flex items-start gap-2.5 justify-end">
        <div className="max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
            {log.message || <span className="italic opacity-70">Pesan kosong</span>}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {format(new Date(log.created_at), "HH:mm", { locale: idLocale })}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>

      {/* Bot answer */}
      {log.answer && (
        <div className="flex items-start gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            log.source === "gemini" ? "bg-blue-100" : log.source === "openai" ? "bg-green-100" : "bg-gray-100"
          }`}>
            {SOURCE_ICON[log.source || "faq"] || <Bot className="h-3.5 w-3.5" />}
          </div>
          <div className="max-w-[80%]">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
              {log.answer}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${SOURCE_COLORS[log.source || "faq"]}`}>
                {SOURCE_LABELS[log.source || "faq"] || log.source}
              </Badge>
              {log.is_unanswered && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                  Tak Terjawab
                </Badge>
              )}
              {log.rating === 1 && <ThumbsUp className="h-3 w-3 text-green-500" />}
              {log.rating === -1 && <ThumbsDown className="h-3 w-3 text-red-400" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Replay Sheet ─────────────────────────────────────────────────────
function SessionReplaySheet({
  sessionId, open, onClose,
}: {
  sessionId: string | null; open: boolean; onClose: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session-replay", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/chatbot/sessions/${encodeURIComponent(sessionId!)}`);
      if (!res.ok) throw new Error("Gagal memuat sesi");
      return res.json() as Promise<{ logs: ChatLog[]; sessionId: string }>;
    },
    enabled: !!sessionId && open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.logs?.length) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [data]);

  const logs = data?.logs || [];
  const duration = logs.length >= 2
    ? (() => {
        const ms = new Date(logs[logs.length - 1].created_at).getTime() - new Date(logs[0].created_at).getTime();
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      })()
    : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <Play className="h-4 w-4 text-purple-500" />
                Replay Sesi Percakapan
              </SheetTitle>
              <SheetDescription className="mt-1 space-y-0.5">
                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{sessionId?.slice(0, 20)}…</span>
                {logs.length > 0 && (
                  <span className="block text-[11px] mt-1">
                    {logs.length} pesan
                    {duration && <> · Durasi {duration}</>}
                    {" · "}{format(new Date(logs[0].created_at), "d MMM yyyy HH:mm", { locale: idLocale })}
                  </span>
                )}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Session meta badges */}
          {logs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Array.from(new Set(logs.map(l => l.channel).filter(Boolean))).map(ch => (
                <Badge key={ch} variant="outline" className="text-xs">
                  {CHANNEL_LABELS[ch!] || ch}
                </Badge>
              ))}
              {Array.from(new Set(logs.map(l => l.source).filter(Boolean))).map(src => (
                <Badge key={src} variant="outline" className={`text-xs ${SOURCE_COLORS[src!] || ""}`}>
                  {SOURCE_LABELS[src!] || src}
                </Badge>
              ))}
              {logs.some(l => l.is_unanswered) && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                  <HelpCircle className="h-3 w-3 mr-1" />Ada pertanyaan tak terjawab
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Memuat percakapan…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm">Gagal memuat sesi percakapan</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p className="text-sm">Tidak ada pesan dalam sesi ini</p>
            </div>
          ) : (
            <>
              {/* Session start marker */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  Sesi dimulai {relativeTime(logs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {logs.map((log, i) => (
                <div key={log.id}>
                  <ChatBubble log={log} />
                  {/* Date separator between turns on different days */}
                  {i < logs.length - 1 &&
                    logs[i + 1].created_at.slice(0, 10) !== log.created_at.slice(0, 10) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span>{format(new Date(logs[i + 1].created_at), "d MMM yyyy", { locale: idLocale })}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────
function LogRow({ log, onReplaySession }: { log: ChatLog; onReplaySession: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="outline" className={`text-xs shrink-0 gap-1 ${SOURCE_COLORS[log.source || "faq"] || "bg-gray-100 text-gray-600"}`}>
                {SOURCE_ICON[log.source || "faq"]}
                {SOURCE_LABELS[log.source || ""] || log.source || "—"}
              </Badge>
              {log.is_unanswered && (
                <Badge className="text-xs shrink-0 bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <HelpCircle className="h-2.5 w-2.5" /> Tak Terjawab
                </Badge>
              )}
              {log.channel && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {CHANNEL_LABELS[log.channel] || log.channel}
                </span>
              )}
              <RatingBadge rating={log.rating} />
            </div>
            <p className="text-sm font-medium truncate leading-snug">
              {log.message
                ? log.message.slice(0, 120)
                : <span className="text-muted-foreground italic">Pesan kosong</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(log.created_at), "d MMM yyyy HH:mm", { locale: idLocale })}
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/10 p-4 space-y-3">
          {/* Question */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <User className="h-3 w-3" /> Pertanyaan Pengunjung
            </p>
            <p className="text-sm whitespace-pre-wrap bg-background border rounded-lg p-3 leading-relaxed">
              {log.message || <span className="italic text-muted-foreground">Kosong</span>}
            </p>
          </div>
          {/* Answer */}
          {log.answer && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Bot className="h-3 w-3" /> Jawaban AI
              </p>
              <p className="text-sm whitespace-pre-wrap bg-background border rounded-lg p-3 leading-relaxed">
                {log.answer}
              </p>
            </div>
          )}
          {/* Footer row */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>ID: <span className="font-mono">{log.id}</span></span>
              {log.session_id && (
                <span>Session: <span className="font-mono">{log.session_id.slice(0, 16)}…</span></span>
              )}
              <span>{relativeTime(log.created_at)}</span>
            </div>
            {log.session_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onReplaySession(log.session_id!); }}
                className="h-7 px-2.5 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Play className="h-3 w-3" />
                Replay Sesi
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminChatLogs() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const PAGE_SIZE = 30;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Build query params
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sourceFilter !== "all" && { source: sourceFilter }),
    ...(channelFilter !== "all" && { channel: channelFilter }),
    ...(ratingFilter !== "all" && { rating: ratingFilter }),
    ...(unansweredOnly && { unanswered: "1" }),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery<LogsResponse>({
    queryKey: ["admin-chat-logs", page, debouncedSearch, sourceFilter, channelFilter, ratingFilter, unansweredOnly],
    queryFn: async () => {
      const res = await fetch(`/api/v1/chatbot/logs?${params}`);
      if (!res.ok) throw new Error("Gagal memuat log");
      return res.json();
    },
    staleTime: 30_000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilter = sourceFilter !== "all" || channelFilter !== "all" || ratingFilter !== "all" || unansweredOnly || !!search.trim();

  function buildFilterSummary() {
    const parts: string[] = [];
    if (sourceFilter !== "all") parts.push(`Sumber: ${SOURCE_LABELS[sourceFilter] || sourceFilter}`);
    if (channelFilter !== "all") parts.push(`Channel: ${CHANNEL_LABELS[channelFilter] || channelFilter}`);
    if (ratingFilter === "positive") parts.push("Rating: Positif");
    else if (ratingFilter === "negative") parts.push("Rating: Negatif");
    else if (ratingFilter === "unrated") parts.push("Rating: Belum dinilai");
    if (unansweredOnly) parts.push("Tak Terjawab: Ya");
    if (search.trim()) parts.push(`Kata kunci: "${search.trim()}"`);
    return parts.length > 0 ? parts.join(" · ") : "Semua log (tidak ada filter aktif)";
  }

  function buildFilename() {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const suffix = [
      sourceFilter !== "all" ? sourceFilter : "",
      ratingFilter !== "all" ? ratingFilter : "",
      unansweredOnly ? "unanswered" : "",
    ].filter(Boolean).join("-");
    return `chatbot-logs-${dateStr}${suffix ? `-${suffix}` : ""}`;
  }

  async function handleExport(type: "csv" | "xlsx") {
    setExporting(true);
    try {
      const exportParams = new URLSearchParams({
        page: "0", pageSize: "5000",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(sourceFilter !== "all" && { source: sourceFilter }),
        ...(channelFilter !== "all" && { channel: channelFilter }),
        ...(ratingFilter !== "all" && { rating: ratingFilter }),
        ...(unansweredOnly && { unanswered: "1" }),
      });
      const res = await fetch(`/api/v1/chatbot/logs?${exportParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result: LogsResponse = await res.json();
      const filename = buildFilename();
      if (type === "csv") exportCSV(result.logs, filename);
      else await exportExcel(result.logs, filename, buildFilterSummary());
    } catch (err) {
      console.error("Export gagal:", err);
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setSourceFilter("all"); setChannelFilter("all"); setRatingFilter("all");
    setUnansweredOnly(false); setSearch(""); setPage(0);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-500" />
            Log Percakapan Chatbot
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Riwayat interaksi pengunjung dengan AI — cari, filter, dan replay sesi percakapan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting || total === 0} className="gap-1.5">
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {exporting ? "Mengekspor…" : "Ekspor"}
                {!exporting && <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format ekspor</p>
                {total > 0 && <p className="text-[11px] text-muted-foreground mt-0.5">Semua {total.toLocaleString("id")} log (filter aktif)</p>}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <div><p className="text-sm font-medium">Excel (.xlsx)</p><p className="text-[11px] text-muted-foreground">Berformat, dengan ringkasan statistik</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-blue-600" />
                <div><p className="text-sm font-medium">CSV (.csv)</p><p className="text-[11px] text-muted-foreground">Kompatibel dengan semua spreadsheet</p></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pesan, jawaban, atau session ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Semua Sumber" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sumber</SelectItem>
                  <SelectItem value="gemini">Gemini AI</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="faq">FAQ Lokal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={v => { setChannelFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Semua Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Channel</SelectItem>
                  <SelectItem value="widget">Widget</SelectItem>
                  <SelectItem value="jamaah">Portal Jamaah</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={v => { setRatingFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Semua Rating" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rating</SelectItem>
                  <SelectItem value="positive">👍 Positif</SelectItem>
                  <SelectItem value="negative">👎 Negatif</SelectItem>
                  <SelectItem value="unrated">Belum Dinilai</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Active filter chips */}
          {hasActiveFilter && (
            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Filter aktif:</span>
              {sourceFilter !== "all" && <Badge variant="secondary" className="text-xs">Sumber: {SOURCE_LABELS[sourceFilter] || sourceFilter}</Badge>}
              {channelFilter !== "all" && <Badge variant="secondary" className="text-xs">Channel: {CHANNEL_LABELS[channelFilter] || channelFilter}</Badge>}
              {ratingFilter !== "all" && <Badge variant="secondary" className="text-xs">Rating: {ratingFilter === "positive" ? "Positif" : ratingFilter === "negative" ? "Negatif" : "Belum dinilai"}</Badge>}
              {unansweredOnly && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Tak Terjawab saja</Badge>}
              {debouncedSearch && <Badge variant="secondary" className="text-xs">"{debouncedSearch}"</Badge>}
              <button onClick={resetFilters} className="text-xs text-muted-foreground underline hover:text-foreground ml-auto">
                Reset semua filter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm">Gagal memuat log. Pastikan server API berjalan.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Coba Lagi</Button>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="font-medium">{hasActiveFilter ? "Tidak ada hasil untuk filter ini" : "Belum ada log percakapan"}</p>
            <p className="text-sm mt-1">
              {hasActiveFilter ? "Coba ubah atau reset filter." : "Log akan muncul setelah ada pengunjung yang berinteraksi dengan chatbot"}
            </p>
            {hasActiveFilter && <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>Reset Filter</Button>}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {total.toLocaleString("id")} log ditemukan
              {isFetching && <span className="ml-2 text-xs opacity-60">memperbarui…</span>}
            </span>
            {totalPages > 1 && <span>Halaman {page + 1} / {totalPages}</span>}
          </div>

          <div className="space-y-2">
            {logs.map(log => (
              <LogRow key={log.id} log={log} onReplaySession={setReplaySessionId} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Sebelumnya
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pg = totalPages <= 7 ? i : page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 text-sm rounded-md transition-colors ${
                        pg === page ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {pg + 1}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}

      {/* Session Replay drawer */}
      <SessionReplaySheet
        sessionId={replaySessionId}
        open={!!replaySessionId}
        onClose={() => setReplaySessionId(null)}
      />
    </div>
  );
}
