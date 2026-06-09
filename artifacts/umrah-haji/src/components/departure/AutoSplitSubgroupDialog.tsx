import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shuffle, Users, AlertTriangle, CheckCircle2, UserRound } from "lucide-react";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";

const COLORS = [
  "#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6",
  "#ec4899","#14b8a6","#f97316","#6366f1","#84cc16",
];

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const e = await res.json(); throw e; }
  return res.json();
}

interface AutoSplitSubgroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departureId: string;
  totalJamaah: number;
  onSuccess: () => void;
}

type Strategy = "mahram_aware" | "gender_balanced" | "random";

const STRATEGY_LABELS: Record<Strategy, { label: string; desc: string }> = {
  mahram_aware: {
    label: "Mahram-Aware (Default)",
    desc: "Pasangan mahram selalu satu grup. Pembagian urut abjad nama.",
  },
  gender_balanced: {
    label: "Seimbang Gender",
    desc: "Tiap grup mendapat jumlah Laki/Perempuan seimbang. Mahram tetap satu grup.",
  },
  random: {
    label: "Acak",
    desc: "Pembagian acak merata. Cocok untuk kelompok muda/santai.",
  },
};

export default function AutoSplitSubgroupDialog({
  open,
  onOpenChange,
  departureId,
  totalJamaah,
  onSuccess,
}: AutoSplitSubgroupDialogProps) {
  const [numGroups, setNumGroups] = useState(2);
  const [strategy, setStrategy] = useState<Strategy>("mahram_aware");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const perGroupEst = Math.ceil(totalJamaah / numGroups);

  const splitMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/guide/subgroups/auto-split", {
        method: "POST",
        body: JSON.stringify({
          departure_id: departureId,
          num_groups: numGroups,
          strategy,
          replace_existing: replaceExisting,
        }),
      }),
    onSuccess: (data) => {
      setPreview(data.groups);
    },
    onError: (e: any) => toast.error(e?.error || "Gagal membagi subgroup"),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/guide/subgroups/auto-split", {
        method: "POST",
        body: JSON.stringify({
          departure_id: departureId,
          num_groups: numGroups,
          strategy,
          replace_existing: true,
        }),
      }),
    onSuccess: (data) => {
      toast.success(`Berhasil membuat ${data.groups.length} sub-grup (${data.total_assigned} jamaah)`);
      setPreview(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.error || "Gagal menyimpan subgroup"),
  });

  function handleClose() {
    setPreview(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-emerald-600" />
            Bagi Sub-Grup Otomatis
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 min-h-0">
          {!preview ? (
            <>
              {/* Jumlah grup */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jumlah Grup / Bus</Label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumGroups(n)}
                      className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
                        numGroups === n
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-700 hover:border-emerald-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Estimasi ±{perGroupEst} jamaah per grup dari total {totalJamaah} orang
                </p>
              </div>

              {/* Strategi */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Strategi Pembagian</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STRATEGY_LABELS[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{STRATEGY_LABELS[strategy].desc}</p>
              </div>

              {/* Ganti existing */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Hapus sub-grup yang ada</p>
                  <p className="text-xs text-muted-foreground">Hapus semua sub-grup lama sebelum membuat baru</p>
                </div>
                <Switch checked={replaceExisting} onCheckedChange={setReplaceExisting} />
              </div>

              {replaceExisting && (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs">Sub-grup yang ada saat ini akan dihapus dan diganti dengan pembagian baru.</p>
                </div>
              )}
            </>
          ) : (
            /* Preview hasil */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs font-medium">
                  Preview pembagian {preview.length} grup — {preview.reduce((s, g) => s + g.member_count, 0)} jamaah
                </p>
              </div>

              <div className="space-y-2">
                {preview.map((g, i) => (
                  <div key={g.id || i} className="rounded-lg border overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: (COLORS[i % COLORS.length]) + "20", borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}
                    >
                      <span className="font-semibold text-sm">{g.name || `Grup ${i + 1}`}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {g.member_count} jamaah
                      </Badge>
                    </div>
                    <div className="px-3 py-2 flex flex-wrap gap-1">
                      {(g.members || []).slice(0, 8).map((m: any) => (
                        <span
                          key={m.customer_id}
                          className="flex items-center gap-1 text-xs bg-gray-100 rounded px-1.5 py-0.5"
                        >
                          <UserRound className={`h-2.5 w-2.5 ${m.gender === "P" ? "text-pink-500" : "text-blue-500"}`} />
                          {m.full_name}
                        </span>
                      ))}
                      {(g.members || []).length > 8 && (
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                          +{(g.members || []).length - 8} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Klik "Simpan Sub-Grup" untuk menerapkan pembagian ini ke database.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {!preview ? (
            <>
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={splitMutation.isPending}
                onClick={() => splitMutation.mutate()}
              >
                <Shuffle className="h-4 w-4" />
                {splitMutation.isPending ? "Memproses..." : "Lihat Preview"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                ← Ubah Pengaturan
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirmMutation.isPending ? "Menyimpan..." : "Simpan Sub-Grup"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
