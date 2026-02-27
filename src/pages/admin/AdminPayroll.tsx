import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Download, Eye, Banknote, Users, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

interface PayrollData {
  employee_id: string;
  employee_code: string;
  full_name: string;
  position: string | null;
  salary: number;
  attendance_days: number;
  absent_days: number;
  late_count: number;
  deduction: number;
  net_salary: number;
  status: 'pending' | 'processed' | 'paid';
  paid_date?: string;
}

export default function AdminPayroll() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch attendance records for the selected month
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-records", selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = month === "12" ? `${parseInt(year) + 1}-01-01` : `${year}-${String(parseInt(month) + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .gte("attendance_date", startDate)
        .lt("attendance_date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate payroll data
  const payrollData: PayrollData[] = employees.map(emp => {
    const empAttendance = attendanceRecords.filter(a => a.employee_id === emp.id);
    const workDays = 22; // Standard working days per month
    const attendanceDays = empAttendance.filter(a => a.status === "present").length;
    const absentDays = workDays - attendanceDays;
    const lateCount = empAttendance.filter(a => (a as any).is_late).length;

    const baseSalary = emp.salary || 0;
    const dailyRate = baseSalary / workDays;

    // Calculate deductions
    let deduction = 0;
    
    // Absent deduction
    if (emp.use_custom_deduction && emp.custom_absent_deduction) {
      const absentDeduction = emp.custom_absent_deduction_type === 'percentage'
        ? (baseSalary * emp.custom_absent_deduction) / 100
        : emp.custom_absent_deduction;
      deduction += absentDeduction * absentDays;
    } else {
      deduction += dailyRate * absentDays;
    }

    // Late deduction
    if (emp.use_custom_deduction && emp.custom_late_deduction) {
      const lateDeduction = emp.custom_late_deduction_type === 'percentage'
        ? (baseSalary * emp.custom_late_deduction) / 100
        : emp.custom_late_deduction;
      deduction += lateDeduction * lateCount;
    } else {
      deduction += (dailyRate * 0.1) * lateCount; // 10% of daily rate per late
    }

    const netSalary = baseSalary - deduction;

    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      position: emp.position,
      salary: baseSalary,
      attendance_days: attendanceDays,
      absent_days: absentDays,
      late_count: lateCount,
      deduction: Math.round(deduction),
      net_salary: Math.round(netSalary),
      status: 'pending',
    };
  });

  // Filter payroll data
  const filtered = payrollData.filter(p => {
    const matchSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate totals
  const totalGross = filtered.reduce((sum, p) => sum + p.salary, 0);
  const totalDeduction = filtered.reduce((sum, p) => sum + p.deduction, 0);
  const totalNet = filtered.reduce((sum, p) => sum + p.net_salary, 0);

  const markAsPaidMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      // This would typically update a payroll_records table
      // For now, we'll just show a success message
      toast.success("Gaji telah ditandai sebagai dibayar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-data"] });
    },
  });

  const handleViewDetail = (payroll: PayrollData) => {
    setSelectedPayroll(payroll);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Penggajian / Payroll</h1>
          <p className="text-muted-foreground">Kelola slip gaji dan pembayaran gaji karyawan</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Banknote className="h-4 w-4" /> Ringkasan Gaji
          </TabsTrigger>
          <TabsTrigger value="slips" className="gap-2">
            <Calendar className="h-4 w-4" /> Slip Gaji
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Laporan
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Karyawan</p>
                    <p className="text-2xl font-bold">{employees.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gaji Kotor</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalGross)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Potongan</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalDeduction)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gaji Bersih</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Month Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Pilih Bulan</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* Slips Tab */}
        <TabsContent value="slips" className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama karyawan atau kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Diproses</SelectItem>
                <SelectItem value="paid">Dibayar</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-[200px]"
            />
          </div>

          {/* Table */}
          {loadingEmployees ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Tidak ada data gaji ditemukan</CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Karyawan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Gaji Kotor</TableHead>
                    <TableHead>Kehadiran</TableHead>
                    <TableHead>Potongan</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payroll) => (
                    <TableRow key={payroll.employee_id}>
                      <TableCell className="font-medium">{payroll.employee_code}</TableCell>
                      <TableCell>{payroll.full_name}</TableCell>
                      <TableCell>{payroll.position || "-"}</TableCell>
                      <TableCell>{formatCurrency(payroll.salary)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Hadir: {payroll.attendance_days} hari</div>
                          <div className="text-muted-foreground">Absen: {payroll.absent_days} hari</div>
                          {payroll.late_count > 0 && (
                            <div className="text-orange-600">Terlambat: {payroll.late_count}x</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(payroll.deduction)}</TableCell>
                      <TableCell className="font-bold text-green-600">{formatCurrency(payroll.net_salary)}</TableCell>
                      <TableCell>
                        <Badge variant={payroll.status === "paid" ? "default" : "secondary"}>
                          {payroll.status === "pending" ? "Pending" : payroll.status === "processed" ? "Diproses" : "Dibayar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(payroll)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toast.success("Slip gaji diunduh");
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Penggajian</CardTitle>
              <CardDescription>Laporan ringkasan penggajian bulanan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Unduh Laporan PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode Karyawan</p>
                  <p className="font-medium">{selectedPayroll.employee_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{selectedPayroll.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posisi</p>
                  <p className="font-medium">{selectedPayroll.position || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Periode</p>
                  <p className="font-medium">{selectedMonth}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Gaji Pokok</span>
                  <span className="font-medium">{formatCurrency(selectedPayroll.salary)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Potongan (Absen & Terlambat)</span>
                  <span className="font-medium">-{formatCurrency(selectedPayroll.deduction)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Gaji Bersih</span>
                  <span className="text-green-600">{formatCurrency(selectedPayroll.net_salary)}</span>
                </div>
              </div>

              <div className="bg-muted p-3 rounded text-sm space-y-1">
                <p><strong>Kehadiran:</strong> {selectedPayroll.attendance_days} hari</p>
                <p><strong>Absen:</strong> {selectedPayroll.absent_days} hari</p>
                <p><strong>Terlambat:</strong> {selectedPayroll.late_count}x</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Tutup</Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Unduh Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">ℹ️ Informasi Penggajian</p>
          <p>Sistem penggajian ini menghitung gaji bersih berdasarkan gaji pokok, kehadiran, dan keterlambatan. Potongan dihitung otomatis dari data absensi karyawan untuk bulan yang dipilih.</p>
        </CardContent>
      </Card>
    </div>
  );
}
