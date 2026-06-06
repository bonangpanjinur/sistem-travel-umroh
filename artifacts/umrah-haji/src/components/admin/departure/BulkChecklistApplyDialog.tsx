import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
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
  CheckCircle2,
  RotateCcw,
  Layers,
  AlertTriangle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { key: "passport_valid",   label: "Passport Berlaku > 6 Bulan",     icon: FileText,      category: "Dokumen" },
  { key: "photo_submitted",  label: "Foto 4×6 Diserahkan",            icon: FileText,      category: "Dokumen" },
  { key: "ktp_submitted",    label: "KTP / Akta Lahir Diserahkan",    icon: FileText,      category: "Dokumen" },
  { key: "mahram_doc",       label: "Dokumen Mahram / Buku Nikah",    icon: BookOpen,      category: "Dokumen" },
  { key: "visa_processed",   label: "Visa Saudi Diproses / Terbit",   icon: ShieldCheck,   category: "Visa & Kesehatan" },
  { key: "meningitis_cert",  label: "Sertifikat Vaksin Meningitis",   icon: Heart,         category: "Visa & Kesehatan" },
  { key: "payment_settled",  label: "Pelunasan Biaya Selesai",        icon: CreditCard,    category: "Keuangan" },
  { key: "manasik_done",     label: "Manasik Umroh / Haji Selesai",  icon: ClipboardList, category: "Persiapan" },
  { key: "luggage_tagged",   label: "Koper Sudah Diberi Label / Tag", icon: Luggage,       category: "Persiapan" },
  { key: "briefing_done",    label: "Briefing Keberangkatan Selesai", icon: AlarmClock,    category: "Persiapan" },
  { key: "ihram_ready",      label: "Perlengkapan Ihram Siap",        icon: Package,       category: "Persiapan" },
  { key: "ticket_received",  label: "Tiket Pesawat Diterima",         icon: Plane,         category: "Perjalanan" },
] as const;

type ChecklistKey = typeof CHECKLIST_ITEMS[number]["key"];

const CATEGORY_COLOR: Record<string, string> = {
  "Dokumen":         "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "Visa & Kesehatan":"bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  "Keuangan":        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "Persiapan":       "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "Perjalanan":      "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

type ApplyMode = "merge" | "reset";

interface BulkChecklistApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departureId: string;
  departureName?: string;
  departureDate?: string;
}

