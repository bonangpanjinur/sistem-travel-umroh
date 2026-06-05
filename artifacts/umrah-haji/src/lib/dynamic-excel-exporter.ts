import * as XLSX from 'xlsx-js-style';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Excel Export Style Configuration
 * These settings are stored in company_settings and can be customized from Admin Panel
 */
export interface ExcelStyleConfig {
  // Title styling
  title_bg_color: string;           // Hex color (e.g., "1E40AF")
  title_text_color: string;         // Hex color (e.g., "FFFFFF")
  title_font_size: number;          // Font size (e.g., 14)
  title_bold: boolean;              // Bold text

  // Header styling
  header_bg_color: string;          // Hex color (e.g., "2563EB")
  header_text_color: string;        // Hex color (e.g., "FFFFFF")
  header_font_size: number;         // Font size (e.g., 10)
  header_bold: boolean;             // Bold text

  // Section header styling
  section_bg_color: string;         // Hex color (e.g., "DBEAFE")
  section_text_color: string;       // Hex color (e.g., "1E3A8A")
  section_font_size: number;        // Font size (e.g., 11)
  section_bold: boolean;            // Bold text

  // Summary/Highlight styling
  summary_bg_color: string;         // Hex color (e.g., "FEF3C7")
  summary_text_color: string;       // Hex color (e.g., "78350F")

  // Row styling
  row_bg_color: string;             // Hex color (e.g., "F9FAFB")
  row_text_color: string;           // Hex color (e.g., "1F2937")
  alt_row_bg_color: string;         // Hex color (e.g., "FFFFFF")

  // Border styling
  border_color: string;             // Hex color (e.g., "E5E7EB")
  border_style: 'thin' | 'medium' | 'thick';

  // Body font size
  body_font_size: number;           // Font size (e.g., 9)
  footer_font_size: number;         // Font size (e.g., 8)
}

/**
 * Default Excel style configuration
 * Used when settings are not available
 */
export const DEFAULT_EXCEL_STYLE: ExcelStyleConfig = {
  title_bg_color: '1E40AF',
  title_text_color: 'FFFFFF',
  title_font_size: 14,
  title_bold: true,

  header_bg_color: '2563EB',
  header_text_color: 'FFFFFF',
  header_font_size: 10,
  header_bold: true,

  section_bg_color: 'DBEAFE',
  section_text_color: '1E3A8A',
  section_font_size: 11,
  section_bold: true,

  summary_bg_color: 'FEF3C7',
  summary_text_color: '78350F',

  row_bg_color: 'F9FAFB',
  row_text_color: '1F2937',
  alt_row_bg_color: 'FFFFFF',

  border_color: 'E5E7EB',
  border_style: 'thin',

  body_font_size: 9,
  footer_font_size: 8,
};

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

export interface BookingData {
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  departure_date: string;
  total_pax: number;
  room_type: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  booking_status: string;
  payment_status: string;
  created_at: string;
  adult_count?: number;
  child_count?: number;
  infant_count?: number;
}

interface PeriodStats {
  totalPax: number;
  totalBookings: number;
  totalRevenue: number;
  byStatus: Record<string, { pax: number; bookings: number }>;
}

/**
 * Export Booking data to Excel with dynamic styling
 */
