import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  HelpCircle, RefreshCcw, Plus, Loader2, CheckCircle2,
  Clock, TrendingUp, AlertTriangle, Lightbulb, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UnansweredEntry {
  normalized: string;
  display: string;
  count: number;
  lastSeen: string;
  logIds: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = ["Umum", "Pendaftaran", "Dokumen", "Visa", "Paket", "Pembayaran", "Pembatalan", "Lainnya"];

function normalizeQ(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 100);
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale });
  } catch {
    return "—";
  }
}

// ─── Quick-create FAQ dialog ──────────────────────────────────────────────────
interface CreateFAQDialogProps {
  open: boolean;
  initialQuestion: string;
  onClose: () => void;
  onCreated: (question: string) => void;
}

function CreateFAQDialog({ open, initialQuestion, onClose, onCreated }: CreateFAQDialogProps) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("Umum");
  const [isPublished, setIsPublished] = useState(true);

  const reset = useCallback((q: string) => {
    setQuestion(q);
    setAnswer("");
    setCategory("Umum");
    setIsPublished(true);
  }, []);

  const prevOpenRef = { current: false };
  if (open && !prevOpenRef.current) reset(initialQuestion);
  prevOpenRef.current = open;

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (!question.trim() || !answer.trim()) throw new Error("Pertanyaan dan jawaban wajib diisi.");
      const res = await fetch("/api/v1/chatbot/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          category,
          is_published: isPublished,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan FAQ");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unanswered-questions"] });
      toast.success("FAQ berhasil ditambahkan dan langsung aktif sebagai knowledge base chatbot.", {
        description: "Chatbot akan menggunakan FAQ baru ini pada percakapan berikutnya.",
      });
      onCreated(question.trim());
      onClose();
    },
    onError: (err: any) => toast.error(`Gagal menyimpan: ${err.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Buat FAQ dari Pertanyaan Tak Terjawab
          </DialogTitle>
          <DialogDescription>
            Tambahkan jawaban untuk pertanyaan ini agar chatbot bisa menjawabnya di percakapan berikutnya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="faq-question">Pertanyaan <span className="text-destructive">*</span></Label>
            <Input
              id="faq-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Tulis pertanyaan…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-answer">
              Jawaban <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="faq-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Tulis jawaban lengkap untuk pertanyaan ini. Gunakan **teks tebal** untuk penekanan."
              rows={5}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Mendukung Markdown sederhana: **tebal**, _miring_, poin (- item)
            </p>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAQ_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-right">
              <Label className="block">Langsung publish</Label>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
            Cache FAQ akan otomatis diperbarui. Chatbot akan menggunakan FAQ baru ini pada percakapan berikutnya (maks. 60 detik).
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button onClick={() => save()} disabled={isPending || !question.trim() || !answer.trim()} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan FAQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bar mini ─────────────────────────────────────────────────────────────────
function BarMini({ value, max, color = "bg-amber-400" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(Math.round((value / max) * 100), value > 0 ? 3 : 0) : 0;
  return (
    <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden flex-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
type DayRange = 7 | 14 | 30 | 90;

export function UnansweredQuestionsWidget() {
  const [range, setRange] = useState<DayRange>(30);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [createdFAQs, setCreatedFAQs] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery<{ entries: UnansweredEntry[]; range: number }>({
    queryKey: ["unanswered-questions", range],
    queryFn: async () => {
      const res = await fetch(`/api/v1/chatbot/unanswered?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch unanswered questions");
      return res.json();
    },
    staleTime: 60_000,
  });

  const entries = data?.entries || [];
  const maxCount = Math.max(...entries.map((e) => e.count), 1);
  const totalUnanswered = entries.reduce((s, e) => s + e.count, 0);

  function openCreateFAQ(question: string) {
    setSelectedQuestion(question);
    setDialogOpen(true);
  }

  function handleFAQCreated(question: string) {
    setCreatedFAQs((prev) => new Set([...prev, normalizeQ(question)]));
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-500" />
                Pertanyaan Tak Terjawab Teratas
                {totalUnanswered > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold ml-1">
                    {totalUnanswered} total
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Pertanyaan yang paling sering gagal dijawab AI — jadikan FAQ untuk meningkatkan kualitas chatbot
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border bg-background overflow-hidden">
                {([7, 14, 30, 90] as DayRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`text-xs px-2.5 py-1 transition-colors ${
                      range === r
                        ? "bg-amber-500 text-white font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}h
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1 h-8"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-300 mb-2" />
              <p className="font-medium text-sm">Tidak ada pertanyaan tak terjawab</p>
              <p className="text-xs mt-1">dalam {range} hari terakhir — chatbot berfungsi baik!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry, i) => {
                const alreadyFAQ = createdFAQs.has(entry.normalized);
                const isTop3 = i < 3;
                return (
                  <div
                    key={entry.normalized}
                    className={`group rounded-lg border px-3 py-2.5 transition-colors ${
                      alreadyFAQ
                        ? "bg-green-50 border-green-200 opacity-70"
                        : isTop3
                        ? "bg-white border-amber-200 shadow-sm"
                        : "bg-white border-border hover:border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                          i === 0 ? "bg-amber-400 text-white"
                          : i === 1 ? "bg-amber-300 text-white"
                          : i === 2 ? "bg-amber-200 text-amber-800"
                          : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">
                          {entry.display}
                        </p>
                        <div className="flex items-center gap-3">
                          <BarMini
                            value={entry.count}
                            max={maxCount}
                            color={alreadyFAQ ? "bg-green-400" : "bg-amber-400"}
                          />
                          <span className="text-xs font-semibold text-amber-700 shrink-0 tabular-nums">
                            {entry.count}×
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Terakhir {relativeTime(entry.lastSeen)}</span>
                          {entry.count > 1 && (
                            <>
                              <span className="opacity-40">·</span>
                              <TrendingUp className="h-3 w-3 text-amber-500" />
                              <span className="text-amber-600 font-medium">
                                ditanya {entry.count}× dalam {range} hari
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {alreadyFAQ ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full border border-green-200">
                            <CheckCircle2 className="h-3.5 w-3.5" /> FAQ dibuat
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCreateFAQ(entry.display)}
                            className="h-7 px-2.5 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Buat FAQ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-3 mt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Hover baris untuk muncul tombol "Buat FAQ"
                </p>
                <Link
                  to="/admin/chat-logs"
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                >
                  Lihat semua di Log <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateFAQDialog
        open={dialogOpen}
        initialQuestion={selectedQuestion}
        onClose={() => setDialogOpen(false)}
        onCreated={handleFAQCreated}
      />
    </>
  );
}
