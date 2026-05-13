import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

/** KEP-FIX7 — Survey Pasca Keberangkatan */
export default function AdminPostDepartureSurvey() {
  const { data } = useQuery({
    queryKey: ["departure-surveys"],
    queryFn: async () => (await supabase.from("departure_surveys").select("*, customers(full_name), departures(name)").order("submitted_at", { ascending: false }).limit(200)).data || [],
  });

  const avg = (key: string) => {
    if (!data?.length) return 0;
    const xs = data.map((r: any) => r[key]).filter(Boolean);
    return xs.length ? (xs.reduce((a: number, b: number) => a + b, 0) / xs.length).toFixed(2) : 0;
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-7 w-7 text-amber-500" />Survey Evaluasi Keberangkatan</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["rating_overall", "Keseluruhan"],
          ["rating_hotel", "Hotel"],
          ["rating_food", "Konsumsi"],
          ["rating_muthawif", "Muthawif"],
        ].map(([k, l]) => (
          <Card key={k}><CardHeader><CardTitle className="text-sm">{l}</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold flex items-center gap-2">{avg(k)}<Star className="h-5 w-5 fill-amber-400 text-amber-400" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Komentar Terbaru</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data?.filter((d: any) => d.comment).map((d: any) => (
            <div key={d.id} className="border-l-4 border-primary pl-3 py-2">
              <div className="text-sm font-semibold">{d.customers?.full_name} — {d.departures?.name}</div>
              <div className="text-xs text-muted-foreground">{new Date(d.submitted_at).toLocaleDateString("id-ID")} • Rating {d.rating_overall}/5</div>
              <div className="mt-1">{d.comment}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}