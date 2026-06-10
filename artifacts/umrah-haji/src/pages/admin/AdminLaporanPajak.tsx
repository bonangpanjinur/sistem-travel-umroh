import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileText, Calculator, AlertCircle, Users, Search, ChevronDown, ChevronRight, Info } from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const PPH23_RATE = 0.04;
const PPN_RATE  = 0.11;
const PPH21_EST = 0.05;

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTH_LONG  = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type TaxEntry = {
  month: string; label: string;
  revenue: number; ppn_collected: number;
  vendor_costs: number; pph23: number; gross_profit: number;
};

type PerEmpRow = {
  employee_id: string;
  full_name: string;
  employee_code: string;
  npwp: string;
  position: string;
  monthly_gross: number[];   // index 0 = Januari
  monthly_pph21: number[];
  total_gross: number;
  total_pph21: number;
};

export default function AdminLaporanPajak() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear]   = useState(String(currentYear));
  const [activeTab, setActiveTab]         = useState("rekapitulasi");
  const [searchEmp, setSearchEmp]         = useState("");
  const [expandedEmp, setExpandedEmp]     = useState<string | null>(null);

  const years      = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const yearStart  = startOfYear(new Date(Number(selectedYear), 0)).toISOString();
  const yearEnd    = endOfYear(new Date(Number(selectedYear), 0)).toISOString();

  // ─── Queries ───────────────────────────────────────────────────────────────

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

  const { data: vendorCosts = [] } = useQuery({
    queryKey: ["tax-vendor-costs", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_costs")
        .select("amount, cost_date, cost_type")
        .gte("cost_date", yearStart.slice(0, 10))
        .lte("cost_date", yearEnd.slice(0, 10));
      return data || [];
    },
  });

  const { data: salaryCosts = [] } = useQuery({
    queryKey: ["tax-salary", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_transactions")
        .select("amount, transaction_date")
        .gte("transaction_date", yearStart.slice(0, 10))
        .lte("transaction_date", yearEnd.slice(0, 10))
        .eq("type", "out")
        .eq("category", "salary");
      return data || [];
    },
  });

  // PPh 21 — payroll_records dengan join employees untuk NPWP & nama
  const { data: payrollRecords = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["tax-payroll", selectedYear],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_records")
        .select("employee_id, net_salary, gross_salary, pph21_amount, pph21_annual, period_month, period_year, status, employee:employees(full_name, employee_code, npwp, position)")
        .eq("period_year", Number(selectedYear))
        .eq("status", "paid")
        .order("period_month", { ascending: true });
      return data || [];
    },
  });
  const hasPayrollData = (payrollRecords as any[]).length > 0;

  // ─── Monthly summary ───────────────────────────────────────────────────────

  const months = eachMonthOfInterval({
    start: new Date(Number(selectedYear), 0),
    end:   new Date(Number(selectedYear), 11),
  });

  const monthlyData: TaxEntry[] = useMemo(() => months.map(month => {
    const mStart = format(startOfMonth(month), "yyyy-MM-dd");
    const mEnd   = format(endOfMonth(month),   "yyyy-MM-dd");

    const revenue = (payments as any[])
      .filter((p: any) => { const d = p.payment_date?.slice(0, 10) || ""; return d >= mStart && d <= mEnd; })
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    const vendorTotal = (vendorCosts as any[])
      .filter((v: any) => { const d = v.cost_date?.slice(0, 10) || ""; return d >= mStart && d <= mEnd; })
      .reduce((s: number, v: any) => s + Number(v.amount), 0);

    return {
      month: format(month, "yyyy-MM"),
      label: format(month, "MMMM yyyy", { locale: localeId }),
      revenue,
      ppn_collected: revenue * PPN_RATE,
      vendor_costs:  vendorTotal,
      pph23:         vendorTotal * PPH23_RATE,
      gross_profit:  revenue - vendorTotal,
    };
  }), [months, payments, vendorCosts]);

  const totalRevenue  = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalPPN      = monthlyData.reduce((s, m) => s + m.ppn_collected, 0);
  const totalPPH23    = monthlyData.reduce((s, m) => s + m.pph23, 0);
  const totalVendor   = monthlyData.reduce((s, m) => s + m.vendor_costs, 0);
  const totalSalary   = (salaryCosts as any[]).reduce((s: number, r: any) => s + Number(r.amount), 0);

  const payrollPPH21Direct    = (payrollRecords as any[]).reduce((s: number, r: any) => s + (Number(r.pph21_amount) || 0), 0);
  const payrollGross          = (payrollRecords as any[]).reduce((s: number, r: any) => s + (Number(r.gross_salary) || 0), 0);
  const payrollPPH21Estimated = payrollGross * PPH21_EST;
  const totalPPH21 = hasPayrollData
    ? (payrollPPH21Direct > 0 ? payrollPPH21Direct : payrollPPH21Estimated)
    : (totalSalary * PPH21_EST);
  const totalTaxObligation = totalPPN + totalPPH23 + totalPPH21;

  // ─── Per-employee breakdown (untuk tab 1721-A1) ───────────────────────────

  const perEmployeeData: PerEmpRow[] = useMemo(() => {
    const empMap = new Map<string, PerEmpRow>();

    for (const rec of payrollRecords as any[]) {
      const empId = rec.employee_id;
      if (!empId) continue;

      if (!empMap.has(empId)) {
        empMap.set(empId, {
          employee_id:   empId,
          full_name:     rec.employee?.full_name     || "—",
          employee_code: rec.employee?.employee_code || "—",
          npwp:          rec.employee?.npwp          || "",
          position:      rec.employee?.position      || "—",
          monthly_gross: Array(12).fill(0),
          monthly_pph21: Array(12).fill(0),
          total_gross:   0,
          total_pph21:   0,
        });
      }

      const emp      = empMap.get(empId)!;
      const mIdx     = Math.max(0, Math.min(11, (Number(rec.period_month) || 1) - 1));
      const gross    = Number(rec.gross_salary)  || 0;
      const pph21    = Number(rec.pph21_amount)  || 0;

      emp.monthly_gross[mIdx] += gross;
      emp.monthly_pph21[mIdx] += pph21;
      emp.total_gross          += gross;
      emp.total_pph21          += pph21;
    }

    return Array.from(empMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [payrollRecords]);

  const filteredEmp = perEmployeeData.filter(e =>
    e.full_name.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.npwp.includes(searchEmp)
  );

  const grandTotalGross = perEmployeeData.reduce((s, e) => s + e.total_gross, 0);
  const grandTotalPPH21 = perEmployeeData.reduce((s, e) => s + e.total_pph21, 0);

  // ─── Export helpers ────────────────────────────────────────────────────────

  const handleExportPDF = () => {
    exportToPDF(
      monthlyData.map(m => ({
        "Bulan": m.label,
        "Pendapatan": fmt(m.revenue),
        "PPN (11%)": fmt(m.ppn_collected),
        "Biaya Vendor": fmt(m.vendor_costs),
        "PPh 23 (4%)": fmt(m.pph23),
        "Laba Kotor": fmt(m.gross_profit),
      })),
      `Laporan Pajak ${selectedYear}`,
      `laporan-pajak-${selectedYear}`
    );
  };

  const handleExportExcel = () => {
    exportToExcel(
      monthlyData.map(m => ({
        "Bulan": m.label,
        "Pendapatan (IDR)": m.revenue,
        "PPN 11% (IDR)": m.ppn_collected,
        "Biaya Vendor (IDR)": m.vendor_costs,
        "PPh 23 4% (IDR)": m.pph23,
        "Laba Kotor (IDR)": m.gross_profit,
      })),
      `Laporan Pajak ${selectedYear}`,
      `laporan-pajak-${selectedYear}`
    );
  };

  // Export e-SPT 1721-A1 — format per karyawan, bulanan + tahunan
  const handleExport1721A1 = () => {
    const rows = perEmployeeData.map((emp, idx) => {
      const row: Record<string, any> = {
        "No":            idx + 1,
        "Nama Karyawan": emp.full_name,
        "NPWP":          emp.npwp || "—",
        "NIK/KTP":       "—",
        "Jabatan":       emp.position,
        "Status PTKP":   "—",
      };
      MONTH_SHORT.forEach((m, i) => {
        row[`Gaji Bruto ${m}`]  = emp.monthly_gross[i] || 0;
        row[`PPh 21 ${m}`]      = emp.monthly_pph21[i] || 0;
      });
      row["Total Gaji Bruto Setahun"] = emp.total_gross;
      row["Total PPh 21 Terutang"]    = emp.total_pph21;
      row["PPh 21 Ditanggung Pemberi Kerja"] = 0;
      row["PPh 21 Ditanggung Karyawan"]      = emp.total_pph21;
      return row;
    });

    // Baris total
    const totalRow: Record<string, any> = {
      "No": "TOTAL", "Nama Karyawan": "", "NPWP": "", "NIK/KTP": "",
      "Jabatan": "", "Status PTKP": "",
    };
    MONTH_SHORT.forEach((m, i) => {
      totalRow[`Gaji Bruto ${m}`] = perEmployeeData.reduce((s, e) => s + e.monthly_gross[i], 0);
      totalRow[`PPh 21 ${m}`]     = perEmployeeData.reduce((s, e) => s + e.monthly_pph21[i], 0);
    });
    totalRow["Total Gaji Bruto Setahun"]           = grandTotalGross;
    totalRow["Total PPh 21 Terutang"]              = grandTotalPPH21;
    totalRow["PPh 21 Ditanggung Pemberi Kerja"]    = 0;
    totalRow["PPh 21 Ditanggung Karyawan"]         = grandTotalPPH21;
    rows.push(totalRow);

    exportToExcel(rows, `PPh21 1721-A1 ${selectedYear}`, `pph21-1721a1-${selectedYear}`);
  };

  // Export ringkasan per karyawan (tanpa bulanan — lebih ringkas)
  const handleExportEmpSummary = () => {
    exportToExcel(
      perEmployeeData.map((emp, idx) => ({
        "No":              idx + 1,
        "Kode":            emp.employee_code,
        "Nama":            emp.full_name,
        "NPWP":            emp.npwp || "—",
        "Jabatan":         emp.position,
        "Gaji Bruto/thn":  emp.total_gross,
        "PPh 21 Terutang": emp.total_pph21,
        "Efektif Rate (%)": emp.total_gross > 0
          ? ((emp.total_pph21 / emp.total_gross) * 100).toFixed(2)
          : "0.00",
      })),
      `Ringkasan PPh21 Karyawan ${selectedYear}`,
      `ringkasan-pph21-${selectedYear}`
    );
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Pajak</h1>
          <p className="text-muted-foreground">Rekap PPN, PPh 21, PPh 23 per tahun — basis akrual</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
            <p className="text-xl font-bold text-blue-700">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PPN Keluaran (11%)</p>
            <p className="text-xl font-bold text-purple-700">{fmt(totalPPN)}</p>
            <p className="text-xs text-muted-foreground">Dari penjualan jasa</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PPh 23 (4% vendor)</p>
            <p className="text-xl font-bold text-orange-700">{fmt(totalPPH23)}</p>
            <p className="text-xs text-muted-foreground">Dipotong dari vendor</p>
          </CardContent>
        </Card>
        <Card className={totalTaxObligation > 0 ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Kewajiban Pajak</p>
            <p className={`text-xl font-bold ${totalTaxObligation > 0 ? "text-red-700" : "text-green-700"}`}>
              {fmt(totalTaxObligation)}
            </p>
            <p className="text-xs text-muted-foreground">PPN + PPh 23 + PPh 21</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="rekapitulasi">Rekapitulasi Bulanan</TabsTrigger>
          <TabsTrigger value="ppn">PPN Keluaran</TabsTrigger>
          <TabsTrigger value="pph">PPh 21 &amp; PPh 23</TabsTrigger>
          <TabsTrigger value="pph21-karyawan" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            PPh 21 per Karyawan
            {hasPayrollData && perEmployeeData.length > 0 && (
              <Badge className="ml-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0">
                {perEmployeeData.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Rekapitulasi Bulanan ─────────────────────────────────────────── */}
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
                      <TableCell className="text-right">{m.revenue > 0 ? fmt(m.revenue) : "—"}</TableCell>
                      <TableCell className="text-right text-purple-600">{m.ppn_collected > 0 ? fmt(m.ppn_collected) : "—"}</TableCell>
                      <TableCell className="text-right">{m.vendor_costs > 0 ? fmt(m.vendor_costs) : "—"}</TableCell>
                      <TableCell className="text-right text-orange-600">{m.pph23 > 0 ? fmt(m.pph23) : "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${m.gross_profit < 0 ? "text-red-600" : "text-green-600"}`}>
                        {m.revenue > 0 || m.vendor_costs > 0 ? fmt(m.gross_profit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold border-t-2">
                    <TableCell>Total {selectedYear}</TableCell>
                    <TableCell className="text-right">{fmt(totalRevenue)}</TableCell>
                    <TableCell className="text-right text-purple-700">{fmt(totalPPN)}</TableCell>
                    <TableCell className="text-right">{fmt(totalVendor)}</TableCell>
                    <TableCell className="text-right text-orange-700">{fmt(totalPPH23)}</TableCell>
                    <TableCell className={`text-right ${(totalRevenue - totalVendor) < 0 ? "text-red-700" : "text-green-700"}`}>
                      {fmt(totalRevenue - totalVendor)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PPN Keluaran ────────────────────────────────────────────────── */}
        <TabsContent value="ppn" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PPN Keluaran — {selectedYear}</CardTitle>
              <CardDescription>PPN 11% dari pendapatan jasa perjalanan umroh & haji. Wajib dilaporkan dalam SPT Masa PPN.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-1">Catatan Penting</p>
                <p className="text-xs text-blue-700">
                  Jasa penyelenggaraan ibadah haji/umrah yang termasuk kategori jasa keagamaan
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
                      <TableCell className="text-right">{fmt(m.revenue)}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">{fmt(m.ppn_collected)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">Hitung Manual</Badge></TableCell>
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
                <p className="text-xl font-bold text-purple-700">{fmt(totalPPN)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PPh 21 & 23 ringkasan ────────────────────────────────────────── */}
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
                        <p className="text-sm text-green-600">{(payrollRecords as any[]).length} slip gaji — {perEmployeeData.length} karyawan</p>
                      </div>
                      <p className="text-xl font-bold text-green-700">{fmt(payrollGross)}</p>
                    </div>
                    {payrollPPH21Direct > 0 ? (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-orange-800">PPh 21 Aktual (dari slip gaji)</p>
                          <p className="text-xs text-orange-600">Dihitung per karyawan berdasarkan PTKP & tarif progresif</p>
                        </div>
                        <p className="text-xl font-bold text-orange-700">{fmt(payrollPPH21Direct)}</p>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-orange-800">Estimasi PPh 21 (5% × Gross)</p>
                          <p className="text-xs text-orange-600">
                            Klik "Finalize Payroll" di Modul Payroll untuk simpan PPh 21 aktual
                          </p>
                        </div>
                        <p className="text-xl font-bold text-orange-700">{fmt(payrollPPH21Estimated)}</p>
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
                      <p className="text-xl font-bold">{fmt(totalSalary)}</p>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div>
                        <p className="font-medium text-orange-800">Estimasi PPh 21 (5%)</p>
                        <p className="text-xs text-orange-600">Tarif sebenarnya bergantung pada PTKP & penghasilan per karyawan</p>
                      </div>
                      <p className="text-xl font-bold text-orange-700">{fmt(totalPPH21)}</p>
                    </div>
                  </>
                )}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    PPh 21 yang sebenarnya harus dihitung per karyawan berdasarkan PTKP dan tarif progresif.
                    Lihat tab <strong>PPh 21 per Karyawan</strong> untuk rincian 1721-A1.
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
                        <TableCell className="text-right">{fmt(m.vendor_costs)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{fmt(m.pph23)}</TableCell>
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
                  <p className="text-xl font-bold text-orange-700">{fmt(totalPPH23)}</p>
                </div>
              </CardContent>
            </Card>

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
                    <span className="font-medium text-purple-700">{fmt(totalPPN)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-orange-50">
                    <span className="text-sm">PPh 23 (4% vendor)</span>
                    <span className="font-medium text-orange-700">{fmt(totalPPH23)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-yellow-50">
                    <span className="text-sm">PPh 21 ({payrollPPH21Direct > 0 ? "aktual" : "estimasi 5%"})</span>
                    <span className="font-medium text-yellow-700">{fmt(totalPPH21)}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-200 font-bold">
                    <span>Total Estimasi Kewajiban Pajak</span>
                    <span className="text-red-700">{fmt(totalTaxObligation)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Angka ini adalah estimasi. Konsultasikan dengan konsultan pajak resmi untuk SPT yang akurat.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PPh 21 Per Karyawan (1721-A1) ───────────────────────────────── */}
        <TabsContent value="pph21-karyawan" className="mt-4">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, kode, atau NPWP..."
                    value={searchEmp}
                    onChange={e => setSearchEmp(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                {hasPayrollData && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    {perEmployeeData.length} karyawan · {selectedYear}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportEmpSummary}
                      disabled={perEmployeeData.length === 0}
                      className="gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      Ringkasan Excel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export ringkasan per karyawan (tanpa bulanan)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleExport1721A1}
                      disabled={perEmployeeData.length === 0}
                      className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <FileText className="h-4 w-4" />
                      Export e-SPT 1721-A1
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download Excel format e-SPT 1721-A1 per karyawan bulanan</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Info box e-SPT 1721-A1 */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Formulir 1721-A1</strong> adalah bukti potong PPh 21 yang wajib diberikan kepada karyawan setiap akhir tahun pajak.
                Data NPWP diambil dari profil karyawan — lengkapi NPWP di modul SDM jika masih kosong.
                {!hasPayrollData && " Jalankan Finalize Payroll di modul Payroll terlebih dahulu agar data tersedia di sini."}
              </p>
            </div>

            {/* No data state */}
            {!hasPayrollData && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-muted-foreground">Belum ada data payroll {selectedYear}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Buka modul Payroll → pilih periode bulan → klik "Finalize Payroll" untuk setiap bulan.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Grand total cards */}
            {perEmployeeData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total Gaji Bruto {selectedYear}</p>
                    <p className="font-bold text-green-700 text-lg">{fmt(grandTotalGross)}</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total PPh 21 Terutang</p>
                    <p className="font-bold text-orange-700 text-lg">{fmt(grandTotalPPH21)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {grandTotalGross > 0
                        ? `Rate efektif: ${((grandTotalPPH21 / grandTotalGross) * 100).toFixed(2)}%`
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Jumlah Karyawan</p>
                    <p className="font-bold text-blue-700 text-lg">{perEmployeeData.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Bulan dengan Data</p>
                    <p className="font-bold text-purple-700 text-lg">
                      {new Set((payrollRecords as any[]).map((r: any) => r.period_month)).size} / 12
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Per-employee table — collapsible monthly breakdown */}
            {filteredEmp.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detail PPh 21 per Karyawan — {selectedYear}
                  </CardTitle>
                  <CardDescription>
                    Klik baris karyawan untuk lihat rincian bulanan. Total termasuk seluruh {perEmployeeData.length} karyawan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-8" />
                          <TableHead>Nama Karyawan</TableHead>
                          <TableHead className="w-28">NPWP</TableHead>
                          <TableHead className="w-24">Jabatan</TableHead>
                          <TableHead className="text-right w-32">Gaji Bruto/thn</TableHead>
                          <TableHead className="text-right w-32">PPh 21 Terutang</TableHead>
                          <TableHead className="text-right w-24">Rate Efektif</TableHead>
                          <TableHead className="w-20 text-center">NPWP Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmp.map((emp) => (
                          <>
                            {/* Summary row */}
                            <TableRow
                              key={emp.employee_id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedEmp(expandedEmp === emp.employee_id ? null : emp.employee_id)}
                            >
                              <TableCell className="text-center text-muted-foreground">
                                {expandedEmp === emp.employee_id
                                  ? <ChevronDown className="h-4 w-4 mx-auto" />
                                  : <ChevronRight className="h-4 w-4 mx-auto" />}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{emp.full_name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{emp.employee_code}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {emp.npwp || <span className="text-red-500 text-xs">Belum diisi</span>}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{emp.position}</TableCell>
                              <TableCell className="text-right font-semibold text-green-700">
                                {fmt(emp.total_gross)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-orange-700">
                                {emp.total_pph21 > 0 ? fmt(emp.total_pph21) : <span className="text-muted-foreground font-normal">—</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {emp.total_gross > 0
                                  ? <span className="text-blue-700">{((emp.total_pph21 / emp.total_gross) * 100).toFixed(2)}%</span>
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {emp.npwp ? (
                                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">Ada</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">Kosong</Badge>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Expanded monthly breakdown */}
                            {expandedEmp === emp.employee_id && (
                              <TableRow key={`${emp.employee_id}-monthly`} className="bg-orange-50/30 hover:bg-orange-50/50">
                                <TableCell colSpan={8} className="p-0">
                                  <div className="px-4 py-3">
                                    <p className="text-xs font-semibold text-orange-800 mb-2">
                                      Rincian Bulanan — {emp.full_name}
                                    </p>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Bulan</th>
                                            {MONTH_SHORT.map(m => (
                                              <th key={m} className="text-right py-1 px-1.5 font-medium text-muted-foreground w-20">{m}</th>
                                            ))}
                                            <th className="text-right py-1 pl-3 font-semibold">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-b border-dashed">
                                            <td className="py-1 pr-3 text-muted-foreground">Gaji Bruto</td>
                                            {emp.monthly_gross.map((g, i) => (
                                              <td key={i} className={`text-right py-1 px-1.5 ${g > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                                                {g > 0 ? fmtNum(g) : "—"}
                                              </td>
                                            ))}
                                            <td className="text-right py-1 pl-3 font-semibold text-green-700">{fmtNum(emp.total_gross)}</td>
                                          </tr>
                                          <tr>
                                            <td className="py-1 pr-3 text-muted-foreground">PPh 21</td>
                                            {emp.monthly_pph21.map((p, i) => (
                                              <td key={i} className={`text-right py-1 px-1.5 font-medium ${p > 0 ? "text-orange-700" : "text-muted-foreground"}`}>
                                                {p > 0 ? fmtNum(p) : "—"}
                                              </td>
                                            ))}
                                            <td className="text-right py-1 pl-3 font-bold text-orange-700">{fmtNum(emp.total_pph21)}</td>
                                          </tr>
                                          <tr className="border-t">
                                            <td className="py-1 pr-3 text-muted-foreground text-[10px]">Rate eff.</td>
                                            {emp.monthly_gross.map((g, i) => (
                                              <td key={i} className="text-right py-1 px-1.5 text-[10px] text-blue-600">
                                                {g > 0 ? `${((emp.monthly_pph21[i] / g) * 100).toFixed(1)}%` : "—"}
                                              </td>
                                            ))}
                                            <td className="text-right py-1 pl-3 text-[10px] text-blue-700 font-medium">
                                              {emp.total_gross > 0 ? `${((emp.total_pph21 / emp.total_gross) * 100).toFixed(2)}%` : "—"}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}

                        {/* Grand total footer */}
                        <TableRow className="bg-gray-100 font-bold border-t-2 text-sm">
                          <TableCell />
                          <TableCell colSpan={3}>
                            Total {selectedYear} ({perEmployeeData.length} karyawan)
                          </TableCell>
                          <TableCell className="text-right text-green-700">{fmt(grandTotalGross)}</TableCell>
                          <TableCell className="text-right text-orange-700">{fmt(grandTotalPPH21)}</TableCell>
                          <TableCell className="text-right text-blue-700">
                            {grandTotalGross > 0
                              ? `${((grandTotalPPH21 / grandTotalGross) * 100).toFixed(2)}%`
                              : "—"}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* NPWP warning */}
                  {perEmployeeData.some(e => !e.npwp) && (
                    <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        <strong>{perEmployeeData.filter(e => !e.npwp).length} karyawan</strong> belum memiliki NPWP.
                        Lengkapi di Modul SDM → Edit Profil Karyawan → Kolom NPWP sebelum submit e-SPT.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty search result */}
            {hasPayrollData && filteredEmp.length === 0 && searchEmp && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Tidak ditemukan karyawan yang cocok dengan "<strong>{searchEmp}</strong>"
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
