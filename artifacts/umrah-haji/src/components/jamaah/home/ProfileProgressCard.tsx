import { Link } from "react-router-dom";
import { CheckCircle2, UserPlus, FileText, CreditCard, Plane, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  key: string;
  label: string;
  desc: string;
  icon: any;
  done: boolean;
  href: string;
}

interface Props {
  isGuest: boolean;
  customer?: any;
  booking?: any;
}

export function ProfileProgressCard({ isGuest, customer, booking }: Props) {
  const guestSteps: Step[] = [
    { key: "register", label: "Daftar",    desc: "Buat akun gratis",       icon: UserPlus,   done: false, href: "/auth/register" },
    { key: "profile",  label: "Profil",    desc: "Data diri & paspor",     icon: FileText,   done: false, href: "/auth/register" },
    { key: "pick",     label: "Pilih",     desc: "Umroh / Haji",           icon: Plane,      done: false, href: "/packages" },
    { key: "pay",      label: "Bayar DP",  desc: "Konfirmasi keberangkatan",icon: CreditCard, done: false, href: "/auth/login" },
  ];

  const userSteps: Step[] = [
    {
      key: "profile",
      label: "Profil",
      desc: customer?.full_name ? "Lengkap" : "Belum diisi",
      icon: UserPlus,
      done: !!customer?.full_name && !!customer?.nik,
      href: "/customer/settings",
    },
    {
      key: "documents",
      label: "Dokumen",
      desc: customer?.passport_number ? "Paspor OK" : "Perlu upload",
      icon: FileText,
      done: !!customer?.passport_number,
      href: "/jamaah/documents",
    },
    {
      key: "booking",
      label: "Booking",
      desc: booking ? booking.booking_code : "Belum ada",
      icon: Plane,
      done: !!booking,
      href: booking ? "/my-bookings" : "/packages",
    },
    {
      key: "payment",
      label: "Bayar",
      desc: booking?.payment_status === "paid" ? "Lunas ✓" : booking ? "DP dulu" : "—",
      icon: CreditCard,
      done: booking?.payment_status === "paid",
      href: "/jamaah/payment",
    },
  ];

  const steps = isGuest ? guestSteps : userSteps;
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header dengan progress bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              {isGuest ? "Mulai Perjalanan" : "Progress Anda"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isGuest ? "4 langkah untuk berangkat" : `${completed} dari ${steps.length} langkah selesai`}
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary tabular-nums">{pct}</span>
            <span className="text-sm font-semibold text-primary">%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)",
            }}
          />
        </div>
      </div>

      {/* Steps — horizontal scroll row */}
      <div className="px-3 pb-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                to={s.href}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl w-[84px] shrink-0 transition active:scale-95 border",
                  s.done
                    ? "bg-primary/8 border-primary/20"
                    : "bg-muted/50 border-border/60 hover:bg-muted"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative",
                  s.done ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-muted-foreground border border-border"
                )}>
                  {s.done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  )}
                  {/* Step number badge */}
                  {!s.done && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground/20 text-[9px] font-bold text-muted-foreground flex items-center justify-center">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-[11px] font-semibold leading-tight",
                    s.done ? "text-primary" : "text-foreground"
                  )}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{s.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* CTA bottom row */}
      {!isGuest && completed < steps.length && (
        <Link
          to={steps.find(s => !s.done)?.href || "#"}
          className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <span className="text-[12px] font-medium text-foreground">
            Lanjutkan: <span className="text-primary">{steps.find(s => !s.done)?.label}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
      {isGuest && (
        <Link
          to="/auth/register"
          className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <span className="text-[12px] font-semibold text-primary">Daftar sekarang, gratis!</span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      )}
    </section>
  );
}
