import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Calculator, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// PPh 23 rate untuk jasa perjalanan (4%)
const PPH23_RATE = 0.04;
// PPN rate (11%)
const PPN_RATE = 0.11;

type TaxEntry = {
  month: string;
  label: string;
  revenue: number;
  ppn_collected: number;
  vendor_costs: number;
  pph23: number;
  gross_profit: number;
};

export default function AdminLaporanPajak() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [activeTab, setActiveTab] = useState("rekapitulasi");

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const yearStart = startOfYear(new Date(Number(selectedYear), 0)).toISOString();
  const yearEnd = endOfYear(new Date(Number(selectedYear), 0)).toISOString();

  // Revenue from bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ["tax-bookings", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("total_amount, created_at, booking_status")
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .neq("booking_status", "cancelled");
      return data || [];
    },
  });

  // Payments received
  const { data: payments = [] } = useQuery({
    queryKey: ["tax-payments", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date, payment_status")
        .gte("payment_date", yearStart.slice(0, 10))
        .lte("payment_date", yearEnd.slice(0, 10))
        .eq("payment_status", "approved");
      return data || [];
    },
  });

  // Vendor costs (AP) - basis PPh 23
  const { data: vendorCosts = [] } = useQuery({
    queryKey: ["tax-vendor-costs", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_costs")
        .select("amount, paid_amount, cost_date, cost_type")
        .gte("cost_date", yearStart.slice(0, 10))
        .lte("cost_date", yearEnd.slice(0, 10));
      return data || [];
    },
  });

  // Salary costs (PPh 21) — dari cash_transactions.salary sebagai fallback
  const { data: salaryCosts = [] } = useQuery({
    queryKey: ["tax-salary", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_transactions")
        .select("amount, transaction_date, category")
        .gte("transaction_date", yearStart.slice(0, 10))
        .lte("transaction_date", yearEnd.slice(0, 10))
        .eq("type", "out")
        .eq("category", "salary");
      return data || [];
    },
  });

  // PPh 21 lebih akurat — dari payroll_records (penggajian terproses resmi)
  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["tax-payroll", selectedYear],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_records")
        .select("net_salary, gross_salary, pph21_amount, period_month, period_year, status")
        .eq("period_year", Number(selectedYear))
        .eq("status", "paid");
      return data || [];
    },
  });
  const hasPayrollData = (payrollRecords as any[]).length > 0;

  // Monthly breakdown
  const months = eachMonthOfInterval({
    start: new Date(Number(selectedYear), 0),
    end: new Date(Number(selectedYear), 11),
  });

  const monthlyData: TaxEntry[] = useMemo(() => {
    return months.map(month => {
      const mStart = format(startOfMonth(month), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(month), "yyyy-MM-dd");

      const monthPayments = payments.filter((p: any) => {
        const d = p.payment_date?.slice(0, 10) || "";
        return d >= mStart && d <= mEnd;
      });
      const revenue = monthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

      const monthVendor = vendorCosts.filter((v: any) => {
        const d = v.cost_date?.slice(0, 10) || "";
        return d >= mStart && d <= mEnd;
      });
      const vendorTotal = monthVendor.reduce((s: number, v: any) => s + Number(v.amount), 0);

      const ppn_collected = revenue * PPN_RATE;
      const pph23 = vendorTotal * PPH23_RATE;
      const gross_profit = revenue - vendorTotal;

      return {
        month: format(month, "yyyy-MM"),
        label: format(month, "MMMM yyyy", { locale: localeId }),
        revenue,
        ppn_collected,
        vendor_costs: vendorTotal,
        pph23,
        gross_profit,
      };
    });
  }, [months, payments, vendorCosts]);

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalPPN = monthlyData.reduce((s, m) => s + m.ppn_collected, 0);
  const totalPPH23 = monthlyData.reduce((s, m) => s + m.pph23, 0);
  const totalVendor = monthlyData.reduce((s, m) => s + m.vendor_costs, 0);
  const totalSalary = salaryCosts.reduce((s: number, r: any) => s + Number(r.amount), 0);

  // PPh 21 — lebih akurat jika ada payroll_records (langsung dari modul payroll)
  const PPH21_RATE = 0.05;
  // Jika payroll_records punya kolom pph21_amount, gunakan itu; fallback ke estimasi 5% × gross
  const payrollPPH21Direct = (payrollRecords as any[]).reduce((s: number, r: any) => s + (r.pph21_amount || 0), 0);
  const payrollGross = (payrollRecords as any[]).reduce((s: number, r: any) => s + (r.gross_salary || 0), 0);
  const payrollPPH21Estimated = payrollGross * PPH21_RATE;
  // Jika ada payroll data, prioritaskan
  const totalPPH21 = hasPayrollData
    ? (payrollPPH21Direct > 0 ? payrollPPH21Direct : payrollPPH21Estimated)
    : (totalSalary * PPH21_RATE);
  const totalTaxObligation = totalPPN + totalPPH23 + totalPPH21;

  const handleExportPDF = () => {
    const rows = monthlyData.map(m => ({
      "Bulan": m.label,
      "Pendapatan": formatCurrency(m.revenue),
      "PPN (11%)": formatCurrency(m.ppn_collected),
      "Biaya Vendor": formatCurrency(m.vendor_costs),
      "PPh 23 (4%)": formatCurrency(m.pph23),
      "Laba Kotor": formatCurrency(m.gross_profit),
    }));
    exportToPDF(rows, `Laporan Pajak ${selectedYear}`, `laporan-pajak-${selectedYear}`);
  };

  const handleExportExcel = () => {
    const rows = monthlyData.map(m => ({
      "Bulan": m.label,
      "Pendapatan (IDR)": m.revenue,
      "PPN 11% (IDR)": m.ppn_collected,
      "Biaya Vendor (IDR)": m.vendor_costs,
      "PPh 23 4% (IDR)": m.pph23,
      "Laba Kotor (IDR)": m.gross_profit,
    }));
    exportToExcel(rows, `Laporan Pajak ${selectedYear}`, `laporan-pajak-${selectedYear}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Pajak</h1>
          <p className="text-muted-foreground">Rekap PPN, PPh 21, PPh 23 per tahun — basis akrual</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Omzet {selectedYear}</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PPN Keluaran (11%)</p>
            <p className="text-xl font-bold text-purple-700">{formatCurrency(totalPPN)}</p>
            <p className="text-xs text-muted-foreground">Dari penjualan jasa</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PPh 23 (4% vendor)</p>
            <p className="text-xl font-bold text-orange-700">{formatCurrency(totalPPH23)}</p>
            <p className="text-xs text-muted-foreground">Dipotong dari vendor</p>
          </CardContent>
        </Card>
        <Card className={`${totalTaxObligation > 0 ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Kewajiban Pajak</p>
            <p className={`text-xl font-bold ${totalTaxObligation > 0 ? "text-red-700" : "text-green-700"}`}>
              {formatCurrency(totalTaxObligation)}
            </p>
            <p className="text-xs text-muted-foreground">PPN + PPh 23 + PPh 21</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rekapitulasi">Rekapitulasi Bulanan</TabsTrigger>
          <TabsTrigger value="ppn">PPN Keluaran</TabsTrigger>
          <TabsTrigger value="pph">PPh 21 & PPh 23</TabsTrigger>
        </TabsList>

        {/* Rekapitulasi */}
        <TabsContent value="rekapitulasi" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekapitulasi Pajak Bulanan — {selectedYear}</CardTitle>
              <CardDescription>Basis pembayaran diterima & biaya vendor dibayar</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">PPN (11%)</TableHead>
                    <TableHead className="text-right">Biaya Vendor</TableHead>
                    <TableHead className="text-right">PPh 23 (4%)</TableHead>
                    <TableHead className="text-right">Laba Kotor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map(m => (
                    <TableRow key={m.month} className={m.gross_profit < 0 ? "bg-red-50/30" : ""}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-right">{m.revenue > 0 ? formatCurrency(m.revenue) : "-"}</TableCell>
                      <TableCell className="text-right text-purple-600">{m.ppn_collected > 0 ? formatCurrency(m.ppn_collected) : "-"}</TableCell>
                      <TableCell className="text-right">{m.vendor_costs > 0 ? formatCurrency(m.vendor_costs) : "-"}</TableCell>
                      <TableCell className="text-right text-orange-600">{m.pph23 > 0 ? formatCurrency(m.pph23) : "-"}</TableCell>
                      <TableCell className={`text-right font-medium ${m.gross_profit < 0 ? "text-red-600" : "text-green-600"}`}>
                        {m.revenue > 0 || m.vendor_costs > 0 ? formatCurrency(m.gross_profit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold border-t-2">
                    <TableCell>Total {selectedYear}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                    <TableCell className="text-right text-purple-700">{formatCurrency(totalPPN)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalVendor)}</TableCell>
                    <TableCell className="text-right text-orange-700">{formatCurrency(totalPPH23)}</TableCell>
                    <TableCell className={`text-right ${(totalRevenue - totalVendor) < 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatCurrency(totalRevenue - totalVendor)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PPN */}
        <TabsContent value="ppn" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PPN Keluaran — {selectedYear}</CardTitle>
              <CardDescription>
                PPN 11% dari pendapatan jasa perjalanan umroh & haji. Wajib dilaporkan dalam SPT Masa PPN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-1">Catatan Penting</p>
                <p className="text-xs text-blue-700">
                  Jasa penyelenggaraan ibadah haji/umrah yang termasuk dalam kategori jasa keagamaan
                  dapat dibebaskan dari PPN berdasarkan Pasal 16B UU PPN. Konsultasikan dengan konsultan
                  pajak untuk menentukan kewajiban PPN yang tepat.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">DPP (Dasar Pengenaan Pajak)</TableHead>
                    <TableHead className="text-right">PPN 11%</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.filter(m => m.revenue > 0).map(m => (
                    <TableRow key={m.month}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.revenue)}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">{formatCurrency(m.ppn_collected)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">Hitung Manual</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {monthlyData.every(m => m.revenue === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Tidak ada pendapatan tercatat di {selectedYear}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="font-medium text-purple-800">Total PPN Keluaran {selectedYear}</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(totalPPN)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PPh 21 & 23 */}
        <TabsContent value="pph" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">PPh 21 — Pajak Penghasilan Karyawan</CardTitle>
                    <CardDescription>
                      {hasPayrollData
                        ? "Sumber data: Modul Payroll (lebih akurat dari entri kas manual)"
                        : "Sumber: transaksi kas kategori \"salary\". Tarif estimasi 5%."}
                    </CardDescription>
                  </div>
                  {hasPayrollData && (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                      Data Payroll Tersedia
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasPayrollData ? (
                  <>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="font-medium text-green-800">Total Gross Gaji {selectedYear} (Payroll)</p>
                        <p className="text-sm text-green-600">{(payrollRecords as any[]).length} slip gaji yang sudah dibayar</p>
                      </div>
                      <p className="text-xl font-bold text-green-700">{formatCurrency(payrollGross)}</p>
                    </div>
                    {payrollPPH21Direct > 0 && (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-orange-800">PPh 21 Aktual (dari slip gaji)</p>
                          <p className="text-xs text-orange-600">Dihitung per karyawan berdasarkan PTKP & tarif progresif</p>
                        </div>
                        <p className="text-xl font-bold text-orange-700">{formatCurrency(payrollPPH21Direct)}</p>
                      </div>
                    )}
                    {payrollPPH21Direct === 0 && (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-orange-800">Estimasi PPh 21 (5% × Gross)</p>
                          <p className="text-xs text-orange-600">Kolom pph21_amount belum diisi di payroll_records</p>
                        </div>
                        <p className="text-xl font-bold text-orange-700">{formatCurrency(payrollPPH21Estimated)}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-medium">Total Biaya Gaji {selectedYear}</p>
                        <p className="text-sm text-muted-foreground">Sumber: transaksi kas kategori "salary"</p>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(totalSalary)}</p>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div>
                        <p className="font-medium text-orange-800">Estimasi PPh 21 (5%)</p>
                        <p className="text-xs text-orange-600">Tarif sebenarnya bergantung pada PTKP & penghasilan per karyawan</p>
                      </div>
                      <p className="text-xl font-bold text-orange-700">{formatCurrency(totalPPH21)}</p>
                    </div>
                  </>
                )}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    PPh 21 yang sebenarnya harus dihitung per karyawan berdasarkan PTKP dan tarif progresif.
                    {hasPayrollData
                      ? " Isi kolom pph21_amount di setiap payroll_record untuk akurasi penuh."
                      : " Aktifkan Modul Payroll untuk data yang lebih akurat."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">PPh 23 — Pajak Jasa Vendor</CardTitle>
                <CardDescription>4% dari biaya vendor (hotel, maskapai, catering, dll) yang dipotong saat pembayaran.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-right">Dasar Pengenaan (Biaya Vendor)</TableHead>
                      <TableHead className="text-right">PPh 23 (4%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.filter(m => m.vendor_costs > 0).map(m => (
                      <TableRow key={m.month}>
                        <TableCell>{m.label}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.vendor_costs)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{formatCurrency(m.pph23)}</TableCell>
                      </TableRow>
                    ))}
                    {monthlyData.every(m => m.vendor_costs === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Tidak ada biaya vendor tercatat di {selectedYear}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="font-medium text-orange-800">Total PPh 23 Dipotong {selectedYear}</p>
                  <p className="text-xl font-bold text-orange-700">{formatCurrency(totalPPH23)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Ringkasan Kewajiban Pajak {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-purple-50">
                    <span className="text-sm">PPN Keluaran (11%)</span>
                    <span className="font-medium text-purple-700">{formatCurrency(totalPPN)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-orange-50">
                    <span className="text-sm">PPh 23 (4% vendor)</span>
                    <span className="font-medium text-orange-700">{formatCurrency(totalPPH23)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-yellow-50">
                    <span className="text-sm">PPh 21 (estimasi 5%)</span>
                    <span className="font-medium text-yellow-700">{formatCurrency(totalPPH21)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-200 font-bold">
                    <span>Total Estimasi Kewajiban Pajak</span>
                    <span className="text-red-700">{formatCurrency(totalTaxObligation)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Angka ini adalah estimasi. Konsultasikan dengan konsultan pajak resmi untuk SPT yang akurat.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
