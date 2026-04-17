import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RECOMMENDED_MENUS } from "@/lib/admin-menu-registry";
import * as Icons from "lucide-react";

// Map icon names to lucide-react components
const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard: Icons.LayoutDashboard,
  BarChart3: Icons.BarChart3,
  Package: Icons.Package,
  CalendarDays: Icons.CalendarDays,
  BookOpen: Icons.BookOpen,
  Backpack: Icons.Backpack,
  Map: Icons.Map,
  Wallet: Icons.Wallet,
  BedDouble: Icons.BedDouble,
  Users: Icons.Users,
  UserSquare2: Icons.UserSquare2,
  Network: Icons.Network,
  Gift: Icons.Gift,
  Share2: Icons.Share2,
  Star: Icons.Star,
  GraduationCap: Icons.GraduationCap,
  StickyNote: Icons.StickyNote,
  CreditCard: Icons.CreditCard,
  Coins: Icons.Coins,
  TrendingUp: Icons.TrendingUp,
  TrendingDown: Icons.TrendingDown,
  PieChart: Icons.PieChart,
  UserPlus: Icons.UserPlus,
  Ticket: Icons.Ticket,
  Globe: Icons.Globe,
  Contact2: Icons.Contact2,
  Banknote: Icons.Banknote,
  FileCheck: Icons.FileCheck,
  FileText: Icons.FileText,
  Plane: Icons.Plane,
  Building: Icons.Building,
  Hotel: Icons.Hotel,
  UserCheck: Icons.UserCheck,
  Bus: Icons.Bus,
  Store: Icons.Store,
  LifeBuoy: Icons.LifeBuoy,
  MessageSquare: Icons.MessageSquare,
  Megaphone: Icons.Megaphone,
  FileBarChart: Icons.FileBarChart,
  UserCog: Icons.UserCog,
  ShieldAlert: Icons.ShieldAlert,
  KeyRound: Icons.KeyRound,
  Palette: Icons.Palette,
  MessageCircle: Icons.MessageCircle,
  Layers: Icons.Layers,
  Settings: Icons.Settings,
};

// Keyword mappings for better search
const keywordMap: Record<string, string> = {
  'dashboard': 'beranda home overview',
  'analytics': 'statistik grafik chart',
  'packages': 'produk umroh haji paket',
  'departures': 'departure jadwal keberangkatan',
  'bookings': 'reservasi pesanan booking',
  'equipment': 'perlengkapan alat',
  'itinerary-templates': 'jadwal perjalanan template',
  'savings': 'savings cicilan tabungan',
  'room-assignments': 'room hotel kamar',
  'customers': 'pelanggan customer jamaah',
  'agents': 'agen mitra agent',
  'branches': 'branch kantor cabang',
  'loyalty': 'poin reward loyalty',
  'referrals': 'rujukan ajak referral',
  'haji': 'haji reguler plus furoda',
  'manasik': 'manasik pembelajaran',
  'visa': 'visa dokumen',
  'payments': 'bayar payment transfer pembayaran',
  'finance-cash': 'kas bank keuangan',
  'finance-ar': 'piutang ar receivable',
  'finance-ap': 'hutang ap payable',
  'finance-pl': 'laba rugi profit loss',
  'leads': 'prospek calon pelanggan crm',
  'coupons': 'diskon promo kupon',
  'landing-pages': 'landing page website',
  'hr': 'sdm pegawai employee karyawan',
  'payroll': 'penggajian payroll gaji',
  'document-verification': 'verifikasi dokumen paspor',
  'documents-generator': 'cetak surat dokumen generate',
  'offline-content': 'doa panduan manasik konten',
  'airlines': 'maskapai airline',
  'airports': 'bandara airport',
  'hotels': 'hotel',
  'muthawifs': 'muthawif guide',
  'bus-providers': 'bus provider transportasi',
  'vendors': 'vendor supplier pemasok',
  'support': 'tiket support bantuan keluhan',
  'whatsapp': 'wa pesan notifikasi whatsapp',
  'marketing-materials': 'materi promosi marketing',
  'reports': 'laporan report',
  'users': 'pengguna akun user manajemen',
  'security-audit': 'keamanan log security audit',
  '2fa-settings': 'two factor authentication 2fa',
  'appearance': 'tema warna desain tampilan',
  'static-pages': 'halaman statis pages',
  'testimonials': 'testimoni review',
  'package-types': 'tipe paket types',
  'settings': 'setting konfigurasi pengaturan',
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Convert RECOMMENDED_MENUS to command palette format
  const commandItems = useMemo(() => {
    return RECOMMENDED_MENUS.map(menu => ({
      label: menu.label,
      icon: iconMap[menu.icon] || Icons.Settings,
      path: menu.path,
      keywords: keywordMap[menu.key] || menu.label.toLowerCase(),
    }));
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari halaman... (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Tidak ditemukan.</CommandEmpty>
        <CommandGroup heading="Navigasi Admin">
          {commandItems.map((item) => (
            <CommandItem
              key={item.path}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
