/**
 * Enhanced Booking PDF Exporter with Design Settings
 * This is an example of how to integrate design settings into existing PDF generators
 * 
 * INTEGRATION STEPS:
 * 1. Import useCompanySettings hook to get design settings
 * 2. Extract design settings from company settings
 * 3. Pass settings to PDF generation functions
 * 4. Apply settings using the pdf-design-settings utility
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  PDFDesignSettings,
  hexToRgb,
  mergeDesignSettings,
  getFontNameForJsPDF,
  applyDesignSettingsToDoc,
} from './pdf-design-settings';

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

// EXAMPLE: How to get design settings from useCompanySettings
// In your React component:
// const { getSetting } = useCompanySettings();
// const designSettings = extractDesignSettings(getSetting);

export function extractDesignSettings(getSetting: (key: string) => any): PDFDesignSettings {
  return {
    fontFamily: (getSetting("pdf_global_font_family") || "helvetica") as any,
    fontSizeHeader: parseInt(getSetting("pdf_global_font_size_header") || "12"),
    fontSizeBody: parseInt(getSetting("pdf_global_font_size_body") || "10"),
    textColor: getSetting("pdf_global_text_color") || "#333333",
    accentColor: getSetting("pdf_global_accent_color") || "#16a34a",
    marginTop: parseInt(getSetting("pdf_global_margin_top") || "15"),
    marginBottom: parseInt(getSetting("pdf_global_margin_bottom") || "15"),
    marginLeft: parseInt(getSetting("pdf_global_margin_left") || "15"),
    marginRight: parseInt(getSetting("pdf_global_margin_right") || "15"),
    showLogo: getSetting("pdf_global_show_logo") !== "false",
    logoPosition: (getSetting("pdf_global_logo_position") || "left") as any,
    showPageNumber: getSetting("pdf_global_show_page_number") !== "false",
    showTimestamp: getSetting("pdf_global_show_timestamp") !== "false",
  };
}

// EXAMPLE: How to get invoice-specific settings
export function extractInvoiceSettings(getSetting: (key: string) => any) {
  return {
    fontFamily: getSetting("invoice_font_family"),
    headerBgColor: getSetting("invoice_header_bg_color"),
    tableHeaderTextColor: getSetting("invoice_table_header_text_color"),
    watermarkText: getSetting("invoice_watermark_text"),
    watermarkOpacity: parseFloat(getSetting("invoice_watermark_opacity") || "1"),
  };
}

/**
 * Enhanced export function with design settings
 * @param bookings - Array of booking data
 * @param companyInfo - Company information
 * @param options - Export options
 * @param designSettings - Global design settings
 * @param invoiceSettings - Invoice-specific settings (optional)
 */
export async function exportBookingsToPDFEnhanced(
  bookings: BookingData[],
  companyInfo: CompanyInfo,
  options: ExportOptions,
  designSettings: PDFDesignSettings,
  invoiceSettings?: any
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  
  // Use design settings for margins
  const margin = {
    top: designSettings.marginTop,
    bottom: designSettings.marginBottom,
    left: designSettings.marginLeft,
    right: designSettings.marginRight,
  };

  let currentY = margin.top;

  // Apply global design settings
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily));
  const [textR, textG, textB] = hexToRgb(designSettings.textColor);
  const [accentR, accentG, accentB] = hexToRgb(designSettings.accentColor);

  // ===== HEADER SECTION =====
  doc.setFontSize(designSettings.fontSizeBody);
  doc.setTextColor(100, 100, 100);
  
  const headerContent = [
    companyInfo.company_name,
    companyInfo.company_address,
    `Telepon: ${companyInfo.company_phone}`,
    `Email: ${companyInfo.company_email}`,
  ];

  headerContent.forEach((line, index) => {
    if (index === 0) {
      doc.setFontSize(designSettings.fontSizeHeader);
      doc.setTextColor(accentR, accentG, accentB);
      doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'bold');
    } else {
      doc.setFontSize(designSettings.fontSizeBody);
      doc.setTextColor(100, 100, 100);
      doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'normal');
    }
    doc.text(line, margin.left, currentY);
    currentY += 5;
  });

  currentY += 3;

  // ===== TITLE SECTION =====
  doc.setFontSize(designSettings.fontSizeHeader + 4);
  doc.setTextColor(accentR, accentG, accentB);
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'bold');
  doc.text(options.title, margin.left, currentY);
  currentY += 8;

  // Subtitle with date range
  if (options.subtitle) {
    doc.setFontSize(designSettings.fontSizeBody + 1);
    doc.setTextColor(100, 100, 100);
    doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'normal');
    doc.text(options.subtitle, margin.left, currentY);
    currentY += 6;
  }

  // Date range
  if (options.dateFrom || options.dateTo) {
    doc.setFontSize(designSettings.fontSizeBody);
    doc.setTextColor(120, 120, 120);
    const dateRange = formatDateRange(options.dateFrom, options.dateTo);
    doc.text(`Periode: ${dateRange}`, margin.left, currentY);
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

  doc.setFontSize(designSettings.fontSizeBody);
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'bold');
  doc.setTextColor(accentR, accentG, accentB);
  doc.text('Ringkasan:', margin.left, currentY);
  currentY += 4;

  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'normal');
  doc.setTextColor(textR, textG, textB);
  const statsPerRow = 4;
  const contentWidth = pageWidth - margin.left - margin.right;
  const statWidth = contentWidth / statsPerRow;

  statsData.forEach((stat, index) => {
    const row = Math.floor(index / statsPerRow);
    const col = index % statsPerRow;
    const x = margin.left + col * statWidth;
    const y = currentY + row * 8;

    // Background
    doc.setFillColor(245, 247, 250);
    doc.rect(x, y - 3, statWidth - 1, 7, 'F');

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y - 3, statWidth - 1, 7);

    // Label
    doc.setFontSize(designSettings.fontSizeBody - 1);
    doc.setTextColor(100, 100, 100);
    doc.text(stat[0], x + 2, y - 0.5);

    // Value
    doc.setFontSize(designSettings.fontSizeBody);
    doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'bold');
    doc.setTextColor(accentR, accentG, accentB);
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

  // Use invoice-specific header color if available
  const headerBgColor = invoiceSettings?.headerBgColor || designSettings.accentColor;
  const [headerBgR, headerBgG, headerBgB] = hexToRgb(headerBgColor);

  autoTable(doc, {
    columns: columns,
    body: tableData.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
    startY: currentY,
    margin: { left: margin.left, right: margin.right, top: 10, bottom: 15 },
    styles: {
      fontSize: designSettings.fontSizeBody,
      cellPadding: 2.5,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle',
      textColor: [textR, textG, textB],
      font: getFontNameForJsPDF(designSettings.fontFamily),
    },
    headStyles: {
      fillColor: [headerBgR, headerBgG, headerBgB],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: designSettings.fontSizeHeader,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    bodyStyles: {
      lineColor: [200, 200, 200],
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
  if (designSettings.showPageNumber || designSettings.showTimestamp) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin.left, pageHeight - 12, pageWidth - margin.right, pageHeight - 12);

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      
      if (designSettings.showTimestamp) {
        const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
        doc.text(
          `Laporan Booking - ${timestamp}`,
          margin.left,
          pageHeight - 8
        );
      }

      if (designSettings.showPageNumber) {
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          pageWidth - margin.right,
          pageHeight - 8,
          { align: 'right' }
        );
      }
    }
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
