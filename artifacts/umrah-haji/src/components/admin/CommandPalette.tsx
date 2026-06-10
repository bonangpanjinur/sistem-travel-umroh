import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDynamicMenus } from "@/hooks/useDynamicMenus";
import { getMenuIcon } from "@/lib/admin-menu-icons";
import { supabase } from "@/integrations/supabase/client";
import { User, ShoppingCart, Loader2 } from "lucide-react";

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
  'finance/jurnal': 'jurnal umum double entry accounting',
  'finance/buku-besar': 'buku besar general ledger akun',
  'finance/neraca-saldo': 'neraca saldo trial balance',
  'finance/laba-rugi': 'laporan laba rugi income statement',
  'finance/neraca': 'neraca balance sheet aset kewajiban',
  'finance/arus-kas': 'arus kas cash flow statement',
  'finance/budget': 'budget anggaran vs aktual realisasi',
  'finance/rekonsiliasi': 'rekonsiliasi bank reconciliation',
  'finance/laporan-pajak': 'laporan pajak ppn pph tax report',
  'finance/hpp-terpadu': 'hpp terpadu harga pokok penjualan biaya keberangkatan margin paket',
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

interface DataResult {
  id: string;
  label: string;
  sublabel: string;
  path: string;
  type: 'booking' | 'customer';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dataResults, setDataResults] = useState<DataResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const { menus } = useDynamicMenus();

  const commandItems = useMemo(() => {
    return menus.map(menu => ({
      label: menu.label,
      icon: getMenuIcon(menu.icon),
      path: menu.path,
      keywords: keywordMap[menu.key] || menu.label.toLowerCase(),
    }));
  }, [menus]);

  // Data search with debounce
  const searchData = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setDataResults([]);
      return;
    }
    setSearching(true);
    try {
      const sanitized = q.trim().replace(/[%_]/g, '');
      const [bookingRes, customerRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, booking_code, customer:customers(full_name)')
          .or(`booking_code.ilike.%${sanitized}%`)
          .limit(5),
        supabase
          .from('customers')
          .select('id, full_name, phone')
          .or(`full_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
          .limit(5),
      ]);

      const results: DataResult[] = [];
      for (const b of bookingRes.data || []) {
        const c = (b.customer as any);
        results.push({
          id: b.id,
          label: b.booking_code,
          sublabel: c?.full_name || '',
          path: `/admin/bookings/${b.id}`,
          type: 'booking',
        });
      }
      for (const c of customerRes.data || []) {
        results.push({
          id: c.id,
          label: c.full_name,
          sublabel: c.phone || '',
          path: `/admin/customers/${c.id}`,
          type: 'customer',
        });
      }
      setDataResults(results);
    } catch {
      setDataResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) { setDataResults([]); setQuery(""); return; }
    const t = setTimeout(() => searchData(query), 300);
    return () => clearTimeout(t);
  }, [query, open, searchData]);

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
      <CommandInput
        placeholder="Cari halaman, kode booking, nama jamaah... (Ctrl+K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Mencari...</span>
            </div>
          ) : (
            "Tidak ditemukan."
          )}
        </CommandEmpty>

        {dataResults.length > 0 && (
          <>
            <CommandGroup heading="Hasil Pencarian Data">
              {dataResults.map(item => (
                <CommandItem
                  key={`data-${item.type}-${item.id}`}
                  value={`${item.label} ${item.sublabel}`}
                  onSelect={() => handleSelect(item.path)}
                >
                  {item.type === 'booking'
                    ? <ShoppingCart className="mr-2 h-4 w-4 text-blue-500" />
                    : <User className="mr-2 h-4 w-4 text-emerald-500" />
                  }
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

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
