import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Settings, Building2, FileText, Bell, AlertTriangle,
  Palette, Layout, Smartphone,
  Users2, ShieldCheck, LayoutGrid, ShieldAlert, ShieldQuestion, UserCog,
  Plug, Webhook, Mail, Bell as BellIcon, Activity,
  Shield, KeyRound, ScanSearch, ClipboardList,
  Database, BookOpen, HeartPulse,
} from "lucide-react";

type Item = { label: string; path: string; icon: any };

const CATEGORIES: Record<string, { title: string; items: Item[] }> = {
  umum: {
    title: "Pengaturan Umum",
    items: [
      { label: "Profil & Perusahaan", path: "/admin/settings", icon: Building2 },
      { label: "Dokumen", path: "/admin/document-settings", icon: FileText },
      { label: "Notifikasi", path: "/admin/notification-settings", icon: Bell },
      { label: "Danger Zone", path: "/admin/settings#danger", icon: AlertTriangle },
    ],
  },
  appearance: {
    title: "Tampilan & Branding",
    items: [
      { label: "Tema & Warna", path: "/admin/appearance", icon: Palette },
      { label: "Layout & Sidebar", path: "/admin/appearance#layout", icon: Layout },
      { label: "PWA & Mobile", path: "/admin/appearance#pwa", icon: Smartphone },
    ],
  },
  access: {
    title: "Hak Akses (RBAC)",
    items: [
      { label: "Manajemen User", path: "/admin/users", icon: Users2 },
      { label: "Manajemen Role", path: "/admin/roles", icon: ShieldCheck },
      { label: "Akses Dashboard", path: "/admin/dashboard-access", icon: LayoutGrid },
      { label: "RBAC Tools", path: "/admin/rbac-tools", icon: ShieldAlert },
      { label: "Status RBAC", path: "/admin/rbac-status", icon: ShieldQuestion },
      { label: "Access Simulator", path: "/admin/access-simulator", icon: UserCog },
    ],
  },
  integration: {
    title: "Integrasi & API",
    items: [
      { label: "API Connect", path: "/admin/api-connect", icon: Plug },
      { label: "System Health", path: "/admin/system-health", icon: Activity },
      { label: "Webhooks Outgoing", path: "/admin/webhooks", icon: Webhook },
      { label: "Template Email", path: "/admin/email-templates", icon: Mail },
      { label: "Push Notifikasi", path: "/admin/push-notifications", icon: BellIcon },
    ],
  },
  security: {
    title: "Keamanan",
    items: [
      { label: "Two-Factor (2FA)", path: "/admin/2fa", icon: KeyRound },
      { label: "Audit Keamanan", path: "/admin/security-audit", icon: ScanSearch },
      { label: "Log Aktivitas", path: "/admin/activity-log", icon: ClipboardList },
    ],
  },
  backend: {
    title: "Panduan Backend",
    items: [
      { label: "Setup Backend", path: "/admin/supabase-setup", icon: Database },
      { label: "Migration Health", path: "/admin/migration-health", icon: HeartPulse },
      { label: "Dokumentasi", path: "/admin/supabase-setup#docs", icon: BookOpen },
    ],
  },
};

export type SettingsCategoryKey = keyof typeof CATEGORIES;

interface Props {
  category: SettingsCategoryKey;
  className?: string;
}

export function SettingsCategoryNav({ category, className }: Props) {
  const { pathname, hash } = useLocation();
  const cat = CATEGORIES[category];
  if (!cat) return null;

  return (
    <div className={cn("mb-6 border-b", className)}>
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Settings className="h-4 w-4" />
        <span>{cat.title}</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto pb-2 -mb-px">
        {cat.items.map((item) => {
          const [base, frag] = item.path.split("#");
          const active = pathname === base && (frag ? hash === `#${frag}` : !hash || hash === "");
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-t-md whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-primary text-primary font-medium bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}