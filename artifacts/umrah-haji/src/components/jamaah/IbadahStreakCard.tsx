import { useQuery } from "@tanstack/react-query";
import { Flame, CheckCircle2, Circle, Trophy } from "lucide-react";
import { subDays, format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TRACKED_PRAYERS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;

interface DayStreak {
  date: string;
  label: string;
  completed: number;
  total: number;
}

function useSholatStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sholat-streak", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));

      const { data, error } = await (supabase as any)
        .from("ibadah_progress")
        .select("ibadah_date, ibadah_type, completed")
        .eq("user_id", user!.id)
        .in("ibadah_date", dates)
        .in("ibadah_type", TRACKED_PRAYERS);

      if (error) {
        if (error.code === "42P01") return { days: [], streak: 0, todayCount: 0 };
        throw error;
      }

      const rows = (data ?? []) as { ibadah_date: string; ibadah_type: string; completed: boolean }[];

      const days: DayStreak[] = dates.map(d => {
        const dayRows = rows.filter(r => r.ibadah_date === d && r.completed);
        return {
          date: d,
          label: format(parseISO(d), "EEE", { locale: localeId }),
          completed: dayRows.length,
          total: TRACKED_PRAYERS.length,
        };
      });

      let streak = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].completed >= days[i].total) {
          streak++;
        } else if (i < days.length - 1) {
          break;
        }
      }

      const todayCount = days[days.length - 1]?.completed ?? 0;

      return { days, streak, todayCount };
    },
  });
}

interface IbadahStreakCardProps {
  className?: string;
}

export function IbadahStreakCard({ className }: IbadahStreakCardProps) {
  const { data, isLoading } = useSholatStreak();

  if (isLoading) return null;
  if (!data) return null;

  const { days, streak, todayCount } = data;
  const todayDay = days[days.length - 1];

  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-sm font-bold">Streak Sholat</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-950/30 px-2.5 py-1 rounded-full">
            <Trophy className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak} hari</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((day, i) => {
          const isToday = i === days.length - 1;
          const fullDay = day.completed >= day.total;
          const partDay = day.completed > 0 && !fullDay;
          return (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-muted-foreground capitalize">{day.label}</p>
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors",
                  fullDay
                    ? "bg-green-500 text-white"
                    : partDay
                    ? "bg-amber-400 text-white"
                    : "bg-muted/60 text-muted-foreground",
                  isToday && "ring-2 ring-offset-1 ring-primary",
                )}
              >
                {fullDay ? "✓" : partDay ? day.completed : "–"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {TRACKED_PRAYERS.map(prayer => {
            const done = todayDay
              ? data.days[data.days.length - 1].completed > TRACKED_PRAYERS.indexOf(prayer)
              : false;
            return (
              <div key={prayer} className="flex flex-col items-center gap-0.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
                <span className="text-[9px] text-muted-foreground capitalize">{prayer.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Hari ini: <span className="font-bold text-foreground">{todayCount}/{TRACKED_PRAYERS.length}</span>
        </p>
      </div>
    </div>
  );
}
