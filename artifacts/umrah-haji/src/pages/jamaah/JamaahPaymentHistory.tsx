import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, CreditCard, Search, Filter, X } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Menunggu Verifikasi", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid: { label: "Terverifikasi", color: "bg-green-100 text-green-800 border-green-200" },
  partial: { label: "Sebagian", color: "bg-blue-100 text-blue-800 border-blue-200" },
  refunded: { label: "Refund", color: "bg-gray-100 text-gray-800 border-gray-200" },
  failed: { label: "Gagal", color: "bg-red-100 text-red-800 border-red-200" },
};

type PaymentStatus = keyof typeof PAYMENT_STATUS_CONFIG;

export default function JamaahPaymentHistory() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
          payment_status,
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

  const bookingIds = bookings?.map((b) => b.id) || [];

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["jamaah-payments-all", customer?.id, bookingIds.join(",")],
    queryFn: async () => {
      if (!customer?.id || bookingIds.length === 0) return [];
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
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id && bookingIds.length > 0,
  });

  // Q4: Filter & search logic
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const bookingCode = (p.booking as any)?.booking_code || "";
      const packageName = (p.booking as any)?.departure?.package?.name || "";
      const paymentCode = p.payment_code || "";
      const matchSearch =
        !searchQuery ||
        bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paymentCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  const totalVerified = payments?.reduce((sum, p) => sum + (p.status === "paid" ? p.amount : 0), 0) || 0;
  const totalPending = payments?.reduce((sum, p) => sum + (p.status === "pending" ? p.amount : 0), 0) || 0;
  const isLoading = bookingsLoading || paymentsLoading;

  const hasActiveFilter = statusFilter !== "all" || searchQuery.length > 0;

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary text-primary-foreground p-4">
          <Skeleton className="h-6 w-48 bg-primary-foreground/20" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">Riwayat Pembayaran</h1>
            <p className="text-xs opacity-80">
              {payments?.length || 0} transaksi
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Terverifikasi</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(totalVerified)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Menunggu</p>
              <p className="text-sm font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Total Trx</p>
              <p className="text-sm font-bold">{payments?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Q4: Filter & Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode booking atau paket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "pending", "paid", "refunded", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-muted-foreground/30 hover:border-primary/50"
                  }`}
                >
                  {s === "all" ? "Semua" : PAYMENT_STATUS_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
            {hasActiveFilter && (
              <button onClick={clearFilters} className="ml-auto text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Payment List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detail Transaksi
              {hasActiveFilter && (
                <Badge variant="secondary" className="text-xs">
                  {filteredPayments.length} hasil
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">
                  {hasActiveFilter ? "Tidak ada transaksi sesuai filter" : "Belum ada riwayat pembayaran"}
                </p>
                {hasActiveFilter && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Hapus Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((payment) => {
                  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status as PaymentStatus];
                  const booking = payment.booking as any;
                  const packageName = booking?.departure?.package?.name || "Paket Umroh";

                  return (
                    <div
                      key={payment.id}
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-mono text-sm font-semibold">{payment.payment_code}</p>
                            <Badge className={`${statusConfig?.color} border text-xs`}>
                              {statusConfig?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Booking: <span className="font-medium text-foreground">{booking?.booking_code}</span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{packageName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(payment.created_at!), "d MMMM yyyy, HH:mm", { locale: id })}
                          </p>
                          {payment.payment_method && (
                            <p className="text-xs text-muted-foreground">
                              via {payment.payment_method} {payment.bank_name ? `— ${payment.bank_name}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-primary">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
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

      <JamaahBottomNav />
    </div>
  );
}
