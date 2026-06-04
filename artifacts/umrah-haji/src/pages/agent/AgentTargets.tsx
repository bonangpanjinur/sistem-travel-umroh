import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId } from "@/hooks/useAgents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  Target, TrendingUp, DollarSign, Users, CheckCircle2,
  Edit3, Plus, BarChart3, Flame, AlertCircle, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function ProgressRing({ value, size = 80, strokeWidth = 8, color = "stroke-primary" }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / 100, 1);
  const offset = circ * (1 - pct);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} className="fill-none stroke-muted" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        strokeWidth={strokeWidth}
        fill="none"
        className={cn("transition-all duration-700", color)}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function getStatusColor(pct: number) {
  if (pct >= 100) return { ring: "stroke-green-500", badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", bar: "bg-green-500" };
  if (pct >= 75) return { ring: "stroke-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", bar: "bg-blue-500" };
  if (pct >= 50) return { ring: "stroke-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-500" };
  if (pct >= 25) return { ring: "stroke-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", bar: "bg-orange-500" };
  return { ring: "stroke-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", bar: "bg-red-500" };
}

function getMotivationMessage(pct: number) {
  if (pct >= 100) return { text: "Target Tercapai! Luar biasa!", icon: Trophy, color: "text-green-600" };
  if (pct >= 75) return { text: "Hampir sampai! Terus semangat!", icon: Flame, color: "text-blue-600" };
  if (pct >= 50) return { text: "Setengah perjalanan! Jangan berhenti!", icon: TrendingUp, color: "text-amber-600" };
  if (pct >= 25) return { text: "Terus bergerak, masih ada waktu!", icon: Target, color: "text-orange-600" };
  return { text: "Ayo mulai, kamu pasti bisa!", icon: AlertCircle, color: "text-red-600" };
}

const STORAGE_KEY = (agentId: string, month: string) => `agent_target_${agentId}_${month}`;

interface MonthlyTarget {
  bookingTarget: number;
  commissionTarget: number;
  jamaahTarget: number;
}

export default function AgentTargets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isSetOpen, setIsSetOpen] = useState(false);

  const { data: agentData } = useAgentByUserId(user?.id);

  const now = new Date();
  const monthKey = format(now, "yyyy-MM");
  const monthLabel = format(now, "MMMM yyyy", { locale: idLocale });
  const dayOfMonth = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const dayProgress = (dayOfMonth / daysInMonth) * 100;

  const storageKey = STORAGE_KEY(agentData?.id || "unknown", monthKey);

  const { data: target, isLoading: targetLoading } = useQuery<MonthlyTarget>({
    queryKey: ['agent-target', agentData?.id, monthKey],
    enabled: !!agentData?.id,
    queryFn: async () => {
      try {
        const { data: row } = await (supabase as any)
          .from('agent_monthly_targets')
          .select('booking_target,commission_target,jamaah_target')
          .eq('agent_id', agentData!.id)
          .eq('month_key', monthKey)
          .maybeSingle();
        if (row) {
          const result = { bookingTarget: row.booking_target, commissionTarget: row.commission_target, jamaahTarget: row.jamaah_target };
          localStorage.setItem(storageKey, JSON.stringify(result));
          return result;
        }
      } catch {}
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
      return { bookingTarget: 10, commissionTarget: 10_000_000, jamaahTarget: 10 };
    },
  });

  const setTargetMutation = useMutation({
    mutationFn: async (data: MonthlyTarget) => {
      localStorage.setItem(storageKey, JSON.stringify(data));
      try {
        await (supabase as any).from('agent_monthly_targets').upsert({
          agent_id: agentData!.id,
          month_key: monthKey,
          booking_target: data.bookingTarget,
          commission_target: data.commissionTarget,
          jamaah_target: data.jamaahTarget,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'agent_id,month_key' });
      } catch {}
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-target', agentData?.id, monthKey] });
      setIsSetOpen(false);
      toast({ title: "Target berhasil disimpan!" });
    },
  });

  const { data: actuals, isLoading: actualsLoading } = useQuery({
    queryKey: ['agent-actuals', agentData?.id, monthKey],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();

      const [{ data: bookings }, { data: commissions }] = await Promise.all([
        supabase.from('bookings').select('id, booking_status').eq('agent_id', agentData!.id).gte('created_at', start).lte('created_at', end),
        supabase.from('agent_commissions').select('commission_amount').eq('agent_id', agentData!.id).gte('created_at', start).lte('created_at', end),
      ]);

      const totalBookings = bookings?.length || 0;
      const confirmedBookings = bookings?.filter(b => ['confirmed', 'completed'].includes(b.booking_status || '')).length || 0;
      const totalCommission = commissions?.reduce((s, c) => s + Number(c.commission_amount), 0) || 0;

      return { totalBookings, confirmedBookings, totalCommission };
    },
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = targetLoading || actualsLoading;

  const bookingPct = target?.bookingTarget ? Math.min((actuals?.totalBookings || 0) / target.bookingTarget * 100, 100) : 0;
  const commissionPct = target?.commissionTarget ? Math.min((actuals?.totalCommission || 0) / target.commissionTarget * 100, 100) : 0;
  const jamaahPct = target?.jamaahTarget ? Math.min((actuals?.confirmedBookings || 0) / target.jamaahTarget * 100, 100) : 0;

  const overallPct = (bookingPct + commissionPct + jamaahPct) / 3;
  const overallStatus = getStatusColor(overallPct);
  const motivation = getMotivationMessage(overallPct);
  const MotivationIcon = motivation.icon;

  function handleSetTarget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setTargetMutation.mutate({
      bookingTarget: Number(fd.get('bookingTarget')) || 10,
      commissionTarget: Number((fd.get('commissionTarget') as string)?.replace(/\D/g, '')) || 10_000_000,
      jamaahTarget: Number(fd.get('jamaahTarget')) || 10,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Target Bulanan
          </h1>
          <p className="text-muted-foreground mt-1">Pantau progress Anda — {monthLabel}</p>
        </div>
        <Dialog open={isSetOpen} onOpenChange={setIsSetOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Edit3 className="h-4 w-4" />
              Ubah Target
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Target {monthLabel}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetTarget} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingTarget">Target Booking (jumlah)</Label>
                <Input id="bookingTarget" name="bookingTarget" type="number" min={1} defaultValue={target?.bookingTarget || 10} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionTarget">Target Komisi (Rp)</Label>
                <Input id="commissionTarget" name="commissionTarget" type="number" min={0} defaultValue={target?.commissionTarget || 10_000_000} required />
                <p className="text-xs text-muted-foreground">Contoh: 10000000 untuk Rp 10 juta</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jamaahTarget">Target Jamaah Konfirmasi</Label>
                <Input id="jamaahTarget" name="jamaahTarget" type="number" min={1} defaultValue={target?.jamaahTarget || 10} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsSetOpen(false)}>Batal</Button>
                <Button type="submit" disabled={setTargetMutation.isPending}>Simpan Target</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <ProgressRing value={overallPct} size={100} strokeWidth={10} color={overallStatus.ring} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-extrabold">{Math.round(overallPct)}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <MotivationIcon className={cn("h-5 w-5", motivation.color)} />
                <p className="font-bold text-lg">{motivation.text}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Hari ke-{dayOfMonth} dari {daysInMonth} hari • Progress waktu bulan ini: {Math.round(dayProgress)}%
              </p>
              <div>
                <Progress value={dayProgress} className="h-1.5 bg-muted" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge className={cn("text-xs", overallStatus.badge)}>
                  {overallPct >= 100 ? "Target Tercapai!" : overallPct >= 75 ? "Hampir Tercapai" : overallPct >= 50 ? "Sedang Berjalan" : "Perlu Lebih Semangat"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Booking Target */}
          {[
            {
              label: "Booking",
              icon: BarChart3,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100 dark:bg-blue-900/30",
              actual: actuals?.totalBookings || 0,
              target: target?.bookingTarget || 0,
              pct: bookingPct,
              format: (v: number) => `${v}`,
              unit: "booking",
            },
            {
              label: "Komisi",
              icon: DollarSign,
              iconColor: "text-green-600",
              iconBg: "bg-green-100 dark:bg-green-900/30",
              actual: actuals?.totalCommission || 0,
              target: target?.commissionTarget || 0,
              pct: commissionPct,
              format: formatCurrency,
              unit: "komisi",
            },
            {
              label: "Jamaah Konfirmasi",
              icon: Users,
              iconColor: "text-purple-600",
              iconBg: "bg-purple-100 dark:bg-purple-900/30",
              actual: actuals?.confirmedBookings || 0,
              target: target?.jamaahTarget || 0,
              pct: jamaahPct,
              format: (v: number) => `${v}`,
              unit: "jamaah",
            },
          ].map((metric) => {
            const status = getStatusColor(metric.pct);
            const MetricIcon = metric.icon;
            return (
              <Card key={metric.label} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={cn("p-2.5 rounded-xl", metric.iconBg)}>
                      <MetricIcon className={cn("h-5 w-5", metric.iconColor)} />
                    </div>
                    <Badge className={cn("text-xs font-semibold", status.badge)}>
                      {Math.round(metric.pct)}%
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-extrabold">{metric.format(metric.actual)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target: <span className="font-medium">{metric.format(metric.target)}</span>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Progress value={metric.pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{metric.format(metric.actual)} tercapai</span>
                      <span>{metric.format(Math.max(0, metric.target - metric.actual))} lagi</span>
                    </div>
                  </div>
                  {metric.pct >= 100 && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-semibold bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Target tercapai!
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tips Section */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Flame className="h-4 w-4" />
            Tips Mencapai Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
            <li className="flex items-start gap-2"><Plus className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Gunakan Digital Kit untuk menyebarkan promosi ke calon jamaah</span></li>
            <li className="flex items-start gap-2"><Plus className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Ajak sub-agen Anda ikut berkontribusi demi mencapai target bersama</span></li>
            <li className="flex items-start gap-2"><Plus className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Follow-up lead yang belum dikonversi secara rutin setiap hari</span></li>
            <li className="flex items-start gap-2"><Plus className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Pantau leaderboard untuk tahu posisi Anda dibanding agen lain</span></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
