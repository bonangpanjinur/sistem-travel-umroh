import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Plane } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

interface CountdownTimerProps {
  departureDate: string;
  packageName?: string;
  className?: string;
}

function Unit({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-extrabold tabular-nums transition-all",
        highlight
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          : "bg-white/20 dark:bg-black/20 text-white backdrop-blur-sm"
      )}>
        {value}
      </div>
      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-1.5 text-white/80">
        {label}
      </span>
    </div>
  );
}

export function CountdownTimer({ departureDate, packageName, className }: CountdownTimerProps) {
  const target = new Date(departureDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(target));
  const [prevSeconds, setPrevSeconds] = useState(timeLeft.seconds);
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getTimeLeft(target);
      setPrevSeconds(prev => {
        if (prev !== next.seconds) setTick(t => !t);
        return next.seconds;
      });
      setTimeLeft(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [departureDate]);

  const isUrgent = timeLeft.days <= 7 && timeLeft.days > 0;
  const isPast = target.getTime() <= Date.now();

  if (isPast) return null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6",
      isUrgent
        ? "bg-gradient-to-br from-red-600 via-orange-500 to-amber-500"
        : "bg-gradient-to-br from-primary via-primary/90 to-teal-600",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-xl">
            <Plane className={cn("h-5 w-5", isUrgent && "animate-bounce")} />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              {isUrgent ? "Keberangkatan Segera!" : "Hitung Mundur Keberangkatan"}
            </p>
            {packageName && (
              <p className="text-sm font-bold text-white leading-tight">{packageName}</p>
            )}
          </div>
        </div>

        {/* Countdown Units */}
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          <Unit value={String(timeLeft.days)} label="Hari" highlight={timeLeft.days > 0} />
          <span className="text-white/60 text-2xl font-bold mb-4">:</span>
          <Unit value={pad(timeLeft.hours)} label="Jam" />
          <span className="text-white/60 text-2xl font-bold mb-4">:</span>
          <Unit value={pad(timeLeft.minutes)} label="Menit" />
          <span className="text-white/60 text-2xl font-bold mb-4">:</span>
          <Unit value={pad(timeLeft.seconds)} label="Detik" />
        </div>

        {/* Motivational line */}
        <p className="text-center text-white/80 text-xs sm:text-sm">
          {isUrgent
            ? "Pastikan semua persiapan sudah lengkap. Barakallah!"
            : "Manfaatkan waktu untuk mempersiapkan diri dengan sempurna."}
        </p>
      </div>
    </div>
  );
}
