import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Eye, Banknote, Users, TrendingUp, Search, FileText, Info, Plus, Edit, Trash2, PlusCircle, Gift } from "lucide-react";

const supabaseAny = supabase as any;
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const formatNum = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// ─── PPH21 Calculation (Indonesia 2024) ──────────────────────────────────────

const PTKP_ANNUAL = {
  "TK/0": 54_000_000,  // Tidak kawin, 0 tanggungan
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0":  58_500_000,  // Kawin, 0 tanggungan
  "K/1":  63_000_000,
  "K/2":  67_500_000,
  "K/3":  72_000_000,
};

type PTKPStatus = keyof typeof PTKP_ANNUAL;

/**
 * Hitung PPH21 bulanan menggunakan metode non-final (gross-up tidak diterapkan).
 * Menggunakan tarif PPH Pasal 17 UU HPP 2022 yang berlaku per 1 Januari 2022.
 */
function calculatePPH21Annual(pkp: number): number {
  let tax = 0;
  const brackets = [
    { limit: 60_000_000, rate: 0.05 },
    { limit: 250_000_000, rate: 0.15 },
    { limit: 500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];
  let remaining = Math.max(0, pkp);
  let prevLimit = 0;
  for (const { limit, rate } of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, limit - prevLimit);
    tax += taxable * rate;
    remaining -= taxable;
    prevLimit = limit;
  }
  return Math.round(tax);
}

interface PPH21Result {
  grossAnnual: number;
  bpjsKesEmpAnnual: number;
  jhtEmpAnnual: number;
  jpEmpAnnual: number;
  totalDeductionTax: number;
  netAnnual: number;
  ptkp: number;
  pkp: number;
  pph21Annual: number;
  pph21Monthly: number;
}

function calculatePPH21Monthly(
  grossMonthly: number,
  ptkpStatus: PTKPStatus = "TK/0"
): PPH21Result {
  const BPJS_KES_CAP = 12_000_000;
  const JP_CAP = 9_559_600;

  // BPJS yang menjadi pengurang penghasilan bruto (ditanggung karyawan)
  const bpjsKesEmp = Math.min(grossMonthly, BPJS_KES_CAP) * 0.01;
  const jhtEmp = grossMonthly * 0.02;
  const jpEmp = Math.min(grossMonthly, JP_CAP) * 0.01;

  const grossAnnual = grossMonthly * 12;
  const bpjsKesEmpAnnual = bpjsKesEmp * 12;
  const jhtEmpAnnual = jhtEmp * 12;
  const jpEmpAnnual = jpEmp * 12;

  const totalDeductionTax = bpjsKesEmpAnnual + jhtEmpAnnual + jpEmpAnnual;
  const netAnnual = grossAnnual - totalDeductionTax;
  const ptkp = PTKP_ANNUAL[ptkpStatus];
  const pkp = Math.max(0, Math.floor((netAnnual - ptkp) / 1000) * 1000); // dibulatkan ke ribuan bawah

  const pph21Annual = calculatePPH21Annual(pkp);
  const pph21Monthly = Math.round(pph21Annual / 12);

  return {
    grossAnnual, bpjsKesEmpAnnual, jhtEmpAnnual, jpEmpAnnual,
    totalDeductionTax, netAnnual, ptkp, pkp, pph21Annual, pph21Monthly,
  };
}

// ─── BPJS Full Calculation ────────────────────────────────────────────────────

interface BPJSResult {
  kesehatan: { employee: number; employer: number; total: number; base: number };
  jht: { employee: number; employer: number; total: number };
  jp: { employee: number; employer: number; total: number; base: number };
  jkk: { employer: number };
  jkm: { employer: number };
  totalEmployee: number;
  totalEmployer: number;
  grandTotal: number;
}

