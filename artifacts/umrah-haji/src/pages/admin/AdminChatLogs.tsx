import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare, Search, RefreshCcw, Loader2, ChevronDown,
  ChevronUp, Bot, ThumbsUp, ThumbsDown, Minus, Calendar,
  Filter, Download, AlertCircle, HelpCircle, FileSpreadsheet,
  FileText, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ChatLog {
  id: string;
  session_id?: string;
  message?: string;
  response?: string;
  answer?: string;
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
  const answerText = log.response || log.answer || "";

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
          {answerText && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <Bot className="h-3 w-3" /> Jawaban AI
              </p>
              <p className="text-sm whitespace-pre-wrap bg-background border rounded p-3">
                {answerText}
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

// ─── Build export query matching active filters ────────────────────────────────
async function fetchAllLogsForExport(params: {
  sourceFilter: string;
  ratingFilter: string;
  unansweredOnly: boolean;
  search: string;
}): Promise<ChatLog[]> {
  const BATCH = 1000;
  const MAX_ROWS = 5000;
  let allRows: ChatLog[] = [];
  let from = 0;

  while (from < MAX_ROWS) {
    let q = supabase
      .from("chatbot_logs")
      .select("id, session_id, message, response, answer, source, rating, is_unanswered, channel, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + BATCH - 1);

    if (params.sourceFilter !== "all") q = q.eq("source", params.sourceFilter);
    if (params.ratingFilter === "positive") q = q.eq("rating", 1);
    else if (params.ratingFilter === "negative") q = q.eq("rating", -1);
    else if (params.ratingFilter === "unrated") q = q.is("rating", null);
    if (params.unansweredOnly) q = q.eq("is_unanswered", true);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;

    let batch = data as ChatLog[];

    // Apply text search client-side (mirrors the UI behaviour)
    if (params.search.trim()) {
      const term = params.search.toLowerCase();
      batch = batch.filter(
        (l) =>
          l.message?.toLowerCase().includes(term) ||
          (l.response || l.answer || "").toLowerCase().includes(term) ||
          l.session_id?.toLowerCase().includes(term),
      );
    }

    allRows = allRows.concat(batch);
    if (data.length < BATCH) break;
    from += BATCH;
  }

  return allRows;
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(rows: ChatLog[], filename: string) {
  const headers = ["Waktu", "Channel", "Sumber", "Pertanyaan", "Jawaban", "Rating", "Tak Terjawab", "Session ID", "ID"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((l) =>
      [
        format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
        l.channel || "jamaah",
        SOURCE_LABELS[l.source || ""] || l.source || "",
        l.message || "",
        l.response || l.answer || "",
        l.rating === 1 ? "Positif" : l.rating === -1 ? "Negatif" : "Belum dinilai",
        l.is_unanswered ? "Ya" : "Tidak",
        l.session_id || "",
        l.id,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  const bom = "\uFEFF"; // UTF-8 BOM so Excel opens with correct encoding
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename + ".csv");
}

// ─── Excel export via xlsx-js-style ──────────────────────────────────────────
async function exportExcel(rows: ChatLog[], filename: string, filterSummary: string) {
  const XLSXStyle = (await import("xlsx-js-style")).default;

  const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "7C3AED" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      bottom: { style: "thin", color: { rgb: "5B21B6" } },
    },
  };

  const CELL_STYLE = {
    alignment: { vertical: "top", wrapText: true },
    font: { sz: 10 },
  };

  const ALT_ROW_STYLE = {
    ...CELL_STYLE,
    fill: { fgColor: { rgb: "F5F3FF" } },
  };

  const UNANSWERED_STYLE = {
    ...CELL_STYLE,
    fill: { fgColor: { rgb: "FEF3C7" } },
    font: { sz: 10, color: { rgb: "92400E" } },
  };

  const RATING_POS = { ...CELL_STYLE, font: { sz: 10, color: { rgb: "15803D" }, bold: true } };
  const RATING_NEG = { ...CELL_STYLE, font: { sz: 10, color: { rgb: "B91C1C" }, bold: true } };

  const headers = ["Waktu", "Channel", "Sumber", "Pertanyaan", "Jawaban AI", "Rating", "Tak Terjawab", "Session ID"];

  // Build worksheet data
  const wsData: any[][] = [];

  // Row 1: filter summary
  wsData.push([{ v: filterSummary, s: { font: { italic: true, sz: 9, color: { rgb: "6B7280" } } } }]);
  // Row 2: blank spacer
  wsData.push([""]);
  // Row 3: headers
  wsData.push(headers.map((h) => ({ v: h, s: HEADER_STYLE })));

  // Data rows
  rows.forEach((l, i) => {
    const isAlt = i % 2 === 1;
    const isUnanswered = !!l.is_unanswered;
    const base = isUnanswered ? UNANSWERED_STYLE : isAlt ? ALT_ROW_STYLE : CELL_STYLE;

    const ratingLabel = l.rating === 1 ? "👍 Positif" : l.rating === -1 ? "👎 Negatif" : "—";
    const ratingStyle = l.rating === 1 ? RATING_POS : l.rating === -1 ? RATING_NEG : CELL_STYLE;

    wsData.push([
      { v: format(new Date(l.created_at), "d MMM yyyy HH:mm"), s: base },
      { v: l.channel || "jamaah", s: base },
      { v: SOURCE_LABELS[l.source || ""] || l.source || "", s: base },
      { v: l.message || "", s: base },
      { v: l.response || l.answer || "", s: base },
      { v: ratingLabel, s: ratingStyle },
      { v: isUnanswered ? "Ya" : "Tidak", s: base },
      { v: l.session_id || "", s: { ...base, font: { sz: 9, color: { rgb: "6B7280" } } } },
    ]);
  });

  const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 18 }, // Waktu
    { wch: 10 }, // Channel
    { wch: 12 }, // Sumber
    { wch: 50 }, // Pertanyaan
    { wch: 60 }, // Jawaban
    { wch: 14 }, // Rating
    { wch: 14 }, // Tak Terjawab
    { wch: 28 }, // Session ID
  ];

  // Freeze header rows (row 3 = index 2 after 0-based, but we have 2 meta rows + 1 header)
  ws["!freeze"] = { xSplit: 0, ySplit: 3 };

  // Merge filter summary across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, "Chat Logs");

  // Summary sheet
  const summaryData = [
    ["Laporan Chatbot Vinstour Travel"],
    ["Diekspor pada", format(new Date(), "d MMMM yyyy HH:mm", { locale: idLocale })],
    ["Total baris", rows.length],
    ["Filter aktif", filterSummary],
    [],
    ["Ringkasan Rating"],
    ["👍 Positif", rows.filter((r) => r.rating === 1).length],
    ["👎 Negatif", rows.filter((r) => r.rating === -1).length],
    ["— Belum dinilai", rows.filter((r) => r.rating == null).length],
    [],
    ["Ringkasan Sumber"],
    ["Gemini AI", rows.filter((r) => r.source === "gemini").length],
    ["OpenAI", rows.filter((r) => r.source === "openai").length],
    ["FAQ Lokal", rows.filter((r) => r.source === "faq").length],
    [],
    ["Pertanyaan Tak Terjawab", rows.filter((r) => r.is_unanswered).length],
  ];
  const wsSummary = XLSXStyle.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSXStyle.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename + ".xlsx");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminChatLogs() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 30;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-chat-logs", sourceFilter, ratingFilter, unansweredOnly, page],
    queryFn: async () => {
      let q = supabase
        .from("chatbot_logs")
        .select("id, session_id, message, response, answer, source, rating, is_unanswered, channel, created_at, metadata", { count: "exact" })
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
          (l.response || l.answer || "").toLowerCase().includes(search.toLowerCase()) ||
          l.session_id?.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  // Build a human-readable filter summary for the export file
  function buildFilterSummary() {
    const parts: string[] = [];
    if (sourceFilter !== "all") parts.push(`Sumber: ${SOURCE_LABELS[sourceFilter] || sourceFilter}`);
    if (ratingFilter === "positive") parts.push("Rating: Positif");
    else if (ratingFilter === "negative") parts.push("Rating: Negatif");
    else if (ratingFilter === "unrated") parts.push("Rating: Belum dinilai");
    if (unansweredOnly) parts.push("Tak Terjawab: Ya");
    if (search.trim()) parts.push(`Kata kunci: "${search.trim()}"`);
    return parts.length > 0 ? parts.join(" · ") : "Semua log (tidak ada filter aktif)";
  }

  function buildFilename(ext: "csv" | "xlsx") {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const suffix = [
      sourceFilter !== "all" ? sourceFilter : "",
      ratingFilter !== "all" ? ratingFilter : "",
      unansweredOnly ? "unanswered" : "",
    ]
      .filter(Boolean)
      .join("-");
    return `chatbot-logs-${dateStr}${suffix ? `-${suffix}` : ""}`;
  }

  async function handleExport(type: "csv" | "xlsx") {
    setExporting(true);
    try {
      const rows = await fetchAllLogsForExport({ sourceFilter, ratingFilter, unansweredOnly, search });
      const summary = buildFilterSummary();
      const filename = buildFilename(type);
      if (type === "csv") {
        exportCSV(rows, filename);
      } else {
        await exportExcel(rows, filename, summary);
      }
    } catch (err) {
      console.error("Export gagal:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
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
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting || total === 0} className="gap-1.5">
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting ? "Mengekspor…" : "Ekspor"}
                {!exporting && <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Format ekspor
                </p>
                {total > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Semua {total.toLocaleString("id")} log (filter aktif)
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport("xlsx")}
                className="gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Excel (.xlsx)</p>
                  <p className="text-[11px] text-muted-foreground">Berformat, dengan ringkasan statistik</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">CSV (.csv)</p>
                  <p className="text-[11px] text-muted-foreground">Kompatibel dengan semua spreadsheet</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
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

          {/* Active filter summary bar */}
          {(sourceFilter !== "all" || ratingFilter !== "all" || unansweredOnly || search.trim()) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Filter aktif:</span>
              {sourceFilter !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Sumber: {SOURCE_LABELS[sourceFilter] || sourceFilter}
                </Badge>
              )}
              {ratingFilter !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Rating: {ratingFilter === "positive" ? "Positif" : ratingFilter === "negative" ? "Negatif" : "Belum dinilai"}
                </Badge>
              )}
              {unansweredOnly && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                  Tak Terjawab saja
                </Badge>
              )}
              {search.trim() && (
                <Badge variant="secondary" className="text-xs">
                  Kata kunci: "{search.trim()}"
                </Badge>
              )}
              <button
                onClick={() => { setSourceFilter("all"); setRatingFilter("all"); setUnansweredOnly(false); setSearch(""); setPage(0); }}
                className="text-xs text-muted-foreground underline hover:text-foreground ml-auto"
              >
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
              Menampilkan {filtered.length} dari {total.toLocaleString("id")} log
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
