import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Helper function to convert Hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 15, g: 23, b: 42 }; // Default navy
}

// Document Layout interface
export interface DocumentLayout {
  show_logo: boolean;
  show_header: boolean;
  show_company_info: boolean;
  show_date: boolean;
  show_signature: boolean;
  show_stamp: boolean;
  show_bank_info: boolean;
  footer_text: string;
  page_orientation: 'portrait' | 'landscape';
}

// Company info interface
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  city?: string;
  settings?: {
    invoice_accent_color?: string;
    invoice_show_bank_info?: boolean;
    invoice_show_notes_section?: boolean;
    document_footer_show_timestamp?: boolean;
    document_footer_show_page_number?: boolean;
  };
  layout?: DocumentLayout;
}

// Letter data interfaces
// Surat Cuti Karyawan
interface EmployeeLeaveLetterData {
  employeeName: string;
  employeePosition: string;
  employeeNik: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  destination?: string;
}

// Surat Cuti Jamaah (untuk keperluan ibadah Umrah/Haji)
interface JamaahLeaveLetterData {
  jamaahName: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  address: string;
  employerName: string;
  employerPosition?: string;
  employerInstitution: string;
  employerAddress: string;
  startDate: Date;
  endDate: Date;
  purpose: string; // Umrah/Haji
  departureDate?: Date;
}

// Legacy alias for backward compatibility
interface LeaveLetterData extends EmployeeLeaveLetterData {}

interface PassportLetterData {
  customerName: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  address: string;
  phone: string;
  purpose: string;
  departureDate?: Date;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customer: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  notes?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

// Added for extended invoice data
interface InvoiceDataExtended extends InvoiceData {
  packageName?: string;
  departureDate?: string;
  passengerSummary?: {
    adult?: number;
    child?: number;
    infant?: number;
  };
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
}

interface GeneralLetterData {
  letterNumber: string;
  letterDate: Date;
  recipient: {
    name: string;
    position?: string;
    institution?: string;
    address?: string;
  };
  subject: string;
  content: string;
  signatory: {
    name: string;
    position: string;
  };
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'PT. Umrah Haji Travel',
  address: 'Jl. Raya Utama No. 123, Jakarta Selatan 12345',
  phone: '(021) 1234-5678',
  email: 'info@umrahhaji.com',
  website: 'www.umrahhaji.com'
};

// Helper to add letterhead with logo support
function addLetterhead(doc: jsPDF, company: CompanyInfo = defaultCompanyInfo) {
  const layout = company.layout;
  if (layout?.show_header === false) {
    return 15; // Return minimal Y position if header is hidden
  }

  const pageWidth = doc.internal.pageSize.width;
  
  // Header background color - using accent color if available for invoice
  const accentColor = company.settings?.invoice_accent_color || '#3b82f6'; // Default blue
  const rgb = hexToRgb(accentColor);
  
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add logo if available and enabled
  const showLogo = layout ? layout.show_logo : true;
  if (showLogo && company.logo) {
    try {
      doc.addImage(company.logo, 'PNG', 14, 8, 35, 35);
    } catch (e) {
      // Logo failed to load, continue without it
      console.warn('Failed to load logo:', e);
    }
  }
  
  // Company name (white text on accent background)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const logoOffset = (showLogo && company.logo) ? 55 : 14;
  doc.text(company.name, logoOffset, 22, { align: 'left' });
  
  // Company details (white text on accent background)
  if (layout?.show_company_info !== false) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(company.address, logoOffset, 30, { align: 'left' });
    doc.text(`Telp: ${company.phone} | Email: ${company.email}`, logoOffset, 36, { align: 'left' });
    if (company.website) {
      doc.text(company.website, logoOffset, 42, { align: 'left' });
    }
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 60; // Return starting Y position for content
}

// Helper to add footer
function addFooter(doc: jsPDF, pageNum: number, totalPages: number, company: CompanyInfo = defaultCompanyInfo) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const settings = company.settings;
  const layout = company.layout;
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
  
  doc.setFontSize(8);
  doc.setTextColor(128);
  
  if (settings?.document_footer_show_timestamp !== false) {
    doc.text(
      `Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`,
      14,
      pageHeight - 10
    );
  }

