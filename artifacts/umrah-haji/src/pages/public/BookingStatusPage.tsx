import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plane, Calendar, CreditCard, User, Package, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Link } from "react-router-dom";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: 'Menunggu',      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed:  { label: 'Terkonfirmasi', color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: CheckCircle2 },
  processing: { label: 'Dalam Proses',  color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock },
  completed:  { label: 'Selesai',       color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle2 },
  cancelled:  { label: 'Dibatalkan',    color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  refunded:   { label: 'Dikembalikan',  color: 'bg-gray-100 text-gray-800 border-gray-200',       icon: XCircle },
};

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Belum Bayar', color: 'bg-red-100 text-red-800' },
  partial:  { label: 'Sebagian',    color: 'bg-yellow-100 text-yellow-800' },
  paid:     { label: 'Lunas',       color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refund',      color: 'bg-gray-100 text-gray-800' },
};

export default function BookingStatusPage() {
  const [bookingCode, setBookingCode] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const code = bookingCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    const { data, error: err } = await supabase
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

    setResult(data as unknown as BookingResult);
  };

  const statusCfg = result ? (STATUS_CONFIG[result.booking_status] || STATUS_CONFIG.pending) : null;
  const payCfg   = result ? (PAY_STATUS[result.payment_status]   || PAY_STATUS.pending)   : null;
  const remaining = result ? Math.max(0, result.total_price - (result.paid_amount || 0)) : 0;

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
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && statusCfg && payCfg && (
            <Card className="shadow-lg border-0 overflow-hidden">
              {/* Status Banner */}
              <div className={`px-6 py-4 ${result.booking_status === 'completed' ? 'bg-green-500' : result.booking_status === 'cancelled' ? 'bg-red-500' : 'bg-primary'}`}>
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
              </div>

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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informasi Pembayaran</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <p className="text-xs text-muted-foreground">Total Harga</p>
                      <p className="font-bold">{formatCurrency(result.total_price)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <p className="text-xs text-muted-foreground">Sudah Dibayar</p>
                      <p className="font-bold text-green-600">{formatCurrency(result.paid_amount || 0)}</p>
                    </div>
                    {remaining > 0 && (
                      <div className="col-span-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 space-y-1">
                        <p className="text-xs text-yellow-700">Sisa Pembayaran</p>
                        <p className="font-bold text-yellow-800">{formatCurrency(remaining)}</p>
                        {result.payment_deadline && (
                          <p className="text-xs text-yellow-600">
                            Batas: {formatDate(result.payment_deadline)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status Pembayaran</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${payCfg.color}`}>
                      {payCfg.label}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Dibuat: {result.created_at ? format(new Date(result.created_at), 'd MMM yyyy', { locale: localeId }) : '-'}</span>
                  <span>Butuh bantuan? Hubungi kami</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
