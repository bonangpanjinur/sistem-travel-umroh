import { useState, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileDown, Printer, Mail, X, CheckCircle2, Clock,
  AlertCircle, RefreshCw, TrendingUp, Users, CalendarX,
  BarChart3, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee { id: string; full_name: string; employee_code: string; position?: string; department?: string; join_date?: string }
interface OnboardingTask { id: string; employee_id: string; title: string; description?: string; category: string; due_date?: string; status: string; completed_at?: string; notes?: string; sort_order: number }

interface Props {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  allTasks: OnboardingTask[];
}

const CATEGORY_LABELS: Record<string, string> = {
  orientasi: "Orientasi", administrasi: "Administrasi",
  akses_sistem: "Akses Sistem", pelatihan: "Pelatihan", lainnya: "Lainnya",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Belum", in_progress: "Sedang", done: "Selesai", skipped: "Dilewati",
};

// jsPDF color helpers
const STATUS_COLORS: Record<string, [number, number, number]> = {
  done:        [34,  197, 94],
  in_progress: [59,  130, 246],
  pending:     [156, 163, 175],
  skipped:     [249, 115, 22],
};

function calcProgress(tasks: OnboardingTask[]) {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === "done" || t.status === "skipped").length;
  return Math.round((done / tasks.length) * 100);
}

