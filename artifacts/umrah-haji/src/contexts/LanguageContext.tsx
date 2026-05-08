import React, { createContext, useContext, useState, useCallback } from "react";

export type Language = "id" | "en" | "ar";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const translations: Record<Language, Record<string, string>> = {
  id: {
    // Nav & Global
    "nav.home": "Beranda",
    "nav.packages": "Paket Umroh & Haji",
    "nav.blog": "Blog",
    "nav.testimonials": "Testimoni",
    "nav.contact": "Hubungi Kami",
    "nav.login": "Masuk",
    "nav.register": "Daftar",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Keluar",

    // Landing
    "home.hero.title": "Perjalanan Ibadah Terbaik",
    "home.hero.subtitle": "Kami hadir untuk memastikan perjalanan Umroh & Haji Anda berlangsung dengan nyaman, aman, dan penuh berkah.",
    "home.hero.cta": "Lihat Paket",
    "home.hero.cta2": "Konsultasi Gratis",
    "home.featured": "Paket Unggulan",
    "home.why": "Mengapa Vinstour?",

    // Packages
    "packages.title": "Paket Umroh & Haji",
    "packages.filter": "Filter Paket",
    "packages.sort": "Urutkan",
    "packages.book": "Pesan Sekarang",
    "packages.detail": "Lihat Detail",
    "packages.price": "Harga mulai",
    "packages.duration": "Durasi",
    "packages.days": "hari",
    "packages.available": "Tersedia",
    "packages.full": "Penuh",

    // Booking
    "booking.title": "Form Pemesanan",
    "booking.step1": "Data Jamaah",
    "booking.step2": "Kelengkapan Dokumen",
    "booking.step3": "Pembayaran",
    "booking.step4": "Konfirmasi",
    "booking.submit": "Lanjutkan",
    "booking.back": "Kembali",

    // Auth
    "auth.email": "Email",
    "auth.password": "Kata Sandi",
    "auth.login": "Masuk",
    "auth.register": "Daftar Akun",
    "auth.forgot": "Lupa kata sandi?",

    // Common
    "common.loading": "Memuat...",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.search": "Cari...",
    "common.filter": "Filter",
    "common.export": "Ekspor",
    "common.add": "Tambah",
    "common.close": "Tutup",
    "common.yes": "Ya",
    "common.no": "Tidak",

    // Admin
    "admin.dashboard": "Dashboard",
    "admin.bookings": "Pemesanan",
    "admin.customers": "Jamaah",
    "admin.packages": "Paket",
    "admin.finance": "Keuangan",
    "admin.reports": "Laporan",
    "admin.settings": "Pengaturan",
  },

  en: {
    // Nav & Global
    "nav.home": "Home",
    "nav.packages": "Umroh & Hajj Packages",
    "nav.blog": "Blog",
    "nav.testimonials": "Testimonials",
    "nav.contact": "Contact Us",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Logout",

    // Landing
    "home.hero.title": "The Best Spiritual Journey",
    "home.hero.subtitle": "We are here to ensure your Umroh & Hajj journey is comfortable, safe, and full of blessings.",
    "home.hero.cta": "View Packages",
    "home.hero.cta2": "Free Consultation",
    "home.featured": "Featured Packages",
    "home.why": "Why Vinstour?",

    // Packages
    "packages.title": "Umroh & Hajj Packages",
    "packages.filter": "Filter Packages",
    "packages.sort": "Sort",
    "packages.book": "Book Now",
    "packages.detail": "View Details",
    "packages.price": "Starting from",
    "packages.duration": "Duration",
    "packages.days": "days",
    "packages.available": "Available",
    "packages.full": "Full",

    // Booking
    "booking.title": "Booking Form",
    "booking.step1": "Pilgrim Data",
    "booking.step2": "Document Requirements",
    "booking.step3": "Payment",
    "booking.step4": "Confirmation",
    "booking.submit": "Continue",
    "booking.back": "Back",

    // Auth
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.login": "Login",
    "auth.register": "Create Account",
    "auth.forgot": "Forgot password?",

    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.search": "Search...",
    "common.filter": "Filter",
    "common.export": "Export",
    "common.add": "Add",
    "common.close": "Close",
    "common.yes": "Yes",
    "common.no": "No",

    // Admin
    "admin.dashboard": "Dashboard",
    "admin.bookings": "Bookings",
    "admin.customers": "Pilgrims",
    "admin.packages": "Packages",
    "admin.finance": "Finance",
    "admin.reports": "Reports",
    "admin.settings": "Settings",
  },

  ar: {
    // Nav & Global
    "nav.home": "الرئيسية",
    "nav.packages": "باقات العمرة والحج",
    "nav.blog": "المدونة",
    "nav.testimonials": "آراء العملاء",
    "nav.contact": "تواصل معنا",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",
    "nav.dashboard": "لوحة التحكم",
    "nav.logout": "تسجيل الخروج",

    // Landing
    "home.hero.title": "أفضل رحلة روحانية",
    "home.hero.subtitle": "نحن هنا لضمان أن رحلتك في العمرة والحج مريحة وآمنة ومليئة بالبركات.",
    "home.hero.cta": "استعرض الباقات",
    "home.hero.cta2": "استشارة مجانية",
    "home.featured": "الباقات المميزة",
    "home.why": "لماذا فينستور؟",

    // Packages
    "packages.title": "باقات العمرة والحج",
    "packages.filter": "تصفية الباقات",
    "packages.sort": "ترتيب",
    "packages.book": "احجز الآن",
    "packages.detail": "عرض التفاصيل",
    "packages.price": "يبدأ من",
    "packages.duration": "المدة",
    "packages.days": "أيام",
    "packages.available": "متاح",
    "packages.full": "مكتمل",

    // Booking
    "booking.title": "نموذج الحجز",
    "booking.step1": "بيانات الحاج",
    "booking.step2": "متطلبات الوثائق",
    "booking.step3": "الدفع",
    "booking.step4": "التأكيد",
    "booking.submit": "متابعة",
    "booking.back": "رجوع",

    // Auth
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.login": "تسجيل الدخول",
    "auth.register": "إنشاء حساب",
    "auth.forgot": "نسيت كلمة المرور؟",

    // Common
    "common.loading": "جار التحميل...",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.search": "بحث...",
    "common.filter": "تصفية",
    "common.export": "تصدير",
    "common.add": "إضافة",
    "common.close": "إغلاق",
    "common.yes": "نعم",
    "common.no": "لا",

    // Admin
    "admin.dashboard": "لوحة التحكم",
    "admin.bookings": "الحجوزات",
    "admin.customers": "الحجاج",
    "admin.packages": "الباقات",
    "admin.finance": "المالية",
    "admin.reports": "التقارير",
    "admin.settings": "الإعدادات",
  },
};

const STORAGE_KEY = "vinstour-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en" || stored === "ar") return stored;
    const browserLang = navigator.language.slice(0, 2);
    if (browserLang === "ar") return "ar";
    if (browserLang === "en") return "en";
    return "id";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] ?? translations["id"][key] ?? key;
  }, [language]);

  const dir: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
