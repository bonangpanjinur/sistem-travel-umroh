import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, DollarSign, TrendingUp, AlertCircle, Bell, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import * as XLSX from "xlsx";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const formatCurrencyRaw = (amount: number) => amount;

export default function AdminFinanceAR() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: arData = [], isLoading } = useQuery({
    queryKey: ["admin-ar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          total_price,
          paid_amount,
          payment_status,
          created_at,
          customer:customers(full_name, phone, email),
          departure:departures(
            package:packages(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data ?? []).map((b) => {
        const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
        const departure = Array.isArray(b.departure) ? b.departure[0] : b.departure;
        const pkg = departure
          ? Array.isArray((departure as any).package)
            ? (departure as any).package[0]
            : (departure as any).package
          : null;

        const daysSince = b.created_at ? differenceInDays(new Date(), new Date(b.created_at)) : 0;
        const agingBucket =
          daysSince <= 30 ? "0-30"
          : daysSince <= 60 ? "31-60"
          : daysSince <= 90 ? "61-90"
          : ">90";

        return {
          id: b.id,
          booking_code: b.booking_code,
          customer_name: customer?.full_name || "Unknown",
          customer_phone: customer?.phone || "",
          customer_email: customer?.email || "",
          package_name: pkg?.name || "-",
          total_amount: b.total_price || 0,
          paid_amount: b.paid_amount || 0,
          outstanding: (b.total_price || 0) - (b.paid_amount || 0),
          status: b.payment_status,
          created_at: b.created_at,
          days_since: daysSince,
          aging_bucket: agingBucket,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalAR = arData.reduce((sum, ar) => sum + ar.outstanding, 0);
  const totalPaid = arData.reduce((sum, ar) => sum + ar.paid_amount, 0);
  const totalBookings = arData.reduce((sum, ar) => sum + ar.total_amount, 0);

  // Aging buckets for outstanding only
  const outstanding = arData.filter(ar => ar.outstanding > 0);
  const aging030 = outstanding.filter(ar => ar.aging_bucket === "0-30").reduce((s, ar) => s + ar.outstanding, 0);
  const aging3160 = outstanding.filter(ar => ar.aging_bucket === "31-60").reduce((s, ar) => s + ar.outstanding, 0);
  const aging6190 = outstanding.filter(ar => ar.aging_bucket === "61-90").reduce((s, ar) => s + ar.outstanding, 0);
  const aging90plus = outstanding.filter(ar => ar.aging_bucket === ">90").reduce((s, ar) => s + ar.outstanding, 0);

  const [agingFilter, setAgingFilter] = useState<string>("all");

  const filtered = arData.filter((ar) => {
    const matchAging = agingFilter === "all" || ar.aging_bucket === agingFilter;
    const matchSearch =
      ar.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.booking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "outstanding" && ar.outstanding > 0) ||
      (statusFilter === "paid" && ar.outstanding === 0);
    return matchSearch && matchStatus && matchAging;
  });

  // ─── Export helpers ────────────────────────────────────────────────────────

  const buildRows = (rows: typeof filtered) =>
    rows.map((ar) => ({
      Nama: ar.customer_name,
      HP: ar.customer_phone,
      "Kode Booking": ar.booking_code,
      Paket: ar.package_name,
      "Total (Rp)": formatCurrencyRaw(ar.total_amount),
      "Terbayar (Rp)": formatCurrencyRaw(ar.paid_amount),
      "Sisa (Rp)": formatCurrencyRaw(ar.outstanding),
      Status: ar.outstanding === 0 ? "Lunas" : "Tertunggak",
    }));

  const handleExportExcel = () => {
    try {
      const exportData = statusFilter === "outstanding"
        ? filtered
        : filtered.filter((ar) => ar.outstanding > 0);

      if (exportData.length === 0) {
        toast.warning("Tidak ada data tagihan tertunggak untuk diekspor");
        return;
      }

      const rows = buildRows(exportData);
      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      ws["!cols"] = [
        { wch: 28 }, // Nama
        { wch: 16 }, // HP
        { wch: 18 }, // Kode Booking
        { wch: 30 }, // Paket
        { wch: 18 }, // Total
        { wch: 18 }, // Terbayar
        { wch: 18 }, // Sisa
        { wch: 12 }, // Status
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tagihan Outstanding");

      const fileName = `tagihan-outstanding-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`${exportData.length} data berhasil diekspor ke ${fileName}`);
    } catch (err: any) {
      toast.error("Gagal ekspor Excel: " + err.message);
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = statusFilter === "outstanding"
        ? filtered
        : filtered.filter((ar) => ar.outstanding > 0);

      if (exportData.length === 0) {
        toast.warning("Tidak ada data tagihan tertunggak untuk diekspor");
        return;
      }

      const rows = buildRows(exportData);
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tagihan-outstanding-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${exportData.length} data berhasil diekspor ke CSV`);
    } catch (err: any) {
      toast.error("Gagal ekspor CSV: " + err.message);
    }
  };

  const outstandingCount = filtered.filter((ar) => ar.outstanding > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Piutang Jamaah (AR)</h1>
          <p className="text-muted-foreground">Kelola piutang cicilan dari jamaah berdasarkan booking</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 self-start">
              <Download className="h-4 w-4" />
              Export Tagihan
              {outstandingCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {outstandingCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Export ke Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-blue-600" />
              Export ke CSV (.csv)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBookings)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Piutang Tertunggak</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAR)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
                <p className="text-2xl font-bold">{arData.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis Cards */}
      <div>
        <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Analisis Aging Piutang</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card
            className={`cursor-pointer border-2 transition-colors ${agingFilter === "0-30" ? "border-blue-400 bg-blue-50" : "hover:border-blue-200"}`}
            onClick={() => setAgingFilter(agingFilter === "0-30" ? "all" : "0-30")}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">0–30 Hari (Lancar)</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(aging030)}</p>
              <p className="text-xs text-muted-foreground">{outstanding.filter(a => a.aging_bucket === "0-30").length} booking</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer border-2 transition-colors ${agingFilter === "31-60" ? "border-yellow-400 bg-yellow-50" : "hover:border-yellow-200"}`}
            onClick={() => setAgingFilter(agingFilter === "31-60" ? "all" : "31-60")}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">31–60 Hari (Perhatian)</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(aging3160)}</p>
              <p className="text-xs text-muted-foreground">{outstanding.filter(a => a.aging_bucket === "31-60").length} booking</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer border-2 transition-colors ${agingFilter === "61-90" ? "border-orange-400 bg-orange-50" : "hover:border-orange-200"}`}
            onClick={() => setAgingFilter(agingFilter === "61-90" ? "all" : "61-90")}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">61–90 Hari (Kritis)</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(aging6190)}</p>
              <p className="text-xs text-muted-foreground">{outstanding.filter(a => a.aging_bucket === "61-90").length} booking</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer border-2 transition-colors ${agingFilter === ">90" ? "border-red-400 bg-red-50" : "hover:border-red-200"}`}
            onClick={() => setAgingFilter(agingFilter === ">90" ? "all" : ">90")}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">&gt;90 Hari (Macet)</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(aging90plus)}</p>
              <p className="text-xs text-muted-foreground">{outstanding.filter(a => a.aging_bucket === ">90").length} booking</p>
            </CardContent>
          </Card>
        </div>
        {agingFilter !== "all" && (
          <button className="text-xs text-blue-600 mt-1 underline" onClick={() => setAgingFilter("all")}>
            Reset filter aging
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama jamaah, kode booking, atau paket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="outstanding">Tertunggak</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada data piutang ditemukan
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Booking</TableHead>
                <TableHead>Nama Jamaah</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Terbayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ar) => (
                  <TableRow
                    key={ar.id}
                    className={ar.outstanding > 0 && ar.aging_bucket === ">90" ? "bg-red-50/40" : ar.outstanding > 0 && ar.aging_bucket === "61-90" ? "bg-orange-50/30" : ""}
                  >
                    <TableCell className="font-medium">{ar.booking_code}</TableCell>
                  <TableCell>
                    <div>{ar.customer_name}</div>
                    {ar.customer_phone && (
                      <div className="text-sm text-muted-foreground">{ar.customer_phone}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {ar.package_name}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(ar.total_amount)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(ar.paid_amount)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      ar.outstanding > 0 ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(ar.outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ar.outstanding === 0 ? "default" : "secondary"}>
                      {ar.outstanding === 0 ? "Lunas" : "Tertunggak"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ar.outstanding > 0 && (
                      <Badge className={
                        ar.aging_bucket === "0-30" ? "bg-blue-100 text-blue-700 text-xs" :
                        ar.aging_bucket === "31-60" ? "bg-yellow-100 text-yellow-700 text-xs" :
                        ar.aging_bucket === "61-90" ? "bg-orange-100 text-orange-700 text-xs" :
                        "bg-red-100 text-red-700 text-xs"
                      }>
                        {ar.days_since}h ({ar.aging_bucket})
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {ar.outstanding > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data: customerData } = await supabase
                              .from("customers")
                              .select("user_id")
                              .eq("full_name", ar.customer_name)
                              .limit(1)
                              .maybeSingle();

                            if (customerData?.user_id) {
                              await supabase.from("notifications").insert({
                                user_id: customerData.user_id,
                                title: "Pengingat Pembayaran",
                                message: `Anda memiliki piutang sebesar ${formatCurrency(ar.outstanding)} untuk booking ${ar.booking_code}. Segera lakukan pembayaran.`,
                                type: "warning",
                                link: "/customer/bookings",
                              });
                              toast.success(`Reminder berhasil dikirim ke ${ar.customer_name}`);
                            } else {
                              toast.error("User ID jamaah tidak ditemukan");
                            }
                          } catch (err: any) {
                            toast.error("Gagal mengirim reminder: " + err.message);
                          }
                        }}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Reminder
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-1">ℹ️ Informasi Ekspor</p>
          <p>
            Tombol <strong>Export Tagihan</strong> di kanan atas akan mengunduh data tagihan
            <strong> tertunggak</strong> (outstanding) saja — berisi kolom Nama, HP, Kode Booking,
            Paket, Total, Terbayar, dan Sisa. Gunakan filter <em>Tertunggak</em> untuk fokus pada
            daftar yang perlu di-follow-up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
