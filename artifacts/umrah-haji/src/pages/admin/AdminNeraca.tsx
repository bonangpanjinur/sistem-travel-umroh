import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { LayoutList, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const Row = ({ label, value, indent = false, bold = false, isTotal = false }: any) => (
  <div className={`flex justify-between py-1.5 ${indent ? "pl-6 text-sm" : "text-sm"} ${bold ? "font-semibold" : ""} ${isTotal ? "border-t font-bold" : ""}`}>
    <span>{label}</span>
    <span className="tabular-nums">{fmt(value)}</span>
  </div>
);

export default function AdminNeraca() {
  const queryClient = useQueryClient();
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Cash balance (aset lancar — kas)
  const { data: cashData, isLoading: lCash } = useQuery({
    queryKey: ["neraca-cash", asOfDate],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cash_transactions")
        .select("amount, type")
        .lte("transaction_date", asOfDate);
      const cashIn = (data || []).filter((r: any) => r.type === "in").reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const cashOut = (data || []).filter((r: any) => r.type === "out").reduce((s: number, r: any) => s + (r.amount || 0), 0);
      return cashIn - cashOut;
    },
  });

  // Piutang (AR) — booking outstanding
  const { data: arData, isLoading: lAR } = useQuery({
    queryKey: ["neraca-ar", asOfDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("total_price, paid_amount")
        .lte("created_at", asOfDate)
        .neq("payment_status", "cancelled");
      return (data || []).reduce((s: number, b: any) => s + Math.max((b.total_price || 0) - (b.paid_amount || 0), 0), 0);
    },
  });

  // Hutang vendor (AP)
  const { data: apData, isLoading: lAP } = useQuery({
    queryKey: ["neraca-ap", asOfDate],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_costs")
        .select("amount, paid_amount, status")
        .lte("created_at", asOfDate)
        .neq("status", "cancelled");
      return (data || []).reduce((s: number, v: any) => s + Math.max((v.amount || 0) - (v.paid_amount || 0), 0), 0);
    },
  });

  // Total pendapatan (revenue dari payments) → modal kerja
  const { data: totalRevenue = 0, isLoading: lRev } = useQuery({
    queryKey: ["neraca-revenue", asOfDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "verified")
        .lte("payment_date", asOfDate);
      return (data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    },
  });

  // Total HPP + opex
  const { data: totalCosts = 0, isLoading: lCosts } = useQuery({
    queryKey: ["neraca-costs", asOfDate],
    queryFn: async () => {
      const [vc, co] = await Promise.all([
        (supabase as any).from("vendor_costs").select("amount").lte("created_at", asOfDate),
        (supabase as any).from("cash_transactions").select("amount").eq("type", "out").lte("transaction_date", asOfDate),
      ]);
      const vcTotal = ((vc.data || []) as any[]).reduce((s, r) => s + (r.amount || 0), 0);
      const coTotal = ((co.data || []) as any[]).reduce((s, r) => s + (r.amount || 0), 0);
      return vcTotal + coTotal;
    },
  });

  const isLoading = lCash || lAR || lAP || lRev || lCosts;

  const kas = cashData || 0;
  const piutang = arData || 0;
  const totalAsetLancar = kas + piutang;
  const totalAset = totalAsetLancar; // simplified — no fixed assets

  const hutangVendor = apData || 0;
  const totalKewajiban = hutangVendor;

  const retainedEarnings = totalRevenue - totalCosts;
  const modal = 0; // modal setoran — bisa ditambahkan manual
  const totalEkuitas = modal + retainedEarnings;

  const totalKewajibandanEkuitas = totalKewajiban + totalEkuitas;
  const isBalanced = Math.abs(totalAset - totalKewajibandanEkuitas) < 1000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutList className="h-6 w-6" /> Neraca (Balance Sheet)</h1>
          <p className="text-muted-foreground">Posisi keuangan: aset, kewajiban, dan ekuitas</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-xs">Per Tanggal</Label>
            <Input type="date" className="w-36" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Balance indicator */}
      {!isLoading && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isBalanced ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          {isBalanced
            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
            : <AlertCircle className="h-5 w-5 text-yellow-600" />}
          <p className={`text-sm font-semibold ${isBalanced ? "text-green-700" : "text-yellow-700"}`}>
            {isBalanced
              ? `Neraca Balance: Aset = Kewajiban + Ekuitas = ${fmt(totalAset)}`
              : `Selisih: ${fmt(Math.abs(totalAset - totalKewajibandanEkuitas))} (estimasi — data laba ditahan perlu jurnal penyesuaian)`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASET */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700">ASET</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Aset Lancar</p>
                <Row label="Kas & Bank" value={kas} indent />
                <Row label="Piutang Jamaah (AR)" value={piutang} indent />
                <Row label="Total Aset Lancar" value={totalAsetLancar} bold isTotal />
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Aset Tidak Lancar</p>
                  <Row label="Aset Tetap (bersih)" value={0} indent />
                  <Row label="Total Aset Tidak Lancar" value={0} bold isTotal />
                </div>
                <Separator className="my-2" />
                <Row label="TOTAL ASET" value={totalAset} bold isTotal />
              </>
            )}
          </CardContent>
        </Card>

        {/* KEWAJIBAN + EKUITAS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-700">KEWAJIBAN & EKUITAS</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Kewajiban Lancar</p>
                <Row label="Hutang Vendor (AP)" value={hutangVendor} indent />
                <Row label="Total Kewajiban Lancar" value={hutangVendor} bold isTotal />
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Kewajiban Jangka Panjang</p>
                  <Row label="Hutang Jangka Panjang" value={0} indent />
                </div>
                <Row label="Total Kewajiban" value={totalKewajiban} bold isTotal />
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Ekuitas</p>
                  <Row label="Modal Disetor" value={modal} indent />
                  <Row label="Laba Ditahan (estimasi)" value={retainedEarnings} indent />
                  <Row label="Total Ekuitas" value={totalEkuitas} bold isTotal />
                </div>
                <Separator className="my-2" />
                <Row label="TOTAL KEWAJIBAN + EKUITAS" value={totalKewajibandanEkuitas} bold isTotal />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        * Neraca ini adalah estimasi berdasarkan data transaksi. Untuk akurasi penuh, gunakan jurnal umum dengan double-entry lengkap.
      </p>
    </div>
  );
}
