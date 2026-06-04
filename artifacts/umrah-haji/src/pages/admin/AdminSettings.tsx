import { useState, lazy, Suspense } from "react";
import {
  Building2, CreditCard, Bell, FileText, User, ShieldAlert,
  Palette, Menu, Lock, Key, Database,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import RevokeSessions from "@/components/settings/RevokeSessions";
import { SidebarManager } from "@/components/admin/SidebarManager";
import { useAuth } from "@/hooks/useAuth";

import { SectionHead } from "@/components/admin/settings/SectionHead";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import type { NavItem, SettingsSection } from "@/components/admin/settings/types";
import { SectionErrorBoundary } from "@/components/admin/settings/SectionErrorBoundary";

// Lazy-loaded section components — loaded only when their tab is activated.
const CompanySection       = lazy(() => import("@/components/admin/settings/CompanySection").then(m => ({ default: m.CompanySection })));
const BankSection          = lazy(() => import("@/components/admin/settings/BankSection").then(m => ({ default: m.BankSection })));
const DocumentsSection     = lazy(() => import("@/components/admin/settings/DocumentsSection").then(m => ({ default: m.DocumentsSection })));
const NotificationsSection = lazy(() => import("@/components/admin/settings/NotificationsSection").then(m => ({ default: m.NotificationsSection })));
const AppearanceSection    = lazy(() => import("@/components/admin/settings/AppearanceSection").then(m => ({ default: m.AppearanceSection })));
const SecuritySection      = lazy(() => import("@/components/admin/settings/SecuritySection").then(m => ({ default: m.SecuritySection })));
const ApiKeysSection       = lazy(() => import("@/components/admin/settings/ApiKeysSection").then(m => ({ default: m.ApiKeysSection })));
const DangerSection              = lazy(() => import("@/components/admin/settings/DangerSection").then(m => ({ default: m.DangerSection })));
const DatabaseMigrationSection   = lazy(() => import("@/components/admin/settings/DatabaseMigrationSection").then(m => ({ default: m.DatabaseMigrationSection })));

const NAV_ITEMS: NavItem[] = [
  { id: "profile",       label: "Profil & Akun",        icon: User,        description: "Data pribadi & password" },
  { id: "company",       label: "Data Perusahaan",      icon: Building2,   description: "Nama, alamat, lisensi" },
  { id: "bank",          label: "Rekening Bank",        icon: CreditCard,  description: "Rekening pembayaran" },
  { id: "documents",     label: "Dokumen & Surat",      icon: FileText,    description: "Template & tampilan dokumen" },
  { id: "notifications", label: "Notifikasi",           icon: Bell,        description: "WhatsApp, email & reminder" },
  { id: "appearance",    label: "Tampilan",             icon: Palette,     description: "Warna tema & branding" },
  { id: "sidebar",       label: "Menu Sidebar",         icon: Menu,        description: "Susunan & urutan menu", adminOnly: true },
  { id: "security",      label: "Keamanan",             icon: Lock,        description: "Autentikasi & sesi aktif" },
  { id: "apikeys",       label: "Integrasi & API Keys", icon: Key,         description: "Supabase, VAPID, Midtrans, SMTP", adminOnly: true },
  { id: "database",      label: "Migrasi Database",     icon: Database,    description: "Jalankan file SQL migrasi", adminOnly: true },
  { id: "danger",        label: "Zona Bahaya",          icon: ShieldAlert, description: "Reset & tindakan berbahaya", adminOnly: true },
];

export default function AdminSettings() {
  const { isSuperAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  const visible = NAV_ITEMS.filter(n => !n.adminOnly || isSuperAdmin());
  const isWide = activeSection === "documents";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -mx-4 -my-4 md:-mx-6 md:-my-6">
      <SettingsNav items={visible} activeSection={activeSection} onChange={setActiveSection} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className={`space-y-6 ${isWide ? "max-w-4xl" : "max-w-2xl"}`}>
          <SectionErrorBoundary resetKey={activeSection}>
          <Suspense fallback={
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
            </div>
          }>
          {activeSection === "profile" && (
            <>
              <SectionHead icon={User} title="Profil & Akun" desc="Kelola data pribadi dan keamanan akun Anda" />
              <ProfileForm />
              <ChangePassword />
              <RevokeSessions />
            </>
          )}
          {activeSection === "company"       && <CompanySection />}
          {activeSection === "bank"          && <BankSection />}
          {activeSection === "documents"     && <DocumentsSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "appearance"    && <AppearanceSection />}
          {activeSection === "sidebar" && isSuperAdmin() && (
            <>
              <SectionHead icon={Menu} title="Susunan Menu Sidebar" desc="Atur urutan, nama, ikon, dan visibilitas menu navigasi" />
              <SidebarManager />
            </>
          )}
          {activeSection === "security"               && <SecuritySection />}
          {activeSection === "apikeys"   && isSuperAdmin() && <ApiKeysSection />}
          {activeSection === "database"  && isSuperAdmin() && <DatabaseMigrationSection />}
          {activeSection === "danger"    && isSuperAdmin() && <DangerSection />}
          </Suspense>
          </SectionErrorBoundary>
        </div>
      </main>
    </div>
  );
}