import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Star, RefreshCw, TrendingUp, Users, MessageSquare, Award } from "lucide-react";

interface SurveyRow {
  id: string;
  rating_overall?: number;
  rating_hotel?: number;
  rating_food?: number;
  rating_muthawif?: number;
  comment?: string;
  submitted_at?: string;
  customers?: { full_name?: string };
  departures?: { name?: string; muthawif_id?: string };
}

interface MuthawifRatingRow {
  muthawif_id: string;
  muthawif_name: string;
  avg_rating: number;
  count: number;
}

export default function AdminPostDepartureSurvey() {
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const { data } = useQuery<SurveyRow[]>({
    queryKey: ["departure-surveys"],
    queryFn: async () => (
      await supabase
        .from("departure_surveys")
        .select("*, customers(full_name), departures(name, muthawif_id)")
        .order("submitted_at", { ascending: false })
        .limit(200)
    ).data || [],
  });

  const { data: muthawifRatings = [], isLoading: ratingLoading } = useQuery<MuthawifRatingRow[]>({
    queryKey: ["muthawif-survey-ratings"],
    queryFn: async () => {
      const rows: SurveyRow[] = (
        await supabase
          .from("departure_surveys")
          .select("rating_muthawif, departures(muthawif_id, muthawif:muthawifs(id, name))")
          .not("rating_muthawif", "is", null)
      ).data || [];

      const map: Record<string, { name: string; sum: number; count: number }> = {};
      for (const r of rows) {
        const d: any = r.departures;
        const mId: string = d?.muthawif_id || d?.muthawif?.id;
        const mName: string = d?.muthawif?.name || "Muthawif";
        if (!mId || !r.rating_muthawif) continue;
        if (!map[mId]) map[mId] = { name: mName, sum: 0, count: 0 };
        map[mId].sum += r.rating_muthawif;
        map[mId].count++;
      }
      return Object.entries(map).map(([muthawif_id, v]) => ({
        muthawif_id,
        muthawif_name: v.name,
        avg_rating: Math.round((v.sum / v.count) * 100) / 100,
        count: v.count,
      })).sort((a, b) => b.avg_rating - a.avg_rating);
    },
  });

  const syncRatingsMutation = useMutation({
    mutationFn: async () => {
      let updated = 0;
      const errors: string[] = [];
      for (const row of muthawifRatings) {
        const { error } = await supabase
          .from("muthawifs")
          .update({ rating: row.avg_rating })
          .eq("id", row.muthawif_id);
        if (error) errors.push(`${row.muthawif_name}: ${error.message}`);
        else updated++;
      }
      if (errors.length) throw new Error(errors.join("; "));
      return updated;
    },
    onSuccess: (updated) => {
      const msg = `Rating ${updated} muthawif berhasil diperbarui dari survei jamaah`;
      setSyncResult(msg);
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["admin-muthawifs"] });
      queryClient.invalidateQueries({ queryKey: ["muthawif-survey-ratings"] });
    },
    onError: (e: any) => toast.error("Sebagian gagal: " + e.message),
  });

  const avg = (key: keyof SurveyRow) => {
    if (!data?.length) return 0;
    const xs = data.map((r) => r[key] as number).filter(Boolean);
    return xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 0;
  };

  const RatingStars = ({ value }: { value: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-7 w-7 text-amber-500" />
          Survey Evaluasi Keberangkatan
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          {data?.length || 0} respons
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "rating_overall",  label: "Keseluruhan" },
          { key: "rating_hotel",    label: "Hotel" },
          { key: "rating_food",     label: "Konsumsi" },
          { key: "rating_muthawif", label: "Muthawif" },
        ].map(({ key, label }) => {
          const val = avg(key as keyof SurveyRow);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {val}
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <Progress value={val * 20} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── C5: Muthawif Rating per Person ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Rating Muthawif dari Survei
            </div>
            <div className="flex items-center gap-2">
              {syncResult && (
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                  ✅ {syncResult}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={syncRatingsMutation.isPending || muthawifRatings.length === 0}
                onClick={() => syncRatingsMutation.mutate()}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncRatingsMutation.isPending ? "animate-spin" : ""}`} />
                Sinkronkan ke Profil Muthawif
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratingLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Menghitung...</div>
          ) : muthawifRatings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Belum ada survei dengan rating muthawif
            </div>
          ) : (
            <div className="space-y-3">
              {muthawifRatings.map((m, i) => (
                <div key={m.muthawif_id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-amber-700 font-bold text-sm">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{m.muthawif_name}</p>
                    <p className="text-xs text-muted-foreground">dari {m.count} penilaian jamaah</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars value={m.avg_rating} />
                    <span className="font-bold text-lg text-amber-700">{m.avg_rating.toFixed(1)}</span>
                  </div>
                  <div className="w-24">
                    <Progress value={m.avg_rating * 20} className="h-2" />
                  </div>
                </div>
              ))}
              <Alert className="mt-2">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Klik "Sinkronkan ke Profil Muthawif" untuk memperbarui kolom <strong>rating</strong> di tabel muthawifs berdasarkan rata-rata survei di atas.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent comments ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Komentar Jamaah Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.filter((d) => d.comment).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada komentar</p>
          ) : data?.filter((d) => d.comment).map((d) => (
            <div key={d.id} className="border-l-4 border-primary pl-3 py-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{d.customers?.full_name} — {d.departures?.name}</div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{d.rating_overall}/5</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString("id-ID") : "-"}
              </div>
              <div className="mt-1 text-sm">{d.comment}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
