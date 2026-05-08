import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Star, Award, Lock, CheckCircle2, Trophy, Flame, Heart,
  Moon, BookOpen, Users, Camera, Zap, Gift, Share2
} from "lucide-react";

const BADGE_DEFINITIONS = [
  { id: "thawaf_pertama",   icon: "🕋", name: "Thawaf Perdana",       desc: "Selesaikan putaran thawaf pertamamu",         category: "Ritual",      xp: 50,  color: "from-amber-400 to-orange-500" },
  { id: "sai_pertama",      icon: "🏃", name: "Sa'i Pertama",          desc: "Selesaikan sa'i antara Shafa dan Marwa",      category: "Ritual",      xp: 50,  color: "from-green-400 to-emerald-500" },
  { id: "sholat_masjidil",  icon: "🌙", name: "Sholat di Masjidil Haram", desc: "Sholat berjamaah di Masjidil Haram",     category: "Ibadah",      xp: 100, color: "from-blue-400 to-indigo-500" },
  { id: "sholat_nabawi",    icon: "✨", name: "Sholat di Masjid Nabawi", desc: "Sholat berjamaah di Masjid Nabawi",       category: "Ibadah",      xp: 100, color: "from-purple-400 to-violet-500" },
  { id: "raudhah",          icon: "🌹", name: "Ziarah Raudhah",        desc: "Berziarah ke Raudhah Syarifah",              category: "Ziarah",      xp: 150, color: "from-rose-400 to-pink-500" },
  { id: "jabal_nur",        icon: "⛰️", name: "Jabal Nur",             desc: "Mendaki Jabal Nur (Gua Hira)",               category: "Ziarah",      xp: 100, color: "from-teal-400 to-cyan-500" },
  { id: "jabal_tsur",       icon: "🗻", name: "Jabal Tsur",            desc: "Mengunjungi Jabal Tsur",                     category: "Ziarah",      xp: 75,  color: "from-slate-400 to-gray-500" },
  { id: "dzikir_100",       icon: "📿", name: "Dzikir 100",            desc: "Baca dzikir 100x dalam sehari",              category: "Spiritual",   xp: 30,  color: "from-lime-400 to-green-500" },
  { id: "quran_1_juz",      icon: "📖", name: "Khatam Juz",            desc: "Membaca 1 juz Al-Qur'an dalam sehari",       category: "Spiritual",   xp: 75,  color: "from-yellow-400 to-amber-500" },
  { id: "sedekah",          icon: "💝", name: "Dermawan",              desc: "Bersedekah kepada yang membutuhkan",          category: "Sosial",      xp: 50,  color: "from-red-400 to-rose-500" },
  { id: "foto_rombongan",   icon: "📸", name: "Fotografer Rombongan",  desc: "Upload foto ke galeri rombongan",            category: "Sosial",      xp: 25,  color: "from-sky-400 to-blue-500" },
  { id: "rajin_checkin",    icon: "✅", name: "Rajin Hadir",           desc: "Hadir tepat waktu di 3 sesi berturut-turut", category: "Disiplin",    xp: 75,  color: "from-emerald-400 to-teal-500" },
  { id: "doa_subuh",        icon: "🌅", name: "Pagi Berkah",           desc: "Berdoa setelah sholat subuh 7 hari berturut-turut", category: "Spiritual", xp: 100, color: "from-orange-400 to-red-500" },
  { id: "umroh_pertama",    icon: "🌟", name: "Umroh Perdana",         desc: "Menyelesaikan perjalanan umroh pertamamu",   category: "Milestone",   xp: 500, color: "from-yellow-300 to-amber-400" },
  { id: "madinah_ziarah",   icon: "🕌", name: "Peziarah Madinah",      desc: "Mengunjungi Masjid Quba, Baqi, dan Kubur Nabi", category: "Ziarah",  xp: 200, color: "from-indigo-400 to-purple-500" },
];

const CATEGORIES = ["Semua", "Ritual", "Ibadah", "Ziarah", "Spiritual", "Sosial", "Disiplin", "Milestone"];

const ICON_MAP: Record<string, any> = {
  Star, Award, Trophy, Flame, Heart, Moon, BookOpen, Users, Camera, Zap, Gift,
};

