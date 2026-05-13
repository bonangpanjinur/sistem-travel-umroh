import { useState } from "react";
import {
  Building2, CreditCard, Bell, FileText, User, ShieldAlert,
  Palette, Menu, Lock, Key,
} from "lucide-react";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import { SidebarManager } from "@/components/admin/SidebarManager";
import { useAuth } from "@/hooks/useAuth";

import { SectionHead } from "@/components/admin/settings/SectionHead";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { CompanySection } from "@/components/admin/settings/CompanySection";
import { BankSection } from "@/components/admin/settings/BankSection";
import { DocumentsSection } from "@/components/admin/settings/DocumentsSection";
import { NotificationsSection } from "@/components/admin/settings/NotificationsSection";
import { AppearanceSection } from "@/components/admin/settings/AppearanceSection";
import { SecuritySection } from "@/components/admin/settings/SecuritySection";
import { ApiKeysSection } from "@/components/admin/settings/ApiKeysSection";
import { DangerSection } from "@/components/admin/settings/DangerSection";
import type { NavItem, SettingsSection } from "@/components/admin/settings/types";

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
          {activeSection === "profile" && (
            <>
              <SectionHead icon={User} title="Profil & Akun" desc="Kelola data pribadi dan keamanan akun Anda" />
              <ProfileForm />
              <ChangePassword />
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
          {activeSection === "apikeys" && isSuperAdmin() && <ApiKeysSection />}
          {activeSection === "danger"  && isSuperAdmin() && <DangerSection />}
        </div>
      </main>
    </div>
  );
}