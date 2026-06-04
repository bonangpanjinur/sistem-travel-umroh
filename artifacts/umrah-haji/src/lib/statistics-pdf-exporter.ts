import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface CompanyInfo {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url?: string;
}

interface PeriodStats {
  totalPax: number;
  totalBookings: number;
  totalRevenue: number;
  byStatus: Record<string, { pax: number; bookings: number }>;
}

interface ExportOptions {
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
}

const COLORS = {
  primary: { r: 25, g: 64, b: 175 }, // Blue-700
  secondary: { r: 37, g: 99, b: 235 }, // Blue-600
  accent: { r: 59, g: 130, b: 246 }, // Blue-500
  success: { r: 34, g: 197, b: 94 }, // Green-600
  warning: { r: 234, g: 179, b: 8 }, // Yellow-500
  danger: { r: 239, g: 68, b: 68 }, // Red-500
  headerBg: { r: 25, g: 64, b: 175 },
  headerText: { r: 255, g: 255, b: 255 },
  rowBg: { r: 249, g: 250, b: 251 },
  rowText: { r: 31, g: 41, b: 55 },
  altRowBg: { r: 255, g: 255, b: 255 },
  borderColor: { r: 229, g: 231, b: 235 },
  summaryBg: { r: 254, g: 243, b: 199 }, // Yellow-100
  summaryText: { r: 120, g: 53, b: 15 }, // Yellow-900
};

const FONTS = {
  title: 16,
  subtitle: 11,
  header: 10,
  body: 9,
  footer: 8,
};

