import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Package, Clock, Hotel, Plane, Users, Star,
  ChevronRight, MapPin, Calendar, CreditCard, Phone, Loader2,
  CheckCircle, Info
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

const TYPE_LABELS: Record<string, string> = {
  umroh: "Umroh", haji: "Haji", haji_plus: "Haji Plus", umroh_plus: "Umroh Plus",
};

function PriceRow({ label, price, currency }: { label: string; price?: number | null; currency?: string }) {
  if (!price) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-sm">{formatCurrency(price, currency)}</span>
    </div>
  );
}

export default function JamaahDetailPaket() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  // Extract package ID from slug (format: {id}-{name-slug})
  const packageId = slug?.split("-")[0];

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["jamaah-package-detail", packageId],
    queryFn: async () => {
      if (!packageId) return null;
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id, name, package_type, duration_days, currency, short_description, description,
          price_quad, price_triple, price_double, price_single,
          price_child, price_infant, quota, is_featured, featured_image, gallery_images,
          facilities, includes, excludes
        `)
        .eq("id", packageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  const { data: departures } = useQuery({
    queryKey: ["jamaah-package-departures", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, available_seats, price_adjustment,
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating, city),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating, city),
          airline:airlines(name, code)
        `)
        .eq("package_id", packageId)
        .eq("is_active", true)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!packageId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
        <JamaahBottomNav />
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
        <JamaahBottomNav />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-semibold">Paket tidak ditemukan</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/jamaah/paket"><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Link>
          </Button>
        </div>
      </div>
    );
  }

  const prices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
    .map(Number).filter(v => v > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

  const facilities: string[] = Array.isArray(pkg.facilities) ? pkg.facilities : [];
  const includes: string[] = Array.isArray(pkg.includes) ? pkg.includes :
    typeof pkg.includes === "string" ? [pkg.includes] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
      <JamaahBottomNav />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link to="/jamaah/paket" className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-base line-clamp-1">{pkg.name}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto md:ml-64 space-y-4 py-4 px-4">

        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden h-52 bg-muted relative">
          {pkg.featured_image ? (
            <img src={pkg.featured_image} alt={pkg.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Package className="h-16 w-16 text-primary/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm">
                {TYPE_LABELS[pkg.package_type] || pkg.package_type}
              </Badge>
              <Badge className="text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm">
                <Clock className="h-2.5 w-2.5 mr-1" />{pkg.duration_days} Hari
              </Badge>
              {pkg.is_featured && (
                <Badge className="text-[10px] bg-amber-400 text-amber-900 border-0">
                  <Star className="h-2.5 w-2.5 mr-1 fill-current" />Unggulan
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Price card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Harga mulai dari</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(lowestPrice, pkg.currency)}</p>
                <p className="text-[11px] text-muted-foreground">per orang</p>
              </div>
              {user ? (
                <Button asChild size="sm" className="font-semibold">
                  <Link to="/jamaah/booking">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Booking
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="font-semibold">
                  <Link to="/auth/login">
                    Masuk untuk Booking
                  </Link>
                </Button>
              )}
            </div>
            <Separator className="mb-3" />
            <div className="space-y-0">
              <PriceRow label="Kamar Quad (4 orang)" price={pkg.price_quad} currency={pkg.currency} />
              <PriceRow label="Kamar Triple (3 orang)" price={pkg.price_triple} currency={pkg.currency} />
              <PriceRow label="Kamar Double (2 orang)" price={pkg.price_double} currency={pkg.currency} />
              <PriceRow label="Kamar Single (1 orang)" price={pkg.price_single} currency={pkg.currency} />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {(pkg.short_description || pkg.description) && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Deskripsi Paket
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pkg.short_description || pkg.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Includes */}
        {includes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Sudah Termasuk
              </h3>
              <ul className="space-y-1.5">
                {includes.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Departures */}
        {departures && departures.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Jadwal Keberangkatan
              </h3>
              <div className="space-y-3">
                {(departures as any[]).map((dep) => {
                  const depDate = dep.departure_date ? new Date(dep.departure_date) : null;
                  const retDate = dep.return_date ? new Date(dep.return_date) : null;
                  return (
                    <div key={dep.id} className="rounded-xl bg-muted/50 p-3 border border-border/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Plane className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-semibold">
                            {depDate ? depDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                        </div>
                        {dep.available_seats !== null && (
                          <Badge variant="outline" className="text-[10px]">
                            <Users className="h-2.5 w-2.5 mr-1" />{dep.available_seats} kursi
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {dep.airline?.name && (
                          <p className="flex items-center gap-1">
                            <Plane className="h-3 w-3" /> {dep.airline.name}
                          </p>
                        )}
                        {dep.hotel_makkah?.name && (
                          <p className="flex items-center gap-1">
                            <Hotel className="h-3 w-3" /> Makkah: {dep.hotel_makkah.name} ⭐{dep.hotel_makkah.star_rating}
                          </p>
                        )}
                        {dep.hotel_madinah?.name && (
                          <p className="flex items-center gap-1">
                            <Hotel className="h-3 w-3" /> Madinah: {dep.hotel_madinah.name} ⭐{dep.hotel_madinah.star_rating}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="font-semibold text-sm mb-1">Tertarik dengan paket ini?</p>
            <p className="text-xs text-muted-foreground mb-3">Hubungi kami atau daftar booking sekarang</p>
            <div className="flex gap-2">
              {user ? (
                <Button asChild className="flex-1">
                  <Link to="/jamaah/booking">
                    <CreditCard className="h-4 w-4 mr-2" /> Booking Sekarang
                  </Link>
                </Button>
              ) : (
                <Button asChild className="flex-1">
                  <Link to="/auth/login">Masuk untuk Booking</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1">
                <Link to="/jamaah/chatbot">
                  <Phone className="h-4 w-4 mr-2" /> Tanya AI
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
