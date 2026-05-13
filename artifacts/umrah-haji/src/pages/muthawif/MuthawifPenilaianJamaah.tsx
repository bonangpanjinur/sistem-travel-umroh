import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Star, ArrowLeft, Users, Search, CheckCircle2, Edit3,
  RefreshCcw, CalendarDays, AlertCircle, ClipboardList,
  ChevronRight, Save, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const sz = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            className={`${sz} ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Rating label helper ──────────────────────────────────────────────────────

const RATING_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "Perlu Perhatian",  cls: "border-red-300 text-red-700 bg-red-50" },
  2: { label: "Cukup",            cls: "border-amber-300 text-amber-700 bg-amber-50" },
  3: { label: "Baik",             cls: "border-blue-300 text-blue-700 bg-blue-50" },
  4: { label: "Sangat Baik",      cls: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  5: { label: "Luar Biasa",       cls: "border-violet-300 text-violet-700 bg-violet-50" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MuthawifPenilaianJamaah() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ rating: 0, catatan: "", kategori: "umum" });
  const [saving, setSaving] = useState(false);

  // ── Fetch muthawif profile ─────────────────────────────────────────────────
  const { data: muthawif } = useQuery({
    queryKey: ["muthawif-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawifs")
        .select("*")
        .eq("email", user!.email)
        .maybeSingle();
      return data;
    },
  });

  // ── Fetch active departure ─────────────────────────────────────────────────
  const { data: activeDeparture, isLoading: loadingDep } = useQuery({
    queryKey: ["muthawif-active-departure", muthawif?.id],
    enabled: !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, status,
          package:packages(name),
          bookings:bookings(
            id, booking_code, booking_status,
            customer:profiles(id, full_name, phone, gender)
          )
        `)
        .eq("muthawif_id", muthawif.id)
        .in("status", ["ongoing", "scheduled"])
        .order("departure_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ── Build passenger list ───────────────────────────────────────────────────
  const passengers = useMemo(() => {
    if (!activeDeparture?.bookings) return [];
    return (activeDeparture.bookings as any[])
      .filter((b: any) => b.booking_status !== "cancelled")
      .map((b: any) => ({
        bookingId: b.id,
        bookingCode: b.booking_code,
        customerId: b.customer?.id,
        name: b.customer?.full_name || "-",
        phone: b.customer?.phone || "-",
        gender: b.customer?.gender,
      }));
  }, [activeDeparture]);

  // ── Fetch evaluations ──────────────────────────────────────────────────────
  const { data: evaluations = [], isLoading: loadingEval, refetch } = useQuery({
    queryKey: ["muthawif-evaluations", activeDeparture?.id, muthawif?.id],
    enabled: !!activeDeparture?.id && !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawif_jamaah_evaluations")
        .select("*")
        .eq("departure_id", activeDeparture!.id)
        .eq("muthawif_id", muthawif!.id);
      return data || [];
    },
  });

  // ── Map evaluations per customerId ─────────────────────────────────────────
  const evalMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const ev of evaluations as any[]) {
      m[ev.customer_id] = ev;
    }
    return m;
  }, [evaluations]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const evalCount  = evaluations.length;
  const avgRating  = evalCount > 0
    ? ((evaluations as any[]).reduce((s: number, e: any) => s + (e.rating || 0), 0) / evalCount).toFixed(1)
    : "-";
  const needsAttn  = (evaluations as any[]).filter((e: any) => e.rating <= 2).length;

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return passengers.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.bookingCode || "").toLowerCase().includes(q)
    );
  }, [passengers, search]);

  // ── Open dialog ────────────────────────────────────────────────────────────
  function openDialog(passenger: any) {
    const existing = evalMap[passenger.customerId];
    setSelected(passenger);
    setForm({
      rating:   existing?.rating  ?? 0,
      catatan:  existing?.catatan ?? "",
      kategori: existing?.kategori ?? "umum",
    });
    setDialogOpen(true);
  }

  // ── Save evaluation ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected || !muthawif || !activeDeparture) return;
    if (form.rating === 0) { toast.error("Pilih rating terlebih dahulu"); return; }
    setSaving(true);
    try {
      const existing = evalMap[selected.customerId];
      const payload = {
        muthawif_id:   muthawif.id,
        departure_id:  activeDeparture.id,
        customer_id:   selected.customerId,
        booking_id:    selected.bookingId,
        rating:        form.rating,
        catatan:       form.catatan.trim() || null,
        kategori:      form.kategori,
        updated_at:    new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabase
          .from("muthawif_jamaah_evaluations")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("muthawif_jamaah_evaluations")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
      toast.success("Penilaian disimpan");
      queryClient.invalidateQueries({ queryKey: ["muthawif-evaluations"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete evaluation ──────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("muthawif_jamaah_evaluations")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Gagal hapus"); return; }
    toast.success("Penilaian dihapus");
    queryClient.invalidateQueries({ queryKey: ["muthawif-evaluations"] });
  }

  const KATEGORI_OPTIONS = [
    { value: "umum",      label: "Umum" },
    { value: "ibadah",    label: "Ibadah" },
    { value: "kesehatan", label: "Kesehatan" },
    { value: "disiplin",  label: "Disiplin" },
    { value: "sosial",    label: "Interaksi Sosial" },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  if (loadingDep) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-lg" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/muthawif/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">Penilaian Jamaah</h1>
          {activeDeparture && (
            <p className="text-xs text-muted-foreground truncate">
              {(activeDeparture as any).package?.name} ·{" "}
              {format(new Date((activeDeparture as any).departure_date), "d MMM yyyy", { locale: idLocale })}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">

        {/* No active departure */}
        {!activeDeparture && !loadingDep && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Tidak ada keberangkatan aktif</p>
              <p className="text-xs mt-1">Penilaian hanya tersedia saat ada keberangkatan berjalan.</p>
            </CardContent>
          </Card>
        )}

        {activeDeparture && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground">Dinilai</p>
                  <p className="text-xl font-bold text-blue-700">{evalCount}<span className="text-xs font-normal text-muted-foreground">/{passengers.length}</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground">Rata-rata</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold text-amber-600">{avgRating}</p>
                    {avgRating !== "-" && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground">Perlu Perhatian</p>
                  <p className={`text-xl font-bold ${needsAttn > 0 ? "text-red-600" : "text-emerald-600"}`}>{needsAttn}</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode booking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Jamaah list */}
            {loadingEval ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada jamaah ditemukan</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((p) => {
                  const ev = evalMap[p.customerId];
                  const rl = ev ? RATING_LABELS[ev.rating] : null;
                  return (
                    <Card
                      key={p.customerId}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openDialog(p)}
                    >
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        {/* Avatar placeholder */}
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                          p.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.bookingCode}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ev ? (
                            <>
                              <StarRating value={ev.rating} readonly size="sm" />
                              {rl && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rl.cls}`}>
                                  {rl.label}
                                </Badge>
                              )}
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Belum dinilai
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Dialog Penilaian ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Penilaian Jamaah
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Jamaah info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  selected.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.bookingCode}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rating Keseluruhan</Label>
                <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
                {form.rating > 0 && (
                  <p className={`text-xs font-medium ${RATING_LABELS[form.rating]?.cls.replace("border-", "text-").replace(/ bg-\S+/, "").trim()}`}>
                    {RATING_LABELS[form.rating]?.label}
                  </p>
                )}
              </div>

              {/* Kategori */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kategori Penilaian</Label>
                <div className="flex flex-wrap gap-2">
                  {KATEGORI_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, kategori: opt.value }))}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        form.kategori === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Catatan Muthawif <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Textarea
                  placeholder="Contoh: Jamaah aktif mengikuti ibadah, perlu didampingi saat ziarah karena kondisi fisik..."
                  value={form.catatan}
                  onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Existing eval actions */}
              {evalMap[selected?.customerId] && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 flex-1">
                    Sudah dinilai sebelumnya. Simpan untuk memperbarui.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(evalMap[selected.customerId].id).then(() => setDialogOpen(false))}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Hapus
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || form.rating === 0}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Menyimpan..." : "Simpan Penilaian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
