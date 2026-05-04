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

interface BookingData {
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  departure_date: string;
  return_date: string;
  total_pax: number;
  room_type: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  booking_status: string;
  payment_status: string;
  created_at: string;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const COLORS = {
  primary: { r: 25, g: 64, b: 175 }, // Blue-700
  secondary: { r: 37, g: 99, b: 235 }, // Blue-600
  accent: { r: 59, g: 130, b: 246 }, // Blue-500
  headerBg: { r: 25, g: 64, b: 175 },
  headerText: { r: 255, g: 255, b: 255 },
  rowBg: { r: 249, g: 250, b: 251 },
  rowText: { r: 31, g: 41, b: 55 },
  altRowBg: { r: 255, g: 255, b: 255 },
  borderColor: { r: 229, g: 231, b: 235 },
};

const FONTS = {
  title: 16,
  subtitle: 11,
  header: 10,
  body: 9,
  footer: 8,
};

export async function exportBookingsToPDF(
  bookings: BookingData[],
  companyInfo: CompanyInfo,
  options: ExportOptions
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;
  let currentY = margin;

  // ===== HEADER SECTION =====
  // Company info header
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
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFontSize(FONTS.body);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });

  currentY += 3;

  // ===== TITLE SECTION =====
  doc.setFontSize(FONTS.title);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setFont(undefined, 'bold');
  doc.text(options.title, margin, currentY);
  currentY += 8;

  // Subtitle with date range
  if (options.subtitle) {
    doc.setFontSize(FONTS.subtitle);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text(options.subtitle, margin, currentY);
    currentY += 6;
  }

  // Date range
  if (options.dateFrom || options.dateTo) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(120, 120, 120);
    const dateRange = formatDateRange(options.dateFrom, options.dateTo);
    doc.text(`Periode: ${dateRange}`, margin, currentY);
    currentY += 5;
  }

  currentY += 2;

  // ===== SUMMARY STATS =====
  const totalRevenue = bookings.reduce((sum, b) => sum + b.total_price, 0);
  const totalPaid = bookings.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalPax = bookings.reduce((sum, b) => sum + b.total_pax, 0);

  const statsData = [
    ['Total Booking', bookings.length.toString()],
    ['Total Jamaah', totalPax.toString()],
    ['Total Pendapatan', formatCurrency(totalRevenue)],
    ['Total Terbayar', formatCurrency(totalPaid)],
  ];

  doc.setFontSize(FONTS.body);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Ringkasan:', margin, currentY);
  currentY += 4;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(31, 41, 55);
  const statsPerRow = 4;
  const statWidth = (pageWidth - 2 * margin) / statsPerRow;

  statsData.forEach((stat, index) => {
    const row = Math.floor(index / statsPerRow);
    const col = index % statsPerRow;
    const x = margin + col * statWidth;
    const y = currentY + row * 8;

    // Background
    doc.setFillColor(245, 247, 250);
    doc.rect(x, y - 3, statWidth - 1, 7, 'F');

    // Border
    doc.setDrawColor(COLORS.borderColor.r, COLORS.borderColor.g, COLORS.borderColor.b);
    doc.rect(x, y - 3, statWidth - 1, 7);

    // Label
    doc.setFontSize(FONTS.body - 1);
    doc.setTextColor(100, 100, 100);
    doc.text(stat[0], x + 2, y - 0.5);

    // Value
    doc.setFontSize(FONTS.body);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(stat[1], x + statWidth - 2, y - 0.5, { align: 'right' });
  });

  currentY += 16;

  // ===== TABLE SECTION =====
  const columns = [
    { header: 'Kode Booking', dataKey: 'booking_code', width: 18 },
    { header: 'Customer', dataKey: 'customer_name', width: 20 },
    { header: 'Telepon', dataKey: 'customer_phone', width: 15 },
    { header: 'Paket', dataKey: 'package_name', width: 25 },
    { header: 'Keberangkatan', dataKey: 'departure_date', width: 14 },
    { header: 'Pax', dataKey: 'total_pax', width: 8 },
    { header: 'Kamar', dataKey: 'room_type', width: 12 },
    { header: 'Total', dataKey: 'total_price', width: 15 },
    { header: 'Dibayar', dataKey: 'paid_amount', width: 15 },
    { header: 'Sisa', dataKey: 'remaining_amount', width: 15 },
    { header: 'Status Booking', dataKey: 'booking_status', width: 14 },
    { header: 'Status Bayar', dataKey: 'payment_status', width: 12 },
  ];

  const tableData = bookings.map(booking => ({
    booking_code: booking.booking_code,
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    package_name: booking.package_name,
    departure_date: format(new Date(booking.departure_date), 'd MMM yy', { locale: id }),
    total_pax: booking.total_pax.toString(),
    room_type: booking.room_type,
    total_price: formatCurrency(booking.total_price),
    paid_amount: formatCurrency(booking.paid_amount),
    remaining_amount: formatCurrency(booking.remaining_amount),
    booking_status: formatStatus(booking.booking_status),
    payment_status: formatPaymentStatus(booking.payment_status),
  }));

  autoTable(doc, {
    columns: columns,
    body: tableData.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
    startY: currentY,
    margin: { left: margin, right: margin, top: 10, bottom: 15 },
    styles: {
      fontSize: FONTS.body,
      cellPadding: 2.5,
      overflow: 'linebreak',
      halign: 'left',
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
      1: { halign: 'left' },
      2: { halign: 'left' },
      3: { halign: 'left' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'center' },
      11: { halign: 'center' },
    },
  });

  // ===== FOOTER =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(COLORS.borderColor.r, COLORS.borderColor.g, COLORS.borderColor.b);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer text
    doc.setFontSize(FONTS.footer);
    doc.setTextColor(120, 120, 120);
    
    const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
    doc.text(
      `Laporan Booking - ${timestamp}`,
      margin,
      pageHeight - 8
    );

    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save PDF
  const filename = `Laporan_Booking_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
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

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Konfirmasi',
    processing: 'Proses',
    completed: 'Selesai',
    cancelled: 'Batal',
    refunded: 'Refund',
  };
  return labels[status] || status;
}

function formatPaymentStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Belum Bayar',
    partial: 'Sebagian',
    paid: 'Lunas',
    refunded: 'Refund',
    failed: 'Gagal',
  };
  return labels[status] || status;
}

function formatDateRange(dateFrom?: Date, dateTo?: Date): string {
  if (!dateFrom && !dateTo) return 'Semua Periode';
  if (dateFrom && dateTo) {
    return `${format(dateFrom, 'd MMM yyyy', { locale: id })} - ${format(dateTo, 'd MMM yyyy', { locale: id })}`;
  }
  if (dateFrom) return `Dari ${format(dateFrom, 'd MMM yyyy', { locale: id })}`;
  if (dateTo) return `Sampai ${format(dateTo, 'd MMM yyyy', { locale: id })}`;
  return '';
}
