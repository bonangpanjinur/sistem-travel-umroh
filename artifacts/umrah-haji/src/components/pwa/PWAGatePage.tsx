import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Download, Smartphone, CheckCircle2, Shield, Zap, Wifi, Star,
  Share2, MoreVertical, Plus, Monitor, X, ArrowDownToLine, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { usePWAConfig } from "@/hooks/usePWAConfig";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const PLATFORMS: { id: Platform; label: string; icon: React.ElementType }[] = [
  { id: "android",  label: "Android",  icon: Smartphone },
  { id: "ios",      label: "iPhone",   icon: Smartphone },
  { id: "desktop",  label: "Desktop",  icon: Monitor    },
];

const STEPS: Record<Platform, { icon: string; title: string; desc: string }[]> = {
  android: [
    { icon: "⋮",  title: "Buka menu browser",             desc: 'Ketuk ikon tiga titik ( ⋮ ) di pojok kanan atas Chrome atau Samsung Internet.' },
    { icon: "📲", title: 'Ketuk "Tambah ke Layar Utama"', desc: 'Pilih "Tambahkan ke Layar Utama" atau "Install App" dari daftar menu.' },
    { icon: "✅", title: "Ketuk Instal — selesai!",        desc: 'Konfirmasi dengan mengetuk Instal. Ikon aplikasi akan muncul di layar utama.' },
  ],
  ios: [
    { icon: "⎙",  title: "Ketuk tombol Bagikan",      desc: 'Di Safari, ketuk ikon Bagikan ( ⎙ ) di bagian bawah layar.' },
    { icon: "📋", title: '"Tambah ke Layar Utama"',    desc: 'Gulir ke bawah di lembar aksi, lalu ketuk "Tambahkan ke Layar Utama".' },
    { icon: "✅", title: 'Ketuk "Tambah" — selesai!', desc: 'Di sudut kanan atas, ketuk Tambah untuk memasang. Ikon langsung muncul!' },
  ],
  desktop: [
    { icon: "🌐", title: "Buka di Chrome atau Edge",      desc: "Pastikan halaman ini terbuka di browser Google Chrome atau Microsoft Edge." },
    { icon: "⊕",  title: "Klik ikon Install di address bar", desc: 'Cari ikon komputer kecil ( ⊕ ) di sebelah kanan address bar browser.' },
    { icon: "✅", title: "Klik Install — selesai!",       desc: "Aplikasi akan terbuka di jendela sendiri, tanpa browser, persis seperti aplikasi native." },
  ],
};

const FEATURES = [
  { icon: Zap,    label: "Akses Instan",      desc: "Buka langsung dari ikon" },
  { icon: Wifi,   label: "Mode Offline",       desc: "Tersedia tanpa koneksi" },
  { icon: Shield, label: "Aman & Privat",      desc: "Data di perangkat Anda" },
  { icon: Star,   label: "Layar Penuh",        desc: "Tanpa address bar browser" },
];

const EASE_SPRING: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: EASE_SPRING },
  }),
};

const stepVariant: Variants = {
  hidden:  { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.11, duration: 0.35, ease: "easeOut" },
  }),
};

