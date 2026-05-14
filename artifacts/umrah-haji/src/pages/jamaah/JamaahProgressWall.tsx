import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Medal, Award, Star, BookOpen, GraduationCap, Crown, Flame } from "lucide-react";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { cn } from "@/lib/utils";

// XP per badge (mirrors JamaahBadges.tsx definition)
const BADGE_XP: Record<string, number> = {
  thawaf_pertama: 50, sai_pertama: 50, sholat_masjidil: 100,
  sholat_nabawi: 100, raudhah: 150, jabal_nur: 100, jabal_tsur: 75,
  dzikir_100: 30, quran_1_juz: 75, sedekah: 50, foto_rombongan: 25,
  rajin_checkin: 75, doa_subuh: 100, umroh_pertama: 500, madinah_ziarah: 200,
};
const BADGE_EMOJI: Record<string, string> = {
  thawaf_pertama: "🕋", sai_pertama: "🏃", sholat_masjidil: "🌙",
  sholat_nabawi: "✨", raudhah: "🌹", jabal_nur: "⛰️", jabal_tsur: "🗻",
  dzikir_100: "📿", quran_1_juz: "📖", sedekah: "💝", foto_rombongan: "📸",
  rajin_checkin: "✅", doa_subuh: "🌅", umroh_pertama: "🌟", madinah_ziarah: "🕌",
};

interface LeaderEntry {
  customerId: string;
  userId: string;
  fullName: string;
  sessionCount: number;
  badgeCount: number;
  totalXp: number;
  topBadges: string[];
  isMe: boolean;
}

