import jsPDF from 'jspdf';
import { drawPaymentWatermark } from './pdf/watermark';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Helper function to convert image URL to Base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to convert image to base64:', e);
    throw e;
  }
}

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
  show_logo?: boolean; // Jika tidak diset, gunakan global_show_logo
  show_header?: boolean;
  show_company_info?: boolean;
  show_date?: boolean;
  show_signature?: boolean;
  show_stamp?: boolean;
  show_bank_info?: boolean;
  footer_text?: string;
  page_orientation?: 'portrait' | 'landscape'; // Jika tidak diset, gunakan global_page_orientation
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
    // Global / legacy
    invoice_accent_color?: string;
    invoice_show_bank_info?: boolean;
    invoice_show_notes_section?: boolean;
    invoice_show_package_info?: boolean;
    invoice_watermark_paid?: boolean;
    document_footer_show_timestamp?: boolean;
    document_footer_show_page_number?: boolean;
    pdf_default_font?: 'helvetica' | 'times' | 'courier';
    // Passport letter overrides
    passport_letter_page_orientation?: 'portrait' | 'landscape';
    passport_letter_font_family?: 'helvetica' | 'times' | 'courier';
    passport_letter_accent_color?: string;
    passport_letter_show_photo?: boolean;
    passport_letter_show_qr_code?: boolean;
    // Leave permit overrides
    leave_permit_page_orientation?: 'portrait' | 'landscape';
    leave_permit_font_family?: 'helvetica' | 'times' | 'courier';
    leave_permit_accent_color?: string;
    leave_permit_include_company_logo?: boolean;
    // Certificate overrides
    certificate_page_orientation?: 'portrait' | 'landscape';
    certificate_font_family?: 'helvetica' | 'times' | 'courier';
    certificate_border_color?: string;
    certificate_text_color?: string;
    certificate_background_image_url?: string;
    // General letter overrides
    general_letter_page_orientation?: 'portrait' | 'landscape';
    general_letter_font_family?: 'helvetica' | 'times' | 'courier';
    general_letter_accent_color?: string;
    general_letter_show_letterhead?: boolean;
  };
  layout?: DocumentLayout;
}

// Letter data interfaces
// Surat Cuti Karyawan
export interface EmployeeLeaveLetterData {
  employeeName: string;
  employeePosition: string;
  employeeNik: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  destination?: string;
}

