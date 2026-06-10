import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, BookOpen, Heart, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { IbadahShortcutsGrid } from "@/components/jamaah/IbadahShortcutsGrid";
import { HijriDateDisplay } from "@/components/jamaah/HijriDateDisplay";
import type { PortalContext } from "@/hooks/usePortalContext";

interface Props { ctx: PortalContext }

export function MuthawifOffView({ ctx }: Props) {
  const today = new Date();
  const todayLabel = format(today, "EEEE, d MMMM yyyy", { locale: id });
  const firstName = ctx.profile?.full_name?.split(" ")[0] ?? "Ustadz/Ustadzah";

  const greeting = useMemo(() => {
    const h = today.getHours();
    if (h < 11) return "Selamat Pagi";
    if (h < 15) return "Selamat Siang";
    if (h < 18) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  return (
    <JamaahAppShell>
      {/* Header Muthawif */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 text-white px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] opacity-75">🕌 Muthawif · {greeting},</p>
            <p className="font-bold text-xl leading-tight">{firstName}</p>
            <p className="text-[11px] opacity-65 mt-0.5">{todayLabel}</p>
            <HijriDateDisplay variant="badge" className="text-white/70 mt-0.5" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
          <p className="text-[11px] opacity-80">Tidak ada keberangkatan aktif</p>
          <p className="text-xs font-semibold">Jadwal ibadah harian Anda 🤲</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        <SholatCountdownWidget />

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Menu Ibadah</p>
          <IbadahShortcutsGrid tripMode="OFF_TRIP" cols={8} />
        </div>

        {/* Link ke jadwal mendatang */}
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktivitas Muthawif</p>
          {[
            { to: "/muthawif/dashboard", icon: "📋", label: "Dashboard Muthawif", desc: "Lihat jadwal dan riwayat keberangkatan" },
            { to: "/jamaah/tracker-ibadah", icon: "📊", label: "Tracker Ibadah Saya", desc: "Pantau progress ibadah harian" },
            { to: "/jamaah/jurnal", icon: "📖", label: "Jurnal Ibadah", desc: "Catat pengalaman dan catatan ibadah" },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors active:scale-[0.98]"
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>

        {/* Jadwal & link ke paket */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Temukan Paket</p>
          <Link
            to="/packages"
            className="flex items-center gap-3 p-3 rounded-2xl border bg-card hover:bg-muted/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Paket Umroh & Haji</p>
              <p className="text-xs text-muted-foreground">Lihat semua keberangkatan mendatang</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </JamaahAppShell>
  );
}
