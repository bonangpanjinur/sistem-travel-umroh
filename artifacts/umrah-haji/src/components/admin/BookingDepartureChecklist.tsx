import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  FileText,
  Plane,
  CreditCard,
  ShieldCheck,
  Heart,
  BookOpen,
  Package,
  ClipboardList,
  Luggage,
  AlarmClock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingDepartureChecklistProps {
  bookingId: string;
  bookingCode?: string;
  passengerCount?: number;
}

const CHECKLIST_ITEMS = [
  {
    key: "passport_valid",
    label: "Passport Berlaku > 6 Bulan",
    icon: FileText,
    category: "Dokumen",
    hint: "Semua jamaah wajib punya passport berlaku minimal 6 bulan sejak tanggal kepulangan",
  },
  {
    key: "photo_submitted",
    label: "Foto 4×6 Diserahkan",
    icon: FileText,
    category: "Dokumen",
    hint: "Foto latar putih 4×6 untuk setiap jamaah (min. 3 lembar)",
  },
  {
    key: "ktp_submitted",
    label: "KTP / Akta Lahir Diserahkan",
    icon: FileText,
    category: "Dokumen",
    hint: "Fotokopi KTP semua jamaah. Anak di bawah umur: akta lahir",
  },
  {
    key: "mahram_doc",
    label: "Dokumen Mahram / Buku Nikah",
    icon: BookOpen,
    category: "Dokumen",
    hint: "Wajib untuk wanita yang berangkat dengan mahram. Sertakan buku nikah / akta lahir sesuai hubungan",
  },
  {
    key: "visa_processed",
    label: "Visa Saudi Diproses / Terbit",
    icon: ShieldCheck,
    category: "Visa & Kesehatan",
    hint: "Proses pengajuan visa sudah dimulai atau visa sudah terbit",
  },
  {
    key: "meningitis_cert",
    label: "Sertifikat Vaksin Meningitis",
    icon: Heart,
    category: "Visa & Kesehatan",
    hint: "Kartu kuning / sertifikat internasional vaksinasi meningitis untuk semua jamaah",
  },
  {
    key: "payment_settled",
    label: "Pelunasan Biaya Selesai",
    icon: CreditCard,
    category: "Keuangan",
    hint: "Seluruh tagihan paket sudah lunas sebelum keberangkatan",
  },
  {
    key: "manasik_done",
    label: "Manasik Umroh / Haji Selesai",
    icon: ClipboardList,
    category: "Persiapan",
    hint: "Jamaah sudah mengikuti sesi bimbingan manasik yang dijadwalkan",
  },
  {
    key: "luggage_tagged",
    label: "Koper Sudah Diberi Label / Tag",
    icon: Luggage,
    category: "Persiapan",
    hint: "Tag nama, nomor booking, dan kode warna grup sudah ditempel di semua koper",
  },
  {
    key: "briefing_done",
    label: "Briefing Keberangkatan Selesai",
    icon: AlarmClock,
    category: "Persiapan",
    hint: "Informasi jadwal, titik kumpul, dan panduan perjalanan sudah disampaikan ke jamaah",
  },
  {
    key: "ihram_ready",
    label: "Perlengkapan Ihram Siap",
    icon: Package,
    category: "Persiapan",
    hint: "Kain ihram, mukena, perlengkapan shalat sudah dibawa / didistribusikan",
  },
  {
    key: "ticket_received",
    label: "Tiket Pesawat Diterima",
    icon: Plane,
    category: "Perjalanan",
    hint: "Tiket e-ticket atau fisik sudah diberikan ke jamaah / grup",
  },
] as const;

type ChecklistKey = typeof CHECKLIST_ITEMS[number]["key"];

const CATEGORY_ORDER = ["Dokumen", "Visa & Kesehatan", "Keuangan", "Persiapan", "Perjalanan"];

