import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share2, Loader2, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const QUIZ_SCORES_KEY = "manasik-quiz-scores";

const QUIZ_TOPICS = [
  { id: "ihram",   emoji: "🤍", title: "Ihram & Niat",    total: 5 },
  { id: "tawaf",   emoji: "🕋", title: "Tawaf",           total: 4 },
  { id: "sai",     emoji: "🏔️", title: "Sa'i",            total: 4 },
  { id: "wukuf",   emoji: "🌄", title: "Wukuf",           total: 5 },
  { id: "jumrah",  emoji: "🪨", title: "Lempar Jumrah",   total: 4 },
  { id: "tahallul",emoji: "✂️", title: "Tahallul",        total: 5 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  customerName: string;
  confirmedCount: number;
  totalCount: number;
  confirmedSessions: { title: string; type: string }[];
}

function getQuizScores(): Record<string, { score: number; total: number }> {
  try {
    const raw = localStorage.getItem(QUIZ_SCORES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getRatingLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "Mumtaz (Sangat Baik)", color: "#10b981" };
  if (pct >= 75) return { label: "Jayyid Jiddan (Baik Sekali)", color: "#3b82f6" };
  if (pct >= 60) return { label: "Jayyid (Baik)", color: "#8b5cf6" };
  if (pct >= 40) return { label: "Maqbul (Cukup)", color: "#f59e0b" };
  return { label: "Baru Mulai", color: "#94a3b8" };
}

// ── The actual card DOM (rendered off-screen for html2canvas) ─────────────────
function ProgressCardDOM({
  cardRef,
  customerName,
  confirmedCount,
  totalCount,
  confirmedSessions,
  quizScores,
  attendancePct,
  rating,
  generatedDate,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  customerName: string;
  confirmedCount: number;
  totalCount: number;
  confirmedSessions: { title: string; type: string }[];
  quizScores: Record<string, { score: number; total: number }>;
  attendancePct: number;
  rating: { label: string; color: string };
  generatedDate: string;
}) {
  const completedTopics = QUIZ_TOPICS.filter(
    (t) => quizScores[t.id] !== undefined
  );
  const avgQuizPct =
    completedTopics.length > 0
      ? Math.round(
          completedTopics.reduce((acc, t) => {
            const s = quizScores[t.id];
            return acc + (s.score / s.total) * 100;
          }, 0) / completedTopics.length
        )
      : null;

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: 480,
        background: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        borderRadius: 20,
        border: "2px solid #d1fae5",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
          padding: "28px 28px 20px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", top: 10, right: 20, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        {/* Bismillah */}
        <p style={{ textAlign: "center", fontSize: 18, fontFamily: "serif", opacity: 0.9, marginBottom: 12, letterSpacing: 1 }}>
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
            V
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Vinstour Travel</p>
            <p style={{ fontSize: 10, opacity: 0.75, margin: 0 }}>Portal Jamaah Digital</p>
          </div>
        </div>

        {/* Title */}
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7, margin: 0, marginBottom: 6 }}>
          Kartu Progress Manasik
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          {customerName || "Jamaah"}
        </h1>
        <p style={{ fontSize: 11, opacity: 0.7, margin: 0, marginTop: 4 }}>
          {generatedDate}
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #f0fdf4" }}>
        {[
          { value: confirmedCount, label: "Sesi Dikonfirmasi" },
          { value: `${attendancePct}%`, label: "Kehadiran" },
          { value: completedTopics.length, label: "Topik Kuis" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "14px 8px",
              textAlign: "center",
              borderRight: i < 2 ? "1px solid #f0fdf4" : "none",
              background: i === 1 ? "#f0fdf4" : "#fff",
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 800, color: "#065f46", margin: 0 }}>{item.value}</p>
            <p style={{ fontSize: 9, color: "#6b7280", margin: 0, marginTop: 2 }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance Progress Bar */}
      <div style={{ padding: "16px 24px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: 0 }}>Progres Kehadiran Manasik</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: rating.color, margin: 0 }}>{rating.label}</p>
        </div>
        <div style={{ height: 10, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(attendancePct, 100)}%`,
              background: "linear-gradient(90deg, #059669, #10b981)",
              borderRadius: 99,
              transition: "width 0.3s",
            }}
          />
        </div>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 4 }}>
          {confirmedCount} dari {totalCount > 0 ? totalCount : "—"} sesi dikonfirmasi
        </p>
      </div>

      {/* Completed Sessions */}
      {confirmedSessions.length > 0 && (
        <div style={{ padding: "0 24px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: 0, marginBottom: 8 }}>
            ✅ Sesi yang Dikonfirmasi
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {confirmedSessions.slice(0, 6).map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: "#f0fdf4",
                  borderRadius: 8,
                  border: "1px solid #d1fae5",
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✓</span>
                </div>
                <p style={{ fontSize: 11, color: "#065f46", margin: 0, fontWeight: 500, flex: 1 }}>
                  {s.title}
                </p>
              </div>
            ))}
            {confirmedSessions.length > 6 && (
              <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, paddingLeft: 6 }}>
                +{confirmedSessions.length - 6} sesi lainnya
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quiz Scores */}
      {completedTopics.length > 0 && (
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: 0 }}>🎯 Skor Kuis Mandiri</p>
            {avgQuizPct !== null && (
              <p style={{ fontSize: 11, fontWeight: 700, color: "#065f46", margin: 0 }}>
                Rata-rata: {avgQuizPct}%
              </p>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {completedTopics.map((topic) => {
              const s = quizScores[topic.id];
              const pct = Math.round((s.score / s.total) * 100);
              const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <div
                  key={topic.id}
                  style={{
                    padding: "8px 10px",
                    background: "#fafafa",
                    borderRadius: 8,
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <p style={{ fontSize: 10, color: "#374151", margin: 0, fontWeight: 600 }}>
                      {topic.emoji} {topic.title}
                    </p>
                    <p style={{ fontSize: 11, color: barColor, fontWeight: 700, margin: 0 }}>{pct}%</p>
                  </div>
                  <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, marginTop: 2 }}>{s.score}/{s.total} benar</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No quiz data */}
      {completedTopics.length === 0 && (
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ padding: "12px", background: "#fafaf9", border: "1px dashed #d1d5db", borderRadius: 10, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
              Belum ada data kuis — selesaikan Kuis Mandiri untuk tampil di sini
            </p>
          </div>
        </div>
      )}

      {/* Motivational Quote */}
      <div
        style={{
          margin: "0 24px 16px",
          padding: "12px 14px",
          background: "linear-gradient(135deg, #fefce8, #fef9c3)",
          border: "1px solid #fde68a",
          borderRadius: 12,
        }}
      >
        <p style={{ fontSize: 13, textAlign: "center", color: "#92400e", fontFamily: "serif", margin: 0 }}>
          ❝ وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ ❞
        </p>
        <p style={{ fontSize: 9, textAlign: "center", color: "#a16207", margin: 0, marginTop: 4 }}>
          "Dan sempurnakanlah haji dan umrah karena Allah." — QS. Al-Baqarah: 196
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#f9fafb",
          borderTop: "1px solid #f3f4f6",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>
          Vinstour Travel — Perjalanan Ibadah Terpercaya
        </p>
        <div style={{ display: "flex", gap: 2 }}>
          {["⭐", "⭐", "⭐", "⭐", "⭐"].map((s, i) => (
            <span key={i} style={{ fontSize: 8 }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export function ManasikProgressCard({ open, onClose, customerName, confirmedCount, totalCount, confirmedSessions }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const quizScores = getQuizScores();
  const attendancePct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
  const rating = getRatingLabel(attendancePct);
  const generatedDate = format(new Date(), "d MMMM yyyy, HH:mm", { locale: localeId });

  const generateCard = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 480,
        height: cardRef.current.scrollHeight,
      });
      const url = canvas.toDataURL("image/png");
      setPreviewUrl(url);
    } catch (err) {
      toast.error("Gagal menghasilkan kartu. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }, []);

  // Generate preview when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && !previewUrl) {
        // Give DOM time to render off-screen card, then generate
        setTimeout(generateCard, 150);
      }
      if (!isOpen) {
        onClose();
        setPreviewUrl(null);
      }
    },
    [previewUrl, generateCard, onClose]
  );

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `progress-manasik-${customerName.toLowerCase().replace(/\s+/g, "-") || "jamaah"}.png`;
    link.click();
    toast.success("Kartu progress berhasil diunduh! 🎉");
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    if (navigator.share) {
      try {
        const blob = await (await fetch(previewUrl)).blob();
        const file = new File([blob], "progress-manasik.png", { type: "image/png" });
        await navigator.share({
          title: "Progress Manasik Saya — Vinstour Travel",
          text: `Alhamdulillah, progres manasik saya telah mencapai ${attendancePct}% kehadiran. Semoga menjadi ibadah yang mabrur! 🕋`,
          files: [file],
        });
      } catch {
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  const handleRegenerate = () => {
    setPreviewUrl(null);
    setTimeout(generateCard, 100);
  };

  return (
    <>
      {/* Off-screen card for html2canvas */}
      <ProgressCardDOM
        cardRef={cardRef}
        customerName={customerName}
        confirmedCount={confirmedCount}
        totalCount={totalCount}
        confirmedSessions={confirmedSessions}
        quizScores={quizScores}
        attendancePct={attendancePct}
        rating={rating}
        generatedDate={generatedDate}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-300" />
                Kartu Progress Manasik
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs">
                Bagikan pencapaian manasik Anda kepada keluarga dan teman
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: confirmedCount, label: "Sesi Hadir" },
                { value: `${attendancePct}%`, label: "Kehadiran" },
                { value: Object.keys(quizScores).length, label: "Topik Kuis" },
              ].map((s, i) => (
                <div key={i} className="bg-muted rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-emerald-700">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Preview area */}
            <div className="relative rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/30" style={{ minHeight: 220 }}>
              {generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <p className="text-xs text-muted-foreground">Membuat kartu progress…</p>
                </div>
              )}
              {previewUrl && !generating ? (
                <img
                  src={previewUrl}
                  alt="Kartu Progress Manasik"
                  className="w-full rounded-xl"
                  style={{ display: "block" }}
                />
              ) : !generating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Kartu sedang disiapkan…</p>
                </div>
              ) : null}
            </div>

            {/* Rating badge */}
            {!generating && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium" style={{ color: rating.color }}>
                    {rating.label}
                  </span>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Perbarui kartu
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={!previewUrl || generating}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Unduh
              </Button>
              <Button
                className="flex-1 bg-emerald-700 hover:bg-emerald-800"
                onClick={handleShare}
                disabled={!previewUrl || generating}
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Bagikan
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              Gambar PNG beresolusi tinggi siap dibagikan ke WhatsApp, Instagram, dll.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