export function PWAGatePage() {
  const { data: settings } = useWebsiteSettings();
  const { iconConfig } = usePWAConfig();

  const companyName = iconConfig.appName  || settings?.company_name || "Vinstour Travel";
  const tagline     = settings?.tagline   || "Perjalanan Suci Anda";
  const themeColor  = iconConfig.themeColor || settings?.primary_color || "#15803d";
  const bgColor     = iconConfig.bgColor    || "#0f2518";
  const logoUrl     = iconConfig.iconUrl    || settings?.logo_url    || "/images/icon-192.png";

  const [platform,       setPlatform]       = useState<Platform>("android");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed,      setInstalled]      = useState(false);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [activeStep,     setActiveStep]     = useState(-1);

  useEffect(() => {
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Animate steps in sequence when drawer opens
  useEffect(() => {
    if (!drawerOpen) { setActiveStep(-1); return; }
    const steps = STEPS[platform];
    steps.forEach((_, i) => {
      setTimeout(() => setActiveStep(i), 300 + i * 350);
    });
  }, [drawerOpen, platform]);

  const handleNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
      setDrawerOpen(false);
    }
  }, [deferredPrompt]);

  const steps = STEPS[platform];

  return (
    <>
      {/* ── MAIN PAGE ── */}
      <div
        className="min-h-screen flex flex-col text-white overflow-x-hidden"
        style={{ background: `linear-gradient(160deg, ${bgColor} 0%, ${themeColor}dd 55%, ${bgColor}cc 100%)` }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20"
               style={{ background: themeColor, filter: "blur(80px)" }} />
          <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full opacity-15"
               style={{ background: themeColor, filter: "blur(60px)" }} />
        </div>

        <div className="relative flex-1 flex flex-col items-center px-5 pt-14 pb-32">

          {/* Logo */}
          <motion.div
            className="mb-6 flex flex-col items-center"
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
          >
            <div className="relative mb-4">
              <div
                className="absolute inset-0 rounded-[28px] opacity-40 blur-xl"
                style={{ backgroundColor: themeColor }}
              />
              <div className="relative w-24 h-24 rounded-[28px] bg-white/15 border border-white/25 backdrop-blur-sm shadow-2xl overflow-hidden">
                <img
                  src={logoUrl} alt={companyName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-center drop-shadow">{companyName}</h1>
            <p className="text-white/55 text-sm mt-1 text-center">{tagline}</p>
          </motion.div>

          {/* Headline */}
          <motion.div
            className="text-center mb-8 max-w-xs"
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3 w-3" />
              Aplikasi Mobile Gratis
            </div>
            <h2 className="text-xl font-bold leading-snug">
              Pasang untuk pengalaman terbaik
            </h2>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              Akses penuh fitur ibadah, jadwal, dan tracking tanpa perlu browser —
              langsung dari layar utama ponsel Anda.
            </p>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm mb-8">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                variants={fadeUp} initial="hidden" animate="visible" custom={2 + i * 0.5}
                className="flex items-center gap-3 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm p-3"
              >
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${themeColor}55` }}
                >
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-white/45 mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Installed success state */}
          <AnimatePresence>
            {installed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-400/20 border border-green-400/30 flex items-center justify-center mb-1">
                  <CheckCircle2 className="h-8 w-8 text-green-300" />
                </div>
                <p className="font-bold text-base">Berhasil dipasang!</p>
                <p className="text-white/55 text-sm">Buka dari layar utama perangkat Anda.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── STICKY BOTTOM CTA ── */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 z-40"
          style={{ background: `linear-gradient(to top, ${bgColor}f0 0%, transparent 100%)` }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {!installed && (
            <>
              {/* Pulsing ring effect */}
              <div className="relative max-w-sm mx-auto">
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  animate={{ scale: [1, 1.04, 1], opacity: [0.15, 0.05, 0.15] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <Button
                  onClick={() => {
                    if (deferredPrompt) handleNativeInstall();
                    else setDrawerOpen(true);
                  }}
                  className="relative w-full h-14 text-base font-bold rounded-2xl shadow-2xl border border-white/20 gap-2"
                  style={{ background: `linear-gradient(135deg, white 0%, #f0f0f0 100%)`, color: themeColor }}
                >
                  {deferredPrompt
                    ? <><Download className="h-5 w-5" />Pasang Aplikasi Sekarang</>
                    : <><ArrowDownToLine className="h-5 w-5" />Cara Pasang Aplikasi</>
                  }
                </Button>
              </div>
              <p className="text-center text-white/30 text-[11px] mt-2">
                Gratis · Tidak perlu Play Store
              </p>
            </>
          )}
        </motion.div>
      </div>

      {/* ── INSTALL GUIDE DRAWER ── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-0 px-5 pt-5">
            <DrawerTitle className="text-lg font-bold">Cara Pasang Aplikasi</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
              Ikuti langkah berikut sesuai perangkat Anda
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pt-4 pb-2 overflow-y-auto">
            {/* Platform selector */}
            <div className="flex gap-2 mb-5 p-1 rounded-xl bg-muted">
              {PLATFORMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPlatform(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200",
                    platform === id
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Platform note for iOS */}
            {platform === "ios" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 mb-4"
              >
                <Share2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Hanya bisa dipasang dari <strong>Safari</strong>. Jika menggunakan Chrome di iPhone, salin URL dan buka di Safari terlebih dahulu.
                </p>
              </motion.div>
            )}

            {/* Steps */}
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {steps.map((step, i) => (
                  <motion.div
                    key={`${platform}-${i}`}
                    custom={i}
                    variants={stepVariant}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300",
                      activeStep >= i
                        ? "bg-card border-border shadow-sm"
                        : "bg-muted/40 border-transparent",
                    )}
                  >
                    {/* Step number + emoji */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300",
                          activeStep >= i
                            ? "text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                        style={activeStep >= i ? { backgroundColor: themeColor } : {}}
                      >
                        {i + 1}
                      </div>
                      <span className="text-lg leading-none">{step.icon}</span>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={cn(
                        "text-sm font-semibold leading-snug transition-colors",
                        activeStep >= i ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                    </div>

                    {/* Check indicator */}
                    <AnimatePresence>
                      {activeStep >= i && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
                        >
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: themeColor }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer action */}
          <div className="px-5 pt-3 pb-6 mt-2 border-t border-border/50 space-y-2">
            {deferredPrompt && platform === "android" ? (
              <Button
                onClick={handleNativeInstall}
                className="w-full h-12 font-bold rounded-xl text-white gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <Download className="h-5 w-5" />
                Pasang Sekarang (Otomatis)
              </Button>
            ) : (
              <Button
                onClick={() => setDrawerOpen(false)}
                className="w-full h-12 font-semibold rounded-xl"
                variant="outline"
              >
                Oke, Mengerti
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Sudah dipasang?{" "}
              <button
                className="underline underline-offset-2 font-medium"
                onClick={() => window.location.reload()}
              >
                Buka Aplikasi
              </button>
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
