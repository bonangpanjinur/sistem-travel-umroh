import * as XLSX from 'xlsx-js-style';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// ===== Style Constants =====
const HEADER_BG = '2563EB'; // Blue
const HEADER_FG = 'FFFFFF'; // White
const TITLE_BG = '1E40AF'; // Dark Blue
const TITLE_FG = 'FFFFFF';
const SECTION_BG = 'DBEAFE'; // Light Blue
const SECTION_FG = '1E3A8A'; // Dark Blue
const SUMMARY_BG = 'FEF3C7'; // Light Yellow
const SUMMARY_FG = '78350F'; // Dark Yellow
const BORDER_THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

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
  stats: PeriodStats;
}

export function exportBookingStatsToExcel(options: ExportOptions) {
  const { periodLabel, dateFrom, dateTo, stats } = options;
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  let r = 0;

  // ===== Title Section =====
  ws[`A${r + 1}`] = {
    v: 'LAPORAN STATISTIK JAMAAH',
    t: 's',
    s: {
      font: { bold: true, color: { rgb: TITLE_FG }, sz: 14 },
      fill: { patternType: 'solid', fgColor: { rgb: TITLE_BG } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Subtitle with period
  ws[`A${r + 1}`] = {
    v: `Periode: ${periodLabel}`,
    t: 's',
    s: {
      font: { bold: true, color: { rgb: SECTION_FG }, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: SECTION_BG } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Empty row
  r++;

  // ===== Summary Section =====
  ws[`A${r + 1}`] = {
    v: 'RINGKASAN',
    t: 's',
    s: {
      font: { bold: true, color: { rgb: SUMMARY_FG }, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: SUMMARY_BG } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Summary data
  const summaryData = [
    ['Tanggal Dari', dateFrom],
    ['Tanggal Sampai', dateTo],
    ['Total Jamaah', stats.totalPax.toString()],
    ['Total Booking', stats.totalBookings.toString()],
    ['Total Revenue', formatCurrency(stats.totalRevenue)],
  ];

  for (const [label, value] of summaryData) {
    ws[`A${r + 1}`] = {
      v: label,
      t: 's',
      s: {
        font: { bold: true, color: { rgb: '1F2937' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: ALL_BORDERS,
      },
    };
    ws[`B${r + 1}`] = {
      v: value,
      t: 's',
      s: {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: ALL_BORDERS,
      },
    };
    merges.push({ s: { r, c: 1 }, e: { r, c: 4 } });
    r++;
  }

  // Empty row
  r++;

  // ===== Status Breakdown Section =====
  ws[`A${r + 1}`] = {
    v: 'KOMPOSISI PER STATUS BOOKING',
    t: 's',
    s: {
      font: { bold: true, color: { rgb: HEADER_FG }, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: ALL_BORDERS,
    },
  };
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;

  // Headers
  const headers = ['Status Booking', 'Jumlah Jamaah', 'Jumlah Booking', 'Persentase Jamaah', 'Rata-rata Jamaah/Booking'];
  for (let c = 0; c < headers.length; c++) {
    ws[String.fromCharCode(65 + c) + (r + 1)] = {
      v: headers[c],
      t: 's',
      s: {
        font: { bold: true, color: { rgb: HEADER_FG }, sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: ALL_BORDERS,
      },
    };
  }
  r++;

  // Status data
  const statusLabels: Record<string, string> = {
    confirmed: 'Terkonfirmasi',
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
  };

  const statusOrder = ['confirmed', 'pending', 'processing', 'completed'];
  for (const status of statusOrder) {
    const stat = stats.byStatus[status] || { pax: 0, bookings: 0 };
    const pct = stats.totalPax > 0 ? ((stat.pax / stats.totalPax) * 100).toFixed(1) : '0';
    const avgPax = stat.bookings > 0 ? (stat.pax / stat.bookings).toFixed(1) : '0';

    const statusLabel = statusLabels[status] || status;

    ws[`A${r + 1}`] = {
      v: statusLabel,
      t: 's',
      s: {
        font: { bold: false, color: { rgb: '1F2937' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: ALL_BORDERS,
      },
    };

    ws[`B${r + 1}`] = {
      v: stat.pax,
      t: 'n',
      s: {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: ALL_BORDERS,
        numFmt: '0',
      },
    };

    ws[`C${r + 1}`] = {
      v: stat.bookings,
      t: 'n',
      s: {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: ALL_BORDERS,
        numFmt: '0',
      },
    };

    ws[`D${r + 1}`] = {
      v: `${pct}%`,
      t: 's',
      s: {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: ALL_BORDERS,
      },
    };

    ws[`E${r + 1}`] = {
      v: parseFloat(avgPax),
      t: 'n',
      s: {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: ALL_BORDERS,
        numFmt: '0.0',
      },
    };

    r++;
  }

  // Empty row
  r++;

  // ===== Footer =====
  const now = new Date();
  const timestamp = format(now, 'd MMMM yyyy HH:mm', { locale: id });
  ws[`A${r + 1}`] = {
    v: `Dicetak pada: ${timestamp}`,
    t: 's',
    s: {
      font: { italic: true, color: { rgb: '6B7280' }, sz: 9 },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  };

  // ===== Set column widths =====
  ws['!cols'] = [
    { wch: 25 }, // A
    { wch: 18 }, // B
    { wch: 18 }, // C
    { wch: 20 }, // D
    { wch: 22 }, // E
  ];

  // ===== Set row heights =====
  ws['!rows'] = [
    { hpx: 28 }, // Title
    { hpx: 24 }, // Subtitle
    { hpx: 8 },  // Empty
    { hpx: 20 }, // Summary header
  ];

  // ===== Set worksheet range =====
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: r, c: 4 }
  });

  // ===== Merge cells =====
  ws['!merges'] = merges;

  // Create workbook and export
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Statistik Jamaah');

  const filename = `statistik-jamaah-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${format(now, 'yyyy-MM-dd')}`;
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
