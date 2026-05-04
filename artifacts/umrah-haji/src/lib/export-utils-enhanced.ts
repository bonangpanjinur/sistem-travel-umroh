import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatCurrency } from './format';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => any);
  width?: number;
}

/**
 * Export package list to Excel with detailed information
 */
export function exportPackagesToExcel(
  packages: any[],
  filename: string = 'Daftar_Paket'
) {
  const columns = [
    { header: 'Kode', accessor: 'code', width: 12 },
    { header: 'Nama Paket', accessor: 'name', width: 35 },
    { header: 'Tipe', accessor: (r: any) => r.package_type_ref?.name || r.package_type, width: 15 },
    { header: 'Durasi', accessor: (r: any) => `${r.duration_days} Hari`, width: 10 },
    { header: 'Harga Mulai', accessor: (r: any) => r.min_price || 0, width: 20 },
    { header: 'Hotel Makkah', accessor: (r: any) => r.hotel_makkah?.name || '-', width: 25 },
    { header: 'Hotel Madinah', accessor: (r: any) => r.hotel_madinah?.name || '-', width: 25 },
    { header: 'Pesawat', accessor: (r: any) => r.airline?.name || '-', width: 20 },
    { header: 'Status', accessor: (r: any) => r.is_active ? 'Aktif' : 'Nonaktif', width: 12 },
  ];

  const exportData = packages.map(row => {
    const exportRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      exportRow[col.header] = value ?? '';
    });
    return exportRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Packages');
  
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

/**
 * Export package capacity statistics to Excel
 */
export function exportCapacityStatsToExcel(
  packages: any[],
  filename: string = 'Statistik_Kapasitas'
) {
  const data = packages.map(pkg => {
    const upcoming = (pkg.departures || [])
      .filter((d: any) => {
        const today = new Date().toISOString().split('T')[0];
        return d.departure_date >= today && d.status === 'open';
      });

    const totalQuota = upcoming.reduce((sum: number, d: any) => sum + (d.quota || 0), 0);
    const totalBooked = upcoming.reduce((sum: number, d: any) => sum + (d.booked_count || 0), 0);
    const occupancyRate = totalQuota > 0 ? (totalBooked / totalQuota) * 100 : 0;
    const availableSeats = totalQuota - totalBooked;

    return {
      'Kode Paket': pkg.code,
      'Nama Paket': pkg.name,
      'Keberangkatan Aktif': upcoming.length,
      'Total Kuota': totalQuota,
      'Terjual': totalBooked,
      'Tersedia': availableSeats,
      'Persentase Terisi': `${occupancyRate.toFixed(1)}%`,
      'Status': pkg.is_active ? 'Aktif' : 'Nonaktif',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kapasitas');
  
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

/**
 * Export departure schedule to Excel
 */
export function exportDepartureScheduleToExcel(
  packages: any[],
  filename: string = 'Jadwal_Keberangkatan'
) {
  const departures: any[] = [];

  packages.forEach(pkg => {
    (pkg.departures || []).forEach((dep: any) => {
      const today = new Date().toISOString().split('T')[0];
      if (dep.departure_date >= today && dep.status === 'open') {
        departures.push({
          'Kode Paket': pkg.code,
          'Nama Paket': pkg.name,
          'Tanggal Berangkat': format(new Date(dep.departure_date), 'dd/MM/yyyy', { locale: id }),
          'Kuota': dep.quota,
          'Terjual': dep.booked_count || 0,
          'Tersedia': (dep.quota - (dep.booked_count || 0)),
          'Harga Quad': dep.price_quad || 0,
          'Harga Triple': dep.price_triple || 0,
          'Harga Double': dep.price_double || 0,
          'Harga Single': dep.price_single || 0,
          'Status': dep.status,
        });
      }
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(departures);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal');
  
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

/**
 * Export package summary report to PDF
 */
export function exportPackageSummaryPDF(
  packages: any[],
  filename: string = 'Laporan_Ringkas_Paket'
) {
  const doc = new jsPDF({ orientation: 'portrait' });
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN RINGKAS PAKET PERJALANAN', 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`, 14, 28);
  doc.setTextColor(0);

  // Summary Stats
  const totalPackages = packages.length;
  const activePackages = packages.filter(p => p.is_active).length;
  const totalDepartures = packages.reduce((sum, p) => sum + (p.departures?.length || 0), 0);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN STATISTIK', 14, 38);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Paket: ${totalPackages}`, 20, 46);
  doc.text(`Paket Aktif: ${activePackages}`, 20, 52);
  doc.text(`Total Keberangkatan: ${totalDepartures}`, 20, 58);

  // Package Table
  const headers = ['Kode', 'Nama Paket', 'Durasi', 'Status', 'Keberangkatan'];
  const rows = packages.map(pkg => [
    pkg.code,
    pkg.name.substring(0, 30),
    `${pkg.duration_days} Hari`,
    pkg.is_active ? 'Aktif' : 'Nonaktif',
    (pkg.departures?.filter((d: any) => {
      const today = new Date().toISOString().split('T')[0];
      return d.departure_date >= today && d.status === 'open';
    }).length || 0).toString(),
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 68,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}

/**
 * Export to Excel with custom columns
 */
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  const exportData = data.map(row => {
    const exportRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      exportRow[col.header] = value ?? '';
    });
    return exportRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export to PDF with custom columns
 */
export function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title: string,
  subtitle?: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }

  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => {
      const value = typeof col.accessor === 'function' 
        ? col.accessor(row) 
        : row[col.accessor];
      return value ?? '';
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 38 : 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })} - Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

export function formatDateRange(startDate?: Date, endDate?: Date): string {
  if (!startDate && !endDate) return 'Semua Periode';
  if (startDate && endDate) {
    return `${format(startDate, 'd MMM yyyy', { locale: id })} - ${format(endDate, 'd MMM yyyy', { locale: id })}`;
  }
  if (startDate) return `Dari ${format(startDate, 'd MMM yyyy', { locale: id })}`;
  if (endDate) return `Sampai ${format(endDate, 'd MMM yyyy', { locale: id })}`;
  return '';
}
