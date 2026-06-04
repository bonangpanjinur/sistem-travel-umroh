import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Company info interface
interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  city?: string;
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

interface InvoiceData {
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
  const pageWidth = doc.internal.pageSize.width;
  let y = 15;
  
  // Header background color
  doc.setFillColor(59, 130, 246); // Blue color
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add logo if available
  if (company.logo) {
    try {
      doc.addImage(company.logo, 'PNG', 14, 8, 35, 35);
    } catch (e) {
      // Logo failed to load, continue without it
      console.warn('Failed to load logo:', e);
    }
  }
  
  // Company name (white text on blue background)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const logoOffset = company.logo ? 55 : 14;
  doc.text(company.name, logoOffset, 22, { align: 'left' });
  
  // Company details (white text on blue background)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address, logoOffset, 30, { align: 'left' });
  doc.text(`Telp: ${company.phone} | Email: ${company.email}`, logoOffset, 36, { align: 'left' });
  if (company.website) {
    doc.text(company.website, logoOffset, 42, { align: 'left' });
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 60; // Return starting Y position for content
}

// Helper to add footer
function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
  
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`,
    14,
    pageHeight - 10
  );
  doc.text(
    `Halaman ${pageNum} dari ${totalPages}`,
    pageWidth - 14,
    pageHeight - 10,
    { align: 'right' }
  );
  doc.setTextColor(0);
}

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
  
  addFooter(doc, 1, 1);
  
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
  
  addFooter(doc, 1, 1);
  
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
  doc.text('Lampiran: Fotokopi KTP, KK, Akta Lahir', 14, y);
  y += 6;
  doc.text('Perihal: Permohonan Pembuatan Paspor', 14, y);
  
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
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const content = `Dengan hormat,

Yang bertanda tangan di bawah ini, Direktur ${company.name}, dengan ini menerangkan bahwa:

Nama Lengkap       : ${data.customerName}
NIK                : ${data.nik}
Tempat/Tgl Lahir   : ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}
Alamat             : ${data.address}
Telp               : ${data.phone}

Adalah calon jamaah ${data.purpose} yang terdaftar di ${company.name} dan akan menunaikan ibadah ${data.purpose} ke Tanah Suci.

