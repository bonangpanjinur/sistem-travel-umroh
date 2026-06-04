import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PDFDesignSettings, DocumentSpecificSettings, mergeDesignSettings, hexToRgb, getFontNameForJsPDF } from './pdf-design-settings';

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

export async function exportBookingsToPDF(
  bookings: BookingData[],
  companyInfo: CompanyInfo,
  options: ExportOptions,
  globalDesignSettings: PDFDesignSettings,
  invoiceDesignSettings?: DocumentSpecificSettings
) {
  const finalSettings = mergeDesignSettings(globalDesignSettings, invoiceDesignSettings);

  const doc = new jsPDF({
    orientation: finalSettings.pageOrientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  const margin = finalSettings.marginLeft;
  let currentY = finalSettings.marginTop;

  // Apply global font and text color settings
  doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily));
  const [r, g, b] = hexToRgb(finalSettings.textColor);
  doc.setTextColor(r, g, b);

  // ===== HEADER SECTION =====
  // Company info header
  doc.setFontSize(finalSettings.fontSizeBody);
  
  const headerContent = [
    companyInfo.company_name,
    companyInfo.company_address,
    `Telepon: ${companyInfo.company_phone}`,
    `Email: ${companyInfo.company_email}`,
  ];

  // Display logo if enabled globally or specifically for invoice
  if (finalSettings.showLogo && companyInfo.logo_url) {
    try {
      // Use a promise to wait for the image to load
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Handle CORS if needed
        image.src = companyInfo.logo_url!;
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(e);
      });

      const imgWidth = 30; // Adjust as needed
      const imgHeight = (img.height * imgWidth) / img.width;
      let xPos = margin;
      if (finalSettings.logoPosition === 'center') {
        xPos = (pageWidth / 2) - (imgWidth / 2);
      } else if (finalSettings.logoPosition === 'right') {
        xPos = pageWidth - margin - imgWidth;
      }
      doc.addImage(img, 'PNG', xPos, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 5; // Dynamic space based on logo height
    } catch (error) {
      console.error("Failed to load logo image:", error);
      currentY += 5; // Small space even if logo fails
    }
  } else {
    currentY += 5; // Small space if no logo
  }

  headerContent.forEach((line, index) => {
    if (index === 0) {
      doc.setFontSize(finalSettings.fontSizeHeader);
      const [pr, pg, pb] = hexToRgb(finalSettings.accentColor);
      doc.setTextColor(pr, pg, pb);
      doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'bold');
    } else {
      doc.setFontSize(finalSettings.fontSizeBody);
      const [tr, tg, tb] = hexToRgb(finalSettings.textColor);
      doc.setTextColor(tr, tg, tb);
      doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'normal');
    }
    doc.text(line, margin, currentY);
    currentY += 5;
  });

  currentY += 3;

  // ===== TITLE SECTION =====
  doc.setFontSize(finalSettings.fontSizeHeader);
  const [pr, pg, pb] = hexToRgb(finalSettings.accentColor);
  doc.setTextColor(pr, pg, pb);
  doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'bold');
  doc.text(options.title, margin, currentY);
  currentY += 8;

  // Subtitle with date range
  if (options.subtitle) {
    doc.setFontSize(finalSettings.fontSizeBody);
    const [tr, tg, tb] = hexToRgb(finalSettings.textColor);
    doc.setTextColor(tr, tg, tb);
    doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'normal');
    doc.text(options.subtitle, margin, currentY);
    currentY += 6;
  }

  // Date range
  if (options.dateFrom || options.dateTo) {
    doc.setFontSize(finalSettings.fontSizeBody);
    const [tr, tg, tb] = hexToRgb(finalSettings.textColor);
    doc.setTextColor(tr, tg, tb);
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

  doc.setFontSize(finalSettings.fontSizeBody);
  doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text('Ringkasan:', margin, currentY);
  currentY += 4;

  doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'normal');
  const [tr, tg, tb] = hexToRgb(finalSettings.textColor);
  doc.setTextColor(tr, tg, tb);
  const statsPerRow = 4;
  const statWidth = (pageWidth - finalSettings.marginLeft - finalSettings.marginRight) / statsPerRow;

  statsData.forEach((stat, index) => {
    const row = Math.floor(index / statsPerRow);
    const col = index % statsPerRow;
    const x = finalSettings.marginLeft + col * statWidth;
    const y = currentY + row * 8;

    // Background
    doc.setFillColor(245, 247, 250);
    doc.rect(x, y - 3, statWidth - 1, 7, 'F');

    // Border
    const [br, bg, bb] = hexToRgb(finalSettings.accentColor);
    doc.setDrawColor(br, bg, bb);
    doc.rect(x, y - 3, statWidth - 1, 7);

    // Label
    doc.setFontSize(finalSettings.fontSizeBody - 1);
    doc.setTextColor(100, 100, 100);
    doc.text(stat[0], x + 2, y - 0.5);

    // Value
    doc.setFontSize(finalSettings.fontSizeBody);
    doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily), 'bold');
    doc.setTextColor(pr, pg, pb);
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
    margin: { left: finalSettings.marginLeft, right: finalSettings.marginRight, top: finalSettings.marginTop, bottom: finalSettings.marginBottom },
    styles: {
      fontSize: finalSettings.fontSizeBody,
      cellPadding: 2.5,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle',
      textColor: hexToRgb(finalSettings.textColor),
      font: getFontNameForJsPDF(finalSettings.fontFamily),
    },
    headStyles: {
      fillColor: invoiceDesignSettings?.headerBgColor ? hexToRgb(invoiceDesignSettings.headerBgColor) : hexToRgb(finalSettings.accentColor),
      textColor: invoiceDesignSettings?.headerTextColor ? hexToRgb(invoiceDesignSettings.headerTextColor) : hexToRgb('#FFFFFF'),
      fontStyle: 'bold',
      fontSize: finalSettings.fontSizeHeader - 2,
      halign: 'center',
      valign: 'middle',
      font: getFontNameForJsPDF(finalSettings.fontFamily),
    },
    alternateRowStyles: {
      fillColor: hexToRgb('#F9FAFB'), // Light gray for alternate rows
    },
    bodyStyles: {
      lineColor: hexToRgb('#E5E7EB'), // Light gray border
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

  // ===== WATERMARK =====
  if (invoiceDesignSettings?.watermarkText) {
    doc.setFontSize(50);
    doc.setTextColor(0, 0, 0);
    const gState = new (jsPDF as any).GState({ opacity: invoiceDesignSettings.watermarkOpacity || 0.1 });
    doc.setGState(gState);
    doc.text(invoiceDesignSettings.watermarkText, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    const gStateReset = new (jsPDF as any).GState({ opacity: 1 });
    doc.setGState(gStateReset); // Reset opacity
  }

  // ===== FOOTER =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    const [br, bg, bb] = hexToRgb(finalSettings.accentColor);
    doc.setDrawColor(br, bg, bb);
    doc.line(finalSettings.marginLeft, pageHeight - finalSettings.marginBottom + 3, pageWidth - finalSettings.marginRight, pageHeight - finalSettings.marginBottom + 3);

    // Footer text
    doc.setFontSize(finalSettings.fontSizeBody - 2);
    const [tr, tg, tb] = hexToRgb(finalSettings.textColor);
    doc.setTextColor(tr, tg, tb);
    
    if (finalSettings.showTimestamp) {
      const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
      doc.text(
        `Laporan Booking - ${timestamp}`,
        finalSettings.marginLeft,
        pageHeight - finalSettings.marginBottom + 8
      );
    }

    if (finalSettings.showPageNumber) {
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        pageWidth - finalSettings.marginRight,
        pageHeight - finalSettings.marginBottom + 8,
        { align: 'right' }
      );
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
