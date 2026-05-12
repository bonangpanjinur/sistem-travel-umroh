import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Circle, AlertCircle, RefreshCw,
  FileText, Hotel, Bus, Plane, Users, CreditCard,
  ShieldCheck, ClipboardList, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface Props {
  departureId: string;
  departure: any;
  passengerStats: { total: number; confirmed: number; paid: number };
  passengers: any[];
}

const CHECKLIST_ITEMS = [
  { key: "visa_issued",         label: "Visa Seluruh Jamaah Terbit",       icon: ShieldCheck, category: "Dokumen",    hint: "Cek tracker visa jamaah" },
  { key: "documents_complete",  label: "Dokumen Jamaah Lengkap & Terverifikasi", icon: FileText, category: "Dokumen",  hint: "KTP, Passport, Foto semua sudah terverifikasi" },
  { key: "ticket_printed",      label: "Tiket Pesawat Tercetak",           icon: Plane,      category: "Transportasi", hint: "Tiket fisik/digital sudah siap" },
  { key: "bus_ready",           label: "Bus/Transportasi Siap",            icon: Bus,        category: "Transportasi", hint: "Bus sudah dikonfirmasi vendor" },
  { key: "hotel_makkah_confirmed", label: "Hotel Makkah Dikonfirmasi",    icon: Hotel,      category: "Akomodasi",   hint: "Nomor kamar dan check-in sudah pasti" },
  { key: "hotel_madinah_confirmed", label: "Hotel Madinah Dikonfirmasi",  icon: Hotel,      category: "Akomodasi",   hint: "Nomor kamar dan check-in sudah pasti" },
  { key: "booking_confirmed",   label: "Semua Booking Confirmed",          icon: Users,      category: "Booking",     hint: "Tidak ada booking yang masih pending" },
  { key: "payment_settled",     label: "Pembayaran Semua Jamaah Lunas",   icon: CreditCard, category: "Keuangan",    hint: "Tidak ada piutang yang belum terbayar" },
  { key: "manifest_distributed", label: "Manifest Dibagikan ke Muthawif", icon: ClipboardList, category: "Operasional", hint: "File manifest sudah dikirim ke tim" },
  { key: "equipment_ready",     label: "Perlengkapan Jamaah Siap",         icon: CheckCircle2, category: "Operasional", hint: "Koper tag, seragam, gelang sudah didistribusikan" },
] as const;

type ChecklistKey = typeof CHECKLIST_ITEMS[number]["key"];

const CATEGORY_COLOR: Record<string, string> = {
  Dokumen: "bg-blue-100 text-blue-700",
  Transportasi: "bg-orange-100 text-orange-700",
  Akomodasi: "bg-green-100 text-green-700",
  Booking: "bg-purple-100 text-purple-700",
  Keuangan: "bg-yellow-100 text-yellow-700",
  Operasional: "bg-gray-100 text-gray-700",
};

