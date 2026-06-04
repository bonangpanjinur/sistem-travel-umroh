import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, CheckCircle2, Circle, ChevronDown, ChevronUp,
  FileText, CreditCard, ShoppingBag, Heart, Stethoscope,
  Trophy, Star, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { toast } from "sonner";

const CHECKLIST_CATEGORIES = [
  {
    id: "dokumen",
    label: "Dokumen & Administrasi",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    items: [
      { id: "paspor", label: "Paspor aktif (min. 6 bulan)" },
      { id: "ktp", label: "Fotokopi KTP" },
      { id: "kk", label: "Fotokopi Kartu Keluarga" },
      { id: "akta", label: "Akta kelahiran / buku nikah" },
      { id: "pas_foto", label: "Pas foto 4×6 latar putih (6 lembar)" },
      { id: "buku_kuning", label: "Buku vaksinasi meningitis (buku kuning)" },
    ],
  },
  {
    id: "keuangan",
    label: "Keuangan & Pembayaran",
    icon: CreditCard,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    items: [
      { id: "dp_lunas", label: "DP sudah dibayar" },
      { id: "cicilan_lancar", label: "Cicilan berjalan lancar" },
      { id: "pelunasan", label: "Pelunasan sudah dilakukan" },
      { id: "uang_saku", label: "Uang saku disiapkan (SAR/IDR)" },
      { id: "kartu_debit", label: "Kartu debit/kredit internasional" },
    ],
  },
  {
    id: "perlengkapan",
    label: "Perlengkapan Ibadah",
    icon: ShoppingBag,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    items: [
      { id: "baju_ihram", label: "Baju ihram (pria 2 set)" },
      { id: "mukena", label: "Mukena (wanita)" },
      { id: "koper", label: "Koper (max 23 kg + kabin 7 kg)" },
      { id: "sandal", label: "Sandal jepit ringan" },
      { id: "sabuk_uang", label: "Sabuk/pouch uang anti-copet" },
      { id: "tasbih", label: "Tasbih & buku doa" },
      { id: "tumbler", label: "Tumbler/botol minum" },
      { id: "payung", label: "Payung kecil (lipat)" },
    ],
  },
  {
    id: "kesehatan",
    label: "Kesehatan & Fisik",
    icon: Stethoscope,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    items: [
      { id: "vaksin_meningitis", label: "Vaksin meningitis (2 minggu sebelum)" },
      { id: "vaksin_influenza", label: "Vaksin influenza (opsional)" },
      { id: "obat_pribadi", label: "Obat-obatan pribadi (resep dokter)" },
      { id: "vitamin", label: "Vitamin dan suplemen stamina" },
      { id: "masker", label: "Masker N95 (cuaca panas + debu)" },
      { id: "surat_dokter", label: "Surat keterangan sehat dari dokter" },
    ],
  },
  {
    id: "spiritual",
    label: "Persiapan Spiritual",
    icon: Heart,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    items: [
      { id: "belajar_manasik", label: "Mengikuti bimbingan manasik" },
      { id: "hafal_niat", label: "Hafal niat umroh & haji" },
      { id: "hafal_doa", label: "Hafal doa-doa wajib" },
      { id: "baca_alquran", label: "Perbanyak baca Al-Quran" },
      { id: "sedekah", label: "Bersedekah sebelum berangkat" },
      { id: "pamit", label: "Pamit keluarga & meminta maaf" },
    ],
  },
];

const STORAGE_KEY = "jamaah_checklist_v1";

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCheckedLocal(checked: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
}