  if (layout?.footer_text) {
    doc.text(layout.footer_text, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }

  if (settings?.document_footer_show_page_number !== false) {
    doc.text(
      `Halaman ${pageNum} dari ${totalPages}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' }
    );
  }
  doc.setTextColor(0);
}

// Generate Invoice
export function generateInvoice(
  data: InvoiceDataExtended,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const layout = company.layout;
  const settings = company.settings;
  const orientation = layout?.page_orientation || 'portrait';
  
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  const accentColor = settings?.invoice_accent_color || '#0f172a'; // Default navy
  const rgbAccent = hexToRgb(accentColor);
  
  let y = addLetterhead(doc, company);
  
  // ── Header Title ─────────────────────────────────────────────────────
  doc.setFillColor(rgbAccent.r, rgbAccent.g, rgbAccent.b);
  doc.rect(14, y - 5, pageWidth - 28, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, y + 8);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, pageWidth - 20, y + 8, { align: 'right' });
  
  y += 25;
  doc.setTextColor(0, 0, 0);

  // ── Info Columns (Customer & Dates) ──────────────────────────────────
  const colW = (pageWidth - 28 - 10) / 2;
  const leftX = 14;
  const rightX = 14 + colW + 10;
  
  // Left: Invoice dates
  doc.setFillColor(248, 250, 252);
  doc.rect(leftX, y - 2, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftX, y - 2, colW, 30);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TANGGAL INVOICE', leftX + 3, y + 4);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(format(data.invoiceDate, 'd MMMM yyyy', { locale: id }), leftX + 3, y + 11);
  
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('TANGGAL JATUH TEMPO', leftX + 3, y + 18);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(format(data.dueDate, 'd MMMM yyyy', { locale: id }), leftX + 3, y + 24);
  
  // Right: customer info box
  doc.setFillColor(248, 250, 252);
  doc.rect(rightX, y - 2, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightX, y - 2, colW, 30);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DITAGIHKAN KEPADA', rightX + 3, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(data.customer.name, rightX + 3, y + 11);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const addrLines = doc.splitTextToSize(data.customer.address, colW - 6);
  doc.text(addrLines, rightX + 3, y + 17);
  
  const addrBottom = y + 17 + (addrLines.length - 1) * 4;
  if (addrBottom < y + 25) {
    doc.text(`Telp: ${data.customer.phone}`, rightX + 3, addrBottom + 4);
  }
  
  y += 36;
  doc.setTextColor(0, 0, 0);

  // ── Package / Departure Info (optional) ──────────────────────────────
  if (data.packageName || data.departureDate) {
    doc.setFillColor(240, 253, 244); // light green
    doc.setDrawColor(134, 239, 172);
    doc.setLineWidth(0.3);
    doc.rect(14, y, pageWidth - 28, 13, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('PAKET', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const pkgText = [data.packageName, data.departureDate ? `Berangkat: ${data.departureDate}` : ''].filter(Boolean).join('  ·  ');
    doc.text(pkgText, 38, y + 5);

    if (data.passengerSummary) {
      const ps = data.passengerSummary;
      const parts = [];
      if (ps.adult) parts.push(`${ps.adult} Dewasa`);
      if (ps.child) parts.push(`${ps.child} Anak`);
      if (ps.infant) parts.push(`${ps.infant} Bayi`);
      if (parts.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(parts.join(' + '), 18, y + 10);
      }
    }

    y += 19;
    doc.setTextColor(0, 0, 0);
  }

  // ── LUNAS watermark stamp (when paid) ────────────────────────────────
  if (data.paymentStatus === 'paid') {
    doc.saveGraphicsState();
    // @ts-ignore - jspdf types might not have GState but it works
    if (typeof doc.GState === 'function') {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.08 }));
    }
    doc.setFontSize(72);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('LUNAS', pageWidth / 2, 180, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }

  // ── Items Table ──────────────────────────────────────────────────────
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['#', 'Deskripsi Layanan', 'Qty', 'Harga Satuan', 'Subtotal']],
    body: tableData,
    styles: { 
      fontSize: 8.5,
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      textColor: [15, 23, 42],
    },
    headStyles: { 
      fillColor: [rgbAccent.r, rgbAccent.g, rgbAccent.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });
  
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 6;
  
  // ── Totals + Payment Summary (side by side) ──────────────────────────
  const totW = 85;
  const totX = pageWidth - 14 - totW;
  
  // Totals panel
  doc.setFillColor(248, 250, 252);
  const totRows = 2 + (data.discount ? 1 : 0) + (data.tax ? 1 : 0) + 2; // rows: sub, disc?, tax?, total line, total
  const totH = totRows * 8 + 6;
  doc.rect(totX, y, totW, totH, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totX, y, totW, totH);
  
  let ty = y + 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  doc.text('Subtotal', totX + 4, ty);
  doc.text(formatCurrency(data.subtotal), totX + totW - 4, ty, { align: 'right' });
  ty += 8;
  
  if (data.discount) {
    doc.setTextColor(239, 68, 68);
    doc.text('Diskon', totX + 4, ty);
    doc.text(`- ${formatCurrency(data.discount)}`, totX + totW - 4, ty, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    ty += 8;
  }
  
  if (data.tax) {
    doc.text('PPN (11%)', totX + 4, ty);
    doc.text(formatCurrency(data.tax), totX + totW - 4, ty, { align: 'right' });
    ty += 8;
  }
  
  // Total separator
  doc.setDrawColor(rgbAccent.r, rgbAccent.g, rgbAccent.b);
  doc.setLineWidth(0.5);
  doc.line(totX + 2, ty - 2, totX + totW - 2, ty - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(rgbAccent.r, rgbAccent.g, rgbAccent.b);
  doc.text('TOTAL', totX + 4, ty + 5);
  doc.text(formatCurrency(data.total), totX + totW - 4, ty + 5, { align: 'right' });
  ty += 14;
  
  // Payment summary rows
  if (data.paidAmount && data.paidAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text('Sudah Dibayar', totX + 4, ty);
    doc.text(formatCurrency(data.paidAmount), totX + totW - 4, ty, { align: 'right' });
    ty += 7;
    
    const remaining = data.remainingAmount || 0;
    doc.setTextColor(remaining > 0 ? 239 : 34, remaining > 0 ? 68 : 197, remaining > 0 ? 68 : 94);
    doc.setFont('helvetica', remaining > 0 ? 'bold' : 'normal');
    doc.text('Sisa Tagihan', totX + 4, ty);
    doc.text(formatCurrency(remaining), totX + totW - 4, ty, { align: 'right' });
  }
  
  y = Math.max(y + totH + 8, ty + 12);
  doc.setTextColor(0, 0, 0);
  
  // ── Bank Info ────────────────────────────────────────────────────────
  const showBank = settings?.invoice_show_bank_info !== false && layout?.show_bank_info !== false;
  const bankInfo = data.bankInfo;
  if (showBank && bankInfo) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setLineWidth(0.3);
    doc.rect(14, y, pageWidth - 28, 26, 'FD');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('INFORMASI PEMBAYARAN', 18, y + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${bankInfo.bankName}  ·  ${bankInfo.accountNumber}  ·  a.n. ${bankInfo.accountName}`, 18, y + 15);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Transfer ke rekening di atas dan sertakan nomor invoice sebagai keterangan.', 18, y + 21);
    
    y += 32;
  }
  
  // ── Notes ────────────────────────────────────────────────────────────
  const showNotes = settings?.invoice_show_notes_section !== false;
  if (showNotes && data.notes) {
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(253, 230, 138);
    doc.setLineWidth(0.3);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.rect(14, y, pageWidth - 28, noteLines.length * 5 + 14, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.text('CATATAN', 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(78, 52, 46);
    doc.text(noteLines, 18, y + 13);
    y += noteLines.length * 5 + 20;
  }

  // ── Signature ────────────────────────────────────────────────────────
  if (layout?.show_signature) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${company.city || 'Jakarta'}, ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
    y += 6;
    doc.text('Hormat kami,', pageWidth - 60, y);
    
    if (layout.show_stamp) {
      // Logic for stamp placeholder or image if available
    }
    
    y += 25;
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, pageWidth - 60, y);
  }
  
  addFooter(doc, 1, 1, company);
  return doc;
}

// Helper to add footer to existing letter functions
// ... (omitted for brevity, keeping original functions but they should ideally use addFooter with company)

// Generate Employee Leave Letter (Surat Cuti Karyawan)
export function generateLeaveLetter(
  data: LeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Lampiran: -', pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Perihal: Permohonan Cuti Karyawan', pageWidth - 14, y, { align: 'right' });
  
