/**
 * AdminLaporanCabang — INT-16
 * Laporan Keuangan per Cabang (Multi-Branch)
 * Filter semua laporan per branch_id + konsolidasi untuk owner.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase = supabaseRaw as any;

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, TrendingUp, TrendingDown, DollarSign, ArrowDownToLine,
  ArrowUpFromLine, RefreshCw, Layers, AlertTriangle, CheckCircle2,
  Download, FileSpreadsheet, FileText, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy", { locale: localeId }), value: format(d, "yyyy-MM") };
});

// ── Export Functions ───────────────────────────────────────────────────────────

interface KonsolRow {
  branchId: string;
  branchName: string;
  city?: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  marginPct: number | null;
  arTotal: number;
  apTotal: number;
}

interface ExportData {
  branchLabel: string;
  period: string;
  dateFrom: string;
  dateTo: string;
  // Laba Rugi
  revenue: number;
  expenseByCategory: Record<string, number>;
  totalExpense: number;
  netProfit: number;
  marginPct: number | null;
  // Arus Kas
  inByCategory: Record<string, number>;
  outByCategory: Record<string, number>;
  totalIn: number;
  totalOut: number;
  netCash: number;
  // AR
  arData: any[];
  totalAR: number;
  // AP
  apData: any[];
  totalAP: number;
  // Konsolidasi (only when isConsolidation)
  konsolidasiRows?: KonsolRow[];
}

function buildPDF(d: ExportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  const generatedAt = format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId });

  // ── Cover header ──────────────────────────────────────────────────────────
  doc.setFillColor(16, 100, 73);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN KEUANGAN PER CABANG", pageW / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Cabang: ${d.branchLabel}  |  Periode: ${d.period}`, pageW / 2, 20, { align: "center" });
  doc.text(`Dibuat: ${generatedAt}`, pageW / 2, 26, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let y = 38;

  const sectionTitle = (title: string) => {
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  // ── KPI Summary ────────────────────────────────────────────────────────────
  sectionTitle("Ringkasan KPI");
  const kpiRows = [
    ["Pendapatan (Revenue)", fmt(d.revenue)],
    ["Total Biaya", fmt(d.totalExpense)],
    ["Laba / (Rugi) Bersih", (d.netProfit < 0 ? `(${fmt(Math.abs(d.netProfit))})` : fmt(d.netProfit))],
    ["Margin Bersih", d.marginPct != null ? `${d.marginPct.toFixed(1)}%` : "—"],
    ["Total Arus Kas Masuk", fmt(d.totalIn)],
    ["Total Arus Kas Keluar", fmt(d.totalOut)],
    ["Net Arus Kas", (d.netCash < 0 ? `(${fmt(Math.abs(d.netCash))})` : fmt(d.netCash))],
    ["Total Piutang (AR)", fmt(d.totalAR)],
    ["Total Hutang (AP)", fmt(d.totalAP)],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Indikator", "Nilai"]],
    body: kpiRows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 100, 73], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Laba Rugi ──────────────────────────────────────────────────────────────
  sectionTitle("A. Laporan Laba Rugi");
  const plRows: any[] = [
    [{ content: "PENDAPATAN", colSpan: 2, styles: { fillColor: [236, 253, 245], fontStyle: "bold" } }],
    ["  Pembayaran Jamaah (Lunas)", fmt(d.revenue)],
    [{ content: "BEBAN OPERASIONAL", colSpan: 2, styles: { fillColor: [254, 242, 242], fontStyle: "bold" } }],
    ...Object.entries(d.expenseByCategory).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`  ${cat}`, `(${fmt(amt)})`]),
    [{ content: `Total Beban`, styles: { fontStyle: "bold" } }, { content: `(${fmt(d.totalExpense)})`, styles: { fontStyle: "bold", halign: "right" } }],
    [{ content: "LABA / (RUGI) BERSIH", styles: { fontStyle: "bold", fontSize: 9, fillColor: d.netProfit >= 0 ? [236, 253, 245] : [254, 242, 242] } }, { content: d.netProfit < 0 ? `(${fmt(Math.abs(d.netProfit))})` : fmt(d.netProfit), styles: { fontStyle: "bold", halign: "right", textColor: d.netProfit >= 0 ? [4, 120, 87] : [185, 28, 28] } }],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: plRows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Arus Kas ───────────────────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }
  sectionTitle("B. Laporan Arus Kas");
  const kasRows: any[] = [
    [{ content: "KAS MASUK", colSpan: 2, styles: { fillColor: [236, 253, 245], fontStyle: "bold" } }],
    ...Object.entries(d.inByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`  ${cat}`, fmt(amt)]),
    [{ content: "Total Kas Masuk", styles: { fontStyle: "bold" } }, { content: fmt(d.totalIn), styles: { fontStyle: "bold", halign: "right", textColor: [4, 120, 87] } }],
    [{ content: "KAS KELUAR", colSpan: 2, styles: { fillColor: [254, 242, 242], fontStyle: "bold" } }],
    ...Object.entries(d.outByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`  ${cat}`, `(${fmt(amt)})`]),
    [{ content: "Total Kas Keluar", styles: { fontStyle: "bold" } }, { content: `(${fmt(d.totalOut)})`, styles: { fontStyle: "bold", halign: "right", textColor: [185, 28, 28] } }],
    [{ content: "NET ARUS KAS", styles: { fontStyle: "bold", fillColor: d.netCash >= 0 ? [236, 253, 245] : [254, 242, 242] } }, { content: d.netCash < 0 ? `(${fmt(Math.abs(d.netCash))})` : fmt(d.netCash), styles: { fontStyle: "bold", halign: "right", textColor: d.netCash >= 0 ? [4, 120, 87] : [185, 28, 28] } }],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: kasRows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── AR ─────────────────────────────────────────────────────────────────────
  if (y > 200 || d.arData.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    sectionTitle("C. Piutang (AR) — Booking Belum Lunas");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Kode Booking", "Jamaah", "Total Tagihan", "Terbayar", "Sisa Piutang", "Status"]],
      body: d.arData.length === 0
        ? [["—", "Tidak ada piutang", "—", "—", "—", "—"]]
        : d.arData.map((b: any) => [
            b.booking_code || b.id?.slice(0, 8) || "—",
            b.jamaah?.full_name || "—",
            fmt(Number(b.total_price) || 0),
            fmt(Number(b.paid_amount) || 0),
            fmt(b.remaining),
            b.booking_status === "confirmed" ? "Terkonfirmasi" : "Menunggu",
          ]),
      foot: d.arData.length > 0 ? [["", `Total (${d.arData.length} booking)`, "", "", fmt(d.totalAR), ""]] : [],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [16, 100, 73], textColor: 255 },
      footStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", textColor: [185, 28, 28] } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── AP ─────────────────────────────────────────────────────────────────────
  if (y > 200) { doc.addPage(); y = 20; }
  sectionTitle("D. Hutang Dagang (AP)");
  const today = new Date().toISOString().split("T")[0];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Vendor", "Tipe", "Jumlah", "Jatuh Tempo", "Status"]],
    body: d.apData.length === 0
      ? [["—", "Tidak ada hutang dagang", "—", "—", "—"]]
      : d.apData.map((v: any) => [
          v.vendor_name || "—",
          v.cost_type || "—",
          fmt(Number(v.amount) || 0),
          v.due_date ? new Date(v.due_date).toLocaleDateString("id-ID") : "—",
          v.status === "pending" ? "Belum Bayar" : "Sebagian",
        ]),
    foot: d.apData.length > 0 ? [[`Total (${d.apData.length} item)`, "", fmt(d.totalAP), "", ""]] : [],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [16, 100, 73], textColor: 255 },
    footStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" } },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body" && hookData.row.raw) {
        const v = d.apData[hookData.row.index];
        if (v?.due_date && v.due_date < today) {
          hookData.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  // ── Konsolidasi Semua Cabang (hanya jika ada data) ────────────────────────
  if (d.konsolidasiRows && d.konsolidasiRows.length > 0) {
    if (y > 190) { doc.addPage(); y = 20; }
    sectionTitle("E. Konsolidasi Semua Cabang");
    const rows = d.konsolidasiRows;
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Cabang", "Kota", "Revenue", "Biaya", "Laba Bersih", "Margin", "Kontrib.", "AR", "AP"]],
      body: rows.map(r => [
        r.branchName,
        r.city || "—",
        fmt(r.revenue),
        fmt(r.expenses),
        r.netProfit < 0 ? `(${fmt(Math.abs(r.netProfit))})` : fmt(r.netProfit),
        r.marginPct != null ? `${r.marginPct.toFixed(1)}%` : "—",
        totalRev > 0 ? `${(r.revenue / totalRev * 100).toFixed(0)}%` : "—",
        fmt(r.arTotal),
        fmt(r.apTotal),
      ]),
      foot: [[
        `Total (${rows.length} cabang)`, "",
        fmt(rows.reduce((s,r)=>s+r.revenue,0)),
        fmt(rows.reduce((s,r)=>s+r.expenses,0)),
        fmt(rows.reduce((s,r)=>s+r.netProfit,0)),
        totalRev > 0 ? `${(rows.reduce((s,r)=>s+r.netProfit,0)/totalRev*100).toFixed(1)}%` : "—",
        "100%",
        fmt(rows.reduce((s,r)=>s+r.arTotal,0)),
        fmt(rows.reduce((s,r)=>s+r.apTotal,0)),
      ]],
      styles: { fontSize: 6.5, cellPadding: 1.8 },
      headStyles: { fillColor: [16, 100, 73], textColor: 255, fontStyle: "bold", fontSize: 7 },
      footStyles: { fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        2: { halign: "right" }, 3: { halign: "right" },
        4: { halign: "right" }, 5: { halign: "center" },
        6: { halign: "center" }, 7: { halign: "right" },
        8: { halign: "right" },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 4) {
          const r = rows[hookData.row.index];
          if (r?.netProfit < 0) hookData.cell.styles.textColor = [185, 28, 28];
          else hookData.cell.styles.textColor = [4, 120, 87];
        }
      },
    });
  }

  // ── Footer on all pages ────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Halaman ${i} dari ${totalPages}  |  Vinstour Portal — Laporan Keuangan Per Cabang  |  ${generatedAt}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    doc.setTextColor(0);
  }

  const filename = `Laporan_Cabang_${d.branchLabel.replace(/\s+/g, "_")}_${d.period}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
  doc.save(filename);
}

function buildExcel(d: ExportData): void {
  const wb = XLSX.utils.book_new();
  const fmtNum = (n: number) => Math.round(n);
  const periodLabel = d.period;

  // ── Sheet 1: Laba Rugi ────────────────────────────────────────────────────
  const plRows: any[][] = [
    [`LAPORAN LABA RUGI — ${d.branchLabel.toUpperCase()}`, "", ""],
    [`Periode: ${periodLabel}`, "", ""],
    [],
    ["KETERANGAN", "JUMLAH (IDR)", ""],
    ["A. PENDAPATAN", "", ""],
    ["   Pembayaran Jamaah (Lunas)", fmtNum(d.revenue), ""],
    ["   TOTAL PENDAPATAN", fmtNum(d.revenue), ""],
    [],
    ["B. BEBAN OPERASIONAL", "", ""],
    ...Object.entries(d.expenseByCategory).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`   ${cat}`, fmtNum(amt), ""]),
    ["   TOTAL BEBAN", fmtNum(d.totalExpense), ""],
    [],
    ["LABA / (RUGI) BERSIH", fmtNum(d.netProfit), ""],
    ["Margin Bersih (%)", d.marginPct != null ? `${d.marginPct.toFixed(1)}%` : "—", ""],
  ];
  const wsPL = XLSX.utils.aoa_to_sheet(plRows);
  wsPL["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsPL, "Laba Rugi");

  // ── Sheet 2: Arus Kas ─────────────────────────────────────────────────────
  const kasRows: any[][] = [
    [`LAPORAN ARUS KAS — ${d.branchLabel.toUpperCase()}`, "", ""],
    [`Periode: ${periodLabel}`, "", ""],
    [],
    ["KETERANGAN", "JUMLAH (IDR)", ""],
    ["A. KAS MASUK", "", ""],
    ...Object.entries(d.inByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`   ${cat}`, fmtNum(amt), ""]),
    ["   TOTAL KAS MASUK", fmtNum(d.totalIn), ""],
    [],
    ["B. KAS KELUAR", "", ""],
    ...Object.entries(d.outByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => [`   ${cat}`, fmtNum(amt), ""]),
    ["   TOTAL KAS KELUAR", fmtNum(d.totalOut), ""],
    [],
    ["NET ARUS KAS", fmtNum(d.netCash), ""],
  ];
  const wsKas = XLSX.utils.aoa_to_sheet(kasRows);
  wsKas["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsKas, "Arus Kas");

  // ── Sheet 3: AR ───────────────────────────────────────────────────────────
  const arHeader = ["Kode Booking", "Jamaah", "Total Tagihan (IDR)", "Terbayar (IDR)", "Sisa Piutang (IDR)", "Status"];
  const arBody = d.arData.map((b: any) => [
    b.booking_code || b.id?.slice(0, 8) || "—",
    b.jamaah?.full_name || "—",
    fmtNum(Number(b.total_price) || 0),
    fmtNum(Number(b.paid_amount) || 0),
    fmtNum(b.remaining),
    b.booking_status === "confirmed" ? "Terkonfirmasi" : "Menunggu",
  ]);
  const wsAR = XLSX.utils.aoa_to_sheet([
    [`PIUTANG (AR) — ${d.branchLabel.toUpperCase()}`],
    [`Per Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: localeId })}`],
    [],
    arHeader,
    ...arBody,
    [],
    ["", "", "", `TOTAL AR (${d.arData.length} booking)`, fmtNum(d.totalAR), ""],
  ]);
  wsAR["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsAR, "Piutang (AR)");

  // ── Sheet 4: AP ───────────────────────────────────────────────────────────
  const apHeader = ["Vendor", "Tipe Biaya", "Jumlah (IDR)", "Jatuh Tempo", "Status"];
  const apBody = d.apData.map((v: any) => [
    v.vendor_name || "—",
    v.cost_type || "—",
    fmtNum(Number(v.amount) || 0),
    v.due_date ? new Date(v.due_date).toLocaleDateString("id-ID") : "—",
    v.status === "pending" ? "Belum Bayar" : "Sebagian",
  ]);
  const wsAP = XLSX.utils.aoa_to_sheet([
    [`HUTANG DAGANG (AP) — ${d.branchLabel.toUpperCase()}`],
    [`Per Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: localeId })}`],
    [],
    apHeader,
    ...apBody,
    [],
    [`TOTAL AP (${d.apData.length} item)`, "", fmtNum(d.totalAP), "", ""],
  ]);
  wsAP["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsAP, "Hutang (AP)");

  // ── Sheet 5: Konsolidasi (hanya saat mode Semua Cabang) ──────────────────
  if (d.konsolidasiRows && d.konsolidasiRows.length > 0) {
    const rows = d.konsolidasiRows;
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    const totalExp = rows.reduce((s, r) => s + r.expenses, 0);
    const totalNet = rows.reduce((s, r) => s + r.netProfit, 0);
    const totalAR  = rows.reduce((s, r) => s + r.arTotal, 0);
    const totalAP  = rows.reduce((s, r) => s + r.apTotal, 0);

    const header = [
      "Cabang", "Kota",
      "Revenue (IDR)", "Biaya (IDR)", "Laba Bersih (IDR)",
      "Margin (%)", "Kontribusi Rev (%)",
      "Piutang AR (IDR)", "Hutang AP (IDR)",
    ];
    const body = rows.map(r => {
      const pct = totalRev > 0 ? ((r.revenue / totalRev) * 100).toFixed(1) + "%" : "—";
      return [
        r.branchName,
        r.city || "—",
        fmtNum(r.revenue),
        fmtNum(r.expenses),
        fmtNum(r.netProfit),
        r.marginPct != null ? r.marginPct.toFixed(1) + "%" : "—",
        pct,
        fmtNum(r.arTotal),
        fmtNum(r.apTotal),
      ];
    });
    const footer = [
      `TOTAL (${rows.length} cabang)`, "",
      fmtNum(totalRev), fmtNum(totalExp), fmtNum(totalNet),
      totalRev > 0 ? (totalNet / totalRev * 100).toFixed(1) + "%" : "—",
      "100%",
      fmtNum(totalAR), fmtNum(totalAP),
    ];

    const wsKonsol = XLSX.utils.aoa_to_sheet([
      [`KONSOLIDASI SEMUA CABANG — PERBANDINGAN KEUANGAN`],
      [`Periode: ${d.period}  |  Dibuat: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })}`],
      [],
      header,
      ...body,
      [],
      footer,
    ]);
    wsKonsol["!cols"] = [
      { wch: 28 }, { wch: 16 },
      { wch: 22 }, { wch: 22 }, { wch: 22 },
      { wch: 12 }, { wch: 20 },
      { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsKonsol, "Konsolidasi Cabang");
  }

  const filename = `Laporan_Cabang_${d.branchLabel.replace(/\s+/g, "_")}_${d.period}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  city?: string;
  province?: string;
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-28 mt-1" />
        ) : (
          <>
            <p className={cn("text-2xl font-extrabold tabular-nums mt-0.5", color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Laba Rugi per Cabang ────────────────────────────────────────────────────────

function TabLabaRugi({ branchId, dateFrom, dateTo, isConsolidation }: {
  branchId: string; dateFrom: string; dateTo: string; isConsolidation: boolean;
}) {
  const [periodYear, periodMonth] = dateFrom.split("-").map(Number);

  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey: ["cabang-bookings", branchId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("total_price, booking_status, branch_id")
        .in("booking_status", ["confirmed", "completed"]);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: payments = [], isLoading: l2 } = useQuery({
    queryKey: ["cabang-payments", branchId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date, booking_id, bookings(branch_id)")
        .eq("status", "verified")
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo);
      if (!data) return [];
      if (isConsolidation) return data;
      return data.filter((p: any) => p.bookings?.branch_id === branchId);
    },
  });

  const { data: expenses = [], isLoading: l3 } = useQuery({
    queryKey: ["cabang-expenses", branchId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("amount, category, expense_date, branch_id")
        .gte("expense_date", dateFrom)
        .lte("expense_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: cashOut = [], isLoading: l4 } = useQuery({
    queryKey: ["cabang-cash-out", branchId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("cash_transactions")
        .select("amount, category, branch_id, transaction_date")
        .eq("type", "out")
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: payroll = [], isLoading: l5 } = useQuery({
    queryKey: ["cabang-payroll", branchId, periodYear, periodMonth],
    queryFn: async () => {
      let q = supabase
        .from("payroll_records")
        .select("net_salary, branch_id, status")
        .eq("period_year", periodYear)
        .eq("period_month", periodMonth)
        .eq("status", "paid");
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const revenue = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const expenseTotal = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const cashOutTotal = cashOut
    .filter((c: any) => c.category !== "salary")
    .reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const sdmCost = payroll.reduce((s: number, p: any) => s + (Number(p.net_salary) || 0), 0);
  const totalExpense = expenseTotal + cashOutTotal + sdmCost;
  const netProfit = revenue - totalExpense;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : null;

  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => {
    expenseByCategory[e.category || "Lainnya"] = (expenseByCategory[e.category || "Lainnya"] || 0) + (Number(e.amount) || 0);
  });
  cashOut.filter((c: any) => c.category !== "salary").forEach((c: any) => {
    const cat = `Ops: ${c.category || "Lainnya"}`;
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(c.amount) || 0);
  });
  if (sdmCost > 0) expenseByCategory["Biaya SDM (Payroll)"] = sdmCost;

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-5 p-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="Pendapatan" value={`Rp ${fmtShort(revenue)}`} color="text-emerald-600" />
        <KpiCard icon={TrendingDown} label="Total Biaya" value={`Rp ${fmtShort(totalExpense)}`} color="text-red-500" />
        <KpiCard
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          label="Laba Bersih"
          value={`Rp ${fmtShort(Math.abs(netProfit))}`}
          color={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          sub={netProfit < 0 ? "Rugi" : "Laba"}
        />
        <KpiCard
          icon={TrendingUp}
          label="Margin"
          value={marginPct != null ? `${marginPct.toFixed(1)}%` : "—"}
          color={marginPct == null ? "text-muted-foreground" : marginPct >= 20 ? "text-emerald-600" : marginPct >= 10 ? "text-amber-600" : "text-red-600"}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Detail Laporan Laba Rugi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              <tr className="bg-muted/30">
                <td colSpan={2} className="px-4 py-2 font-bold text-xs uppercase tracking-wide text-muted-foreground">A. Pendapatan</td>
              </tr>
              <tr>
                <td className="px-4 py-2 pl-8">Pembayaran Jamaah (Lunas)</td>
                <td className="px-4 py-2 text-right font-semibold text-emerald-700">{fmt(revenue)}</td>
              </tr>
              <tr className="bg-muted/10 font-semibold">
                <td className="px-4 py-2">Total Pendapatan</td>
                <td className="px-4 py-2 text-right text-emerald-700">{fmt(revenue)}</td>
              </tr>

              <tr className="bg-muted/30">
                <td colSpan={2} className="px-4 py-2 font-bold text-xs uppercase tracking-wide text-muted-foreground">B. Beban Operasional</td>
              </tr>
              {Object.entries(expenseByCategory).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
                <tr key={cat}>
                  <td className="px-4 py-2 pl-8 text-muted-foreground">{cat}</td>
                  <td className="px-4 py-2 text-right text-red-600">({fmt(amt)})</td>
                </tr>
              ))}
              {totalExpense === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 pl-8 text-muted-foreground italic text-xs">Belum ada data biaya untuk periode ini</td>
                </tr>
              )}
              <tr className="bg-muted/10 font-semibold">
                <td className="px-4 py-2">Total Beban</td>
                <td className="px-4 py-2 text-right text-red-600">({fmt(totalExpense)})</td>
              </tr>

              <tr className={cn("font-bold text-base border-t-2", netProfit >= 0 ? "bg-emerald-50" : "bg-red-50")}>
                <td className="px-4 py-3">Laba / (Rugi) Bersih</td>
                <td className={cn("px-4 py-3 text-right text-lg", netProfit >= 0 ? "text-emerald-700" : "text-red-700")}>
                  {netProfit < 0 ? `(${fmt(Math.abs(netProfit))})` : fmt(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── AR per Cabang ───────────────────────────────────────────────────────────────

function TabAR({ branchId, isConsolidation }: { branchId: string; isConsolidation: boolean }) {
  const { data: arData = [], isLoading } = useQuery({
    queryKey: ["cabang-ar", branchId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, booking_code, total_price, paid_amount, booking_status, branch_id, created_at, jamaah:profiles(full_name)")
        .in("booking_status", ["confirmed", "pending"])
        .gt("total_price", 0);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q.order("created_at", { ascending: false }).limit(100);
      return (data || []).map((b: any) => ({
        ...b,
        remaining: (Number(b.total_price) || 0) - (Number(b.paid_amount) || 0),
      })).filter((b: any) => b.remaining > 0);
    },
  });

  const totalAR = arData.reduce((s: number, b: any) => s + b.remaining, 0);
  const overdueCount = arData.filter((b: any) => b.booking_status === "pending").length;

  if (isLoading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard icon={ArrowDownToLine} label="Total Piutang (AR)" value={`Rp ${fmtShort(totalAR)}`} color="text-blue-600" />
        <KpiCard icon={AlertTriangle} label="Jumlah Booking Belum Lunas" value={String(arData.length)} color="text-amber-600" />
        <KpiCard icon={TrendingDown} label="Pending / Overdue" value={String(overdueCount)} color="text-red-600" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daftar Piutang (AR) — Booking Belum Lunas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Kode</th>
                  <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Jamaah</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Terbayar</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Sisa</th>
                  <th className="text-center px-4 py-2 font-semibold text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {arData.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground italic text-sm">Tidak ada piutang untuk cabang ini</td></tr>
                ) : arData.map((b: any) => (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">{b.booking_code || b.id.slice(0,8)}</td>
                    <td className="px-4 py-2">{b.jamaah?.full_name || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(Number(b.total_price) || 0)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{fmt(Number(b.paid_amount) || 0)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-red-600">{fmt(b.remaining)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                        b.booking_status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {b.booking_status === "confirmed" ? "Terkonfirmasi" : "Menunggu"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {arData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-bold">
                    <td colSpan={4} className="px-4 py-2 text-sm">Total AR ({arData.length} booking)</td>
                    <td className="px-4 py-2 text-right text-red-700 text-base">{fmt(totalAR)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── AP per Cabang ───────────────────────────────────────────────────────────────

function TabAP({ branchId, isConsolidation }: { branchId: string; isConsolidation: boolean }) {
  const { data: apData = [], isLoading } = useQuery({
    queryKey: ["cabang-ap", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_costs")
        .select("id, vendor_name, cost_type, amount, due_date, status, departure_id, departures(branch_id)")
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true })
        .limit(150);
      if (!data) return [];
      if (isConsolidation) return data;
      return data.filter((v: any) => v.departures?.branch_id === branchId);
    },
  });

  const totalAP = apData.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0);
  const today = new Date().toISOString().split("T")[0];
  const overdueAP = apData.filter((v: any) => v.due_date && v.due_date < today);

  if (isLoading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard icon={ArrowUpFromLine} label="Total Hutang (AP)" value={`Rp ${fmtShort(totalAP)}`} color="text-orange-600" />
        <KpiCard icon={AlertTriangle} label="Jatuh Tempo / Overdue" value={String(overdueAP.length)} color="text-red-600" />
        <KpiCard icon={CheckCircle2} label="Total Vendor" value={String(new Set(apData.map((v: any) => v.vendor_name)).size)} color="text-blue-600" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daftar Hutang Dagang (AP)</CardTitle>
          {!isConsolidation && (
            <CardDescription className="text-xs">Data vendor cost berdasarkan keberangkatan di cabang ini</CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Vendor</th>
                  <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Tipe</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Jumlah</th>
                  <th className="text-center px-4 py-2 font-semibold text-xs text-muted-foreground">Jatuh Tempo</th>
                  <th className="text-center px-4 py-2 font-semibold text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apData.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-muted-foreground italic text-sm">Tidak ada hutang dagang untuk cabang ini</td></tr>
                ) : apData.map((v: any) => {
                  const isOverdue = v.due_date && v.due_date < today;
                  return (
                    <tr key={v.id} className={cn("hover:bg-muted/20", isOverdue && "bg-red-50")}>
                      <td className="px-4 py-2 font-medium">{v.vendor_name || "—"}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{v.cost_type || "—"}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(Number(v.amount) || 0)}</td>
                      <td className="px-4 py-2 text-center text-xs">
                        <span className={cn(isOverdue && "text-red-600 font-semibold")}>
                          {v.due_date ? new Date(v.due_date).toLocaleDateString("id-ID") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                          v.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {v.status === "pending" ? "Belum Bayar" : "Sebagian"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {apData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-bold">
                    <td colSpan={2} className="px-4 py-2">Total AP ({apData.length} item)</td>
                    <td className="px-4 py-2 text-right text-orange-700 text-base">{fmt(totalAP)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Arus Kas per Cabang ─────────────────────────────────────────────────────────

function TabArusKas({ branchId, dateFrom, dateTo, isConsolidation }: {
  branchId: string; dateFrom: string; dateTo: string; isConsolidation: boolean;
}) {
  const { data: cashIn = [], isLoading: l1 } = useQuery({
    queryKey: ["cabang-cash-in", branchId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("cash_transactions")
        .select("amount, category, branch_id, transaction_date")
        .eq("type", "in")
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: cashOut = [], isLoading: l2 } = useQuery({
    queryKey: ["cabang-cash-out2", branchId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("cash_transactions")
        .select("amount, category, branch_id, transaction_date")
        .eq("type", "out")
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: payments = [], isLoading: l3 } = useQuery({
    queryKey: ["cabang-pay-arus", branchId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date, booking_id, bookings(branch_id)")
        .eq("status", "verified")
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo);
      if (!data) return [];
      if (isConsolidation) return data;
      return data.filter((p: any) => p.bookings?.branch_id === branchId);
    },
  });

  const isLoading = l1 || l2 || l3;

  const totalIn = cashIn.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0)
    + payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const totalOut = cashOut.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const netCash = totalIn - totalOut;

  const inByCategory: Record<string, number> = {
    "Pembayaran Jamaah": payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
  };
  cashIn.forEach((c: any) => {
    inByCategory[c.category || "Lainnya"] = (inByCategory[c.category || "Lainnya"] || 0) + (Number(c.amount) || 0);
  });
  const outByCategory: Record<string, number> = {};
  cashOut.forEach((c: any) => {
    outByCategory[c.category || "Lainnya"] = (outByCategory[c.category || "Lainnya"] || 0) + (Number(c.amount) || 0);
  });

  if (isLoading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={TrendingUp} label="Total Kas Masuk" value={`Rp ${fmtShort(totalIn)}`} color="text-emerald-600" />
        <KpiCard icon={TrendingDown} label="Total Kas Keluar" value={`Rp ${fmtShort(totalOut)}`} color="text-red-500" />
        <KpiCard
          icon={netCash >= 0 ? CheckCircle2 : AlertTriangle}
          label="Net Arus Kas"
          value={`Rp ${fmtShort(Math.abs(netCash))}`}
          color={netCash >= 0 ? "text-emerald-600" : "text-red-600"}
          sub={netCash >= 0 ? "Positif" : "Negatif"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700">Kas Masuk</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {Object.entries(inByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
                  <tr key={cat} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{cat}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-semibold">{fmt(amt)}</td>
                  </tr>
                ))}
                {totalIn === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground italic text-xs">Belum ada kas masuk</td></tr>}
                <tr className="border-t-2 font-bold bg-emerald-50">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{fmt(totalIn)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600">Kas Keluar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {Object.entries(outByCategory).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
                  <tr key={cat} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{cat}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">{fmt(amt)}</td>
                  </tr>
                ))}
                {totalOut === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground italic text-xs">Belum ada kas keluar</td></tr>}
                <tr className="border-t-2 font-bold bg-red-50">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right text-red-700">{fmt(totalOut)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Konsolidasi Semua Cabang ───────────────────────────────────────────────────

function KonsolidasiGrid({ branches, dateFrom, dateTo }: {
  branches: Branch[]; dateFrom: string; dateTo: string;
}) {
  const { data: paymentsByBranch = {}, isLoading } = useQuery({
    queryKey: ["konsol-payments", dateFrom, dateTo, branches.map(b => b.id).join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date, bookings(branch_id)")
        .eq("status", "verified")
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo);
      const map: Record<string, number> = {};
      for (const p of data || []) {
        const bid = p.bookings?.branch_id || "unknown";
        map[bid] = (map[bid] || 0) + (Number(p.amount) || 0);
      }
      return map;
    },
  });

  const { data: expensesByBranch = {}, isLoading: l2 } = useQuery({
    queryKey: ["konsol-expenses", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount, branch_id, expense_date")
        .gte("expense_date", dateFrom)
        .lte("expense_date", dateTo);
      const map: Record<string, number> = {};
      for (const e of data || []) {
        const bid = e.branch_id || "unknown";
        map[bid] = (map[bid] || 0) + (Number(e.amount) || 0);
      }
      return map;
    },
  });

  const totalRevAll = Object.values(paymentsByBranch).reduce((s: number, v: any) => s + v, 0);
  const totalExpAll = Object.values(expensesByBranch).reduce((s: number, v: any) => s + v, 0);

  if (isLoading || l2) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Konsolidasi Semua Cabang
        </CardTitle>
        <CardDescription className="text-xs">Perbandingan pendapatan & biaya per cabang untuk periode ini</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Cabang</th>
                <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Pendapatan</th>
                <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Biaya</th>
                <th className="text-right px-4 py-2 font-semibold text-xs text-muted-foreground">Laba Bersih</th>
                <th className="text-center px-4 py-2 font-semibold text-xs text-muted-foreground">Kontribusi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {branches.map(b => {
                const rev = (paymentsByBranch as any)[b.id] || 0;
                const exp = (expensesByBranch as any)[b.id] || 0;
                const net = rev - exp;
                const pct = totalRevAll > 0 ? (rev / totalRevAll) * 100 : 0;
                return (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="font-medium">{b.name}</div>
                      {b.city && <div className="text-xs text-muted-foreground">{b.city}</div>}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-semibold">{fmt(rev)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{fmt(exp)}</td>
                    <td className={cn("px-4 py-2 text-right font-bold", net >= 0 ? "text-emerald-700" : "text-red-600")}>
                      {net < 0 ? `(${fmt(Math.abs(net))})` : fmt(net)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-bold">
                <td className="px-4 py-2">Total Semua Cabang</td>
                <td className="px-4 py-2 text-right text-emerald-700">{fmt(totalRevAll)}</td>
                <td className="px-4 py-2 text-right text-red-600">{fmt(totalExpAll)}</td>
                <td className={cn("px-4 py-2 text-right text-base", (totalRevAll - totalExpAll) >= 0 ? "text-emerald-700" : "text-red-700")}>
                  {fmt(Math.abs(totalRevAll - totalExpAll))}
                </td>
                <td className="px-4 py-2 text-center text-xs">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function AdminLaporanCabang() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const { data: branches = [], isLoading: branchLoading } = useQuery<Branch[]>({
    queryKey: ["branches-list"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, city, province").order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const dateFrom = period + "-01";
  const dateTo = format(endOfMonth(new Date(period + "-01")), "yyyy-MM-dd");
  const [periodYear, periodMonth] = dateFrom.split("-").map(Number);

  const isConsolidation = selectedBranch === "all";
  const activeBranch = branches.find(b => b.id === selectedBranch);
  const branchLabel = isConsolidation ? "Semua Cabang" : (activeBranch?.name || selectedBranch);
  const periodLabel = format(new Date(dateFrom), "MMMM yyyy", { locale: localeId });

  // ── Konsolidasi queries — same keys as KonsolidasiGrid, shares cache ─────
  const branchIds = branches.map(b => b.id).join(",");
  const { data: konsolPayments = {} } = useQuery({
    queryKey: ["konsol-payments", dateFrom, dateTo, branchIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments").select("amount, bookings(branch_id)")
        .eq("status", "verified").gte("payment_date", dateFrom).lte("payment_date", dateTo);
      const map: Record<string, number> = {};
      for (const p of data || []) {
        const bid = p.bookings?.branch_id || "unknown";
        map[bid] = (map[bid] || 0) + (Number(p.amount) || 0);
      }
      return map;
    },
    enabled: isConsolidation && branches.length > 0,
    staleTime: 60_000,
  });
  const { data: konsolExpenses = {} } = useQuery({
    queryKey: ["konsol-expenses", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses").select("amount, branch_id")
        .gte("expense_date", dateFrom).lte("expense_date", dateTo);
      const map: Record<string, number> = {};
      for (const e of data || []) {
        const bid = e.branch_id || "unknown";
        map[bid] = (map[bid] || 0) + (Number(e.amount) || 0);
      }
      return map;
    },
    enabled: isConsolidation && branches.length > 0,
    staleTime: 60_000,
  });

  // ── Export data queries — same keys as tab queries, shares React Query cache ──
  const { data: expPayments = [] } = useQuery({
    queryKey: ["cabang-payments", selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments").select("amount, payment_date, booking_id, bookings(branch_id)")
        .eq("status", "verified").gte("payment_date", dateFrom).lte("payment_date", dateTo);
      if (!data) return [];
      return isConsolidation ? data : data.filter((p: any) => p.bookings?.branch_id === selectedBranch);
    },
    staleTime: 60_000,
  });
  const { data: expExpenses = [] } = useQuery({
    queryKey: ["cabang-expenses", selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("expenses").select("amount, category, expense_date, branch_id")
        .gte("expense_date", dateFrom).lte("expense_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q; return data || [];
    },
    staleTime: 60_000,
  });
  const { data: expCashOut = [] } = useQuery({
    queryKey: ["cabang-cash-out", selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("cash_transactions").select("amount, category, branch_id, transaction_date")
        .eq("type", "out").gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q; return data || [];
    },
    staleTime: 60_000,
  });
  const { data: expPayroll = [] } = useQuery({
    queryKey: ["cabang-payroll", selectedBranch, periodYear, periodMonth],
    queryFn: async () => {
      let q = supabase.from("payroll_records").select("net_salary, branch_id, status")
        .eq("period_year", periodYear).eq("period_month", periodMonth).eq("status", "paid");
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q; return data || [];
    },
    staleTime: 60_000,
  });
  const { data: expCashIn = [] } = useQuery({
    queryKey: ["cabang-cash-in", selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("cash_transactions").select("amount, category, branch_id, transaction_date")
        .eq("type", "in").gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q; return data || [];
    },
    staleTime: 60_000,
  });
  const { data: expCashOut2 = [] } = useQuery({
    queryKey: ["cabang-cash-out2", selectedBranch, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("cash_transactions").select("amount, category, branch_id, transaction_date")
        .eq("type", "out").gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q; return data || [];
    },
    staleTime: 60_000,
  });
  const { data: expAR = [] } = useQuery({
    queryKey: ["cabang-ar", selectedBranch],
    queryFn: async () => {
      let q = supabase.from("bookings")
        .select("id, booking_code, total_price, paid_amount, booking_status, branch_id, created_at, jamaah:profiles(full_name)")
        .in("booking_status", ["confirmed", "pending"]).gt("total_price", 0);
      if (!isConsolidation) q = q.eq("branch_id", selectedBranch);
      const { data } = await q.order("created_at", { ascending: false }).limit(100);
      return (data || []).map((b: any) => ({
        ...b, remaining: (Number(b.total_price) || 0) - (Number(b.paid_amount) || 0),
      })).filter((b: any) => b.remaining > 0);
    },
    staleTime: 60_000,
  });
  const { data: expAP = [] } = useQuery({
    queryKey: ["cabang-ap", selectedBranch],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_costs")
        .select("id, vendor_name, cost_type, amount, due_date, status, departure_id, departures(branch_id)")
        .in("status", ["pending", "partial"]).order("due_date", { ascending: true }).limit(150);
      if (!data) return [];
      return isConsolidation ? data : data.filter((v: any) => v.departures?.branch_id === selectedBranch);
    },
    staleTime: 60_000,
  });

  // ── Derived export data (mirrors tab component calculations) ──────────────
  const exportData = useMemo((): ExportData => {
    const revenue = expPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const expenseByCategory: Record<string, number> = {};
    expExpenses.forEach((e: any) => {
      expenseByCategory[e.category || "Lainnya"] = (expenseByCategory[e.category || "Lainnya"] || 0) + (Number(e.amount) || 0);
    });
    expCashOut.filter((c: any) => c.category !== "salary").forEach((c: any) => {
      const cat = `Ops: ${c.category || "Lainnya"}`;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(c.amount) || 0);
    });
    const sdmCost = expPayroll.reduce((s: number, p: any) => s + (Number(p.net_salary) || 0), 0);
    if (sdmCost > 0) expenseByCategory["Biaya SDM (Payroll)"] = sdmCost;
    const expTotal = expExpenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
      + expCashOut.filter((c: any) => c.category !== "salary").reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0)
      + sdmCost;
    const netProfit = revenue - expTotal;

    const inByCategory: Record<string, number> = {
      "Pembayaran Jamaah": expPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
    };
    expCashIn.forEach((c: any) => {
      inByCategory[c.category || "Lainnya"] = (inByCategory[c.category || "Lainnya"] || 0) + (Number(c.amount) || 0);
    });
    const outByCategory: Record<string, number> = {};
    expCashOut2.forEach((c: any) => {
      outByCategory[c.category || "Lainnya"] = (outByCategory[c.category || "Lainnya"] || 0) + (Number(c.amount) || 0);
    });
    const totalIn = Object.values(inByCategory).reduce((s, v) => s + v, 0);
    const totalOut = Object.values(outByCategory).reduce((s, v) => s + v, 0);
    const totalAR = expAR.reduce((s: number, b: any) => s + b.remaining, 0);
    const totalAP = expAP.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0);

    // ── AR per branch (group by branch_id) ───────────────────────────────────
    const arByBranch: Record<string, number> = {};
    expAR.forEach((b: any) => {
      const bid = b.branch_id || "unknown";
      arByBranch[bid] = (arByBranch[bid] || 0) + (b.remaining || 0);
    });

    // ── AP per branch (via departures.branch_id) ──────────────────────────────
    const apByBranch: Record<string, number> = {};
    expAP.forEach((v: any) => {
      const bid = v.departures?.branch_id || "unknown";
      apByBranch[bid] = (apByBranch[bid] || 0) + (Number(v.amount) || 0);
    });

    // ── Konsolidasi rows — only when isConsolidation ──────────────────────────
    const konsolidasiRows: KonsolRow[] = isConsolidation && branches.length > 0
      ? branches.map(b => {
          const rev  = (konsolPayments as any)[b.id] || 0;
          const exp  = (konsolExpenses as any)[b.id] || 0;
          const net  = rev - exp;
          return {
            branchId:   b.id,
            branchName: b.name,
            city:       b.city,
            revenue:    rev,
            expenses:   exp,
            netProfit:  net,
            marginPct:  rev > 0 ? (net / rev) * 100 : null,
            arTotal:    arByBranch[b.id] || 0,
            apTotal:    apByBranch[b.id] || 0,
          };
        }).sort((a, b) => b.revenue - a.revenue)
      : undefined;

    return {
      branchLabel,
      period: periodLabel,
      dateFrom,
      dateTo,
      revenue,
      expenseByCategory,
      totalExpense: expTotal,
      netProfit,
      marginPct: revenue > 0 ? (netProfit / revenue) * 100 : null,
      inByCategory,
      outByCategory,
      totalIn,
      totalOut,
      netCash: totalIn - totalOut,
      arData: expAR,
      totalAR,
      apData: expAP,
      totalAP,
      konsolidasiRows,
    };
  }, [
    expPayments, expExpenses, expCashOut, expPayroll,
    expCashIn, expCashOut2, expAR, expAP,
    branchLabel, periodLabel, dateFrom, dateTo,
    isConsolidation, branches, konsolPayments, konsolExpenses,
  ]);

  const handleExport = useCallback(async (type: "pdf" | "excel") => {
    setExporting(type);
    try {
      await new Promise(r => setTimeout(r, 50)); // flush render
      if (type === "pdf") buildPDF(exportData);
      else buildExcel(exportData);
    } finally {
      setExporting(null);
    }
  }, [exportData]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Laporan Keuangan per Cabang
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Filter laporan keuangan per cabang atau lihat konsolidasi semua cabang.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {isConsolidation ? "Semua Cabang" : activeBranch?.name || "—"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting !== null}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? (exporting === "pdf" ? "Membuat PDF..." : "Membuat Excel...") : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Ekspor laporan: {branchLabel} — {periodLabel}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleExport("pdf")}
              >
                <FileText className="h-4 w-4 text-red-500" />
                <div>
                  <div className="font-medium text-sm">Download PDF</div>
                  <div className="text-[10px] text-muted-foreground">Semua tab dalam 1 file PDF</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleExport("excel")}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="font-medium text-sm">Download Excel</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isConsolidation ? "5 sheet: Laba Rugi, Arus Kas, AR, AP + Konsolidasi" : "4 sheet: Laba Rugi, Arus Kas, AR, AP"}
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Cabang:</span>
          <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={branchLoading}>
            <SelectTrigger className="h-8 w-52 text-sm">
              <SelectValue placeholder="Pilih cabang..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Semua Cabang (Konsolidasi)
                </span>
              </SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Periode:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Consolidation grid (always visible if all branches) */}
      {isConsolidation && branches.length > 0 && (
        <KonsolidasiGrid branches={branches} dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="laba-rugi">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="laba-rugi">Laba Rugi</TabsTrigger>
          <TabsTrigger value="arus-kas">Arus Kas</TabsTrigger>
          <TabsTrigger value="ar">Piutang (AR)</TabsTrigger>
          <TabsTrigger value="ap">Hutang (AP)</TabsTrigger>
        </TabsList>

        <TabsContent value="laba-rugi" className="mt-4">
          <TabLabaRugi
            branchId={selectedBranch}
            dateFrom={dateFrom}
            dateTo={dateTo}
            isConsolidation={isConsolidation}
          />
        </TabsContent>

        <TabsContent value="arus-kas" className="mt-4">
          <TabArusKas
            branchId={selectedBranch}
            dateFrom={dateFrom}
            dateTo={dateTo}
            isConsolidation={isConsolidation}
          />
        </TabsContent>

        <TabsContent value="ar" className="mt-4">
          <TabAR branchId={selectedBranch} isConsolidation={isConsolidation} />
        </TabsContent>

        <TabsContent value="ap" className="mt-4">
          <TabAP branchId={selectedBranch} isConsolidation={isConsolidation} />
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground">
        Laporan Laba Rugi & Arus Kas berdasarkan periode. AR & AP menampilkan semua saldo yang belum diselesaikan.
        Data difilter berdasarkan branch_id pada masing-masing tabel.
      </p>
    </div>
  );
}
