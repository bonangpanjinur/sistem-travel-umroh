import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { Trophy, Medal, Star, TrendingUp, Users, DollarSign, Crown, Award, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const PERIOD_OPTIONS = [
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "last_3_months", label: "3 Bulan Terakhir" },
  { value: "all_time", label: "Sepanjang Waktu" },
];

function getPeriodDates(period: string) {
  const now = new Date();
  if (period === "this_month") {
    return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
  } else if (period === "last_month") {
    const lastMonth = subMonths(now, 1);
    return { start: startOfMonth(lastMonth).toISOString(), end: endOfMonth(lastMonth).toISOString() };
  } else if (period === "last_3_months") {
    return { start: startOfMonth(subMonths(now, 3)).toISOString(), end: endOfMonth(now).toISOString() };
  }
  return null;
}

function getRankBadge(rank: number) {
  if (rank === 1) return { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800", label: "Juara 1", labelColor: "text-yellow-700 dark:text-yellow-400" };
  if (rank === 2) return { icon: Medal, color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700", label: "Juara 2", labelColor: "text-slate-600 dark:text-slate-300" };
  if (rank === 3) return { icon: Award, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", label: "Juara 3", labelColor: "text-amber-700 dark:text-amber-400" };
  return null;
}

function getAgentBadges(entry: AgentRankEntry) {
  const badges = [];
  if (entry.totalBookings >= 50) badges.push({ label: "Master Seller", icon: Crown, color: "text-purple-600 bg-purple-100 dark:bg-purple-950/30" });
  else if (entry.totalBookings >= 20) badges.push({ label: "Top Seller", icon: Star, color: "text-amber-600 bg-amber-100 dark:bg-amber-950/30" });
  if (entry.totalCommission >= 50_000_000) badges.push({ label: "Diamond", icon: Zap, color: "text-blue-600 bg-blue-100 dark:bg-blue-950/30" });
  else if (entry.totalCommission >= 20_000_000) badges.push({ label: "Gold", icon: Zap, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30" });
  return badges;
}

interface AgentRankEntry {
  agentId: string;
  agentName: string;
  agentCode: string;
  totalBookings: number;
  confirmedBookings: number;
  totalJamaah: number;
  totalCommission: number;
  paidCommission: number;
  isSelf: boolean;
}

export default function AgentLeaderboard() {
  const [period, setPeriod] = useState("this_month");
  const [sortBy, setSortBy] = useState<"bookings" | "commission" | "jamaah">("commission");
  const { user } = useAuth();

  const periodDates = getPeriodDates(period);

  const { data: agentData } = useQuery({
    queryKey: ['my-agent-id', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['agent-leaderboard', period, sortBy],
    queryFn: async () => {
      let bookingsQuery = supabase
        .from('bookings')
        .select('agent_id, id, booking_status, total_price');

      if (periodDates) {
        bookingsQuery = bookingsQuery
          .gte('created_at', periodDates.start)
          .lte('created_at', periodDates.end);
      }

      const { data: bookings } = await bookingsQuery;

      let commissionsQuery = supabase
        .from('agent_commissions')
        .select('agent_id, commission_amount, status');

      if (periodDates) {
        commissionsQuery = commissionsQuery
          .gte('created_at', periodDates.start)
          .lte('created_at', periodDates.end);
      }

      const { data: commissions } = await commissionsQuery;

      const { data: agents } = await supabase
        .from('agents')
        .select('id, agent_code, profiles!agents_user_id_fkey(full_name)')
        .eq('is_active', true);

      if (!agents) return [];

      const map: Record<string, AgentRankEntry> = {};
      for (const agent of agents) {
        const profile = agent.profiles as any;
        map[agent.id] = {
          agentId: agent.id,
          agentCode: agent.agent_code || "-",
          agentName: (Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name) || `Agen ${agent.agent_code}`,
          totalBookings: 0,
          confirmedBookings: 0,
          totalJamaah: 0,
          totalCommission: 0,
          paidCommission: 0,
          isSelf: false,
        };
      }

      for (const b of (bookings || [])) {
        if (!b.agent_id || !map[b.agent_id]) continue;
        map[b.agent_id].totalBookings += 1;
        if (b.booking_status === 'confirmed' || b.booking_status === 'completed') {
          map[b.agent_id].confirmedBookings += 1;
          map[b.agent_id].totalJamaah += 1;
        }
      }

      for (const c of (commissions || [])) {
        if (!c.agent_id || !map[c.agent_id]) continue;
        map[c.agent_id].totalCommission += Number(c.commission_amount);
        if (c.status === 'paid') map[c.agent_id].paidCommission += Number(c.commission_amount);
      }

      const result = Object.values(map)
        .filter(a => a.totalBookings > 0 || a.totalCommission > 0)
        .map(a => ({ ...a, isSelf: agentData?.id === a.agentId }));

      result.sort((a, b) => {
        if (sortBy === "bookings") return b.totalBookings - a.totalBookings;
        if (sortBy === "commission") return b.totalCommission - a.totalCommission;
        return b.totalJamaah - a.totalJamaah;
      });

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });

  const myRank = leaderboard?.findIndex(e => e.isSelf);
  const myEntry = myRank !== undefined && myRank >= 0 ? leaderboard?.[myRank] : null;
  const topValue = leaderboard?.[0] ? (sortBy === "bookings" ? leaderboard[0].totalBookings : sortBy === "commission" ? leaderboard[0].totalCommission : leaderboard[0].totalJamaah) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Leaderboard Agen
          </h1>
          <p className="text-muted-foreground mt-1">Peringkat dan kompetisi antar agen Vinstour Travel</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commission">Komisi</SelectItem>
              <SelectItem value="bookings">Booking</SelectItem>
              <SelectItem value="jamaah">Jamaah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* My Rank Banner */}
      {myEntry && (
        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Peringkat Anda Saat Ini</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary">#{(myRank ?? 0) + 1}</span>
                  <span className="text-sm text-muted-foreground">dari {leaderboard?.length} agen aktif</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Komisi</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(myEntry.totalCommission)}</p>
                <p className="text-xs text-muted-foreground">{myEntry.totalBookings} booking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {!isLoading && leaderboard && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            const rankBadge = getRankBadge(idx + 1);
            if (!rankBadge || !entry) return null;
            const RankIcon = rankBadge.icon;
            const isFirst = idx === 0;
            return (
              <Card key={entry.agentId} className={cn(
                "border-2 transition-all",
                rankBadge.bg,
                isFirst && "ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20",
                entry.isSelf && "ring-2 ring-primary"
              )}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <RankIcon className={cn("h-8 w-8", rankBadge.color, isFirst && "h-10 w-10")} />
                  <Avatar className={cn("border-2", isFirst ? "h-14 w-14 border-yellow-400" : "h-12 w-12 border-slate-300")}>
                    <AvatarFallback className={cn("font-bold", isFirst ? "text-base" : "text-sm")}>
                      {entry.agentName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm line-clamp-1">{entry.agentName}</p>
                    <p className="text-xs text-muted-foreground">{entry.agentCode}</p>
                    {entry.isSelf && <Badge className="mt-1 text-[10px] bg-primary/20 text-primary">Anda</Badge>}
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", rankBadge.labelColor, rankBadge.bg)}>
                    {rankBadge.label}
                  </span>
                  <div className="w-full space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Komisi</span>
                      <span className="font-semibold text-green-600">{formatCurrency(entry.totalCommission)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Booking</span>
                      <span className="font-semibold">{entry.totalBookings}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Ranking Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Peringkat Lengkap</CardTitle>
          <CardDescription>Diurutkan berdasarkan {sortBy === 'commission' ? 'total komisi' : sortBy === 'bookings' ? 'jumlah booking' : 'jumlah jamaah'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !leaderboard?.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada data untuk periode ini</p>
              <p className="text-sm">Data akan muncul setelah ada booking aktif</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const rankBadge = getRankBadge(rank);
                const badges = getAgentBadges(entry);
                const value = sortBy === "bookings" ? entry.totalBookings : sortBy === "commission" ? entry.totalCommission : entry.totalJamaah;
                const progress = topValue > 0 ? (value / topValue) * 100 : 0;
                return (
                  <div key={entry.agentId} className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                    entry.isSelf && "bg-primary/5 border-l-4 border-l-primary"
                  )}>
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {rankBadge ? (
                        <rankBadge.icon className={cn("h-5 w-5 mx-auto", rankBadge.color)} />
                      ) : (
                        <span className={cn("text-sm font-bold", rank <= 10 ? "text-foreground" : "text-muted-foreground")}>
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar + Name */}
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-bold">
                        {entry.agentName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{entry.agentName}</span>
                        {entry.isSelf && <Badge variant="outline" className="text-[10px] text-primary border-primary h-4 px-1">Anda</Badge>}
                        {badges.map((b) => (
                          <span key={b.label} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1", b.color)}>
                            <b.icon className="h-3 w-3" />
                            {b.label}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{entry.agentCode}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {entry.totalBookings} booking
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(entry.totalCommission)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>

                    {/* Main metric */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm">
                        {sortBy === "commission"
                          ? formatCurrency(entry.totalCommission)
                          : sortBy === "bookings"
                          ? `${entry.totalBookings}`
                          : `${entry.totalJamaah}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sortBy === "commission" ? "komisi" : sortBy === "bookings" ? "booking" : "jamaah"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivation Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">Tips Naik Peringkat</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Semakin banyak booking yang dikonfirmasi dan semakin tinggi nilai komisi, peringkat Anda akan naik.
              Gunakan fitur Digital Kit untuk promosi lebih efektif!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
