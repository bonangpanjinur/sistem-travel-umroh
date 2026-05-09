import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plane, Calendar, CreditCard, User, Package,
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2,
  MessageCircle, Share2, Printer, PhoneCall, Bell, BellOff
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface BookingResult {
  id: string;
  booking_code: string;
  booking_status: string;
  payment_status: string;
  total_price: number;
  paid_amount: number;
  created_at: string;
  payment_deadline: string | null;
  customer: { full_name: string; phone: string; email: string };
  departure: {
    departure_date: string;
    return_date: string;
    package: { name: string; code: string };
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  pending:    { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock,         bg: 'bg-yellow-500' },
  confirmed:  { label: 'Terkonfirmasi',       color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: CheckCircle2,  bg: 'bg-blue-500' },
  processing: { label: 'Dalam Proses',        color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock,         bg: 'bg-purple-500' },
  completed:  { label: 'Selesai',             color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle2,  bg: 'bg-green-500' },
  cancelled:  { label: 'Dibatalkan',          color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle,       bg: 'bg-red-500' },
  refunded:   { label: 'Dikembalikan',        color: 'bg-gray-100 text-gray-800 border-gray-200',       icon: XCircle,       bg: 'bg-gray-500' },
};

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Belum Bayar', color: 'bg-red-100 text-red-800' },
  partial:  { label: 'Sebagian',    color: 'bg-yellow-100 text-yellow-800' },
  paid:     { label: 'Lunas',       color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refund',      color: 'bg-gray-100 text-gray-800' },
};

const JOURNEY_STEPS = [
  { key: 'booked',    label: 'Booking',       icon: Package },
  { key: 'confirmed', label: 'Dikonfirmasi',  icon: CheckCircle2 },
  { key: 'paid',      label: 'Lunas',         icon: CreditCard },
  { key: 'departed',  label: 'Berangkat',     icon: Plane },
];

function getJourneyStep(bookingStatus: string, paymentStatus: string): number {
  if (bookingStatus === 'completed') return 4;
  if (bookingStatus === 'confirmed' && paymentStatus === 'paid') return 3;
  if (bookingStatus === 'confirmed') return 2;
  if (bookingStatus === 'pending') return 1;
  return 1;
}

const WA_NUMBER = '628123456789';

export default function BookingStatusPage() {
  const [bookingCode, setBookingCode] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Reminder subscription state
  const [reminderPhone, setReminderPhone] = useState("");
  const [reminderDays, setReminderDays] = useState("3");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSubscribed, setReminderSubscribed] = useState(false);

  const handleSubscribeReminder = async () => {
    if (!result || !reminderPhone.trim()) return;
    setReminderLoading(true);
    try {
      const supabaseRaw: any = supabase;
      const { error: insertErr } = await supabaseRaw
        .from('payment_deadline_reminders')
        .upsert({
          booking_id:       result.id,
          booking_code:     result.booking_code,
          phone:            reminderPhone.trim(),
          full_name:        result.customer?.full_name || null,
          payment_deadline: result.payment_deadline || null,
          remaining_amount: Math.max(0, result.total_price - (result.paid_amount || 0)),
          days_before:      parseInt(reminderDays),
          status:           'pending',
        }, { onConflict: 'booking_id' });

      if (insertErr) throw insertErr;
      setReminderSubscribed(true);
      toast.success("Pengingat berhasil diaktifkan! Admin akan menghubungi Anda via WhatsApp.");
    } catch (e: any) {
      toast.error("Gagal mengaktifkan pengingat: " + (e.message || "Coba lagi"));
    } finally {
      setReminderLoading(false);
    }
  };

  const handleSearch = async () => {
    const code = bookingCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    const supabaseRaw: any = supabase;
    const { data, error: err } = await supabaseRaw
      .from('bookings')
      .select(`
        id, booking_code, booking_status, payment_status,
        total_price, paid_amount, created_at, payment_deadline,
        customer:customers(full_name, phone, email),
        departure:departures(
          departure_date, return_date,
          package:packages(name, code)
        )
      `)
      .eq('booking_code', code)
      .maybeSingle();

    setLoading(false);

    if (err) { setError("Gagal memuat data. Coba lagi."); return; }
    if (!data) { setError("Kode booking tidak ditemukan. Pastikan kode yang Anda masukkan benar."); return; }

    const booking = data as BookingResult;
    setResult(booking);
    setReminderSubscribed(false);
    // Pre-fill phone dari data customer
    if (booking.customer?.phone) setReminderPhone(booking.customer.phone);
  };

  const statusCfg = result ? (STATUS_CONFIG[result.booking_status] || STATUS_CONFIG.pending) : null;
  const payCfg   = result ? (PAY_STATUS[result.payment_status]   || PAY_STATUS.pending)   : null;
  const remaining = result ? Math.max(0, result.total_price - (result.paid_amount || 0)) : 0;
  const paymentPct = result && result.total_price > 0
    ? Math.min(100, Math.round(((result.paid_amount || 0) / result.total_price) * 100))
    : 0;
  const journeyStep = result ? getJourneyStep(result.booking_status, result.payment_status) : 0;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Status Booking', text: `Kode: ${result?.booking_code}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin ke clipboard");
    }
  };

  const waMsg = result
    ? encodeURIComponent(`Halo Vinstour Travel, saya ingin menanyakan status booking saya dengan kode: ${result.booking_code}. Nama: ${result.customer?.full_name}. Mohon bantuannya.`)
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-primary font-bold text-lg">← Beranda</Link>
          <h1 className="font-bold text-gray-800">Cek Status Booking</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-12 px-4">
        <div className="w-full max-w-lg space-y-6">

          {/* Search Hero */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Cek Status Pemesanan</h2>
            <p className="text-muted-foreground text-sm">
              Masukkan kode booking untuk melihat status perjalanan Anda tanpa perlu login.
            </p>
          </div>

          {/* Search Box */}
          <Card className="shadow-md border-0">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Kode Booking</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Contoh: BK-2024-001"
                    value={bookingCode}
                    onChange={e => setBookingCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="text-center font-mono text-base tracking-widest uppercase"
                    maxLength={20}
                  />
                  <Button onClick={handleSearch} disabled={loading || !bookingCode.trim()} className="px-6">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Kode booking dikirim via WhatsApp/email saat booking dibuat
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && searched && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-red-700 font-medium mb-2">{error}</p>
                  <Button size="sm" variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-100" asChild>
                    <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Halo Vinstour Travel, saya butuh bantuan cek status booking saya.')}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      Hubungi Admin
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && statusCfg && payCfg && (
            <Card className="shadow-lg border-0 overflow-hidden">
              {/* Status Banner */}
              <div className={`px-6 py-4 ${result.booking_status === 'completed' ? 'bg-green-600' : result.booking_status === 'cancelled' ? 'bg-red-500' : 'bg-primary'}`}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-80">Kode Booking</p>
                    <p className="text-xl font-bold tracking-wider font-mono">{result.booking_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80">Status</p>
                    <p className="text-base font-bold">{statusCfg.label}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Bagikan
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Cetak
                  </button>
                </div>
              </div>

              {/* Journey Progress Timeline */}
              {result.booking_status !== 'cancelled' && result.booking_status !== 'refunded' && (
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tahap Perjalanan</p>
                  <div className="flex items-center">
                    {JOURNEY_STEPS.map((step, idx) => {
                      const done = idx < journeyStep;
                      const active = idx === journeyStep - 1;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              done
                                ? 'bg-primary text-white'
                                : active
                                  ? 'bg-primary/20 border-2 border-primary text-primary'
                                  : 'bg-gray-200 text-gray-400'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap ${done || active ? 'text-primary' : 'text-gray-400'}`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < JOURNEY_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < journeyStep - 1 ? 'bg-primary' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <CardContent className="pt-5 space-y-5">
                {/* Paket & Keberangkatan */}
                {result.departure && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paket Perjalanan</p>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">{result.departure.package?.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {result.departure.departure_date ? formatDate(result.departure.departure_date) : '-'}
                            {result.departure.return_date ? ` → ${formatDate(result.departure.return_date)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Customer */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Pemesan</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{result.customer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{result.customer?.phone}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pembayaran</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${payCfg.color}`}>
                      {payCfg.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terbayar</span>
                      <span className="font-bold text-green-600">{paymentPct}%</span>
                    </div>
                    <Progress value={paymentPct} className="h-3 rounded-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(result.paid_amount || 0)}</span>
                      <span>dari {formatCurrency(result.total_price)}</span>
                    </div>
                  </div>

                  {remaining > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Sisa Pembayaran</p>
                          <p className="text-lg font-bold text-amber-800">{formatCurrency(remaining)}</p>
                        </div>
                        {result.payment_deadline && (
                          <div className="text-right">
                            <p className="text-[10px] text-amber-600">Batas waktu</p>
                            <p className="text-xs font-semibold text-amber-800">{formatDate(result.payment_deadline)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Pengingat Pelunasan — hanya tampil jika ada sisa bayar + deadline */}
                {remaining > 0 && result.payment_deadline && result.booking_status !== 'cancelled' && (
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
                              Admin akan menghubungi Anda di <strong>{reminderPhone}</strong> via WhatsApp H-{reminderDays} sebelum batas pelunasan.
                            </p>
                            <button
                              onClick={() => setReminderSubscribed(false)}
                              className="text-xs text-green-600 underline mt-1 hover:text-green-800"
                            >
                              Ubah nomor atau jadwal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                          <p className="text-xs text-amber-700">
                            Aktifkan pengingat agar kami menghubungi Anda via WhatsApp sebelum batas waktu pelunasan.
                          </p>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Nomor WhatsApp Anda</label>
                            <Input
                              placeholder="Contoh: 0812xxxxxxxx"
                              value={reminderPhone}
                              onChange={e => setReminderPhone(e.target.value)}
                              className="bg-white text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Ingatkan saya</label>
                            <div className="flex gap-2">
                              {["1", "2", "3", "5"].map(d => (
                                <button
                                  key={d}
                                  onClick={() => setReminderDays(d)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                    reminderDays === d
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white border-gray-200 text-gray-600 hover:border-amber-300"
                                  }`}
                                >
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
                            {reminderLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Bell className="h-4 w-4" />
                            }
                            Aktifkan Pengingat H-{reminderDays}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* WhatsApp Contact */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Butuh Bantuan?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full" asChild>
                      <a href={`https://wa.me/${WA_NUMBER}?text=${waMsg}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                    <Button variant="outline" className="gap-2 w-full" asChild>
                      <a href={`tel:+${WA_NUMBER}`}>
                        <PhoneCall className="h-4 w-4" />
                        Telepon
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Dibuat: {result.created_at ? format(new Date(result.created_at), 'd MMM yyyy, HH:mm', { locale: localeId }) : '-'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info card saat belum ada hasil */}
          {!result && !error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
              <span>Tidak tahu kode booking Anda? Hubungi admin via WhatsApp dengan nama lengkap Anda.</span>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t bg-white text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary transition-colors">← Kembali ke Beranda</Link>
        <span className="mx-2">·</span>
        <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="hover:text-green-600 transition-colors">
          Hubungi Kami
        </a>
      </footer>
    </div>
  );
}