export function exportStatisticsToPDF(
  stats: PeriodStats,
  companyInfo: CompanyInfo,
  options: ExportOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;
  let currentY = margin;

  // ===== HEADER SECTION =====
  doc.setFontSize(FONTS.body);
  doc.setTextColor(100, 100, 100);
  
  const headerContent = [
    companyInfo.company_name,
    companyInfo.company_address,
    `Telepon: ${companyInfo.company_phone}`,
    `Email: ${companyInfo.company_email}`,
  ];

  headerContent.forEach((line, index) => {
    if (index === 0) {
      doc.setFontSize(FONTS.header);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.setFont('', 'bold');
    } else {
      doc.setFontSize(FONTS.body);
      doc.setTextColor(100, 100, 100);
      doc.setFont('', 'normal');
    }
    doc.text(line, margin, currentY);
    currentY += 4;
  });

  currentY += 2;

  // ===== TITLE SECTION =====
  doc.setFontSize(FONTS.title);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setFont('', 'bold');
  doc.text('Laporan Statistik Jamaah', margin, currentY);
  currentY += 7;

  // Period info
  doc.setFontSize(FONTS.subtitle);
  doc.setTextColor(100, 100, 100);
  doc.setFont('', 'normal');
  doc.text(`Periode: ${options.periodLabel}`, margin, currentY);
  currentY += 5;

  // Date range
  doc.setFontSize(FONTS.body);
  doc.setTextColor(120, 120, 120);
  doc.text(`${options.dateFrom} - ${options.dateTo}`, margin, currentY);
  currentY += 6;

  // ===== SUMMARY SECTION =====
  doc.setFontSize(FONTS.body);
  doc.setFont('', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Ringkasan Keseluruhan', margin, currentY);
  currentY += 5;

  const summaryData = [
    { label: 'Total Jamaah', value: stats.totalPax, icon: '👥' },
    { label: 'Total Booking', value: stats.totalBookings, icon: '📋' },
    { label: 'Total Pendapatan', value: formatCurrency(stats.totalRevenue), icon: '💰' },
  ];

  const summaryBoxWidth = (pageWidth - 2 * margin) / 3 - 1;
  summaryData.forEach((item, index) => {
    const x = margin + index * (summaryBoxWidth + 1);
    
    // Background
    doc.setFillColor(245, 247, 250);
    doc.rect(x, currentY - 2, summaryBoxWidth, 14, 'F');
    
    // Border
    doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.setLineWidth(0.5);
    doc.rect(x, currentY - 2, summaryBoxWidth, 14);

    // Label
    doc.setFontSize(FONTS.body - 1);
    doc.setTextColor(100, 100, 100);
    doc.setFont('', 'normal');
    doc.text(item.label, x + 2, currentY + 1);

    // Value
    doc.setFontSize(FONTS.header);
    doc.setFont('', 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(item.value.toString(), x + summaryBoxWidth - 2, currentY + 9, { align: 'right' });
  });

  currentY += 18;

  // ===== STATUS BREAKDOWN TABLE =====
  doc.setFontSize(FONTS.body);
  doc.setFont('', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Komposisi Per Status Booking', margin, currentY);
  currentY += 5;

  const statusLabels: Record<string, string> = {
    confirmed: 'Terkonfirmasi',
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
  };

  const statusOrder = ['confirmed', 'pending', 'processing', 'completed'];
  const statusTableData = statusOrder.map(status => {
    const stat = stats.byStatus[status] || { pax: 0, bookings: 0 };
    const pct = stats.totalPax > 0 ? ((stat.pax / stats.totalPax) * 100).toFixed(1) : '0';
    const avgPax = stat.bookings > 0 ? (stat.pax / stat.bookings).toFixed(1) : '0';

    return [
      statusLabels[status] || status,
      stat.pax.toString(),
      stat.bookings.toString(),
      `${pct}%`,
      avgPax,
    ];
  });

  autoTable(doc, {
    columns: [
      { header: 'Status Booking', dataKey: 'status' },
      { header: 'Jumlah Jamaah', dataKey: 'pax' },
      { header: 'Jumlah Booking', dataKey: 'bookings' },
      { header: 'Persentase', dataKey: 'percentage' },
      { header: 'Rata-rata/Booking', dataKey: 'average' },
    ],
    body: statusTableData.map(row => ({
      status: row[0],
      pax: row[1],
      bookings: row[2],
      percentage: row[3],
      average: row[4],
    })),
    startY: currentY,
    margin: { left: margin, right: margin, top: 10, bottom: 15 },
    styles: {
      fontSize: FONTS.body,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
      textColor: [COLORS.rowText.r, COLORS.rowText.g, COLORS.rowText.b],
    },
    headStyles: {
      fillColor: [COLORS.headerBg.r, COLORS.headerBg.g, COLORS.headerBg.b],
      textColor: [COLORS.headerText.r, COLORS.headerText.g, COLORS.headerText.b],
      fontStyle: 'bold',
      fontSize: FONTS.header,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [COLORS.rowBg.r, COLORS.rowBg.g, COLORS.rowBg.b],
    },
    bodyStyles: {
      lineColor: [COLORS.borderColor.r, COLORS.borderColor.g, COLORS.borderColor.b],
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
  });

  // ===== INSIGHTS SECTION =====
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
  let insightY = finalY + 8;

  if (insightY < pageHeight - 20) {
    doc.setFontSize(FONTS.body);
    doc.setFont('', 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Insight & Analisis', margin, insightY);
    insightY += 5;

    doc.setFontSize(FONTS.body - 1);
    doc.setFont('', 'normal');
    doc.setTextColor(50, 50, 50);

    const insights = [
      `• Rata-rata jamaah per booking: ${(stats.totalPax / Math.max(stats.totalBookings, 1)).toFixed(1)} orang`,
      `• Status terbanyak: ${getTopStatus(stats.byStatus, statusLabels)}`,
      `• Total pendapatan periode ini: ${formatCurrency(stats.totalRevenue)}`,
    ];

    insights.forEach(insight => {
      if (insightY < pageHeight - 15) {
        doc.text(insight, margin + 2, insightY);
        insightY += 4;
      }
    });
  }

  // ===== FOOTER =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(COLORS.borderColor.r, COLORS.borderColor.g, COLORS.borderColor.b);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    // Footer text
    doc.setFontSize(FONTS.footer);
    doc.setTextColor(120, 120, 120);
    
    const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
    doc.text(
      `Laporan Statistik Jamaah - ${timestamp}`,
      margin,
      pageHeight - 6
    );

    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Save PDF
  const filename = `Statistik_Jamaah_${options.periodLabel.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}`;
  doc.save(`${filename}.pdf`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTopStatus(
  byStatus: Record<string, { pax: number; bookings: number }>,
  labels: Record<string, string>
): string {
  let topStatus = 'N/A';
  let maxPax = 0;

  Object.entries(byStatus).forEach(([status, data]) => {
    if (data.pax > maxPax) {
      maxPax = data.pax;
      topStatus = labels[status] || status;
    }
  });

  return topStatus;
}
