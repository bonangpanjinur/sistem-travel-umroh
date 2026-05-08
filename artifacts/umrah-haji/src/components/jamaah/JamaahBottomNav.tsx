import { Link, useLocation } from "react-router-dom";
import { Home, QrCode, Shield, User, Bell, LayoutGrid, FileText, Luggage, LogIn, FileSignature, Camera, BookOpen, Wallet, CreditCard, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

const navItems = [
  { to: "/jamaah", icon: Home, label: "Beranda" },
  { to: "/jamaah/digital-id", icon: QrCode, label: "ID" },
  { to: "/jamaah/visa", icon: Shield, label: "Visa" },
  { to: "/jamaah/notifications", icon: Bell, label: "Notifikasi", showBadge: true },
];

const moreMenuItems = [
  { to: "/jamaah/checkin", icon: LogIn, label: "Check-in", color: "text-blue-600 bg-blue-50" },
  { to: "/jamaah/bagasi", icon: Luggage, label: "Bagasi", color: "text-orange-600 bg-orange-50" },
  { to: "/jamaah/kontrak", icon: FileSignature, label: "Kontrak", color: "text-purple-600 bg-purple-50" },
  { to: "/jamaah/documents", icon: FileText, label: "Dokumen", color: "text-green-600 bg-green-50" },
  { to: "/jamaah/galeri", icon: Camera, label: "Galeri", color: "text-pink-600 bg-pink-50" },
  { to: "/jamaah/doa-panduan", icon: BookOpen, label: "Doa & Panduan", color: "text-emerald-600 bg-emerald-50" },
  { to: "/jamaah/tabungan", icon: Wallet, label: "Tabungan", color: "text-amber-600 bg-amber-50" },
  { to: "/jamaah/cicilan", icon: CreditCard, label: "Cicilan", color: "text-indigo-600 bg-indigo-50" },
  { to: "/jamaah/feedback", icon: MessageCircle, label: "Feedback", color: "text-teal-600 bg-teal-50" },
  { to: "/customer/settings", icon: User, label: "Profil", color: "text-gray-600 bg-gray-50" },
];

export function JamaahBottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="relative bg-background rounded-t-2xl shadow-2xl px-4 pt-4 pb-28 z-10 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Menu Lengkap</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-full hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-center leading-tight font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4 z-40 safe-area-inset-bottom">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to === "/jamaah" && location.pathname === "/jamaah");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.showBadge && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-background">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] leading-none">Lebih</span>
          </button>
        </div>
      </div>
    </>
  );
}
