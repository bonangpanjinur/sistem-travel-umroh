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
import { format } from "date-fns";
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
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalAR = arData.reduce((sum, ar) => sum + ar.outstanding, 0);
  const totalPaid = arData.reduce((sum, ar) => sum + ar.paid_amount, 0);
  const totalBookings = arData.reduce((sum, ar) => sum + ar.total_amount, 0);

  const filtered = arData.filter((ar) => {
    const matchSearch =
      ar.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.booking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "outstanding" && ar.outstanding > 0) ||
      (statusFilter === "paid" && ar.outstanding === 0);
    return matchSearch && matchStatus;
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ar) => (
                <TableRow key={ar.id}>
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