export function exportDynamicBookingExcel(
  bookings: BookingData[],
  company: CompanyInfo,
  styleConfig: ExcelStyleConfig = DEFAULT_EXCEL_STYLE,
  dateFrom?: Date,
  dateTo?: Date
) {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  let r = 0;

  const BORDER_THIN = { style: styleConfig.border_style as any, color: { rgb: styleConfig.border_color } } as const;
  const ALL_BORDERS = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

  const setCell = (row: number, col: number, value: any, type: 's' | 'n' = 's', style?: any) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    ws[cellRef] = {
      v: value,
      t: type,
      s: style || { border: ALL_BORDERS }
    };
  };

  // ===== COMPANY HEADER SECTION =====
  // Company Name
  setCell(r, 0, company.name.toUpperCase(), 's', {
    font: { bold: true, color: { rgb: styleConfig.title_bg_color }, sz: 16 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;

  // Company Address
  setCell(r, 0, company.address, 's', {
    font: { bold: false, color: { rgb: '4B5563' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;

  // Company Contact (Phone & Email)
  const contactInfo = `Telp: ${company.phone} | Email: ${company.email}${company.website ? ` | Web: ${company.website}` : ''}`;
  setCell(r, 0, contactInfo, 's', {
    font: { bold: false, color: { rgb: '4B5563' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;

  // Separator Line
  setCell(r, 0, '', 's', {
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.title_bg_color } },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;
  r++; // Empty space

  // ===== Title Section =====
  setCell(r, 0, 'LAPORAN DATA BOOKING', 's', {
    font: { bold: styleConfig.title_bold, color: { rgb: styleConfig.title_text_color }, sz: styleConfig.title_font_size },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.title_bg_color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;

  // Date range
  if (dateFrom || dateTo) {
    const dateRange = formatDateRange(dateFrom, dateTo);
    setCell(r, 0, `Periode: ${dateRange}`, 's', {
      font: { bold: false, color: { rgb: styleConfig.row_text_color }, sz: styleConfig.body_font_size },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.alt_row_bg_color } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
    r++;
  }

  r++; // Empty row

  // ===== Summary Section =====
  const totalRevenue = bookings.reduce((sum, b) => sum + b.total_price, 0);
  const totalPaid = bookings.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalPax = bookings.reduce((sum, b) => sum + b.total_pax, 0);
  const totalAdult = bookings.reduce((sum, b) => sum + (b.adult_count ?? b.total_pax ?? 0), 0);
  const totalChild = bookings.reduce((sum, b) => sum + (b.child_count ?? 0), 0);
  const totalInfant = bookings.reduce((sum, b) => sum + (b.infant_count ?? 0), 0);

  const summaryData = [
    ['Total Booking', bookings.length.toString()],
    ['Total Jamaah', totalPax.toString()],
    ['  › Dewasa', totalAdult.toString()],
    ['  › Anak', totalChild.toString()],
    ['  › Bayi', totalInfant.toString()],
    ['Total Pendapatan', formatCurrency(totalRevenue)],
    ['Total Terbayar', formatCurrency(totalPaid)],
  ];

  setCell(r, 0, 'RINGKASAN', 's', {
    font: { bold: styleConfig.section_bold, color: { rgb: styleConfig.summary_text_color }, sz: styleConfig.section_font_size },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.summary_bg_color } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 14 } });
  r++;

  for (const [label, value] of summaryData) {
    setCell(r, 0, label, 's', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.row_bg_color } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: ALL_BORDERS,
    });
    setCell(r, 1, value, typeof value === 'number' ? 'n' : 's', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.alt_row_bg_color } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: ALL_BORDERS,
    });
    merges.push({ s: { r, c: 1 }, e: { r, c: 14 } });
    r++;
  }

  r++; // Empty row

  // ===== Table Headers =====
  const headers = ['Kode Booking', 'Customer', 'Telepon', 'Paket', 'Keberangkatan', 'Pax', 'Kamar', 'Total', 'Dibayar', 'Sisa', 'Status Booking', 'Status Bayar', 'Dewasa', 'Anak', 'Bayi'];
  headers.forEach((h, c) => {
    setCell(r, c, h, 's', {
      font: { bold: styleConfig.header_bold, color: { rgb: styleConfig.header_text_color }, sz: styleConfig.header_font_size },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.header_bg_color } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: ALL_BORDERS,
    });
  });
  r++;

  // ===== Table Data =====
  bookings.forEach((booking, idx) => {
    const isAltRow = idx % 2 === 0;
    const bgColor = isAltRow ? styleConfig.row_bg_color : styleConfig.alt_row_bg_color;

    const rowData = [
      booking.booking_code,
      booking.customer_name,
      booking.customer_phone,
      booking.package_name,
      format(new Date(booking.departure_date), 'd MMM yy', { locale: id }),
      booking.total_pax.toString(),
      booking.room_type,
      formatCurrency(booking.total_price),
      formatCurrency(booking.paid_amount),
      formatCurrency(booking.remaining_amount),
      formatStatus(booking.booking_status),
      formatPaymentStatus(booking.payment_status),
      (booking.adult_count ?? booking.total_pax).toString(),
      (booking.child_count ?? 0).toString(),
      (booking.infant_count ?? 0).toString(),
    ];

    rowData.forEach((value, c) => {
      const isNumeric = c >= 7 && c <= 9; // Currency columns
      const paxTypeCol = c >= 12; // Dewasa/Anak/Bayi columns
      setCell(r, c, value, isNumeric ? 'n' : 's', {
        font: { bold: false, color: { rgb: styleConfig.row_text_color }, sz: styleConfig.body_font_size },
        fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
        alignment: { horizontal: (c >= 7 && c <= 9) || paxTypeCol ? 'center' : 'left', vertical: 'center' },
        border: ALL_BORDERS,
      });
    });
    r++;
  });

  r++; // Empty row

  // ===== Footer =====
  const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
  setCell(r, 0, `Dicetak pada: ${timestamp}`, 's', {
    font: { italic: true, color: { rgb: '6B7280' }, sz: styleConfig.footer_font_size },
    alignment: { horizontal: 'left', vertical: 'center' },
  });

  // ===== Finalize Sheet =====
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: 14 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 18 }, // Kode Booking
    { wch: 20 }, // Customer
    { wch: 15 }, // Telepon
    { wch: 25 }, // Paket
    { wch: 14 }, // Keberangkatan
    { wch: 8 },  // Pax
    { wch: 12 }, // Kamar
    { wch: 15 }, // Total
    { wch: 15 }, // Dibayar
    { wch: 15 }, // Sisa
    { wch: 14 }, // Status Booking
    { wch: 12 }, // Status Bayar
    { wch: 9 },  // Dewasa
    { wch: 7 },  // Anak
    { wch: 7 },  // Bayi
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Booking');

  const filename = `Laporan_Booking_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export Statistics data to Excel with dynamic styling
 */
export function exportDynamicStatisticsExcel(
  stats: PeriodStats,
  company: CompanyInfo,
  periodLabel: string,
  dateFrom: string,
  dateTo: string,
  styleConfig: ExcelStyleConfig = DEFAULT_EXCEL_STYLE
) {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  let r = 0;

  const BORDER_THIN = { style: styleConfig.border_style as any, color: { rgb: styleConfig.border_color } } as const;
  const ALL_BORDERS = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

  const setCell = (row: number, col: number, value: any, type: 's' | 'n' = 's', style?: any) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    ws[cellRef] = {
      v: value,
      t: type,
      s: style || { border: ALL_BORDERS }
    };
  };

  // ===== COMPANY HEADER SECTION =====
  // Company Name
  setCell(r, 0, company.name.toUpperCase(), 's', {
    font: { bold: true, color: { rgb: styleConfig.title_bg_color }, sz: 16 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Company Address
  setCell(r, 0, company.address, 's', {
    font: { bold: false, color: { rgb: '4B5563' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Company Contact (Phone & Email)
  const contactInfo = `Telp: ${company.phone} | Email: ${company.email}${company.website ? ` | Web: ${company.website}` : ''}`;
  setCell(r, 0, contactInfo, 's', {
    font: { bold: false, color: { rgb: '4B5563' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Separator Line
  setCell(r, 0, '', 's', {
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.title_bg_color } },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;
  r++; // Empty space

  // ===== Title Section =====
  setCell(r, 0, 'LAPORAN STATISTIK JAMAAH', 's', {
    font: { bold: styleConfig.title_bold, color: { rgb: styleConfig.title_text_color }, sz: styleConfig.title_font_size },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.title_bg_color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Period label
  setCell(r, 0, `Periode: ${periodLabel}`, 's', {
    font: { bold: true, color: { rgb: styleConfig.section_text_color }, sz: 10 },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.section_bg_color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  r++; // Empty row

  // ===== Summary Section =====
  setCell(r, 0, 'RINGKASAN', 's', {
    font: { bold: styleConfig.section_bold, color: { rgb: styleConfig.summary_text_color }, sz: styleConfig.section_font_size },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.summary_bg_color } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  const summaryData = [
    ['Tanggal Dari', dateFrom],
    ['Tanggal Sampai', dateTo],
    ['Total Jamaah', stats.totalPax],
    ['Total Booking', stats.totalBookings],
    ['Total Revenue', formatCurrency(stats.totalRevenue)],
  ];

  for (const [label, value] of summaryData) {
    setCell(r, 0, label, 's', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.row_bg_color } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: ALL_BORDERS,
    });
    setCell(r, 1, value, typeof value === 'number' ? 'n' : 's', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.alt_row_bg_color } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: ALL_BORDERS,
    });
    merges.push({ s: { r, c: 1 }, e: { r, c: 4 } });
    r++;
  }

  r++; // Empty row

  // ===== Status Breakdown Section =====
  setCell(r, 0, 'KOMPOSISI PER STATUS BOOKING', 's', {
    font: { bold: styleConfig.header_bold, color: { rgb: styleConfig.header_text_color }, sz: styleConfig.section_font_size },
    fill: { patternType: 'solid', fgColor: { rgb: styleConfig.header_bg_color } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: ALL_BORDERS,
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Headers
  const headers = ['Status Booking', 'Jumlah Jamaah', 'Jumlah Booking', 'Persentase Jamaah', 'Rata-rata'];
  headers.forEach((h, c) => {
    setCell(r, c, h, 's', {
      font: { bold: styleConfig.header_bold, color: { rgb: styleConfig.header_text_color }, sz: styleConfig.header_font_size },
      fill: { patternType: 'solid', fgColor: { rgb: styleConfig.header_bg_color } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: ALL_BORDERS,
    });
  });
  r++;

  // Status data
  const statusLabels: Record<string, string> = {
    confirmed: 'Terkonfirmasi',
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
  };

  const statusOrder = ['confirmed', 'pending', 'processing', 'completed'];
  statusOrder.forEach((status, idx) => {
    const stat = stats.byStatus[status] || { pax: 0, bookings: 0 };
    const pct = stats.totalPax > 0 ? ((stat.pax / stats.totalPax) * 100).toFixed(1) : '0';
    const avgPax = stat.bookings > 0 ? (stat.pax / stat.bookings).toFixed(1) : '0';
    const isAltRow = idx % 2 === 0;
    const bgColor = isAltRow ? styleConfig.row_bg_color : styleConfig.alt_row_bg_color;

    const statusLabel = statusLabels[status] || status;

    setCell(r, 0, statusLabel, 's', {
      font: { bold: false, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: ALL_BORDERS,
    });

    setCell(r, 1, stat.pax, 'n', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    });

    setCell(r, 2, stat.bookings, 'n', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    });

    setCell(r, 3, `${pct}%`, 's', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    });

    setCell(r, 4, parseFloat(avgPax), 'n', {
      font: { bold: true, color: { rgb: styleConfig.row_text_color } },
      fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
      numFmt: '0.0',
    });

    r++;
  });

  r++; // Empty row

  // ===== Footer =====
  const timestamp = format(new Date(), 'd MMMM yyyy HH:mm', { locale: id });
  setCell(r, 0, `Dicetak pada: ${timestamp}`, 's', {
    font: { italic: true, color: { rgb: '6B7280' }, sz: styleConfig.footer_font_size },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });

  // ===== Finalize Sheet =====
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: 4 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 25 }, // A
    { wch: 18 }, // B
    { wch: 18 }, // C
    { wch: 20 }, // D
    { wch: 22 }, // E
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Statistik Jamaah');

  const filename = `statistik-jamaah-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`;
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ===== Helper Functions =====

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
