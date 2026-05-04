import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Wallet, Download,
  Search, Filter, X, Users, Banknote, TrendingUp, TrendingDown,
  CheckCircle2, Clock, FileText, Loader2
} from "lucide-react";

const CASH_CATEGORIES = [
  { value: 'operational', label: 'Operasional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'salary', label: 'Gaji' },
  { value: 'utilities', label: 'Utilitas' },
  { value: 'rent', label: 'Sewa' },
  { value: 'other_income', label: 'Pendapatan Lain' },
  { value: 'other_expense', label: 'Pengeluaran Lain' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export default function AdminFinanceCash() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "cash");

  // Permission check: super_admin, owner, or manager keuangan (finance role) can access
  const canEdit = hasRole('super_admin') || hasRole('owner') || hasRole('finance');

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kas & Keuangan</h1>
          <p className="text-muted-foreground">Kelola transaksi kas, pengeluaran, dan pembayaran gaji</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="cash" className="gap-2">
            <Wallet className="h-4 w-4" /> Kas Masuk/Keluar
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-2">
            <Banknote className="h-4 w-4" /> Pembayaran Gaji
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Ringkasan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash"><CashTab userId={user?.id} canEdit={canEdit} /></TabsContent>
        <TabsContent value="salary"><SalaryTab userId={user?.id} /></TabsContent>
        <TabsContent value="summary"><SummaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============== CASH TAB ==============
function CashTab({ userId, canEdit }: { userId?: string; canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState(() => format(new Date(), 'yyyy-MM'));

  const [form, setForm] = useState({
    transaction_type: 'expense' as 'income' | 'expense',
    category: 'operational',
    description: '',
    amount: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['cash-transactions', monthFilter],
    queryFn: async () => {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cash_transactions').insert({
        transaction_type: form.transaction_type,
        category: form.category,
        description: form.description || null,
        amount: parseFloat(form.amount),
        transaction_date: form.transaction_date,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      toast.success('Transaksi berhasil ditambahkan');
      setDialogOpen(false);
      setForm({ transaction_type: 'expense', category: 'operational', description: '', amount: '', transaction_date: format(new Date(), 'yyyy-MM-dd') });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return transactions?.filter(t => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }) || [];
  }, [transactions, typeFilter, categoryFilter, searchTerm]);

  const totalIncome = filtered.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const handleExport = () => {
    const cols = [
      { header: 'Tanggal', accessor: (r: any) => format(new Date(r.transaction_date), 'dd/MM/yyyy') },
      { header: 'Tipe', accessor: (r: any) => r.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran' },
      { header: 'Kategori', accessor: (r: any) => CASH_CATEGORIES.find(c => c.value === r.category)?.label || r.category },
      { header: 'Deskripsi', accessor: 'description', width: 30 },
      { header: 'Jumlah', accessor: 'amount', width: 18 },
    ];
    exportToExcel(filtered, cols, `Kas_${monthFilter}`, 'Transaksi Kas');
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Pemasukan</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Total Pengeluaran</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Saldo Kas</span>
            </div>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-auto" />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari deskripsi..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="income">Pemasukan</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CASH_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export</Button>
        {canEdit && <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Tambah</Button>}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Tidak ada transaksi ditemukan</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: localeId })}</TableCell>
                  <TableCell>
                    <Badge variant={t.transaction_type === 'income' ? 'default' : 'destructive'} className="gap-1">
                      {t.transaction_type === 'income' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                      {t.transaction_type === 'income' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </TableCell>
                  <TableCell>{CASH_CATEGORIES.find(c => c.value === t.category)?.label || t.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{t.description || '-'}</TableCell>
                  <TableCell className={`text-right font-medium ${t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Transaksi Kas</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addMutation.mutate(); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe *</Label>
                  <Select value={form.transaction_type} onValueChange={(v: any) => setForm({ ...form, transaction_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASH_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Jumlah (Rp) *</Label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan transaksi..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={addMutation.isPending || !form.amount}>
                {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== SALARY TAB ==============
function SalaryTab({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  const { data: employees } = useQuery({
    queryKey: ['employees-active-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, position, salary, use_custom_deduction, custom_absent_deduction, custom_absent_deduction_type, custom_late_deduction, custom_late_deduction_type')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: salaryPayments, isLoading } = useQuery({
    queryKey: ['salary-payments', periodMonth, periodYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*, employee:employees(full_name, position)')
        .eq('period_month', periodMonth)
        .eq('period_year', periodYear)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    base_salary: '',
    deductions: '0',
    overtime_pay: '0',
    allowances: '0',
    notes: '',
  });

  // Auto-generate all salary slips from HR/attendance data
  const bulkGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!employees?.length) throw new Error('Tidak ada karyawan aktif');

      // Fetch attendance for this period
      const startDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
      const endMonth = periodMonth === 12 ? 1 : periodMonth + 1;
      const endYear = periodMonth === 12 ? periodYear + 1 : periodYear;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('attendance_date', startDate)
        .lt('attendance_date', endDate);

      const existingEmpIds = new Set(salaryPayments?.map(sp => sp.employee_id) || []);
      const newSlips: any[] = [];
      const workDays = 22;

      for (const emp of employees) {
        if (existingEmpIds.has(emp.id)) continue;

        const empAtt = (attendance || []).filter(a => a.employee_id === emp.id);
        const attendanceDays = empAtt.filter(a => a.status === 'present').length;
        const absentDays = Math.max(0, workDays - attendanceDays);
        const lateCount = empAtt.filter(a => (a as any).is_late).length;

        const baseSalary = emp.salary || 0;
        const dailyRate = baseSalary / workDays;

        let deduction = 0;
        if (emp.use_custom_deduction && emp.custom_absent_deduction) {
          const absDed = emp.custom_absent_deduction_type === 'percentage'
            ? (baseSalary * emp.custom_absent_deduction) / 100
            : emp.custom_absent_deduction;
          deduction += absDed * absentDays;
        } else {
          deduction += dailyRate * absentDays;
        }
        if (emp.use_custom_deduction && emp.custom_late_deduction) {
          const lateDed = emp.custom_late_deduction_type === 'percentage'
            ? (baseSalary * emp.custom_late_deduction) / 100
            : emp.custom_late_deduction;
          deduction += lateDed * lateCount;
        } else {
          deduction += (dailyRate * 0.1) * lateCount;
        }

        const totalPay = baseSalary - Math.round(deduction);
        newSlips.push({
          employee_id: emp.id,
          period_month: periodMonth,
          period_year: periodYear,
          base_salary: baseSalary,
          deductions: Math.round(deduction),
          overtime_pay: 0,
          allowances: 0,
          total_pay: Math.max(0, totalPay),
          status: 'draft',
        });
      }

      if (!newSlips.length) throw new Error('Semua karyawan sudah memiliki slip gaji di periode ini');

      const { error } = await supabase.from('salary_payments').insert(newSlips);
      if (error) throw error;
      return newSlips.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      toast.success(`${count} slip gaji berhasil di-generate dari data HR & absensi`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const baseSalary = parseFloat(salaryForm.base_salary) || 0;
      const deductions = parseFloat(salaryForm.deductions) || 0;
      const overtimePay = parseFloat(salaryForm.overtime_pay) || 0;
      const allowances = parseFloat(salaryForm.allowances) || 0;
      const totalPay = baseSalary - deductions + overtimePay + allowances;

      const { error } = await supabase.from('salary_payments').insert({
        employee_id: salaryForm.employee_id,
        period_month: periodMonth,
        period_year: periodYear,
        base_salary: baseSalary,
        deductions,
        overtime_pay: overtimePay,
        allowances,
        total_pay: totalPay,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      toast.success('Slip gaji berhasil dibuat');
      setDialogOpen(false);
      setSalaryForm({ employee_id: '', base_salary: '', deductions: '0', overtime_pay: '0', allowances: '0', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salary_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: userId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      toast.success('Gaji ditandai sudah dibayar');
    },
  });

  const totalSalary = salaryPayments?.reduce((s, p) => s + Number(p.total_pay), 0) || 0;
  const paidCount = salaryPayments?.filter(p => p.status === 'paid').length || 0;
  const draftCount = salaryPayments?.filter(p => p.status === 'draft').length || 0;

  const selectedEmployee = employees?.find(e => e.id === salaryForm.employee_id);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Gaji Bulan Ini</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSalary)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{paidCount}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <Select value={String(periodMonth)} onValueChange={v => setPeriodMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2000, i), 'MMMM', { locale: localeId })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(periodYear)} onValueChange={v => setPeriodYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => bulkGenerateMutation.mutate()} disabled={bulkGenerateMutation.isPending}>
            {bulkGenerateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
            Generate Semua dari HR
          </Button>
          <Button onClick={() => {
            setDialogOpen(true);
            if (selectedEmployee) {
              setSalaryForm(prev => ({ ...prev, base_salary: String(selectedEmployee.salary || 0) }));
            }
          }}>
            <Plus className="h-4 w-4 mr-2" /> Buat Slip Manual
          </Button>
        </div>
      </div>

      {/* Salary list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : !salaryPayments?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Belum ada slip gaji untuk periode ini
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead className="text-right">Gaji Pokok</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Lembur</TableHead>
                <TableHead className="text-right">Tunjangan</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryPayments.map(sp => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{(sp.employee as any)?.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{(sp.employee as any)?.position || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(sp.base_salary))}</TableCell>
                  <TableCell className="text-right text-red-600">-{formatCurrency(Number(sp.deductions))}</TableCell>
                  <TableCell className="text-right text-green-600">+{formatCurrency(Number(sp.overtime_pay))}</TableCell>
                  <TableCell className="text-right text-blue-600">+{formatCurrency(Number(sp.allowances))}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(Number(sp.total_pay))}</TableCell>
                  <TableCell>
                    <Badge variant={sp.status === 'paid' ? 'default' : 'secondary'}>
                      {sp.status === 'paid' ? 'Dibayar' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sp.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(sp.id)} disabled={markPaidMutation.isPending}>
                        Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create salary dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Slip Gaji - {format(new Date(periodYear, periodMonth - 1), 'MMMM yyyy', { locale: localeId })}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); generateMutation.mutate(); }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Karyawan *</Label>
                <Select value={salaryForm.employee_id} onValueChange={v => {
                  const emp = employees?.find(e => e.id === v);
                  setSalaryForm({ ...salaryForm, employee_id: v, base_salary: String(emp?.salary || 0) });
                }}>
                  <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} - {e.position}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gaji Pokok (Rp)</Label>
                  <Input type="number" value={salaryForm.base_salary} onChange={e => setSalaryForm({ ...salaryForm, base_salary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Potongan (Rp)</Label>
                  <Input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Lembur (Rp)</Label>
                  <Input type="number" value={salaryForm.overtime_pay} onChange={e => setSalaryForm({ ...salaryForm, overtime_pay: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tunjangan (Rp)</Label>
                  <Input type="number" value={salaryForm.allowances} onChange={e => setSalaryForm({ ...salaryForm, allowances: e.target.value })} />
                </div>
              </div>
              {salaryForm.base_salary && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">Estimasi Total:</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        (parseFloat(salaryForm.base_salary) || 0) -
                        (parseFloat(salaryForm.deductions) || 0) +
                        (parseFloat(salaryForm.overtime_pay) || 0) +
                        (parseFloat(salaryForm.allowances) || 0)
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea value={salaryForm.notes} onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} placeholder="Catatan tambahan..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={generateMutation.isPending || !salaryForm.employee_id}>
                {generateMutation.isPending ? 'Menyimpan...' : 'Buat Slip'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== SUMMARY TAB ==============
function SummaryTab() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: cashData } = useQuery({
    queryKey: ['cash-summary', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('transaction_date, transaction_type, category, amount')
        .gte('transaction_date', `${year}-01-01`)
        .lt('transaction_date', `${year + 1}-01-01`);
      if (error) throw error;
      return data;
    },
  });

  const { data: salaryData } = useQuery({
    queryKey: ['salary-summary', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('period_month, total_pay, status')
        .eq('period_year', year);
      if (error) throw error;
      return data;
    },
  });

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: format(new Date(year, i), 'MMM', { locale: localeId }),
      income: 0,
      expense: 0,
      salary: 0,
      net: 0,
    }));

    cashData?.forEach(t => {
      const m = new Date(t.transaction_date).getMonth();
      if (t.transaction_type === 'income') months[m].income += Number(t.amount);
      else months[m].expense += Number(t.amount);
    });

    salaryData?.filter(s => s.status === 'paid').forEach(s => {
      months[s.period_month - 1].salary += Number(s.total_pay);
    });

    months.forEach(m => { m.net = m.income - m.expense - m.salary; });
    return months;
  }, [cashData, salaryData, year]);

  const totals = monthlyData.reduce((acc, m) => ({
    income: acc.income + m.income,
    expense: acc.expense + m.expense,
    salary: acc.salary + m.salary,
    net: acc.net + m.net,
  }), { income: 0, expense: 0, salary: 0, net: 0 });

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    cashData?.filter(t => t.transaction_type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount));
    });
    return Array.from(map, ([cat, amount]) => ({
      category: CASH_CATEGORIES.find(c => c.value === cat)?.label || cat,
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [cashData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label>Tahun:</Label>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Annual totals */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pemasukan</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Gaji</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.salary)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net (Bersih)</p>
            <p className={`text-xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly table */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Ringkasan Per Bulan</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Pemasukan</TableHead>
                  <TableHead className="text-right">Pengeluaran</TableHead>
                  <TableHead className="text-right">Gaji</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map(m => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right text-green-600">{m.income ? formatCurrency(m.income) : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{m.expense ? formatCurrency(m.expense) : '-'}</TableCell>
                    <TableCell className="text-right text-blue-600">{m.salary ? formatCurrency(m.salary) : '-'}</TableCell>
                    <TableCell className={`text-right font-bold ${m.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(m.income || m.expense || m.salary) ? formatCurrency(m.net) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(totals.income)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(totals.expense)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatCurrency(totals.salary)}</TableCell>
                  <TableCell className={`text-right ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.net)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader><CardTitle>Breakdown Pengeluaran</CardTitle></CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(cb => {
                  const pct = totals.expense > 0 ? (cb.amount / totals.expense) * 100 : 0;
                  return (
                    <div key={cb.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cb.category}</span>
                        <span className="font-medium">{formatCurrency(cb.amount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
