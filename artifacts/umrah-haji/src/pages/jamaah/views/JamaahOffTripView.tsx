import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plane, ChevronRight, Star, Calendar, BookOpen } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { IbadahShortcutsGrid } from "@/components/jamaah/IbadahShortcutsGrid";
import type { PortalContext } from "@/hooks/usePortalContext";

// Ayat harian — deterministik berdasarkan hari tahun ini (offline safe)
const DAILY_VERSES = [
  { surah: "Al-Baqarah", ayat: 286, arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", terjemah: "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya." },
  { surah: "Al-Imran", ayat: 173, arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", terjemah: "Cukuplah Allah menjadi Penolong kami dan Allah adalah sebaik-baik Pelindung." },
  { surah: "At-Talaq", ayat: 3, arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", terjemah: "Dan barangsiapa bertawakal kepada Allah, niscaya Allah akan mencukupkan keperluannya." },
  { surah: "Al-Insyirah", ayat: 6, arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", terjemah: "Sesungguhnya bersama kesulitan ada kemudahan." },
  { surah: "Az-Zumar", ayat: 53, arabic: "لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", terjemah: "Janganlah kamu berputus asa dari rahmat Allah." },
  { surah: "Al-Muzzammil", ayat: 8, arabic: "وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا", terjemah: "Sebutlah nama Tuhanmu, dan beribadahlah kepada-Nya dengan sepenuh hati." },
  { surah: "Al-Baqarah", ayat: 152, arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", terjemah: "Maka ingatlah kepada-Ku, Aku pun akan ingat kepadamu." },
];

function getDailyVerse() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

function getHijriInfo(): string {
  try {
    const formatter = new Intl.DateTimeFormat("id-TN-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    });
    return formatter.format(new Date());
  } catch {
    return "";
  }
}

interface Props { ctx: PortalContext }

export function JamaahOffTripView({ ctx }: Props) {
  const verse = useMemo(getDailyVerse, []);
  const hijriDate = useMemo(getHijriInfo, []);

  const today = new Date();
  const todayLabel = format(today, "EEEE, d MMMM yyyy", { locale: id });
  const firstName = ctx.profile?.full_name?.split(" ")[0] ?? (ctx.user ? "Jamaah" : "Tamu");

  const greetingText = () => {
    const h = today.getHours();
    if (h < 11) return "Selamat Pagi";
    if (h < 15) return "Selamat Siang";
    if (h < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Upcoming trip info
  const upcomingTrip = ctx.trip;
  const daysUntil = upcomingTrip?.daysUntilDeparture ?? null;

  return (
    <JamaahAppShell>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground px-4 pt-5 pb-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative">
          <p className="text-[11px] opacity-75">{greetingText()},</p>
          <p className="font-bold text-xl leading-tight">{firstName}</p>
          <p className="text-[11px] opacity-65 mt-0.5">{todayLabel}</p>
          {hijriDate && <p className="text-[10px] opacity-50 mt-0.5">{hijriDate}</p>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Sholat countdown hero */}
        <SholatCountdownWidget />

        {/* Quick ibadah shortcuts (8 items) */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Menu Ibadah</p>
          <IbadahShortcutsGrid tripMode={ctx.tripMode} cols={8} />
        </div>

        {/* Ayat harian */}
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/60 dark:border-emerald-800/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Ayat Hari Ini</p>
          </div>
          <p className="text-lg font-arabic text-right leading-relaxed text-foreground mb-2 font-semibold" dir="rtl">
            {verse.arabic}
          </p>
          <p className="text-[11px] text-muted-foreground italic leading-relaxed mb-1">{verse.terjemah}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            QS. {verse.surah} : {verse.ayat}
          </p>
        </div>

        {/* Upcoming trip banner */}
        {upcomingTrip && daysUntil !== null && daysUntil > 0 && (
          <Link to="/jamaah/booking" className="block">
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 flex items-center gap-3 shadow-lg shadow-amber-500/20">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Plane className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] opacity-80 uppercase tracking-wider">Perjalanan Upcoming</p>
                <p className="font-bold text-sm leading-tight line-clamp-1">{upcomingTrip.packageName}</p>
                <p className="text-[12px] opacity-90 mt-0.5">
                  {daysUntil} hari lagi · {format(new Date(upcomingTrip.departureDate), "d MMM yyyy", { locale: id })}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70 shrink-0" />
            </div>
          </Link>
        )}

        {/* Engagement links */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Ibadah & Pencapaian</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/jamaah/tracker-ibadah", icon: "📊", label: "Tracker Ibadah" },
              { to: "/jamaah/target-ibadah",  icon: "🎯", label: "Target Harian"  },
              { to: "/jamaah/jurnal",          icon: "📖", label: "Jurnal Ibadah"  },
              { to: "/jamaah/badges",          icon: "🏅", label: "Badge Ibadah"  },
              { to: "/jamaah/progress-wall",   icon: "🏆", label: "Progress Wall"  },
              { to: "/jamaah/sertifikat",      icon: "📜", label: "Sertifikat"     },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors active:scale-[0.98]"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Booking & trip section */}
        {ctx.user && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Perjalanan Saya</p>
              <Link to="/jamaah/booking" className="text-[11px] text-primary flex items-center gap-0.5">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <Link
              to="/jamaah/booking"
              className="flex items-center gap-3 p-3 rounded-2xl border bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Booking Saya</p>
                <p className="text-xs text-muted-foreground">Cek status, pembayaran & detail perjalanan</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* Promotion — only shows when showPromotion is true */}
        {ctx.showPromotion && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Temukan Paket</p>
              <Link to="/packages" className="text-[11px] text-primary flex items-center gap-0.5">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <Link
              to="/packages"
              className="flex items-center gap-3 p-3 rounded-2xl border bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Paket Umroh & Haji</p>
                <p className="text-xs text-muted-foreground">Temukan perjalanan impian Anda</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}
      </div>
    </JamaahAppShell>
  );
}
