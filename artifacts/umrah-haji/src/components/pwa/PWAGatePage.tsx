import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2, Star, Shield, Zap, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { usePWAConfig } from "@/hooks/usePWAConfig";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const FEATURES = [
  { icon: Zap,    label: "Akses Instan",       desc: "Buka langsung tanpa browser" },
  { icon: Wifi,   label: "Mode Offline",        desc: "Tersedia tanpa koneksi" },
  { icon: Shield, label: "Aman & Privat",       desc: "Data tersimpan di perangkat" },
  { icon: Star,   label: "Pengalaman Terbaik",  desc: "Tampilan penuh layar" },
];

const IOS_STEPS = [
  { step: "1", text: "Ketuk ikon Bagikan ( ⎙ ) di Safari" },
  { step: "2", text: '"Tambahkan ke Layar Utama"' },
  { step: "3", text: "Ketuk Tambah — selesai!" },
];

export function PWAGatePage() {
  const { data: settings } = useWebsiteSettings();
  const { iconConfig } = usePWAConfig();

  const companyName  = iconConfig.appName  || settings?.company_name  || "Vinstour Travel";
  const tagline      = settings?.tagline   || "Perjalanan Suci Anda";
  const themeColor   = iconConfig.themeColor || settings?.primary_color || "#15803d";
  const bgColor      = iconConfig.bgColor    || settings?.primary_color || "#0f2518";
  const logoUrl      = iconConfig.iconUrl    || settings?.logo_url     || "/images/icon-192.png";

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed,      setInstalled]      = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [showIOSGuide,   setShowIOSGuide]   = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-white"
      style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${themeColor} 60%, ${bgColor}cc 100%)` }}
    >
      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-2xl overflow-hidden">
          <img
            src={logoUrl}
            alt={companyName}
            className="w-full h-full object-cover rounded-2xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
        <p className="text-white/60 text-sm mt-1">{tagline}</p>
      </div>

      {/* Headline */}
      <div className="text-center mb-8 max-w-sm">
        <h2 className="text-xl font-semibold leading-snug mb-2">
          Pasang aplikasi untuk mulai
        </h2>
        <p className="text-white/55 text-sm leading-relaxed">
          Aplikasi ini hanya tersedia sebagai PWA yang dipasang di perangkat Anda —
          untuk pengalaman terbaik dan akses lengkap fitur ibadah.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur p-3"
          >
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-white/80" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{label}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Install CTA */}
      {installed ? (
        <div className="flex items-center gap-2 text-green-300 font-semibold text-sm">
          <CheckCircle2 className="h-5 w-5" />
          Berhasil dipasang! Buka dari layar utama Anda.
        </div>
      ) : isIOS ? (
        <div className="w-full max-w-sm">
          <Button
            onClick={() => setShowIOSGuide(!showIOSGuide)}
            className="w-full h-12 text-base font-bold bg-white hover:bg-white/90 rounded-xl shadow-lg"
            style={{ color: themeColor }}
          >
            <Smartphone className="h-5 w-5 mr-2" />
            Cara Pasang di iPhone / iPad
          </Button>
          {showIOSGuide && (
            <div className="mt-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur p-4 space-y-3">
              {IOS_STEPS.map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: themeColor }}
                  >
                    {step}
                  </div>
                  <p className="text-sm text-white/80 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : deferredPrompt ? (
        <Button
          onClick={handleInstall}
          className="w-full max-w-sm h-12 text-base font-bold bg-white hover:bg-white/90 rounded-xl shadow-lg"
          style={{ color: themeColor }}
        >
          <Download className="h-5 w-5 mr-2" />
          Pasang Aplikasi Sekarang
        </Button>
      ) : (
        <div className="w-full max-w-sm">
          <div className="rounded-xl bg-white/10 border border-white/10 p-4 text-center">
            <Smartphone className="h-8 w-8 text-white/60 mx-auto mb-2" />
            <p className="text-sm text-white/70 leading-relaxed">
              Buka halaman ini di <strong className="text-white">Chrome</strong> / Samsung Internet
              pada Android, atau <strong className="text-white">Safari</strong> pada iPhone,
              lalu pasang sebagai aplikasi.
            </p>
          </div>
        </div>
      )}

      <p className="mt-8 text-white/25 text-xs text-center">
        © {new Date().getFullYear()} {companyName}
      </p>
    </div>
  );
}