export function BulkChecklistApplyDialog({
  open,
  onOpenChange,
  departureId,
  departureName,
  departureDate,
}: BulkChecklistApplyDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<ChecklistKey>>(new Set());
  const [mode, setMode] = useState<ApplyMode>("merge");
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [resultSummary, setResultSummary] = useState<{ ok: number; failed: number } | null>(null);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["departure-booking-ids", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, booking_status, total_pax")
        .eq("departure_id", departureId)
        .neq("booking_status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!departureId,
  });

  const allKeys = CHECKLIST_ITEMS.map((i) => i.key) as ChecklistKey[];

  const toggleKey = (key: ChecklistKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(allKeys));
  const selectNone = () => setSelectedKeys(new Set());

  const categorized = CHECKLIST_ITEMS.reduce<Record<string, typeof CHECKLIST_ITEMS[number][]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  const handleApply = useCallback(async () => {
    if (selectedKeys.size === 0) {
      toast.warning("Pilih minimal satu item untuk diterapkan");
      return;
    }
    if (bookings.length === 0) {
      toast.warning("Tidak ada booking aktif di keberangkatan ini");
      return;
    }

    setApplying(true);
    setResultSummary(null);
    setDoneCount(0);
    setTotalCount(bookings.length);
    setProgress(0);

    const now = new Date().toISOString();
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      try {
        if (mode === "reset") {
          const freshItems: Record<string, any> = {};
          allKeys.forEach((key) => {
            freshItems[key] = {
              checked: selectedKeys.has(key),
              checked_at: selectedKeys.has(key) ? now : null,
              note: "",
            };
          });
          const { error } = await (supabase as any)
            .from("booking_departure_checklists")
            .upsert(
              { booking_id: booking.id, items: freshItems, updated_at: now },
              { onConflict: "booking_id" }
            );
          if (error) throw error;
        } else {
          const { data: existing } = await (supabase as any)
            .from("booking_departure_checklists")
            .select("items")
            .eq("booking_id", booking.id)
            .maybeSingle();

          const existingItems: Record<string, any> = existing?.items || {};
          const merged: Record<string, any> = { ...existingItems };

          selectedKeys.forEach((key) => {
            if (!merged[key]?.checked) {
              merged[key] = {
                checked: true,
                checked_at: now,
                note: merged[key]?.note || "",
              };
            }
          });

          const { error } = await (supabase as any)
            .from("booking_departure_checklists")
            .upsert(
              { booking_id: booking.id, items: merged, updated_at: now },
              { onConflict: "booking_id" }
            );
          if (error) throw error;
        }

        ok++;
      } catch (err: any) {
        console.error(`Checklist failed for booking ${booking.booking_code}:`, err);
        failed++;
      }

      const completed = i + 1;
      setDoneCount(completed);
      setProgress(Math.round((completed / bookings.length) * 100));
    }

    setApplying(false);
    setResultSummary({ ok, failed });

    if (failed === 0) {
      toast.success(`Checklist diterapkan ke ${ok} booking`);
    } else {
      toast.warning(`${ok} booking berhasil, ${failed} gagal`);
    }
  }, [bookings, selectedKeys, mode, allKeys]);

  const handleClose = () => {
    if (applying) return;
    setResultSummary(null);
    setProgress(0);
    setDoneCount(0);
    setTotalCount(0);
    onOpenChange(false);
  };

  const handleReset = () => {
    setResultSummary(null);
    setSelectedKeys(new Set());
    setMode("merge");
    setProgress(0);
    setDoneCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Terapkan Checklist ke Semua Booking
          </DialogTitle>
          <DialogDescription className="text-xs">
            {departureName && <span className="font-semibold">{departureName}</span>}
            {departureName && departureDate && " · "}
            {departureDate && <span>{departureDate}</span>}
          </DialogDescription>
        </DialogHeader>

        {/* Result state */}
        {resultSummary ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              resultSummary.failed === 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
            )}>
              {resultSummary.failed === 0
                ? <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                : <AlertTriangle className="h-8 w-8 text-amber-600" />
              }
            </div>
            <div className="text-center">
              <p className="font-bold text-base">
                {resultSummary.failed === 0 ? "Selesai!" : "Sebagian Berhasil"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {resultSummary.ok} booking berhasil diperbarui
                {resultSummary.failed > 0 && ` · ${resultSummary.failed} gagal`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Terapkan Lagi
              </Button>
              <Button size="sm" onClick={handleClose}>Tutup</Button>
            </div>
          </div>
        ) : applying ? (
          /* Applying progress state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center w-full px-4">
              <p className="font-bold text-sm mb-1">Menerapkan checklist...</p>
              <p className="text-xs text-muted-foreground mb-3">
                {doneCount} / {totalCount} booking selesai
              </p>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        ) : (
          /* Selection state */
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
            {/* Booking count info */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {bookingsLoading ? (
                  <span>Memuat booking...</span>
                ) : (
                  <span>
                    <span className="font-bold text-foreground">{bookings.length}</span> booking aktif akan diperbarui
                  </span>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">
                {selectedKeys.size}/{allKeys.length} dipilih
              </Badge>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-all",
                  mode === "merge"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <p className="text-xs font-bold">Tambahkan Item Dipilih</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Hanya centang item yang dipilih. Item yang sudah tercentang tidak tersentuh.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("reset")}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-all",
                  mode === "reset"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-destructive/40"
                )}
              >
                <p className="text-xs font-bold text-destructive">Reset & Terapkan</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  Hapus semua centang lama, lalu centang item yang dipilih dari awal.
                </p>
              </button>
            </div>

            {mode === "reset" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Mode reset akan <span className="font-bold">menghapus semua progress checklist</span> yang sudah ada di {bookings.length} booking sebelum menerapkan template baru.
                </p>
              </div>
            )}

            <Separator />

            {/* Item selection */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Item Template</p>
              <div className="flex gap-2">
                <button className="text-[11px] text-primary hover:underline" onClick={selectAll}>Pilih Semua</button>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button className="text-[11px] text-muted-foreground hover:text-foreground hover:underline" onClick={selectNone}>Hapus Pilihan</button>
              </div>
            </div>

            {Object.entries(categorized).map(([cat, items]) => (
              <div key={cat}>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5 px-2 py-0.5 rounded-full w-fit", CATEGORY_COLOR[cat] || "bg-muted text-muted-foreground")}>
                  {cat}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedKeys.has(item.key as ChecklistKey);
                    return (
                      <label
                        key={item.key}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all select-none",
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-muted/40"
                        )}
                      >
                        <Checkbox
                          id={`bulk-item-${item.key}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleKey(item.key as ChecklistKey)}
                          className="shrink-0"
                        />
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-xs flex-1", isSelected ? "font-semibold" : "")}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!resultSummary && !applying && (
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={selectedKeys.size === 0 || bookings.length === 0 || bookingsLoading}
              variant={mode === "reset" ? "destructive" : "default"}
            >
              {mode === "reset" ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset & Terapkan ke {bookings.length} Booking
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Terapkan ke {bookings.length} Booking
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
