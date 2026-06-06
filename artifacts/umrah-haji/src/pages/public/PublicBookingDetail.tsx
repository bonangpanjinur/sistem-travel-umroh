import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ShieldCheck, Plane, Calendar, Package, User, CreditCard,
  Home, Building2, MessageCircle, Phone, Mail, MapPin, Download,
  CheckCircle2, Clock, XCircle, AlertTriangle, Printer, Users,
  FileText, ChevronRight, Star, Info, ArrowLeft,
  Hotel, Navigation2, Upload, Send,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { format, differenceInDays, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { generateInvoice, type InvoiceDataExtended } from "@/lib/document-generator";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PublicBooking {
  id: string;
  booking_code: string;
  booking_status: string;
  payment_status: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  room_type: string;
  total_pax: number;
  created_at: string;
  payment_deadline: string | null;
  notes: string | null;
  customer: { full_name: string; phone_masked: string | null } | null;
  departure: {
    id?: string;
    departure_date: string;
    return_date: string;
    airport_origin?: string | null;
    package: {
      name: string;
      code: string;
      duration_days?: number | null;
      description?: string | null;
    } | null;
  } | null;
}

interface PassengerInfo {
  full_name: string;
  passenger_type: string;
  room_preference: string | null;
}

interface PaymentItem {
  amount: number;
  payment_method: string | null;
  created_at: string;
  status: string;
}

interface HotelInfo {
  name: string;
  city: string;
  star_rating?: number | null;
}

interface CompanyPublic {
  company_name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  tagline?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_account_name?: string | null;
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

const BOOKING_STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Menunggu Konfirmasi", color: "text-amber-700 bg-amber-50 border-amber-200",     icon: Clock },
  confirmed:  { label: "Terkonfirmasi",       color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  processing: { label: "Dalam Proses",        color: "text-blue-700 bg-blue-50 border-blue-200",         icon: Loader2 },
  completed:  { label: "Selesai",             color: "text-emerald-800 bg-emerald-100 border-emerald-300", icon: CheckCircle2 },
  cancelled:  { label: "Dibatalkan",          color: "text-red-700 bg-red-50 border-red-200",             icon: XCircle },
  refunded:   { label: "Dikembalikan",        color: "text-gray-700 bg-gray-50 border-gray-200",          icon: ArrowLeft },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Belum Bayar",   color: "text-red-700 bg-red-50 border-red-200" },
  partial: { label: "Bayar Sebagian", color: "text-amber-700 bg-amber-50 border-amber-200" },
  paid:    { label: "Lunas",         color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  refunded:{ label: "Refund",        color: "text-gray-700 bg-gray-50 border-gray-200" },
};

const ROOM_LABEL: Record<string, string> = {
  quad: "Quad (4 Pax/Kamar)", triple: "Triple (3 Pax/Kamar)",
  double: "Double (2 Pax/Kamar)", single: "Single (1 Pax/Kamar)",
};

const PAX_TYPE_LABEL: Record<string, string> = {
  adult: "Dewasa", child: "Anak", infant: "Bayi/Balita",
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function PublicBookingDetail() {
  const { token } = useParams<{ token: string }>();

  const [booking, setBooking]     = useState<PublicBooking | null>(null);
  const [passengers, setPassengers] = useState<PassengerInfo[]>([]);
  const [payments, setPayments]   = useState<PaymentItem[]>([]);
  const [hotel, setHotel]         = useState<HotelInfo | null>(null);
  const [airline, setAirline]     = useState<string | null>(null);
  const [company, setCompany]     = useState<CompanyPublic | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // ── Payment form state ────────────────────────────────────────────────────
  const [showPayForm, setShowPayForm]     = useState(false);
  const [payAmount, setPayAmount]         = useState("");
  const [payMethod, setPayMethod]         = useState("bank_transfer");
  const [payBankName, setPayBankName]     = useState("");
  const [payNotes, setPayNotes]           = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // ── Fetch all data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      // 1. Core booking via RPC
      const { data: res, error: rpcErr } = await (supabase as any).rpc(
        "get_public_booking_by_token",
        { p_token: token }
      );

      if (cancelled) return;

      if (rpcErr) {
        const is404 = rpcErr.code === "PGRST202" || rpcErr.message?.includes("404") ||
          rpcErr.message?.includes("not found");
        setError(
          is404
            ? "Layanan verifikasi sedang dalam proses aktivasi. Hubungi admin untuk informasi booking Anda."
            : "Gagal memuat data transaksi. Coba lagi beberapa saat."
        );
        setLoading(false);
        return;
      }

      if (!res) {
        setError("Transaksi tidak ditemukan. Pastikan QR Code yang Anda scan benar.");
        setLoading(false);
        return;
      }

      const bk = res as PublicBooking;
      setBooking(bk);

      // 2. Fetch supplemental data in parallel (graceful failures)
      const bookingId = bk.id;

      await Promise.allSettled([
        // Company info
        (async () => {
          const { data: ws } = await supabase
            .from("website_settings")
            .select("company_name, logo_url, footer_phone, footer_whatsapp, footer_email, footer_address, tagline")
            .maybeSingle();
          const { data: banks } = await (supabase as any)
            .from("bank_accounts")
            .select("bank_name, account_number, account_name")
            .eq("is_primary", true)
            .maybeSingle();
          if (!cancelled && ws) {
            setCompany({
              company_name: ws.company_name || "Travel Agency",
              logo_url: ws.logo_url || null,
              phone: ws.footer_phone || null,
              whatsapp: ws.footer_whatsapp || ws.footer_phone || null,
              email: ws.footer_email || null,
              address: ws.footer_address || null,
              website: null,
              tagline: ws.tagline || null,
              bank_name: banks?.bank_name || null,
              bank_account: banks?.account_number || null,
              bank_account_name: banks?.account_name || null,
            });
          }
        })(),

        // Passengers
        (async () => {
          const { data: pax } = await (supabase as any)
            .from("booking_passengers")
            .select("passenger_type, room_preference, customer:customers(full_name)")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true });
          if (!cancelled && pax) {
            setPassengers(pax.map((p: any) => ({
              full_name: p.customer?.full_name || "-",
              passenger_type: p.passenger_type || "adult",
              room_preference: p.room_preference || bk.room_type,
            })));
          }
        })(),

        // Payments history (including pending so customer can see "menunggu verifikasi")
        (async () => {
          const { data: pmts } = await (supabase as any)
            .from("payments")
            .select("amount, payment_method, created_at, status")
            .eq("booking_id", bookingId)
            .in("status", ["paid", "verified", "partial", "pending"])
            .order("created_at", { ascending: true });
          if (!cancelled && pmts) setPayments(pmts);
        })(),

        // Departure details (hotel + airline)
        (async () => {
          if (!bk.departure?.id) return;
          const { data: dep } = await (supabase as any)
            .from("departures")
            .select("hotel_makkah:hotel_makkah_id(name, city, star_rating), airline:airline_id(name)")
            .eq("id", bk.departure.id)
            .maybeSingle();
          if (!cancelled && dep) {
            if (dep.hotel_makkah) setHotel(dep.hotel_makkah);
            if (dep.airline) setAirline(dep.airline.name);
          }
        })(),
      ]);

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [token]);

  // ── Generate Invoice PDF ────────────────────────────────────────────────────
  const handleDownloadInvoice = useCallback(async () => {
    if (!booking) return;
    setDownloading(true);
    try {
      const departure = booking.departure;
      const paxCount = booking.total_pax || 1;
      const pricePerPax = Math.round(
        (booking.total_price - 0) / paxCount
      );

      const invoiceItems = passengers.length > 0
        ? passengers.map((p) => ({
            description: `${p.full_name} (${PAX_TYPE_LABEL[p.passenger_type] || p.passenger_type}) — ${ROOM_LABEL[p.room_preference || booking.room_type] || p.room_preference || booking.room_type}`,
            quantity: 1,
            unitPrice: pricePerPax,
            total: pricePerPax,
          }))
        : [{
            description: `Paket ${departure?.package?.name || "Umrah"} — ${paxCount} Pax`,
            quantity: paxCount,
            unitPrice: pricePerPax,
            total: booking.total_price,
          }];

      const invoiceData: InvoiceDataExtended = {
        invoiceNumber: `INV-${booking.booking_code}`,
        invoiceDate: new Date(booking.created_at),
        dueDate: booking.payment_deadline ? new Date(booking.payment_deadline) : new Date(),
        customer: {
          name: booking.customer?.full_name || "-",
          address: "-",
          phone: booking.customer?.phone_masked || "-",
        },
        items: invoiceItems,
        subtotal: booking.total_price,
        total: booking.total_price,
        paidAmount: booking.paid_amount || 0,
        remainingAmount: booking.remaining_amount || 0,
        paymentStatus: (booking.payment_status as any) || "pending",
        packageName: departure?.package?.name,
        departureDate: departure?.departure_date ? formatDate(departure.departure_date) : undefined,
        bankInfo: company?.bank_name ? {
          bankName: company.bank_name,
          accountNumber: company.bank_account || "-",
          accountName: company.bank_account_name || "-",
        } : undefined,
        verifyUrl: window.location.href,
      };

      const companyInfo = company ? {
        company_name: company.company_name,
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        logo_url: company.logo_url || "",
        website: company.website || "",
      } : undefined;

      const doc = await generateInvoice(invoiceData, companyInfo as any);
      doc.save(`Invoice-${booking.booking_code}.pdf`);
      toast.success("Invoice berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal membuat invoice: " + (e.message || ""));
    } finally {
      setDownloading(false);
    }
  }, [booking, passengers, company]);

  // ── Submit konfirmasi pembayaran (publik, tanpa login) ────────────────────
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const amountNum = parseFloat(payAmount.replace(/\./g, "").replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah pembayaran yang valid");
      return;
    }

    setIsSubmittingPay(true);
    try {
      const res = await fetch("/api/public/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id:    booking.id,
          customer_name: booking.customer?.full_name ?? "Jamaah",
          amount:        amountNum,
          payment_method: payMethod,
          bank_name:     payBankName || null,
          notes:         payNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Gagal mengirim konfirmasi");

      toast.success("Konfirmasi pembayaran berhasil dikirim! Tim finance kami akan memverifikasi segera.");
      setShowPayForm(false);
      setPayAmount("");
      setPayBankName("");
      setPayNotes("");
      setPayMethod("bank_transfer");

      // Refresh daftar pembayaran
      const { data: pmts } = await (supabase as any)
        .from("payments")
        .select("amount, payment_method, created_at, status")
        .eq("booking_id", booking.id)
        .in("status", ["paid", "verified", "partial", "pending"])
        .order("created_at", { ascending: true });
      if (pmts) setPayments(pmts);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengirim konfirmasi pembayaran");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const paymentPct = booking && booking.total_price > 0
    ? Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100))
    : 0;

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const verifiedPayments = payments.filter((p) => p.status !== "pending");

  const deadline = booking?.payment_deadline ? new Date(booking.payment_deadline) : null;
  const daysUntilDeadline = deadline ? differenceInDays(deadline, new Date()) : null;
  const isDeadlinePast = deadline ? isPast(deadline) : false;

  const bStatus = BOOKING_STATUS_MAP[booking?.booking_status || "pending"] || BOOKING_STATUS_MAP.pending;
  const pStatus = PAYMENT_STATUS_MAP[booking?.payment_status || "pending"] || PAYMENT_STATUS_MAP.pending;
  const StatusIcon = bStatus.icon;

  const waPhone = company?.whatsapp
    ? company.whatsapp.replace(/^0/, "62").replace(/\D/g, "")
    : null;

  const duration = booking?.departure?.package?.duration_days
    ? `${booking.departure.package.duration_days} Hari`
    : booking?.departure
    ? `${differenceInDays(new Date(booking.departure.return_date), new Date(booking.departure.departure_date))} Hari`
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DynamicPublicLayout>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { font-size: 12px; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-950 border-b shadow-sm sticky top-0 z-10 no-print">
          <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Halaman Transparansi Transaksi</span>
              <span className="hidden sm:inline text-muted-foreground">· Diakses via QR Invoice</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1.5 no-print"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Cetak
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs no-print">
                <Link to="/"><Home className="h-3.5 w-3.5 mr-1" /> Beranda</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-3xl px-4 pt-6 space-y-5">

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && (
            <Card className="border-none shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Memuat data transaksi…</p>
              </CardContent>
            </Card>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {!loading && error && (
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-red-50 dark:bg-red-950/20 px-6 py-5 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold">
                  <AlertTriangle className="h-5 w-5" /> Transaksi Tidak Ditemukan
                </div>
              </div>
              <CardContent className="py-10 text-center space-y-4">
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">{error}</p>
                <Button asChild variant="outline">
                  <Link to="/"><Home className="h-4 w-4 mr-2" /> Kembali ke Beranda</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Main Content ─────────────────────────────────────────────── */}
          {!loading && booking && (
            <>
              {/* ── Company Header ─────────────────────────────────────── */}
              {company && (
                <div className="flex items-center gap-4 bg-white dark:bg-slate-950 rounded-2xl border shadow-sm px-5 py-4">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="h-12 w-12 object-contain rounded-xl border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Navigation2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate">{company.company_name}</p>
                    {company.tagline && (
                      <p className="text-xs text-muted-foreground truncate">{company.tagline}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-full shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" /> Terverifikasi
                  </div>
                </div>
              )}

              {/* ── Booking Code + Status ─────────────────────────────── */}
              <Card className="border-none shadow-md overflow-hidden">
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Kode Booking</p>
                  <p className="text-3xl font-black font-mono tracking-wider">{booking.booking_code}</p>
                  <p className="text-xs opacity-70 mt-1">
                    Dibuat {format(new Date(booking.created_at), "dd MMMM yyyy HH:mm", { locale: localeId })} WIB
                  </p>
                </div>
                <CardContent className="p-5 grid grid-cols-2 gap-3">
                  {/* Booking status */}
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm",
                    bStatus.color
                  )}>
                    <StatusIcon className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Status Booking</p>
                      <p className="font-bold text-sm leading-tight">{bStatus.label}</p>
                    </div>
                  </div>
                  {/* Payment status */}
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm",
                    pStatus.color
                  )}>
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Status Bayar</p>
                      <p className="font-bold text-sm leading-tight">{pStatus.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Package & Travel Info ────────────────────────────── */}
              {booking.departure && (
                <Card className="border-none shadow-md overflow-hidden">
                  <div className="bg-amber-500/8 dark:bg-amber-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <h2 className="font-black text-sm uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Paket Perjalanan
                    </h2>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <p className="text-xl font-black leading-snug">
                        {booking.departure.package?.name || "—"}
                      </p>
                      {booking.departure.package?.code && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {booking.departure.package.code}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Plane className="h-3 w-3" /> Berangkat
                        </p>
                        <p className="font-bold text-sm mt-1">
                          {format(new Date(booking.departure.departure_date), "dd MMM yyyy", { locale: localeId })}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Kembali
                        </p>
                        <p className="font-bold text-sm mt-1">
                          {format(new Date(booking.departure.return_date), "dd MMM yyyy", { locale: localeId })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      {duration && (
                        <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Durasi</p>
                          <p className="font-black text-sm text-primary mt-0.5">{duration}</p>
                        </div>
                      )}
                      <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Jamaah</p>
                        <p className="font-black text-sm text-primary mt-0.5">{booking.total_pax} Pax</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Kamar</p>
                        <p className="font-black text-sm text-primary mt-0.5 capitalize">{booking.room_type}</p>
                      </div>
                    </div>

                    {/* Hotel + Airline */}
                    <div className="space-y-2">
                      {hotel && (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-muted/30">
                          <Hotel className="h-4 w-4 text-amber-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Hotel Makkah</p>
                            <p className="font-bold text-sm truncate">{hotel.name}</p>
                          </div>
                          {hotel.star_rating && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: hotel.star_rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {airline && (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-muted/30">
                          <Plane className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Maskapai</p>
                            <p className="font-bold text-sm">{airline}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Pemesan & Jamaah ──────────────────────────────────── */}
              <Card className="border-none shadow-md overflow-hidden">
                <div className="bg-blue-500/8 dark:bg-blue-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h2 className="font-black text-sm uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Data Jamaah
                  </h2>
                </div>
                <CardContent className="p-5 space-y-4">
                  {/* Customer */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Pemesan (PIC)</p>
                      <p className="font-bold">{booking.customer?.full_name || "—"}</p>
                      {booking.customer?.phone_masked && (
                        <p className="text-xs text-muted-foreground font-mono">{booking.customer.phone_masked}</p>
                      )}
                    </div>
                  </div>

                  {/* Passenger list */}
                  {passengers.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Daftar Jamaah ({passengers.length} orang)
                      </p>
                      <div className="space-y-1.5">
                        {passengers.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-background"
                          >
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                              p.passenger_type === "child"  ? "bg-amber-100 text-amber-700" :
                              p.passenger_type === "infant" ? "bg-pink-100 text-pink-700" :
                              "bg-primary/10 text-primary"
                            )}>
                              {p.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium flex-1 truncate">{p.full_name}</span>
                            <Badge variant="outline" className="text-[10px] h-5 font-bold shrink-0">
                              {PAX_TYPE_LABEL[p.passenger_type] || p.passenger_type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground shrink-0 capitalize">
                              {p.room_preference || booking.room_type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Detail nama jamaah tersedia di portal jamaah setelah login.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Payment Progress & History ────────────────────────── */}
              <Card className="border-none shadow-md overflow-hidden">
                <div className="bg-emerald-500/8 dark:bg-emerald-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <h2 className="font-black text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Rincian Pembayaran
                  </h2>
                </div>
                <CardContent className="p-5 space-y-4">
                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-muted/40 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Tagihan</p>
                      <p className="font-black text-sm mt-1">{formatCurrency(booking.total_price)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Sudah Dibayar</p>
                      <p className="font-black text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                        {formatCurrency(booking.paid_amount || 0)}
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-xl px-3 py-3 border",
                      (booking.remaining_amount || 0) > 0
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    )}>
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        (booking.remaining_amount || 0) > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>Sisa</p>
                      <p className={cn(
                        "font-black text-sm mt-1",
                        (booking.remaining_amount || 0) > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700"
                      )}>
                        {formatCurrency(booking.remaining_amount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Progress Pembayaran</span>
                      <span className={cn(
                        paymentPct >= 100 ? "text-emerald-600" :
                        paymentPct >= 50 ? "text-primary" : "text-amber-600"
                      )}>{paymentPct}% lunas</span>
                    </div>
                    <Progress value={paymentPct} className="h-3 rounded-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span className="text-amber-600">DP 30%</span>
                      <span className="text-primary">50%</span>
                      <span className="text-emerald-600">Lunas</span>
                    </div>
                  </div>

                  {/* Deadline */}
                  {deadline && booking.payment_status !== "paid" && (
                    <div className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm",
                      isDeadlinePast
                        ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
                        : daysUntilDeadline !== null && daysUntilDeadline <= 3
                        ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800"
                        : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800"
                    )}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide opacity-70">Jatuh Tempo</p>
                          <p className="font-bold">{format(deadline, "dd MMMM yyyy", { locale: localeId })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg leading-none">
                          {isDeadlinePast ? "LEWAT" : `${daysUntilDeadline}h`}
                        </p>
                        <p className="text-[10px] opacity-70">
                          {isDeadlinePast ? "Hubungi admin" : "lagi"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bank info */}
                  {company?.bank_name && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20">
                      <Building2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground mb-0.5">
                          Rekening Pembayaran
                        </p>
                        <p className="font-black">{company.bank_name}</p>
                        <p className="font-mono font-bold text-base">{company.bank_account}</p>
                        <p className="text-xs text-muted-foreground">a/n {company.bank_account_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Menunggu Verifikasi Banner */}
                  {pendingPayments.length > 0 && (
                    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
                      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-black text-sm text-amber-800 dark:text-amber-300">
                          Menunggu Verifikasi
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          {pendingPayments.length === 1
                            ? "Konfirmasi pembayaran Anda sudah diterima dan sedang diverifikasi oleh tim finance kami."
                            : `${pendingPayments.length} konfirmasi pembayaran sudah diterima dan sedang diverifikasi oleh tim finance kami.`}
                          {" "}Mohon tunggu, proses biasanya selesai dalam 1×24 jam kerja.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment history */}
                  {payments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Riwayat Setoran ({payments.length} transaksi)
                      </p>
                      <div className="space-y-1.5">
                        {payments.map((pmt, idx) => {
                          const isPending = pmt.status === "pending";
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm",
                                isPending
                                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                  : "bg-background border"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isPending ? (
                                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                                <div>
                                  <p className="font-bold">
                                    {format(new Date(pmt.created_at), "dd MMM yyyy", { locale: localeId })}
                                  </p>
                                  <p className="text-[10px] capitalize text-muted-foreground">
                                    {isPending
                                      ? "Menunggu Verifikasi"
                                      : (pmt.payment_method || "").replace(/_/g, " ")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "font-black",
                                  isPending
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-700 dark:text-emerald-400"
                                )}>
                                  {formatCurrency(pmt.amount)}
                                </span>
                                {isPending && (
                                  <p className="text-[10px] text-amber-500 font-bold">Pending</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Konfirmasi Pembayaran (Publik) ───────────────────── */}
              {booking.payment_status !== "paid" && booking.booking_status !== "cancelled" && (
                <Card className="border-none shadow-md overflow-hidden no-print">
                  <div className="bg-amber-500/8 dark:bg-amber-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                    <Upload className="h-4 w-4 text-amber-600" />
                    <h2 className="font-black text-sm uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Konfirmasi Pembayaran
                    </h2>
                  </div>
                  <CardContent className="p-5">
                    {!showPayForm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Sudah melakukan transfer? Konfirmasikan pembayaran Anda agar tim finance kami dapat
                          segera memverifikasi dan memperbarui status booking.
                        </p>
                        <Button
                          onClick={() => setShowPayForm(true)}
                          className="h-11 w-full font-bold text-sm rounded-xl gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Konfirmasi Pembayaran Transfer
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitPayment} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="pay-amount" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Jumlah yang Ditransfer <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="pay-amount"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Contoh: 5000000"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            required
                            className="h-11 rounded-xl"
                          />
                          {booking.remaining_amount > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Sisa tagihan: <span className="font-bold text-amber-600">{formatCurrency(booking.remaining_amount)}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pay-method" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Metode Pembayaran <span className="text-red-500">*</span>
                          </Label>
                          <Select value={payMethod} onValueChange={setPayMethod}>
                            <SelectTrigger id="pay-method" className="h-11 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                              <SelectItem value="cash">Tunai</SelectItem>
                              <SelectItem value="qris">QRIS</SelectItem>
                              <SelectItem value="other">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pay-bank" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nama Bank / Nama Pengirim
                          </Label>
                          <Input
                            id="pay-bank"
                            type="text"
                            placeholder="Contoh: BCA – Budi Santoso"
                            value={payBankName}
                            onChange={(e) => setPayBankName(e.target.value)}
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pay-notes" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nomor Referensi / Catatan
                          </Label>
                          <Textarea
                            id="pay-notes"
                            placeholder="No. referensi transfer, tanggal, atau catatan lain"
                            value={payNotes}
                            onChange={(e) => setPayNotes(e.target.value)}
                            className="rounded-xl resize-none"
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPayForm(false)}
                            disabled={isSubmittingPay}
                            className="flex-1 h-11 rounded-xl"
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmittingPay}
                            className="flex-1 h-11 font-bold rounded-xl gap-2"
                          >
                            {isSubmittingPay
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim…</>
                              : <><Send className="h-4 w-4" /> Kirim Konfirmasi</>}
                          </Button>
                        </div>

                        <p className="text-[10px] text-center text-muted-foreground">
                          Tim finance kami akan menerima notifikasi dan memverifikasi dalam waktu dekat.
                        </p>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── Form Transaksi / Dokumen ──────────────────────────── */}
              <Card className="border-none shadow-md overflow-hidden">
                <div className="bg-violet-500/8 dark:bg-violet-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <h2 className="font-black text-sm uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    Dokumen Transaksi
                  </h2>
                </div>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Download invoice resmi atau cetak halaman ini sebagai bukti transaksi.
                    Dokumen ini menggunakan kode QR yang dapat diverifikasi secara online.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleDownloadInvoice}
                      disabled={downloading}
                      className="h-11 font-bold text-sm rounded-xl gap-2"
                    >
                      {downloading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                      Invoice PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 font-bold text-sm rounded-xl gap-2 no-print"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Cetak Halaman
                    </Button>
                  </div>

                  {/* Inline transaction summary for print */}
                  <div className="mt-2 border-2 border-dashed rounded-xl p-4 space-y-3 text-sm bg-muted/20">
                    <div className="flex items-center gap-2 font-black text-muted-foreground text-[10px] uppercase tracking-widest">
                      <FileText className="h-3.5 w-3.5" /> Ringkasan Transaksi
                    </div>
                    {[
                      ["No. Booking",      booking.booking_code],
                      ["Paket",            booking.departure?.package?.name || "-"],
                      ["Tgl Keberangkatan",booking.departure?.departure_date ? formatDate(booking.departure.departure_date) : "-"],
                      ["Tgl Kembali",      booking.departure?.return_date ? formatDate(booking.departure.return_date) : "-"],
                      ["Nama Pemesan",     booking.customer?.full_name || "-"],
                      ["Jumlah Pax",       `${booking.total_pax} orang`],
                      ["Tipe Kamar",       ROOM_LABEL[booking.room_type] || booking.room_type],
                      ["Total Tagihan",    formatCurrency(booking.total_price)],
                      ["Sudah Dibayar",    formatCurrency(booking.paid_amount || 0)],
                      ["Sisa Pembayaran",  formatCurrency(booking.remaining_amount || 0)],
                      ["Status Booking",   bStatus.label],
                      ["Status Pembayaran",pStatus.label],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3 text-xs border-b pb-1.5 last:border-0">
                        <span className="text-muted-foreground font-medium shrink-0">{label}</span>
                        <span className="font-bold text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── Contact Agency ───────────────────────────────────── */}
              {company && (company.phone || company.email || company.whatsapp) && (
                <Card className="border-none shadow-md overflow-hidden no-print">
                  <div className="bg-emerald-500/8 dark:bg-emerald-500/10 px-5 py-3.5 border-b flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <h2 className="font-black text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Hubungi Kami
                    </h2>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Ada pertanyaan mengenai perjalanan Anda? Tim kami siap membantu.
                    </p>
                    <div className="grid gap-2">
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalamu'alaikum, saya ingin bertanya mengenai booking ${booking.booking_code}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <MessageCircle className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="font-black">Chat WhatsApp</p>
                            <p className="text-xs opacity-70">{company.whatsapp || company.phone}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto shrink-0 opacity-50" />
                        </a>
                      )}
                      {company.phone && (
                        <a
                          href={`tel:${company.phone}`}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors"
                        >
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{company.phone}</span>
                        </a>
                      )}
                      {company.email && (
                        <a
                          href={`mailto:${company.email}?subject=Booking ${booking.booking_code}`}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors"
                        >
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{company.email}</span>
                        </a>
                      )}
                      {company.address && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{company.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Trust Footer ─────────────────────────────────────── */}
              <div className="flex flex-col items-center gap-2 py-4 text-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Data Terverifikasi Sistem</span>
                </div>
                <p>
                  Halaman ini bersifat publik untuk transparansi transaksi.
                  Data diambil langsung dari sistem internal kami.
                </p>
                <p className="text-[10px]">
                  Diakses pada {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })} WIB ·{" "}
                  <span className="font-mono">{token?.slice(0, 8)}…</span>
                </p>
                <Separator className="my-2 w-24" />
                <Link to="/" className="flex items-center gap-1.5 text-primary hover:underline font-semibold">
                  <Home className="h-3.5 w-3.5" /> Kunjungi Website Kami
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
