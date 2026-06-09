import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Compass, ListChecks, Sparkles, ShoppingBag, Wallet, Gift, ArrowRight, MapPin, Clock } from "lucide-react";
import { IslamicCard, IslamicSectionTitle } from "@/components/jamaah/shell/IslamicCard";
import { GeometricPattern, MosqueSilhouette } from "@/components/jamaah/ornaments/GeometricPattern";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { LazyMount } from "@/components/utils/LazyMount";

const PromoBannerCarousel = lazy(() =>
  import("@/components/jamaah/home/PromoBannerCarousel").then(m => ({ default: m.PromoBannerCarousel }))
);
const PackageGridApp = lazy(() =>
  import("@/components/jamaah/home/PackageGridApp").then(m => ({ default: m.PackageGridApp }))
);

function BannerSkeleton() {
  return <div className="mb-4 -mt-1 aspect-[16/8] rounded-3xl bg-muted animate-pulse" />;
}
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-muted aspect-[3/4] animate-pulse" />
      ))}
    </div>
  );
}

const AYAT_POOL = [
  { ar: "وَأَتِمُّوا۟ ٱلْحَجَّ وَٱلْعُمْرَةَ لِلَّهِ", id: "Dan sempurnakanlah ibadah haji dan umrah karena Allah.", ref: "QS. Al-Baqarah: 196" },
  { ar: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا", id: "Sesungguhnya bersama kesulitan ada kemudahan.", ref: "QS. Al-Insyirah: 6" },
  { ar: "وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥ", id: "Dan barangsiapa bertawakal kepada Allah, niscaya Allah akan mencukupkannya.", ref: "QS. At-Talaq: 3" },
  { ar: "ٱدْعُونِىٓ أَسْتَجِبْ لَكُمْ", id: "Berdoalah kepada-Ku, niscaya akan Aku perkenankan bagimu.", ref: "QS. Ghafir: 60" },
];

function getHijriDate(): string {
  try {
    return new Intl.DateTimeFormat("id-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).format(new Date()) + " H";
  } catch { return ""; }
}

const PRAYERS = [
  { name: "Subuh",   h: 4,  m: 40 },
  { name: "Dzuhur",  h: 12, m: 0  },
  { name: "Ashar",   h: 15, m: 15 },
  { name: "Maghrib", h: 18, m: 0  },
  { name: "Isya",    h: 19, m: 15 },
];

function nextPrayer(now = new Date()) {
  for (const p of PRAYERS) {
    const t = new Date(now); t.setHours(p.h, p.m, 0, 0);
    if (t > now) return { ...p, at: t };
  }
  const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(PRAYERS[0].h, PRAYERS[0].m, 0, 0);
  return { ...PRAYERS[0], at: t };
}

function getInitials(name?: string) {
  if (!name) return "J";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function HeroMihrab({ name }: { name?: string }) {
  const ayat = useMemo(() => AYAT_POOL[new Date().getDate() % AYAT_POOL.length], []);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const np = nextPrayer(now);
  const diff = Math.max(0, np.at.getTime() - now.getTime());
  const hh = Math.floor(diff / 3_600_000);
  const mm = Math.floor((diff % 3_600_000) / 60_000);
  const hijri = getHijriDate();

  return (
    <section className="relative islamic-surface-mihrab text-primary-foreground rounded-3xl overflow-hidden mb-4">
      <GeometricPattern opacity={0.12} />

      {/* Top row: greeting + avatar */}
      <div className="relative px-5 pt-5 pb-0 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium tracking-widest uppercase opacity-70 mb-0.5">
            Assalamu'alaikum
          </p>
          <h2 className="font-display text-[26px] font-bold leading-tight truncate">
            {name?.split(" ")[0] || "Jamaah"} 👋
          </h2>
          {hijri && (
            <div className="flex items-center gap-1 mt-1 text-[11px] opacity-75">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{hijri}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
          <span className="font-bold text-lg text-white">{getInitials(name)}</span>
        </div>
      </div>

      {/* Prayer countdown card */}
      <div className="relative px-5 pt-4 pb-0">
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Clock className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-65">Sholat berikutnya</p>
              <p className="font-display text-lg font-bold leading-tight">{np.name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider opacity-65">Dalam</p>
            <p className="font-mono text-2xl font-bold tabular-nums leading-tight">
              {hh > 0 ? `${hh}j ` : ""}{mm.toString().padStart(2, "0")}m
            </p>
          </div>
        </div>
        <Link
          to="/jamaah/waktu-sholat"
          className="mt-2 flex items-center justify-center gap-1 text-[11px] opacity-75 hover:opacity-100 transition-opacity py-1"
        >
          Jadwal lengkap <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Ayat harian */}
      <div className="relative px-5 pt-1 pb-4">
        <div className="rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
          <p className="font-arabic text-xl leading-loose text-right opacity-95" dir="rtl">{ayat.ar}</p>
          <div className="h-px bg-white/10 my-2" />
          <p className="text-[11px] leading-relaxed opacity-85 italic">"{ayat.id}"</p>
          <p className="text-[10px] opacity-60 mt-0.5 font-medium">— {ayat.ref}</p>
        </div>
      </div>

      {/* Mosque silhouette bottom decoration */}
      <div className="relative opacity-10 -mb-1">
        <MosqueSilhouette className="w-full h-10" />
      </div>
    </section>
  );
}

function QuickIbadahGrid() {
  const items = [
    { to: "/jamaah/al-quran",       icon: BookOpen,   label: "Al-Qur'an",  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { to: "/jamaah/kiblat",         icon: Compass,    label: "Kiblat",     color: "text-sky-600 dark:text-sky-400",     bg: "bg-sky-50 dark:bg-sky-950/40" },
    { to: "/jamaah/doa-panduan",    icon: Sparkles,   label: "Doa Harian", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { to: "/jamaah/tracker-ibadah", icon: ListChecks, label: "Ibadah",     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
  ];
  return (
    <section className="mb-4">
      <IslamicSectionTitle title="Ibadah Harian" arabic="العِبَادَة" />
      <div className="grid grid-cols-4 gap-2.5">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl bg-card border border-border/60 shadow-sm active:scale-95 transition-transform"
          >
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${it.bg}`}>
              <it.icon className={`h-5 w-5 ${it.color}`} />
            </div>
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PackageSection() {
  return (
    <section className="mb-4">
      <IslamicSectionTitle
        title="Paket Pilihan"
        arabic="بَاقَات مُخْتَارَة"
        action={<Link to="/jamaah/paket" className="text-xs text-primary font-semibold flex items-center gap-0.5">Semua <ArrowRight className="h-3 w-3" /></Link>}
      />
      <LazyMount minHeight={320} rootMargin="300px">
        <Suspense fallback={<GridSkeleton />}>
          <PackageGridApp limit={6} />
        </Suspense>
      </LazyMount>
    </section>
  );
}

function StoreEtalase() {
  const { data } = useQuery({
    queryKey: ["islamic-home-store"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_products")
        .select("id, name, image_url, price, slug")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="mb-4">
      <IslamicSectionTitle
        title="Perlengkapan Umroh"
        arabic="مُسْتَلْزَمَات"
        action={<Link to="/store" className="text-xs text-primary font-semibold inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3"/>Toko</Link>}
      />
      <div className="grid grid-cols-2 gap-3">
        {data.map((p: any) => (
          <Link key={p.id} to={`/store/produk/${p.slug || p.id}`} className="islamic-card p-0 overflow-hidden">
            <div className="aspect-square bg-secondary">
              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy"/>}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-foreground line-clamp-2">{p.name}</p>
              <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MonetizationDuo({ customerId }: { customerId?: string }) {
  const { data: saving } = useQuery({
    queryKey: ["islamic-home-saving", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data } = await supabase
        .from("savings_plans")
        .select("id, target_amount, paid_amount")
        .eq("customer_id", customerId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
  const paid = (saving as any)?.paid_amount || 0;
  const target = (saving as any)?.target_amount || 0;
  const pct = saving ? Math.min(100, Math.round((paid / (target || 1)) * 100)) : 0;

  return (
    <section className="mb-4 grid grid-cols-2 gap-3">
      <Link to="/customer/my-savings" className="islamic-card p-3.5 relative overflow-hidden flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="font-display text-sm font-semibold">Tabungan</p>
        </div>
        {saving ? (
          <>
            <p className="text-[11px] text-muted-foreground">{formatCurrency(paid)} / {formatCurrency(target)}</p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-primary font-semibold">{pct}% tercapai</p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Mulai menabung untuk umroh impianmu</p>
        )}
      </Link>

      <Link to="/jamaah/referral" className="islamic-card p-3.5 relative overflow-hidden flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-accent/20 text-gold-deep flex items-center justify-center shrink-0">
            <Gift className="h-4 w-4" />
          </div>
          <p className="font-display text-sm font-semibold">Referral</p>
        </div>
        <p className="text-[11px] text-muted-foreground flex-1">Ajak saudara, dapatkan komisi tiap booking.</p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-primary self-start -ml-2">
          Bagikan kode <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </section>
  );
}

export function IslamicHomeSections({ customerName, customerId }: { customerName?: string; customerId?: string }) {
  return (
    <div className="space-y-1">
      <HeroMihrab name={customerName} />
      <LazyMount minHeight={180} rootMargin="150px">
        <Suspense fallback={<BannerSkeleton />}>
          <PromoBannerCarousel />
        </Suspense>
      </LazyMount>
      <QuickIbadahGrid />
      <PackageSection />
      <StoreEtalase />
      <MonetizationDuo customerId={customerId} />
    </div>
  );
}