  y += 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PERMOHONAN CUTI KARYAWAN', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Yang bertanda tangan di bawah ini:

Nama                : ${data.employeeName}
NIK/NIP            : ${data.employeeNik}
Jabatan            : ${data.employeePosition}

Dengan ini mengajukan permohonan cuti kerja terhitung mulai:

Tanggal Mulai      : ${format(data.startDate, 'd MMMM yyyy', { locale: id })}
Tanggal Selesai    : ${format(data.endDate, 'd MMMM yyyy', { locale: id })}
Alasan Cuti        : ${data.reason}${data.destination ? `\nTujuan/Alamat      : ${data.destination}` : ''}

Demikian surat permohonan cuti ini saya ajukan. Atas perhatian dan persetujuan Bapak/Ibu, saya ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 6 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text('Hormat saya,', pageWidth - 60, y);
  y += 25;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeName, pageWidth - 60, y);
  
  // Approval section
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.text('Disetujui oleh:', 14, y);
  y += 25;
  doc.text('_______________________', 14, y);
  y += 5;
  doc.text('Atasan Langsung', 14, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate Jamaah Leave Letter (Surat Keterangan Cuti Ibadah Umrah/Haji)
export function generateJamaahLeaveLetter(
  data: JamaahLeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: Fotokopi KTP, Paspor', 14, y);
  y += 6;
  doc.text(`Perihal: Permohonan Izin Cuti ${data.purpose}`, 14, y);
  
  y += 12;
  
  // Recipient (Employer)
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employerName, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  if (data.employerPosition) {
    doc.text(data.employerPosition, 14, y);
    y += 6;
  }
  doc.text(data.employerInstitution, 14, y);
  y += 6;
  doc.text(`di ${data.employerAddress}`, 14, y);
  
  y += 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT KETERANGAN CUTI IBADAH', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Dengan hormat,

Yang bertanda tangan di bawah ini, Direktur ${company.name}, dengan ini menerangkan bahwa:

Nama Lengkap       : ${data.jamaahName}
NIK                : ${data.nik}
Tempat/Tgl Lahir   : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}
Alamat             : ${data.address}

Adalah calon jamaah ${data.purpose} yang terdaftar di ${company.name} dan akan menunaikan ibadah ${data.purpose} ke Tanah Suci dengan jadwal sebagai berikut:

Tanggal Berangkat  : ${format(data.startDate, 'd MMMM yyyy', { locale: id })}
Tanggal Kembali    : ${format(data.endDate, 'd MMMM yyyy', { locale: id })}

Sehubungan dengan hal tersebut, kami mohon kesediaan Bapak/Ibu untuk dapat memberikan izin cuti kepada yang bersangkutan selama menunaikan ibadah ${data.purpose}.

Demikian surat keterangan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 5 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth - 70, y);
  y += 25;
  doc.text('___________________', pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Direktur', pageWidth - 70, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate Passport Request Letter (Surat Permohonan Paspor)
export function generatePassportLetter(
  data: PassportLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: -', 14, y);
  y += 6;
  doc.text(`Perihal: Permohonan Pembuatan Paspor ${data.purpose}`, 14, y);
  
  y += 12;
  
  // Recipient
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Kantor Imigrasi', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('di Tempat', 14, y);
  
  y += 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT REKOMENDASI PASPOR', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Dengan hormat,

Yang bertanda tangan di bawah ini, Direktur ${company.name}, dengan ini memberikan rekomendasi kepada:

Nama Lengkap       : ${data.customerName}
NIK                : ${data.nik}
Tempat/Tgl Lahir   : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}
Alamat             : ${data.address}

Bahwa yang bersangkutan adalah benar terdaftar sebagai calon jamaah ${data.purpose} di travel kami dan akan diberangkatkan pada tanggal ${data.departureDate ? format(new Date(data.departureDate), 'd MMMM yyyy', { locale: id }) : 'berikutnya'}.

Sehubungan dengan hal tersebut, kami mohon bantuan Bapak/Ibu untuk dapat memberikan kemudahan dalam proses pembuatan/perpanjangan paspor bagi yang bersangkutan.

Demikian surat rekomendasi ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;

  const lines = doc.splitTextToSize(content, pageWidth - 28);
  doc.text(lines, 14, y);
  
  y += lines.length * 5 + 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth - 70, y);
  y += 25;
  doc.text('___________________', pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Direktur', pageWidth - 70, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate General Letter (Surat Umum)
export function generateGeneralLetter(
  data: GeneralLetterData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  let y = addLetterhead(doc, company);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Letter number and date
  doc.setFontSize(11);
  doc.text(`Nomor: ${data.letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: -', 14, y);
  y += 6;
  doc.text(`Perihal: ${data.subject}`, 14, y);
  
  y += 12;
  
  // Recipient
  doc.text('Kepada Yth.', 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(data.recipient.name, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  if (data.recipient.position) {
    doc.text(data.recipient.position, 14, y);
    y += 6;
  }
  if (data.recipient.institution) {
    doc.text(data.recipient.institution, 14, y);
    y += 6;
  }
  if (data.recipient.address) {
    doc.text(`di ${data.recipient.address}`, 14, y);
    y += 6;
  }
  
  y += 10;
  
  // Content
  doc.text('Dengan hormat,', 14, y);
  y += 8;
  
  const contentLines = doc.splitTextToSize(data.content, pageWidth - 28);
  doc.text(contentLines, 14, y);
  
  y += contentLines.length * 5 + 10;
  
  doc.text('Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.', 14, y);
  
  y += 20;
  
  // Signature
  doc.text(`${company.city || 'Jakarta'}, ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y);
  y += 6;
  doc.text('Hormat kami,', pageWidth - 70, y);
  y += 25;
  doc.setFont('helvetica', 'bold');
  doc.text(data.signatory.name, pageWidth - 70, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.signatory.position, pageWidth - 70, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}