function calculateBPJS(grossMonthly: number): BPJSResult {
  const BPJS_KES_CAP = 12_000_000;
  const JP_CAP = 9_559_600;

  const kesBase = Math.min(grossMonthly, BPJS_KES_CAP);
  const jpBase = Math.min(grossMonthly, JP_CAP);

  const kesEmployee = Math.round(kesBase * 0.01);
  const kesEmployer = Math.round(kesBase * 0.04);

  const jhtEmployee = Math.round(grossMonthly * 0.02);
  const jhtEmployer = Math.round(grossMonthly * 0.037);

  const jpEmployee = Math.round(jpBase * 0.01);
  const jpEmployer = Math.round(jpBase * 0.02);

  const jkk = Math.round(grossMonthly * 0.0024);
  const jkm = Math.round(grossMonthly * 0.003);

  const totalEmployee = kesEmployee + jhtEmployee + jpEmployee;
  const totalEmployer = kesEmployer + jhtEmployer + jpEmployer + jkk + jkm;

  return {
    kesehatan: { employee: kesEmployee, employer: kesEmployer, total: kesEmployee + kesEmployer, base: kesBase },
    jht: { employee: jhtEmployee, employer: jhtEmployer, total: jhtEmployee + jhtEmployer },
    jp: { employee: jpEmployee, employer: jpEmployer, total: jpEmployee + jpEmployer, base: jpBase },
    jkk: { employer: jkk },
    jkm: { employer: jkm },
    totalEmployee,
    totalEmployer,
    grandTotal: totalEmployee + totalEmployer,
  };
}

// ─── PayrollData interface ───────────────────────────────────────────────────

interface PayrollData {
  employee_id: string;
  employee_code: string;
  full_name: string;
  position: string | null;
  salary: number;
  attendance_days: number;
  absent_days: number;
  late_count: number;
  deduction_attendance: number;
  bpjs_employee: number;
  pph21_monthly: number;
  total_deduction: number;
  net_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  status: "pending" | "processed" | "paid";
  ptkp_status: PTKPStatus;
  bpjs: BPJSResult;
  pph21: PPH21Result;
}

// ─── PDF Slip Generator ───────────────────────────────────────────────────────