export function DeparturePreChecklist({ departureId, departure, passengerStats, passengers }: Props) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const { data: checklist = {}, isLoading } = useQuery({
    queryKey: ["departure-checklist", departureId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("departure_checklists")
        .select("*")
        .eq("departure_id", departureId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        if (error.code === "42P01") return {};
        throw error;
      }
      return data?.items || {};
    },
    enabled: !!departureId,
  });

  const saveMutation = useMutation({
    mutationFn: async (newItems: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("departure_checklists")
        .upsert({
          departure_id: departureId,
          items: newItems,
          updated_at: new Date().toISOString(),
        }, { onConflict: "departure_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-checklist", departureId] });
    },
    onError: (err: any) => toast.error("Gagal simpan: " + err.message),
  });

  const autoChecked = useMemo(() => {
    const result: Record<string, boolean> = {};
    if (departure) {
      if (departure.hotel_makkah?.id) result.hotel_makkah_confirmed = true;
      if (departure.hotel_madinah?.id) result.hotel_madinah_confirmed = true;
    }
    if (passengerStats) {
      if (passengerStats.confirmed >= passengerStats.total && passengerStats.total > 0)
        result.booking_confirmed = true;
    }
    return result;
  }, [departure, passengerStats]);

  const getItemState = (key: string): "checked" | "auto" | "unchecked" => {
    if (checklist[key]?.checked) return "checked";
    if (autoChecked[key]) return "auto";
    return "unchecked";
  };

  const toggleItem = (key: string) => {
    const current = checklist[key]?.checked || false;
    const updated = {
      ...checklist,
      [key]: {
        checked: !current,
        checked_at: !current ? new Date().toISOString() : null,
        note: checklist[key]?.note || "",
      },
    };
    saveMutation.mutate(updated);
  };

  const saveNote = (key: string) => {
    const updated = {
      ...checklist,
      [key]: {
        ...checklist[key],
        note: notes[key] ?? checklist[key]?.note ?? "",
      },
    };
    saveMutation.mutate(updated);
    setEditingNote(null);
  };

  const totalItems = CHECKLIST_ITEMS.length;
  const doneItems = CHECKLIST_ITEMS.filter(
    (item) => getItemState(item.key) === "checked" || getItemState(item.key) === "auto"
  ).length;
  const progress = Math.round((doneItems / totalItems) * 100);

  const grouped = useMemo(() => {
    const g: Record<string, typeof CHECKLIST_ITEMS[number][]> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      if (!g[item.category]) g[item.category] = [];
      g[item.category].push(item);
    });
    return g;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <Card className={cn(
        "border-2",
        progress === 100 ? "border-green-400 bg-green-50" : progress >= 70 ? "border-yellow-400 bg-yellow-50" : "border-red-200"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">Kesiapan Keberangkatan</p>
              <p className="text-xs text-muted-foreground">
                {departure?.departure_date ? formatDate(departure.departure_date) : "-"} · {departure?.package?.name || "-"}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-2xl font-bold", progress === 100 ? "text-green-700" : progress >= 70 ? "text-yellow-700" : "text-red-600")}>
                {progress}%
              </p>
              <p className="text-xs text-muted-foreground">{doneItems}/{totalItems} selesai</p>
            </div>
          </div>
          <Progress value={progress} className={cn("h-3", progress === 100 ? "[&>div]:bg-green-500" : progress >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500")} />
          {progress === 100 && (
            <p className="mt-2 text-xs font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Semua checklist selesai! Keberangkatan siap.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", CATEGORY_COLOR[category])}>
                {category}
              </span>
              <span className="text-muted-foreground font-normal text-xs">
                {items.filter(i => getItemState(i.key) !== "unchecked").length}/{items.length} selesai
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {items.map((item) => {
              const state = getItemState(item.key);
              const Icon = item.icon;
              const isEditing = editingNote === item.key;
              const existingNote = checklist[item.key]?.note || "";

              return (
                <div key={item.key} className={cn(
                  "rounded-xl border p-3 transition-all",
                  state === "checked" ? "bg-green-50 border-green-200" :
                  state === "auto" ? "bg-blue-50 border-blue-200" :
                  "bg-white border-border"
                )}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => state !== "auto" && toggleItem(item.key)}
                      disabled={state === "auto" || saveMutation.isPending}
                      className={cn(
                        "mt-0.5 shrink-0 transition-colors",
                        state === "auto" ? "cursor-default" : "cursor-pointer hover:opacity-70"
                      )}
                    >
                      {state === "checked" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : state === "auto" ? (
                        <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            state !== "unchecked" && "line-through opacity-70"
                          )}>
                            {item.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{item.hint}</p>
                          {state === "auto" && (
                            <Badge className="mt-1 text-[10px] bg-blue-100 text-blue-700 border-blue-200 border">
                              Terdeteksi otomatis
                            </Badge>
                          )}
                          {checklist[item.key]?.checked_at && state === "checked" && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              ✓ {new Date(checklist[item.key].checked_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Icon className={cn("h-4 w-4 mt-0.5", state !== "unchecked" ? "text-green-600" : "text-muted-foreground")} />
                        </div>
                      </div>

                      {/* Note section */}
                      {existingNote && !isEditing && (
                        <div
                          className="mt-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 cursor-pointer hover:bg-muted"
                          onClick={() => { setEditingNote(item.key); setNotes({ ...notes, [item.key]: existingNote }); }}
                        >
                          📝 {existingNote}
                        </div>
                      )}
                      {isEditing ? (
                        <div className="mt-2 space-y-1.5">
                          <Textarea
                            className="text-xs min-h-[56px]"
                            placeholder="Tambah catatan..."
                            value={notes[item.key] ?? existingNote}
                            onChange={(e) => setNotes({ ...notes, [item.key]: e.target.value })}
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-6 text-[11px] px-2" onClick={() => saveNote(item.key)}>Simpan</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setEditingNote(null)}>Batal</Button>
                          </div>
                        </div>
                      ) : (
                        !existingNote && (
                          <button
                            className="mt-1 text-[11px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                            onClick={() => { setEditingNote(item.key); setNotes({ ...notes, [item.key]: "" }); }}
                          >
                            + Tambah catatan
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* SQL hint if table doesn't exist */}
      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3">
        <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Catatan SQL</p>
        <p>Jika checklist tidak tersimpan, jalankan SQL berikut di Supabase:</p>
        <code className="block mt-1 bg-background border rounded px-2 py-1 font-mono text-[10px] whitespace-pre-wrap overflow-auto">
{`CREATE TABLE IF NOT EXISTS departure_checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id uuid REFERENCES departures(id) ON DELETE CASCADE,
  items jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(departure_id)
);
ALTER TABLE departure_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_manage_departure_checklists"
  ON departure_checklists FOR ALL
  USING (auth.uid() IS NOT NULL);`}
        </code>
      </div>
    </div>
  );
}
