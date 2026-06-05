import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, ChevronRight, X, Calendar, CreditCard, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "jamaah-portal-banner-dismissed";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function greetingText(): string {
  const h = new Date().getHours();
  if (h < 5) return "Selamat Malam";
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 19) return "Selamat Sore";
  return "Selamat Malam";
}

function statusConfig(status: string) {
  switch (status) {
    case "confirmed": return { label: "Dikonfirmasi", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "paid":      return { label: "Lunas", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" };
    case "pending":   return { label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" };
    default:          return { label: status, color: "bg-muted text-muted-foreground border-border" };
  }
}

export function JamaahPortalBanner() {
  const { user, hasRole } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [visible, setVisible] = useState(false);

  // Animate in after mount
  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [dismissed]);

  // Fetch customer account
  const { data: customer } = useQuery({
    queryKey: ["portal-banner-customer", user?.id],
    enabled: !!user?.id && hasRole("jamaah"),
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_accounts" as any)
        .select("id, full_name, photo_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { id: string; full_name: string; photo_url?: string } | null;
    },
  });

  // Fetch latest booking
  const { data: booking } = useQuery({
    queryKey: ["portal-banner-booking", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status,
          departures(departure_date, return_date, packages(name))
        `)
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  if (!user || !hasRole("jamaah") || dismissed) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    }, 250);
  };

  const firstName = customer?.full_name?.split(" ")[0] ?? "Jamaah";
  const initials = customer?.full_name ? getInitials(customer.full_name) : "J";

  const dep = booking?.departures;
  const departureDate: string | null = dep?.departure_date ?? null;
  const packageName: string | null = dep?.packages?.name ?? null;
  const daysLeft = departureDate
    ? differenceInDays(new Date(departureDate), new Date())
    : null;
  const bookingStatus: string | null = booking?.booking_status ?? null;
  const status = bookingStatus ? statusConfig(bookingStatus) : null;

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out overflow-hidden",
        visible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <section className="px-4 py-3">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-sm">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/85" />
          {/* Subtle pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 50%, white 1px, transparent 1px), radial-gradient(circle at 85% 20%, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 z-10 p-1 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-3.5 w-3.5 text-white/80" />
          </button>

          <div className="relative flex items-center gap-3 px-4 py-3 pr-9">
            {/* Avatar */}
            <div className="shrink-0 h-11 w-11 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-sm">
              {customer?.photo_url ? (
                <img
                  src={customer.photo_url}
                  alt={firstName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">{initials}</span>
              )}
            </div>

            {/* Text + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/70 font-medium leading-none mb-0.5">
                {greetingText()},
              </p>
              <p className="text-sm font-bold text-white leading-tight truncate">
                {firstName}
              </p>

              {/* Booking pills */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {status && (
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", status.color)}>
                    <CheckCircle className="h-2.5 w-2.5" />
                    {status.label}
                  </span>
                )}
                {packageName && (
                  <span className="inline-flex items-center gap-1 bg-white/15 text-white text-[10px] px-2 py-0.5 rounded-full font-medium max-w-[140px] truncate">
                    <Plane className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{packageName}</span>
                  </span>
                )}
                {daysLeft !== null && daysLeft >= 0 && (
                  <span className="inline-flex items-center gap-1 bg-white/15 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    <Calendar className="h-2.5 w-2.5" />
                    {daysLeft === 0 ? "Hari ini!" : `${daysLeft} hari lagi`}
                  </span>
                )}
                {!booking && (
                  <span className="inline-flex items-center gap-1 bg-white/15 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    <Clock className="h-2.5 w-2.5" />
                    Belum ada booking
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/jamaah"
              className="shrink-0 inline-flex items-center gap-1.5 bg-white text-primary text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-sm"
            >
              Portal
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