function getRankDecor(rank: number) {
  if (rank === 1) return { Icon: Trophy, color: "text-yellow-500", ring: "ring-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" };
  if (rank === 2) return { Icon: Medal, color: "text-slate-400", ring: "ring-slate-300", bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700" };
  if (rank === 3) return { Icon: Award, color: "text-amber-600", ring: "ring-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" };
  return null;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function PodiumCard({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const decor = getRankDecor(rank)!;
  const heights = ["h-28", "h-20", "h-14"];
  const podiumH = heights[rank - 1];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative ring-2 rounded-full", decor.ring)}>
        <Avatar className="h-14 w-14">
          <AvatarFallback className={cn("text-sm font-bold", entry.isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {initials(entry.fullName)}
          </AvatarFallback>
        </Avatar>
        {entry.isMe && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1 font-bold leading-4">
            Anda
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-center max-w-[80px] leading-tight truncate">{entry.fullName}</p>
      <div className="flex items-center gap-1">
        <decor.Icon className={cn("h-3.5 w-3.5", decor.color)} />
        <span className={cn("text-xs font-bold", decor.color)}>#{rank}</span>
      </div>
      <div className={cn("w-20 rounded-t-md flex flex-col items-center justify-end pb-2 border", podiumH, decor.bg)}>
        <span className="text-base font-extrabold">{entry.totalXp}</span>
        <span className="text-[10px] text-muted-foreground">XP</span>
      </div>
    </div>
  );
}

function RowCard({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const decor = getRankDecor(rank);
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl px-4 py-3 border transition-shadow",
      entry.isMe ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card hover:shadow-sm",
      rank <= 3 && decor?.bg
    )}>
      <span className={cn(
        "w-7 text-center text-sm font-bold shrink-0",
        rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-muted-foreground"
      )}>
        {decor ? <decor.Icon className={cn("h-4 w-4 mx-auto", decor.color)} /> : rank}
      </span>

      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={cn("text-xs font-bold", entry.isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
          {initials(entry.fullName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate">{entry.fullName}</span>
          {entry.isMe && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary text-primary shrink-0">Anda</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            {entry.sessionCount} sesi
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3" />
            {entry.badgeCount} badge
          </span>
          {entry.topBadges.slice(0, 3).map((bid) => (
            <span key={bid} className="text-sm leading-none" title={bid}>{BADGE_EMOJI[bid] ?? "🏅"}</span>
          ))}
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="text-sm font-bold">{entry.totalXp.toLocaleString("id-ID")}</span>
        <p className="text-[10px] text-muted-foreground">XP</p>
      </div>
    </div>
  );
}

export default function JamaahProgressWall() {
  const { user } = useAuth();

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ["progress-wall-me", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, user_id, full_name, branch_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // All customers in same branch
  const { data: branchCustomers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["progress-wall-branch", customer?.branch_id],
    enabled: !!customer?.branch_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, user_id, full_name")
        .eq("branch_id", customer!.branch_id);
      if (error) throw error;
      return (data ?? []) as { id: string; user_id: string; full_name: string }[];
    },
  });

  const customerIds = branchCustomers.map((c) => c.id);
  const userIds = branchCustomers.map((c) => c.user_id).filter(Boolean);

  // Confirmed manasik attendance counts
  const { data: attendanceCounts = [] } = useQuery({
    queryKey: ["progress-wall-attendance", customerIds],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manasik_attendance")
        .select("customer_id")
        .in("customer_id", customerIds);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as { customer_id: string }[];
    },
  });

  // Badge rows per user
  const { data: badgeRows = [] } = useQuery({
    queryKey: ["progress-wall-badges", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jamaah_badges")
        .select("user_id, badge_id")
        .in("user_id", userIds);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as { user_id: string; badge_id: string }[];
    },
  });

  // Build attendance map: customerId → count
  const sessionMap = attendanceCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.customer_id] = (acc[row.customer_id] ?? 0) + 1;
    return acc;
  }, {});

  // Build badge map: userId → badge_ids[]
  const badgeMap = badgeRows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push(row.badge_id);
    return acc;
  }, {});

  const leaderboard: LeaderEntry[] = branchCustomers
    .map((c) => {
      const badges = badgeMap[c.user_id] ?? [];
      const xp = badges.reduce((sum, bid) => sum + (BADGE_XP[bid] ?? 30), 0);
      const sessionCount = sessionMap[c.id] ?? 0;
      const sessionXp = sessionCount * 20;
      return {
        customerId: c.id,
        userId: c.user_id,
        fullName: c.full_name || "Jamaah",
        sessionCount,
        badgeCount: badges.length,
        totalXp: xp + sessionXp,
        topBadges: badges.slice(0, 3),
        isMe: c.id === customer?.id,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp || b.badgeCount - a.badgeCount || b.sessionCount - a.sessionCount);

  const isLoading = loadingCustomer || loadingMembers;
  const myRank = leaderboard.findIndex((e) => e.isMe) + 1;

  const podiumOrder = leaderboard.length >= 3
    ? [leaderboard[1], leaderboard[0], leaderboard[2]]
    : leaderboard.slice(0, 3);
  const podiumRanks = leaderboard.length >= 3 ? [2, 1, 3] : [2, 1, 3];

  return (
    <div className="min-h-screen bg-background">
      <JamaahBottomNav />

      <div className="md:pl-60 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/jamaah" className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Progress Wall
              </h1>
              <p className="text-sm text-muted-foreground">Leaderboard kemajuan belajar sesama jamaah cabang</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !customer?.branch_id ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Belum terdaftar di cabang</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Progress Wall tampil setelah Anda bergabung ke cabang dan memiliki booking yang dikonfirmasi.
                </p>
              </CardContent>
            </Card>
          ) : leaderboard.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Belum ada anggota</p>
                <p className="text-sm text-muted-foreground mt-1">Jadilah yang pertama menyelesaikan sesi manasik!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* My rank banner */}
              {myRank > 0 && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-5">
                  <Flame className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Peringkat Anda: <strong>#{myRank}</strong> dari {leaderboard.length} jamaah
                  </p>
                  <div className="ml-auto flex gap-2 text-xs text-muted-foreground">
                    <span>{leaderboard.find((e) => e.isMe)?.sessionCount ?? 0} sesi</span>
                    <span>·</span>
                    <span>{leaderboard.find((e) => e.isMe)?.badgeCount ?? 0} badge</span>
                  </div>
                </div>
              )}

              {/* Podium */}
              {leaderboard.length >= 2 && (
                <Card className="mb-5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Top 3 Jamaah
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-center gap-4 pt-2">
                      {podiumOrder.map((entry, idx) => (
                        entry ? (
                          <PodiumCard key={entry.customerId} entry={entry} rank={podiumRanks[idx]} />
                        ) : null
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Semua Peringkat — {leaderboard.length} Jamaah
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <RowCard key={entry.customerId} entry={entry} rank={idx + 1} />
                  ))}
                </CardContent>
              </Card>

              {/* Legend */}
              <div className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Cara menghitung XP</p>
                <p>• Setiap sesi manasik yang dikonfirmasi = <strong>20 XP</strong></p>
                <p>• Setiap badge ibadah yang diraih = <strong>30–500 XP</strong> (tergantung badge)</p>
                <p className="pt-1">
                  Tingkatkan XP Anda melalui{" "}
                  <Link to="/jamaah/manasik" className="text-primary underline underline-offset-2">Manasik Digital</Link>{" "}
                  dan{" "}
                  <Link to="/jamaah/badges" className="text-primary underline underline-offset-2">Koleksi Badge</Link>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