function generatePayrollPDF(payroll: PayrollData, period: string, companyName = "Vinstour Travel") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 46, 31);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, W / 2, 11, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SLIP GAJI / PAYSLIP", W / 2, 18, { align: "center" });
  doc.text(`Periode: ${period}`, W / 2, 24, { align: "center" });

  // Employee info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  let y = 34;
  const col1 = 8, col2 = 50;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(label, col1, y);
    doc.setTextColor(0, 0, 0);
    doc.text(": " + value, col2, y);
    y += 5;
  };
  row("Nama Karyawan", payroll.full_name);
  row("Kode Karyawan", payroll.employee_code);
  row("Jabatan", payroll.position || "-");
  row("PTKP Status", payroll.ptkp_status);

  // Separator
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(8, y, W - 8, y);
  y += 5;

  // Pendapatan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PENDAPATAN", col1, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: 8, right: 8 },
    head: [["Komponen", "Jumlah"]],
    body: [
      ["Gaji Pokok", formatCurrency(payroll.salary)],
      ...(payroll.overtime_pay > 0
        ? [[`Uang Lembur (${payroll.overtime_hours} jam × 1,5×)`, formatCurrency(payroll.overtime_pay)]]
        : []),
    ],
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 80, 50], fontSize: 8, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    didParseCell(data) {
      if (data.section === "head") data.cell.styles.textColor = [255, 255, 255];
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Potongan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("POTONGAN", col1, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: 8, right: 8 },
    head: [["Jenis Potongan", "Jumlah"]],
    body: [
      ["Absensi & Keterlambatan", formatCurrency(payroll.deduction_attendance)],
      ["BPJS Kesehatan (1%)", formatCurrency(payroll.bpjs.kesehatan.employee)],
      ["BPJS JHT Karyawan (2%)", formatCurrency(payroll.bpjs.jht.employee)],
      ["BPJS JP Karyawan (1%)", formatCurrency(payroll.bpjs.jp.employee)],
      ["PPh 21", formatCurrency(payroll.pph21_monthly)],
    ],
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [150, 50, 30], fontSize: 8, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    didParseCell(data) {
      if (data.section === "head") data.cell.styles.textColor = [255, 255, 255];
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Total
  doc.setFillColor(240, 248, 243);
  doc.rect(8, y, W - 16, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 80, 40);
  doc.text("GAJI BERSIH (TAKE HOME PAY)", col1 + 2, y + 6.5);
  doc.text(formatCurrency(payroll.net_salary), W - 10, y + 6.5, { align: "right" });

  // BPJS Employer note
  y += 16;
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(
    `Iuran pemberi kerja (BPJS): Kes ${formatCurrency(payroll.bpjs.kesehatan.employer)} | JHT ${formatCurrency(payroll.bpjs.jht.employer)} | JP ${formatCurrency(payroll.bpjs.jp.employer)} | JKK ${formatCurrency(payroll.bpjs.jkk.employer)} | JKM ${formatCurrency(payroll.bpjs.jkm.employer)}`,
    8, y, { maxWidth: W - 16 }
  );

  // Footer
  y = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(200, 200, 200);
  doc.line(8, y - 3, W - 8, y - 3);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: localeId })} — Slip ini valid tanpa tanda tangan`, W / 2, y + 2, { align: "center" });

  return doc;
}

// ─── Component ───────────────────────────────────────────────────────────────

const COMP_TYPE_LABELS: Record<string, string> = {
  bonus: "Bonus", tunjangan: "Tunjangan", potongan: "Potongan",
};
const COMP_CALC_LABELS: Record<string, string> = {
  fixed: "Nominal Tetap", percentage: "% dari Gaji Pokok",
};

const EMPTY_COMP_FORM = {
  name: "", code: "", type: "tunjangan", calc_type: "fixed",
  default_amount: "", is_taxable: false, is_active: true, description: "",
};

const EMPTY_EMP_COMP_FORM = {
  employee_id: "", component_id: "", period: format(new Date(), "yyyy-MM"),
  amount: "", note: "",
};

export default function AdminPayroll() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);
  const [defaultPTKP, setDefaultPTKP] = useState<PTKPStatus>("TK/0");

  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compForm, setCompForm] = useState({ ...EMPTY_COMP_FORM });

  const [empCompDialogOpen, setEmpCompDialogOpen] = useState(false);
  const [empCompForm, setEmpCompForm] = useState({ ...EMPTY_EMP_COMP_FORM });
  const [empCompPeriod, setEmpCompPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [overtimeHours, setOvertimeHours] = useState<Record<string, number>>({});

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: payrollComponents = [] } = useQuery({
    queryKey: ["payroll-components"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("payroll_components")
        .select("*")
        .order("type")
        .order("name");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: empPayrollComponents = [] } = useQuery({
    queryKey: ["employee-payroll-components", empCompPeriod],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("employee_payroll_components")
        .select("*, employee:employees(full_name, employee_code), component:payroll_components(name, type, code)")
        .eq("period", empCompPeriod)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveCompMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: compForm.name,
        code: compForm.code.toUpperCase(),
        type: compForm.type,
        calc_type: compForm.calc_type,
        default_amount: parseFloat(compForm.default_amount) || 0,
        is_taxable: compForm.is_taxable,
        is_active: compForm.is_active,
        description: compForm.description || null,
        updated_at: new Date().toISOString(),
      };
      if (editingCompId) {
        const { error } = await supabaseAny.from("payroll_components").update(payload).eq("id", editingCompId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.from("payroll_components").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-components"] });
      setCompDialogOpen(false);
      setEditingCompId(null);
      setCompForm({ ...EMPTY_COMP_FORM });
      toast.success(editingCompId ? "Komponen diperbarui" : "Komponen baru ditambahkan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from("payroll_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-components"] });
      toast.success("Komponen dihapus");
    },
  });

  const saveEmpCompMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: empCompForm.employee_id,
        component_id: empCompForm.component_id,
        period: empCompForm.period,
        amount: parseFloat(empCompForm.amount) || 0,
        note: empCompForm.note || null,
      };
      const { error } = await supabaseAny
        .from("employee_payroll_components")
        .upsert(payload, { onConflict: "employee_id,component_id,period" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-payroll-components"] });
      setEmpCompDialogOpen(false);
      setEmpCompForm({ ...EMPTY_EMP_COMP_FORM });
      toast.success("Komponen karyawan disimpan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteEmpCompMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from("employee_payroll_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-payroll-components"] });
      toast.success("Dihapus");
    },
  });

  const openEditComp = (c: any) => {
    setEditingCompId(c.id);
    setCompForm({
      name: c.name, code: c.code, type: c.type, calc_type: c.calc_type,
      default_amount: c.default_amount?.toString() ?? "0",
      is_taxable: c.is_taxable, is_active: c.is_active, description: c.description || "",
    });
    setCompDialogOpen(true);
  };

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-records", selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate =
        month === "12"
          ? `${parseInt(year) + 1}-01-01`
          : `${year}-${String(parseInt(month) + 1).padStart(2, "0")}-01`;
      const { data, error } = await supabaseAny
        .from("attendance_records")
        .select("*")
        .gte("attendance_date", startDate)
        .lt("attendance_date", endDate);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Compute payroll data with PPH21 + BPJS
  const payrollData: PayrollData[] = (employees as any[]).map((emp: any) => {
    const empAttendance = (attendanceRecords as any[]).filter((a: any) => a.employee_id === emp.id);
    const workDays = 22;
    const attendanceDays = empAttendance.filter((a: any) => a.status === "present").length;
    const absentDays = workDays - attendanceDays;
    const lateCount = empAttendance.filter((a: any) => a.is_late).length;

    const baseSalary = emp.salary || 0;
    const dailyRate = baseSalary / workDays;

    // Potongan absensi/keterlambatan
    let deductionAttendance = 0;
    if (emp.use_custom_deduction && emp.custom_absent_deduction) {
      const d = emp.custom_absent_deduction_type === "percentage"
        ? (baseSalary * emp.custom_absent_deduction) / 100
        : emp.custom_absent_deduction;
      deductionAttendance += d * absentDays;
    } else {
      deductionAttendance += dailyRate * absentDays;
    }
    if (emp.use_custom_deduction && emp.custom_late_deduction) {
      const d = emp.custom_late_deduction_type === "percentage"
        ? (baseSalary * emp.custom_late_deduction) / 100
        : emp.custom_late_deduction;
      deductionAttendance += d * lateCount;
    } else {
      deductionAttendance += (dailyRate * 0.1) * lateCount;
    }

    const ptkpStatus = defaultPTKP;
    const bpjs = calculateBPJS(baseSalary);
    const pph21 = calculatePPH21Monthly(baseSalary, ptkpStatus);

    const empOvertimeHours = overtimeHours[emp.id] ?? 0;
    const overtimePay = Math.round((baseSalary / 173) * 1.5 * empOvertimeHours);

    const totalDeduction = Math.round(deductionAttendance) + bpjs.totalEmployee + pph21.pph21Monthly;
    const netSalary = baseSalary + overtimePay - totalDeduction;

    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      position: emp.position,
      salary: baseSalary,
      attendance_days: attendanceDays,
      absent_days: absentDays,
      late_count: lateCount,
      deduction_attendance: Math.round(deductionAttendance),
      bpjs_employee: bpjs.totalEmployee,
      pph21_monthly: pph21.pph21Monthly,
      total_deduction: totalDeduction,
      net_salary: Math.max(0, netSalary),
      overtime_hours: empOvertimeHours,
      overtime_pay: overtimePay,
      status: "pending",
      ptkp_status: ptkpStatus,
      bpjs,
      pph21,
    };
  });

  const filtered = payrollData.filter((p) => {
    const matchSearch =
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalGross = filtered.reduce((s, p) => s + p.salary, 0);
  const totalDeduction = filtered.reduce((s, p) => s + p.total_deduction, 0);
  const totalNet = filtered.reduce((s, p) => s + p.net_salary, 0);
  const totalPPH21 = filtered.reduce((s, p) => s + p.pph21_monthly, 0);
  const totalBPJS = filtered.reduce((s, p) => s + p.bpjs_employee, 0);

  const handleViewDetail = (payroll: PayrollData) => {
    setSelectedPayroll(payroll);
    setDetailDialogOpen(true);
  };

  const handleDownloadSlip = (payroll: PayrollData) => {
    const periodLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: localeId });
    const doc = generatePayrollPDF(payroll, periodLabel);
    doc.save(`slip-gaji-${payroll.employee_code}-${selectedMonth}.pdf`);
    toast.success(`Slip gaji ${payroll.full_name} berhasil diunduh`);
  };

  const handleDownloadAllSlips = () => {
    if (!filtered.length) { toast.error("Tidak ada data"); return; }
    const periodLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: localeId });
    filtered.forEach((p) => {
      const doc = generatePayrollPDF(p, periodLabel);
      doc.save(`slip-gaji-${p.employee_code}-${selectedMonth}.pdf`);
    });
    toast.success(`${filtered.length} slip gaji berhasil diunduh`);
  };

  const handleDownloadReport = () => {
    if (!filtered.length) { toast.error("Tidak ada data"); return; }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const periodLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: localeId });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`LAPORAN PENGGAJIAN — ${periodLabel.toUpperCase()}`, 14, 14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total karyawan: ${filtered.length}`, 14, 21);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 27,
      head: [["Kode", "Nama", "Jabatan", "PTKP", "Gaji Pokok", "Pot. Absen", "BPJS Kryw", "PPh 21", "Total Pot.", "Gaji Bersih", "BPJS Perush."]],
      body: filtered.map((p) => [
        p.employee_code,
        p.full_name,
        p.position || "-",
        p.ptkp_status,
        formatCurrency(p.salary),
        formatCurrency(p.deduction_attendance),
        formatCurrency(p.bpjs_employee),
        formatCurrency(p.pph21_monthly),
        formatCurrency(p.total_deduction),
        formatCurrency(p.net_salary),
        formatCurrency(p.bpjs.totalEmployer),
      ]),
      foot: [[
        "", "TOTAL", "", "",
        formatCurrency(totalGross),
        formatCurrency(filtered.reduce((s, p) => s + p.deduction_attendance, 0)),
        formatCurrency(totalBPJS),
        formatCurrency(totalPPH21),
        formatCurrency(totalDeduction),
        formatCurrency(totalNet),
        formatCurrency(filtered.reduce((s, p) => s + p.bpjs.totalEmployer, 0)),
      ]],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 46, 31], fontSize: 7.5, fontStyle: "bold", textColor: 255 },
      footStyles: { fillColor: [230, 245, 235], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 252, 250] },
      columnStyles: {
        4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" },
      },
    });

    doc.save(`laporan-penggajian-${selectedMonth}.pdf`);
    toast.success("Laporan penggajian berhasil diunduh");
  };

  const periodLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: localeId });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Penggajian / Payroll</h1>
          <p className="text-muted-foreground">Hitung slip gaji dengan PPh 21 & BPJS otomatis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/finance-cash?tab=salary")}>
            <Banknote className="h-4 w-4 mr-2" /> Slip di Keuangan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Banknote className="h-4 w-4" /> Ringkasan
          </TabsTrigger>
          <TabsTrigger value="slips" className="gap-2">
            <FileText className="h-4 w-4" /> Slip Gaji
          </TabsTrigger>
          <TabsTrigger value="bpjs" className="gap-2">
            <Users className="h-4 w-4" /> BPJS & PPh 21
          </TabsTrigger>
          <TabsTrigger value="komponen" className="gap-2">
            <Gift className="h-4 w-4" /> Komponen Dinamis
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Laporan PDF
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Periode</Label>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[200px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Default PTKP (Global)</Label>
              <Select value={defaultPTKP} onValueChange={(v) => setDefaultPTKP(v as PTKPStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PTKP_ANNUAL) as PTKPStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{k} — {formatCurrency(PTKP_ANNUAL[k])}/thn</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Karyawan</p><p className="text-2xl font-bold">{employees.length}</p></div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </CardContent></Card>
            <Card><CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Gaji Kotor</p><p className="text-2xl font-bold">{formatCurrency(totalGross)}</p></div>
              <Banknote className="h-8 w-8 text-green-500 opacity-50" />
            </CardContent></Card>
            <Card><CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Potongan</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(totalDeduction)}</p></div>
              <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
            </CardContent></Card>
            <Card><CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Take Home Pay</p><p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p></div>
              <Banknote className="h-8 w-8 text-green-500 opacity-50" />
            </CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">PPh 21 Bulan Ini</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalPPH21)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total PPh 21 semua karyawan (tarif progresif)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">BPJS Karyawan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalBPJS)}</p>
                <p className="text-xs text-muted-foreground mt-1">BPJS Kes + JHT + JP yang ditanggung karyawan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">BPJS Pemberi Kerja</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-teal-700">{formatCurrency(filtered.reduce((s, p) => s + p.bpjs.totalEmployer, 0))}</p>
                <p className="text-xs text-muted-foreground mt-1">BPJS Kes + JHT + JP + JKK + JKM oleh perusahaan</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Slips Tab ─── */}
        <TabsContent value="slips" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau kode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[200px]" />
            <Button variant="outline" onClick={handleDownloadAllSlips}>
              <Download className="h-4 w-4 mr-2" /> Semua Slip
            </Button>
          </div>

          {loadingEmployees ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Tidak ada data</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Gaji Kotor</TableHead>
                    <TableHead>Hadir / Absen</TableHead>
                    <TableHead className="text-orange-700">Lembur (jam)</TableHead>
                    <TableHead className="text-orange-700">Uang Lembur</TableHead>
                    <TableHead>BPJS Kryw</TableHead>
                    <TableHead>PPh 21</TableHead>
                    <TableHead>Pot. Total</TableHead>
                    <TableHead className="font-bold text-green-700">Take Home</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payroll) => (
                    <TableRow key={payroll.employee_id}>
                      <TableCell className="font-mono text-xs">{payroll.employee_code}</TableCell>
                      <TableCell className="font-medium">{payroll.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payroll.position || "-"}</TableCell>
                      <TableCell>{formatCurrency(payroll.salary)}</TableCell>
                      <TableCell className="text-sm">
                        <span className="text-green-700">{payroll.attendance_days}h</span>
                        {" / "}
                        <span className="text-red-600">{payroll.absent_days}h</span>
                        {payroll.late_count > 0 && <span className="text-orange-500 ml-1 text-xs">+{payroll.late_count}tlb</span>}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          step={0.5}
                          className="w-20 h-7 text-sm text-center"
                          value={overtimeHours[payroll.employee_id] ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setOvertimeHours(prev => ({ ...prev, [payroll.employee_id]: val }));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-orange-600 text-sm">
                        {payroll.overtime_pay > 0 ? formatCurrency(payroll.overtime_pay) : "—"}
                      </TableCell>
                      <TableCell className="text-purple-700">{formatCurrency(payroll.bpjs_employee)}</TableCell>
                      <TableCell className="text-blue-700">{formatCurrency(payroll.pph21_monthly)}</TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(payroll.total_deduction)}</TableCell>
                      <TableCell className="font-bold text-green-700">{formatCurrency(payroll.net_salary)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(payroll)} title="Lihat detail">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadSlip(payroll)} title="Download slip PDF">
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

        {/* ─── BPJS & PPh 21 Tab ─── */}
        <TabsContent value="bpjs" className="space-y-4">
          <div className="flex gap-3">
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[200px]" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekapitulasi BPJS & PPh 21 — {periodLabel}</CardTitle>
              <CardDescription>
                Berdasarkan tarif BPJS 2024: Kes Karyawan 1%, Kes Perusahaan 4% (maks. Rp 12jt),
                JHT Kryw 2%, JHT Perush 3,7%, JP Kryw 1%, JP Perush 2% (maks. Rp 9,56jt), JKK 0,24%, JKM 0,3%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Gaji</TableHead>
                    <TableHead className="text-right">Kes Kryw</TableHead>
                    <TableHead className="text-right">JHT Kryw</TableHead>
                    <TableHead className="text-right">JP Kryw</TableHead>
                    <TableHead className="text-right">Total BPJS Kryw</TableHead>
                    <TableHead className="text-right">Total BPJS Perush</TableHead>
                    <TableHead className="text-right">PKP/thn</TableHead>
                    <TableHead className="text-right">PPh21/bln</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.employee_id}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.salary)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.bpjs.kesehatan.employee)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.bpjs.jht.employee)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.bpjs.jp.employee)}</TableCell>
                      <TableCell className="text-right font-medium text-purple-700">{formatCurrency(p.bpjs.totalEmployee)}</TableCell>
                      <TableCell className="text-right font-medium text-teal-700">{formatCurrency(p.bpjs.totalEmployer)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.pph21.pkp)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-700">{formatCurrency(p.pph21_monthly)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Komponen Dinamis Tab ─── */}
        <TabsContent value="komponen" className="space-y-6">
          {/* Master Komponen */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Master Komponen Payroll</CardTitle>
                  <CardDescription>Definisi bonus, tunjangan, dan potongan yang dapat diterapkan ke karyawan</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingCompId(null); setCompForm({ ...EMPTY_COMP_FORM }); setCompDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Komponen Baru
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Komponen</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Cara Hitung</TableHead>
                    <TableHead className="text-right">Default</TableHead>
                    <TableHead>Kena Pajak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!payrollComponents.length ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        Belum ada komponen. Klik "+ Komponen Baru" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  ) : (payrollComponents as any[]).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.code}</TableCell>
                      <TableCell>
                        <Badge variant={c.type === "bonus" ? "default" : c.type === "tunjangan" ? "secondary" : "destructive"} className="text-xs">
                          {COMP_TYPE_LABELS[c.type] ?? c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{COMP_CALC_LABELS[c.calc_type] ?? c.calc_type}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.calc_type === "percentage"
                          ? `${c.default_amount}%`
                          : formatCurrency(c.default_amount)}
                      </TableCell>
                      <TableCell>
                        {c.is_taxable
                          ? <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">PPh 21</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? "secondary" : "outline"} className="text-xs">
                          {c.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditComp(c)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                            onClick={() => { if (confirm("Hapus komponen ini?")) deleteCompMutation.mutate(c.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Entri Per-Karyawan Per-Periode */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Entri Komponen per Karyawan</CardTitle>
                  <CardDescription>Assign bonus/tunjangan/potongan spesifik untuk karyawan di periode tertentu</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="month"
                    value={empCompPeriod}
                    onChange={e => setEmpCompPeriod(e.target.value)}
                    className="w-40"
                  />
                  <Button size="sm" onClick={() => {
                    setEmpCompForm({ ...EMPTY_EMP_COMP_FORM, period: empCompPeriod });
                    setEmpCompDialogOpen(true);
                  }}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Tambah Entri
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Komponen</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!(empPayrollComponents as any[]).length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Belum ada entri komponen untuk periode {empCompPeriod}
                      </TableCell>
                    </TableRow>
                  ) : (empPayrollComponents as any[]).map((ec) => (
                    <TableRow key={ec.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{ec.employee?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{ec.employee?.employee_code}</p>
                      </TableCell>
                      <TableCell className="text-sm">{ec.component?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ec.component?.type === "potongan" ? "destructive" : "secondary"} className="text-xs">
                          {COMP_TYPE_LABELS[ec.component?.type] ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(ec.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{ec.note || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                          onClick={() => deleteEmpCompMutation.mutate(ec.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Reports Tab ─── */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Penggajian Bulanan</CardTitle>
              <CardDescription>Unduh laporan penggajian lengkap dalam format PDF termasuk BPJS dan PPh 21.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pilih Bulan</Label>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[200px]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleDownloadReport} className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 mr-2" />
                  Unduh Laporan PDF (Landscape)
                </Button>
                <Button variant="outline" onClick={handleDownloadAllSlips} className="flex-1 sm:flex-none">
                  <FileText className="h-4 w-4 mr-2" />
                  Unduh Semua Slip Gaji ({filtered.length} karyawan)
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg text-sm space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground flex items-center gap-1.5"><Info className="h-4 w-4" /> Komponen Perhitungan</p>
                <p>• <strong>PPh 21</strong>: Tarif progresif UU HPP 2022 (5–35%) dikurangi PTKP {defaultPTKP} = Rp {formatNum(PTKP_ANNUAL[defaultPTKP])}/thn</p>
                <p>• <strong>BPJS Kesehatan</strong>: 1% karyawan + 4% perusahaan (maks. gaji Rp 12jt/bln)</p>
                <p>• <strong>BPJS JHT</strong>: 2% karyawan + 3,7% perusahaan</p>
                <p>• <strong>BPJS JP</strong>: 1% karyawan + 2% perusahaan (maks. gaji Rp 9.559.600/bln)</p>
                <p>• <strong>BPJS JKK + JKM</strong>: 0,24% + 0,3% (ditanggung perusahaan)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Master Komponen Dialog ─── */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompId ? "Edit Komponen" : "Komponen Payroll Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Komponen *</Label>
                <Input value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} placeholder="Tunjangan Makan" />
              </div>
              <div>
                <Label>Kode *</Label>
                <Input value={compForm.code} onChange={e => setCompForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TUN_MAKAN" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select value={compForm.type} onValueChange={v => setCompForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunjangan">Tunjangan</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="potongan">Potongan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cara Hitung</Label>
                <Select value={compForm.calc_type} onValueChange={v => setCompForm(f => ({ ...f, calc_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                    <SelectItem value="percentage">% dari Gaji Pokok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nilai Default {compForm.calc_type === "percentage" ? "(%)" : "(Rp)"}</Label>
              <Input
                type="number"
                value={compForm.default_amount}
                onChange={e => setCompForm(f => ({ ...f, default_amount: e.target.value }))}
                placeholder={compForm.calc_type === "percentage" ? "10" : "500000"}
              />
            </div>
            <div>
              <Label>Keterangan</Label>
              <Textarea value={compForm.description} onChange={e => setCompForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={compForm.is_taxable} onCheckedChange={v => setCompForm(f => ({ ...f, is_taxable: v }))} />
                <Label>Kena PPh 21</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={compForm.is_active} onCheckedChange={v => setCompForm(f => ({ ...f, is_active: v }))} />
                <Label>Aktif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveCompMutation.mutate()} disabled={saveCompMutation.isPending || !compForm.name || !compForm.code}>
              {saveCompMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Entri Karyawan Dialog ─── */}
      <Dialog open={empCompDialogOpen} onOpenChange={setEmpCompDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Komponen Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Karyawan *</Label>
              <Select value={empCompForm.employee_id} onValueChange={v => setEmpCompForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                <SelectContent>
                  {(employees as any[]).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Komponen *</Label>
              <Select value={empCompForm.component_id} onValueChange={v => {
                const comp = (payrollComponents as any[]).find((c: any) => c.id === v);
                setEmpCompForm(f => ({
                  ...f,
                  component_id: v,
                  amount: comp?.default_amount?.toString() ?? f.amount,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Pilih komponen..." /></SelectTrigger>
                <SelectContent>
                  {(payrollComponents as any[]).filter((c: any) => c.is_active).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({COMP_TYPE_LABELS[c.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Periode *</Label>
                <Input type="month" value={empCompForm.period} onChange={e => setEmpCompForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <Label>Nominal (Rp) *</Label>
                <Input type="number" value={empCompForm.amount} onChange={e => setEmpCompForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={empCompForm.note} onChange={e => setEmpCompForm(f => ({ ...f, note: e.target.value }))} placeholder="Keterangan opsional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpCompDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveEmpCompMutation.mutate()}
              disabled={saveEmpCompMutation.isPending || !empCompForm.employee_id || !empCompForm.component_id}
            >
              {saveEmpCompMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji — {selectedPayroll?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Kode Karyawan</p><p className="font-medium">{selectedPayroll.employee_code}</p></div>
                <div><p className="text-xs text-muted-foreground">Jabatan</p><p className="font-medium">{selectedPayroll.position || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">PTKP Status</p><p className="font-medium">{selectedPayroll.ptkp_status}</p></div>
                <div><p className="text-xs text-muted-foreground">Periode</p><p className="font-medium">{periodLabel}</p></div>
                <div><p className="text-xs text-muted-foreground">Hari Hadir</p><p className="font-medium text-green-700">{selectedPayroll.attendance_days} hari</p></div>
                <div><p className="text-xs text-muted-foreground">Hari Absen</p><p className="font-medium text-red-600">{selectedPayroll.absent_days} hari</p></div>
              </div>

              <Separator />
              <div className="space-y-1.5">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Pendapatan</p>
                <div className="flex justify-between"><span>Gaji Pokok</span><span className="font-medium">{formatCurrency(selectedPayroll.salary)}</span></div>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Potongan Karyawan</p>
                <div className="flex justify-between text-orange-700"><span>Absensi & Keterlambatan</span><span>-{formatCurrency(selectedPayroll.deduction_attendance)}</span></div>
                <div className="flex justify-between text-purple-700"><span>BPJS Kesehatan (1%, maks. Rp 12jt)</span><span>-{formatCurrency(selectedPayroll.bpjs.kesehatan.employee)}</span></div>
                <div className="flex justify-between text-purple-700"><span>BPJS JHT Karyawan (2%)</span><span>-{formatCurrency(selectedPayroll.bpjs.jht.employee)}</span></div>
                <div className="flex justify-between text-purple-700"><span>BPJS JP Karyawan (1%, maks. Rp 9.56jt)</span><span>-{formatCurrency(selectedPayroll.bpjs.jp.employee)}</span></div>
                <div className="flex justify-between text-blue-700"><span>PPh 21 Bulanan (PKP: {formatCurrency(selectedPayroll.pph21.pkp)}/thn)</span><span>-{formatCurrency(selectedPayroll.pph21_monthly)}</span></div>
              </div>

              <div className="flex justify-between font-bold text-base border-t pt-3 text-green-700">
                <span>Take Home Pay</span>
                <span>{formatCurrency(selectedPayroll.net_salary)}</span>
              </div>

              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-0.5">
                <p className="font-semibold text-foreground mb-1">Beban Perusahaan (tidak dipotong dari gaji)</p>
                <div className="flex justify-between"><span>BPJS Kesehatan Perusahaan (4%)</span><span>{formatCurrency(selectedPayroll.bpjs.kesehatan.employer)}</span></div>
                <div className="flex justify-between"><span>BPJS JHT Perusahaan (3.7%)</span><span>{formatCurrency(selectedPayroll.bpjs.jht.employer)}</span></div>
                <div className="flex justify-between"><span>BPJS JP Perusahaan (2%)</span><span>{formatCurrency(selectedPayroll.bpjs.jp.employer)}</span></div>
                <div className="flex justify-between"><span>BPJS JKK (0.24%)</span><span>{formatCurrency(selectedPayroll.bpjs.jkk.employer)}</span></div>
                <div className="flex justify-between"><span>BPJS JKM (0.3%)</span><span>{formatCurrency(selectedPayroll.bpjs.jkm.employer)}</span></div>
                <div className="flex justify-between font-semibold text-foreground border-t pt-1 mt-1"><span>Total Beban Perusahaan</span><span>{formatCurrency(selectedPayroll.bpjs.totalEmployer)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Tutup</Button>
            {selectedPayroll && (
              <Button onClick={() => handleDownloadSlip(selectedPayroll)}>
                <Download className="h-4 w-4 mr-2" />Unduh Slip PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