export default function JamaahChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Set<string>>(loadChecked);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["dokumen"]));

  // Ambil customer_id
  const { data: customer } = useQuery({
    queryKey: ["checklist-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any).from("customers").select("id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Muat checklist dari Supabase (merge dengan localStorage)
  const { data: dbChecklist } = useQuery({
    queryKey: ["jamaah-checklist-db", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await (supabase as any)
        .from("jamaah_checklist")
        .select("item_id")
        .eq("customer_id", customer.id)
        .eq("is_checked", true);
      if (error) return [];
      return (data || []).map((r: any) => r.item_id) as string[];
    },
    enabled: !!customer?.id,
  });

  // Saat data DB berhasil dimuat, merge dengan localStorage
  useEffect(() => {
    if (dbChecklist && dbChecklist.length > 0) {
      setChecked(prev => {
        const merged = new Set([...prev, ...dbChecklist]);
        saveCheckedLocal(merged);
        return merged;
      });
    }
  }, [dbChecklist]);

  // Simpan ke Supabase saat berubah
  const saveMutation = useMutation({
    mutationFn: async ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => {
      if (!customer?.id) return;
      await (supabase as any).from("jamaah_checklist").upsert({
        customer_id: customer.id,
        item_id: itemId,
        is_checked: isChecked,
        updated_at: new Date().toISOString(),
      }, { onConflict: "customer_id,item_id" });
    },
  });

  const totalItems = CHECKLIST_CATEGORIES.reduce((s, c) => s + c.items.length, 0);
  const totalChecked = checked.size;
  const progressPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      const isChecked = !next.has(id);
      if (isChecked) next.add(id);
      else next.delete(id);
      saveCheckedLocal(next);
      // Simpan ke DB (fire and forget)
      saveMutation.mutate({ itemId: id, isChecked });
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = () => {
    if (progressPct === 100) return { label: "Siap Berangkat! 🎉", color: "bg-green-100 text-green-700 border-green-200" };
    if (progressPct >= 75) return { label: "Hampir Siap", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if (progressPct >= 50) return { label: "Sedang Disiapkan", color: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Perlu Perhatian", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-semibold">Checklist Persiapan Umroh</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Progress Persiapan</p>
                <p className="text-3xl font-bold text-primary">{progressPct}%</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={cn("text-xs border", statusBadge.color)}>{statusBadge.label}</Badge>
                <p className="text-xs text-muted-foreground">{totalChecked} / {totalItems} item selesai</p>
              </div>
            </div>
            <Progress value={progressPct} className="h-3 bg-primary/20" />

            {progressPct === 100 && (
              <div className="flex items-center gap-2 mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
                <Trophy className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  Alhamdulillah! Semua persiapan sudah selesai. Selamat berangkat! 🕋
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Progress */}
        <div className="grid grid-cols-5 gap-2">
          {CHECKLIST_CATEGORIES.map((cat) => {
            const catChecked = cat.items.filter(i => checked.has(i.id)).length;
            const catPct = Math.round((catChecked / cat.items.length) * 100);
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  toggleExpand(cat.id);
                  const el = document.getElementById(`cat-${cat.id}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                  cat.bg, cat.border
                )}
              >
                <Icon className={cn("h-5 w-5", cat.color)} />
                <span className={cn("text-[10px] font-bold", cat.color)}>{catPct}%</span>
              </button>
            );
          })}
        </div>

        {/* Checklist Categories */}
        {CHECKLIST_CATEGORIES.map((cat) => {
          const catChecked = cat.items.filter(i => checked.has(i.id)).length;
          const isExpanded = expanded.has(cat.id);
          const Icon = cat.icon;
          const catPct = Math.round((catChecked / cat.items.length) * 100);

          return (
            <Card key={cat.id} id={`cat-${cat.id}`} className="overflow-hidden">
              <button
                className="w-full"
                onClick={() => toggleExpand(cat.id)}
              >
                <CardHeader className="pb-0 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cat.bg)}>
                        <Icon className={cn("h-4 w-4", cat.color)} />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{catChecked}/{cat.items.length} selesai</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", catPct === 100 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                        {catPct}%
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <Progress value={catPct} className={cn("h-1.5 mt-2 mb-1", `[&>div]:${cat.color.replace("text-", "bg-")}`)} />
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="px-4 pb-3 pt-1">
                  <div className="space-y-2 mt-1">
                    {cat.items.map((item) => {
                      const isDone = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                            isDone ? `${cat.bg} ${cat.border}` : "bg-white border-border hover:bg-gray-50"
                          )}
                        >
                          {isDone
                            ? <CheckCircle2 className={cn("h-5 w-5 shrink-0", cat.color)} />
                            : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                          }
                          <span className={cn(
                            "text-sm",
                            isDone ? `${cat.color} font-medium line-through opacity-70` : "text-foreground"
                          )}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Tips */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">Tips Persiapan</p>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                <li>Mulai siapkan dokumen minimal 3 bulan sebelum berangkat</li>
                <li>Vaksin meningitis harus minimal 2 minggu sebelum keberangkatan</li>
                <li>Cek masa berlaku paspor — harus minimal 6 bulan dari tanggal kembali</li>
                <li>Simpan salinan dokumen penting di email / Google Drive</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
