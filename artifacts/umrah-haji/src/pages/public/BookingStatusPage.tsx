/**
 * /cek-booking — Halaman publik cek status booking jamaah
 *
 * Keamanan:
 *  - Data diambil via API endpoint (bukan Supabase langsung) → tidak ada
 *    akses ke data sensitif (NIK, nomor HP penuh, email)
 *  - Nama jamaah disamarkan oleh server (misal "Ahmad S***")
 *  - URL dapat di-bookmark: /cek-booking?code=BOOK-xxx
 *
 * Style: menggunakan global style tokens (section-padded, container-page,
 *        heading-1, heading-3) sesuai konvensi proyek.
 */

import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Plane, Calendar, CreditCard, Package,
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2,
  MessageCircle, Share2, Printer, PhoneCall, Bell,
  ClipboardList, ArrowRight, Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentRow {
  payment_code: string;
  amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface BookingStatusData {
  booking_id: string;
  booking_code: string;
  booking_status: string;
  payment_status: string;
  total_price: number;
  amount_paid: number;
  payment_deadline: string | null;
  created_at: string;
  customer_name: string;
  departure_date: string | null;
  return_date: string | null;
  flight_number: string | null;
  package_name: string;
  package_code: string;
  package_type: string;
  passenger_count: number;
  payments: PaymentRow[];
  checklist: { total: number; done: number } | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bannerBg: string; icon: React.ElementType }> = {
  pending:    { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', bannerBg: 'bg-primary',    icon: Clock },
  confirmed:  { label: 'Terkonfirmasi',       color: 'bg-blue-100 text-blue-800 border-blue-200',       bannerBg: 'bg-blue-600',   icon: CheckCircle2 },
  processing: { label: 'Dalam Proses',        color: 'bg-purple-100 text-purple-800 border-purple-200', bannerBg: 'bg-purple-600', icon: Clock },
  completed:  { label: 'Selesai',             color: 'bg-green-100 text-green-800 border-green-200',    bannerBg: 'bg-green-600',  icon: CheckCircle2 },
  cancelled:  { label: 'Dibatalkan',          color: 'bg-red-100 text-red-800 border-red-200',          bannerBg: 'bg-red-500',    icon: XCircle },
  refunded:   { label: 'Dikembalikan',        color: 'bg-gray-100 text-gray-800 border-gray-200',       bannerBg: 'bg-gray-500',   icon: XCircle },
};

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  unpaid:   { label: 'Belum Bayar',    color: 'bg-red-100 text-red-800' },
  partial:  { label: 'Bayar Sebagian', color: 'bg-yellow-100 text-yellow-800' },
  paid:     { label: 'Lunas',          color: 'bg-green-100 text-green-800' },
  overpaid: { label: 'Lebih Bayar',    color: 'bg-purple-100 text-purple-800' },
  refunded: { label: 'Refund',         color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_ROW_STATUS: Record<string, { label: string; color: string }> = {
  verified:  { label: 'Terverifikasi', color: 'text-emerald-700' },
  confirmed: { label: 'Dikonfirmasi',  color: 'text-emerald-700' },
  pending:   { label: 'Menunggu',      color: 'text-amber-600'   },
  rejected:  { label: 'Ditolak',       color: 'text-red-600'     },
};

const JOURNEY_STEPS = [
  { key: 'booked',    label: 'Booking',      icon: Package },
  { key: 'confirmed', label: 'Dikonfirmasi', icon: CheckCircle2 },
  { key: 'paid',      label: 'Lunas',        icon: CreditCard },
  { key: 'departed',  label: 'Berangkat',    icon: Plane },
];

function getJourneyStep(bookingStatus: string, paymentStatus: string): number {
  if (bookingStatus === 'completed') return 4;
  if (bookingStatus === 'confirmed' && paymentStatus === 'paid') return 3;
  if (bookingStatus === 'confirmed') return 2;
  return 1;
}

// ─── API Fetch ────────────────────────────────────────────────────────────────

async function fetchBookingStatus(code: string): Promise<BookingStatusData> {
  const res = await fetch(`/api/public/booking-status?code=${encodeURIComponent(code)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Terjadi kesalahan");
  return json.data as BookingStatusData;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingStatusPage() {
  const { data: settings } = useWebsiteSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const waRaw = settings?.footer_whatsapp ?? "628123456789";
  const WA_NUMBER = waRaw.replace(/\D/g, "").replace(/^0/, "62");

  const [input, setInput] = useState(searchParams.get("code") ?? "");
  const [activeCode, setActiveCode] = useState(searchParams.get("code") ?? "");

  // Payment reminder state
  const [reminderPhone, setReminderPhone] = useState("");
  const [reminderDays, setReminderDays] = useState("3");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSubscribed, setReminderSubscribed] = useState(false);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["public-booking-status", activeCode],
    queryFn: () => fetchBookingStatus(activeCode),
    enabled: !!activeCode,
    retry: false,
    staleTime: 30_000,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setActiveCode(trimmed);
    setReminderSubscribed(false);
    navigate(`/cek-booking?code=${encodeURIComponent(trimmed)}`, { replace: true });
  }

  async function handleSubscribeReminder() {
    if (!data || !reminderPhone.trim()) return;
    setReminderLoading(true);
    try {
      const { error: insertErr } = await (supabase as any)
        .from('payment_deadline_reminders')
        .upsert({
          booking_id:       data.booking_id,
          booking_code:     data.booking_code,
          phone:            reminderPhone.trim(),
          full_name:        data.customer_name,
          payment_deadline: data.payment_deadline ?? null,
          remaining_amount: Math.max(0, data.total_price - data.amount_paid),
          days_before:      parseInt(reminderDays),
          status:           'pending',
        }, { onConflict: 'booking_id' });
      if (insertErr) throw insertErr;
      setReminderSubscribed(true);
      toast.success("Pengingat diaktifkan! Admin akan menghubungi Anda via WhatsApp.");
    } catch (e: any) {
      toast.error("Gagal mengaktifkan pengingat: " + (e.message ?? "Coba lagi"));
    } finally {
      setReminderLoading(false);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: 'Status Booking', text: `Kode: ${data?.booking_code}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin ke clipboard");
    }
  }

  const statusCfg  = data ? (STATUS_CONFIG[data.booking_status] ?? STATUS_CONFIG.pending) : null;
  const payCfg     = data ? (PAY_STATUS[data.payment_status]    ?? PAY_STATUS.unpaid)     : null;
  const remaining  = data ? Math.max(0, data.total_price - data.amount_paid) : 0;
  const payPct     = data && data.total_price > 0
    ? Math.min(100, Math.round((data.amount_paid / data.total_price) * 100)) : 0;
  const journeyStep = data ? getJourneyStep(data.booking_status, data.payment_status) : 0;
  const waMsg = data
    ? encodeURIComponent(`Halo ${settings?.company_name ?? 'Travel'}, saya ingin menanyakan status booking saya: ${data.booking_code}. Mohon bantuannya.`)
    : '';
  const isCancelled = data?.booking_status === 'cancelled' || data?.booking_status === 'refunded';

  return (
    <DynamicPublicLayout>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="section-padded bg-gradient-to-b from-primary/8 via-background to-background border-b border-border/50">
        <div className="container-page max-w-lg text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-1">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <h1 className="heading-1">Cek Status Pemesanan</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Masukkan kode booking untuk melihat status perjalanan Anda — tanpa perlu login.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Contoh: BK-2024-001"
              className="text-center font-mono text-base tracking-widest uppercase h-12"
              autoComplete="off"
              maxLength={24}
            />
            <Button type="submit" size="lg" disabled={!input.trim() || isFetching} className="h-12 px-5 shrink-0">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Link to="/" className="hover:text-primary transition-colors">Beranda</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cek Booking</span>
          </nav>
        </div>
      </section>

      {/* ── Result area ──────────────────────────────────────────────── */}
      <section className="section-padded">
        <div className="container-page max-w-lg space-y-5">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Mencari data booking…</p>
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <CardContent className="pt-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    {(error as Error)?.message ?? "Kode booking tidak ditemukan."}
                  </p>
                  <Button size="sm" variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-100" asChild>
                    <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Halo, saya butuh bantuan cek status booking saya.')}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> Hubungi Admin via WhatsApp
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Result Card ───────────────────────────────────────────── */}
          {data && !isLoading && statusCfg && payCfg && (
            <Card className="shadow-lg border-0 overflow-hidden">

              {/* Status Banner */}
              <div className={`px-6 py-4 ${statusCfg.bannerBg}`}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs opacity-75">Kode Booking</p>
                    <p className="text-xl font-bold tracking-wider font-mono">{data.booking_code}</p>
                    <p className="text-xs opacity-75 mt-0.5">a/n {data.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-75">Status</p>
                    <p className="text-base font-bold">{statusCfg.label}</p>
                    <p className="text-xs opacity-75 mt-0.5">{data.passenger_count} jamaah</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleShare}
                    className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors">
                    <Share2 className="h-3.5 w-3.5" /> Bagikan
                  </button>
                  <button onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors">
                    <Printer className="h-3.5 w-3.5" /> Cetak
                  </button>
                </div>
              </div>

              {/* Journey Timeline */}
              {!isCancelled && (
                <div className="px-6 py-4 bg-muted/40 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tahap Perjalanan</p>
                  <div className="flex items-center">
                    {JOURNEY_STEPS.map((step, idx) => {
                      const done   = idx < journeyStep;
                      const active = idx === journeyStep - 1;
                      const Icon   = step.icon;
                      return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              done   ? 'bg-primary text-white' :
                              active ? 'bg-primary/20 border-2 border-primary text-primary' :
                                       'bg-muted text-muted-foreground'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap ${done || active ? 'text-primary' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < JOURNEY_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < journeyStep - 1 ? 'bg-primary' : 'bg-muted'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <CardContent className="pt-5 space-y-5">

                {/* Paket & Keberangkatan */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paket Perjalanan</p>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-sm">{data.package_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {data.departure_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(data.departure_date)}
                            {data.return_date && ` → ${formatDate(data.return_date)}`}
                          </span>
                        )}
                        {data.flight_number && (
                          <span className="flex items-center gap-1">
                            <Plane className="h-3 w-3" /> {data.flight_number}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {data.passenger_count} jamaah
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pembayaran */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pembayaran</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${payCfg.color}`}>
                      {payCfg.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terbayar</span>
                      <span className="font-bold text-green-600">{payPct}%</span>
                    </div>
                    <Progress value={payPct} className="h-3 rounded-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(data.amount_paid)}</span>
                      <span>dari {formatCurrency(data.total_price)}</span>
                    </div>
                  </div>
                  {remaining > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Sisa Pembayaran</p>
                          <p className="text-lg font-bold text-amber-800">{formatCurrency(remaining)}</p>
                        </div>
                        {data.payment_deadline && (
                          <div className="text-right">
                            <p className="text-[10px] text-amber-600">Batas waktu</p>
                            <p className="text-xs font-semibold text-amber-800">{formatDate(data.payment_deadline)}</p>
                          </div>
                        )}
                      </div>
                      <a
                        href={`/bayar/${data.booking_code}`}
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        💳 Bayar Sekarang
                      </a>
                    </div>
                  )}

                  {/* Riwayat pembayaran */}
                  {data.payments.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riwayat Pembayaran</p>
                      {data.payments.map((p) => {
                        const ps = PAYMENT_ROW_STATUS[p.status] ?? { label: p.status, color: 'text-foreground' };
                        return (
                          <div key={p.payment_code} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-muted-foreground">{p.payment_code}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.payment_method ?? "Transfer"} · {formatDate(p.paid_at ?? p.created_at)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm">{formatCurrency(p.amount)}</p>
                              <p className={`text-xs font-medium ${ps.color}`}>{ps.label}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Checklist Dokumen */}
                {data.checklist && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" /> Progress Dokumen
                      </p>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Dokumen selesai</span>
                        <span className="font-bold">{data.checklist.done} / {data.checklist.total}</span>
                      </div>
                      <Progress
                        value={Math.round((data.checklist.done / data.checklist.total) * 100)}
                        className="h-2.5 rounded-full"
                      />
                      {data.checklist.done < data.checklist.total ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                          ⚠ Masih ada {data.checklist.total - data.checklist.done} dokumen yang belum lengkap. Harap segera hubungi tim kami.
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
                          ✓ Semua dokumen sudah lengkap.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Pengingat Pelunasan */}
                {remaining > 0 && data.payment_deadline && !isCancelled && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pengingat Pelunasan</p>
                      </div>
                      {reminderSubscribed ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-800">Pengingat diaktifkan!</p>
                            <p className="text-xs text-green-700 mt-0.5">
                              Admin akan menghubungi <strong>{reminderPhone}</strong> via WhatsApp H-{reminderDays} sebelum batas pelunasan.
                            </p>
                            <button onClick={() => setReminderSubscribed(false)} className="text-xs text-green-600 underline mt-1 hover:text-green-800">
                              Ubah pengaturan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                          <p className="text-xs text-amber-700">
                            Aktifkan pengingat agar kami menghubungi Anda via WhatsApp sebelum batas waktu pelunasan.
                          </p>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Nomor WhatsApp Anda</label>
                            <Input
                              placeholder="Contoh: 0812xxxxxxxx"
                              value={reminderPhone}
                              onChange={(e) => setReminderPhone(e.target.value)}
                              className="bg-white text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Ingatkan saya</label>
                            <div className="flex gap-2">
                              {["1", "2", "3", "5"].map((d) => (
                                <button key={d} onClick={() => setReminderDays(d)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                    reminderDays === d
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white border-border text-muted-foreground hover:border-amber-300"
                                  }`}>
                                  H-{d}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button
                            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                            disabled={reminderLoading || !reminderPhone.trim()}
                            onClick={handleSubscribeReminder}
                          >
                            {reminderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                            Aktifkan Pengingat H-{reminderDays}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Bantuan */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Butuh Bantuan?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full" asChild>
                      <a href={`https://wa.me/${WA_NUMBER}?text=${waMsg}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                    <Button variant="outline" className="gap-2 w-full" asChild>
                      <a href={`tel:+${WA_NUMBER}`}>
                        <PhoneCall className="h-4 w-4" /> Telepon
                      </a>
                    </Button>
                  </div>
                </div>

                {/* CTA Login */}
                <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                  <div>
                    <p className="text-sm font-semibold">Lihat detail lengkap</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Invoice, e-tiket, jadwal manasik, dan lainnya.</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/auth/login">
                      Masuk <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Booking dibuat: {data.created_at ? format(new Date(data.created_at), 'd MMM yyyy, HH:mm', { locale: localeId }) : '-'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty state (belum search) */}
          {!activeCode && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <span>Tidak tahu kode booking Anda? Hubungi admin via WhatsApp dengan nama lengkap Anda, kami akan bantu carikan.</span>
              </div>
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground mb-3">Atau masuk ke akun Anda untuk melihat semua booking</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/auth/login">Masuk</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Daftar Sekarang</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </DynamicPublicLayout>
  );
}
