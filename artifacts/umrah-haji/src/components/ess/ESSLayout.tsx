import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard, FileText, CalendarOff, TrendingUp, User, LogOut, Menu, X, Building2, ClipboardCheck
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { href: "/ess/dashboard",  label: "Beranda",       icon: LayoutDashboard },
  { href: "/ess/payroll",    label: "Slip Gaji",     icon: FileText },
  { href: "/ess/absensi",    label: "Absensi",       icon: ClipboardCheck },
  { href: "/ess/cuti",       label: "Cuti & Izin",   icon: CalendarOff },
  { href: "/ess/karir",      label: "Riwayat Karir", icon: TrendingUp },
  { href: "/ess/profil",     label: "Profil Saya",   icon: User },
];

interface ESSLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function ESSLayout({ children, title }: ESSLayoutProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await (supabase as any).auth.signOut();
    toast.success("Berhasil keluar");
    navigate("/ess/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "K";

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-slate-100 w-64">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">Portal Karyawan</p>
            <p className="text-xs text-slate-400">Self-Service</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={profile?.avatar_url ?? ""} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name || "Karyawan"}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald-600" : "text-slate-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 gap-3" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 fixed inset-y-0 z-30 shadow-sm">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 shadow-xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 lg:px-6 h-14 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-semibold text-slate-800 text-base">{title}</h1>
          </div>
          <Avatar className="w-8 h-8 lg:hidden">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        <footer className="py-3 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
          Portal Karyawan — Vinstour Travel
        </footer>
      </div>
    </div>
  );
}
