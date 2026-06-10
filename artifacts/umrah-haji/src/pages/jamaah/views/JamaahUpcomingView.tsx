import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plane, ChevronRight, CheckCircle2, Circle, GraduationCap, FileText, Calendar, Clock } from "lucide-react";
import { format, differenceInDays, differenceInSeconds } from "date-fns";
import { id } from "date-fns/locale";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { IbadahShortcutsGrid } from "@/components/jamaah/IbadahShortcutsGrid";
import type { PortalContext } from "@/hooks/usePortalContext";

const PREPARATION_CHECKLIST = [
  { id: "paspor",     label: "Paspor (berlaku min. 6 bulan)", icon: "🛂", category: "Dokumen" },
  { id: "visa",       label: "Visa Umroh",                    icon: "📋", category: "Dokumen" },
  { id: "vaksin",     label: "Vaksin Meningitis",             icon: "💉", category: "Kesehatan" },
  { id: "ihram_pria", label: "Kain Ihram (2 set)",            icon: "🧣", category: "Perlengkapan" },
  { id: "sandal",     label: "Sandal Ihram",                  icon: "👡", category: "Perlengkapan" },
  { id: "koper",      label: "Koper Ukuran Sesuai Maskapai",  icon: "🧳", category: "Perlengkapan" },
  { id: "tasbih",     label: "Tasbih Digital/Manual",        icon: "📿", category: "Perlengkapan" },
  { id: "buku_doa",   label: "Buku Doa & Manasik",           icon: "📖", category: "Ibadah" },
];

const CHECKLIST_KEY = "jamaah-prep-checklist";

interface Props { ctx: PortalContext }

export function JamaahUpcomingView({ ctx }: Props) {
  const trip = ctx.trip!;

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "{}");
    } catch { return {}; }
  });
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number } | null>(null);

  const daysUntil = trip.daysUntilDeparture ?? 0;

  // Live countdown
  useEffect(() => {
    const tick = () => {
      if (!trip.departureDate) return;
      const target = new Date(trip.departureDate);
      target.setHours(0, 0, 0, 0);
      const diff = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setCountdown({ d, h, m });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [trip.departureDate]);

  const toggleItem = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const doneCount  = Object.values(checked).filter(Boolean).length;
  const totalCount = PREPARATION_CHECKLIST.length;
  const progress   = Math.round((doneCount / totalCount) * 100);

  const departureDateLabel = trip.departureDate
    ? format(new Date(trip.departureDate), "EEEE, d MMMM yyyy", { locale: id })
    : "–";

  return (
    <JamaahAppShell>
      {/* Countdown hero */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white px-4 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="relative text-center">
          <p className="text-[12px] opacity-80 font-medium uppercase tracking-widest mb-2">Menuju Baitullah</p>
          <p className="font-black text-6xl leading-none">{daysUntil}</p>
          <p className="text-lg font-semibold opacity-90 mt-1">Hari Lagi</p>
          {countdown && (
            <p className="text-[12px] opacity-75 mt-1">
              {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")} dari sekarang
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Calendar className="h-4 w-4 opacity-80" />
            <p className="text-[13px] opacity-90">{departureDateLabel}</p>
          </div>
          <p className="text-[12px] opacity-80 mt-1 font-medium">{trip.packageName}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Sholat countdown */}
        <SholatCountdownWidget compact />

        {/* Preparation checklist */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Checklist Persiapan</p>
              <p className="text-xs text-muted-foreground">{doneCount}/{totalCount} selesai</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-primary">{progress}%</p>
              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {PREPARATION_CHECKLIST.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                {checked[item.id]
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                }
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm ${checked[item.id] ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.category}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-t">
            <Link to="/jamaah/checklist" className="text-xs text-primary flex items-center gap-1">
              Lihat checklist lengkap <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Manasik progress */}
        <Link to="/jamaah/manasik" className="block rounded-2xl border bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Manasik Digital</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pelajari tata cara ibadah sebelum berangkat</p>
              <p className="text-[11px] text-teal-600 font-medium mt-1">Mulai belajar →</p>
            </div>
          </div>
        </Link>

        {/* Booking info */}
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Info Perjalanan</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground">Kode Booking</p>
              <p className="font-mono font-semibold">{trip.bookingCode}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Durasi</p>
              <p className="font-semibold">{trip.durationDays} hari</p>
            </div>
            {trip.hotelMakkahName && (
              <div>
                <p className="text-[10px] text-muted-foreground">Hotel Makkah</p>
                <p className="font-semibold text-[12px] leading-tight">{trip.hotelMakkahName}</p>
              </div>
            )}
            {trip.hotelMadinahName && (
              <div>
                <p className="text-[10px] text-muted-foreground">Hotel Madinah</p>
                <p className="font-semibold text-[12px] leading-tight">{trip.hotelMadinahName}</p>
              </div>
            )}
          </div>
          <Link to="/jamaah/booking" className="text-xs text-primary flex items-center gap-1 pt-1">
            Detail booking lengkap <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Ibadah shortcuts */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Ibadah Harian</p>
          <IbadahShortcutsGrid tripMode="UPCOMING" cols={4} />
        </div>

        {/* Documents */}
        <Link to="/jamaah/documents" className="flex items-center gap-3 p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Dokumen Perjalanan</p>
            <p className="text-xs text-muted-foreground">Paspor, visa, sertifikat vaksin</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </JamaahAppShell>
  );
}