Sehubungan dengan hal tersebut, kami mohon kesediaan Bapak/Ibu untuk dapat menerbitkan paspor bagi yang bersangkutan dengan segera.

Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;

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
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// Generate Invoice — redesigned with professional Islamic travel theme
export function generateInvoice(
  data: InvoiceData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;


  // ── COLOR PALETTE ──
  const GREEN_DARK:  [number, number, number] = [22, 101, 52];   // emerald-800
  const GREEN_MID:   [number, number, number] = [34, 139, 75];   // emerald-600
  const GREEN_LIGHT: [number, number, number] = [209, 250, 229]; // emerald-100
  const GOLD:        [number, number, number] = [202, 138, 4];   // amber-600
  const DARK_TEXT:   [number, number, number] = [17, 24, 39];
  const MUTED:       [number, number, number] = [107, 114, 128];
  const WHITE:       [number, number, number] = [255, 255, 255];

  // ── HEADER BAND ──
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative accent stripe
  doc.setFillColor(...GOLD);
  doc.rect(0, 36, pageWidth, 3, 'F');

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name, 14, 15);

  // Company subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(company.address, 14, 22);
  doc.text(`Telp: ${company.phone}  |  Email: ${company.email}${company.website ? '  |  ' + company.website : ''}`, 14, 28);

  // INVOICE label top-right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text('INVOICE', pageWidth - 14, 22, { align: 'right' });

  // ── TWO-COLUMN: INVOICE INFO (left) + BILLED TO (right) ──
  let y = 50;
  doc.setTextColor(...DARK_TEXT);

  // Left column — invoice metadata
  const leftX = 14;
  const colW = (pageWidth - 28) / 2 - 5;

  // Light box for invoice info
  doc.setFillColor(...GREEN_LIGHT);
  doc.setDrawColor(...GREEN_MID);
  doc.setLineWidth(0.4);
  doc.roundedRect(leftX, y - 4, colW, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN_DARK);
  doc.text('NOMOR INVOICE', leftX + 4, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK_TEXT);
  doc.text(data.invoiceNumber, leftX + 4, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`Tanggal: ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`, leftX + 4, y + 18);
  doc.text(`Jatuh Tempo: ${format(data.dueDate, 'd MMMM yyyy', { locale: id })}`, leftX + 4, y + 25);

  // Right column — billed to
  const rightX = leftX + colW + 10;
  const rightW = colW;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, y - 4, rightW, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN_DARK);
  doc.text('DITAGIHKAN KEPADA', rightX + 4, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_TEXT);
  doc.text(data.customer.name, rightX + 4, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const addrLines = doc.splitTextToSize(data.customer.address, rightW - 8);
  doc.text(addrLines.slice(0, 1), rightX + 4, y + 18);
  doc.text(`Telp: ${data.customer.phone}${data.customer.email ? '  |  ' + data.customer.email : ''}`, rightX + 4, y + 25);

  y += 44;

  // ── ITEMS TABLE ──

  
  // Invoice Title with styling
  doc.setFillColor(59, 130, 246);
  doc.rect(14, y - 8, pageWidth - 28, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, y + 1, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  y += 20;
  
  // Two column layout: Invoice details (left) and Customer info (right)
  const leftColX = 14;
  const rightColX = pageWidth / 2 + 5;
  const colWidth = pageWidth / 2 - 20;
  
  // Left column - Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Detail Invoice:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  y += 6;
  doc.text(`No. Invoice: ${data.invoiceNumber}`, leftColX, y);
  y += 5;
  doc.text(`Tanggal: ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`, leftColX, y);
  y += 5;
  doc.text(`Jatuh Tempo: ${format(data.dueDate, 'd MMMM yyyy', { locale: id })}`, leftColX, y);
  
  // Right column - Customer info
  let rightY = y - 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Kepada:', rightColX, rightY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rightY += 6;
  doc.text(data.customer.name, rightColX, rightY);
  
  rightY += 5;
  const addressLines = doc.splitTextToSize(data.customer.address, colWidth - 5);
  doc.text(addressLines, rightColX, rightY);
  
  rightY += addressLines.length * 4 + 3;
  doc.text(`Telp: ${data.customer.phone}`, rightColX, rightY);
  
  if (data.customer.email) {
    rightY += 4;
    doc.text(`Email: ${data.customer.email}`, rightColX, rightY);
  }
  
  y = Math.max(y + 5, rightY + 8);
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  
  // Items table

  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi Layanan', 'Qty', 'Harga Satuan', 'Total']],
    body: tableData,

    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      textColor: DARK_TEXT,
    },
    headStyles: {
      fillColor: GREEN_DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],

    styles: { 
      fontSize: 9,
      cellPadding: 4,
      lineColor: [220, 220, 220],
      lineWidth: 0.5
    },
    headStyles: { 
      fillColor: [59, 130, 246], 
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'

    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },

      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── TOTALS BOX (right-aligned) ──
  const totalsBoxW = 90;
  const totalsBoxX = pageWidth - 14 - totalsBoxW;
  let totalsY = y;

  // Calculate box height
  const totalLines = 1 + (data.discount ? 1 : 0) + (data.tax ? 1 : 0) + 1;
  const boxH = totalLines * 8 + 14;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...GREEN_MID);
  doc.setLineWidth(0.4);
  doc.roundedRect(totalsBoxX, totalsY, totalsBoxW, boxH, 2, 2, 'FD');

  totalsY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);

  doc.text('Subtotal:', totalsBoxX + 5, totalsY);
  doc.text(formatCurrency(data.subtotal), totalsBoxX + totalsBoxW - 5, totalsY, { align: 'right' });
  totalsY += 8;


      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });
  
  // @ts-ignore - lastAutoTable is added by jspdf-autotable
  y = doc.lastAutoTable.finalY + 12;
  
  // Totals section with better styling
  const totalsX = pageWidth - 100;
  const totalsBoxWidth = 95;
  
  // Totals background
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsX - 5, y - 3, totalsBoxWidth + 5, 45, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatCurrency(data.subtotal), pageWidth - 14, y, { align: 'right' });
  y += 6;
  

  if (data.discount) {
    doc.setTextColor(220, 38, 38);
    doc.text('Diskon:', totalsBoxX + 5, totalsY);
    doc.text(`- ${formatCurrency(data.discount)}`, totalsBoxX + totalsBoxW - 5, totalsY, { align: 'right' });
    doc.setTextColor(...DARK_TEXT);
    totalsY += 8;
  }

  if (data.tax) {
    doc.text('PPN (11%):', totalsBoxX + 5, totalsY);
    doc.text(formatCurrency(data.tax), totalsBoxX + totalsBoxW - 5, totalsY, { align: 'right' });
    totalsY += 8;
  }


  // Total row with green background
  doc.setFillColor(...GREEN_DARK);
  doc.roundedRect(totalsBoxX, totalsY - 3, totalsBoxW, 12, 0, 0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL', totalsBoxX + 5, totalsY + 5);
  doc.text(formatCurrency(data.total), totalsBoxX + totalsBoxW - 5, totalsY + 5, { align: 'right' });

  y = y + boxH + 10;

  // ── BANK INFO + NOTES (two-column) ──
  const bankInfo = data.bankInfo;
  if (bankInfo) {
    doc.setFillColor(...GREEN_LIGHT);
    doc.setDrawColor(...GREEN_MID);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GREEN_DARK);
    doc.text('INFORMASI PEMBAYARAN', 20, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text(`Bank ${bankInfo.bankName}`, 20, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`No. Rek: ${bankInfo.accountNumber}`, 20, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.text(`A/N: ${bankInfo.accountName}`, pageWidth / 2, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Mohon konfirmasi pembayaran setelah transfer.', pageWidth / 2, y + 22);

    y += 35;
  }

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text('Catatan:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 5;

  
  // Total line separator
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(totalsX - 5, y + 1, pageWidth - 14, y + 1);
  y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246);
  doc.text('TOTAL:', totalsX, y);
  doc.text(formatCurrency(data.total), pageWidth - 14, y, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  // Bank info section
  const bankInfo = data.bankInfo;
  if (bankInfo) {
    doc.setFillColor(240, 248, 255);
    doc.rect(14, y - 3, pageWidth - 28, 25, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Pembayaran dapat ditransfer ke:', 18, y);
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Bank: ${bankInfo.bankName}`, 18, y);
    y += 4;
    doc.text(`No. Rekening: ${bankInfo.accountNumber}`, 18, y);
    y += 4;
    doc.text(`Atas Nama: ${bankInfo.accountName}`, 18, y);
    
    y += 12;
  }
  
  // Notes section
  if (data.notes) {
    doc.setFillColor(255, 250, 205);
    doc.rect(14, y - 3, pageWidth - 28, 20, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Catatan:', 18, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 36);
    doc.text(noteLines, 18, y);

  }

  // ── SIGNATURE AREA ──
  const sigY = Math.max(y + 10, pageHeight - 55);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${company.city || 'Jakarta'}, ${format(data.invoiceDate, 'd MMMM yyyy', { locale: id })}`,
    pageWidth - 14,
    sigY,
    { align: 'right' }
  );
  doc.text('Hormat kami,', pageWidth - 14, sigY + 6, { align: 'right' });

  // Signature box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - 80, sigY + 10, 66, 22, 1, 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN_DARK);
  doc.text(company.name, pageWidth - 14, sigY + 26, { align: 'right' });

  // ── FOOTER ──
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(
    `Dicetak pada: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}`,
    14,
    pageHeight - 4.5
  );
  doc.text('Halaman 1 dari 1', pageWidth - 14, pageHeight - 4.5, { align: 'right' });

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
  
  addFooter(doc, 1, 1);
  
  return doc;
}

// E-Ticket data interface
interface ETicketData {
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

// Umrah Certificate data interface
interface UmrahCertificateData {
  participantName: string;
  passportNumber: string;
  birthPlace: string;
  birthDate: Date;
  packageName: string;
  departureDate: Date;
  returnDate: Date;
  certificateNumber: string;
}

// Generate E-Ticket
export function generateETicket(
  data: ETicketData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with company branding
  doc.setFillColor(22, 163, 74); // Green
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
  doc.setFillColor(22, 163, 74);
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
  doc.setFillColor(22, 163, 74);
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

// Generate Umrah Certificate (Sertifikat Umrah)
export function generateUmrahCertificate(
  data: UmrahCertificateData,
  company: CompanyInfo = defaultCompanyInfo
): jsPDF {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Decorative border
  doc.setDrawColor(218, 165, 32); // Gold
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Header decorations
  doc.setFillColor(218, 165, 32);
  doc.rect(pageWidth / 2 - 60, 20, 120, 2, 'F');
  
  let y = 35;
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('SERTIFIKAT', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Dark green
  doc.text('IBADAH UMRAH', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Certificate Number
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. ${data.certificateNumber}`, pageWidth / 2, y, { align: 'center' });
  
  y += 20;
  
  // Main content
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Dengan ini menerangkan bahwa:', pageWidth / 2, y, { align: 'center' });
  
  y += 15;
  
  // Participant name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.participantName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFillColor(218, 165, 32);
  doc.rect(pageWidth / 2 - 80, y, 160, 1, 'F');
  
  y += 15;
  
  // Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. Paspor: ${data.passportNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`Tempat/Tanggal Lahir: ${data.birthPlace}, ${format(data.birthDate, 'd MMMM yyyy', { locale: id })}`, pageWidth / 2, y, { align: 'center' });
  
  y += 15;
  
  // Certificate text
  doc.setFontSize(12);
  const certText = `Telah menunaikan Ibadah Umrah ke Tanah Suci Makkah Al-Mukarramah dan Madinah Al-Munawwarah`;
  doc.text(certText, pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.text(`Periode: ${format(data.departureDate, 'd MMMM', { locale: id })} - ${format(data.returnDate, 'd MMMM yyyy', { locale: id })}`, pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`Paket: ${data.packageName}`, pageWidth / 2, y, { align: 'center' });
  
  y += 20;
  
  // Closing text
  doc.setFontSize(10);
  doc.text('Semoga Ibadah Umrah yang telah dilaksanakan menjadi Umrah yang Mabrur', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('dan diterima di sisi Allah SWT. Aamiin.', pageWidth / 2, y, { align: 'center' });
  
  // Signature section
  y = pageHeight - 55;
  doc.setFontSize(10);
  doc.text(`${company.city || 'Jakarta'}, ${format(new Date(), 'd MMMM yyyy', { locale: id })}`, pageWidth - 70, y, { align: 'center' });
  y += 6;
  doc.text(company.name, pageWidth - 70, y, { align: 'center' });
  y += 20;
  doc.text('_______________________', pageWidth - 70, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Direktur', pageWidth - 70, y, { align: 'center' });
  
  // Company info at bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${company.address} | ${company.phone} | ${company.email}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  return doc;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Export types for external use
export type {
  CompanyInfo,
  LeaveLetterData,
  EmployeeLeaveLetterData,
  JamaahLeaveLetterData,
  PassportLetterData,
  InvoiceData,
  GeneralLetterData,
  ETicketData,
  UmrahCertificateData
};
