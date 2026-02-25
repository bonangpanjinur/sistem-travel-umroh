import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function JamaahPaymentHistory() {
  const { user } = useAuth();

  // Fetch customer
  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all bookings for customer
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["jamaah-bookings", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          total_price,
          paid_amount,
          remaining_amount,
          created_at,
          departure:departures(
            package:packages(name)
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  // Fetch all payments for customer
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["jamaah-payments", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          booking:bookings(
            booking_code,
            departure:departures(
              package:packages(name)
            )
          )
        `)
        .eq("booking_id", 
          (bookings?.map(b => b.id) || [])[0] || ''
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id && !!bookings,
  });

  const PAYMENT_STATUS_CONFIG = {
    pending: { label: "Menunggu Verifikasi", color: "bg-yellow-100 text-yellow-800" },
    paid: { label: "Terverifikasi", color: "bg-green-100 text-green-800" },
    partial: { label: "Sebagian", color: "bg-blue-100 text-blue-800" },
    refunded: { label: "Refund", color: "bg-gray-100 text-gray-800" },
    failed: { label: "Gagal", color: "bg-red-100 text-red-800" },
  };

  const isLoading = bookingsLoading || paymentsLoading;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/jamaah">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Portal Jamaah
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Riwayat Pembayaran</h1>
          <p className="text-muted-foreground">
            Lihat detail semua transaksi pembayaran Anda
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Total Pembayaran</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(
                    payments?.reduce((sum, p) => sum + (p.status === "paid" ? p.amount : 0), 0) || 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    payments?.reduce((sum, p) => sum + (p.status === "pending" ? p.amount : 0), 0) || 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Total Transaksi</p>
                <p className="text-2xl font-bold">{payments?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Detail Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!payments || payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Belum ada riwayat pembayaran</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const statusConfig =
                    PAYMENT_STATUS_CONFIG[
                      payment.status as keyof typeof PAYMENT_STATUS_CONFIG
                    ];
                  const booking = payment.booking as any;
                  const packageName = booking?.departure?.package?.name || "Paket Umroh";

                  return (
                    <div
                      key={payment.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono text-sm font-semibold">
                              {payment.payment_code}
                            </p>
                            <Badge className={statusConfig?.color}>
                              {statusConfig?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Booking: <span className="font-medium">{booking?.booking_code}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">{packageName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "d MMMM yyyy, HH:mm", {
                              locale: id,
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(payment.amount)}
                          </p>
                          {payment.payment_method && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {payment.payment_method}
                            </p>
                          )}
                          {payment.bank_name && (
                            <p className="text-xs text-muted-foreground">
                              {payment.bank_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
