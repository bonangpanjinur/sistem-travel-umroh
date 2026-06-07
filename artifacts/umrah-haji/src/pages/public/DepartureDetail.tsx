import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useSEO } from "@/hooks/useSEO";
import { slugify, extractIdFromSlug } from "@/lib/slug";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Plane,
  Users,
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Phone,
  ArrowLeft,
  BedDouble,
  UserCheck,
  AlertCircle,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateId(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMMM yyyy", { locale: localeId });
}

function formatDateShort(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMMM yyyy", { locale: localeId });
}

function getDurationDays(dep: any): number | null {
  if (dep.package?.duration_days) return dep.package.duration_days;
  if (dep.departure_date && dep.return_date) {
    const d1 = new Date(dep.departure_date);
    const d2 = new Date(dep.return_date);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  return null;
}

function getLowestPrice(dep: any): number | null {
  const candidates = [
    dep.price_quad,
    dep.price_triple,
    dep.price_double,
    dep.price_single,
    dep.price_adult,
  ].filter((p): p is number => typeof p === "number" && p > 0);
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

function buildDepartureSlug(dep: any): string {
  return dep.slug || `${dep.id}-${slugify(dep.package?.name || "keberangkatan")}`;
}

function StarRow({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

// ── Pricing row ───────────────────────────────────────────────────────────────

function PriceRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: number | null | undefined;
  highlight?: boolean;
}) {
  if (!price || price <= 0) return null;
  return (
    <div
      className={`flex items-center justify-between py-3 px-4 rounded-lg ${
        highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/40"
      }`}
    >
      <span className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>
        {label}
      </span>
      <span className={`font-bold ${highlight ? "text-primary text-lg" : "text-foreground"}`}>
        {formatCurrency(price)}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DepartureDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: settings } = useWebsiteSettings();

  const siteTitle = settings?.company_name || "Vinstour Travel";
  const ogFallback = `${typeof window !== "undefined" ? window.location.origin : ""}${(settings as any)?.og_image_url || "/opengraph.jpg"}`;

  // ── Data fetch: custom slug first, then id-slug fallback ──────────────────
  const { data: dep, isLoading, isError } = useQuery({
    queryKey: ["public-departure-detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const SELECT = `
        *,
        package:packages(
          id, name, package_type, duration_days, is_active,
          description, featured_image
        ),
        airline:airlines(id, name, code),
        hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, star_rating, city),
        hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, star_rating, city),
        departure_airport:airports!departures_departure_airport_id_fkey(id, name, code, city),
        arrival_airport:airports!departures_arrival_airport_id_fkey(id, name, code, city),
        muthawif:employees!departures_muthawif_id_fkey(id, full_name),
        team_leader:employees!departures_team_leader_id_fkey(id, full_name)
      `;

      // 1. Try by custom slug field
      const { data: bySlug } = await supabase
        .from("departures")
        .select(SELECT)
        .eq("slug", slug!)
        .maybeSingle();
      if (bySlug) return bySlug;

      // 2. Try by UUID extracted from id-slug pattern
      const id = extractIdFromSlug(slug!);
      if (id) {
        const { data: byId, error } = await supabase
          .from("departures")
          .select(SELECT)
          .eq("id", id)
          .maybeSingle();
        if (byId) return byId;
        if (error) throw error;
      }

      return null;
    },
  });

  // Redirect if not found after load
  useEffect(() => {
    if (!isLoading && !isError && dep === null) {
      navigate("/departures", { replace: true });
    }
  }, [isLoading, isError, dep, navigate]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const availableSlots = dep ? dep.quota - (dep.booked_count || 0) : 0;
  const isFull = availableSlots <= 0;
  const duration = dep ? getDurationDays(dep) : null;
  const lowestPrice = dep ? getLowestPrice(dep) : null;
  const packageSlug = dep?.package
    ? `${dep.package.id}-${slugify(dep.package.name)}`
    : null;
  const depMonth = dep?.departure_date ? formatDateShort(dep.departure_date) : null;
  const depTitle = dep
    ? `${dep.package?.name || "Keberangkatan"} — ${depMonth}`
    : "Jadwal Keberangkatan";

  const metaTitle =
    dep?.meta_title ||
    (dep ? `${depTitle} | ${siteTitle}` : siteTitle);
  const metaDesc =
    dep?.meta_description ||
    (dep
      ? `Jadwal keberangkatan ${dep.package?.name || "Umroh"} bulan ${depMonth} bersama ${siteTitle}. ${duration ? `${duration} hari` : ""} · Sisa ${availableSlots} kursi${lowestPrice ? ` · Mulai ${formatCurrency(lowestPrice)}` : ""}.`
      : "");

  const depSlugPath = dep ? `/departures/${buildDepartureSlug(dep)}` : null;
  const ogImage =
    dep?.package?.featured_image ||
    (settings as any)?.og_image_url ||
    ogFallback;

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLd = dep
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Beranda",
                item: `${window.location.origin}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Jadwal Keberangkatan",
                item: `${window.location.origin}/departures`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: depTitle,
                item: `${window.location.origin}${depSlugPath}`,
              },
            ],
          },
          {
            "@type": "Event",
            name: depTitle,
            description: metaDesc,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode:
              "https://schema.org/OfflineEventAttendanceMode",
            startDate: dep.departure_date,
            ...(dep.return_date ? { endDate: dep.return_date } : {}),
            image: ogImage,
            organizer: {
              "@type": "TravelAgency",
              name: siteTitle,
              url: window.location.origin,
            },
            location: {
              "@type": "Place",
              name: "Makkah & Madinah",
              address: {
                "@type": "PostalAddress",
                addressCountry: "SA",
              },
            },
            ...(lowestPrice
              ? {
                  offers: {
                    "@type": "Offer",
                    price: lowestPrice,
                    priceCurrency: "IDR",
                    availability: isFull
                      ? "https://schema.org/SoldOut"
                      : "https://schema.org/InStock",
                    url: `${window.location.origin}${depSlugPath}`,
                  },
                }
              : {}),
          },
        ],
      }
    : null;

  useSEO(
    dep
      ? {
          title: metaTitle,
          description: metaDesc,
          ogType: "article",
          ogImage,
          siteName: siteTitle,
          canonicalPath: depSlugPath || `/departures/${slug}`,
          robots: "index, follow",
          jsonLd: jsonLd!,
          schemaId: `departure-${dep?.id || "detail"}`,
        }
      : null,
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  if (!dep) return null;

  const whatsappMsg = encodeURIComponent(
    `Halo ${siteTitle}, saya tertarik dengan jadwal *${depTitle}*. Mohon informasi lebih lanjut.`,
  );
  const waNumber = (settings as any)?.whatsapp_number?.replace(/\D/g, "") || "";
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${whatsappMsg}`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">Beranda</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/departures" className="hover:text-foreground transition-colors">Jadwal Keberangkatan</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{depTitle}</span>
        </nav>

        {/* ── Hero card ── */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-8">
          {dep.package?.featured_image && (
            <div className="relative h-52 md:h-64 overflow-hidden">
              <img
                src={dep.package.featured_image}
                alt={dep.package.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h1 className="text-white text-2xl md:text-3xl font-bold drop-shadow">
                  {dep.package?.name}
                </h1>
                <p className="text-white/85 text-sm mt-1">{depMonth}</p>
              </div>
            </div>
          )}

          <div className={`p-5 ${!dep.package?.featured_image ? "pt-6" : ""}`}>
            {!dep.package?.featured_image && (
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{dep.package?.name || "Jadwal Keberangkatan"}</h1>
                <p className="text-muted-foreground mt-1">{depMonth}</p>
              </div>
            )}

            {/* status + slots */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Badge variant={isFull ? "destructive" : availableSlots <= 5 ? "secondary" : "default"}>
                {isFull ? "Penuh" : `Sisa ${availableSlots} kursi`}
              </Badge>
              {dep.package?.package_type && (
                <Badge variant="outline" className="capitalize">
                  {dep.package.package_type.replace(/_/g, " ")}
                </Badge>
              )}
              {dep.status && dep.status !== "open" && (
                <Badge variant="outline">{dep.status}</Badge>
              )}
            </div>

            {/* Key stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard icon={<Calendar className="h-4 w-4" />} label="Berangkat" value={formatDateId(dep.departure_date)} />
              <StatCard icon={<Calendar className="h-4 w-4" />} label="Kembali" value={formatDateId(dep.return_date)} />
              {duration && (
                <StatCard icon={<Clock className="h-4 w-4" />} label="Durasi" value={`${duration} hari`} />
              )}
              <StatCard icon={<Users className="h-4 w-4" />} label="Kuota" value={`${dep.quota} orang`} />
            </div>

            {/* Price + CTA */}
            {lowestPrice && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Harga mulai dari</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(lowestPrice)}</p>
                </div>
                {!isFull ? (
                  <Button size="lg" asChild className="w-full sm:w-auto px-8">
                    <Link to={`/booking/${dep.package_id}?departureId=${dep.id}`}>
                      Daftar Sekarang
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" disabled className="w-full sm:w-auto px-8" variant="outline">
                    Sudah Penuh
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: details ── */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            {dep.package?.description && (
              <Section title="Tentang Paket">
                <div 
                  className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: dep.package.description }}
                />
              </Section>
            )}

            {/* Facilities / Logistics */}
            <div className="grid md:grid-cols-2 gap-4">
              <Section title="Penerbangan">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center">
                      <Plane className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Maskapai</p>
                      <p className="text-sm font-medium">{dep.airline?.name || "Akan diinfokan"}</p>
                      {dep.flight_number && <p className="text-[10px] text-muted-foreground">Flight: {dep.flight_number}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rute</p>
                      <p className="text-sm">
                        {dep.departure_airport?.city || "Jakarta"} ({dep.departure_airport?.code || "CGK"})
                        <ChevronRight className="inline h-3 w-3 mx-1" />
                        {dep.arrival_airport?.city || "Jeddah"} ({dep.arrival_airport?.code || "JED"})
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Akomodasi">
                <div className="space-y-4">
                  {dep.hotel_makkah && (
                    <HotelRow 
                      icon={<BedDouble className="h-4 w-4 text-muted-foreground mt-0.5" />}
                      city="Makkah"
                      name={dep.hotel_makkah.name}
                      stars={dep.hotel_makkah.star_rating}
                    />
                  )}
                  {dep.hotel_madinah && (
                    <HotelRow 
                      icon={<BedDouble className="h-4 w-4 text-muted-foreground mt-0.5" />}
                      city="Madinah"
                      name={dep.hotel_madinah.name}
                      stars={dep.hotel_madinah.star_rating}
                    />
                  )}
                </div>
              </Section>
            </div>

            {/* Team */}
            {(dep.muthawif || dep.team_leader) && (
              <Section title="Pendamping">
                <div className="grid sm:grid-cols-2 gap-4">
                  {dep.muthawif && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <UserCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Muthawif</p>
                        <p className="text-sm font-medium">{dep.muthawif.full_name}</p>
                      </div>
                    </div>
                  )}
                  {dep.team_leader && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Team Leader</p>
                        <p className="text-sm font-medium">{dep.team_leader.full_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Deadlines */}
            {(dep.payment_deadline || dep.document_deadline || dep.visa_deadline) && (
              <Section title="Batas Waktu Penting">
                <div className="space-y-3">
                  {dep.payment_deadline && (
                    <div className="flex justify-between items-center text-sm border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Pelunasan Pembayaran</span>
                      <span className="font-medium text-destructive">{formatDateId(dep.payment_deadline)}</span>
                    </div>
                  )}
                  {dep.document_deadline && (
                    <div className="flex justify-between items-center text-sm border-b border-dashed pb-2">
                      <span className="text-muted-foreground">Penyerahan Dokumen</span>
                      <span className="font-medium">{formatDateId(dep.document_deadline)}</span>
                    </div>
                  )}
                  {dep.visa_deadline && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Proses Visa</span>
                      <span className="font-medium">{formatDateId(dep.visa_deadline)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Mohon pastikan semua persyaratan terpenuhi sebelum batas waktu yang ditentukan untuk menjamin keberangkatan Anda.
                  </p>
                </div>
              </Section>
            )}

            {/* Back link */}
            <div className="pt-2">
              <Button variant="ghost" asChild className="text-muted-foreground">
                <Link to="/departures">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Lihat semua jadwal
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Right: pricing sidebar ── */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm sticky top-20">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-primary" />
                Harga per Tipe Kamar
              </h2>
              <div className="space-y-2">
                <PriceRow label="Quad (4 orang)" price={dep.price_quad} />
                <PriceRow label="Triple (3 orang)" price={dep.price_triple} />
                <PriceRow label="Double (2 orang)" price={dep.price_double} highlight />
                <PriceRow label="Single (1 orang)" price={dep.price_single} />
              </div>

              {(dep.price_adult || dep.price_child || dep.price_infant) && (
                <>
                  <Separator className="my-3" />
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Harga per Usia
                  </h3>
                  <div className="space-y-2">
                    <PriceRow label="Dewasa" price={dep.price_adult} />
                    <PriceRow label="Anak" price={dep.price_child} />
                    <PriceRow label="Bayi" price={dep.price_infant} />
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {!isFull ? (
                <Button asChild className="w-full">
                  <Link to={`/booking/${dep.package_id}?departureId=${dep.id}`}>
                    Daftar Sekarang
                  </Link>
                </Button>
              ) : (
                <Button disabled className="w-full" variant="outline">
                  Kursi Penuh
                </Button>
              )}

              {waLink && (
                <Button variant="outline" asChild className="w-full mt-2">
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4 mr-1.5" />
                    Konsultasi via WhatsApp
                  </a>
                </Button>
              )}

              {packageSlug && (
                <Button variant="ghost" asChild className="w-full mt-1 text-muted-foreground text-xs">
                  <Link to={`/packages/${packageSlug}`}>
                    Lihat detail paket →
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold text-base mb-3 text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function HotelRow({
  icon,
  city,
  name,
  stars,
}: {
  icon: React.ReactNode;
  city: string;
  name: string;
  stars: number | null;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{city}</p>
        <p className="text-sm font-medium">{name}</p>
        <StarRow count={stars} />
      </div>
    </div>
  );
}