const CATEGORY_COLOR: Record<string, { badge: string; bg: string; border: string }> = {
  "Dokumen":         { badge: "bg-blue-100 text-blue-700",   bg: "bg-blue-50/40 dark:bg-blue-950/20",   border: "border-blue-200/60 dark:border-blue-800/40" },
  "Visa & Kesehatan":{ badge: "bg-red-100 text-red-700",     bg: "bg-red-50/40 dark:bg-red-950/20",     border: "border-red-200/60 dark:border-red-800/40" },
  "Keuangan":        { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50/40 dark:bg-emerald-950/20", border: "border-emerald-200/60 dark:border-emerald-800/40" },
  "Persiapan":       { badge: "bg-amber-100 text-amber-700", bg: "bg-amber-50/40 dark:bg-amber-950/20", border: "border-amber-200/60 dark:border-amber-800/40" },
  "Perjalanan":      { badge: "bg-purple-100 text-purple-700", bg: "bg-purple-50/40 dark:bg-purple-950/20", border: "border-purple-200/60 dark:border-purple-800/40" },
};

export function BookingDepartureChecklist({
  bookingId,
  bookingCode,
  passengerCount,
}: BookingDepartureChecklistProps) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const { data: checklist = {}, isLoading } = useQuery({
    queryKey: ["booking-departure-checklist", bookingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booking_departure_checklists")
        .select("items")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        if (error.code === "42P01") return {};
        console.warn("Checklist table not found:", error.message);
        return {};
      }
      return (data?.items || {}) as Record<string, { checked: boolean; checked_at: string | null; note?: string }>;
    },
    enabled: !!bookingId,
  });

  const saveMutation = useMutation({
    mutationFn: async (newItems: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("booking_departure_checklists")
        .upsert(
          { booking_id: bookingId, items: newItems, updated_at: new Date().toISOString() },
          { onConflict: "booking_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-departure-checklist", bookingId] });
    },
    onError: (err: any) => toast.error("Gagal simpan: " + err.message),
  });

  const toggleItem = (key: string) => {
    const current = (checklist as any)[key]?.checked || false;
    const updated = {
      ...checklist,
      [key]: {
        checked: !current,
        checked_at: !current ? new Date().toISOString() : null,
        note: (checklist as any)[key]?.note || "",
      },
    };
    saveMutation.mutate(updated);
  };

  const saveNote = (key: string) => {
    const updated = {
      ...checklist,
      [key]: {
        ...(checklist as any)[key],
        note: notes[key] ?? (checklist as any)[key]?.note ?? "",
      },
    };
    saveMutation.mutate(updated);
    setEditingNote(null);
  };

  const totalItems = CHECKLIST_ITEMS.length;
  const doneItems = CHECKLIST_ITEMS.filter((item) => !!(checklist as any)[item.key]?.checked).length;
  const progress = Math.round((doneItems / totalItems) * 100);

  const grouped = useMemo(() => {
    const g: Record<string, typeof CHECKLIST_ITEMS[number][]> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      if (!g[item.category]) g[item.category] = [];
      g[item.category].push(item);
    });
    return g;
  }, []);

  const progressColor =
    progress === 100 ? "text-emerald-700" : progress >= 70 ? "text-amber-700" : progress >= 30 ? "text-blue-700" : "text-red-600";
  const borderColor =
    progress === 100 ? "border-emerald-400" : progress >= 70 ? "border-amber-400" : "border-slate-200";

  return (
    <Card className={cn("border-2 overflow-hidden", borderColor)}>
      {/* Header */}
      <div
        className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-slate-600" />
          <div>
            <h3 className="font-bold text-sm text-foreground">Checklist Keberangkatan</h3>
            {bookingCode && (
              <p className="text-[11px] text-muted-foreground font-mono">{bookingCode}{passengerCount ? ` · ${passengerCount} jamaah` : ""}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={cn("text-lg font-black leading-none", progressColor)}>{progress}%</p>
            <p className="text-[10px] text-muted-foreground">{doneItems}/{totalItems}</p>
          </div>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Progress bar — always visible */}
      <Progress
        value={progress}
        className={cn(
          "h-1.5 rounded-none",
          progress === 100 ? "[&>div]:bg-emerald-500" : progress >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-500"
        )}
      />

      {/* Collapsible body */}
      {!collapsed && (
        <CardContent className="p-4 space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => {
              const items = grouped[cat];
              const catDone = items.filter((i) => !!(checklist as any)[i.key]?.checked).length;
              const color = CATEGORY_COLOR[cat]?.badge || "bg-muted text-muted-foreground";
              return (
                <Badge key={cat} className={cn("text-[10px] font-semibold", color)}>
                  {cat}: {catDone}/{items.length}
                </Badge>
              );
            })}
          </div>

          {/* Checklist items by category */}
          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => {
            const catStyle = CATEGORY_COLOR[cat] || { badge: "bg-muted text-muted-foreground", bg: "bg-muted/20", border: "border-border" };
            return (
              <div key={cat}>
                <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-2 px-2 py-0.5 rounded-full w-fit", catStyle.badge)}>
                  {cat}
                </p>
                <div className="space-y-1.5">
                  {grouped[cat].map((item) => {
                    const isChecked = !!(checklist as any)[item.key]?.checked;
                    const checkedAt = (checklist as any)[item.key]?.checked_at;
                    const existingNote = (checklist as any)[item.key]?.note || "";
                    const isEditing = editingNote === item.key;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "rounded-xl border p-3 transition-all",
                          isChecked
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                            : `${catStyle.bg} ${catStyle.border}`
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleItem(item.key)}
                            disabled={saveMutation.isPending}
                            className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity"
                            title={isChecked ? "Klik untuk batalkan" : "Klik untuk tandai selesai"}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={cn("text-xs font-semibold", isChecked && "line-through opacity-60")}>
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.hint}</p>
                                {isChecked && checkedAt && (
                                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    ✓ {new Date(checkedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                )}
                              </div>
                              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", isChecked ? "text-emerald-600" : "text-muted-foreground/50")} />
                            </div>

                            {/* Note */}
                            {existingNote && !isEditing && (
                              <div
                                className="mt-1.5 text-[10px] text-muted-foreground bg-white/60 dark:bg-black/10 rounded px-2 py-1 cursor-pointer hover:bg-white dark:hover:bg-black/20 border border-transparent hover:border-border transition-all"
                                onClick={() => { setEditingNote(item.key); setNotes((n) => ({ ...n, [item.key]: existingNote })); }}
                              >
                                📝 {existingNote}
                              </div>
                            )}

                            {isEditing ? (
                              <div className="mt-2 space-y-1.5">
                                <Textarea
                                  className="text-xs min-h-[52px] resize-none"
                                  placeholder="Tambah catatan..."
                                  value={notes[item.key] ?? existingNote}
                                  onChange={(e) => setNotes((n) => ({ ...n, [item.key]: e.target.value }))}
                                  autoFocus
                                />
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="h-6 text-[11px] px-2" onClick={() => saveNote(item.key)} disabled={saveMutation.isPending}>
                                    Simpan
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setEditingNote(null)}>
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              !existingNote && (
                                <button
                                  className="mt-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                  onClick={() => { setEditingNote(item.key); setNotes((n) => ({ ...n, [item.key]: "" })); }}
                                >
                                  + catatan
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* SQL Setup Note */}
          <details className="text-[10px] text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground font-semibold">Setup database (jika checklist belum tersimpan)</summary>
            <pre className="mt-2 bg-muted/40 rounded-lg p-2.5 font-mono text-[10px] overflow-auto whitespace-pre-wrap border">
{`CREATE TABLE IF NOT EXISTS booking_departure_checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  items jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id)
);
ALTER TABLE booking_departure_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_manage_booking_checklists"
  ON booking_departure_checklists FOR ALL
  USING (auth.uid() IS NOT NULL);`}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  );
}
