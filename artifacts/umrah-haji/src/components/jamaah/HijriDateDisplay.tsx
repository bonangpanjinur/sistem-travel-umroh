import { useMemo } from "react";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const HIJRI_MONTHS_ID = [
  "Muharram", "Safar", "Rabi'ul Awal", "Rabi'ul Akhir",
  "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
  "Ramadan", "Syawal", "Dzulqa'dah", "Dzulhijjah",
];

function getHijriDate(date: Date = new Date()): { day: number; month: string; year: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
      day: "numeric", month: "numeric", year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const day   = parseInt(parts.find(p => p.type === "day")?.value   ?? "0", 10);
    const month = parseInt(parts.find(p => p.type === "month")?.value ?? "0", 10);
    const year  = parseInt(parts.find(p => p.type === "year")?.value  ?? "0", 10);
    if (!day || !month || !year) return null;
    return { day, month: HIJRI_MONTHS_ID[month - 1] ?? `Bulan ${month}`, year };
  } catch {
    return null;
  }
}

interface HijriDateDisplayProps {
  date?: Date;
  className?: string;
  showIcon?: boolean;
  variant?: "inline" | "card" | "badge";
}

export function HijriDateDisplay({
  date,
  className,
  showIcon = true,
  variant = "inline",
}: HijriDateDisplayProps) {
  const hijri = useMemo(() => getHijriDate(date), [date]);
  if (!hijri) return null;

  const text = `${hijri.day} ${hijri.month} ${hijri.year} H`;

  if (variant === "badge") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground", className)}>
        {showIcon && <Moon className="h-3 w-3" />}
        {text}
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-3 py-2 flex items-center gap-2", className)}>
        {showIcon && <Moon className="h-4 w-4 text-emerald-600 shrink-0" />}
        <div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Tanggal Hijriah</p>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] opacity-60", className)}>
      {showIcon && <Moon className="h-2.5 w-2.5" />}
      {text}
    </span>
  );
}
