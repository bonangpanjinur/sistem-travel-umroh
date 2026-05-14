import { Link } from "react-router-dom";
import { CheckCircle2, Circle, UserPlus, FileText, CreditCard, Plane, ArrowRight } from "lucide-react";
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

/**
 * Guest mode: tampilkan 4 langkah pendaftaran sebagai onboarding.
 * Logged-in: tampilkan progress nyata (data, dokumen, pembayaran, keberangkatan).
 */
export function ProfileProgressCard({ isGuest, customer, booking }: Props) {
  const guestSteps: Step[] = [
    { key: "register", label: "Daftar Akun", desc: "Buat akun gratis", icon: UserPlus, done: false, href: "/auth/register" },
    { key: "profile",  label: "Lengkapi Profil", desc: "Data diri & paspor", icon: FileText, done: false, href: "/auth/register" },
    { key: "pick",     label: "Pilih Paket", desc: "Umroh / Haji", icon: Plane, done: false, href: "/packages" },
    { key: "pay",      label: "Bayar DP", desc: "Konfirmasi keberangkatan", icon: CreditCard, done: false, href: "/auth/login" },
  ];

  const userSteps: Step[] = [
    {
      key: "profile",
      label: "Profil Lengkap",
      desc: customer?.full_name ? "Data tersimpan" : "Lengkapi data diri",
      icon: UserPlus,
      done: !!customer?.full_name && !!customer?.nik,
      href: "/customer/settings",
    },
    {
      key: "documents",
      label: "Dokumen",
      desc: customer?.passport_number ? "Paspor terisi" : "Upload paspor & KTP",
      icon: FileText,
      done: !!customer?.passport_number,
      href: "/jamaah/documents",
    },
    {
      key: "booking",
      label: "Booking Aktif",
      desc: booking ? `Kode ${booking.booking_code}` : "Belum ada booking",
      icon: Plane,
      done: !!booking,
      href: booking ? "/my-bookings" : "/packages",
    },
    {
      key: "payment",
      label: "Pembayaran",
      desc: booking?.payment_status === "paid" ? "Lunas" : booking ? "DP / cicilan" : "—",
      icon: CreditCard,
      done: booking?.payment_status === "paid",
      href: "/jamaah/payment",
    },
  ];

  const steps = isGuest ? guestSteps : userSteps;
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display text-sm font-semibold text-foreground">
            {isGuest ? "Mulai Perjalanan Anda" : "Progress Anda"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isGuest ? "4 langkah mudah untuk berangkat" : `${completed} dari ${steps.length} langkah selesai`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary tabular-nums">{pct}%</p>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.key}>
              <Link
                to={s.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 transition active:scale-[0.98]",
                  s.done ? "bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border",
                    s.done ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold", s.done ? "text-foreground" : "text-foreground")}>
                    <span className="text-muted-foreground/60 mr-1">{i + 1}.</span>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                </div>
                {!s.done && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                {s.done && <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}