function isOverdue(task: OnboardingTask) {
  return task.status === "pending" && task.due_date && new Date(task.due_date) < new Date();
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingReportDialog({ open, onClose, employees, allTasks }: Props) {
  const [deptFilter, setDeptFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailTo, setEmailTo]           = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [generating, setGenerating]     = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  const getTasksFor = (empId: string) =>
    allTasks.filter(t => t.employee_id === empId).sort((a, b) => a.sort_order - b.sort_order);

  const employeesWithTasks = employees.filter(e => getTasksFor(e.id).length > 0);

  // apply filters
  const filtered = employeesWithTasks.filter(e => {
    if (deptFilter !== "all" && e.department !== deptFilter) return false;
    if (statusFilter !== "all") {
      const p = calcProgress(getTasksFor(e.id));
      if (statusFilter === "completed"  && p !== 100)          return false;
      if (statusFilter === "in_progress"&& (p === 0 || p === 100)) return false;
      if (statusFilter === "not_started"&& p !== 0)             return false;
      if (statusFilter === "has_overdue"&& !getTasksFor(e.id).some(isOverdue)) return false;
    }
    return true;
  });

  // aggregate stats
  const totalTasks    = filtered.reduce((s, e) => s + getTasksFor(e.id).length, 0);
  const doneTasks     = filtered.reduce((s, e) => s + getTasksFor(e.id).filter(t => t.status === "done").length, 0);
  const overdueTasks  = filtered.reduce((s, e) => s + getTasksFor(e.id).filter(isOverdue).length, 0);
  const completedEmps = filtered.filter(e => calcProgress(getTasksFor(e.id)) === 100).length;
  const avgProgress   = filtered.length
    ? Math.round(filtered.reduce((s, e) => s + calcProgress(getTasksFor(e.id)), 0) / filtered.length)
    : 0;

  // ── PDF Generation ─────────────────────────────────────────────────────────
  const generatePDF = async (download = true) => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PAGE_W = 210;
      const MARGIN = 14;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

      // ── Cover header ────────────────────────────────────────────────────────
      doc.setFillColor(22, 101, 52); // green-800
      doc.rect(0, 0, PAGE_W, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Onboarding Karyawan", MARGIN, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Vinstour Travel Portal — Sistem Manajemen SDM", MARGIN, 23);
      doc.text(`Dicetak: ${today}`, MARGIN, 29);

      if (deptFilter !== "all") doc.text(`Departemen: ${deptFilter}`, PAGE_W - MARGIN - 60, 29);

      // ── Summary boxes ────────────────────────────────────────────────────────
      let y = 46;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan Eksekutif", MARGIN, y);
      y += 6;

      const boxW = (CONTENT_W - 6) / 4;
      const stats = [
        { label: "Total Karyawan",   val: `${filtered.length}`,   sub: "aktif onboarding", color: [59, 130, 246] as [number,number,number] },
        { label: "Rata-rata Progress",val: `${avgProgress}%`,    sub: "completion rate",   color: [34, 197, 94] as [number,number,number] },
        { label: "Sudah Selesai",    val: `${completedEmps}`,    sub: "karyawan",          color: [16, 185, 129] as [number,number,number] },
        { label: "Task Terlambat",   val: `${overdueTasks}`,     sub: "perlu perhatian",   color: overdueTasks > 0 ? [239, 68, 68] as [number,number,number] : [156, 163, 175] as [number,number,number] },
      ];

      stats.forEach((s, i) => {
        const bx = MARGIN + i * (boxW + 2);
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.roundedRect(bx, y, boxW, 18, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(s.val, bx + boxW / 2, y + 8, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(s.label, bx + boxW / 2, y + 13, { align: "center" });
        doc.text(s.sub,   bx + boxW / 2, y + 17, { align: "center" });
      });

      y += 24;

      // ── Overall progress bar ─────────────────────────────────────────────────
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Task selesai: ${doneTasks} dari ${totalTasks} total`, MARGIN, y);
      y += 4;

      // background bar
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(MARGIN, y, CONTENT_W, 5, 2, 2, "F");
      // filled portion
      if (totalTasks > 0) {
        const fillW = (doneTasks / totalTasks) * CONTENT_W;
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(MARGIN, y, fillW, 5, 2, 2, "F");
      }
      y += 10;

      // ── Per-employee table ───────────────────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Detail Progress Per Karyawan", MARGIN, y);
      y += 4;

      const tableRows: any[] = filtered.map(emp => {
        const tasks   = getTasksFor(emp.id);
        const done    = tasks.filter(t => t.status === "done").length;
        const overdue = tasks.filter(isOverdue).length;
        const pct     = calcProgress(tasks);
        return [
          `${emp.full_name}\n${emp.employee_code}`,
          emp.department ?? "-",
          emp.position   ?? "-",
          `${pct}%`,
          `${done}/${tasks.length}`,
          overdue > 0 ? `${overdue} terlambat` : "-",
          pct === 100 ? "Selesai" : pct > 0 ? "Proses" : "Belum",
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Karyawan", "Departemen", "Jabatan", "Progress", "Task Selesai", "Terlambat", "Status"]],
        body: tableRows,
        margin: { left: MARGIN, right: MARGIN },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 8, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 7.5, valign: "middle" },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 24, halign: "center" },
          6: { cellWidth: 22, halign: "center" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 6) {
            const v = data.cell.raw as string;
            if (v === "Selesai")  data.cell.styles.textColor = [22, 163, 74];
            if (v === "Proses")   data.cell.styles.textColor = [59, 130, 246];
            if (v === "Belum")    data.cell.styles.textColor = [107, 114, 128];
          }
          if (data.section === "body" && data.column.index === 5) {
            if ((data.cell.raw as string) !== "-") data.cell.styles.textColor = [220, 38, 38];
          }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      // ── Per-employee task detail (new page each) ─────────────────────────────
      filtered.forEach(emp => {
        const tasks = getTasksFor(emp.id);
        if (!tasks.length) return;

        doc.addPage();

        // employee header bar
        doc.setFillColor(241, 245, 249);
        doc.rect(0, 0, PAGE_W, 28, "F");
        doc.setFillColor(22, 101, 52);
        doc.rect(0, 0, 4, 28, "F");

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(emp.full_name, 10, 11);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const meta = [emp.employee_code, emp.department, emp.position].filter(Boolean).join(" · ");
        doc.text(meta, 10, 18);
        if (emp.join_date) doc.text(`Bergabung: ${fmtDate(emp.join_date)}`, 10, 24);

        // mini progress bar
        const pct = calcProgress(tasks);
        doc.setFillColor(229, 231, 235);
        doc.roundedRect(PAGE_W - MARGIN - 50, 6, 50, 5, 2, 2, "F");
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(PAGE_W - MARGIN - 50, 6, (pct / 100) * 50, 5, 2, 2, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${pct}%`, PAGE_W - MARGIN - 52, 12, { align: "right" });

        const taskRows = tasks.map(t => [
          t.title,
          CATEGORY_LABELS[t.category] ?? t.category,
          fmtDate(t.due_date),
          STATUS_LABELS[t.status] ?? t.status,
          fmtDate(t.completed_at),
          t.notes ?? "-",
        ]);

        autoTable(doc, {
          startY: 32,
          head: [["Task / Kegiatan", "Kategori", "Tenggat", "Status", "Selesai Pada", "Catatan"]],
          body: taskRows,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, fontStyle: "bold" },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 28 },
            2: { cellWidth: 22 },
            3: { cellWidth: 20, halign: "center", fontStyle: "bold" },
            4: { cellWidth: 28 },
            5: { cellWidth: 29 },
          },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.column.index === 3) {
              const v = data.cell.raw as string;
              if (v === "Selesai")  data.cell.styles.textColor = [22, 163, 74];
              if (v === "Sedang")   data.cell.styles.textColor = [59, 130, 246];
              if (v === "Belum")    data.cell.styles.textColor = [107, 114, 128];
              if (v === "Dilewati") data.cell.styles.textColor = [249, 115, 22];
            }
            // highlight overdue
            if (data.section === "body" && data.column.index === 2) {
              const taskIdx = data.row.index;
              if (taskIdx < tasks.length && isOverdue(tasks[taskIdx])) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
      });

      // ── Footer on all pages ───────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        doc.text("Vinstour Travel Portal — Laporan Onboarding Karyawan", MARGIN, 292);
        doc.text(`Halaman ${i} dari ${totalPages}`, PAGE_W - MARGIN, 292, { align: "right" });
        doc.text(today, PAGE_W / 2, 292, { align: "center" });
      }

      const filename = `Laporan_Onboarding_${new Date().toISOString().split("T")[0]}.pdf`;
      if (download) {
        doc.save(filename);
        toast.success("PDF berhasil diunduh!");
      } else {
        doc.autoPrint();
        doc.output("dataurlnewwindow");
      }
    } catch (e: any) {
      toast.error("Gagal membuat PDF: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Email summary ───────────────────────────────────────────────────────────
  const sendEmailSummary = () => {
    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const lines: string[] = [
      `LAPORAN ONBOARDING KARYAWAN — ${today}`,
      `Vinstour Travel Portal`,
      "",
      `RINGKASAN:`,
      `• Total karyawan aktif onboarding : ${filtered.length}`,
      `• Rata-rata progress              : ${avgProgress}%`,
      `• Sudah selesai 100%              : ${completedEmps} karyawan`,
      `• Task terlambat                  : ${overdueTasks} task`,
      `• Total task selesai              : ${doneTasks}/${totalTasks}`,
      "",
      `DETAIL PER KARYAWAN:`,
      ...filtered.map(emp => {
        const tasks   = getTasksFor(emp.id);
        const done    = tasks.filter(t => t.status === "done").length;
        const overdue = tasks.filter(isOverdue).length;
        const pct     = calcProgress(tasks);
        return `• ${emp.full_name} (${emp.employee_code}) — ${pct}% | ${done}/${tasks.length} task${overdue > 0 ? ` | ⚠ ${overdue} terlambat` : ""}`;
      }),
    ];

    if (overdueTasks > 0) {
      lines.push("", "TASK TERLAMBAT:");
      filtered.forEach(emp => {
        getTasksFor(emp.id).filter(isOverdue).forEach(t => {
          lines.push(`• [${emp.full_name}] ${t.title} — tenggat ${fmtDate(t.due_date)}`);
        });
      });
    }

    const subject = encodeURIComponent(`Laporan Onboarding Karyawan — ${today}`);
    const body    = encodeURIComponent(lines.join("\n"));
    const to      = emailTo ? encodeURIComponent(emailTo) : "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    toast.success("Draft email dibuka di klien email Anda");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Laporan Onboarding Karyawan
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pratinjau dan ekspor laporan — termasuk ringkasan, progress, dan task terlambat
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 -mt-1 -mr-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-3 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Departemen</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai 100%</SelectItem>
                <SelectItem value="in_progress">Sedang Proses</SelectItem>
                <SelectItem value="not_started">Belum Mulai</SelectItem>
                <SelectItem value="has_overdue">Ada Terlambat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Menampilkan {filtered.length} dari {employeesWithTasks.length} karyawan
          </span>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto px-6 py-4" ref={previewRef}>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Karyawan",    val: filtered.length,  icon: <Users className="h-4 w-4 text-blue-500" />,    color: "bg-blue-50 border-blue-100" },
              { label: "Avg Progress",      val: `${avgProgress}%`,icon: <TrendingUp className="h-4 w-4 text-green-500" />, color: "bg-green-50 border-green-100" },
              { label: "Sudah Selesai",     val: completedEmps,    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, color: "bg-emerald-50 border-emerald-100" },
              { label: "Task Terlambat",    val: overdueTasks,     icon: <CalendarX className="h-4 w-4 text-red-500" />, color: overdueTasks > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100" },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-3 flex items-center gap-3 ${s.color}`}>
                {s.icon}
                <div>
                  <div className="text-xl font-bold">{s.val}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall progress */}
          <div className="mb-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total task selesai</span>
              <span className="font-medium">{doneTasks} / {totalTasks}</span>
            </div>
            <Progress value={totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0} className="h-2" />
          </div>

          <Separator className="my-4" />

          {/* Employee list preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Progress Per Karyawan ({filtered.length})
            </h3>

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Tidak ada data yang sesuai filter
              </div>
            ) : (
              filtered.map(emp => {
                const tasks   = getTasksFor(emp.id);
                const done    = tasks.filter(t => t.status === "done").length;
                const overdue = tasks.filter(isOverdue).length;
                const pct     = calcProgress(tasks);

                return (
                  <div key={emp.id} className="rounded-md border bg-white p-3">
                    <div className="flex items-start gap-3">
                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{emp.full_name}</span>
                          <span className="text-xs text-muted-foreground">{emp.employee_code}</span>
                          {emp.department && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {emp.department}
                            </span>
                          )}
                          {overdue > 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />{overdue} terlambat
                            </span>
                          )}
                        </div>
                        {emp.position && <div className="text-xs text-muted-foreground mt-0.5">{emp.position}</div>}
                        <div className="flex items-center gap-3 mt-1.5">
                          <Progress value={pct} className="flex-1 h-1.5" />
                          <span className="text-xs font-medium w-20 text-right">
                            {done}/{tasks.length} task ({pct}%)
                          </span>
                        </div>
                      </div>
                      {/* Status badge */}
                      <div className="shrink-0">
                        {pct === 100
                          ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>
                          : pct > 0
                          ? <Badge className="bg-blue-100 text-blue-700 text-xs"><RefreshCw className="h-3 w-3 mr-1" />Proses</Badge>
                          : <Badge className="bg-gray-100 text-gray-600 text-xs"><Clock className="h-3 w-3 mr-1" />Belum</Badge>
                        }
                      </div>
                    </div>

                    {/* Overdue task list */}
                    {overdue > 0 && (
                      <div className="mt-2 pl-2 border-l-2 border-red-200 space-y-0.5">
                        {tasks.filter(isOverdue).map(t => (
                          <div key={t.id} className="text-xs text-red-600 flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{t.title}</span>
                            <span className="text-red-400">— tenggat {fmtDate(t.due_date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action footer */}
        <div className="px-6 py-3 border-t bg-muted/20 shrink-0 space-y-3">
          {/* Email input (collapsible) */}
          {showEmailInput && (
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Kirim ke email:</Label>
              <Input
                type="email"
                placeholder="hr@vinstour.com"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" className="h-8 text-xs" onClick={sendEmailSummary}>
                <Mail className="h-3.5 w-3.5 mr-1.5" /> Buka Email
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowEmailInput(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowEmailInput(v => !v)}>
              <Mail className="h-4 w-4 mr-1.5" /> Kirim via Email
            </Button>
            <Button variant="outline" size="sm" onClick={() => generatePDF(false)} disabled={generating || filtered.length === 0}>
              <Printer className="h-4 w-4 mr-1.5" />
              {generating ? "Menyiapkan..." : "Cetak"}
            </Button>
            <Button size="sm" onClick={() => generatePDF(true)} disabled={generating || filtered.length === 0}>
              <FileDown className="h-4 w-4 mr-1.5" />
              {generating ? "Membuat PDF..." : "Unduh PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
