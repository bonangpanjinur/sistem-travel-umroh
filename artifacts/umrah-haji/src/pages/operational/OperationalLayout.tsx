import { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ClipboardList, Luggage, QrCode,
  Menu, X, LogOut, Home, BedDouble, ScanLine, Package, Bus,
  ListChecks, Flag, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/operational", icon: Home },
  { label: "Checklist Kesiapan", href: "/operational/readiness", icon: ListChecks },
  { label: "Manifest", href: "/operational/manifest", icon: ClipboardList },
  { label: "Rooming List", href: "/operational/rooming", icon: BedDouble },
  { label: "Check-in & QR", href: "/operational/checkin", icon: QrCode },
  { label: "Luggage", href: "/operational/luggage", icon: Luggage },
  { label: "Perlengkapan", href: "/operational/equipment", icon: Package },
  { label: "Timeline Perjalanan", href: "/operational/timeline", icon: Flag },
  { label: "QR Code Jamaah", href: "/operational/qrcode", icon: ScanLine },
  { label: "Manajemen Bus", href: "/operational/bus", icon: Bus },
  { label: "Dokumen", href: "/operational/documents", icon: FileText },
  { label: "Booking", href: "/admin/bookings", icon: ClipboardList },
];

export default function OperationalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || (!hasRole('operational') && !hasRole('super_admin') && !hasRole('owner') && !hasRole('branch_manager') && !hasRole('equipment'))) {
    return <Navigate to="/login" replace />;
  }

  const isActive = (href: string) => {
    if (href === '/operational') return location.pathname === '/operational';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
        <span className="font-semibold">Operasional</span>
        <div className="w-10" />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <span className="font-bold text-lg">Operasional</span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground/80 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 p-4 border-t space-y-2">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <Home className="h-4 w-4" />
            Kembali ke Home
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="lg:ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
}