// Surat Cuti Jamaah (untuk keperluan ibadah Umrah/Haji)
export interface JamaahLeaveLetterData {
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
export interface LeaveLetterData extends EmployeeLeaveLetterData {}

export interface PassportLetterData {
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
export interface InvoiceDataExtended extends InvoiceData {
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

export interface GeneralLetterData {
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

export interface ETicketData {
  bookingCode: string;
  passengerName: string;
  passportNumber: string;
  packageName: string;
  departureDate: Date;
  returnDate: Date;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber?: string;
  airline?: string;
  departureTime?: string;
  hotelMakkah?: string;
  hotelMadinah?: string;
  roomType: string;
  seatNumber?: string;
}

export interface UmrahCertificateData {
  participantName: string;
  passportNumber: string;
  birthPlace: string;
  birthDate: Date;
  packageName: string;
  departureDate: Date;
  returnDate: Date;
  certificateNumber: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'PT. Umrah Haji Travel',
  address: 'Jl. Raya Utama No. 123, Jakarta Selatan 12345',
  phone: '(021) 1234-5678',
  email: 'info@umrahhaji.com',
  website: 'www.umrahhaji.com'
};

// Helper to add letterhead with logo support
// Uses the override hierarchy: Document layout > Global settings > Defaults
function addLetterhead(doc: jsPDF, company: CompanyInfo = defaultCompanyInfo) {
  const layout = company.layout;
  // If document-specific layout hides header, skip letterhead
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
  // Priority: Document layout override > Global setting > Default (true)
  const showLogo = layout?.show_logo !== undefined ? layout.show_logo : true;
  let logoLoaded = false;
  if (showLogo && company.logo) {
    try {
      // Detect format from base64 string or use JPEG as fallback
      let format = 'PNG';
      if (company.logo.startsWith('data:image/jpeg') || company.logo.startsWith('data:image/jpg')) {
        format = 'JPEG';
      } else if (company.logo.startsWith('data:image/webp')) {
        format = 'WEBP';
      }
      
      doc.addImage(company.logo, format, 14, 8, 32, 32);
      logoLoaded = true;
    } catch (e) {
      // Logo failed to load, continue without it
      console.warn('Failed to load logo:', e);
    }
  }
  
  // Company name (white text on accent background)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(doc.getFont().fontName, 'bold');
  const logoOffset = logoLoaded ? 52 : 14;
  const textMaxWidth = pageWidth - logoOffset - 14;
  
  doc.text(company.name, logoOffset, 18, { align: 'left' });
  
  // Company details (white text on accent background)
  // Priority: Document layout override > Global setting > Default (true)
  if (layout?.show_company_info !== false) {
    doc.setFontSize(8.5);
    doc.setFont(doc.getFont().fontName, 'normal');
    
    // Use splitTextToSize for address to handle long text
    const addressLines = doc.splitTextToSize(company.address, textMaxWidth);
    doc.text(addressLines, logoOffset, 25, { align: 'left' });
    
    // Calculate Y for next info based on address lines
    const nextY = 25 + (addressLines.length * 4.5);
    doc.text(`Telp: ${company.phone} | Email: ${company.email}`, logoOffset, nextY, { align: 'left' });
    
    if (company.website) {
      doc.text(company.website, logoOffset, nextY + 5, { align: 'left' });
    }
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 60; // Return starting Y position for content
}

// Helper to add footer
// Uses the override hierarchy: Document layout > Global settings > Defaults
function addFooter(doc: jsPDF, pageNum: number, totalPages: number, company: CompanyInfo = defaultCompanyInfo) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const settings = company.settings;
  const layout = company.layout; // Contains per-document overrides
  
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
export async function generateInvoice(
  data: InvoiceDataExtended,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  // Pre-process logo if it's a URL
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  
  // Extract layout and settings
  const layout = company.layout;
  const settings = company.settings;
  
  const orientation = layout?.page_orientation || 'portrait';
  const font = settings?.pdf_default_font || 'helvetica';
  
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont(font);

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
  doc.setFont(font, 'bold');
  doc.text('INVOICE', 20, y + 8);
  
  doc.setFontSize(9);
  doc.setFont(font, 'normal');
  doc.text(data.invoiceNumber, pageWidth - 20, y + 8, { align: 'right' });
  
  y += 25;
  doc.setTextColor(0, 0, 0);

  // ── Info Columns (Customer & Dates) ──────────────────────────────────
  const colW = (pageWidth - 28 - 10) / 2;
  const leftX = 14;
  const rightX = 14 + colW + 10;
  
  if (layout?.show_date !== false) {
    doc.setFillColor(248, 250, 252);
    doc.rect(leftX, y - 2, colW, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(leftX, y - 2, colW, 30);
    
    doc.setFontSize(7.5);
    doc.setFont(font, 'bold');
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
  }
  
  doc.setFillColor(248, 250, 252);
  doc.rect(rightX, y - 2, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightX, y - 2, colW, 30);
  
  doc.setFontSize(7.5);
  doc.setFont(font, 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DITAGIHKAN KEPADA', rightX + 3, y + 4);
  doc.setFont(font, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(data.customer.name, rightX + 3, y + 11);
  
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const addrLines = doc.splitTextToSize(data.customer.address, colW - 6);
  doc.text(addrLines, rightX + 3, y + 17);
  
  y += 36;
  doc.setTextColor(0, 0, 0);

  // ── Package / Departure Info (optional) ──────────────────────────────
  if (settings?.invoice_show_package_info !== false && (data.packageName || data.departureDate)) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(134, 239, 172);
    doc.setLineWidth(0.3);
    doc.rect(14, y, pageWidth - 28, 13, 'FD');

    doc.setFontSize(7.5);
    doc.setFont(font, 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('PAKET', 18, y + 5);
    doc.setFont(font, 'normal');
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
        doc.setFont(font, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(parts.join(' + '), 18, y + 10);
      }
    }

    y += 19;
    doc.setTextColor(0, 0, 0);
  }

  // ── LUNAS watermark stamp (when paid) ────────────────────────────────
  if (data.paymentStatus === 'paid' && settings?.invoice_watermark_paid !== false) {
    doc.saveGraphicsState();
    // @ts-ignore
    if (typeof doc.GState === 'function') {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.08 }));
    }
    doc.setFontSize(72);
    doc.setFont(font, 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('LUNAS', pageWidth / 2, 180, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }

  // ── Items Table ────────────────────────────────────────────────────
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
      font: font,
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
  
  doc.setFillColor(248, 250, 252);
  const totRows = 2 + (data.discount ? 1 : 0) + (data.tax ? 1 : 0) + 2;
  const totH = totRows * 8 + 6;
  doc.rect(totX, y, totW, totH, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totX, y, totW, totH);
  
  let ty = y + 7;
  doc.setFontSize(8.5);
  doc.setFont(font, 'normal');
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
  
  doc.setDrawColor(rgbAccent.r, rgbAccent.g, rgbAccent.b);
  doc.setLineWidth(0.5);
  doc.line(totX + 2, ty - 2, totX + totW - 2, ty - 2);
  
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(rgbAccent.r, rgbAccent.g, rgbAccent.b);
  doc.text('TOTAL', totX + 4, ty + 5);
  doc.text(formatCurrency(data.total), totX + totW - 4, ty + 5, { align: 'right' });
  ty += 14;
  
  if (data.paidAmount && data.paidAmount > 0) {
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text('Sudah Dibayar', totX + 4, ty);
    doc.text(formatCurrency(data.paidAmount), totX + totW - 4, ty, { align: 'right' });
    ty += 7;
    
    const remaining = data.remainingAmount || 0;
    doc.setTextColor(remaining > 0 ? 239 : 34, remaining > 0 ? 68 : 197, remaining > 0 ? 68 : 94);
    doc.setFont(font, remaining > 0 ? 'bold' : 'normal');
    doc.text('Sisa Tagihan', totX + 4, ty);
    doc.text(formatCurrency(remaining), totX + totW - 4, ty, { align: 'right' });
  }
  
  y = Math.max(y + totH + 8, ty + 12);
  
  // ── Bank Info ──────────────────────────────────────────────────────
  const showBank = layout?.show_bank_info !== false && settings?.invoice_show_bank_info !== false;
  const bankInfo = data.bankInfo;
  if (showBank && bankInfo) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setLineWidth(0.3);
    doc.rect(14, y, pageWidth - 28, 26, 'FD');
    
    doc.setFontSize(8);
    doc.setFont(font, 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('INFORMASI PEMBAYARAN', 18, y + 7);
    
    doc.setFont(font, 'normal');
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
    
    doc.setFont(font, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.text('CATATAN', 18, y + 7);
    doc.setFont(font, 'normal');
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
    doc.setFont(font, 'normal');
    doc.text(`${company.city || 'Jakarta'}, ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
    y += 6;
    doc.text('Hormat kami,', pageWidth - 60, y);
    
    if (layout.show_stamp) {
      // Stamp logic
    }
    
    y += 25;
    doc.setFont(font, 'bold');
    doc.text(company.name, pageWidth - 60, y);
  }
  
  addFooter(doc, 1, 1, company);
  return doc;
}

// Generate Employee Leave Letter (Surat Cuti Karyawan)
export async function generateLeaveLetter(
  data: LeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  const settings = company.settings;
  const font = settings?.leave_permit_font_family || settings?.pdf_default_font || 'helvetica';
  const orientation = settings?.leave_permit_page_orientation || 'portrait';
  const accentColor = settings?.leave_permit_accent_color || settings?.invoice_accent_color;
  const includeLogo = settings?.leave_permit_include_company_logo !== false;
  const resolvedCompany: CompanyInfo = {
    ...company,
    settings: accentColor ? { ...settings, invoice_accent_color: accentColor } : settings,
    layout: { ...(company.layout || {}), show_logo: includeLogo },
  };
  const doc = new jsPDF({ orientation: orientation as any, unit: 'mm', format: 'a4' });
  doc.setFont(font);
  let y = addLetterhead(doc, resolvedCompany);
  
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Lampiran: -', pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text('Perihal: Permohonan Cuti Karyawan', pageWidth - 14, y, { align: 'right' });
  
  y += 15;
  
  doc.setFontSize(14);
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text('SURAT PERMOHONAN CUTI KARYAWAN', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  doc.setFontSize(11);
  doc.setFont(doc.getFont().fontName, 'normal');
  
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
  
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text('Hormat saya,', pageWidth - 60, y);
  y += 25;
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text(data.employeeName, pageWidth - 60, y);
  
  y += 20;
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.text('Disetujui oleh:', 14, y);
  y += 25;
  doc.text('_______________________', 14, y);
  y += 5;
  doc.text('Atasan Langsung', 14, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate Jamaah Leave Letter (Surat Keterangan Cuti Ibadah Umrah/Haji)
export async function generateJamaahLeaveLetter(
  data: JamaahLeaveLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  const settings = company.settings;
  const font = settings?.leave_permit_font_family || settings?.pdf_default_font || 'helvetica';
  const orientation = settings?.leave_permit_page_orientation || 'portrait';
  const accentColor = settings?.leave_permit_accent_color || settings?.invoice_accent_color;
  const includeLogo = settings?.leave_permit_include_company_logo !== false;
  const resolvedCompany: CompanyInfo = {
    ...company,
    settings: accentColor ? { ...settings, invoice_accent_color: accentColor } : settings,
    layout: { ...(company.layout || {}), show_logo: includeLogo },
  };
  const doc = new jsPDF({ orientation: orientation as any, unit: 'mm', format: 'a4' });
  doc.setFont(font);
  let y = addLetterhead(doc, resolvedCompany);
  
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: Fotokopi KTP, Paspor', 14, y);
  y += 6;
  doc.text(`Perihal: Permohonan Izin Cuti ${data.purpose}`, 14, y);
  
  y += 12;
  
  doc.text('Kepada Yth,', 14, y);
  y += 6;
  doc.text(data.employerName, 14, y);
  y += 6;
  if (data.employerPosition) {
    doc.text(data.employerPosition, 14, y);
    y += 6;
  }
  doc.text(data.employerInstitution, 14, y);
  y += 6;
  const addrLines = doc.splitTextToSize(data.employerAddress, pageWidth / 2);
  doc.text(addrLines, 14, y);
  y += addrLines.length * 6 + 6;
  
  doc.text('Di Tempat', 14, y);
  y += 12;
  
  doc.text('Assalamu\'alaikum Wr. Wb.', 14, y);
  y += 10;
  
  const intro = `Dengan hormat, kami dari ${company.name} memberitahukan bahwa salah satu karyawan/staf di instansi Bapak/Ibu:`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 28);
  doc.text(introLines, 14, y);
  y += introLines.length * 6 + 6;
  
  doc.text(`Nama : ${data.jamaahName}`, 25, y); y += 6;
  doc.text(`NIK  : ${data.nik}`, 25, y); y += 6;
  doc.text(`TTL  : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}`, 25, y); y += 6;
  doc.text(`Alamat:`, 25, y);
  const jamaahAddr = doc.splitTextToSize(data.address, pageWidth - 50);
  doc.text(jamaahAddr, 45, y);
  y += jamaahAddr.length * 6 + 6;
  
  const body = `Adalah benar terdaftar sebagai jamaah ${data.purpose} di travel kami dan dijadwalkan akan berangkat pada tanggal ${data.departureDate ? format(data.departureDate, 'd MMMM yyyy', { locale: id }) : '________________'}. Sehubungan dengan hal tersebut, kami memohon agar Bapak/Ibu dapat memberikan izin cuti kepada yang bersangkutan mulai tanggal ${format(data.startDate, 'd MMMM yyyy', { locale: id })} sampai dengan ${format(data.endDate, 'd MMMM yyyy', { locale: id })}.`;
  const bodyLines = doc.splitTextToSize(body, pageWidth - 28);
  doc.text(bodyLines, 14, y);
  y += bodyLines.length * 6 + 10;
  
  doc.text('Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.', 14, y);
  y += 12;
  
  doc.text('Wassalamu\'alaikum Wr. Wb.', 14, y);
  y += 15;
  
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text(company.name, pageWidth - 60, y);
  y += 25;
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text('_______________________', pageWidth - 60, y);
  y += 6;
  doc.text('Pimpinan', pageWidth - 60, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate Passport Recommendation Letter
export async function generatePassportLetter(
  data: PassportLetterData,
  letterNumber: string,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  const settings = company.settings;
  const font = settings?.passport_letter_font_family || settings?.pdf_default_font || 'helvetica';
  const orientation = settings?.passport_letter_page_orientation || 'portrait';
  const accentColor = settings?.passport_letter_accent_color || settings?.invoice_accent_color;
  const resolvedCompany: CompanyInfo = {
    ...company,
    settings: accentColor ? { ...settings, invoice_accent_color: accentColor } : settings,
  };
  const doc = new jsPDF({ orientation: orientation as any, unit: 'mm', format: 'a4' });
  doc.setFont(font);
  let y = addLetterhead(doc, resolvedCompany);
  
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(11);
  doc.text(`Nomor: ${letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 6;
  doc.text('Lampiran: -', 14, y);
  y += 6;
  doc.text(`Perihal: Rekomendasi Pembuatan Paspor ${data.purpose}`, 14, y);
  
  y += 15;
  
  doc.text('Kepada Yth,', 14, y);
  y += 6;
  doc.text('Kepala Kantor Imigrasi', 14, y);
  y += 6;
  doc.text('Di Tempat', 14, y);
  y += 15;
  
  doc.text('Assalamu\'alaikum Wr. Wb.', 14, y);
  y += 10;
  
  const intro = `Dengan hormat, yang bertanda tangan di bawah ini Pimpinan ${company.name}, memberikan rekomendasi kepada:`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 28);
  doc.text(introLines, 14, y);
  y += introLines.length * 6 + 6;
  
  doc.text(`Nama : ${data.customerName}`, 25, y); y += 6;
  doc.text(`NIK  : ${data.nik}`, 25, y); y += 6;
  doc.text(`TTL  : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}`, 25, y); y += 6;
  doc.text(`Alamat:`, 25, y);
  const addrLines = doc.splitTextToSize(data.address, pageWidth - 50);
  doc.text(addrLines, 45, y);
  y += addrLines.length * 6 + 6;
  
  const body = `Bahwa yang bersangkutan adalah benar jamaah ${data.purpose} yang terdaftar di ${company.name} and akan diberangkatkan pada tanggal ${data.departureDate ? format(data.departureDate, 'd MMMM yyyy', { locale: id }) : '________________'}. Surat rekomendasi ini diberikan sebagai persyaratan pengurusan paspor yang bersangkutan.`;
  const bodyLines = doc.splitTextToSize(body, pageWidth - 28);
  doc.text(bodyLines, 14, y);
  y += bodyLines.length * 6 + 10;
  
  doc.text('Demikian surat rekomendasi ini kami sampaikan untuk dapat dipergunakan sebagaimana mestinya.', 14, y);
  y += 12;
  
  doc.text('Wassalamu\'alaikum Wr. Wb.', 14, y);
  y += 15;
  
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text(company.name, pageWidth - 60, y);
  y += 25;
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text('_______________________', pageWidth - 60, y);
  y += 6;
  doc.text('Pimpinan', pageWidth - 60, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate General Letter
export async function generateGeneralLetter(
  data: GeneralLetterData,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  const settings = company.settings;
  const font = settings?.general_letter_font_family || settings?.pdf_default_font || 'helvetica';
  const orientation = settings?.general_letter_page_orientation || 'portrait';
  const accentColor = settings?.general_letter_accent_color || settings?.invoice_accent_color;
  const showLetterhead = settings?.general_letter_show_letterhead !== false;
  const resolvedCompany: CompanyInfo = {
    ...company,
    settings: accentColor ? { ...settings, invoice_accent_color: accentColor } : settings,
    layout: {
      ...(company.layout || {}),
      show_header: showLetterhead ? (company.layout?.show_header !== false) : false,
    },
  };
  const doc = new jsPDF({ orientation: orientation as any, unit: 'mm', format: 'a4' });
  doc.setFont(font);
  let y = addLetterhead(doc, resolvedCompany);
  
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(11);
  doc.text(`Nomor: ${data.letterNumber}`, 14, y);
  y += 6;
  doc.text(`Tanggal: ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, 14, y);
  y += 12;
  
  doc.text('Kepada Yth,', 14, y);
  y += 6;
  doc.text(data.recipient.name, 14, y);
  y += 6;
  if (data.recipient.position) {
    doc.text(data.recipient.position, 14, y);
    y += 6;
  }
  if (data.recipient.institution) {
    doc.text(data.recipient.institution, 14, y);
    y += 6;
  }
  if (data.recipient.address) {
    const addrLines = doc.splitTextToSize(data.recipient.address, pageWidth / 2);
    doc.text(addrLines, 14, y);
    y += addrLines.length * 6;
  }
  y += 12;
  
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text(`Perihal: ${data.subject}`, 14, y);
  doc.setFont(doc.getFont().fontName, 'normal');
  y += 15;
  
  doc.text('Assalamu\'alaikum Wr. Wb.', 14, y);
  y += 10;
  
  const contentLines = doc.splitTextToSize(data.content, pageWidth - 28);
  doc.text(contentLines, 14, y);
  y += contentLines.length * 6 + 15;
  
  doc.text('Demikian surat ini kami sampaikan. Atas perhatiannya kami ucapkan terima kasih.', 14, y);
  y += 12;
  
  doc.text('Wassalamu\'alaikum Wr. Wb.', 14, y);
  y += 15;
  
  doc.text(`${company.city || 'Jakarta'}, ${format(data.letterDate, 'd MMMM yyyy', { locale: id })}`, pageWidth - 60, y);
  y += 6;
  doc.text(company.name, pageWidth - 60, y);
  y += 25;
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text(data.signatory.name, pageWidth - 60, y);
  y += 6;
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.text(data.signatory.position, pageWidth - 60, y);
  
  addFooter(doc, 1, 1, company);
  
  return doc;
}

// Generate Umrah Certificate
// Generate E-Ticket
export async function generateETicket(
  data: ETicketData,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const settings = company.settings;
  
  const accentColor = settings?.invoice_accent_color || '#16a34a'; // Default green for ticket
  const rgb = hexToRgb(accentColor);

  // Header with company branding
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('E-TICKET', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Booking Code: ${data.bookingCode}`, pageWidth / 2, 36, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  let y = 55;

  // Passenger Information Section
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 5, pageWidth - 28, 35, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PENUMPANG', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nama Penumpang: ${data.passengerName}`, 20, y);
  y += 7;
  doc.text(`No. Paspor: ${data.passportNumber}`, 20, y);
  y += 7;
  doc.text(`Paket: ${data.packageName}`, 20, y);

  y += 20;

  // Flight Information Section
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PENERBANGAN', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Departure
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KEBERANGKATAN', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tanggal: ${format(data.departureDate, 'd MMMM yyyy', { locale: id })}`, 20, y);
  if (data.departureTime) {
    doc.text(`Waktu: ${data.departureTime}`, 100, y);
  }
  y += 7;
  doc.text(`Dari: ${data.departureAirport}`, 20, y);
  doc.text(`Ke: ${data.arrivalAirport}`, 100, y);
  y += 7;
  if (data.airline) {
    doc.text(`Maskapai: ${data.airline}`, 20, y);
  }
  if (data.flightNumber) {
    doc.text(`No. Penerbangan: ${data.flightNumber}`, 100, y);
  }

  y += 15;

  // Return
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KEPULANGAN', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tanggal: ${format(data.returnDate, 'd MMMM yyyy', { locale: id })}`, 20, y);

  y += 20;

  // Accommodation Information
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI AKOMODASI', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.hotelMakkah) {
    doc.text(`Hotel Makkah: ${data.hotelMakkah}`, 20, y);
    y += 7;
  }
  if (data.hotelMadinah) {
    doc.text(`Hotel Madinah: ${data.hotelMadinah}`, 20, y);
    y += 7;
  }
  doc.text(`Tipe Kamar: ${data.roomType}`, 20, y);

  y += 25;

  // Important Notes
  doc.setFillColor(255, 243, 205);
  doc.rect(14, y - 5, pageWidth - 28, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CATATAN PENTING:', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('• Harap tiba di bandara minimal 4 jam sebelum keberangkatan', 20, y);
  y += 5;
  doc.text('• Pastikan paspor masih berlaku minimal 6 bulan dari tanggal keberangkatan', 20, y);
  y += 5;
  doc.text('• Bawa dokumen asli: Paspor, Visa, Buku Kuning (Vaksin Meningitis)', 20, y);
  y += 5;
  doc.text('• E-Ticket ini wajib dicetak dan dibawa saat keberangkatan', 20, y);

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`, 14, pageHeight - 15);
  doc.text(`${company.phone} | ${company.email}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
  doc.setTextColor(0);

  return doc;
}

export async function generateUmrahCertificate(
  data: UmrahCertificateData,
  company: CompanyInfo = defaultCompanyInfo
): Promise<jsPDF> {
  if (company.logo && company.logo.startsWith('http')) {
    try {
      company.logo = await imageUrlToBase64(company.logo);
    } catch (e) {
      console.warn('Failed to pre-process logo:', e);
    }
  }
  const settings = company.settings;
  const font = settings?.certificate_font_family || settings?.pdf_default_font || 'helvetica';
  const orientation = settings?.certificate_page_orientation || 'landscape';
  const borderColor = settings?.certificate_border_color || '#daa520';
  const textColor = settings?.certificate_text_color || '#165634';
  const bgImageUrl = settings?.certificate_background_image_url;

  const doc = new jsPDF({ orientation: orientation as any, unit: 'mm', format: 'a4' });
  doc.setFont(font);

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Optional background image
  if (bgImageUrl) {
    try {
      const bgBase64 = bgImageUrl.startsWith('http') ? await imageUrlToBase64(bgImageUrl) : bgImageUrl;
      doc.addImage(bgBase64, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (e) {
      console.warn('Failed to load certificate background image:', e);
    }
  }

  const borderRgb = hexToRgb(borderColor);
  doc.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  
  let y = 40;
  
  if (company.logo) {
    try {
      doc.addImage(company.logo, 'PNG', pageWidth / 2 - 15, y, 30, 30);
      y += 40;
    } catch (e) {
      y += 10;
    }
  }
  
  const textRgb = hexToRgb(textColor);
  doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  doc.setFontSize(36);
  doc.setFont(font, 'bold');
  doc.text('SERTIFIKAT UMRAH', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  doc.setFontSize(14);
  doc.setFont(font, 'normal');
  doc.text(`Nomor: ${data.certificateNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 20;
  
  doc.setFontSize(18);
  doc.text('Diberikan kepada:', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  doc.setFontSize(28);
  doc.setFont(font, 'bold');
  doc.text(data.participantName, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  doc.setFontSize(16);
  doc.setFont(font, 'normal');
  const text = `Telah menyelesaikan rangkaian ibadah Umrah program ${data.packageName}\nyang dilaksanakan pada tanggal ${format(data.departureDate, 'd MMMM yyyy', { locale: id })} sampai dengan ${format(data.returnDate, 'd MMMM yyyy', { locale: id })}.`;
  const lines = doc.splitTextToSize(text, pageWidth - 60);
  doc.text(lines, pageWidth / 2, y, { align: 'center' });
  y += 30;
  
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFont(font, 'bold');
  doc.text(company.name, pageWidth / 2, y, { align: 'center' });
  
  return doc;
}
