import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => any);
  width?: number;
}

export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  // Transform data based on columns
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
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title: string,
  subtitle?: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }

  // Prepare table data
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

  // Footer with date
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
