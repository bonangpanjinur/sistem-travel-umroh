import { useQuery } from "@tanstack/react-query";
import { Moon } from "lucide-react";
import { subDays, format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const PRAYERS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;

export function WeeklySholatChart({ className }: { className?: string }) {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["weekly-sholat", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) =>
        format(subDays(today, 6 - i), "yyyy-MM-dd"),
      );
      const { data: rows, error } = await (supabase as any)
        .from("ibadah_progress")
        .select("ibadah_date, ibadah_type, completed")
        .eq("user_id", user!.id)
        .in("ibadah_date", dates)
        .in("ibadah_type", PRAYERS);

      if (error && error.code !== "42P01") throw error;
      const r = (rows ?? []) as { ibadah_date: string; ibadah_type: string; completed: boolean }[];

      return dates.map(d => ({
        date: d,
        label: format(parseISO(d), "EEE", { locale: localeId }),
        count: PRAYERS.filter(p =>
          r.some(row => row.ibadah_date === d && row.ibadah_type === p && row.completed),
        ).length,
      }));
    },
  });

  if (!data) return null;

  const maxVal = 5;

  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
          <Moon className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-sm font-bold">Sholat 7 Hari Terakhir</p>
      </div>

      <div className="flex items-end gap-1.5 h-20">
        {data.map((day, i) => {
          const isToday = i === data.length - 1;
          const pct = (day.count / maxVal) * 100;
          const color =
            day.count === 5
              ? "bg-green-500"
              : day.count >= 3
              ? "bg-amber-400"
              : day.count > 0
              ? "bg-orange-400"
              : "bg-muted/60";

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-foreground/60">
                {day.count > 0 ? day.count : ""}
              </span>
              <div className="w-full flex items-end" style={{ height: 48 }}>
                <div
                  className={cn("w-full rounded-t-md transition-all", color, isToday && "ring-1 ring-primary")}
                  style={{ height: `${Math.max(8, pct)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[9px] capitalize font-medium",
                  isToday ? "text-primary font-bold" : "text-muted-foreground",
                )}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-2 border-t">
        {[
          { color: "bg-green-500", label: "5 waktu" },
          { color: "bg-amber-400", label: "3–4" },
          { color: "bg-orange-400", label: "1–2" },
          { color: "bg-muted/60", label: "Belum" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-sm", item.color)} />
            <span className="text-[9px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
