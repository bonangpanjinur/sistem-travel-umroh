import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Compass, ListChecks, Sparkles, ShoppingBag, Wallet, Gift, ArrowRight, MapPin } from "lucide-react";
import { IslamicCard, IslamicSectionTitle } from "@/components/jamaah/shell/IslamicCard";
import { GeometricPattern, KaabaIcon } from "@/components/jamaah/ornaments/GeometricPattern";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

/** Random ayat harian (dari pool kecil offline). */
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

/** Mini countdown ke waktu sholat berikutnya (heuristik sederhana, tidak presisi). */
const PRAYERS = [
  { name: "Subuh", h: 4, m: 40 },
  { name: "Dzuhur", h: 12, m: 0 },
  { name: "Ashar", h: 15, m: 15 },
  { name: "Maghrib", h: 18, m: 0 },
  { name: "Isya", h: 19, m: 15 },
];
function nextPrayer(now = new Date()) {
  for (const p of PRAYERS) {
    const t = new Date(now); t.setHours(p.h, p.m, 0, 0);
    if (t > now) return { ...p, at: t };
  }
  const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(PRAYERS[0].h, PRAYERS[0].m, 0, 0);
  return { ...PRAYERS[0], at: t };
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

  return (
    <section className="relative islamic-surface-mihrab text-primary-foreground rounded-3xl p-5 mb-4 overflow-hidden">
      <GeometricPattern opacity={0.18} />
      <div className="relative">
        <p className="text-xs opacity-80">Assalamu'alaikum</p>
        <h2 className="font-display text-2xl font-semibold leading-tight">{name || "Jamaah"}</h2>
        <div className="flex items-center gap-1.5 mt-1 text-xs opacity-85">
          <MapPin className="h-3.5 w-3.5" />
          <span>{getHijriDate()}</span>
        </div>

        <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70">Sholat berikutnya</p>
              <p className="font-display text-lg font-semibold">{np.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider opacity-70">Dalam</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {hh.toString().padStart(2,"0")}:{mm.toString().padStart(2,"0")}
              </p>
            </div>
          </div>
          <Link to="/jamaah/waktu-sholat" className="mt-2 inline-flex items-center gap-1 text-xs text-gold-soft hover:underline">
            Lihat jadwal lengkap <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 rounded-2xl bg-black/20 p-3 text-right">
          <p className="font-arabic text-lg leading-loose" dir="rtl">{ayat.ar}</p>
          <p className="text-xs opacity-85 text-left mt-1.5">"{ayat.id}"</p>
          <p className="text-[10px] opacity-70 text-left mt-0.5">— {ayat.ref}</p>
        </div>
      </div>
    </section>
  );
}

function QuickIbadahGrid() {
  const items = [
    { to: "/jamaah/al-quran",     icon: BookOpen,  label: "Al-Qur'an" },
    { to: "/jamaah/kiblat",       icon: Compass,   label: "Kiblat" },
    { to: "/jamaah/doa-panduan",  icon: Sparkles,  label: "Doa Harian" },
    { to: "/jamaah/tracker-ibadah", icon: ListChecks, label: "Ibadah" },
  ];
  return (
    <section className="mb-4">
      <IslamicSectionTitle title="Ibadah Harian" arabic="العِبَادَة" />
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to} className="islamic-card flex flex-col items-center gap-1.5 py-3 px-1 active:scale-95 transition">
            <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-primary">
              <it.icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PackageCarousel() {
  const { data } = useQuery({
    queryKey: ["islamic-home-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, name, slug, image_url, starting_price, type")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="mb-4">
      <IslamicSectionTitle
        title="Paket Pilihan"
        arabic="بَاقَات مُخْتَارَة"
        action={<Link to="/paket" className="text-xs text-primary font-medium">Lihat semua</Link>}
      />
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
        {data.map((p: any) => (
          <Link key={p.id} to={`/paket/${p.slug || p.id}`}
                className="islamic-card flex-shrink-0 w-56 p-0 overflow-hidden snap-start">
            <div className="aspect-[4/3] bg-secondary relative">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy"/> :
                <div className="w-full h-full flex items-center justify-center text-primary"><KaabaIcon className="h-10 w-10"/></div>}
              <span className="absolute top-2 left-2 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {(p.type || "umroh").toUpperCase()}
              </span>
            </div>
            <div className="p-3">
              <p className="font-display text-sm font-semibold text-foreground line-clamp-2">{p.name}</p>
              {p.starting_price && (
                <p className="text-xs text-muted-foreground mt-1">Mulai <span className="text-primary font-semibold">{formatCurrency(p.starting_price)}</span></p>
              )}
            </div>
          </Link>
        ))}
      </div>
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
        action={<Link to="/store" className="text-xs text-primary font-medium inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3"/>Toko</Link>}
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
  const pct = saving ? Math.min(100, Math.round((paid/(target||1))*100)) : 0;

  return (
    <section className="mb-4 grid grid-cols-2 gap-3">
      <Link to="/customer/my-savings" className="islamic-card p-3 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center"><Wallet className="h-4 w-4"/></div>
          <p className="font-display text-sm font-semibold">Tabungan</p>
        </div>
        {saving ? (
          <>
            <p className="text-[11px] text-muted-foreground mt-2">{formatCurrency(paid)} / {formatCurrency(target)}</p>
            <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }}/>
            </div>
            <p className="text-[10px] text-primary font-semibold mt-1">{pct}% tercapai</p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-2">Mulai menabung untuk umroh impianmu</p>
        )}
      </Link>

      <Link to="/jamaah/referral" className="islamic-card p-3 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-accent/20 text-gold-deep flex items-center justify-center"><Gift className="h-4 w-4"/></div>
          <p className="font-display text-sm font-semibold">Referral</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Ajak saudara, dapatkan komisi tiap booking.</p>
        <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-[11px] text-primary">Bagikan kode <ArrowRight className="h-3 w-3 ml-1"/></Button>
      </Link>
    </section>
  );
}

/** Komposisi semua section monetisasi + ibadah utk dipakai di JamaahPortal home. */
export function IslamicHomeSections({ customerName, customerId }: { customerName?: string; customerId?: string }) {
  return (
    <div className="space-y-1">
      <HeroMihrab name={customerName} />
      <QuickIbadahGrid />
      <PackageCarousel />
      <StoreEtalase />
      <MonetizationDuo customerId={customerId} />
    </div>
  );
}