import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Hand, QrCode, FolderOpen, CreditCard, Bell,
  MapPin, Phone, BookOpen, CheckCircle, ArrowRight,
  CalendarDays, HelpCircle, Star, Clock
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const WELCOME_SEEN_KEY = "jamaah-welcome-seen";

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  highlights?: { icon: React.ReactNode; label: string }[];
  color: string;
  bg: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    icon: <Hand className="h-16 w-16" />,
    title: "Selamat Datang!",
    subtitle: "Portal Jamaah Umroh & Haji",
    description:
      "Selamat bergabung! Portal ini adalah pendamping digital Anda selama persiapan hingga kepulangan ibadah. Semua informasi penting tersedia di sini.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: 2,
    icon: <QrCode className="h-16 w-16" />,
    title: "ID Digital Jamaah",
    subtitle: "Identitas Resmi Anda",
    description:
      "ID digital berisi QR Code, data diri, dan informasi booking Anda. Tunjukkan saat check-in bandara, hotel, dan kegiatan ibadah.",
    highlights: [
      { icon: <QrCode className="h-4 w-4" />, label: "QR Code untuk check-in" },
      { icon: <Star className="h-4 w-4" />, label: "Bagikan via WhatsApp" },
      { icon: <CreditCard className="h-4 w-4" />, label: "Info booking lengkap" },
    ],
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: 3,
    icon: <FolderOpen className="h-16 w-16" />,
    title: "Kelola Dokumen",
    subtitle: "Upload & Pantau Status",
    description:
      "Upload paspor, KTP, foto, dan dokumen lainnya. Tim admin akan memverifikasi dalam 1×24 jam. Pantau progress kelengkapan dokumen Anda.",
    highlights: [
      { icon: <CheckCircle className="h-4 w-4" />, label: "Upload paspor & KTP" },
      { icon: <Clock className="h-4 w-4" />, label: "Verifikasi dalam 24 jam" },
      { icon: <Bell className="h-4 w-4" />, label: "Notifikasi status dokumen" },
    ],
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    id: 4,
    icon: <CreditCard className="h-16 w-16" />,
    title: "Pantau Pembayaran",
    subtitle: "Transparansi Penuh",
    description:
      "Lihat riwayat semua pembayaran, upload bukti transfer, dan pantau progress pelunasan biaya perjalanan Anda secara real-time.",
    highlights: [
      { icon: <ArrowRight className="h-4 w-4" />, label: "Upload bukti bayar" },
      { icon: <CheckCircle className="h-4 w-4" />, label: "Verifikasi otomatis" },
      { icon: <Star className="h-4 w-4" />, label: "Download invoice PDF" },
    ],
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: 5,
    icon: <BookOpen className="h-16 w-16" />,
    title: "Fitur Lengkap",
    subtitle: "Semua yang Anda Butuhkan",
    description:
      "Jadwal waktu sholat Makkah & Madinah, panduan ibadah, itinerary perjalanan, peta lokasi, dan kalkulator kurs riyal — semua ada di portal ini!",
    highlights: [
      { icon: <MapPin className="h-4 w-4" />, label: "Peta & lokasi hotel" },
      { icon: <CalendarDays className="h-4 w-4" />, label: "Jadwal & itinerary" },
      { icon: <HelpCircle className="h-4 w-4" />, label: "Dukungan 24 jam" },
    ],
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function JamaahWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSetting } = useCompanySettings();
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (seen === "true") {
      navigate("/jamaah", { replace: true });
    }
  }, [navigate]);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-welcome-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          booking_code, booking_status, total_price, paid_amount,
          departure:departures(
            departure_date,
            package:packages(name, duration_days)
          )
        `)
        .eq("customer_id", customer.id)
        .neq("booking_status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const goNext = () => {
    if (animating) return;
    if (step < STEPS.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 150);
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (animating || step === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 150);
  };

  const handleFinish = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, "true");
    navigate("/jamaah", { replace: true });
  };

  const currentStep = STEPS[step];
  const dep = (booking as any)?.departure;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Lewati
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
          <span className="text-xs text-primary font-medium">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      {/* Step Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all ${
              i === step
                ? "w-6 h-2 bg-primary"
                : i < step
                ? "w-2 h-2 bg-primary/40"
                : "w-2 h-2 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className={`flex-1 px-6 transition-opacity duration-150 ${animating ? "opacity-0" : "opacity-100"}`}>
        {/* Icon */}
        <div className={`w-28 h-28 rounded-3xl ${currentStep.bg} flex items-center justify-center mx-auto mb-6 ${currentStep.color}`}>
          {currentStep.icon}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">{currentStep.title}</h1>
          <p className={`text-sm font-medium mt-1 ${currentStep.color}`}>{currentStep.subtitle}</p>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Booking info on step 1 */}
        {step === 0 && (customer || booking) && (
          <div className={`rounded-2xl ${currentStep.bg} p-4 mb-6`}>
            {customer && (
              <p className="font-bold text-lg text-foreground text-center">{customer.full_name}</p>
            )}
            {booking && (
              <div className="text-center mt-2 space-y-1">
                <Badge variant="outline" className="text-xs">
                  {(booking as any).booking_code}
                </Badge>
                {dep?.package?.name && (
                  <p className="text-sm font-medium text-muted-foreground">{dep.package.name}</p>
                )}
                {dep?.departure_date && (
                  <p className="text-xs text-muted-foreground">
                    🛫 {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: id })}
                  </p>
                )}
              </div>
            )}
            {!customer && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selamat datang, {user?.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lengkapi profil Anda untuk memulai
                </p>
              </div>
            )}
          </div>
        )}

        {/* Highlights */}
        {currentStep.highlights && (
          <div className="space-y-3 mb-6">
            {currentStep.highlights.map((h, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${currentStep.bg}`}>
                <div className={`${currentStep.color}`}>{h.icon}</div>
                <p className="text-sm font-medium">{h.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Company phone on last step */}
        {step === STEPS.length - 1 && getSetting("company_phone") && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-6">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Hotline 24 Jam</p>
              <p className="font-semibold">{getSetting("company_phone")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-6 space-y-3">
        <Button onClick={goNext} className="w-full h-12 text-base" size="lg">
          {step < STEPS.length - 1 ? (
            <>
              Lanjut <ArrowRight className="h-5 w-5 ml-2" />
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Mulai Gunakan Portal
            </>
          )}
        </Button>
        {step > 0 && (
          <Button onClick={goPrev} variant="ghost" className="w-full" size="lg">
            Kembali
          </Button>
        )}
      </div>
    </div>
  );
}
