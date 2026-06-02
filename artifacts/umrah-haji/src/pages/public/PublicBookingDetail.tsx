import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Plane, Calendar, Package, User, CreditCard, Home } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

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
  customer: { full_name: string; phone_masked: string | null } | null;
  departure: {
    departure_date: string;
    return_date: string;
    package: { name: string; code: string } | null;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Terkonfirmasi",
  processing: "Dalam Proses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
};

const PAY_LABEL: Record<string, string> = {
  pending: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
  refunded: "Refund",
};

export default function PublicBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: res, error: err } = await (supabase as any).rpc(
        "get_public_booking_details",
        { p_booking_id: bookingId }
      );
      if (cancelled) return;
      if (err) {
        const is404 = err.code === "PGRST202" || err.message?.includes("404") ||
          err.message?.includes("not found") || err.details?.includes("not found");
        setError(
          is404
            ? "Layanan verifikasi sedang dalam proses aktivasi. Silakan hubungi admin untuk informasi booking Anda."
            : "Gagal memuat data transaksi. Coba lagi beberapa saat."
        );
      } else if (!res) {
        setError("Transaksi tidak ditemukan. Pastikan QR Code yang Anda scan benar.");
      } else {
        setData(res as PublicBooking);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const paymentPct =
    data && data.total_price > 0
      ? Math.min(100, Math.round(((data.paid_amount || 0) / data.total_price) * 100))
      : 0;

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Halaman Transparansi Transaksi — diakses melalui QR Invoice</span>
        </div>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" /> Kembali ke Beranda
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && data && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Kode Booking
                  </p>
                  <CardTitle className="text-2xl font-mono">{data.booking_code}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {STATUS_LABEL[data.booking_status] || data.booking_status}
                  </Badge>
                  <Badge>{PAY_LABEL[data.payment_status] || data.payment_status}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Paket & Keberangkatan */}
              {data.departure && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Package className="h-4 w-4 text-primary" /> Paket
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="font-semibold">
                      {data.departure.package?.name || "—"}
                    </div>
                    {data.departure.package?.code && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {data.departure.package.code}
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Plane className="h-3 w-3" /> Berangkat
                        </div>
                        <div className="font-medium">
                          {formatDate(data.departure.departure_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Pulang
                        </div>
                        <div className="font-medium">
                          {formatDate(data.departure.return_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Pemesan */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" /> Pemesan
                </div>
                <div className="rounded-lg border p-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Nama</div>
                    <div className="font-medium">{data.customer?.full_name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">No. HP</div>
                    <div className="font-medium font-mono">
                      {data.customer?.phone_masked || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Jumlah Jamaah</div>
                    <div className="font-medium">{data.total_pax} pax</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tipe Kamar</div>
                    <div className="font-medium capitalize">{data.room_type}</div>
                  </div>
                </div>
              </section>

              {/* Pembayaran */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" /> Pembayaran
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tagihan</span>
                    <span className="font-semibold">
                      {formatCurrency(data.total_price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sudah Dibayar</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(data.paid_amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa</span>
                    <span className="font-semibold text-amber-600">
                      {formatCurrency(data.remaining_amount)}
                    </span>
                  </div>
                  <Progress value={paymentPct} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {paymentPct}% lunas
                  </div>
                </div>
              </section>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Halaman ini bersifat publik untuk transparansi. Untuk perubahan data,
                hubungi admin atau login ke portal jamaah.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DynamicPublicLayout>
  );
}