function BadgeCard({ badge, earned, onClaim }: { badge: typeof BADGE_DEFINITIONS[0]; earned: boolean; onClaim: () => void }) {
  const [detail, setDetail] = useState(false);
  return (
    <>
      <div
        className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 ${earned ? "border-transparent bg-gradient-to-br " + badge.color + " text-white shadow-lg hover:scale-105" : "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:border-muted-foreground/50"}`}
        onClick={() => setDetail(true)}
      >
        {earned && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-yellow-900" />
          </div>
        )}
        {!earned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/10">
            <Lock className="h-6 w-6 opacity-40" />
          </div>
        )}
        <div className="text-3xl mb-2 text-center">{badge.icon}</div>
        <p className="text-xs font-semibold text-center leading-tight">{badge.name}</p>
        <p className={`text-[10px] text-center mt-1 ${earned ? "text-white/80" : "text-muted-foreground/60"}`}>+{badge.xp} XP</p>
      </div>

      <Dialog open={detail} onOpenChange={setDetail}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">{badge.name}</DialogTitle>
          </DialogHeader>
          <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center text-5xl shadow-xl mb-2`}>
            {badge.icon}
          </div>
          <h2 className="text-xl font-bold">{badge.name}</h2>
          <p className="text-sm text-muted-foreground">{badge.desc}</p>
          <Badge variant="outline" className="mx-auto w-fit">{badge.category}</Badge>
          <p className="font-bold text-amber-600">+{badge.xp} XP</p>
          {earned ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-5 w-5" /> Badge sudah diperoleh!
              </div>
              <Button variant="outline" size="sm" onClick={() => { navigator.share?.({ title: badge.name, text: `Saya mendapatkan badge "${badge.name}" dalam perjalanan umroh! +${badge.xp} XP 🎉` }); setDetail(false); }}>
                <Share2 className="h-4 w-4 mr-2" /> Bagikan
              </Button>
            </div>
          ) : (
            <Button onClick={() => { onClaim(); setDetail(false); }} className={`bg-gradient-to-r ${badge.color} text-white border-0`}>
              <Trophy className="h-4 w-4 mr-2" /> Klaim Badge Ini
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function JamaahBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("Semua");

  // Earned badges from Supabase (or localStorage fallback)
  const { data: earnedIds = [] } = useQuery({
    queryKey: ["jamaah-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data } = await supabase
          .from("jamaah_badges")
          .select("badge_id")
          .eq("user_id", user.id);
        if (data?.length) return data.map((r: any) => r.badge_id);
      } catch {}
      // Fallback to localStorage
      const stored = localStorage.getItem(`badges_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Claim badge
  const claimMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      if (!user?.id) return;
      try {
        await supabase.from("jamaah_badges").insert({ user_id: user.id, badge_id: badgeId, earned_at: new Date().toISOString() });
      } catch {}
      // Always save to localStorage too
      const stored = localStorage.getItem(`badges_${user.id}`);
      const list = stored ? JSON.parse(stored) : [];
      if (!list.includes(badgeId)) {
        localStorage.setItem(`badges_${user.id}`, JSON.stringify([...list, badgeId]));
      }
    },
    onSuccess: (_, badgeId) => {
      const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
      toast.success(`🎉 Badge "${badge?.name}" berhasil diperoleh! +${badge?.xp} XP`);
      queryClient.invalidateQueries({ queryKey: ["jamaah-badges", user?.id] });
    },
  });

  const totalXP = BADGE_DEFINITIONS.filter(b => (earnedIds as string[]).includes(b.id)).reduce((s, b) => s + b.xp, 0);
  const maxXP = BADGE_DEFINITIONS.reduce((s, b) => s + b.xp, 0);
  const earned = (earnedIds as string[]).length;

  const filtered = category === "Semua"
    ? BADGE_DEFINITIONS
    : BADGE_DEFINITIONS.filter(b => b.category === category);

  const levelInfo = totalXP < 200 ? { level: 1, name: "Musafir", next: 200 }
    : totalXP < 500 ? { level: 2, name: "Peziarah", next: 500 }
    : totalXP < 1000 ? { level: 3, name: "Mukminin", next: 1000 }
    : { level: 4, name: "Haji Mabrur", next: maxXP };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Badge & Pencapaian</h1>
        <p className="text-muted-foreground text-sm mt-1">Kumpulkan badge dari ibadah dan pengalaman perjalananmu</p>
      </div>

      {/* XP & Level card */}
      <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-amber-100 text-xs uppercase tracking-wide">Level {levelInfo.level}</p>
              <p className="text-2xl font-bold">{levelInfo.name}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black">{totalXP}</p>
              <p className="text-amber-100 text-xs">XP</p>
            </div>
          </div>
          <Progress value={(totalXP / levelInfo.next) * 100} className="h-2.5 bg-amber-300/50" />
          <p className="text-xs text-amber-100 mt-1.5">{totalXP} / {levelInfo.next} XP ke level berikutnya</p>
          <div className="flex justify-between mt-3 text-center">
            <div>
              <p className="text-xl font-bold">{earned}</p>
              <p className="text-amber-100 text-xs">Badge</p>
            </div>
            <div>
              <p className="text-xl font-bold">{BADGE_DEFINITIONS.length}</p>
              <p className="text-amber-100 text-xs">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold">{BADGE_DEFINITIONS.length - earned}</p>
              <p className="text-amber-100 text-xs">Tersisa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filtered.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={(earnedIds as string[]).includes(badge.id)}
            onClaim={() => claimMutation.mutate(badge.id)}
          />
        ))}
      </div>
    </div>
  );
}
