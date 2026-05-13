import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const TIER_LABEL: Record<string, { label: string; cls: string }> = {
  silver:   { label: "Silver",   cls: "bg-slate-200 text-slate-800" },
  gold:     { label: "Gold",     cls: "bg-amber-200 text-amber-900" },
  platinum: { label: "Platinum", cls: "bg-violet-200 text-violet-900" },
};

/**
 * LOY-FIX2 — Implementasi Benefit Tier (diskon nyata)
 * Admin mengatur diskon, free upgrades, prioritas dukungan per tier.
 */
export default function AdminTierBenefits() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tier-benefits"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_benefits").select("*").order("tier_level");
      return data || [];
    },
  });

  const [edits, setEdits] = useState<Record<string, any>>({});
  useEffect(() => {
    if (data) {
      const map: Record<string, any> = {};
      data.forEach((t: any) => { map[t.id] = { ...t }; });
      setEdits(map);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("tier_benefits")
        .update({
          discount_percent: Number(row.discount_percent || 0),
          free_upgrades: Number(row.free_upgrades || 0),
          priority_support: !!row.priority_support,
          description: row.description,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["tier-benefits"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6" /> Manfaat Tier Loyalitas
        </h1>
        <p className="text-muted-foreground text-sm">
          Atur diskon, upgrade gratis, dan prioritas dukungan untuk masing-masing tier.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.values(edits).map((t: any) => {
            const cfg = TIER_LABEL[t.tier_level] || TIER_LABEL.silver;
            return (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Badge className={cfg.cls}>{cfg.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Diskon (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={t.discount_percent}
                      onChange={(e) =>
                        setEdits((p) => ({ ...p, [t.id]: { ...t, discount_percent: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Upgrade kamar gratis</label>
                    <Input
                      type="number"
                      value={t.free_upgrades}
                      onChange={(e) =>
                        setEdits((p) => ({ ...p, [t.id]: { ...t, free_upgrades: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Prioritas Dukungan</label>
                    <Switch
                      checked={!!t.priority_support}
                      onCheckedChange={(v) =>
                        setEdits((p) => ({ ...p, [t.id]: { ...t, priority_support: v } }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Deskripsi</label>
                    <Input
                      value={t.description || ""}
                      onChange={(e) =>
                        setEdits((p) => ({ ...p, [t.id]: { ...t, description: e.target.value } }))
                      }
                    />
                  </div>
                  <Button className="w-full" onClick={() => save.mutate(t)} disabled={save.isPending}>
                    <Save className="h-4 w-4 mr-1" /> Simpan
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Cara Kerja</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Saat membuat booking, sistem memanggil RPC <code>apply_tier_discount(customer_id, base_amount)</code>
            untuk mendapatkan harga akhir setelah diskon tier.
          </p>
          <p>
            Tier ditentukan otomatis dari poin loyalitas (Silver &lt; 1000, Gold ≥ 1000, Platinum ≥ 5000).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}