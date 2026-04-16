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
import {
  LayoutDashboard, Package, Users, Calendar, CreditCard,
  Settings, Shield, UserCheck, FileBarChart, BarChart3,
  Target, BedDouble, Plane, Wallet, FileCheck,
  Building2, DollarSign, Truck, Gift, HeadphonesIcon,
  Palette, ShieldCheck, Key, MessageSquare, UserCog,
  BookOpen, MapPin, TrendingUp, FileText, Share2
} from "lucide-react";

const ALL_PAGES = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', keywords: 'beranda home overview' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', keywords: 'statistik grafik chart' },
  { label: 'CRM Leads', icon: Target, path: '/admin/leads', keywords: 'prospek calon pelanggan' },
  { label: 'Booking', icon: Calendar, path: '/admin/bookings', keywords: 'reservasi pesanan' },
  { label: 'Pembayaran', icon: CreditCard, path: '/admin/payments', keywords: 'bayar payment transfer' },
  { label: 'Paket', icon: Package, path: '/admin/packages', keywords: 'produk umroh haji' },
  { label: 'Keberangkatan', icon: Plane, path: '/admin/departures', keywords: 'departure jadwal' },
  { label: 'Template Itinerary', icon: MapPin, path: '/admin/itinerary-templates', keywords: 'jadwal perjalanan' },
  { label: 'Tabungan', icon: Wallet, path: '/admin/savings', keywords: 'savings cicilan' },
  { label: 'Kamar', icon: BedDouble, path: '/admin/room-assignments', keywords: 'room hotel' },
  { label: 'Laba/Rugi', icon: DollarSign, path: '/admin/finance', keywords: 'keuangan profit loss' },
  { label: 'Vendor', icon: Truck, path: '/admin/vendors', keywords: 'supplier pemasok' },
  { label: 'Jamaah', icon: Users, path: '/admin/customers', keywords: 'pelanggan customer' },
  { label: 'Dokumen', icon: FileCheck, path: '/admin/documents', keywords: 'verifikasi paspor' },
  { label: 'Agent', icon: UserCheck, path: '/admin/agents', keywords: 'agen mitra' },
  { label: 'Kupon', icon: Gift, path: '/admin/coupons', keywords: 'diskon promo' },
  { label: 'Loyalty', icon: Gift, path: '/admin/loyalty', keywords: 'poin reward' },
  { label: 'Referral', icon: Share2, path: '/admin/referrals', keywords: 'rujukan ajak' },
  { label: 'Haji', icon: BookOpen, path: '/admin/haji', keywords: 'haji reguler plus furoda' },
  { label: 'Karyawan', icon: UserCog, path: '/admin/hr', keywords: 'sdm pegawai employee' },
  { label: 'Tiket Support', icon: HeadphonesIcon, path: '/admin/support', keywords: 'bantuan keluhan' },
  { label: 'WhatsApp', icon: MessageSquare, path: '/admin/whatsapp', keywords: 'wa pesan notifikasi' },
  { label: 'Master Data', icon: Settings, path: '/admin/master-data', keywords: 'hotel airline airport' },
  { label: 'Cabang', icon: Building2, path: '/admin/branches', keywords: 'branch kantor' },
  { label: 'Generate Surat', icon: FileText, path: '/admin/documents-generator', keywords: 'cetak surat dokumen' },
  { label: 'Konten Offline', icon: BookOpen, path: '/admin/offline-content', keywords: 'doa panduan manasik' },
  { label: 'Laporan', icon: FileBarChart, path: '/admin/reports', keywords: 'report' },
  { label: 'Laporan Lanjutan', icon: TrendingUp, path: '/admin/advanced-reports', keywords: 'advanced report' },
  { label: 'Users', icon: Shield, path: '/admin/users', keywords: 'pengguna akun user' },
  { label: 'Security Audit', icon: ShieldCheck, path: '/admin/security-audit', keywords: 'keamanan log' },
  { label: '2FA Settings', icon: Key, path: '/admin/2fa', keywords: 'two factor authentication' },
  { label: 'Tampilan', icon: Palette, path: '/admin/appearance', keywords: 'tema warna desain' },
  { label: 'Pengaturan', icon: Settings, path: '/admin/settings', keywords: 'setting konfigurasi' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
          {ALL_PAGES.map((page) => (
            <CommandItem
              key={page.path}
              value={`${page.label} ${page.keywords}`}
              onSelect={() => handleSelect(page.path)}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
