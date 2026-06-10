import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  AlertTriangle, TrendingUp, TrendingDown, Wallet,
  CalendarClock, DollarSign, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { format, addWeeks, startOfWeek, parseISO, isAfter, isBefore, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

interface Props {
  departureId: string;
  departureDate?: string;
}

function fmt(n: number) {
  return formatCurrency(Math.round(n));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-muted/60 rounded-lg shadow-md p-3 text-sm min-w-[220px]">
      <p className="font-semibold mb-2 text-xs">{label}</p>
      {payload.map((p: any) =>
        p.value !== null && p.value !== undefined ? (
          <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4 text-xs">
            <span>{p.name}</span>
            <span className="font-semibold">{fmt(p.value)}</span>
          </p>
        ) : null
      )}
    </div>
  );
};

export function DepartureCashTimingTab({ departureId, departureDate }: Props) {
  const db = supabase as any;

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["cash-timing-bookings", departureId],
    queryFn: async () => {
      const { data } = await db
        .from("bookings")
        .select("id, total_price, remaining_amount, payment_deadline, booking_status, customer_id")
        .eq("departure_id", departureId)
        .not("booking_status", "in", '("cancelled","refunded")');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const bookingIds = bookings.map((b: any) => b.id);

  const { data: installments = [], isLoading: loadingInstallments } = useQuery({
    queryKey: ["cash-timing-installments", departureId],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      if (!bookingIds.length) return [];
      const { data } = await db
        .from("booking_installment_schedules")
        .select("booking_id, due_date, amount, status, paid_at")
        .in("booking_id", bookingIds)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendorCosts = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["cash-timing-vendors", departureId],
    queryFn: async () => {
      const { data } = await db
        .from("vendor_costs")
        .select("id, cost_type, amount, paid_amount, status, due_date, description")
        .eq("departure_id", departureId)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingBookings || loadingInstallments || loadingVendors;

  const computed = useMemo(() => {
    const now = new Date();
    const depDate = departureDate ? parseISO(departureDate) : addWeeks(now, 8);

    const totalRevenuePlan = bookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const totalPaid        = bookings.reduce((s: number, b: any) => s + ((b.total_price || 0) - (b.remaining_amount || 0)), 0);
    const totalOutstanding = bookings.reduce((s: number, b: any) => s + (b.remaining_amount || 0), 0);

    const totalVendorObligations = vendorCosts.reduce((s: number, v: any) => s + (v.amount || 0), 0);
    const totalVendorPaid        = vendorCosts.reduce((s: number, v: any) => s + (v.paid_amount || 0), 0);
    const totalVendorUnpaid      = totalVendorObligations - totalVendorPaid;

    const netPosition = totalPaid - totalVendorPaid;

    const installmentsPaid    = installments.filter((i: any) => i.status === "paid");
    const installmentsPending = installments.filter((i: any) => i.status !== "paid");
    const cashInFromInstall   = installmentsPaid.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const cashInPendingInstall = installmentsPending.reduce((s: number, i: any) => s + (i.amount || 0), 0);

    const vendorUnpaid = vendorCosts.filter((v: any) => v.status !== "paid");
    const vendorPaid   = vendorCosts.filter((v: any) => v.status === "paid");

    const startDate = addWeeks(now, -4);
    const endDate   = addWeeks(depDate, 2);
    const totalWeeks = Math.max(1, Math.ceil(differenceInDays(endDate, startDate) / 7) + 1);

    const weeks: { label: string; weekStart: Date; cashIn: number; cashOut: number }[] = [];
    for (let i = 0; i < Math.min(totalWeeks, 20); i++) {
      const weekStart = startOfWeek(addWeeks(startDate, i), { weekStartsOn: 1 });
      const weekEnd   = addWeeks(weekStart, 1);

      const cashIn = installments
        .filter((inst: any) => {
          if (inst.status === "paid") {
            const d = inst.paid_at ? parseISO(inst.paid_at) : (inst.due_date ? parseISO(inst.due_date) : null);
            return d && !isBefore(d, weekStart) && isBefore(d, weekEnd);
          } else {
            const d = inst.due_date ? parseISO(inst.due_date) : null;
            return d && !isBefore(d, weekStart) && isBefore(d, weekEnd) && isAfter(d, now);
          }
        })
        .reduce((s: number, i: any) => s + (i.amount || 0), 0);

      const cashOut = vendorCosts
        .filter((v: any) => {
          const d = v.due_date ? parseISO(v.due_date) : null;
          return d && !isBefore(d, weekStart) && isBefore(d, weekEnd);
        })
        .reduce((s: number, v: any) => s + ((v.amount || 0) - (v.paid_amount || 0)), 0);

      weeks.push({
        label: format(weekStart, "dd MMM", { locale: localeId }),
        weekStart,
        cashIn,
        cashOut,
      });
    }

    let runningBalance = netPosition;
    const chartData = weeks.map((w) => {
      runningBalance += w.cashIn - w.cashOut;
      const isDepWeek = departureDate && !isBefore(w.weekStart, parseISO(departureDate)) && isBefore(w.weekStart, addWeeks(parseISO(departureDate), 1));
      return {
        week: w.label,
        cash_in:   w.cashIn   > 0 ? w.cashIn   : null,
        cash_out:  w.cashOut  > 0 ? w.cashOut  : null,
        saldo:     runningBalance,
        isDepWeek: !!isDepWeek,
      };
    });

    const minSaldo = Math.min(...chartData.map(d => d.saldo), 0);
    const negativeBefore = chartData.some(d => d.saldo < 0 && isBefore(d.isDepWeek ? depDate : now, depDate));

    const overdueVendors = vendorUnpaid.filter((v: any) => v.due_date && isBefore(parseISO(v.due_date), now));
    const upcomingVendors = vendorUnpaid.filter((v: any) => {
      if (!v.due_date) return false;
      const d = parseISO(v.due_date);
      return !isBefore(d, now) && differenceInDays(d, now) <= 30;
    });

    return {
      totalRevenuePlan, totalPaid, totalOutstanding,
      totalVendorObligations, totalVendorPaid, totalVendorUnpaid,
      netPosition,
      installmentsPaid, installmentsPending,
      cashInFromInstall, cashInPendingInstall,
      vendorPaid, vendorUnpaid,
      chartData, minSaldo, negativeBefore,
      overdueVendors, upcomingVendors,
    };
  }, [bookings, installments, vendorCosts, departureDate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const depLabel = departureDate ? format(parseISO(departureDate), "dd MMMM yyyy", { locale: localeId }) : "—";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" /> Working Capital — Cash Timing
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Proyeksi aliran kas masuk (cicilan jamaah) vs kas keluar (kewajiban vendor) per keberangkatan {depLabel}
        </p>
      </div>

      {computed.negativeBefore && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risiko Kas Negatif</AlertTitle>
          <AlertDescription>
            Proyeksi menunjukkan saldo kas negatif sebelum keberangkatan. Percepat pelunasan jamaah atau tunda pembayaran vendor.
          </AlertDescription>
        </Alert>
      )}

      {computed.overdueVendors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700">Vendor Jatuh Tempo Terlewat</AlertTitle>
          <AlertDescription className="text-amber-600">
            {computed.overdueVendors.length} kewajiban vendor sudah jatuh tempo, total {fmt(computed.overdueVendors.reduce((s: number, v: any) => s + ((v.amount || 0) - (v.paid_amount || 0)), 0))}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Kas Masuk (Sudah Bayar)", value: computed.totalPaid, icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Piutang Tersisa", value: computed.totalOutstanding, icon: ArrowUpRight, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "Kewajiban Vendor", value: computed.totalVendorUnpaid, icon: TrendingDown, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
          { label: "Posisi Kas Bersih", value: computed.netPosition, icon: computed.netPosition >= 0 ? Wallet : AlertTriangle, color: computed.netPosition >= 0 ? "text-primary" : "text-red-600", bg: computed.netPosition >= 0 ? "bg-primary/5 border-primary/20" : "bg-red-50 border-red-200" },
        ].map(s => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className={`font-bold text-base ${s.color}`}>{fmt(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {computed.chartData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Proyeksi Saldo Kas per Minggu</CardTitle>
            <CardDescription className="text-xs">
              Garis biru = saldo berjalan | Bar hijau = kas masuk cicilan | Bar merah = kewajiban vendor
              {departureDate && ` | Garis putus-putus = tanggal keberangkatan`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={computed.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} />
                {computed.minSaldo < 0 && (
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Bahaya", fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
                )}
                {departureDate && (
                  <ReferenceLine
                    x={format(parseISO(departureDate), "dd MMM", { locale: localeId })}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    label={{ value: "Berangkat", fontSize: 9, fill: "#6366f1" }}
                  />
                )}
                <Area
                  type="monotone" dataKey="saldo"
                  name="Saldo Kas" stroke="#3b82f6"
                  fill="url(#saldoGrad)" strokeWidth={2} connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Piutang Jamaah
            </CardTitle>
            <CardDescription className="text-xs">
              {bookings.length} booking — {fmt(computed.totalPaid)} lunas, {fmt(computed.totalOutstanding)} tersisa
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Belum ada booking</p>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {bookings.map((b: any) => {
                  const paid = (b.total_price || 0) - (b.remaining_amount || 0);
                  const pct  = b.total_price > 0 ? (paid / b.total_price) * 100 : 0;
                  const overdue = b.payment_deadline && isBefore(parseISO(b.payment_deadline), new Date()) && b.remaining_amount > 0;
                  return (
                    <div key={b.id} className="px-3 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium truncate">{b.customer_id?.slice(0, 8) ?? "—"}</span>
                          {overdue && <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">Overdue</Badge>}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-emerald-700">{fmt(paid)}</p>
                        {b.remaining_amount > 0 && <p className="text-[10px] text-muted-foreground">sisa {fmt(b.remaining_amount)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-rose-600" /> Kewajiban Vendor
            </CardTitle>
            <CardDescription className="text-xs">
              Total {fmt(computed.totalVendorObligations)} — {fmt(computed.totalVendorPaid)} dibayar, {fmt(computed.totalVendorUnpaid)} belum
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {vendorCosts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Belum ada kewajiban vendor</p>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {(vendorCosts as any[]).map((v: any) => {
                  const unpaid = (v.amount || 0) - (v.paid_amount || 0);
                  const overdue = v.due_date && isBefore(parseISO(v.due_date), new Date()) && unpaid > 0;
                  const daysLeft = v.due_date ? differenceInDays(parseISO(v.due_date), new Date()) : null;
                  return (
                    <div key={v.id} className="px-3 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{v.description || v.cost_type}</span>
                          {overdue
                            ? <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">Overdue</Badge>
                            : daysLeft !== null && daysLeft <= 7
                              ? <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">H-{daysLeft}</Badge>
                              : null
                          }
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {v.due_date ? format(parseISO(v.due_date), "dd MMM yyyy") : "Tanpa jatuh tempo"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {unpaid > 0
                          ? <p className="text-xs font-semibold text-rose-700">{fmt(unpaid)}</p>
                          : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Lunas</Badge>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {computed.upcomingVendors.length > 0 && (
        <Card className="shadow-sm border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Vendor Jatuh Tempo 30 Hari ke Depan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {computed.upcomingVendors.map((v: any) => {
                const unpaid = (v.amount || 0) - (v.paid_amount || 0);
                const daysLeft = v.due_date ? differenceInDays(parseISO(v.due_date), new Date()) : null;
                return (
                  <div key={v.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{v.description || v.cost_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Jatuh tempo: {v.due_date ? format(parseISO(v.due_date), "dd MMM yyyy") : "—"}
                        {daysLeft !== null ? ` (${daysLeft} hari lagi)` : ""}
                      </p>
                    </div>
                    <p className="font-bold text-rose-700 text-sm">{fmt(unpaid)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
